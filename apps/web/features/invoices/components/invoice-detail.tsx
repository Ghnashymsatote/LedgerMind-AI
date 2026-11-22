"use client";

import Link from "next/link";
import { invoiceFileUrl } from "../api/invoice.service";
import { useInvoice } from "../hooks/use-invoices";

export function InvoiceDetail({ userId, id }: { userId: string; id: string }) {
  const detail = useInvoice(userId, id);

  return (
    <>
      <Link className="text-sm underline underline-offset-4" href="/invoices">Back to invoices</Link>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Invoice details</h1>
      {detail.isPending && <p role="status" className="mt-5">Loading invoice…</p>}
      {detail.isError && (
        <div className="panel mt-5 p-4">
          <p role="alert" className="text-destructive">{detail.error.message}</p>
          <button className="button button-secondary mt-3" onClick={() => void detail.refetch()}>Try again</button>
        </div>
      )}
      {detail.data && (
        <section className="panel mt-5 max-w-2xl p-5">
          <h2 className="break-words text-xl font-semibold">{detail.data.fileName}</h2>
          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Supplier</dt><dd>{detail.data.supplier.name}</dd>
            <dt className="text-muted-foreground">Status</dt><dd>Uploaded</dd>
            <dt className="text-muted-foreground">Uploaded by</dt><dd className="break-all">{detail.data.uploadedBy.email}</dd>
            <dt className="text-muted-foreground">Uploaded at</dt><dd><time dateTime={detail.data.uploadedAt}>{new Date(detail.data.uploadedAt).toLocaleString()}</time></dd>
            <dt className="text-muted-foreground">File size</dt><dd>{new Intl.NumberFormat().format(detail.data.sizeBytes)} bytes</dd>
          </dl>
          <div className="mt-5 flex flex-wrap gap-3">
            <a className="button" href={invoiceFileUrl(id)} target="_blank" rel="noopener noreferrer">View file</a>
            <a className="button button-secondary" href={invoiceFileUrl(id, true)}>Download file</a>
          </div>
        </section>
      )}
    </>
  );
}
