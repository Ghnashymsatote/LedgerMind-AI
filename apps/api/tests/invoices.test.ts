import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import type { Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PrismaClient } from "@ledgermind/database";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { createApp } from "../src/app.js";
import { createLocalInvoiceStorage } from "../src/lib/invoice-storage.js";
import { hashPassword } from "../src/lib/password.js";

describe.skipIf(process.env.RUN_DB_TESTS !== "1")("invoice routes with PostgreSQL and private storage", () => {
  const origin = "http://127.0.0.1:3000";
  const runId = randomUUID();
  const supplierName = `Invoice test ${runId}`;
  const email = `invoice-${runId}@example.test`;
  const maxBytes = 512;
  const pdf = Buffer.from("%PDF-1.7\n% sample invoice\n%%EOF\n");
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+yZ1kAAAAASUVORK5CYII=", "base64");
  let db: PrismaClient;
  let directory: string;
  let server: Server;
  let supplierId: string;
  let base: string;
  let cookie: string;

  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), "ledgermind-invoices-"));
    db = new PrismaClient();
    const password = randomUUID();
    await db.user.create({ data: { email, role: "OPERATOR", passwordHash: await hashPassword(password) } });
    const supplier = await db.supplier.create({ data: { name: supplierName, tallyLedgerName: "Test ledger" } });
    supplierId = supplier.id;

    server = createApp(() => db.$queryRaw`SELECT 1`, {
      db, origin, invoices: { storage: createLocalInvoiceStorage(directory), maxBytes, extraction: {
        extract: async ({ supplierName }) => ({
          provider: "mock", model: "test", supplier_name: { value: supplierName, confidence: 1 },
          supplier_gstin: { value: null, confidence: null }, buyer_name: { value: null, confidence: null },
          buyer_gstin: { value: null, confidence: null }, invoice_number: { value: null, confidence: null },
          invoice_date: { value: null, confidence: null }, currency: { value: "INR", confidence: 1 },
          taxable_amount: { value: null, confidence: null }, cgst_amount: { value: null, confidence: null },
          sgst_amount: { value: null, confidence: null }, igst_amount: { value: null, confidence: null },
          total_tax: { value: null, confidence: null }, invoice_total: { value: null, confidence: null },
          lines: [], warnings: ["test mock"],
        }),
      } },
    }).listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected a TCP address");
    base = `http://127.0.0.1:${address.port}`;
    const login = await fetch(`${base}/auth/login`, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    expect(login.status).toBe(200);
    cookie = login.headers.get("set-cookie")?.split(";")[0] ?? "";
    expect(cookie).toMatch(/^ledgermind_session=/);
  }, 20_000);

  afterAll(async () => {
    try {
      if (server) await new Promise<void>((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
      });
      if (db) {
        if (supplierId) {
          await db.invoice.deleteMany({ where: { supplierId } });
          await db.supplier.deleteMany({ where: { id: supplierId } });
        }
        await db.user.deleteMany({ where: { email } });
      }
    } finally {
      await db?.$disconnect();
      if (directory) await rm(directory, { recursive: true, force: true });
    }
  });

  function upload(bytes: Buffer<ArrayBuffer>, options: {
    name?: string; type?: string; supplier?: string; authorization?: string; origin?: string;
  } = {}) {
    const form = new FormData();
    form.set("supplierId", options.supplier ?? supplierId);
    form.set("file", new Blob([bytes], { type: options.type ?? "application/pdf" }), options.name ?? "invoice.pdf");
    return fetch(`${base}/invoices/upload`, {
      method: "POST",
      headers: { Origin: options.origin ?? origin, Cookie: options.authorization ?? cookie },
      body: form,
    });
  }

  function get(path: string, authenticated = true) {
    return fetch(base + path, { headers: authenticated ? { Cookie: cookie } : undefined });
  }

  test("rejects anonymous, cross-origin, invalid, oversized, and missing-supplier uploads without writing files", async () => {
    expect((await upload(pdf, { authorization: "" })).status).toBe(401);
    expect((await upload(pdf, { origin: "https://example.invalid" })).status).toBe(403);
    expect((await upload(Buffer.from("plain text"), { name: "looks-valid.pdf" })).status).toBe(415);
    const tooLarge = await upload(Buffer.concat([pdf, Buffer.alloc(maxBytes)]));
    expect(tooLarge.status).toBe(413);
    expect((await upload(pdf, { supplier: randomUUID() })).status).toBe(404);
    expect((await get("/invoices", false)).status).toBe(401);
    expect(await readdir(directory)).toEqual([]);
  });

  test("uploads as an OPERATOR, paginates, filters, and serves exact bytes only to authenticated users", async () => {
    const exactLimit = Buffer.concat([pdf, Buffer.alloc(maxBytes - pdf.length)]);
    const first = await upload(exactLimit, { name: "quarterly-statement.exe", type: "application/octet-stream" });
    expect(first.status).toBe(201);
    const invoice = await first.json();
    expect(invoice).toMatchObject({
      status: "NEEDS_REVIEW", fileName: "quarterly-statement.pdf", mimeType: "application/pdf",
      sizeBytes: maxBytes, supplier: { id: supplierId }, uploadedBy: { email },
    });
    expect(invoice).not.toHaveProperty("storageKey");

    const second = await upload(png, { name: "réçu.png", type: "text/plain" });
    expect(second.status).toBe(201);
    const image = await second.json();
    expect(image.fileName).toBe("réçu.png");
    const filter = `supplierId=${supplierId}&status=NEEDS_REVIEW&pageSize=1`;
    const firstPage = await (await get(`/invoices?${filter}&page=1`)).json();
    const secondPage = await (await get(`/invoices?${filter}&page=2`)).json();
    expect(firstPage).toMatchObject({ total: 2, page: 1, pageSize: 1, items: [{ id: image.id }] });
    expect(secondPage).toMatchObject({ total: 2, page: 2, pageSize: 1, items: [{ id: invoice.id }] });
    const match = await (await get(`/invoices?${filter}&search=QuarterLY`)).json();
    expect(match).toMatchObject({ total: 1, items: [{ id: invoice.id }] });
    const bySupplierName = await (await get(`/invoices?${filter}&search=${encodeURIComponent(supplierName)}`)).json();
    expect(bySupplierName.total).toBe(2);
    expect((await get("/invoices?page=0")).status).toBe(400);
    const extracted = await (await get(`/invoices/${invoice.id}`)).json();
    expect(extracted).toMatchObject({ ...invoice, currency: "INR", lines: [], extractionWarnings: ["test mock"] });
    expect(extracted.extractionRuns).toMatchObject([{ status: "SUCCEEDED", provider: "mock", model: "test" }]);
    const retry = await fetch(`${base}/invoices/${invoice.id}/extraction/retry`, { method: "POST", headers: { Origin: origin, Cookie: cookie } });
    expect(retry.status).toBe(409);
    const correction = await fetch(`${base}/invoices/${invoice.id}`, {
      method: "PATCH", headers: { Origin: origin, Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({
        invoiceNumber: "INV-100", invoiceDate: "2026-11-24", supplierGstin: "27AAPFU0939F1ZV",
        buyerName: "Example Buyer", buyerGstin: null, currency: "INR", taxableAmount: "1000.00",
        cgstAmount: "90.00", sgstAmount: "90.00", igstAmount: null, totalTax: "180.00",
        invoiceTotal: "1180.00", lines: [{ description: "Service", hsnSac: "9983", quantity: "1.0000",
          unitPrice: "1000.00", taxableAmount: "1000.00", taxRate: "18.0000", cgstAmount: "90.00",
          sgstAmount: "90.00", igstAmount: null, totalAmount: "1180.00" }],
      }),
    });
    expect(correction.status).toBe(200);
    expect(await correction.json()).toMatchObject({ invoiceNumber: "INV-100", invoiceTotal: "1180", lines: [{ hsnSac: "9983", quantity: "1" }] });
    expect((await get(`/invoices/${invoice.id}`, false)).status).toBe(401);

    const path = `/invoices/${invoice.id}/file`;
    expect((await get(path, false)).status).toBe(401);
    expect((await get("/invoices/%2e%2e%2fother/file")).status).toBe(404);
    expect((await get(`/invoices/${randomUUID()}/file`)).status).toBe(404);
    const view = await get(path);
    expect(view.status).toBe(200);
    expect(view.headers.get("cache-control")).toBe("no-store");
    expect(view.headers.get("content-type")).toBe("application/pdf");
    expect(view.headers.get("content-disposition")).toMatch(/^inline/);
    expect(view.headers.get("x-content-type-options")).toBe("nosniff");
    expect(Buffer.from(await view.arrayBuffer())).toEqual(exactLimit);

    const download = await get(`${path}?download=1`);
    expect(download.headers.get("content-disposition")).toMatch(/^attachment/);
    expect(Buffer.from(await download.arrayBuffer())).toEqual(exactLimit);
    const imageFile = await get(`/invoices/${image.id}/file`);
    expect(imageFile.headers.get("content-type")).toBe("image/png");
    expect(Buffer.from(await imageFile.arrayBuffer())).toEqual(png);
    const files = await readdir(directory);
    expect(files).toHaveLength(2);
    expect(files).not.toContain("quarterly-statement.pdf");
  }, 15_000);
});
