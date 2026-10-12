import { cn } from "@/lib/utils";

/**
 * Tables are the admin console's main instrument, so they get real hairlines,
 * a sticky header on tall lists and horizontal scrolling on small screens
 * instead of collapsing into unreadable cards.
 */
export function TableWrap({ className, children }) {
  return (
    <div
      className={cn(
        "scrollbar-thin overflow-x-auto rounded-[var(--radius-panel)] border border-rule bg-surface",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Table({ className, children }) {
  return <table className={cn("w-full border-collapse text-left text-sm", className)}>{children}</table>;
}

export function Th({ className, children, ...props }) {
  return (
    <th
      className={cn(
        "sticky top-0 z-10 border-b border-rule bg-surface-2 px-4 py-2.5 text-[0.6875rem] font-semibold tracking-wide text-ink-3",
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function Td({ className, children, ...props }) {
  return (
    <td className={cn("border-b border-rule px-4 py-3 align-middle text-ink-2", className)} {...props}>
      {children}
    </td>
  );
}

export function Tr({ className, children, ...props }) {
  return (
    <tr className={cn("transition-colors last:[&>td]:border-0 hover:bg-surface-2", className)} {...props}>
      {children}
    </tr>
  );
}
