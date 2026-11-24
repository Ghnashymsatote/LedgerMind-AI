"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AlertTriangle, FileText, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { invoiceFileUrl } from "../api/invoice.service";
import { useInvoice, useRetryExtraction, useSaveInvoice } from "../hooks/use-invoices";
import type { InvoiceCorrection, InvoiceDetail as Detail, InvoiceLine } from "../types/invoice.types";

const emptyLine = (): InvoiceLine => ({ description: null, hsnSac: null, quantity: null, unitPrice: null, taxableAmount: null, taxRate: null, cgstAmount: null, sgstAmount: null, igstAmount: null, totalAmount: null });
const text = (value: string | null) => value ?? "";
const nullable = (value: string) => value.trim() || null;

function editable(invoice: Detail): InvoiceCorrection {
  return {
    invoiceNumber: invoice.invoiceNumber, invoiceDate: invoice.invoiceDate?.slice(0, 10) ?? null,
    supplierGstin: invoice.supplierGstin, buyerName: invoice.buyerName, buyerGstin: invoice.buyerGstin,
    currency: invoice.currency, taxableAmount: invoice.taxableAmount, cgstAmount: invoice.cgstAmount,
    sgstAmount: invoice.sgstAmount, igstAmount: invoice.igstAmount, totalTax: invoice.totalTax,
    invoiceTotal: invoice.invoiceTotal, lines: invoice.lines.map((line) => ({
      description: line.description, hsnSac: line.hsnSac, quantity: line.quantity, unitPrice: line.unitPrice,
      taxableAmount: line.taxableAmount, taxRate: line.taxRate, cgstAmount: line.cgstAmount,
      sgstAmount: line.sgstAmount, igstAmount: line.igstAmount, totalAmount: line.totalAmount,
    })),
  };
}

function Confidence({ value }: { value: number | null | undefined }) {
  if (value == null) return <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Not extracted</span>;
  const tone = value >= .85 ? "bg-success/15 text-success" : value >= .6 ? "bg-warning/15 text-warning-foreground" : "bg-destructive/15 text-destructive";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>{Math.round(value * 100)}% confidence</span>;
}

function Field({ label, value, confidence, onChange, type = "text", placeholder }: { label: string; value: string | null; confidence?: number | null; onChange(value: string | null): void; type?: string; placeholder?: string }) {
  return <label className="field-label"><span className="flex items-center justify-between gap-2"><span>{label}</span><Confidence value={confidence} /></span><input className="field" type={type} value={text(value)} placeholder={placeholder} onChange={(event) => onChange(nullable(event.target.value))} /></label>;
}

