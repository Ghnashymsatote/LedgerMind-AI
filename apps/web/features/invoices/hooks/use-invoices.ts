import { useQuery } from "@tanstack/react-query";
import { getInvoice, getInvoices } from "../api/invoice.service";
import { invoiceKeys } from "../invoice.keys";
import type { InvoiceFilters } from "../types/invoice.types";

export function useInvoices(userId: string, filters: InvoiceFilters) {
  return useQuery({
    queryKey: invoiceKeys.list(userId, filters),
    queryFn: ({ signal }) => getInvoices(filters, signal),
    meta: { protected: true },
  });
}

export function useInvoice(userId: string, id: string) {
  return useQuery({
    queryKey: invoiceKeys.detail(userId, id),
    queryFn: ({ signal }) => getInvoice(id, signal),
    meta: { protected: true },
  });
}
