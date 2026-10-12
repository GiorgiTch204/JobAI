import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, Clock, MapPin, Wallet } from "lucide-react";

import { Panel, PanelBody, PanelHeader } from "@/components/ui/Panel";
import { Badge, Keyword, StatusBadge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { ApplyPanel } from "@/components/jobs/ApplyPanel";
import { MatchReport } from "@/components/jobs/MatchReport";
import { SaveJobButton } from "@/components/jobs/SaveJobButton";
import { getCurrentUser } from "@/lib/auth/session";
import { findJobWithCounts, listJobs } from "@/lib/db/jobs.repo";
import { findPrimaryResume, listResumes } from "@/lib/db/resumes.repo";
import { findUserApplicationForJob } from "@/lib/db/applications.repo";
import { isJobSaved } from "@/lib/db/saved-jobs.repo";
import { matchResumeToJob } from "@/lib/match";
import { LABELS } from "@/lib/constants";
import {
  formatDate,
  formatNumber,
  formatRelative,
  formatSalary,
  pluralise,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const job = findJobWithCounts(id);
  if (!job) return { title: "Job not found" };
  return {
    title: `${job.title} · ${job.company}`,
    description: job.description.slice(0, 150),
  };
}

export default async function JobDetailPage({ params }) {
  const { id } = await params;
  const job = findJobWithCounts(id);
  if (!job) notFound();

  const user = await getCurrentUser();
  const resume = user ? findPrimaryResume(user.id) : null;
  const resumes = user ? listResumes(user.id) : [];
  const application = user ? findUserApplicationForJob(user.id, id) : null;
  const saved = user ? isJobSaved(user.id, id) : false;
  const match = resume ? matchResumeToJob(resume, job) : null;

  const { rows: similar } = listJobs({ tag: job.tags[0] || "", perPage: 4 });
  const related = similar.filter((item) => item.id !== job.id).slice(0, 3);

  const facts = [
    { icon: Building2, label: "Company", value: job.company },
    {
      icon: MapPin,
      label: "Location",
      value: `${job.location} · ${LABELS.workMode[job.workMode]}`,
    },
    {
      icon: Wallet,
      label: "Salary",
      value: formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency),
    },
    {
      icon: Clock,
      label: "Posted",
      value: `${formatDate(job.createdAt)} (${formatRelative(job.createdAt)})`,
    },
  ];

  return (
    <>
      <Link
        href="/jobs"
        className="mb-4 inline-flex items-center gap-1.5 text-[0.8125rem] text-ink-3 transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        All jobs
      </Link>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <div className="grid gap-5">
          <Panel>
            <div className="border-b border-rule p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="font-display text-[1.5rem] leading-tight tracking-tight text-ink sm:text-[1.875rem]">
                    {job.title}
                  </h1>
                  <p className="mt-1.5 text-[0.9375rem] text-ink-2">
                    {job.company}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {job.status !== "OPEN" ? (
                    <StatusBadge value={job.status} group="jobStatus" />
                  ) : null}
                  {user ? (
                    <SaveJobButton jobId={job.id} initialSaved={saved} />
                  ) : null}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                <Badge tone="neutral">
                  {LABELS.employmentType[job.employmentType]}
                </Badge>
                <Badge tone="neutral">{LABELS.seniority[job.seniority]}</Badge>
                <Badge tone="neutral">{LABELS.workMode[job.workMode]}</Badge>
              </div>

              <dl className="mt-5 grid gap-px overflow-hidden rounded-[var(--radius-field)] border border-rule bg-rule sm:grid-cols-2">
                {facts.map((fact) => (
                  <div key={fact.label} className="bg-surface px-4 py-3">
                    <dt className="flex items-center gap-1.5 text-[0.6875rem] text-ink-3">
                      <fact.icon className="size-3.5" aria-hidden="true" />
                      {fact.label}
                    </dt>
                    <dd className="mt-1 text-[0.8125rem] text-ink">
                      {fact.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <PanelBody className="sm:p-6">
              <h2 className="text-[0.9375rem] font-semibold text-ink">
                About the role
              </h2>
              <div className="mt-2.5 max-w-[68ch] whitespace-pre-line text-[0.875rem] leading-relaxed text-ink-2">
                {job.description}
              </div>

              {job.requirements.length ? (
                <>
                  <h2 className="mt-6 text-[0.9375rem] font-semibold text-ink">
                    What they ask for
                  </h2>
                  <ul className="mt-2.5 grid max-w-[68ch] gap-2">
                    {job.requirements.map((item) => (
                      <li
                        key={item}
                        className="flex gap-2.5 text-[0.875rem] leading-relaxed text-ink-2"
                      >
                        <span
                          className="mt-[0.45rem] size-1.5 shrink-0 rounded-full bg-[var(--mark-deep)]"
                          aria-hidden="true"
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}

              {job.benefits.length ? (
                <>
                  <h2 className="mt-6 text-[0.9375rem] font-semibold text-ink">
                    What they offer
                  </h2>
                  <ul className="mt-2.5 flex flex-wrap gap-1.5">
                    {job.benefits.map((item) => (
                      <li key={item}>
                        <Badge tone="neutral">{item}</Badge>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}

              {job.tags.length ? (
                <>
                  <h2 className="mt-6 text-[0.9375rem] font-semibold text-ink">
                    Keywords this posting screens for
                  </h2>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {job.tags.map((tag) => (
                      <Keyword
                        key={tag}
                        hit={
                          match ? match.hits.includes(tag.toLowerCase()) : false
                        }
                      >
                        {tag}
                      </Keyword>
                    ))}
                  </div>
                  {match ? (
                    <p className="mt-2.5 text-[0.75rem] text-ink-3">
                      Marked keywords already appear in your CV.
                    </p>
                  ) : null}
                </>
              ) : null}
            </PanelBody>
          </Panel>

          {related.length ? (
            <Panel>
              <PanelHeader
                title="Similar postings"
                description={`Also tagged ${job.tags[0]}`}
              />
              <ul className="divide-y divide-[var(--rule)]">
                {related.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/jobs/${item.id}`}
                      className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-surface-2"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[0.875rem] font-medium text-ink">
                          {item.title}
                        </span>
                        <span className="block truncate text-[0.75rem] text-ink-3">
                          {item.company} · {item.location}
                        </span>
                      </span>
                      <span className="tabular shrink-0 font-mono text-[0.6875rem] text-ink-3">
                        {formatSalary(
                          item.salaryMin,
                          item.salaryMax,
                          item.salaryCurrency,
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </div>

        {/* Sidebar */}
        <div className="grid gap-5 lg:sticky lg:top-20">
          <Panel>
            <PanelBody>
              <ApplyPanel
                job={job}
                resumes={resumes}
                application={application}
                signedIn={Boolean(user)}
              />
            </PanelBody>
          </Panel>

          {match ? (
            <Panel>
              <PanelBody>
                <MatchReport match={match} resumeTitle={resume.title} />
              </PanelBody>
            </Panel>
          ) : user ? (
            <Alert tone="info" title="No CV to compare">
              <Link
                href="/cv/upload"
                className="font-medium underline underline-offset-2"
              >
                Import a CV
              </Link>{" "}
              and this panel shows exactly which of this posting's keywords you
              are missing.
            </Alert>
          ) : null}

          <Panel>
            <PanelHeader title="Posting details" />
            <PanelBody className="grid gap-2.5 text-[0.8125rem]">
              <Row
                label="Applications"
                value={formatNumber(job.applicationCount ?? 0)}
              />
              <Row label="Views" value={formatNumber(job.views)} />
              <Row label="Status" value={LABELS.jobStatus[job.status]} />
              <Row label="Reference" value={job.id} mono />
              {job.externalUrl ? (
                <a
                  href={job.externalUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-[0.8125rem] font-medium text-ink underline decoration-[var(--mark-deep)] decoration-2 underline-offset-4"
                >
                  Original posting
                </a>
              ) : null}
            </PanelBody>
          </Panel>
        </div>
      </div>
    </>
  );
}

function Row({ label, value, mono = false }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-ink-3">{label}</span>
      <span
        className={
          mono ? "font-mono text-[0.6875rem] text-ink-2" : "tabular text-ink-2"
        }
      >
        {value}
      </span>
    </div>
  );
}
