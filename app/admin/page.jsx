import Link from "next/link";
import {
  Activity,
  Briefcase,
  Download,
  Eye,
  FileText,
  Send,
  ShieldCheck,
  Users,
} from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/Panel";
import { Stat } from "@/components/ui/Stat";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { ActivityChart } from "@/components/admin/ActivityChart";
import { BarList } from "@/components/admin/BarList";
import { requireAdmin } from "@/lib/auth/session";
import { dailySeries, platformTotals, recentCounts, topSkills } from "@/lib/db/stats.repo";
import { applicationsByStatus, listApplications } from "@/lib/db/applications.repo";
import { topJobsByApplications } from "@/lib/db/jobs.repo";
import { recentActivity } from "@/lib/db/activity.repo";
import { listUsers } from "@/lib/db/users.repo";
import { ACTIVITY_LABELS, APPLICATION_STATUSES, LABELS } from "@/lib/constants";
import { formatNumber, formatRelative, pluralise } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin overview" };

export default async function AdminOverviewPage() {
  const { user } = await requireAdmin("/admin");

  const totals = platformTotals();
  const recent = recentCounts(7);
  const series = dailySeries(14);
  const byStatus = applicationsByStatus();
  const topJobs = topJobsByApplications(5);
  const skills = topSkills(8);
  const newest = listUsers({ perPage: 5 }).rows;
  const latest = listApplications({ perPage: 6 }).rows;
  const activity = recentActivity(10);

  const statusItems = APPLICATION_STATUSES.map((status) => ({
    label: LABELS.applicationStatus[status],
    value: byStatus[status] || 0,
    color:
      status === "OFFER" || status === "INTERVIEW"
        ? "var(--chart-1)"
        : status === "REJECTED"
          ? "var(--danger)"
          : "var(--chart-2)",
  }));

  return (
    <>
      <PageHeader
        title="Admin overview"
        description={`Everything the platform holds: ${pluralise(totals.users, "member")}, ${pluralise(
          totals.jobs,
          "posting",
        )}, ${pluralise(totals.applications, "application")}.`}
        meta={
          <span className="flex items-center gap-1.5 font-mono text-[0.6875rem] text-ink-3">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            signed in as {user.email}
          </span>
        }
        actions={
          <>
            <Button href="/api/admin/export?dataset=users" variant="outline" size="sm">
              <Download className="size-3.5" aria-hidden="true" />
              Export members
            </Button>
            <Button href="/admin/jobs" size="sm">
              Post a job
            </Button>
          </>
        }
      />

      {/* Tiles */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Members"
          value={totals.users}
          delta={`${recent.users} new this week · ${totals.admins} admin${totals.admins === 1 ? "" : "s"}`}
          icon={Users}
          href="/admin/users"
        />
        <Stat
          label="Open postings"
          value={totals.openJobs}
          delta={`${totals.jobs} in total · ${recent.jobs} added this week`}
          icon={Briefcase}
          href="/admin/jobs"
        />
        <Stat
          label="Applications"
          value={totals.applications}
          delta={`${recent.applications} this week · ${byStatus.INTERVIEW || 0} at interview`}
          icon={Send}
          href="/admin/applications"
        />
        <Stat
          label="CV documents"
          value={totals.resumes}
          delta={`average ATS score ${totals.avgAtsScore}`}
          icon={FileText}
        />
      </div>

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[1.4fr_1fr]">
        <div className="grid content-start gap-5">
          <Panel>
            <PanelBody className="sm:p-6">
              <ActivityChart data={series} />
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader
              title="Newest members"
              description="The five most recent signups"
              action={
                <Button href="/admin/users" variant="quiet" size="sm">
                  All members
                </Button>
              }
            />
            <ul className="divide-y divide-[var(--rule)]">
              {newest.map((member) => (
                <li key={member.id}>
                  <Link
                    href={`/admin/users/${member.id}`}
                    className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-2"
                  >
                    <Avatar name={member.name} tone={member.avatarTone} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.875rem] font-medium text-ink">
                        {member.name}
                      </span>
                      <span className="block truncate font-mono text-[0.6875rem] text-ink-3">
                        {member.email}
                      </span>
                    </span>
                    <span className="hidden text-right sm:block">
                      <span className="tabular block font-mono text-[0.6875rem] text-ink-2">
                        {member.applicationCount} applications
                      </span>
                      <span className="block font-mono text-[0.625rem] text-ink-3">
                        joined {formatRelative(member.createdAt)}
                      </span>
                    </span>
                    {member.role === "ADMIN" ? <Badge tone="mark">admin</Badge> : null}
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel>
            <PanelHeader
              title="Latest applications"
              action={
                <Button href="/admin/applications" variant="quiet" size="sm">
                  Review all
                </Button>
              }
            />
            <ul className="divide-y divide-[var(--rule)]">
              {latest.map((application) => (
                <li
                  key={application.id}
                  className="flex flex-wrap items-center gap-3 px-5 py-3"
                >
                  <Avatar
                    name={application.user.name}
                    tone={application.user.avatarTone}
                    size="sm"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.875rem] text-ink">
                      {application.user.name}
                    </span>
                    <span className="block truncate text-[0.6875rem] text-ink-3">
                      {application.job.title} · {application.job.company}
                    </span>
                  </span>
                  <span className="tabular font-mono text-[0.6875rem] text-ink-2">
                    {application.matchScore}%
                  </span>
                  <StatusBadge value={application.status} />
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="grid content-start gap-5">
          <Panel>
            <PanelHeader title="Applications by stage" />
            <PanelBody>
              <BarList items={statusItems} />
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader
              title="Most requested postings"
              description="By applications received"
            />
            <PanelBody>
              <BarList
                items={topJobs.map((job) => ({
                  label: `${job.title} — ${job.company}`,
                  value: job.applicationCount,
                }))}
                emptyLabel="No applications yet."
              />
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader
              title="Skills across all CVs"
              description="What members say they can do"
            />
            <PanelBody>
              <BarList
                items={skills.map((item) => ({ label: item.skill, value: item.count }))}
                emptyLabel="No CVs stored yet."
              />
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader title="Platform counters" />
            <PanelBody className="grid gap-2.5 text-[0.8125rem]">
              <Row label="Active sessions" value={formatNumber(totals.activeSessions)} />
              <Row label="Suspended accounts" value={formatNumber(totals.suspended)} />
              <Row label="Saved jobs" value={formatNumber(totals.savedJobs)} />
              <Row label="Job views" value={formatNumber(totals.jobViews)} />
              <Row label="Average match score" value={`${totals.avgMatchScore}%`} />
              <Row label="Sign-ins this week" value={formatNumber(recent.logins)} />
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader
              title="Recent activity"
              action={
                <Button href="/admin/activity" variant="quiet" size="sm">
                  Full log
                </Button>
              }
            />
            <ul className="divide-y divide-[var(--rule)]">
              {activity.map((entry) => (
                <li key={entry.id} className="px-5 py-2.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[0.75rem] text-ink">
                      {ACTIVITY_LABELS[entry.action] || entry.action}
                    </span>
                    <span className="shrink-0 font-mono text-[0.625rem] text-ink-3">
                      {formatRelative(entry.createdAt)}
                    </span>
                  </div>
                  {entry.summary &&
                  entry.summary !== (ACTIVITY_LABELS[entry.action] || entry.action) ? (
                    <p className="mt-0.5 truncate text-[0.6875rem] text-ink-3">{entry.summary}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-ink-3">{label}</span>
      <span className="tabular text-ink-2">{value}</span>
    </div>
  );
}
