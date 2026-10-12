import { badRequest, ok, readJson, validationFailed, withUser } from "@/lib/http";
import { parse, profileSchema } from "@/lib/validation";
import { updateUserProfile } from "@/lib/db/users.repo";
import { findPrimaryResume } from "@/lib/db/resumes.repo";
import { countApplications } from "@/lib/db/applications.repo";
import { countSavedJobs } from "@/lib/db/saved-jobs.repo";
import { logActivity } from "@/lib/db/activity.repo";

export const dynamic = "force-dynamic";

export const GET = withUser(async (_request, { user }) => {
  const resume = findPrimaryResume(user.id);
  return ok({
    user,
    stats: {
      applications: countApplications({ userId: user.id }),
      savedJobs: countSavedJobs(user.id),
      atsScore: resume?.atsScore ?? 0,
      hasResume: Boolean(resume),
    },
  });
});

export const PATCH = withUser(async (request, { user, meta }) => {
  const body = await readJson(request);
  if (!body) return badRequest("Send a JSON body.");

  const { data, error } = parse(profileSchema, body);
  if (error) return validationFailed(error);

  const updated = updateUserProfile(user.id, data);

  logActivity({
    userId: user.id,
    actorName: updated.name,
    actorRole: updated.role,
    action: "user.profile_update",
    entity: "user",
    entityId: user.id,
    summary: "Profile updated",
    meta: { fields: Object.keys(data) },
    ...meta,
  });

  return ok({ user: updated, message: "Profile saved." });
});
