export const supplierKeys = {
  list: (userId: string) => ["suppliers", userId, "list"] as const,
  detail: (userId: string, supplierId: string) => ["suppliers", userId, "detail", supplierId] as const,
};
