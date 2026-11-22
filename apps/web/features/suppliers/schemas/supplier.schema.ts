import { z } from "zod";

export const supplierSchema = z.object({
  name: z.string().trim().min(1, "Enter a supplier name.").max(120),
  taxId: z.string().trim().max(64).transform((value) => value || null),
  tallyLedgerName: z.string().trim().min(1, "Enter a Tally ledger name.").max(160),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});
