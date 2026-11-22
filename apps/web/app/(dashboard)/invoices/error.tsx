"use client";

export default function InvoiceError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Invoices unavailable</h1>
      <button className="button mt-5" onClick={reset}>Try again</button>
    </main>
  );
}
