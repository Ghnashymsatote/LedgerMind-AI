"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useSuppliers } from "@/features/suppliers/hooks/use-suppliers";
import { useHydrated } from "@/hooks/use-hydrated";
import { useInvoices } from "../hooks/use-invoices";
import type { InvoiceFilters } from "../types/invoice.types";

export function InvoiceList({ userId }: { userId: string }) {
  const [filters, setFilters] = useState<InvoiceFilters>({ page: 1, pageSize: 20, search: "", supplierId: "", status: "" });
  const hydrated = useHydrated();
  const invoices = useInvoices(userId, filters);
  const suppliers = useSuppliers(userId);
  const totalPages = Math.max(1, Math.ceil((invoices.data?.total ?? 0) / filters.pageSize));

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = new FormData(event.currentTarget);
    setFilters((previous) => ({
      ...previous, page: 1, search: String(input.get("search") ?? "").trim(),
      supplierId: String(input.get("supplierId") ?? ""),
      status: input.get("status") === "UPLOADED" ? "UPLOADED" : "",
    }));
  }

  function goToPage(page: number) {
    setFilters((previous) => ({ ...previous, page }));
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Invoices</h1>
        <Link className="button" href="/invoices/upload">Upload invoice</Link>
      </div>
      <form className="mt-6 flex flex-wrap items-end gap-3" onSubmit={applyFilters}>
        <label className="field-label">Search invoices<input name="search" disabled={!hydrated} className="field" maxLength={120} placeholder="File or supplier name" /></label>
        <label className="field-label">Supplier
          <select name="supplierId" disabled={!hydrated} className="field">
            <option value="">All suppliers</option>
            {suppliers.data?.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
          </select>
        </label>
        <label className="field-label">Status
          <select name="status" disabled={!hydrated} className="field">
            <option value="">All statuses</option>
            <option value="UPLOADED">Uploaded</option>
          </select>
        </label>
        <button className="button button-secondary" type="submit" disabled={!hydrated}>Apply filters</button>
      </form>
      {suppliers.isError && <p className="mt-3 text-sm text-destructive" role="alert">Supplier filters could not be loaded.</p>}
      {invoices.isPending && <p role="status" className="mt-5">Loading invoices…</p>}
      {invoices.isError && (
        <div className="panel mt-5 p-4">
          <p role="alert" className="text-destructive">{invoices.error.message}</p>
          <button className="button button-secondary mt-3" onClick={() => void invoices.refetch()}>Try again</button>
        </div>
      )}
      {invoices.data && (
        <>
          <div className="panel mt-5 overflow-x-auto">
            <table className="w-full text-left text-sm" aria-label="Invoices">
              <thead className="border-b border-border bg-muted text-muted-foreground">
                <tr>{["File", "Supplier", "Status", "Uploaded"].map((label) => <th key={label} scope="col" className="px-4 py-3 font-medium">{label}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoices.data.items.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-6 text-muted-foreground">No invoices found.</td></tr>
                )}
                {invoices.data.items.map((invoice) => (
                  <tr key={invoice.id}>
                    <th className="break-words px-4 py-3 font-medium" scope="row"><Link className="underline underline-offset-4" href={`/invoices/${invoice.id}`}>{invoice.fileName}</Link></th>
                    <td className="px-4 py-3">{invoice.supplier.name}</td>
                    <td className="px-4 py-3">Uploaded</td>
                    <td className="px-4 py-3"><time dateTime={invoice.uploadedAt}>{new Date(invoice.uploadedAt).toLocaleDateString()}</time></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <nav className="mt-4 flex flex-wrap items-center gap-3 text-sm" aria-label="Invoice pages">
            <button className="button button-secondary" disabled={filters.page <= 1} onClick={() => goToPage(filters.page - 1)}>Previous</button>
            <span>Page {filters.page} of {totalPages} · {invoices.data.total} invoices</span>
            <button className="button button-secondary" disabled={filters.page >= totalPages} onClick={() => goToPage(filters.page + 1)}>Next</button>
          </nav>
        </>
      )}
    </>
  );
}
