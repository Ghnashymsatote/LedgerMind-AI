import type { InvoiceFilters } from "./types/invoice.types";

export const invoiceKeys = {
  lists: (userId: string) => ["invoices", userId, "list"] as const,
  list: (userId: string, filters: InvoiceFilters) => [...invoiceKeys.lists(userId), filters] as const,
  detail: (userId: string, id: string) => ["invoices", userId, "detail", id] as const,
};
