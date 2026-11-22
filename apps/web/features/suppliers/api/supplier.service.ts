import { apiClient } from "@/lib/api/api-client";
import type { Supplier, SupplierInput } from "../types/supplier.types";

export function getSuppliers(signal?: AbortSignal) {
  return apiClient.request<Supplier[]>("/suppliers", { signal });
}

export function getSupplier(id: string, signal?: AbortSignal) {
  return apiClient.request<Supplier>(`/suppliers/${encodeURIComponent(id)}`, { signal });
}

export function createSupplier(input: SupplierInput) {
  return apiClient.request<Supplier>("/suppliers", { method: "POST", body: input });
}

export function updateSupplier(id: string, input: Partial<SupplierInput>) {
  return apiClient.request<Supplier>(`/suppliers/${encodeURIComponent(id)}`, { method: "PATCH", body: input });
}
