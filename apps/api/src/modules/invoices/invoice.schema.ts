import { z } from "zod";

export const invoiceId = z.uuid();
export const uploadFields = z.strictObject({ supplierId: z.uuid() });
export const fileOptions = z.strictObject({ download: z.literal("1").optional() });
export const invoiceFilters = z.strictObject({
  page: z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().max(100_000)).default(1),
  pageSize: z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().max(100)).default(20),
  search: z.string().trim().max(120).optional(),
  supplierId: z.uuid().optional(),
  status: z.literal("UPLOADED").optional(),
});
export type InvoiceFilters = z.infer<typeof invoiceFilters>;
