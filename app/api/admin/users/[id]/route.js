import {
  badRequest,
  forbidden,
  notFound,
  ok,
  readJson,
  validationFailed,
  withAdmin,
} from "@/lib/http";
import { adminUserPatchSchema, parse } from "@/lib/validation";
import {
  countAdmins,
  deleteUser,
  findUserById,
  getUserDossier,
  updateUserAdminFields,
} from "@/lib/db/users.repo";
import { revokeAllUserSessions } from "@/lib/db/sessions.repo";
import { logActivity } from "@/lib/db/activity.repo";

export const dynamic = "force-dynamic";

export const GET = withAdmin(async (_request, { params }) => {
  const { id } = await params;
  const dossier = getUserDossier(id);
  if (!dossier) return notFound("That member does not exist.");
  return ok(dossier);
});

export const PATCH = withAdmin(async (request, { params, user, meta }) => {
  const { id } = await params;
  const target = findUserById(id);
  if (!target) return notFound("That member does not exist.");

  const body = await readJson(request);
  if (!body) return badRequest("Send a JSON body.");

  const { data, error } = parse(adminUserPatchSchema, body);
  if (error) return validationFailed(error);

  if (target.id === user.id && data.role === "USER") {
    return forbidden("You cannot remove your own admin access.");
  }
  if (target.role === "ADMIN" && data.role === "USER" && countAdmins() <= 1) {
    return forbidden("This is the only admin account. Promote someone else first.");
  }
  if (target.id === user.id && data.status === "SUSPENDED") {
    return forbidden("You cannot suspend your own account.");
  }

  const updated = updateUserAdminFields(id, data);

  // A suspended account must lose its live sessions immediately.
  let revoked = 0;
  if (data.status === "SUSPENDED") revoked = revokeAllUserSessions(id);

  logActivity({
    userId: user.id,
    actorName: user.name,
    actorRole: user.role,
    action: "admin.user_update",
    entity: "user",
    entityId: id,
    summary: `Updated ${target.name}: ${Object.entries(data)
      .map(([key, value]) => `${key} → ${value}`)
      .join(", ")}`,
    meta: { ...data, revokedSessions: revoked },
    ...meta,
  });

  return ok({ user: updated, revoked, message: `${updated.name} updated.` });
});

export const DELETE = withAdmin(async (_request, { params, user, meta }) => {
  const { id } = await params;
  const target = findUserById(id);
  if (!target) return notFound("That member does not exist.");

  if (target.id === user.id) return forbidden("You cannot delete your own account.");
  if (target.role === "ADMIN" && countAdmins() <= 1) {
    return forbidden("This is the only admin account.");
  }

  deleteUser(id);

  logActivity({
    userId: user.id,
    actorName: user.name,
    actorRole: user.role,
    action: "admin.user_delete",
    entity: "user",
    entityId: id,
    summary: `Deleted ${target.name} (${target.email}) and all of their data`,
    ...meta,
  });

  return ok({ message: `${target.name} and all related records were deleted.` });
});
