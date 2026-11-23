import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireCurrentUser } from "@/features/auth/api/require-current-user";
import { authKeys } from "@/features/auth/auth.keys";
import { createQueryClient } from "@/lib/query/query-client";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const [user, cookieStore] = await Promise.all([requireCurrentUser(), cookies()]);
  const client = createQueryClient();
  client.setQueryData(authKeys.currentUser, user);
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <HydrationBoundary state={dehydrate(client)}>
      <DashboardShell user={user} defaultOpen={defaultOpen}>{children}</DashboardShell>
    </HydrationBoundary>
  );
}
