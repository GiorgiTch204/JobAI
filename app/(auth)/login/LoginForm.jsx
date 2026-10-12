"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { useAuth } from "@/components/providers/AuthProvider";
import { useFormState } from "@/hooks/useFormState";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const form = useFormState({ email: "", password: "" });
  const next = params.get("next");

  const handleSubmit = async (event) => {
    event.preventDefault();

    const user = await form.submit(async () => {
      return login({
        email: form.values.email,
        password: form.values.password,
      });
    });

    if (user) {
      const target =
        next && next.startsWith("/")
          ? next
          : user.role === "ADMIN"
            ? "/admin"
            : "/dashboard";
      router.replace(target);
      router.refresh();
    }
  };

  return (
    <div>
      <h1 className="font-display text-[1.75rem] leading-tight tracking-tight text-ink">
        Sign in
      </h1>
      <p className="mt-2 text-[0.875rem] text-ink-2">
        New here?{" "}
        <Link
          href="/register"
          className="font-medium text-ink underline decoration-[var(--mark-deep)] decoration-2 underline-offset-4"
        >
          Create an account
        </Link>
      </p>

      {next ? (
        <Alert tone="info" className="mt-5">
          Sign in to continue to{" "}
          <span className="font-mono text-[0.75rem]">{next}</span>.
        </Alert>
      ) : null}

      {form.error ? (
        <Alert tone="danger" className="mt-5">
          {form.error}
        </Alert>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4" noValidate>
        <Field
          label="Email address"
          htmlFor="email"
          error={form.fieldErrors.email}
        >
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            icon={Mail}
            placeholder="you@example.com"
            value={form.values.email}
            onChange={form.handleChange}
            error={form.fieldErrors.email}
            required
          />
        </Field>

        <Field
          label="Password"
          htmlFor="password"
          error={form.fieldErrors.password}
        >
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              icon={Lock}
              placeholder="Your password"
              value={form.values.password}
              onChange={form.handleChange}
              error={form.fieldErrors.password}
              className="pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-1 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded text-ink-3 transition-colors hover:text-ink-2"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
        </Field>

        <Button
          type="submit"
          size="lg"
          loading={form.submitting}
          className="mt-1 w-full"
        >
          {form.submitting ? "Signing in…" : "Sign in"}
          {!form.submitting ? (
            <ArrowRight className="size-4" aria-hidden="true" />
          ) : null}
        </Button>
      </form>

      <div className="mt-7 rounded-[var(--radius-field)] border border-dashed border-rule-strong bg-surface-2 px-4 py-3">
        <p className="text-[0.75rem] font-medium text-ink-2">Demo accounts</p>
        <dl className="mt-2 grid gap-1 font-mono text-[0.6875rem] text-ink-3">
          <div className="flex justify-between gap-3">
            <dt>member</dt>
            <dd>demo@jobai.dev · Demo12345</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>admin</dt>
            <dd>admin@jobai.dev · Admin12345</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
