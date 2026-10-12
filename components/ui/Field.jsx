"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

const CONTROL =
  "w-full rounded-[var(--radius-field)] border bg-surface px-3 text-sm text-ink " +
  "transition-[border-color,box-shadow] duration-150 placeholder:text-ink-3 " +
  "focus:outline-none focus-visible:border-[var(--mark-deep)] focus-visible:ring-2 " +
  "focus-visible:ring-[color-mix(in_oklab,var(--mark)_60%,transparent)] disabled:opacity-60";

export function Field({ label, hint, error, required, children, className, htmlFor }) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      {label ? (
        <label
          htmlFor={htmlFor}
          className="flex items-baseline justify-between gap-2 text-[0.8125rem] font-medium text-ink-2"
        >
          <span>
            {label}
            {required ? <span className="ml-0.5 text-danger">*</span> : null}
          </span>
          {hint && !error ? <span className="text-[0.6875rem] text-ink-3">{hint}</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="text-[0.75rem] text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ className, icon: Icon, error, ...props }) {
  const generated = useId();
  const id = props.id || generated;

  return (
    <div className="relative">
      {Icon ? (
        <Icon
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3"
          aria-hidden="true"
        />
      ) : null}
      <input
        id={id}
        className={cn(
          CONTROL,
          "h-10",
          Icon && "pl-9",
          error ? "border-danger" : "border-rule-strong",
          className,
        )}
        aria-invalid={error ? "true" : undefined}
        {...props}
      />
    </div>
  );
}

export function Textarea({ className, error, rows = 4, ...props }) {
  return (
    <textarea
      rows={rows}
      className={cn(
        CONTROL,
        "resize-y py-2.5 leading-relaxed",
        error ? "border-danger" : "border-rule-strong",
        className,
      )}
      aria-invalid={error ? "true" : undefined}
      {...props}
    />
  );
}

export function Select({ className, error, children, ...props }) {
  return (
    <div className="relative">
      <select
        className={cn(
          CONTROL,
          "h-10 appearance-none pr-9",
          error ? "border-danger" : "border-rule-strong",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-ink-3"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export function Checkbox({ label, description, className, ...props }) {
  const generated = useId();
  const id = props.id || generated;

  return (
    <div className={cn("flex items-start gap-2.5", className)}>
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 rounded-[4px] border border-rule-strong accent-[var(--mark-deep)]"
        {...props}
      />
      <label htmlFor={id} className="text-[0.8125rem] leading-snug text-ink-2">
        {label}
        {description ? <span className="block text-ink-3">{description}</span> : null}
      </label>
    </div>
  );
}
