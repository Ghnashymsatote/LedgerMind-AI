import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateSupplier } from "../api/supplier.service";
import { supplierKeys } from "../supplier.keys";
import type { SupplierInput } from "../types/supplier.types";

export function useUpdateSupplier(userId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<SupplierInput> }) => updateSupplier(id, input),
    meta: { protected: true },
    onSuccess(supplier) {
      client.setQueryData(supplierKeys.detail(userId, supplier.id), supplier);
      return client.invalidateQueries({ queryKey: supplierKeys.list(userId), exact: true });
    },
  });
}
