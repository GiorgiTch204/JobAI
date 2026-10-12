"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText, Search, Send, X } from "lucide-react";

import { Panel, PanelBody } from "@/components/ui/Panel";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/Table";
import { Input, Select, Textarea, Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { ResumeSheet } from "@/components/cv/ResumeSheet";
import { MatchBadge } from "@/components/jobs/MatchBadge";
import { useToast } from "@/components/ui/Toast";
import { useDebounced } from "@/hooks/useDebounced";
import { patch } from "@/lib/client-api";
import { APPLICATION_STATUSES, LABELS } from "@/lib/constants";
import { formatDate, formatRelative } from "@/lib/utils";

const TABS = [
  { value: "", label: "All" },
  ...APPLICATION_STATUSES.map((status) => ({
    value: status,
    label: LABELS.applicationStatus[status],
  })),
];

export function ApplicationsReview({
  applications,
  byStatus,
  total,
  page,
  pages,
  perPage,
  query,
  job,
}) {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();

  const [search, setSearch] = useState(query.search);
  const debounced = useDebounced(search, 350);
  const [reviewing, setReviewing] = useState(null);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState("");

  const apply = (updates) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value) next.delete(key);
      else next.set(key, String(value));
    }
    if (!("page" in updates)) next.delete("page");
    router.push(`/admin/applications?${next.toString()}`, { scroll: false });
  };

  useEffect(() => {
    if (debounced === (params.get("search") || "")) return;
    apply({ search: debounced });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const openReview = (application) => {
    setReviewing(application);
    setStatus(application.status);
    setNote(application.note || "");
  };

  const quickStatus = async (application, nextStatus) => {
    setPending(application.id);
    try {
      await patch("/api/admin/applications", {
        applicationId: application.id,
        status: nextStatus,
      });
      toast.success(
        `${application.user.name} moved to ${LABELS.applicationStatus[nextStatus].toLowerCase()}.`,
      );
      router.refresh();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setPending("");
    }
  };

  const saveReview = async () => {
    setPending(reviewing.id);
    try {
      await patch("/api/admin/applications", {
        applicationId: reviewing.id,
        status,
        note,
      });
      toast.success("Application updated.");
      setReviewing(null);
      router.refresh();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setPending("");
    }
  };

  const totalAll = Object.values(byStatus).reduce((a, b) => a + b, 0);

  return (
    <>
      {job ? (
        <div className="mb-4 flex items-center gap-2">
          <Badge tone="mark">filtered to one posting</Badge>
          <Button variant="ghost" size="sm" onClick={() => apply({ jobId: "" })}>
            <X className="size-3.5" aria-hidden="true" />
            Show all applications
          </Button>
        </div>
      ) : null}

      <Tabs
        items={TABS}
        value={query.status}
        counts={{ ...byStatus, "": totalAll }}
        onChange={(value) => apply({ status: value })}
        className="mb-5"
      />

      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto]">
        <Input
          icon={Search}
          placeholder="Search applicant, email, role or company"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search applications"
        />
        <Select
          value={query.sort}
          onChange={(event) => apply({ sort: event.target.value })}
          aria-label="Sort applications"
          className="sm:w-48"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="match">Best match first</option>
          <option value="status">By status</option>
        </Select>
      </div>

      {applications.length === 0 ? (
        <EmptyState
          icon={Send}
          title="No applications here"
          description="Nothing matches those filters yet."
          action={{ label: "Clear filters", href: "/admin/applications", variant: "outline" }}
        />
      ) : (
        <>
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>Applicant</Th>
                  <Th>Role</Th>
                  <Th className="hidden sm:table-cell">Match</Th>
                  <Th className="hidden lg:table-cell">ATS</Th>
                  <Th className="hidden md:table-cell">Sent</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Review</Th>
                </tr>
              </thead>
              <tbody>
                {applications.map((application) => (
                  <Tr key={application.id}>
                    <Td>
                      <Link
                        href={`/admin/users/${application.userId}`}
                        className="flex items-center gap-2.5"
                      >
                        <Avatar
                          name={application.user.name}
                          tone={application.user.avatarTone}
                          size="sm"
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-[0.8125rem] font-medium text-ink">
                            {application.user.name}
                          </span>
                          <span className="block truncate font-mono text-[0.6875rem] text-ink-3">
                            {application.user.email}
                          </span>
                        </span>
                      </Link>
                    </Td>
                    <Td>
                      <Link
                        href={`/jobs/${application.jobId}`}
                        className="block max-w-[14rem] truncate text-[0.8125rem] text-ink hover:underline"
                      >
                        {application.job.title}
                      </Link>
                      <span className="block truncate text-[0.6875rem] text-ink-3">
                        {application.job.company}
                      </span>
                    </Td>
                    <Td className="hidden sm:table-cell">
                      <MatchBadge score={application.matchScore} size="sm" />
                    </Td>
                    <Td className="tabular hidden lg:table-cell">{application.atsScore}</Td>
                    <Td className="hidden whitespace-nowrap text-[0.75rem] md:table-cell">
                      {formatRelative(application.createdAt)}
                    </Td>
                    <Td>
                      <Select
                        value={application.status}
                        onChange={(event) => quickStatus(application, event.target.value)}
                        disabled={pending === application.id}
                        aria-label={`Status for ${application.user.name}`}
                        className="h-8 w-32 text-[0.75rem]"
                      >
                        {APPLICATION_STATUSES.map((value) => (
                          <option key={value} value={value}>
                            {LABELS.applicationStatus[value]}
                          </option>
                        ))}
                      </Select>
                    </Td>
                    <Td className="text-right">
                      <Button variant="quiet" size="sm" onClick={() => openReview(application)}>
                        <FileText className="size-3.5" aria-hidden="true" />
                        Open CV
                      </Button>
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

      {/* Review modal: the CV exactly as it was sent */}
      <Modal
        open={Boolean(reviewing)}
        onClose={() => setReviewing(null)}
        title={reviewing ? `${reviewing.user.name} — ${reviewing.job.title}` : ""}
        description={
          reviewing
            ? `Applied ${formatDate(reviewing.createdAt, { withTime: true })} · ${
                reviewing.matchScore
              }% keyword match · ATS ${reviewing.atsScore}`
            : ""
        }
        size="xl"
        footer={
          <>
            <Button variant="quiet" size="sm" onClick={() => setReviewing(null)}>
              Close
            </Button>
            <Button size="sm" onClick={saveReview} loading={pending === reviewing?.id}>
              Save decision
            </Button>
          </>
        }
      >
        {reviewing ? (
          <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr] lg:items-start">
            <div>
              {reviewing.resumeSnapshot ? (
                <div className="rounded-[var(--radius-sheet)] border border-rule">
                  <ResumeSheet resume={reviewing.resumeSnapshot} scale="compact" />
                </div>
              ) : (
                <PanelBody>
                  <p className="text-[0.8125rem] text-ink-3">
                    No CV copy was stored with this application.
                  </p>
                </PanelBody>
              )}
            </div>

            <div className="grid gap-4">
              {reviewing.coverLetter ? (
                <div className="rounded-[var(--radius-field)] border border-rule bg-surface-2 p-3.5">
                  <p className="text-[0.75rem] text-ink-3">What the applicant wrote</p>
                  <p className="mt-1.5 whitespace-pre-line text-[0.8125rem] leading-relaxed text-ink-2">
                    {reviewing.coverLetter}
                  </p>
                </div>
              ) : null}

              <Field label="Decision">
                <Select value={status} onChange={(event) => setStatus(event.target.value)}>
                  {APPLICATION_STATUSES.map((value) => (
                    <option key={value} value={value}>
                      {LABELS.applicationStatus[value]}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field
                label="Note"
                hint="The applicant can read this"
              >
                <Textarea
                  rows={4}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Interview booked for Thursday at 14:00."
                  maxLength={500}
                />
              </Field>

              <dl className="grid gap-2 border-t border-rule pt-3 text-[0.8125rem]">
                <Row label="Applicant" value={reviewing.user.name} />
                <Row label="Email" value={reviewing.user.email} mono />
                <Row label="Location" value={reviewing.user.location || "—"} />
                <Row label="Current status" value={LABELS.applicationStatus[reviewing.status]} />
                <Row
                  label="Last change"
                  value={formatDate(reviewing.updatedAt, { withTime: true })}
                />
                <Row label="Application ID" value={reviewing.id} mono />
              </dl>

              <Button
                href={`/admin/users/${reviewing.userId}`}
                variant="outline"
                size="sm"
              >
                Open the full member record
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}

function Row({ label, value, mono = false }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink-3">{label}</dt>
      <dd className={mono ? "break-all font-mono text-[0.6875rem] text-ink-2" : "text-ink-2"}>
        {value}
      </dd>
    </div>
  );
}
