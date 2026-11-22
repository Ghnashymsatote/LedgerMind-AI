import { z } from "zod";

export const supplierId = z.uuid();

export const supplier = z.strictObject({
  name: z.string().trim().min(1).max(120),
  taxId: z.string().trim().min(1).max(64).nullable().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  tallyLedgerName: z.string().trim().min(1).max(160),
});

export const supplierUpdate = supplier.partial().refine((value) => Object.keys(value).length > 0);

export type SupplierInput = z.infer<typeof supplier>;
export type SupplierUpdate = z.infer<typeof supplierUpdate>;
