import { z } from "zod";

export const invoiceId = z.uuid();
export const uploadFields = z.strictObject({ supplierId: z.uuid() });
export const fileOptions = z.strictObject({ download: z.literal("1").optional() });
export const invoiceFilters = z.strictObject({
  page: z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().max(100_000)).default(1),
  pageSize: z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().max(100)).default(20),
  search: z.string().trim().max(120).optional(),
  supplierId: z.uuid().optional(),
  status: z.enum(["UPLOADED", "PROCESSING", "NEEDS_REVIEW", "EXTRACTION_FAILED"]).optional(),
});
export type InvoiceFilters = z.infer<typeof invoiceFilters>;

const nullableText = z.string().trim().max(240).nullable();
const nullableMoney = z.string().regex(/^\d{1,16}(\.\d{1,2})?$/).nullable();
const nullableQuantity = z.string().regex(/^\d{1,14}(\.\d{1,4})?$/).nullable();
const nullableRate = z.string().regex(/^\d{1,3}(\.\d{1,4})?$/).nullable();
const invoiceLine = z.strictObject({
  description: nullableText, hsnSac: nullableText, quantity: nullableQuantity,
  unitPrice: nullableMoney, taxableAmount: nullableMoney, taxRate: nullableRate,
  cgstAmount: nullableMoney, sgstAmount: nullableMoney, igstAmount: nullableMoney,
  totalAmount: nullableMoney,
});
export const invoiceCorrection = z.strictObject({
  invoiceNumber: nullableText,
  invoiceDate: z.iso.date().nullable(),
  supplierGstin: z.string().trim().regex(/^[0-9A-Z]{15}$/).nullable(),
  buyerName: nullableText,
  buyerGstin: z.string().trim().regex(/^[0-9A-Z]{15}$/).nullable(),
  currency: z.string().trim().regex(/^[A-Z]{3}$/),
  taxableAmount: nullableMoney, cgstAmount: nullableMoney, sgstAmount: nullableMoney,
  igstAmount: nullableMoney, totalTax: nullableMoney, invoiceTotal: nullableMoney,
  lines: z.array(invoiceLine).max(500),
});
export type InvoiceCorrection = z.infer<typeof invoiceCorrection>;
