import Link from "next/link";
import { LoaderCircle } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * One button, four intents. The ink-filled button is the primary action; the
 * highlighter colour is reserved for marks and scores, so it is never a
 * background here except on the one "mark" intent used for a single
 * celebratory action per screen.
 */

const BASE =
  "inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap rounded-[var(--radius-field)] " +
  "transition-[background-color,border-color,color,box-shadow,transform] duration-150 " +
  "disabled:opacity-55 disabled:pointer-events-none active:translate-y-px select-none";

const VARIANTS = {
  primary:
    "bg-ink text-[var(--surface)] hover:bg-[color-mix(in_oklab,var(--ink)_88%,var(--mark-deep))] shadow-[0_1px_2px_rgb(13_22_35/0.18)]",
  mark: "bg-mark text-mark-ink hover:bg-[color-mix(in_oklab,var(--mark)_86%,var(--ink))]",
  outline: "border border-rule-strong bg-surface text-ink hover:bg-surface-2",
  ghost: "text-ink-2 hover:bg-surface-2 hover:text-ink",
  danger: "border border-danger/30 bg-danger-soft text-danger hover:border-danger/60",
  quiet: "border border-rule bg-transparent text-ink-2 hover:border-rule-strong hover:text-ink",
};

const SIZES = {
  sm: "h-8 px-3 text-[0.8125rem]",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-[0.9375rem]",
  icon: "h-9 w-9",
  "icon-sm": "h-8 w-8",
};

export function Button({
  as,
  href,
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className,
  children,
  type = "button",
  ...props
}) {
  const classes = cn(BASE, VARIANTS[variant], SIZES[size], className);
  const content = (
    <>
      {loading ? <LoaderCircle className="size-4 spin" aria-hidden="true" /> : null}
      {children}
    </>
  );

  if (href && !disabled && !loading) {
    const Component = as || Link;
    return (
      <Component href={href} className={classes} {...props}>
        {content}
      </Component>
    );
  }

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {content}
    </button>
  );
}
