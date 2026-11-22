import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { requireCurrentUser } from "@/features/auth/api/require-current-user";
import { authKeys } from "@/features/auth/auth.keys";
import { createQueryClient } from "@/lib/query/query-client";
import type { InvoiceScreen } from "../types/invoice.types";
import { InvoiceWorkspace } from "./invoice-workspace";

export async function InvoicePage({ screen }: { screen: InvoiceScreen }) {
  const user = await requireCurrentUser();
  const client = createQueryClient();
  client.setQueryData(authKeys.currentUser, user);
  return (
    <HydrationBoundary state={dehydrate(client)}>
      <InvoiceWorkspace screen={screen} />
    </HydrationBoundary>
  );
}
