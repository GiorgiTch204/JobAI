import { badRequest, searchParamsOf, withAdmin } from "@/lib/http";
import { listUsers } from "@/lib/db/users.repo";
import { listApplications } from "@/lib/db/applications.repo";
import { listJobs } from "@/lib/db/jobs.repo";
import { logActivity } from "@/lib/db/activity.repo";
import { toCsv } from "@/lib/utils";

export const dynamic = "force-dynamic";

const DATASETS = {
  users: () => ({
    rows: listUsers({ perPage: 100, page: 1 }).rows,
    columns: [
      { label: "ID", value: (r) => r.id },
      { label: "Name", value: (r) => r.name },
      { label: "Email", value: (r) => r.email },
      { label: "Role", value: (r) => r.role },
      { label: "Status", value: (r) => r.status },
      { label: "Headline", value: (r) => r.headline },
      { label: "Location", value: (r) => r.location },
      { label: "CVs", value: (r) => r.resumeCount },
      { label: "Applications", value: (r) => r.applicationCount },
      { label: "Best ATS score", value: (r) => r.bestAtsScore },
      { label: "Logins", value: (r) => r.loginCount },
      { label: "Last login", value: (r) => r.lastLoginAt || "" },
      { label: "Registered", value: (r) => r.createdAt },
    ],
  }),
  applications: () => ({
    rows: listApplications({ perPage: 200 }).rows,
    columns: [
      { label: "ID", value: (r) => r.id },
      { label: "Applicant", value: (r) => r.user?.name || "" },
      { label: "Email", value: (r) => r.user?.email || "" },
      { label: "Role", value: (r) => r.job?.title || "" },
      { label: "Company", value: (r) => r.job?.company || "" },
      { label: "Status", value: (r) => r.status },
      { label: "Match %", value: (r) => r.matchScore },
      { label: "ATS %", value: (r) => r.atsScore },
      { label: "Submitted", value: (r) => r.createdAt },
      { label: "Last update", value: (r) => r.updatedAt },
      { label: "Note", value: (r) => r.note },
    ],
  }),
  jobs: () => ({
    rows: listJobs({ status: "", perPage: 100, withCounts: true }).rows,
    columns: [
      { label: "ID", value: (r) => r.id },
      { label: "Title", value: (r) => r.title },
      { label: "Company", value: (r) => r.company },
      { label: "Location", value: (r) => r.location },
      { label: "Work mode", value: (r) => r.workMode },
      { label: "Type", value: (r) => r.employmentType },
      { label: "Seniority", value: (r) => r.seniority },
      { label: "Salary min", value: (r) => r.salaryMin ?? "" },
      { label: "Salary max", value: (r) => r.salaryMax ?? "" },
      { label: "Currency", value: (r) => r.salaryCurrency },
      { label: "Status", value: (r) => r.status },
      { label: "Views", value: (r) => r.views },
      { label: "Applications", value: (r) => r.applicationCount ?? 0 },
      { label: "Tags", value: (r) => (r.tags || []).join(" | ") },
      { label: "Posted", value: (r) => r.createdAt },
    ],
  }),
};

export const GET = withAdmin(async (request, { user, meta }) => {
  const dataset = searchParamsOf(request).get("dataset") || "users";
  const build = DATASETS[dataset];
  if (!build) {
    return badRequest(`Unknown dataset. Choose one of: ${Object.keys(DATASETS).join(", ")}.`);
  }

  const { rows, columns } = build();
  const csv = toCsv(rows, columns);
  const stamp = new Date().toISOString().slice(0, 10);

  logActivity({
    userId: user.id,
    actorName: user.name,
    actorRole: user.role,
    action: "admin.export",
    entity: dataset,
    summary: `Exported ${rows.length} ${dataset} as CSV`,
    ...meta,
  });

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="jobai-${dataset}-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
});
