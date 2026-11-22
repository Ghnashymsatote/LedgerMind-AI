"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useHydrated } from "@/hooks/use-hydrated";
import { useLogin } from "../hooks/use-login";
import { loginSchema } from "../schemas/login.schema";
import type { LoginInput } from "../types/auth.types";

export function LoginForm() {
  const hydrated = useHydrated();
  const login = useLogin();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const pending = login.isPending || login.isSuccess;
  const error = errors.email?.message ?? errors.password?.message ?? login.error?.message;

  return (
    <form className="mt-7 space-y-4" method="post" noValidate onSubmit={handleSubmit((values) => login.mutate(values))}>
      <label className="field-label">
        Email
        <input className="field" type="email" autoComplete="username" maxLength={254}
          aria-invalid={!!errors.email} disabled={!hydrated || pending} required {...register("email")} />
      </label>
      <label className="field-label">
        Password
        <input className="field" type="password" autoComplete="current-password" maxLength={128}
          aria-invalid={!!errors.password} disabled={!hydrated || pending} required {...register("password")} />
      </label>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <button className="button w-full" type="submit" disabled={!hydrated || pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
