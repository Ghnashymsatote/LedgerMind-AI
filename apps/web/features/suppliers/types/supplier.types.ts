import type { z } from "zod";
import type { supplierSchema } from "../schemas/supplier.schema";

export type SupplierFormValues = z.input<typeof supplierSchema>;
export type SupplierInput = z.output<typeof supplierSchema>;
export type Supplier = SupplierInput & { id: string };
