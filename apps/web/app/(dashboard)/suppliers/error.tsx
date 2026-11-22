"use client";

export default function SupplierError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Suppliers unavailable</h1>
      <p className="mt-2 text-muted-foreground">The supplier records could not be loaded.</p>
      <button className="button mt-5" onClick={reset}>Try again</button>
    </main>
  );
}
