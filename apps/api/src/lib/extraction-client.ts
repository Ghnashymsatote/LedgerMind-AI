import { z } from "zod";

const value = z.object({ value: z.string().nullable(), confidence: z.number().min(0).max(1).nullable() });
const line = z.object({
  description: value, hsn_sac: value, quantity: value, unit_price: value,
  taxable_amount: value, tax_rate: value, cgst_amount: value, sgst_amount: value,
  igst_amount: value, total_amount: value,
});
export const extractionResult = z.object({
  provider: z.string(), model: z.string(), supplier_name: value, supplier_gstin: value,
  buyer_name: value, buyer_gstin: value, invoice_number: value, invoice_date: value,
  currency: value, taxable_amount: value, cgst_amount: value, sgst_amount: value,
  igst_amount: value, total_tax: value, invoice_total: value, lines: z.array(line),
  warnings: z.array(z.string()),
});
export type ExtractionResult = z.infer<typeof extractionResult>;

export interface ExtractionClient {
  extract(input: { bytes: Buffer; fileName: string; mimeType: string; supplierName: string }): Promise<ExtractionResult>;
}

export function createExtractionClient(baseUrl: string, timeoutMs: number): ExtractionClient {
  return {
    async extract(input) {
      const body = new FormData();
      body.set("supplier_name", input.supplierName);
      body.set("file", new Blob([new Uint8Array(input.bytes)], { type: input.mimeType }), input.fileName);
      const response = await fetch(new URL("/extract", baseUrl), {
        method: "POST", body, signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) throw new Error(`Extraction service returned HTTP ${response.status}`);
      return extractionResult.parse(await response.json());
    },
  };
}
