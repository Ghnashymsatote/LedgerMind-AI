import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createSupplier } from "../api/supplier.service";
import { supplierKeys } from "../supplier.keys";

export function useCreateSupplier(userId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: createSupplier,
    meta: { protected: true },
    onSuccess: () => client.invalidateQueries({ queryKey: supplierKeys.list(userId), exact: true }),
  });
}
