import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@ledgermind/database";
import type { ExtractionClient, ExtractionResult } from "../../lib/extraction-client.js";
import type { InvoiceStorage } from "../../lib/invoice-storage.js";
import { detectFileType, displayFileName } from "./invoice-file.js";
import type { InvoiceCorrection, InvoiceFilters } from "./invoice.schema.js";

const detail = {
  id: true, fileName: true, mimeType: true, sizeBytes: true, uploadedAt: true, status: true,
  invoiceNumber: true, invoiceDate: true, supplierGstin: true, buyerName: true, buyerGstin: true,
  currency: true, taxableAmount: true, cgstAmount: true, sgstAmount: true, igstAmount: true,
  totalTax: true, invoiceTotal: true, extractionWarnings: true, extractionConfidence: true,
  supplier: { select: { id: true, name: true } }, uploadedBy: { select: { id: true, email: true } },
  lines: { orderBy: { position: "asc" as const } },
  extractionRuns: {
    orderBy: { startedAt: "desc" as const }, take: 1,
    select: { id: true, status: true, provider: true, model: true, error: true, startedAt: true, completedAt: true }
  },
} as const;

const summary = {
  id: true, fileName: true, mimeType: true, sizeBytes: true, uploadedAt: true, status: true,
  supplier: { select: { id: true, name: true } }, uploadedBy: { select: { id: true, email: true } },
} as const;

