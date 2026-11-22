import type { PrismaClient } from "@ledgermind/database";
import { expect, test, vi } from "vitest";
import { createLocalInvoiceStorage, type InvoiceStorage } from "../src/lib/invoice-storage.js";
import { detectFileType } from "../src/modules/invoices/invoice-file.js";
import { createInvoiceService } from "../src/modules/invoices/invoice.service.js";

test("detects JPEG by content and rejects unknown signatures", () => {
  const bytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0xff, 0xd9]);
  expect(detectFileType(bytes)?.mimeType).toBe("image/jpeg");
  expect(detectFileType(bytes.subarray(0, -2))).toBeNull();
  expect(detectFileType(Buffer.from("invoice.pdf"))).toBeNull();
});

test("private storage rejects keys containing path components", async () => {
  const storage = createLocalInvoiceStorage(".");
  await expect(storage.read("../invoice.pdf")).rejects.toThrow("Invalid invoice storage key.");
  await expect(storage.remove("C:\\temp\\invoice.pdf")).rejects.toThrow("Invalid invoice storage key.");
});

test("removes the stored object if the database write fails", async () => {
  const failure = new Error("write failed");
  const db = {
    supplier: { findUnique: vi.fn().mockResolvedValue({ id: "selected" }) },
    invoice: { create: vi.fn().mockRejectedValue(failure), findUnique: vi.fn().mockResolvedValue(null) },
  } as unknown as PrismaClient;
  const storage = { put: vi.fn(), read: vi.fn(), remove: vi.fn().mockResolvedValue(undefined) } satisfies InvoiceStorage;
  const invoices = createInvoiceService(db, storage);
  const bytes = Buffer.from("%PDF-1.7\n%%EOF\n");

  await expect(invoices.upload("selected", "user", { originalname: "invoice.pdf", buffer: bytes })).rejects.toBe(failure);
  expect(storage.put).toHaveBeenCalledWith(expect.any(String), bytes);
  expect(storage.remove).toHaveBeenCalledWith(storage.put.mock.calls[0][0]);
});
