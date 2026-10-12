"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Ban, Search, Trash2, UserCheck, UserRound } from "lucide-react";

import { Panel } from "@/components/ui/Panel";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/Table";
import { Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useDebounced } from "@/hooks/useDebounced";
import { del, patch } from "@/lib/client-api";
import { LABELS } from "@/lib/constants";
import { formatDate, formatRelative } from "@/lib/utils";

export function UsersTable({ users, total, page, pages, perPage, currentUserId, query }) {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();

  const [search, setSearch] = useState(query.search);
  const debounced = useDebounced(search, 350);
  const [pending, setPending] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);

  const apply = (updates) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value) next.delete(key);
      else next.set(key, String(value));
    }
    if (!("page" in updates)) next.delete("page");
    router.push(`/admin/users?${next.toString()}`, { scroll: false });
  };

  useEffect(() => {
    if (debounced === (params.get("search") || "")) return;
    apply({ search: debounced });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const mutate = async (id, body, successMessage) => {
    setPending(id);
    try {
      await patch(`/api/admin/users/${id}`, body);
      toast.success(successMessage);
      router.refresh();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setPending("");
    }
  };

  const remove = async () => {
    const target = confirmDelete;
    setPending(target.id);
    try {
      const data = await del(`/api/admin/users/${target.id}`);
      toast.success(data.message);
      setConfirmDelete(null);
      router.refresh();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setPending("");
    }
  };

  return (
    <>
      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
        <Input
          icon={Search}
          placeholder="Search name, email, location or headline"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search members"
        />
        <Select
          value={query.role}
          onChange={(event) => apply({ role: event.target.value })}
          aria-label="Filter by role"
          className="sm:w-36"
        >
          <option value="">Any role</option>
          <option value="USER">Member</option>
          <option value="ADMIN">Admin</option>
        </Select>
        <Select
          value={query.status}
          onChange={(event) => apply({ status: event.target.value })}
          aria-label="Filter by status"
          className="sm:w-40"
        >
          <option value="">Any status</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
        </Select>
        <Select
          value={query.sort}
          onChange={(event) => apply({ sort: event.target.value })}
          aria-label="Sort members"
          className="sm:w-44"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="name">Name A–Z</option>
          <option value="active">Recently active</option>
          <option value="applications">Most applications</option>
        </Select>
      </div>

      {users.length === 0 ? (
        <EmptyState
          icon={UserRound}
          title="No members match that"
          description="Try a different search term, or clear the filters."
          action={{ label: "Clear filters", href: "/admin/users", variant: "outline" }}
        />
      ) : (
        <>
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>Member</Th>
                  <Th className="hidden md:table-cell">Role</Th>
                  <Th className="hidden lg:table-cell">CVs</Th>
                  <Th className="hidden lg:table-cell">Best ATS</Th>
                  <Th>Applications</Th>
                  <Th className="hidden xl:table-cell">Last sign-in</Th>
                  <Th className="hidden sm:table-cell">Joined</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {users.map((member) => {
                  const self = member.id === currentUserId;
                  const busy = pending === member.id;

                  return (
                    <Tr key={member.id}>
                      <Td>
                        <Link href={`/admin/users/${member.id}`} className="flex items-center gap-2.5">
                          <Avatar name={member.name} tone={member.avatarTone} size="sm" />
                          <span className="min-w-0">
                            <span className="flex items-center gap-1.5">
                              <span className="truncate text-[0.8125rem] font-medium text-ink">
                                {member.name}
                              </span>
                              {member.status === "SUSPENDED" ? (
                                <Badge tone="danger">suspended</Badge>
                              ) : null}
                              {self ? <Badge tone="muted">you</Badge> : null}
                            </span>
                            <span className="block truncate font-mono text-[0.6875rem] text-ink-3">
                              {member.email}
                            </span>
                          </span>
                        </Link>
                      </Td>
                      <Td className="hidden md:table-cell">
                        <Badge tone={member.role === "ADMIN" ? "mark" : "neutral"}>
                          {LABELS.role[member.role]}
                        </Badge>
                      </Td>
                      <Td className="tabular hidden lg:table-cell">{member.resumeCount}</Td>
                      <Td className="tabular hidden lg:table-cell">
                        {member.bestAtsScore || "—"}
                      </Td>
                      <Td className="tabular">{member.applicationCount}</Td>
                      <Td className="hidden whitespace-nowrap text-[0.75rem] xl:table-cell">
                        {member.lastLoginAt ? formatRelative(member.lastLoginAt) : "never"}
                      </Td>
                      <Td className="hidden whitespace-nowrap text-[0.75rem] sm:table-cell">
                        {formatDate(member.createdAt)}
                      </Td>
                      <Td>
                        <div className="flex items-center justify-end gap-1">
                          {member.status === "ACTIVE" ? (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              disabled={self || busy}
                              onClick={() =>
                                mutate(member.id, { status: "SUSPENDED" }, `${member.name} suspended.`)
                              }
                              aria-label={`Suspend ${member.name}`}
                              title={self ? "You cannot suspend yourself" : "Suspend"}
                            >
                              <Ban className="size-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              disabled={busy}
                              onClick={() =>
                                mutate(member.id, { status: "ACTIVE" }, `${member.name} reactivated.`)
                              }
                              aria-label={`Reactivate ${member.name}`}
                              title="Reactivate"
                            >
                              <UserCheck className="size-4" />
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled={self || busy}
                            onClick={() => setConfirmDelete(member)}
                            aria-label={`Delete ${member.name}`}
                            title={self ? "You cannot delete yourself" : "Delete"}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </Td>
                    </Tr>
                  );
                })}
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

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={remove}
        loading={Boolean(pending) && pending === confirmDelete?.id}
        title={confirmDelete ? `Delete ${confirmDelete.name}?` : ""}
        description={
          confirmDelete
            ? `Their CVs, applications, saved jobs and sessions are deleted with the account. ${confirmDelete.applicationCount} application(s) will disappear from the review queue.`
            : ""
        }
        confirmLabel="Delete member"
      />
    </>
  );
}
