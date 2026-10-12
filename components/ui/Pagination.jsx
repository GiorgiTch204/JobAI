"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "./Button";

export function Pagination({ page, pages, total, perPage, onChange, className }) {
  if (pages <= 1) {
    return total ? (
      <p className={cn("text-[0.75rem] text-ink-3", className)}>
        {total} result{total === 1 ? "" : "s"}
      </p>
    ) : null;
  }

  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3", className)}>
      <p className="tabular text-[0.75rem] text-ink-3">
        {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-1.5">
        <Button
          variant="quiet"
          size="icon-sm"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="tabular px-1 text-[0.75rem] text-ink-2">
          {page} / {pages}
        </span>
        <Button
          variant="quiet"
          size="icon-sm"
          onClick={() => onChange(page + 1)}
          disabled={page >= pages}
          aria-label="Next page"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
