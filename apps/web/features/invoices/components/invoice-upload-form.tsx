"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import type { z } from "zod";
import { useSuppliers } from "@/features/suppliers/hooks/use-suppliers";
import { useHydrated } from "@/hooks/use-hydrated";
import { useUploadInvoice } from "../hooks/use-upload-invoice";
import { uploadSchema } from "../schemas/upload.schema";

export function InvoiceUploadForm({ userId, maxBytes }: { userId: string; maxBytes: number }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const suppliers = useSuppliers(userId);
  const upload = useUploadInvoice(userId);
  const schema = uploadSchema(maxBytes);
  const { control, handleSubmit, formState: { errors } } = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { supplierId: "" },
  });
  const disabled = !hydrated || !suppliers.data?.length || upload.isPending || upload.isSuccess;
  const error = errors.supplierId?.message ?? errors.file?.message ?? upload.error?.message;

  return (
    <>
      <Link className="text-sm underline underline-offset-4" href="/invoices">Back to invoices</Link>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Upload invoice</h1>
      <form className="panel mt-6 max-w-lg space-y-4 p-5" method="post" encType="multipart/form-data" noValidate
        onSubmit={handleSubmit((data) => upload.mutate(data, {
          onSuccess: (invoice) => router.push(`/invoices/${invoice.id}`),
        }))}>
        {suppliers.isPending && <p role="status">Loading suppliers…</p>}
        {suppliers.isError && (
          <div>
            <p role="alert" className="text-destructive">{suppliers.error.message}</p>
            <button type="button" className="button button-secondary mt-2" onClick={() => void suppliers.refetch()}>Retry suppliers</button>
          </div>
        )}
        {suppliers.data?.length === 0 && <p>Ask an administrator to add a supplier before uploading.</p>}
        <label className="field-label">
          Supplier
          <Controller name="supplierId" control={control} render={({ field }) => (
            <select {...field} className="field" disabled={disabled} aria-invalid={!!errors.supplierId}>
              <option value="">Select a supplier</option>
              {suppliers.data?.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
            </select>
          )} />
        </label>
        <label className="field-label">
          Invoice file
          <Controller name="file" control={control} render={({ field }) => (
            <input className="field py-2" type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
              name={field.name} ref={field.ref} onBlur={field.onBlur} onChange={(event) => {
                if (event.currentTarget.files) field.onChange(event.currentTarget.files);
              }} disabled={disabled} aria-invalid={!!errors.file} aria-describedby="invoice-file-limit" />
          )} />
        </label>
        <p id="invoice-file-limit" className="text-sm text-muted-foreground">
          PDF, PNG, or JPEG. Maximum {Number((maxBytes / 1048576).toFixed(2))} MB.
        </p>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <button className="button" type="submit" disabled={disabled}>{upload.isPending ? "Uploading…" : "Upload invoice"}</button>
      </form>
    </>
  );
}
