import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadInvoice } from "../api/invoice.service";
import { invoiceKeys } from "../invoice.keys";

export function useUploadInvoice(userId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: uploadInvoice,
    meta: { protected: true },
    onSuccess(invoice) {
      client.setQueryData(invoiceKeys.detail(userId, invoice.id), invoice);
      return client.invalidateQueries({ queryKey: invoiceKeys.lists(userId) });
    },
  });
}
