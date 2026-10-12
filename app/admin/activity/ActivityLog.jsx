"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Activity, Search } from "lucide-react";

import { Panel } from "@/components/ui/Panel";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/Table";
import { Input, Select } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { useDebounced } from "@/hooks/useDebounced";
import { ACTIVITY_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

const TONE = {
  "user.login": "positive",
  "user.login_failed": "danger",
  "user.register": "mark",
  "admin.user_update": "warning",
  "admin.user_delete": "danger",
  "job.delete": "danger",
  "application.create": "info",
  "application.status": "info",
};

export function ActivityLog({
  entries,
  actions,
  total,
  page,
  pages,
  perPage,
  query,
}) {
  const router = useRouter();
  const params = useSearchParams();

  const [search, setSearch] = useState(query.search);
  const debounced = useDebounced(search, 350);

  const apply = (updates) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value) next.delete(key);
      else next.set(key, String(value));
    }
    if (!("page" in updates)) next.delete("page");
    router.push(`/admin/activity?${next.toString()}`, { scroll: false });
  };

  useEffect(() => {
    if (debounced === (params.get("search") || "")) return;
    apply({ search: debounced });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return (
    <>
      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto]">
        <Input
          icon={Search}
          placeholder="Search who, what or which record"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search the activity log"
        />
        <Select
          value={query.action}
          onChange={(event) => apply({ action: event.target.value })}
          aria-label="Filter by action"
          className="sm:w-56"
        >
          <option value="">Any action</option>
          {actions.map((item) => (
            <option key={item.value} value={item.value}>
              {ACTIVITY_LABELS[item.value] || item.value} ({item.count})
            </option>
          ))}
        </Select>
      </div>

      {entries.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="Nothing recorded for that"
          description="Try a different action or clear the search."
          action={{
            label: "Clear filters",
            href: "/admin/activity",
            variant: "outline",
          }}
        />
      ) : (
        <>
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th className="w-44">When</Th>
                  <Th>Action</Th>
                  <Th>Who</Th>
                  <Th className="hidden md:table-cell">Detail</Th>
                  <Th className="hidden lg:table-cell">From</Th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <Tr key={entry.id}>
                    <Td className="whitespace-nowrap font-mono text-[0.6875rem] text-ink-3">
                      {formatDate(entry.createdAt, { withTime: true })}
                    </Td>
                    <Td>
                      <Badge tone={TONE[entry.action] || "neutral"}>
                        {ACTIVITY_LABELS[entry.action] || entry.action}
                      </Badge>
                    </Td>
                    <Td>
                      {entry.userId ? (
                        <Link
                          href={`/admin/users/${entry.userId}`}
                          className="text-[0.8125rem] text-ink hover:underline"
                        >
                          {entry.actorName || "Member"}
                        </Link>
                      ) : (
                        <span className="text-[0.8125rem] text-ink-3">
                          {entry.actorName || "—"}
                        </span>
                      )}
                      {entry.actorRole ? (
                        <span className="block font-mono text-[0.625rem] text-ink-3">
                          {entry.actorRole.toLowerCase()}
                        </span>
                      ) : null}
                    </Td>
                    <Td className="hidden max-w-[22rem] md:table-cell">
                      <span className="block truncate text-[0.75rem] text-ink-2">
                        {entry.summary || "—"}
                      </span>
                      {entry.entityId ? (
                        <span className="block truncate font-mono text-[0.625rem] text-ink-3">
                          {entry.entity}: {entry.entityId}
                        </span>
                      ) : null}
                    </Td>
                    <Td className="hidden font-mono text-[0.625rem] text-ink-3 lg:table-cell">
                      {entry.ip || "—"}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>

          <Panel className="mt-4 px-4 py-3">
            <Pagination
              page={page}
              pages={pages}
              total={total}
              perPage={perPage}
              onChange={(next) => apply({ page: next > 1 ? next : "" })}
            />
          </Panel>
        </>
      )}
    </>
  );
}
