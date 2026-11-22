import { apiClient } from "@/lib/api/api-client";
import type { Invoice, InvoiceFilters, InvoicePage } from "../types/invoice.types";

export function getInvoices(filters: InvoiceFilters, signal?: AbortSignal) {
  const params = new URLSearchParams({ page: String(filters.page), pageSize: String(filters.pageSize) });
  if (filters.search) params.set("search", filters.search);
  if (filters.supplierId) params.set("supplierId", filters.supplierId);
  if (filters.status) params.set("status", filters.status);
  return apiClient.request<InvoicePage>(`/invoices?${params}`, { signal });
}

export function getInvoice(id: string, signal?: AbortSignal) {
  return apiClient.request<Invoice>(`/invoices/${encodeURIComponent(id)}`, { signal });
}

export function uploadInvoice({ supplierId, file }: { supplierId: string; file: File }) {
  const body = new FormData();
  body.set("supplierId", supplierId);
  body.set("file", file);
  return apiClient.request<Invoice>("/invoices/upload", { method: "POST", body });
}

export function invoiceFileUrl(id: string, download = false) {
  return `/api/invoices/${encodeURIComponent(id)}/file${download ? "?download=1" : ""}`;
}
