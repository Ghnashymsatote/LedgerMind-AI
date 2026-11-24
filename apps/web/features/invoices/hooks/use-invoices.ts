import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getInvoice, getInvoices, retryExtraction, saveInvoice } from "../api/invoice.service";
import { invoiceKeys } from "../invoice.keys";
import type { InvoiceFilters } from "../types/invoice.types";
import type { InvoiceCorrection } from "../types/invoice.types";

export function useInvoices(userId: string, filters: InvoiceFilters) {
  return useQuery({
    queryKey: invoiceKeys.list(userId, filters),
    queryFn: ({ signal }) => getInvoices(filters, signal),
    meta: { protected: true },
  });
}

export function useSaveInvoice(userId: string, id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: InvoiceCorrection) => saveInvoice(id, data),
    onSuccess: (invoice) => client.setQueryData(invoiceKeys.detail(userId, id), invoice),
  });
}

export function useRetryExtraction(userId: string, id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => retryExtraction(id),
    onSuccess: (invoice) => client.setQueryData(invoiceKeys.detail(userId, id), invoice),
  });
}

export function useInvoice(userId: string, id: string) {
  return useQuery({
    queryKey: invoiceKeys.detail(userId, id),
    queryFn: ({ signal }) => getInvoice(id, signal),
    meta: { protected: true },
  });
}
