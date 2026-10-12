import { cn } from "@/lib/utils";
import { LABELS, STATUS_TONE } from "@/lib/constants";

const TONES = {
  neutral: "border-rule-strong bg-surface-2 text-ink-2",
  muted: "border-rule bg-transparent text-ink-3",
  mark: "border-[var(--mark-deep)]/35 bg-mark-soft text-[var(--mark-deep)]",
  positive: "border-positive/25 bg-positive-soft text-positive",
  warning: "border-warning/25 bg-warning-soft text-warning",
  danger: "border-danger/25 bg-danger-soft text-danger",
  info: "border-info/25 bg-info-soft text-info",
};

export function Badge({ tone = "neutral", className, children, ...props }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.6875rem] font-medium",
        TONES[tone] || TONES.neutral,
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

/** Status chip that always agrees with the labels used elsewhere. */
export function StatusBadge({ value, group = "applicationStatus", className }) {
  if (!value) return null;
  const label = LABELS[group]?.[value] || value;
  return (
    <Badge tone={STATUS_TONE[value] || "neutral"} className={className}>
      {label}
    </Badge>
  );
}

/** A keyword as the parser sees it: matched keywords wear the highlighter. */
export function Keyword({ hit = false, children, className }) {
  return (
    <span
      className={cn(
        "rounded-[3px] px-1.5 py-0.5 font-mono text-[0.6875rem]",
        hit
          ? "bg-mark text-mark-ink"
          : "border border-dashed border-rule-strong text-ink-3",
        className,
      )}
    >
      {children}
    </span>
  );
}
