import { skipToken, useQuery } from "@tanstack/react-query";
import { getSupplier } from "../api/supplier.service";
import { supplierKeys } from "../supplier.keys";

export function useSupplier(userId: string, id: string | null) {
  return useQuery({
    queryKey: supplierKeys.detail(userId, id ?? ""),
    queryFn: id ? ({ signal }) => getSupplier(id, signal) : skipToken,
    meta: { protected: true },
  });
}
