export type Invoice = {
  id: string;
  fileName: string;
  mimeType: "application/pdf" | "image/png" | "image/jpeg";
  sizeBytes: number;
  status: "UPLOADED" | "PROCESSING" | "NEEDS_REVIEW" | "EXTRACTION_FAILED";
  uploadedAt: string;
  supplier: { id: string; name: string };
  uploadedBy: { id: string; email: string };
};

export type InvoiceLine = {
  id?: string; description: string | null; hsnSac: string | null; quantity: string | null;
  unitPrice: string | null; taxableAmount: string | null; taxRate: string | null;
  cgstAmount: string | null; sgstAmount: string | null; igstAmount: string | null; totalAmount: string | null;
};

export type InvoiceDetail = Invoice & {
  invoiceNumber: string | null; invoiceDate: string | null; supplierGstin: string | null;
  buyerName: string | null; buyerGstin: string | null; currency: string;
  taxableAmount: string | null; cgstAmount: string | null; sgstAmount: string | null;
  igstAmount: string | null; totalTax: string | null; invoiceTotal: string | null;
  extractionWarnings: string[] | null; extractionConfidence: Record<string, number | null> | null;
  lines: InvoiceLine[];
  extractionRuns: Array<{ id: string; status: "PROCESSING" | "SUCCEEDED" | "FAILED"; provider: string | null; model: string | null; error: string | null; startedAt: string; completedAt: string | null }>;
};

export type InvoiceCorrection = Pick<InvoiceDetail, "invoiceNumber" | "supplierGstin" | "buyerName" | "buyerGstin" | "currency" | "taxableAmount" | "cgstAmount" | "sgstAmount" | "igstAmount" | "totalTax" | "invoiceTotal" | "lines"> & { invoiceDate: string | null };

export type InvoiceFilters = {
  page: number;
  pageSize: number;
  search: string;
  supplierId: string;
  status: "" | Invoice["status"];
};

export type InvoicePage = { items: Invoice[]; total: number; page: number; pageSize: number };

export type InvoiceScreen =
  | { view: "list" }
  | { view: "upload"; maxBytes: number }
  | { view: "detail"; id: string };
