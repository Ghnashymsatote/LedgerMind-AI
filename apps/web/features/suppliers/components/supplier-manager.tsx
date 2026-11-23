"use client";

import { AlertCircle, CheckCircle2, Plus, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import type { CurrentUser } from "@/features/auth/types/auth.types";
import { useHydrated } from "@/hooks/use-hydrated";
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
  return currentUser.isError ? (
    <Alert variant="destructive" className="mx-auto max-w-xl">
      <AlertCircle /><AlertTitle>Session unavailable</AlertTitle>
      <AlertDescription><p>The session could not be checked.</p><Button variant="outline" size="sm" className="mt-3" onClick={() => void currentUser.refetch()}>Try again</Button></AlertDescription>
    </Alert>
  ) : <SupplierPageSkeleton />;
}

function SupplierWorkspace({ user }: { user: CurrentUser }) {
  const hydrated = useHydrated();
  const admin = user.role === "ADMIN";
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const list = useSuppliers(user.id);
  const detail = useSupplier(user.id, admin ? editing : null);
  const create = useCreateSupplier(user.id);
  const update = useUpdateSupplier(user.id);
  const pending = create.isPending || update.isPending;
  const disabled = !hydrated || pending;

  function openCreate() { setEditing(null); setNotice(null); setFormError(null); setSheetOpen(true); }
  function openEdit(id: string) { setEditing(id); setNotice(null); setFormError(null); setSheetOpen(true); }
  function changeSheetOpen(open: boolean) {
    if (!open && pending) return;
    setSheetOpen(open);
    if (!open) { setEditing(null); setFormError(null); }
  }

  async function save(input: SupplierInput) {
    setFormError(null);
    try {
      if (editing) await update.mutateAsync({ id: editing, input });
      else await create.mutateAsync(input);
      setNotice(editing ? "Supplier updated successfully." : "Supplier added successfully.");
      setSheetOpen(false);
      setEditing(null);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "The supplier could not be saved.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Suppliers</h1><p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">Manage supplier records and maintain the accounting ledger mappings used for invoice processing.</p></div>
        {admin && <Button className="w-full sm:w-auto" onClick={openCreate} disabled={disabled}><Plus />Add Supplier</Button>}
      </div>

      {notice && <div className="flex items-center gap-2 rounded-lg border border-emerald-600/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300" role="status"><CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />{notice}</div>}
      {list.isPending && <SupplierTableSkeleton />}
      {list.isError && (
        <Alert variant="destructive"><AlertCircle /><AlertTitle>Suppliers could not be loaded</AlertTitle><AlertDescription><p>{list.error.message}</p><Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void list.refetch()} disabled={list.isFetching}><RefreshCw className={list.isFetching ? "animate-spin" : undefined} />Try again</Button></AlertDescription></Alert>
      )}
      {list.data && <SupplierList suppliers={list.data} disabled={disabled} onEdit={admin ? openEdit : undefined} />}

      {admin && (
        <Sheet open={sheetOpen} onOpenChange={changeSheetOpen}>
          <SheetContent className="w-full gap-0 p-0 sm:max-w-md" side="right">
            <SheetHeader className="border-b px-4 py-5 pr-12"><SheetTitle>{editing ? "Edit supplier" : "Add supplier"}</SheetTitle><SheetDescription>{editing ? "Update the supplier record and its accounting ledger mapping." : "Create a supplier record and map it to the corresponding Tally ledger."}</SheetDescription></SheetHeader>
            {editing && !detail.data ? (
              detail.isError ? (
                <div className="p-4"><Alert variant="destructive"><AlertCircle /><AlertTitle>Supplier could not be loaded</AlertTitle><AlertDescription><p>{detail.error.message}</p><Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void detail.refetch()} disabled={detail.isFetching}>Try again</Button></AlertDescription></Alert></div>
              ) : <SupplierFormSkeleton />
            ) : (
              <SupplierForm key={editing ?? "create"} supplier={editing ? detail.data : undefined} disabled={disabled} formError={formError} onSave={save} onCancel={() => changeSheetOpen(false)} />
            )}
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}

function SupplierPageSkeleton() {
  return <div className="space-y-6" role="status" aria-label="Loading suppliers"><div className="space-y-2"><Skeleton className="h-8 w-40" /><Skeleton className="h-4 w-full max-w-xl" /></div><SupplierTableSkeleton /></div>;
}

function SupplierTableSkeleton() {
  return <Card className="gap-0 overflow-hidden py-0" role="status" aria-label="Loading supplier records"><CardHeader className="gap-2 border-b px-6 py-5"><Skeleton className="h-5 w-36" /><Skeleton className="h-4 w-20" /></CardHeader><CardContent className="space-y-4 p-6">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="grid grid-cols-[minmax(8rem,1.2fr)_minmax(7rem,.8fr)_minmax(10rem,1fr)_5rem] gap-4"><Skeleton className="h-5" /><Skeleton className="h-5" /><Skeleton className="h-5" /><Skeleton className="h-5" /></div>)}</CardContent></Card>;
}

function SupplierFormSkeleton() {
  return <div className="space-y-5 p-4" role="status" aria-label="Loading supplier"><Skeleton className="h-16 w-full" /><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /><Skeleton className="h-16 w-full" /></div>;
}
