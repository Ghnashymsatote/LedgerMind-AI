"use client";

import type { CurrentUser } from "@/features/auth/types/auth.types";

export function DashboardHeader({ user, disabled, signOut }: {
  user: CurrentUser;
  disabled: boolean;
  signOut: () => void;
}) {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-4">
        <span className="text-lg font-semibold tracking-tight">LedgerMind AI</span>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="break-all text-muted-foreground">{user.email} · {user.role === "ADMIN" ? "Admin" : "Operator"}</span>
          <button className="button button-secondary" type="button" disabled={disabled} onClick={signOut}>Sign out</button>
        </div>
      </div>
    </header>
  );
}