const money = (value: string | null) => value && /^\d{1,16}(\.\d{1,2})?$/.test(value) ? value : null;
const quantity = (value: string | null) => value && /^\d{1,14}(\.\d{1,4})?$/.test(value) ? value : null;
const rate = (value: string | null) => value && /^\d{1,3}(\.\d{1,4})?$/.test(value) ? value : null;
const date = (value: string | null) => value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00.000Z`) : null;
const values = (result: ExtractionResult) => Object.fromEntries(Object.entries(result)
  .filter(([, item]) => item && typeof item === "object" && "confidence" in item)
  .map(([key, item]) => [key, (item as { confidence: number | null }).confidence]));

function extractedData(result: ExtractionResult) {
  return {
    invoiceNumber: result.invoice_number.value, invoiceDate: date(result.invoice_date.value),
    supplierGstin: result.supplier_gstin.value, buyerName: result.buyer_name.value,
    buyerGstin: result.buyer_gstin.value, currency: result.currency.value || "INR",
    taxableAmount: money(result.taxable_amount.value), cgstAmount: money(result.cgst_amount.value),
    sgstAmount: money(result.sgst_amount.value), igstAmount: money(result.igst_amount.value),
    totalTax: money(result.total_tax.value), invoiceTotal: money(result.invoice_total.value),
    extractionWarnings: result.warnings, extractionConfidence: values(result),
  };
}

export function createInvoiceService(db: PrismaClient, storage: InvoiceStorage, extraction: ExtractionClient) {
  async function runExtraction(invoiceId: string, bytes?: Buffer) {
    const claimed = await db.invoice.updateMany({
      where: { id: invoiceId, status: { in: ["UPLOADED", "EXTRACTION_FAILED"] } },
      data: { status: "PROCESSING" },
    });
    if (!claimed.count) return { outcome: "conflict" } as const;
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId }, select: { storageKey: true, fileName: true, mimeType: true, supplier: { select: { name: true } } },
    });
    if (!invoice) return { outcome: "missing" } as const;
    const run = await db.extractionRun.create({ data: { invoiceId } });
    try {
      if (!bytes) {
        const stored = await storage.read(invoice.storageKey);
        if (!stored) throw new Error("Stored invoice file is missing");
        const chunks: Buffer[] = [];
        for await (const chunk of stored.stream) chunks.push(Buffer.from(chunk));
        bytes = Buffer.concat(chunks);
      }
      const result = await extraction.extract({ bytes, fileName: invoice.fileName, mimeType: invoice.mimeType, supplierName: invoice.supplier.name });
      await db.$transaction(async (tx) => {
        await tx.invoiceLine.deleteMany({ where: { invoiceId } });
        await tx.invoice.update({
          where: { id: invoiceId }, data: {
            ...extractedData(result), status: "NEEDS_REVIEW",
            lines: {
              create: result.lines.map((line, position) => ({
                position, description: line.description.value, hsnSac: line.hsn_sac.value,
                quantity: quantity(line.quantity.value), unitPrice: money(line.unit_price.value),
                taxableAmount: money(line.taxable_amount.value), taxRate: rate(line.tax_rate.value),
                cgstAmount: money(line.cgst_amount.value), sgstAmount: money(line.sgst_amount.value),
                igstAmount: money(line.igst_amount.value), totalAmount: money(line.total_amount.value),
              }))
            },
          }
        });
        await tx.extractionRun.update({
          where: { id: run.id }, data: {
            status: "SUCCEEDED", provider: result.provider, model: result.model,
            rawResult: result as unknown as Prisma.InputJsonValue, completedAt: new Date(),
          }
        });
      });
      return { outcome: "succeeded" } as const;
    } catch (error) {
      const message = error instanceof Error && error.name === "TimeoutError"
        ? "Extraction service timed out." : "Invoice extraction failed. Retry when the extraction service is available.";
      await db.$transaction([
        db.invoice.update({ where: { id: invoiceId }, data: { status: "EXTRACTION_FAILED", extractionWarnings: [message] } }),
        db.extractionRun.update({ where: { id: run.id }, data: { status: "FAILED", error: message, completedAt: new Date() } }),
      ]);
      return { outcome: "failed" } as const;
    }
  }

  return {
    async upload(supplierId: string, uploadedById: string, file: { originalname: string; buffer: Buffer }) {
      const kind = detectFileType(file.buffer);
      if (!kind) return { outcome: "unsupported" } as const;
      const supplier = await db.supplier.findUnique({ where: { id: supplierId }, select: { id: true } });
      if (!supplier) return { outcome: "missing-supplier" } as const;
      const storageKey = randomUUID();
      await storage.put(storageKey, file.buffer);
      try {
        const invoice = await db.invoice.create({
          data: {
            supplierId, uploadedById, storageKey, fileName: displayFileName(file.originalname, kind.extension),
            mimeType: kind.mimeType, sizeBytes: file.buffer.length,
          }, select: { id: true }
        });
        await runExtraction(invoice.id, file.buffer);
        return { outcome: "created", invoice: await db.invoice.findUniqueOrThrow({ where: { id: invoice.id }, select: summary }) } as const;
      } catch (error) {
        const recorded = await db.invoice.findUnique({ where: { storageKey }, select: summary }).catch(() => undefined);
        if (recorded) return { outcome: "created", invoice: recorded } as const;
        if (recorded === null) await storage.remove(storageKey).catch(() => undefined);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") return { outcome: "missing-supplier" } as const;
        throw error;
      }
    },
    async retry(id: string) { return runExtraction(id); },
    async save(id: string, input: InvoiceCorrection) {
      const exists = await db.invoice.findUnique({ where: { id }, select: { status: true } });
      if (!exists) return { outcome: "missing" } as const;
      if (exists.status !== "NEEDS_REVIEW") return { outcome: "conflict" } as const;
      await db.$transaction(async (tx) => {
        await tx.invoiceLine.deleteMany({ where: { invoiceId: id } });
        await tx.invoice.update({
          where: { id }, data: {
            ...input, invoiceDate: input.invoiceDate ? new Date(`${input.invoiceDate}T00:00:00.000Z`) : null,
            lines: { create: input.lines.map((line, position) => ({ ...line, position })) },
          }
        });
      });
      return { outcome: "saved", invoice: await db.invoice.findUniqueOrThrow({ where: { id }, select: detail }) } as const;
    },
    async list({ page, pageSize, search, supplierId, status }: InvoiceFilters) {
      const where: Prisma.InvoiceWhereInput = {
        supplierId, status, ...(search && {
          OR: [
            { fileName: { contains: search, mode: "insensitive" } }, { supplier: { name: { contains: search, mode: "insensitive" } } },
          ]
        })
      };
      const [items, total] = await db.$transaction([
        db.invoice.findMany({ where, select: summary, orderBy: [{ uploadedAt: "desc" }, { id: "desc" }], skip: (page - 1) * pageSize, take: pageSize }),
        db.invoice.count({ where }),
      ], { isolationLevel: "RepeatableRead" });
      return { items, total, page, pageSize };
    },
    detail(id: string) { return db.invoice.findUnique({ where: { id }, select: detail }); },
    async file(id: string) {
      const invoice = await db.invoice.findUnique({ where: { id }, select: { storageKey: true, fileName: true, mimeType: true } });
      if (!invoice) return null;
      const file = await storage.read(invoice.storageKey);
      return file && { ...file, fileName: invoice.fileName, mimeType: invoice.mimeType };
    },
  };
}

export type InvoiceService = ReturnType<typeof createInvoiceService>;
