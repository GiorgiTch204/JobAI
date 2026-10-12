"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, FileText, Undo2 } from "lucide-react";

import { Panel } from "@/components/ui/Panel";
import { Tabs } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { MatchBadge } from "@/components/jobs/MatchBadge";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { patch } from "@/lib/client-api";
import { APPLICATION_STATUSES, LABELS } from "@/lib/constants";
import { cn, formatDate, formatRelative } from "@/lib/utils";

const TABS = [
  { value: "", label: "All" },
  ...APPLICATION_STATUSES.map((status) => ({
    value: status,
    label: LABELS.applicationStatus[status],
  })),
];

export function ApplicationList({ applications, counts, activeStatus }) {
  const router = useRouter();
  const toast = useToast();
  const [expanded, setExpanded] = useState(null);
  const [withdrawing, setWithdrawing] = useState(null);
  const [pending, setPending] = useState(false);

  const withdraw = async () => {
    setPending(true);
    try {
      await patch(`/api/applications/${withdrawing.id}`);
      toast.success("Application withdrawn.");
      setWithdrawing(null);
      router.refresh();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <Tabs
        items={TABS}
        value={activeStatus}
        counts={{
          ...counts,
          "": Object.values(counts).reduce((a, b) => a + b, 0),
        }}
        onChange={(value) =>
          router.push(
            value ? `/applications?status=${value}` : "/applications",
            { scroll: false },
          )
        }
        className="mb-5"
      />

      {applications.length === 0 ? (
        <Panel className="px-5 py-10 text-center">
          <p className="text-[0.875rem] text-ink-2">
            Nothing with that status right now.
          </p>
        </Panel>
      ) : (
        <ul className="grid gap-3">
          {applications.map((application) => {
            const open = expanded === application.id;
            const canWithdraw = !["WITHDRAWN", "REJECTED", "OFFER"].includes(
              application.status,
            );

            return (
              <li key={application.id}>
                <Panel>
                  <div className="flex flex-wrap items-start gap-3 p-4 sm:p-5">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/jobs/${application.jobId}`}
                          className="text-[1rem] font-semibold text-ink hover:underline hover:decoration-[var(--mark-deep)] hover:decoration-2 hover:underline-offset-4"
                        >
                          {application.job.title}
                        </Link>
                        <StatusBadge value={application.status} />
                      </div>

                      <p className="mt-1 text-[0.8125rem] text-ink-2">
                        {application.job.company} · {application.job.location}
                      </p>

                      <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[0.75rem] text-ink-3">
                        <div className="flex gap-1.5">
                          <dt>Sent</dt>
                          <dd className="text-ink-2">
                            {formatDate(application.createdAt)}
                          </dd>
                        </div>
                        <div className="flex gap-1.5">
                          <dt>Last change</dt>
                          <dd className="text-ink-2">
                            {formatRelative(application.updatedAt)}
                          </dd>
                        </div>
                        <div className="flex gap-1.5">
                          <dt>ATS at the time</dt>
                          <dd className="tabular text-ink-2">
                            {application.atsScore}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <MatchBadge score={application.matchScore} />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() =>
                          setExpanded(open ? null : application.id)
                        }
                        aria-expanded={open}
                        aria-label={open ? "Hide details" : "Show details"}
                      >
                        <ChevronDown
                          className={cn(
                            "size-4 transition-transform",
                            open && "rotate-180",
                          )}
                        />
                      </Button>
                    </div>
                  </div>

                  {open ? (
                    <div className="border-t border-rule bg-surface-2 px-4 py-4 sm:px-5">
                      {application.note ? (
                        <div className="mb-4">
                          <p className="text-[0.75rem] text-ink-3">
                            Note from the reviewer
                          </p>
                          <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink">
                            {application.note}
                          </p>
                        </div>
                      ) : null}

                      {application.coverLetter ? (
                        <div className="mb-4">
                          <p className="text-[0.75rem] text-ink-3">
                            What you wrote
                          </p>
                          <p className="mt-1 whitespace-pre-line text-[0.8125rem] leading-relaxed text-ink-2">
                            {application.coverLetter}
                          </p>
                        </div>
                      ) : null}

                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          href={`/jobs/${application.jobId}`}
                          variant="outline"
                          size="sm"
                        >
                          <FileText className="size-3.5" aria-hidden="true" />
                          Re-read the posting
                        </Button>
                        {canWithdraw ? (
                          <Button
                            variant="quiet"
                            size="sm"
                            onClick={() => setWithdrawing(application)}
                          >
                            <Undo2 className="size-3.5" aria-hidden="true" />
                            Withdraw
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </Panel>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(withdrawing)}
        onClose={() => setWithdrawing(null)}
        onConfirm={withdraw}
        loading={pending}
        title="Withdraw this application?"
        description={
          withdrawing
            ? `${withdrawing.job.title} at ${withdrawing.job.company} will be marked withdrawn.`
            : ""
        }
        confirmLabel="Withdraw"
      />
    </>
  );
}
