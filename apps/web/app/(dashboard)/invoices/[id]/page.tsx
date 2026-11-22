import { InvoicePage } from "@/features/invoices/components/invoice-page";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <InvoicePage screen={{ view: "detail", id }} />;
}
