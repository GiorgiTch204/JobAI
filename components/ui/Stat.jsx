import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/utils";

/**
 * A single number with its name. Deltas are shown as plain text ("+3 this
 * week") rather than coloured arrows, because the direction of a count is
 * rarely good or bad on its own.
 */
export function Stat({ label, value, delta, icon: Icon, href, className }) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="text-[0.75rem] font-medium tracking-wide text-ink-3">{label}</span>
        {Icon ? <Icon className="size-4 shrink-0 text-ink-3" aria-hidden="true" /> : null}
      </div>
      <span className="tabular mt-3 block font-display text-[1.75rem] leading-none text-ink">
        {typeof value === "number" ? formatNumber(value) : value}
      </span>
      {delta ? <span className="mt-1.5 block text-[0.75rem] text-ink-3">{delta}</span> : null}
    </>
  );

  const classes = cn(
    "block rounded-[var(--radius-panel)] border border-rule bg-surface px-4 py-3.5",
    href && "transition-colors hover:border-rule-strong",
    className,
  );

  if (href) {
    return (
      <a href={href} className={classes}>
        {body}
      </a>
    );
  }
  return <div className={classes}>{body}</div>;
}
