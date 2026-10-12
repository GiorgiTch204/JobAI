import { PageHeader } from "@/components/layout/PageHeader";
import { ActivityLog } from "./ActivityLog";
import { requireAdmin } from "@/lib/auth/session";
import { distinctActions, listActivity } from "@/lib/db/activity.repo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Activity log" };

const PER_PAGE = 40;

export default async function AdminActivityPage({ searchParams }) {
  await requireAdmin("/admin/activity");
  const params = await searchParams;

  const query = {
    search: params?.search || "",
    action: params?.action || "",
    userId: params?.userId || "",
    page: Number(params?.page) || 1,
    perPage: PER_PAGE,
  };

  const { rows, total, page } = listActivity(query);
  const actions = distinctActions();

  return (
    <>
      <PageHeader
        title="Activity log"
        description="Every sign-in, CV change, application and admin action, with the address it came from."
      />
      <ActivityLog
        entries={rows}
        actions={actions}
        total={total}
        page={page}
        pages={Math.max(1, Math.ceil(total / PER_PAGE))}
        perPage={PER_PAGE}
        query={query}
      />
    </>
  );
}
