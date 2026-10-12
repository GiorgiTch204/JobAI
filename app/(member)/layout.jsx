import { AppShell } from "@/components/layout/AppShell";
import { MEMBER_NAV } from "@/components/layout/nav-config";
import { requireUser } from "@/lib/auth/session";

/**
 * Everything behind sign-in. `requireUser` re-checks the session against the
 * database on every request, so a revoked session or a suspended account is
 * turned away here even if the cookie still looks valid to the proxy.
 */
export default async function MemberLayout({ children }) {
  await requireUser("/dashboard");

  return <AppShell groups={MEMBER_NAV}>{children}</AppShell>;
}
