import { Send } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { ApplicationList } from "./ApplicationList";
import { requireUser } from "@/lib/auth/session";
import { applicationsByStatus, listApplications } from "@/lib/db/applications.repo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Applications" };

export default async function ApplicationsPage({ searchParams }) {
  const { user } = await requireUser("/applications");
  const params = await searchParams;

  const status = params?.status || "";
  const { rows, total } = listApplications({
    userId: user.id,
    status,
    perPage: 100,
    sort: params?.sort || "newest",
  });

  const all = listApplications({ userId: user.id, perPage: 200 }).rows;
  const counts = all.reduce(
    (acc, item) => ({ ...acc, [item.status]: (acc[item.status] || 0) + 1 }),
    {},
  );

  return (
    <>
      <PageHeader
        title="Applications"
        description={
          all.length
            ? `${all.length} sent. Every status change is recorded, so you can see where each one stands.`
            : "Nothing sent yet. Applications you send will be tracked here."
        }
      />

      {all.length ? (
        <ApplicationList
          applications={rows}
          counts={counts}
          total={total}
          activeStatus={status}
        />
      ) : (
        <EmptyState
          icon={Send}
          title="No applications yet"
          description="Find a role that matches your CV, apply, and the reply shows up here with its full history."
          action={{ label: "Browse jobs", href: "/jobs" }}
        />
      )}
    </>
  );
}
