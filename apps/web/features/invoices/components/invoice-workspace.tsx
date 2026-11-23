"use client";

import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import type { InvoiceScreen } from "../types/invoice.types";
import { InvoiceDetail } from "./invoice-detail";
import { InvoiceList } from "./invoice-list";
import { InvoiceUploadForm } from "./invoice-upload-form";

export function InvoiceWorkspace({ screen }: { screen: InvoiceScreen }) {
  const current = useCurrentUser();

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
    <div key={user.id}>
        {screen.view === "list" && <InvoiceList userId={user.id} />}
        {screen.view === "upload" && <InvoiceUploadForm userId={user.id} maxBytes={screen.maxBytes} />}
        {screen.view === "detail" && <InvoiceDetail userId={user.id} id={screen.id} />}
    </div>
  );
}
