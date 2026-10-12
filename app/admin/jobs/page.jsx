import { Download } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { JobsManager } from "./JobsManager";
import { requireAdmin } from "@/lib/auth/session";
import { listJobs } from "@/lib/db/jobs.repo";
import { platformTotals } from "@/lib/db/stats.repo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Job postings" };

export default async function AdminJobsPage({ searchParams }) {
  await requireAdmin("/admin/jobs");
  const params = await searchParams;

  const { rows } = listJobs({
    status: params?.status || "",
    search: params?.search || "",
    sort: params?.sort || "newest",
    perPage: 100,
    withCounts: true,
  });

  const totals = platformTotals();

  return (
    <>
      <PageHeader
        title="Job postings"
        description={`${totals.jobs} postings — ${totals.openJobs} open. Publishing one makes it visible on the public job board immediately.`}
        actions={
          <Button href="/api/admin/export?dataset=jobs" variant="outline" size="sm">
            <Download className="size-3.5" aria-hidden="true" />
            Export CSV
          </Button>
        }
      />
      <JobsManager jobs={rows} query={{ status: params?.status || "", search: params?.search || "" }} />
    </>
  );
}
