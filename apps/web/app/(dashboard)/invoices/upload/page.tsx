import { InvoicePage } from "@/features/invoices/components/invoice-page";

export default function UploadInvoicePage() {
  const maxBytes = Number(process.env.INVOICE_MAX_FILE_BYTES ?? 10 * 1024 * 1024);
  return <InvoicePage screen={{ view: "upload", maxBytes }} />;
}
