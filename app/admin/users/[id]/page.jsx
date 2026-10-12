import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bookmark, FileText, Monitor, Send } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/Panel";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Meter } from "@/components/ui/Meter";
import { Keyword } from "@/components/ui/Badge";
import { Stat } from "@/components/ui/Stat";
import { MemberControls } from "./MemberControls";
import { requireAdmin } from "@/lib/auth/session";
import { getUserDossier } from "@/lib/db/users.repo";
import { ACTIVITY_LABELS, LABELS } from "@/lib/constants";
import { formatDate, formatRelative } from "@/lib/utils";
import { gradeFor } from "@/lib/ats";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const dossier = getUserDossier(id);
  return { title: dossier ? dossier.user.name : "Member not found" };
}

export default async function AdminUserDetailPage({ params }) {
  const { user: admin } = await requireAdmin("/admin/users");
  const { id } = await params;

  const dossier = getUserDossier(id);
  if (!dossier) notFound();

  const { user, resumes, applications, savedJobs, sessions, activity } = dossier;
  const bestAts = Math.max(0, ...resumes.map((item) => item.atsScore));
  const activeSessions = sessions.filter((session) => session.active).length;

  const profileRows = [
    { label: "Member ID", value: user.id, mono: true },
    { label: "Email", value: user.email, mono: true },
    { label: "Phone", value: user.phone || "—" },
    { label: "Location", value: user.location || "—" },
    { label: "Headline", value: user.headline || "—" },
    { label: "Website", value: user.website || "—", mono: true },
    { label: "Role", value: LABELS.role[user.role] },
    { label: "Status", value: LABELS.userStatus[user.status] },
    { label: "Registered", value: formatDate(user.createdAt, { withTime: true }) },
    { label: "Last updated", value: formatDate(user.updatedAt, { withTime: true }) },
    {
      label: "Last sign-in",
      value: user.lastLoginAt ? formatDate(user.lastLoginAt, { withTime: true }) : "never",
    },
    { label: "Total sign-ins", value: String(user.loginCount) },
  ];

  return (
    <>
      <Link
        href="/admin/users"
        className="mb-4 inline-flex items-center gap-1.5 text-[0.8125rem] text-ink-3 transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        All members
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={user.name} tone={user.avatarTone} size="xl" />
          <div>
            <h1 className="font-display text-[1.5rem] leading-tight tracking-tight text-ink">
              {user.name}
            </h1>
            <p className="mt-1 font-mono text-[0.75rem] text-ink-3">{user.email}</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge tone={user.role === "ADMIN" ? "mark" : "neutral"}>
                {LABELS.role[user.role]}
              </Badge>
              <Badge tone={user.status === "ACTIVE" ? "positive" : "danger"}>
                {LABELS.userStatus[user.status]}
              </Badge>
              {user.location ? <Badge tone="muted">{user.location}</Badge> : null}
            </div>
          </div>
        </div>

        <MemberControls member={user} isSelf={user.id === admin.id} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="CV documents" value={resumes.length} icon={FileText} />
        <Stat
          label="Applications"
          value={applications.length}
          delta={`${applications.filter((a) => a.status === "INTERVIEW").length} at interview`}
          icon={Send}
        />
        <Stat label="Saved jobs" value={savedJobs.length} icon={Bookmark} />
        <Stat
          label="Active sessions"
          value={activeSessions}
          delta={`${sessions.length} recorded`}
          icon={Monitor}
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1.3fr] xl:items-start">
        {/* Stored profile */}
        <div className="grid content-start gap-5">
          <Panel>
            <PanelHeader
              title="Stored profile"
              description="Every field this account holds, as stored."
            />
            <PanelBody>
              <dl className="grid gap-px bg-rule">
                {profileRows.map((row) => (
                  <div
                    key={row.label}
                    className="flex flex-wrap items-baseline justify-between gap-2 bg-surface py-2"
                  >
                    <dt className="text-[0.75rem] text-ink-3">{row.label}</dt>
                    <dd
                      className={
                        row.mono
                          ? "break-all font-mono text-[0.6875rem] text-ink-2"
                          : "text-[0.8125rem] text-ink-2"
                      }
                    >
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>

              {user.bio ? (
                <div className="mt-4 border-t border-rule pt-3">
                  <p className="text-[0.75rem] text-ink-3">About</p>
                  <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink-2">{user.bio}</p>
                </div>
              ) : null}
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader
              title="Sessions"
              description="Device, address and whether the session is still live."
            />
            {sessions.length ? (
              <ul className="divide-y divide-[var(--rule)]">
                {sessions.slice(0, 8).map((session) => (
                  <li key={session.id} className="px-5 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[0.8125rem] text-ink">
                        {session.device || "Unknown device"}
                      </span>
                      <Badge tone={session.active ? "positive" : "muted"}>
                        {session.active ? "live" : "ended"}
                      </Badge>
                    </div>
                    <p className="mt-0.5 truncate font-mono text-[0.625rem] text-ink-3">
                      {session.ip} · started {formatRelative(session.createdAt)} · last seen{" "}
                      {formatRelative(session.lastSeenAt)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <PanelBody>
                <p className="text-[0.8125rem] text-ink-3">No sessions recorded.</p>
              </PanelBody>
            )}
          </Panel>

          <Panel>
            <PanelHeader title="Saved jobs" />
            {savedJobs.length ? (
              <ul className="divide-y divide-[var(--rule)]">
                {savedJobs.map((job) => (
                  <li key={job.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="min-w-0 truncate text-[0.8125rem] text-ink hover:underline"
                    >
                      {job.title}
                    </Link>
                    <span className="shrink-0 font-mono text-[0.625rem] text-ink-3">
                      {formatRelative(job.savedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <PanelBody>
                <p className="text-[0.8125rem] text-ink-3">Nothing saved.</p>
              </PanelBody>
            )}
          </Panel>
        </div>

        {/* CVs, applications, activity */}
        <div className="grid content-start gap-5">
          <Panel>
            <PanelHeader
              title="CV documents"
              description={
                resumes.length
                  ? `Best ATS score ${bestAts} of 100`
                  : "This member has not created a CV"
              }
            />
            {resumes.length ? (
              <ul className="divide-y divide-[var(--rule)]">
                {resumes.map((resume) => {
                  const grade = gradeFor(resume.atsScore);
                  return (
                    <li key={resume.id} className="px-5 py-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="flex items-center gap-2">
                          <span className="text-[0.875rem] font-medium text-ink">
                            {resume.title}
                          </span>
                          {resume.isPrimary ? <Badge tone="mark">primary</Badge> : null}
                          <Badge tone="muted">{resume.source}</Badge>
                        </span>
                        <span className="tabular font-mono text-[0.6875rem] text-ink-2">
                          ATS {resume.atsScore} · {grade.grade}
                        </span>
                      </div>

                      <Meter
                        value={resume.atsScore}
                        tone={grade.tone}
                        size="sm"
                        className="mt-2"
                      />

                      <p className="mt-2 text-[0.75rem] text-ink-3">
                        {resume.headline || "No headline"} · updated{" "}
                        {formatRelative(resume.updatedAt)}
                      </p>

                      {resume.skills.length ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {resume.skills.slice(0, 10).map((skill) => (
                            <Keyword key={skill} hit>
                              {skill}
                            </Keyword>
                          ))}
                          {resume.skills.length > 10 ? (
                            <span className="font-mono text-[0.625rem] text-ink-3">
                              +{resume.skills.length - 10}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <PanelBody>
                <p className="text-[0.8125rem] text-ink-3">No CV stored for this account.</p>
              </PanelBody>
            )}
          </Panel>

          <Panel>
            <PanelHeader
              title="Applications"
              description={`${applications.length} sent`}
            />
            {applications.length ? (
              <ul className="divide-y divide-[var(--rule)]">
                {applications.map((application) => (
                  <li key={application.id} className="px-5 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link
                        href={`/jobs/${application.jobId}`}
                        className="min-w-0 truncate text-[0.875rem] font-medium text-ink hover:underline"
                      >
                        {application.jobTitle}
                      </Link>
                      <StatusBadge value={application.status} />
                    </div>
                    <p className="mt-0.5 text-[0.75rem] text-ink-3">
                      {application.jobCompany} · {application.jobLocation}
                    </p>
                    <p className="mt-1 flex flex-wrap gap-x-4 font-mono text-[0.625rem] text-ink-3">
                      <span>match {application.matchScore}%</span>
                      <span>ats {application.atsScore}</span>
                      <span>sent {formatDate(application.createdAt)}</span>
                      <span>updated {formatRelative(application.updatedAt)}</span>
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <PanelBody>
                <p className="text-[0.8125rem] text-ink-3">No applications sent.</p>
              </PanelBody>
            )}
          </Panel>

          <Panel>
            <PanelHeader
              title="Activity"
              description="The last 40 recorded events for this account"
            />
            {activity.length ? (
              <ol className="divide-y divide-[var(--rule)]">
                {activity.map((entry) => (
                  <li key={entry.id} className="px-5 py-2.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[0.8125rem] text-ink">
                        {ACTIVITY_LABELS[entry.action] || entry.action}
                      </span>
                      <span className="shrink-0 font-mono text-[0.625rem] text-ink-3">
                        {formatDate(entry.createdAt, { withTime: true })}
                      </span>
                    </div>
                    {entry.summary &&
                    entry.summary !== (ACTIVITY_LABELS[entry.action] || entry.action) ? (
                      <p className="mt-0.5 text-[0.75rem] leading-relaxed text-ink-3">
                        {entry.summary}
                      </p>
                    ) : null}
                    {entry.ip ? (
                      <p className="mt-0.5 font-mono text-[0.625rem] text-ink-3">
                        from {entry.ip}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : (
              <PanelBody>
                <p className="text-[0.8125rem] text-ink-3">Nothing recorded.</p>
              </PanelBody>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
