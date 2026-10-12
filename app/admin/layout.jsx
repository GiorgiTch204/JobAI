import { AppShell } from "@/components/layout/AppShell";
import { ADMIN_NAV, MEMBER_NAV } from "@/components/layout/nav-config";
import { requireAdmin } from "@/lib/auth/session";

/** Admin console. Non-admins are redirected before anything renders. */
export default async function AdminLayout({ children }) {
  await requireAdmin("/admin");

  const groups = [
    ...ADMIN_NAV,
    { label: "Your account", items: MEMBER_NAV[0].items.slice(0, 1).concat(MEMBER_NAV[2].items) },
  ];

  return (
    <AppShell groups={groups} variant="admin">
      {children}
    </AppShell>
  );
}
