import { Download } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { UsersTable } from "./UsersTable";
import { requireAdmin } from "@/lib/auth/session";
import { listUsers } from "@/lib/db/users.repo";
import { platformTotals } from "@/lib/db/stats.repo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Members" };

const PER_PAGE = 20;

export default async function AdminUsersPage({ searchParams }) {
  const { user } = await requireAdmin("/admin/users");
  const params = await searchParams;

  const query = {
    search: params?.search || "",
    role: params?.role || "",
    status: params?.status || "",
    sort: params?.sort || "newest",
    page: Number(params?.page) || 1,
    perPage: PER_PAGE,
  };

  const { rows, total, page } = listUsers(query);
  const totals = platformTotals();

  return (
    <>
      <PageHeader
        title="Members"
        description={`${totals.users} accounts — ${totals.admins} admin, ${totals.suspended} suspended. Everything stored about a member is on their own page.`}
        actions={
          <Button
            href="/api/admin/export?dataset=users"
            variant="outline"
            size="sm"
          >
            <Download className="size-3.5" aria-hidden="true" />
            Export CSV
          </Button>
        }
      />

      <UsersTable
        users={rows}
        total={total}
        page={page}
        pages={Math.max(1, Math.ceil(total / PER_PAGE))}
        perPage={PER_PAGE}
        currentUserId={user.id}
        query={query}
      />
    </>
  );
}
