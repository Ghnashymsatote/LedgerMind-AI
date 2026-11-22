export type Invoice = {
  id: string;
  fileName: string;
  mimeType: "application/pdf" | "image/png" | "image/jpeg";
  sizeBytes: number;
  status: "UPLOADED";
  uploadedAt: string;
  supplier: { id: string; name: string };
  uploadedBy: { id: string; email: string };
};

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
