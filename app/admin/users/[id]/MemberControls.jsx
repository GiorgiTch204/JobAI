"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, ShieldCheck, Trash2, UserCheck, UserRound } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { del, patch } from "@/lib/client-api";

/** Admin actions on one member. Destructive actions always confirm. */
export function MemberControls({ member, isSelf }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const run = async (key, body, message) => {
    setPending(key);
    try {
      await patch(`/api/admin/users/${member.id}`, body);
      toast.success(message);
      router.refresh();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setPending("");
    }
  };

  const remove = async () => {
    setPending("delete");
    try {
      const data = await del(`/api/admin/users/${member.id}`);
      toast.success(data.message);
      router.push("/admin/users");
    } catch (error) {
      toast.error(error.message);
      setPending("");
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {member.role === "ADMIN" ? (
          <Button
            variant="outline"
            size="sm"
            disabled={isSelf}
            loading={pending === "role"}
            onClick={() => run("role", { role: "USER" }, `${member.name} is now a member.`)}
            title={isSelf ? "You cannot remove your own admin access" : undefined}
          >
            <UserRound className="size-3.5" aria-hidden="true" />
            Remove admin
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            loading={pending === "role"}
            onClick={() => run("role", { role: "ADMIN" }, `${member.name} is now an admin.`)}
          >
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            Make admin
          </Button>
        )}

        {member.status === "ACTIVE" ? (
          <Button
            variant="outline"
            size="sm"
            disabled={isSelf}
            loading={pending === "status"}
            onClick={() =>
              run(
                "status",
                { status: "SUSPENDED" },
                `${member.name} is suspended and signed out everywhere.`,
              )
            }
            title={isSelf ? "You cannot suspend your own account" : undefined}
          >
            <Ban className="size-3.5" aria-hidden="true" />
            Suspend
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            loading={pending === "status"}
            onClick={() => run("status", { status: "ACTIVE" }, `${member.name} can sign in again.`)}
          >
            <UserCheck className="size-3.5" aria-hidden="true" />
            Reactivate
          </Button>
        )}

        <Button
          variant="danger"
          size="sm"
          disabled={isSelf}
          onClick={() => setConfirmDelete(true)}
          title={isSelf ? "You cannot delete your own account" : undefined}
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
          Delete
        </Button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        loading={pending === "delete"}
        title={`Delete ${member.name}?`}
        description="Their CVs, applications, saved jobs, sessions and activity are removed with the account."
        confirmLabel="Delete member"
      />
    </>
  );
}
