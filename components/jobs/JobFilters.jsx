"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { useDebounced } from "@/hooks/useDebounced";
import { EMPLOYMENT_TYPES, LABELS, SENIORITIES, WORK_MODES } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Filters live in the URL, so a filtered list can be shared, bookmarked and
 * restored by the back button. Typing is debounced; menus apply at once.
 */
export function JobFilters({ facets, hasResume }) {
  const router = useRouter();
  const params = useSearchParams();

  const [search, setSearch] = useState(params.get("search") || "");
  const debouncedSearch = useDebounced(search, 350);

  const apply = (updates) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value) next.delete(key);
      else next.set(key, value);
    }
    next.delete("page");
    router.push(`/jobs?${next.toString()}`, { scroll: false });
  };

  useEffect(() => {
    const current = params.get("search") || "";
    if (debouncedSearch === current) return;
    apply({ search: debouncedSearch });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const active = ["location", "workMode", "employmentType", "seniority", "tag"].filter((key) =>
    params.get(key),
  );
  const activeCount = active.length + (params.get("search") ? 1 : 0);

  return (
    <div className="grid gap-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex-1">
          <Input
            icon={Search}
            placeholder="Search by role, company or technology"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search jobs"
          />
        </div>
        <Select
          value={params.get("sort") || "newest"}
          onChange={(event) => apply({ sort: event.target.value })}
          aria-label="Sort jobs"
          className="sm:w-48"
        >
          <option value="newest">Newest first</option>
          {hasResume ? <option value="match">Best match</option> : null}
          <option value="salary">Highest salary</option>
          <option value="company">Company A–Z</option>
          <option value="popular">Most viewed</option>
        </Select>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Select
          value={params.get("workMode") || ""}
          onChange={(event) => apply({ workMode: event.target.value })}
          aria-label="Work mode"
        >
          <option value="">Any work mode</option>
          {WORK_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {LABELS.workMode[mode]}
            </option>
          ))}
        </Select>

        <Select
          value={params.get("employmentType") || ""}
          onChange={(event) => apply({ employmentType: event.target.value })}
          aria-label="Employment type"
        >
          <option value="">Any contract type</option>
          {EMPLOYMENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {LABELS.employmentType[type]}
            </option>
          ))}
        </Select>

        <Select
          value={params.get("seniority") || ""}
          onChange={(event) => apply({ seniority: event.target.value })}
          aria-label="Seniority"
        >
          <option value="">Any level</option>
          {SENIORITIES.map((level) => (
            <option key={level} value={level}>
              {LABELS.seniority[level]}
            </option>
          ))}
        </Select>

        <Select
          value={params.get("location") || ""}
          onChange={(event) => apply({ location: event.target.value })}
          aria-label="Location"
        >
          <option value="">Any location</option>
          {facets.locations.map((item) => (
            <option key={item.value} value={item.value}>
              {item.value} ({item.count})
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {facets.tags.slice(0, 12).map((item) => {
          const selected = params.get("tag") === item.value;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => apply({ tag: selected ? "" : item.value })}
              className={cn(
                "rounded-full border px-2.5 py-1 font-mono text-[0.6875rem] transition-colors",
                selected
                  ? "border-[var(--mark-deep)] bg-mark text-mark-ink"
                  : "border-rule text-ink-3 hover:border-rule-strong hover:text-ink-2",
              )}
              aria-pressed={selected}
            >
              {item.value}
            </button>
          );
        })}

        {activeCount > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              router.push("/jobs", { scroll: false });
            }}
            className="ml-auto"
          >
            <X className="size-3.5" aria-hidden="true" />
            Clear {activeCount} filter{activeCount === 1 ? "" : "s"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
