import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">LedgerMind AI</h1>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link className="button" href="/invoices">Open invoices</Link>
        <Link className="button button-secondary" href="/suppliers">Open suppliers</Link>
      </div>
    </main>
  );
}
