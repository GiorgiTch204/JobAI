import { cn } from "@/lib/utils";

/** A bordered surface. Panels carry structure; they are not decoration. */
export function Panel({ as: Component = "section", className, children, ...props }) {
  return (
    <Component
      className={cn(
        "rounded-[var(--radius-panel)] border border-rule bg-surface",
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

export function PanelHeader({ title, description, action, className, children }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 border-b border-rule px-5 py-4",
        className,
      )}
    >
      <div className="min-w-0">
        {title ? <h2 className="text-[0.9375rem] font-semibold text-ink">{title}</h2> : null}
        {description ? (
          <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-ink-3">{description}</p>
        ) : null}
        {children}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}

export function PanelBody({ className, children, ...props }) {
  return (
    <div className={cn("px-5 py-4", className)} {...props}>
      {children}
    </div>
  );
}

export function PanelFooter({ className, children }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-t border-rule bg-surface-2 px-5 py-3",
        className,
      )}
    >
      {children}
    </div>
  );
}