export function InvoiceDetail({ userId, id }: { userId: string; id: string }) {
  const detail = useInvoice(userId, id);
  const save = useSaveInvoice(userId, id);
  const retry = useRetryExtraction(userId, id);
  const [drafts, setDrafts] = useState<Record<string, InvoiceCorrection>>({});

  if (detail.isPending) return <p role="status">Loading invoice…</p>;
  if (detail.isError || !detail.data) return <div className="panel p-5"><p role="alert" className="text-destructive">{detail.error?.message ?? "Invoice not found."}</p><button className="button button-secondary mt-3" onClick={() => void detail.refetch()}>Try again</button></div>;
  const invoice = detail.data;
  const form = drafts[id] ?? editable(invoice);
  const setForm = (update: (current: InvoiceCorrection) => InvoiceCorrection) =>
    setDrafts((current) => ({ ...current, [id]: update(current[id] ?? editable(invoice)) }));
  const confidence = invoice.extractionConfidence ?? {};
  const set = <K extends keyof InvoiceCorrection>(key: K, value: InvoiceCorrection[K]) => setForm((current) => ({ ...current, [key]: value }));
  const setLine = (index: number, key: keyof InvoiceLine, value: string | null) => setForm((current) => ({ ...current, lines: current.lines.map((line, position) => position === index ? { ...line, [key]: value } : line) }));

  return <div className="space-y-5">
    <div><Link className="text-sm text-muted-foreground hover:text-foreground" href="/invoices">← Back to invoices</Link><div className="mt-3 flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-semibold tracking-tight">Review invoice</h1><p className="mt-1 text-sm text-muted-foreground">Compare the source document with extracted data. Saving does not approve the invoice.</p></div><span className="rounded-full border bg-card px-3 py-1 text-sm font-medium">{invoice.status.replaceAll("_", " ")}</span></div></div>

    {invoice.extractionWarnings?.map((warning) => <div key={warning} className="flex gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm"><AlertTriangle className="size-5 shrink-0 text-warning"/><span>{warning}</span></div>)}
    {invoice.status === "EXTRACTION_FAILED" && <button className="button" disabled={retry.isPending} onClick={() => retry.mutate()}><RotateCcw className="mr-2 size-4"/>{retry.isPending ? "Retrying…" : "Retry extraction"}</button>}
    {retry.isError && <p role="alert" className="text-sm text-destructive">{retry.error.message}</p>}

    <div className="grid gap-5 xl:grid-cols-[minmax(360px,0.9fr)_minmax(600px,1.3fr)]">
      <section className="panel overflow-hidden xl:sticky xl:top-5 xl:h-[calc(100vh-8rem)]"><div className="flex items-center justify-between border-b p-4"><div className="flex min-w-0 items-center gap-2"><FileText className="size-4 shrink-0"/><span className="truncate text-sm font-medium">{invoice.fileName}</span></div><a className="text-sm underline" href={invoiceFileUrl(id, true)}>Download</a></div>{invoice.mimeType === "application/pdf" ? <iframe title="Invoice document" className="h-[calc(100%-57px)] w-full bg-muted" src={invoiceFileUrl(id)} /> : <div className="relative h-[calc(100%-57px)] bg-muted p-4"><Image unoptimized fill className="object-contain p-4" src={invoiceFileUrl(id)} alt="Uploaded invoice" /></div>}</section>

      <section className="space-y-5">
        <form onSubmit={(event) => { event.preventDefault(); save.mutate(form); }} className="space-y-5">
          <div className="panel p-5"><h2 className="text-lg font-semibold">Invoice and GST details</h2><div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Invoice number" value={form.invoiceNumber} confidence={confidence.invoice_number} onChange={(v) => set("invoiceNumber", v)} />
            <Field label="Invoice date" type="date" value={form.invoiceDate} confidence={confidence.invoice_date} onChange={(v) => set("invoiceDate", v)} />
            <Field label="Supplier GSTIN" value={form.supplierGstin} confidence={confidence.supplier_gstin} placeholder="15-character GSTIN" onChange={(v) => set("supplierGstin", v?.toUpperCase() ?? null)} />
            <Field label="Buyer GSTIN" value={form.buyerGstin} confidence={confidence.buyer_gstin} placeholder="15-character GSTIN" onChange={(v) => set("buyerGstin", v?.toUpperCase() ?? null)} />
            <Field label="Buyer name" value={form.buyerName} confidence={confidence.buyer_name} onChange={(v) => set("buyerName", v)} />
            <Field label="Currency" value={form.currency} confidence={confidence.currency} onChange={(v) => set("currency", (v ?? "INR").toUpperCase())} />
          </div></div>
          <div className="panel p-5"><h2 className="text-lg font-semibold">Tax summary</h2><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {([ ["taxableAmount", "Taxable amount", "taxable_amount"], ["cgstAmount", "CGST", "cgst_amount"], ["sgstAmount", "SGST", "sgst_amount"], ["igstAmount", "IGST", "igst_amount"], ["totalTax", "Total tax", "total_tax"], ["invoiceTotal", "Invoice total", "invoice_total"] ] as const).map(([key, label, confidenceKey]) => <Field key={key} label={label} value={form[key]} confidence={confidence[confidenceKey]} placeholder="0.00" onChange={(v) => set(key, v)} />)}
          </div></div>
          <div className="panel overflow-hidden"><div className="flex items-center justify-between p-5"><div><h2 className="text-lg font-semibold">Line items</h2><p className="text-sm text-muted-foreground">Amounts are stored as exact decimals.</p></div><button type="button" className="button button-secondary" onClick={() => set("lines", [...form.lines, emptyLine()])}><Plus className="mr-2 size-4"/>Add line</button></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-sm"><thead className="border-y bg-muted/60 text-left"><tr>{["Description", "HSN/SAC", "Qty", "Unit price", "Taxable", "Tax %", "CGST", "SGST", "IGST", "Total", ""].map((label) => <th key={label} className="p-3 font-medium">{label}</th>)}</tr></thead><tbody>{form.lines.length === 0 ? <tr><td colSpan={11} className="p-8 text-center text-muted-foreground">No line items were extracted. Add them manually if present.</td></tr> : form.lines.map((line, index) => <tr key={index} className="border-b last:border-0">{(["description", "hsnSac", "quantity", "unitPrice", "taxableAmount", "taxRate", "cgstAmount", "sgstAmount", "igstAmount", "totalAmount"] as const).map((key) => <td key={key} className="p-2"><input aria-label={`${key} line ${index + 1}`} className="field min-w-24" value={text(line[key])} onChange={(event) => setLine(index, key, nullable(event.target.value))}/></td>)}<td className="p-2"><button type="button" aria-label={`Remove line ${index + 1}`} className="rounded p-2 text-destructive hover:bg-destructive/10" onClick={() => set("lines", form.lines.filter((_, position) => position !== index))}><Trash2 className="size-4"/></button></td></tr>)}</tbody></table></div>
          </div>
          {save.isError && <p role="alert" className="text-sm text-destructive">{save.error.message}</p>}{save.isSuccess && <p role="status" className="text-sm text-success">Corrections saved. The invoice still requires human approval in Phase 3.</p>}
          <div className="flex justify-end"><button className="button" disabled={save.isPending || invoice.status !== "NEEDS_REVIEW"}><Save className="mr-2 size-4"/>{save.isPending ? "Saving…" : "Save corrections"}</button></div>
        </form>
      </section>
    </div>
  </div>;
}
