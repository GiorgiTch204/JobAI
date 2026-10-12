"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Check, Eye, EyeOff, Lock, Mail, UserRound } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Checkbox, Field, Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { useAuth } from "@/components/providers/AuthProvider";
import { useFormState } from "@/hooks/useFormState";
import { passwordStrength } from "@/lib/auth/password";
import { cn } from "@/lib/utils";

const RULES = [
  { key: "length", label: "At least 8 characters" },
  { key: "number", label: "Contains a number" },
  { key: "letter", label: "Contains a letter" },
];

export function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { register } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const form = useFormState({ name: "", email: "", password: "", acceptedTerms: false });
  const { checks } = passwordStrength(form.values.password);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.values.acceptedTerms) {
      form.setFieldErrors({ acceptedTerms: "Please accept the terms to continue." });
      form.setError("Please accept the terms to continue.");
      return;
    }

    const user = await form.submit(() =>
      register({
        name: form.values.name,
        email: form.values.email,
        password: form.values.password,
        acceptedTerms: true,
      }),
    );

    if (user) {
      const next = params.get("next");
      router.replace(next && next.startsWith("/") ? next : "/cv");
      router.refresh();
    }
  };

  return (
    <div>
      <h1 className="font-display text-[1.75rem] leading-tight tracking-tight text-ink">
        Create your account
      </h1>
      <p className="mt-2 text-[0.875rem] text-ink-2">
        Already have one?{" "}
        <Link
          href="/login"
          className="font-medium text-ink underline decoration-[var(--mark-deep)] decoration-2 underline-offset-4"
        >
          Sign in
        </Link>
      </p>

      {form.error ? (
        <Alert tone="danger" className="mt-5">
          {form.error}
        </Alert>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4" noValidate>
        <Field label="Full name" htmlFor="name" error={form.fieldErrors.name}>
          <Input
            id="name"
            name="name"
            autoComplete="name"
            icon={UserRound}
            placeholder="Your name"
            value={form.values.name}
            onChange={form.handleChange}
            error={form.fieldErrors.name}
            required
          />
        </Field>

        <Field label="Email address" htmlFor="email" error={form.fieldErrors.email}>
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

        <Field label="Password" htmlFor="password" error={form.fieldErrors.password}>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              icon={Lock}
              placeholder="Choose a password"
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
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>

          <ul className="mt-1 grid gap-1">
            {RULES.map((rule) => {
              const met = checks[rule.key];
              return (
                <li key={rule.key} className="flex items-center gap-1.5 text-[0.6875rem]">
                  <span
                    className={cn(
                      "grid size-3.5 place-items-center rounded-full transition-colors",
                      met ? "bg-mark text-mark-ink" : "bg-surface-3 text-ink-3",
                    )}
                  >
                    <Check className="size-2.5" aria-hidden="true" />
                  </span>
                  <span className={met ? "text-ink-2" : "text-ink-3"}>{rule.label}</span>
                </li>
              );
            })}
          </ul>
        </Field>

        <Checkbox
          name="acceptedTerms"
          checked={form.values.acceptedTerms}
          onChange={form.handleChange}
          label="I agree to the terms of service and the privacy policy."
          className="mt-1"
        />

        <Button type="submit" size="lg" loading={form.submitting} className="mt-1 w-full">
          {form.submitting ? "Creating your account…" : "Create account"}
          {!form.submitting ? <ArrowRight className="size-4" aria-hidden="true" /> : null}
        </Button>
      </form>

      <p className="mt-6 text-[0.75rem] leading-relaxed text-ink-3">
        Your CV and your scores stay in this application's own database. Nothing is sent to a third
        party for scoring.
      </p>
    </div>
  );
}
