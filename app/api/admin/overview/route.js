import { ok, withAdmin } from "@/lib/http";
import { dailySeries, platformTotals, recentCounts, topSkills } from "@/lib/db/stats.repo";
import { applicationsByStatus, listApplications } from "@/lib/db/applications.repo";
import { topJobsByApplications } from "@/lib/db/jobs.repo";
import { recentActivity } from "@/lib/db/activity.repo";
import { listUsers } from "@/lib/db/users.repo";

export const dynamic = "force-dynamic";

export const GET = withAdmin(async () => {
  return ok({
    totals: platformTotals(),
    recent: recentCounts(7),
    series: dailySeries(14),
    byStatus: applicationsByStatus(),
    topJobs: topJobsByApplications(5),
    topSkills: topSkills(10),
    newestUsers: listUsers({ perPage: 5 }).rows,
    latestApplications: listApplications({ perPage: 6 }).rows,
    activity: recentActivity(10),
  });
});
