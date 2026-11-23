import { ThemeToggle } from "@/components/theme-toggle";
import { LoginForm } from "@/features/auth/components/login-form";

export default function LoginPage() {
  return (
    <main className="relative grid min-h-screen place-items-center bg-muted px-6 py-12">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>
      <section className="panel w-full max-w-md p-7 sm:p-9">
        <p className="text-sm font-semibold text-muted-foreground">LedgerMind AI</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Sign in</h1>
        <LoginForm />
      </section>
    </main>
  );
}
