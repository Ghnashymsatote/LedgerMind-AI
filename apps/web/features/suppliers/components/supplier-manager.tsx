"use client";

import { useState } from "react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import { useLogout } from "@/features/auth/hooks/use-logout";
import type { CurrentUser } from "@/features/auth/types/auth.types";
import { useHydrated } from "@/hooks/use-hydrated";
import { cn } from "@/lib/utils";
import { useCreateSupplier } from "../hooks/use-create-supplier";
import { useSupplier } from "../hooks/use-supplier";
import { useSuppliers } from "../hooks/use-suppliers";
import { useUpdateSupplier } from "../hooks/use-update-supplier";
import type { SupplierInput } from "../types/supplier.types";
import { SupplierForm } from "./supplier-form";
import { SupplierList } from "./supplier-list";

export function SupplierManager() {
  const currentUser = useCurrentUser();
  if (currentUser.data) return <SupplierWorkspace key={currentUser.data.id} user={currentUser.data} />;

  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      {currentUser.isError ? (
        <>
          <p role="alert">The session could not be checked.</p>
          <button className="button mt-5" onClick={() => void currentUser.refetch()}>Try again</button>
        </>
      ) : <p role="status">Checking your session…</p>}
    </main>
  );
}

function SupplierWorkspace({ user }: { user: CurrentUser }) {
  const hydrated = useHydrated();
  const admin = user.role === "ADMIN";
  const [editing, setEditing] = useState<string | null>(null);
  const [formVersion, setFormVersion] = useState(0);
  const [feedback, setFeedback] = useState<{ message: string; error?: boolean } | null>(null);
  const list = useSuppliers(user.id);
  const detail = useSupplier(user.id, admin ? editing : null);
  const create = useCreateSupplier(user.id);
  const update = useUpdateSupplier(user.id);
  const logout = useLogout();
  const pending = create.isPending || update.isPending || logout.isPending || logout.isSuccess;
  const disabled = !hydrated || pending;

  async function save(input: SupplierInput) {
    setFeedback(null);
    try {
      if (editing) {
        await update.mutateAsync({ id: editing, input });
      } else {
        await create.mutateAsync(input);
      }
      setFeedback({ message: editing ? "Supplier updated." : "Supplier created." });
      setEditing(null);
      setFormVersion((version) => version + 1);
    } catch (error) {
      setFeedback({ error: true, message: error instanceof Error ? error.message : "Saving failed." });
    }
  }

  function signOut() {
    setFeedback(null);
    logout.mutate(undefined, {
      onError: (error) => setFeedback({ error: true, message: error.message }),
    });
  }

  function startEditing(id: string) {
    setEditing(id);
    setFeedback(null);
  }

  return (
    <>
      <DashboardHeader user={user} disabled={disabled} signOut={signOut} />
      <main className="mx-auto max-w-7xl px-6 py-9">
        <h1 className="text-3xl font-semibold tracking-tight">Suppliers &amp; mappings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {admin ? "Manage supplier records and their Tally ledger mappings." : "View supplier records and their Tally ledger mappings."}
        </p>
        {feedback && (
          <p role={feedback.error ? "alert" : "status"} className={cn("mt-4 text-sm", feedback.error && "text-destructive")}>
            {feedback.message}
          </p>
        )}
        <div className={cn("mt-6 grid items-start gap-6", admin && "lg:grid-cols-[minmax(0,1fr)_20rem]")}>
          <div className="min-w-0 space-y-3">
            {list.isPending && <p className="panel p-4 text-sm text-muted-foreground" role="status">Loading suppliers…</p>}
            {list.isError && (
              <div className="panel p-4">
                <p role="alert" className="text-sm text-destructive">{list.error.message}</p>
                <button className="button button-secondary mt-3" onClick={() => void list.refetch()} disabled={list.isFetching}>Try again</button>
              </div>
            )}
            {list.data && <SupplierList suppliers={list.data} editing={editing} disabled={disabled} onEdit={admin ? startEditing : undefined} />}
          </div>
          {admin && (
            editing && !detail.data ? (
              <section className="panel p-5">
                <h2 className="text-lg font-semibold">Edit supplier</h2>
                {detail.isError ? (
                  <>
                    <p role="alert" className="mt-3 text-sm text-destructive">{detail.error.message}</p>
                    <button className="button button-secondary mt-3" onClick={() => void detail.refetch()} disabled={detail.isFetching}>Try again</button>
                  </>
                ) : <p role="status" className="mt-3 text-sm text-muted-foreground">Loading supplier…</p>}
                <button className="button button-secondary mt-3" onClick={() => setEditing(null)}>Cancel</button>
              </section>
            ) : (
              <SupplierForm key={`${editing ?? "new"}-${formVersion}`} supplier={editing ? detail.data : undefined}
                disabled={disabled} onSave={save} onCancel={() => setEditing(null)} />
            )
          )}
        </div>
      </main>
    </>
  );
}
