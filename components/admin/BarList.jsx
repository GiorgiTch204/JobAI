import { cn } from "@/lib/utils";

/**
 * Horizontal magnitude bars for a single series (status spread, top skills).
 * One hue, lightest for the smallest value, with the number always written
 * out — so the bar is a quick comparison and the label is the fact.
 */
export function BarList({ items, emptyLabel = "Nothing to show yet.", className }) {
  const max = Math.max(1, ...items.map((item) => item.value));

  if (!items.length) {
    return <p className={cn("text-[0.8125rem] text-ink-3", className)}>{emptyLabel}</p>;
  }

  return (
    <ul className={cn("grid gap-2.5", className)}>
      {items.map((item) => (
        <li key={item.label}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate text-[0.8125rem] text-ink-2">{item.label}</span>
            <span className="tabular shrink-0 font-mono text-[0.6875rem] text-ink">
              {item.value}
              {item.suffix ? <span className="text-ink-3">{item.suffix}</span> : null}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max(2, (item.value / max) * 100)}%`,
                backgroundColor: item.color || "var(--chart-1)",
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
