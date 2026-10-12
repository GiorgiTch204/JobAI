import { cn } from "@/lib/utils";
import { Button } from "./Button";

/** An empty screen is an invitation to act, so it always offers the action. */
export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div
      className={cn(
        "grid justify-items-center gap-3 rounded-[var(--radius-panel)] border border-dashed border-rule-strong bg-surface px-6 py-12 text-center",
        className,
      )}
    >
      {Icon ? (
        <div className="grid size-11 place-items-center rounded-full bg-surface-2 text-ink-3">
          <Icon className="size-5" aria-hidden="true" />
        </div>
      ) : null}
      <h3 className="text-[0.9375rem] font-semibold text-ink">{title}</h3>
      {description ? (
        <p className="max-w-sm text-[0.8125rem] leading-relaxed text-ink-3">{description}</p>
      ) : null}
      {action?.href || action?.onClick ? (
        <Button
          href={action.href}
          onClick={action.onClick}
          variant={action.variant || "primary"}
          size="sm"
          className="mt-1"
        >
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}
