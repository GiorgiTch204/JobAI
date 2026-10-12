import { cn } from "@/lib/utils";

const TONE_BG = {
  mark: "bg-[var(--mark-deep)]",
  positive: "bg-positive",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  ink: "bg-ink",
};

/**
 * A horizontal score bar. Scores are read, not admired: the number sits
 * beside the bar in tabular figures and the track shows the remainder.
 */
export function Meter({ value = 0, max = 100, tone = "mark", label, caption, size = "md", className }) {
  const pct = Math.max(0, Math.min(100, (Number(value) / Number(max || 100)) * 100));

  return (
    <div className={cn("grid gap-1.5", className)}>
      {label || caption ? (
        <div className="flex items-baseline justify-between gap-3">
          {label ? <span className="text-[0.8125rem] text-ink-2">{label}</span> : null}
          {caption ? <span className="tabular text-[0.75rem] text-ink-3">{caption}</span> : null}
        </div>
      ) : null}
      <div
        className={cn(
          "w-full overflow-hidden rounded-full bg-surface-3",
          size === "sm" ? "h-1" : size === "lg" ? "h-2.5" : "h-1.5",
        )}
        role="meter"
        aria-valuenow={Math.round(Number(value))}
        aria-valuemin={0}
        aria-valuemax={Number(max)}
        aria-label={label || "score"}
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-500", TONE_BG[tone])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/** The big ATS number, with the grade underneath. */
export function ScoreDial({ score = 0, grade, tone = "mark", caption, className }) {
  return (
    <div className={cn("grid gap-2", className)}>
      <div className="flex items-end gap-2">
        <span className="tabular font-display text-5xl leading-none tracking-tight text-ink">
          {Math.round(score)}
        </span>
        <span className="pb-1 text-sm text-ink-3">/ 100</span>
      </div>
      <Meter value={score} tone={tone} size="lg" />
      <div className="flex items-baseline justify-between gap-2 text-[0.75rem]">
        <span className="font-medium text-ink-2">{grade}</span>
        {caption ? <span className="text-ink-3">{caption}</span> : null}
      </div>
    </div>
  );
}
