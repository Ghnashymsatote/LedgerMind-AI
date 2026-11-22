import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { requireCurrentUser } from "@/features/auth/api/require-current-user";
import { authKeys } from "@/features/auth/auth.keys";
import { SupplierManager } from "@/features/suppliers/components/supplier-manager";
import { createQueryClient } from "@/lib/query/query-client";

export default async function SuppliersPage() {
  const user = await requireCurrentUser();
  const client = createQueryClient();
  client.setQueryData(authKeys.currentUser, user);

  return (
    <HydrationBoundary state={dehydrate(client)}>
      <SupplierManager />
    </HydrationBoundary>
  );
}
