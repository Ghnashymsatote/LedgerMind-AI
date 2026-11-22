import { LoginForm } from "@/features/auth/components/login-form";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-muted px-6 py-12">
      <section className="panel w-full max-w-md p-7 sm:p-9">
        <p className="text-sm font-semibold text-muted-foreground">LedgerMind AI</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Sign in</h1>
        <LoginForm />
      </section>
    </main>
  );
}
