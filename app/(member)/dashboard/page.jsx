import Link from "next/link";
import {
  Bookmark,
  CircleCheck,
  FileText,
  Send,
  Sparkles,
  TriangleAlert,
  Upload,
} from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Stat } from "@/components/ui/Stat";
import { Meter, ScoreDial } from "@/components/ui/Meter";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { MatchBadge } from "@/components/jobs/MatchBadge";
import { requireUser } from "@/lib/auth/session";
import { findPrimaryResume, listResumes } from "@/lib/db/resumes.repo";
import { countApplications, recentApplications } from "@/lib/db/applications.repo";
import { countSavedJobs } from "@/lib/db/saved-jobs.repo";
import { listJobs } from "@/lib/db/jobs.repo";
import { annotateJobsWithMatch } from "@/lib/match";
import { gradeFor } from "@/lib/ats";
import { formatRelative } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams }) {
  const { user } = await requireUser("/dashboard");
  const params = await searchParams;

  const resumes = listResumes(user.id);
  const resume = findPrimaryResume(user.id);
  const applications = recentApplications(user.id, 5);

  const counts = {
    applications: countApplications({ userId: user.id }),
    interviews:
      countApplications({ userId: user.id, status: "INTERVIEW" }) +
      countApplications({ userId: user.id, status: "OFFER" }),
    saved: countSavedJobs(user.id),
  };

  const { rows } = listJobs({ perPage: 24, sort: "newest" });
  const recommended = resume
    ? annotateJobsWithMatch(rows, resume)
        .sort((a, b) => b.match.score - a.match.score)
        .slice(0, 4)
    : rows.slice(0, 4).map((job) => ({ ...job, match: null }));

  const report = resume?.atsReport;
  const grade = resume ? gradeFor(resume.atsScore) : null;
  const firstName = user.name.split(" ")[0];

  return (
    <>
      <PageHeader
        title={`Hello, ${firstName}`}
        description={
          resume
            ? "Your CV, your score and the roles that match it best right now."
            : "Start by bringing in a CV — everything else on this screen works from it."
        }
        actions={
          <>
            <Button href="/jobs" variant="outline" size="sm">
              Browse jobs
            </Button>
            <Button href={resume ? "/cv" : "/cv/upload"} size="sm">
              {resume ? "Edit your CV" : "Add your CV"}
            </Button>
          </>
        }
      />

      {params?.denied === "admin" ? (
        <Alert tone="warning" className="mb-5" title="Admin console is restricted">
          That area needs an administrator account.
        </Alert>
      ) : null}

      {!resume ? (
        <Panel className="mb-6 overflow-hidden">
          <div className="grid gap-6 p-6 md:grid-cols-[1.3fr_1fr] md:items-center">
            <div>
              <h2 className="font-display text-[1.375rem] leading-tight text-ink">
                Nothing to score yet
              </h2>
              <p className="mt-2.5 max-w-md text-[0.875rem] leading-relaxed text-ink-2">
                Import a PDF or DOCX and JobAI will read the text, fill in the builder's fields and
                score what it found. If you would rather start clean, open the builder instead.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button href="/cv/upload">
                  <Upload className="size-4" aria-hidden="true" />
                  Import a CV
                </Button>
                <Button href="/cv" variant="outline">
                  <FileText className="size-4" aria-hidden="true" />
                  Start from scratch
                </Button>
              </div>
            </div>

            <ul className="grid gap-2.5 rounded-[var(--radius-field)] border border-dashed border-rule-strong bg-surface-2 p-4 text-[0.8125rem] text-ink-2">
              <li>Six ATS checks, each naming what to change</li>
              <li>A keyword match score on every posting</li>
              <li>A printable one-page CV sheet</li>
            </ul>
          </div>
        </Panel>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="ATS score"
          value={resume ? resume.atsScore : "—"}
          delta={resume ? grade.grade : "No CV yet"}
          icon={Sparkles}
          href="/cv"
        />
        <Stat
          label="Applications"
          value={counts.applications}
          delta={counts.applications ? "Track replies in Applications" : "None sent yet"}
          icon={Send}
          href="/applications"
        />
        <Stat
          label="Interviews and offers"
          value={counts.interviews}
          delta={counts.interviews ? "Good news so far" : "Nothing scheduled"}
          icon={CircleCheck}
          href="/applications?status=INTERVIEW"
        />
        <Stat
          label="Saved jobs"
          value={counts.saved}
          delta={counts.saved ? "Waiting for your CV to catch up" : "Nothing saved"}
          icon={Bookmark}
          href="/saved"
        />
      </div>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[1fr_1.15fr]">
        {/* ATS report */}
        <Panel>
          <PanelHeader
            title="Your ATS score"
            description={resume ? `From “${resume.title}”` : "Add a CV to see the breakdown"}
            action={
              resume ? (
                <Button href="/cv" variant="quiet" size="sm">
                  Fix it
                </Button>
              ) : null
            }
          />
          <PanelBody>
            {resume && report ? (
              <>
                <ScoreDial
                  score={resume.atsScore}
                  grade={grade.grade}
                  tone={grade.tone}
                  caption={`${report.wordCount} words read`}
                />

                <dl className="mt-5 grid gap-3 border-t border-rule pt-4">
                  {report.checks.map((check) => (
                    <div key={check.id}>
                      <Meter
                        label={check.label}
                        caption={`${check.points}/${check.max}`}
                        value={check.points}
                        max={check.max}
                        tone={check.points === check.max ? "positive" : "mark"}
                        size="sm"
                      />
                      {check.points < check.max ? (
                        <p className="mt-1 text-[0.75rem] leading-relaxed text-ink-3">
                          {check.detail}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </dl>

                {report.fixes?.length ? (
                  <div className="mt-4 rounded-[var(--radius-field)] border border-rule bg-surface-2 p-3.5">
                    <p className="flex items-center gap-1.5 text-[0.8125rem] font-medium text-ink">
                      <TriangleAlert className="size-3.5 text-warning" aria-hidden="true" />
                      Do this first
                    </p>
                    <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-ink-2">
                      {report.fixes[0]}
                    </p>
                  </div>
                ) : null}
              </>
            ) : (
              <EmptyState
                icon={FileText}
                title="No CV on file"
                description="Import a file or build one and the score appears here immediately."
                action={{ label: "Add your CV", href: "/cv/upload" }}
              />
            )}
          </PanelBody>
        </Panel>

        <div className="grid content-start gap-5">
          {/* Recommended jobs */}
          <Panel>
            <PanelHeader
              title={resume ? "Best matches for your CV" : "Latest postings"}
              description={
                resume
                  ? "Ranked by how much of each posting's keyword list your CV covers."
                  : "Add a CV and these get ranked by how well you match."
              }
              action={
                <Button href="/jobs" variant="quiet" size="sm">
                  All jobs
                </Button>
              }
            />
            <ul className="divide-y divide-[var(--rule)]">
              {recommended.map((job) => (
                <li key={job.id}>
                  <Link
                    href={`/jobs/${job.id}`}
                    className="flex items-start justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-surface-2"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[0.875rem] font-medium text-ink">
                        {job.title}
                      </span>
                      <span className="mt-0.5 block truncate text-[0.75rem] text-ink-3">
                        {job.company} · {job.location}
                      </span>
                      {job.match?.misses?.length ? (
                        <span className="mt-1.5 block truncate font-mono text-[0.625rem] text-ink-3">
                          missing: {job.match.misses.slice(0, 3).join(", ")}
                        </span>
                      ) : null}
                    </span>
                    {job.match ? (
                      <MatchBadge score={job.match.score} size="sm" />
                    ) : (
                      <Badge tone="muted">{formatRelative(job.createdAt)}</Badge>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>

          {/* Recent applications */}
          <Panel>
            <PanelHeader
              title="Recent applications"
              description={
                counts.applications
                  ? `${counts.applications} sent in total`
                  : "Nothing sent yet"
              }
              action={
                counts.applications ? (
                  <Button href="/applications" variant="quiet" size="sm">
                    See all
                  </Button>
                ) : null
              }
            />
            {applications.length ? (
              <ul className="divide-y divide-[var(--rule)]">
                {applications.map((application) => (
                  <li
                    key={application.id}
                    className="flex items-center justify-between gap-3 px-5 py-3.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[0.875rem] font-medium text-ink">
                        {application.job.title}
                      </p>
                      <p className="mt-0.5 truncate text-[0.75rem] text-ink-3">
                        {application.job.company} · sent {formatRelative(application.createdAt)}
                      </p>
                    </div>
                    <StatusBadge value={application.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <PanelBody>
                <EmptyState
                  icon={Send}
                  title="No applications yet"
                  description="When you apply, the status and every change to it shows up here."
                  action={{ label: "Find a role", href: "/jobs", variant: "outline" }}
                />
              </PanelBody>
            )}
          </Panel>

          {resumes.length > 1 ? (
            <Panel>
              <PanelHeader
                title="Your CVs"
                description={`${resumes.length} documents. The primary one is used when you apply.`}
              />
              <ul className="divide-y divide-[var(--rule)]">
                {resumes.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <span className="min-w-0">
                      <span className="block truncate text-[0.8125rem] text-ink">{item.title}</span>
                      <span className="block text-[0.6875rem] text-ink-3">
                        updated {formatRelative(item.updatedAt)}
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      {item.isPrimary ? <Badge tone="mark">primary</Badge> : null}
                      <span className="tabular font-mono text-[0.6875rem] text-ink-2">
                        {item.atsScore}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </div>
      </div>
    </>
  );
}
