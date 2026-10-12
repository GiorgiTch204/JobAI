"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Monitor, Smartphone } from "lucide-react";

import { Panel, PanelBody, PanelHeader } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { del } from "@/lib/client-api";
import { formatRelative } from "@/lib/utils";

export function SessionList({ sessions }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState("");

  const active = sessions.filter((session) => session.active);

  const revoke = async (id) => {
    setPending(id);
    try {
      const data = await del(
        id === "all" ? "/api/auth/sessions" : `/api/auth/sessions/${id}`,
      );
      toast.success(data.message);
      router.refresh();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setPending("");
    }
  };

  return (
    <Panel>
      <PanelHeader
        title="Signed-in devices"
        description={`${active.length} active ${active.length === 1 ? "session" : "sessions"}`}
        action={
          active.length > 1 ? (
            <Button
              variant="quiet"
              size="sm"
              onClick={() => revoke("all")}
              loading={pending === "all"}
            >
              Sign out the others
            </Button>
          ) : null
        }
      />
      <ul className="divide-y divide-[var(--rule)]">
        {sessions.slice(0, 8).map((session) => {
          const mobile = /android|iphone|ipad/i.test(session.userAgent || "");
          const Icon = mobile ? Smartphone : Monitor;

          return (
            <li key={session.id} className="flex items-center gap-3 px-5 py-3">
              <Icon className="size-4 shrink-0 text-ink-3" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.8125rem] text-ink">
                  {session.device || "Unknown device"}
                </p>
                <p className="truncate font-mono text-[0.6875rem] text-ink-3">
                  {session.ip} · last seen {formatRelative(session.lastSeenAt)}
                </p>
              </div>

              {session.current ? (
                <Badge tone="mark">this device</Badge>
              ) : session.active ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => revoke(session.id)}
                  loading={pending === session.id}
                >
                  Sign out
                </Button>
              ) : (
                <Badge tone="muted">ended</Badge>
              )}
            </li>
          );
        })}
      </ul>
      <PanelBody className="border-t border-rule">
        <p className="text-[0.75rem] leading-relaxed text-ink-3">
          Signing out a device revokes its session immediately, even if its
          cookie has not expired.
        </p>
      </PanelBody>
    </Panel>
  );
}
