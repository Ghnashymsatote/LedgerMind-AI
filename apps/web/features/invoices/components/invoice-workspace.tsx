"use client";

import { DashboardHeader } from "@/components/layout/dashboard-header";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import { useLogout } from "@/features/auth/hooks/use-logout";
import { useHydrated } from "@/hooks/use-hydrated";
import type { InvoiceScreen } from "../types/invoice.types";
import { InvoiceDetail } from "./invoice-detail";
import { InvoiceList } from "./invoice-list";
import { InvoiceUploadForm } from "./invoice-upload-form";

export function InvoiceWorkspace({ screen }: { screen: InvoiceScreen }) {
  const current = useCurrentUser();
  const logout = useLogout();
  const hydrated = useHydrated();

  if (!current.data) {
    return (
      <main className="mx-auto max-w-xl px-6 py-16">
        {current.isError ? (
          <>
            <p role="alert">The session could not be checked.</p>
            <button className="button mt-5" onClick={() => void current.refetch()}>Try again</button>
          </>
        ) : <p role="status">Checking your session…</p>}
      </main>
    );
  }

  const user = current.data;
  return (
    <>
      <DashboardHeader user={user} disabled={!hydrated || logout.isPending || logout.isSuccess} signOut={() => logout.mutate()} />
      <main className="mx-auto max-w-7xl px-6 py-9" key={user.id}>
        {logout.error && <p role="alert" className="mb-4 text-destructive">{logout.error.message}</p>}
        {screen.view === "list" && <InvoiceList userId={user.id} />}
        {screen.view === "upload" && <InvoiceUploadForm userId={user.id} maxBytes={screen.maxBytes} />}
        {screen.view === "detail" && <InvoiceDetail userId={user.id} id={screen.id} />}
      </main>
    </>
  );
}
