import { cn } from "@/lib/utils";

/**
 * Page title block. The description carries the one sentence that tells the
 * reader what this screen is for; actions sit to the right on wide screens
 * and stack underneath on narrow ones.
 */
export function PageHeader({
  title,
  description,
  actions,
  meta,
  className,
  children,
}) {
  return (
    <div className={cn("mb-6", className)}>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 max-w-2xl">
          <h1 className="font-display text-[1.5rem] leading-tight tracking-tight text-ink sm:text-[1.875rem]">
            {title}
          </h1>
          {description ? (
            <p className="mt-1.5 text-[0.875rem] leading-relaxed text-ink-2">
              {description}
            </p>
          ) : null}
          {meta ? (
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {meta}
            </div>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
      {children}
    </div>
  );
}
