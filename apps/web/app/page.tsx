import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">LedgerMind AI</h1>
      <Link className="button mt-5" href="/suppliers">Open suppliers</Link>
    </main>
  );
}
