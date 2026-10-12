"use client";

import { useState } from "react";
import Link from "next/link";
import { Bookmark, BookmarkCheck, MapPin } from "lucide-react";

import { Badge, Keyword, StatusBadge } from "@/components/ui/Badge";
import { MatchBadge } from "./MatchBadge";
import { useToast } from "@/components/ui/Toast";
import { del, post } from "@/lib/client-api";
import { LABELS } from "@/lib/constants";
import { cn, formatRelative, formatSalary, truncate } from "@/lib/utils";

/**
 * One posting in the list. The keyword row is the point of the card: matched
 * keywords wear the highlighter, the missing ones stay plain, so the decision
 * to apply is visible without opening the posting.
 */
export function JobCard({ job, signedIn = false, onSavedChange }) {
  const toast = useToast();
  const [saved, setSaved] = useState(Boolean(job.saved));
  const [pending, setPending] = useState(false);

  const toggleSave = async () => {
    if (!signedIn) {
      toast.info("Sign in to save jobs to your list.");
      return;
    }
    setPending(true);
    const next = !saved;
    try {
      if (next) await post(`/api/jobs/${job.id}/save`);
      else await del(`/api/jobs/${job.id}/save`);
      setSaved(next);
      onSavedChange?.(job.id, next);
      toast.success(next ? "Saved to your list." : "Removed from your list.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setPending(false);
    }
  };

  const hits = job.match?.hits || [];
  const misses = job.match?.misses || [];
  const keywords = hits.length || misses.length ? null : job.tags.slice(0, 6);

  return (
    <article className="group relative rounded-[var(--radius-panel)] border border-rule bg-surface transition-colors hover:border-rule-strong">
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[1.0625rem] font-semibold leading-snug text-ink">
              <Link href={`/jobs/${job.id}`} className="hover:underline hover:decoration-[var(--mark-deep)] hover:decoration-2 hover:underline-offset-4">
                {job.title}
              </Link>
            </h3>
            <p className="mt-1 text-[0.8125rem] text-ink-2">{job.company}</p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {job.match ? <MatchBadge score={job.match.score} /> : null}
            <button
              type="button"
              onClick={toggleSave}
              disabled={pending}
              className={cn(
                "grid size-8 place-items-center rounded-[var(--radius-field)] transition-colors",
                saved ? "text-[var(--mark-deep)]" : "text-ink-3 hover:bg-surface-2 hover:text-ink-2",
              )}
              aria-label={saved ? "Remove from saved jobs" : "Save this job"}
              aria-pressed={saved}
            >
              {saved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
            </button>
          </div>
        </div>

        <dl className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[0.75rem] text-ink-3">
          <div className="flex items-center gap-1.5">
            <MapPin className="size-3.5" aria-hidden="true" />
            <dt className="sr-only">Location</dt>
            <dd>{job.location}</dd>
          </div>
          <div>
            <dt className="sr-only">Work mode</dt>
            <dd>{LABELS.workMode[job.workMode]}</dd>
          </div>
          <div>
            <dt className="sr-only">Employment type</dt>
            <dd>{LABELS.employmentType[job.employmentType]}</dd>
          </div>
          <div>
            <dt className="sr-only">Salary</dt>
            <dd className="tabular">
              {formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency)}
            </dd>
          </div>
        </dl>

        <p className="mt-3 text-[0.8125rem] leading-relaxed text-ink-2">
          {truncate(job.description, 170)}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          {keywords
            ? keywords.map((tag) => <Keyword key={tag}>{tag}</Keyword>)
            : [
                ...hits.slice(0, 6).map((word) => (
                  <Keyword key={`hit-${word}`} hit>
                    {word}
                  </Keyword>
                )),
                ...misses.slice(0, 4).map((word) => <Keyword key={`miss-${word}`}>{word}</Keyword>),
              ]}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-rule px-4 py-2.5 sm:px-5">
        <span className="font-mono text-[0.6875rem] text-ink-3">
          posted {formatRelative(job.createdAt)}
        </span>

        <div className="flex items-center gap-2">
          {job.applicationStatus ? (
            <StatusBadge value={job.applicationStatus} />
          ) : (
            <Badge tone="muted">
              {job.seniority ? LABELS.seniority[job.seniority] : "Open"}
            </Badge>
          )}
          <Link
            href={`/jobs/${job.id}`}
            className="text-[0.8125rem] font-medium text-ink underline decoration-[var(--mark-deep)] decoration-2 underline-offset-4 transition-colors hover:text-[var(--mark-deep)]"
          >
            {job.applicationStatus ? "View application" : "Open posting"}
          </Link>
        </div>
      </div>
    </article>
  );
}
