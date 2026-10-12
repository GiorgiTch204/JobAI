import { Download } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { ApplicationsReview } from "./ApplicationsReview";
import { requireAdmin } from "@/lib/auth/session";
import {
  applicationsByStatus,
  listApplications,
} from "@/lib/db/applications.repo";
import { findJob } from "@/lib/db/jobs.repo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Applications" };

const PER_PAGE = 20;

export default async function AdminApplicationsPage({ searchParams }) {
  await requireAdmin("/admin/applications");
  const params = await searchParams;

  const query = {
    status: params?.status || "",
    jobId: params?.jobId || "",
    search: params?.search || "",
    sort: params?.sort || "newest",
    page: Number(params?.page) || 1,
    perPage: PER_PAGE,
  };

  const { rows, total, page } = listApplications(query);
  const byStatus = applicationsByStatus();
  const job = query.jobId ? findJob(query.jobId) : null;

  return (
    <>
      <PageHeader
        title="Applications"
        description={
          job
            ? `Applications for “${job.title}” at ${job.company}.`
            : "Every application, with the CV that was sent and the full status history."
        }
        actions={
          <Button
            href="/api/admin/export?dataset=applications"
            variant="outline"
            size="sm"
          >
            <Download className="size-3.5" aria-hidden="true" />
            Export CSV
          </Button>
        }
      />

      <ApplicationsReview
        applications={rows}
        byStatus={byStatus}
        total={total}
        page={page}
        pages={Math.max(1, Math.ceil(total / PER_PAGE))}
        perPage={PER_PAGE}
        query={query}
        job={job}
      />
    </>
  );
}
