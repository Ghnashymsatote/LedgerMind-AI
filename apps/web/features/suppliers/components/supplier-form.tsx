"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SheetFooter } from "@/components/ui/sheet";
import { supplierSchema } from "../schemas/supplier.schema";
import type { Supplier, SupplierFormValues, SupplierInput } from "../types/supplier.types";

export function SupplierForm({ supplier, disabled, formError, onSave, onCancel }: {
  supplier?: Supplier;
  disabled: boolean;
  formError?: string | null;
  onSave: (input: SupplierInput) => Promise<void>;
  onCancel: () => void;
}) {
  const { control, register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SupplierFormValues, unknown, SupplierInput>({
    resolver: zodResolver(supplierSchema),
    defaultValues: { name: supplier?.name ?? "", taxId: supplier?.taxId ?? "", tallyLedgerName: supplier?.tallyLedgerName ?? "", status: supplier?.status ?? "ACTIVE" },
  });
  const blocked = disabled || isSubmitting;

  return (
    <form className="flex min-h-0 flex-1 flex-col" method="post" noValidate onSubmit={handleSubmit(onSave)}>
      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5">
        <div className="grid gap-2">
          <Label htmlFor="supplier-name">Supplier name</Label>
          <Input id="supplier-name" maxLength={120} aria-invalid={!!errors.name} aria-describedby={errors.name ? "supplier-name-error" : undefined} disabled={blocked} required autoFocus {...register("name")} />
          {errors.name && <p id="supplier-name-error" className="text-sm text-destructive">{errors.name.message}</p>}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="supplier-tax-id">Tax ID <span className="font-normal text-muted-foreground">(optional)</span></Label>
          <Input id="supplier-tax-id" maxLength={64} aria-invalid={!!errors.taxId} aria-describedby={errors.taxId ? "supplier-tax-id-error" : "supplier-tax-id-help"} disabled={blocked} {...register("taxId")} />
          {errors.taxId ? <p id="supplier-tax-id-error" className="text-sm text-destructive">{errors.taxId.message}</p> : <p id="supplier-tax-id-help" className="text-xs text-muted-foreground">GSTIN, VAT ID, or another supplier tax identifier.</p>}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="supplier-ledger">Tally ledger name</Label>
          <Input id="supplier-ledger" maxLength={160} aria-invalid={!!errors.tallyLedgerName} aria-describedby={errors.tallyLedgerName ? "supplier-ledger-error" : "supplier-ledger-help"} disabled={blocked} required {...register("tallyLedgerName")} />
          {errors.tallyLedgerName ? <p id="supplier-ledger-error" className="text-sm text-destructive">{errors.tallyLedgerName.message}</p> : <p id="supplier-ledger-help" className="text-xs text-muted-foreground">The exact supplier ledger used in Tally.</p>}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="supplier-status">Status</Label>
          <Controller name="status" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange} disabled={blocked}>
              <SelectTrigger id="supplier-status" className="w-full" aria-invalid={!!errors.status} aria-describedby={errors.status ? "supplier-status-error" : undefined}><SelectValue placeholder="Select a status" /></SelectTrigger>
              <SelectContent><SelectItem value="ACTIVE">Active</SelectItem><SelectItem value="INACTIVE">Inactive</SelectItem></SelectContent>
            </Select>
          )} />
          {errors.status && <p id="supplier-status-error" className="text-sm text-destructive">{errors.status.message}</p>}
        </div>
        {formError && <div className="rounded-md border border-destructive/35 bg-destructive/5 px-3 py-2 text-sm text-destructive" role="alert">{formError}</div>}
      </div>
      <SheetFooter className="border-t bg-background">
        <Button type="button" variant="outline" disabled={blocked} onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={blocked}>{blocked && <Loader2 className="animate-spin" aria-hidden="true" />}{blocked ? "Saving…" : supplier ? "Save changes" : "Add supplier"}</Button>
      </SheetFooter>
    </form>
  );
}
