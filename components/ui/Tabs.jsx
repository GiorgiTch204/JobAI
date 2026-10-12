"use client";

import { cn } from "@/lib/utils";

/**
 * Tabs underlined with the highlighter: the active tab carries the mark, the
 * rest stay quiet. Horizontally scrollable on narrow screens.
 */
export function Tabs({ items, value, onChange, className, counts = {} }) {
  return (
    <div
      role="tablist"
      className={cn(
        "no-scrollbar -mb-px flex gap-1 overflow-x-auto border-b border-rule",
        className,
      )}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              "relative whitespace-nowrap px-3 pb-2.5 pt-1.5 text-[0.8125rem] font-medium transition-colors",
              active ? "text-ink" : "text-ink-3 hover:text-ink-2",
            )}
          >
            {item.label}
            {counts[item.value] !== undefined ? (
              <span className="tabular ml-1.5 text-ink-3">{counts[item.value]}</span>
            ) : null}
            <span
              className={cn(
                "absolute inset-x-1 -bottom-px h-[3px] rounded-t-full transition-opacity",
                active ? "bg-mark opacity-100" : "opacity-0",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
