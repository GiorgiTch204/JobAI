import { PageHeader } from "@/components/layout/PageHeader";
import { ProfileForm } from "./ProfileForm";
import { PasswordForm } from "./PasswordForm";
import { SessionList } from "./SessionList";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { requireUser } from "@/lib/auth/session";
import { listUserSessions } from "@/lib/db/sessions.repo";
import { countResumes } from "@/lib/db/resumes.repo";
import { countApplications } from "@/lib/db/applications.repo";
import { LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { user, sessionId } = await requireUser("/settings");

  const sessions = listUserSessions(user.id).map((item) => ({
    ...item,
    current: item.id === sessionId,
  }));

  return (
    <>
      <PageHeader
        title="Settings"
        description="Your details, your password and the devices signed in to this account."
        meta={
          <>
            <Badge tone={user.role === "ADMIN" ? "mark" : "neutral"}>
              {LABELS.role[user.role]}
            </Badge>
            <span className="font-mono text-[0.6875rem] text-ink-3">
              joined {formatDate(user.createdAt)}
            </span>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr] lg:items-start">
        <div className="grid gap-5">
          <ProfileForm user={user} />
          <PasswordForm />
        </div>

        <div className="grid gap-5">
          <Panel>
            <PanelHeader title="Your account" />
            <PanelBody className="grid gap-2.5 text-[0.8125rem]">
              <Row label="Email" value={user.email} mono />
              <Row label="Role" value={LABELS.role[user.role]} />
              <Row label="Status" value={LABELS.userStatus[user.status]} />
              <Row label="CVs stored" value={countResumes(user.id)} />
              <Row
                label="Applications sent"
                value={countApplications({ userId: user.id })}
              />
              <Row label="Sign-ins" value={user.loginCount} />
              <Row
                label="Last sign-in"
                value={
                  user.lastLoginAt
                    ? formatDate(user.lastLoginAt, { withTime: true })
                    : "—"
                }
              />
            </PanelBody>
          </Panel>

          <SessionList sessions={sessions} />
        </div>
      </div>
    </>
  );
}

function Row({ label, value, mono = false }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-ink-3">{label}</span>
      <span
        className={
          mono ? "font-mono text-[0.75rem] text-ink-2" : "tabular text-ink-2"
        }
      >
        {value}
      </span>
    </div>
  );
}
