"use client";

import { useId, useMemo, useState } from "react";
import { Table2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

/**
 * Signups and applications per day for the last two weeks.
 *
 * Grouped bars rather than lines: these are small integer counts, and a line
 * between 0 and 2 implies a continuous quantity that does not exist. Two
 * series on one axis (both are counts), a legend, a hover read-out, one
 * direct label on the busiest day, and a table view for anyone who would
 * rather read the numbers.
 */

const SERIES = [
  { key: "users", label: "New members", color: "var(--chart-1)" },
  { key: "applications", label: "Applications", color: "var(--chart-2)" },
];

export function ActivityChart({ data }) {
  const [hovered, setHovered] = useState(null);
  const [asTable, setAsTable] = useState(false);
  const titleId = useId();

  const max = useMemo(
    () => Math.max(2, ...data.flatMap((point) => [point.users, point.applications])),
    [data],
  );
  const ceiling = Math.ceil(max / 2) * 2;

  const busiest = useMemo(
    () =>
      data.reduce(
        (best, point) =>
          point.users + point.applications > best.users + best.applications ? point : best,
        data[0] || { users: 0, applications: 0 },
      ),
    [data],
  );

  const totals = useMemo(
    () => ({
      users: data.reduce((sum, point) => sum + point.users, 0),
      applications: data.reduce((sum, point) => sum + point.applications, 0),
    }),
    [data],
  );

  if (asTable) {
    return (
      <div>
        <Header
          titleId={titleId}
          totals={totals}
          asTable={asTable}
          onToggle={() => setAsTable(false)}
        />
        <div className="scrollbar-thin mt-4 max-h-80 overflow-y-auto rounded-[var(--radius-field)] border border-rule">
          <table className="w-full text-left text-[0.8125rem]">
            <caption className="sr-only">
              New members and applications per day for the last 14 days
            </caption>
            <thead className="bg-surface-2">
              <tr>
                <th scope="col" className="px-3 py-2 text-[0.6875rem] font-semibold text-ink-3">
                  Day
                </th>
                <th scope="col" className="px-3 py-2 text-right text-[0.6875rem] font-semibold text-ink-3">
                  New members
                </th>
                <th scope="col" className="px-3 py-2 text-right text-[0.6875rem] font-semibold text-ink-3">
                  Applications
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((point) => (
                <tr key={point.day} className="border-t border-rule">
                  <td className="px-3 py-1.5 text-ink-2">{point.label}</td>
                  <td className="tabular px-3 py-1.5 text-right text-ink">{point.users}</td>
                  <td className="tabular px-3 py-1.5 text-right text-ink">{point.applications}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header
        titleId={titleId}
        totals={totals}
        asTable={asTable}
        onToggle={() => setAsTable(true)}
      />

      <div className="relative mt-5">
        {/* grid: recessive, two lines only */}
        <div className="absolute inset-0 flex flex-col justify-between" aria-hidden="true">
          {[ceiling, ceiling / 2, 0].map((value) => (
            <div key={value} className="flex items-center gap-2">
              <span className="tabular w-4 shrink-0 text-right font-mono text-[0.5625rem] text-ink-3">
                {value}
              </span>
              <span className="h-px flex-1 bg-[var(--chart-grid)]" />
            </div>
          ))}
        </div>

        {/* bars */}
        <div className="relative ml-6 flex h-40 items-end gap-[3px]">
          {data.map((point) => {
            const active = hovered === point.day;
            return (
              <div
                key={point.day}
                className="group relative flex h-full flex-1 items-end justify-center gap-[2px]"
                onMouseEnter={() => setHovered(point.day)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(point.day)}
                onBlur={() => setHovered(null)}
                tabIndex={0}
                role="button"
                aria-label={`${point.label}: ${point.users} new members, ${point.applications} applications`}
              >
                {active ? (
                  <span
                    className="pointer-events-none absolute inset-x-0 bottom-0 top-0 rounded-[2px] bg-surface-3"
                    aria-hidden="true"
                  />
                ) : null}

                {SERIES.map((series) => {
                  const value = point[series.key];
                  const height = (value / ceiling) * 100;
                  return (
                    <span
                      key={series.key}
                      className="relative w-[6px] rounded-t-[4px] transition-[height] duration-300"
                      style={{
                        height: `${Math.max(value > 0 ? 3 : 0, height)}%`,
                        backgroundColor: series.color,
                      }}
                    />
                  );
                })}

                {/* hover read-out */}
                {active ? (
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-max -translate-x-1/2 rounded-[var(--radius-field)] border border-rule bg-surface px-2.5 py-1.5 shadow-[var(--pop-shadow)]">
                    <p className="text-[0.6875rem] font-medium text-ink">{point.label}</p>
                    {SERIES.map((series) => (
                      <p
                        key={series.key}
                        className="mt-0.5 flex items-center gap-1.5 whitespace-nowrap text-[0.6875rem] text-ink-2"
                      >
                        <span
                          className="size-2 shrink-0 rounded-[2px]"
                          style={{ backgroundColor: series.color }}
                          aria-hidden="true"
                        />
                        {series.label}
                        <span className="tabular ml-auto pl-2 font-mono text-ink">
                          {point[series.key]}
                        </span>
                      </p>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* x labels: the two ends only, so nothing can collide */}
        <div className="ml-6 mt-2 flex justify-between font-mono text-[0.5625rem] text-ink-3">
          <span>{data[0]?.label}</span>
          <span>{data[data.length - 1]?.label}</span>
        </div>
      </div>

      <p className="mt-3 border-t border-rule pt-2.5 text-[0.75rem] text-ink-3">
        Busiest day was {busiest.label} with {busiest.users + busiest.applications} events.
      </p>
    </div>
  );
}

function Header({ titleId, totals, asTable, onToggle }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 id={titleId} className="text-[0.9375rem] font-semibold text-ink">
          Last 14 days
        </h3>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          {SERIES.map((series) => (
            <span key={series.key} className="flex items-center gap-1.5 text-[0.75rem] text-ink-2">
              <span
                className={cn("size-2.5 rounded-[2px]")}
                style={{ backgroundColor: series.color }}
                aria-hidden="true"
              />
              {series.label}
              <span className="tabular font-mono text-[0.6875rem] text-ink-3">
                {totals[series.key]}
              </span>
            </span>
          ))}
        </div>
      </div>

      <Button variant="quiet" size="sm" onClick={onToggle}>
        <Table2 className="size-3.5" aria-hidden="true" />
        {asTable ? "Show chart" : "Show numbers"}
      </Button>
    </div>
  );
}
