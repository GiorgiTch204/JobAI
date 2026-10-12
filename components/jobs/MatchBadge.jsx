import { cn } from "@/lib/utils";
import { matchTone } from "@/lib/match";

const TONE = {
  positive: "border-positive/30 bg-positive-soft text-positive",
  mark: "border-[var(--mark-deep)]/35 bg-mark-soft text-[var(--mark-deep)]",
  warning: "border-warning/30 bg-warning-soft text-warning",
  danger: "border-danger/30 bg-danger-soft text-danger",
};

/** The one number that says whether this posting is worth your time. */
export function MatchBadge({ score, size = "md", className }) {
  if (score === null || score === undefined) return null;
  const tone = matchTone(score);

  return (
    <span
      className={cn(
        "tabular inline-flex items-baseline gap-1 rounded-full border font-mono font-medium",
        TONE[tone],
        size === "sm" ? "px-1.5 py-0.5 text-[0.625rem]" : "px-2 py-0.5 text-[0.6875rem]",
        className,
      )}
      title="How much of this posting's keyword list your CV covers"
    >
      {Math.round(score)}%
      <span className="font-sans font-normal opacity-70">match</span>
    </span>
  );
}
