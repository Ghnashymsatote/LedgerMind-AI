"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { supplierSchema } from "../schemas/supplier.schema";
import type { Supplier, SupplierFormValues, SupplierInput } from "../types/supplier.types";

export function SupplierForm({ supplier, disabled, onSave, onCancel }: {
  supplier?: Supplier;
  disabled: boolean;
  onSave: (input: SupplierInput) => Promise<void>;
  onCancel: () => void;
}) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<
    SupplierFormValues, unknown, SupplierInput
  >({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: supplier?.name ?? "",
      taxId: supplier?.taxId ?? "",
      tallyLedgerName: supplier?.tallyLedgerName ?? "",
      status: supplier?.status ?? "ACTIVE",
    },
  });
  const blocked = disabled || isSubmitting;
  const error = errors.name?.message ?? errors.taxId?.message ?? errors.tallyLedgerName?.message ?? errors.status?.message;

  return (
    <section className="panel p-5" aria-labelledby="supplier-form-title">
      <h2 id="supplier-form-title" className="text-lg font-semibold">{supplier ? "Edit supplier" : "Add supplier"}</h2>
      <form className="mt-4 space-y-4" method="post" noValidate onSubmit={handleSubmit(onSave)}>
        <label className="field-label">
          Supplier name
          <input className="field" maxLength={120} aria-invalid={!!errors.name} disabled={blocked} required {...register("name")} />
        </label>
        <label className="field-label">
          Tax ID (optional)
          <input className="field" maxLength={64} aria-invalid={!!errors.taxId} disabled={blocked} {...register("taxId")} />
        </label>
        <label className="field-label">
          Tally ledger name
          <input className="field" maxLength={160} aria-invalid={!!errors.tallyLedgerName} disabled={blocked} required {...register("tallyLedgerName")} />
        </label>
        <label className="field-label">
          Status
          <select className="field" aria-invalid={!!errors.status} disabled={blocked} {...register("status")}>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </label>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <button className="button" type="submit" disabled={blocked}>
            {supplier ? "Save changes" : "Add supplier"}
          </button>
          {supplier && (
            <button className="button button-secondary" type="button" disabled={blocked} onClick={onCancel}>Cancel</button>
          )}
        </div>
      </form>
    </section>
  );
}
