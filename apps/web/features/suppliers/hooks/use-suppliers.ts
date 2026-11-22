import { useQuery } from "@tanstack/react-query";
import { getSuppliers } from "../api/supplier.service";
import { supplierKeys } from "../supplier.keys";

export function useSuppliers(userId: string) {
  return useQuery({
    queryKey: supplierKeys.list(userId),
    queryFn: ({ signal }) => getSuppliers(signal),
    meta: { protected: true },
  });
}
