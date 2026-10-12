import {
  badRequest,
  notFound,
  ok,
  readJson,
  searchParamsOf,
  validationFailed,
  withAdmin,
} from "@/lib/http";
import { applicationStatusSchema, parse } from "@/lib/validation";
import {
  applicationsByStatus,
  findApplication,
  listApplications,
  updateApplicationStatus,
} from "@/lib/db/applications.repo";
import { logActivity } from "@/lib/db/activity.repo";

export const dynamic = "force-dynamic";

export const GET = withAdmin(async (request) => {
  const params = searchParamsOf(request);
  const { rows, total, page, perPage } = listApplications({
    status: params.get("status") || "",
    jobId: params.get("jobId") || "",
    userId: params.get("userId") || "",
    search: params.get("search") || "",
    sort: params.get("sort") || "newest",
    page: Number(params.get("page")) || 1,
    perPage: Number(params.get("perPage")) || 20,
  });

  return ok({
    applications: rows,
    total,
    page,
    perPage,
    pages: Math.max(1, Math.ceil(total / perPage)),
    byStatus: applicationsByStatus(),
  });
});

export const PATCH = withAdmin(async (request, { user, meta }) => {
  const body = await readJson(request);
  if (!body) return badRequest("Send a JSON body.");

  const id = body.applicationId || body.id;
  if (!id) return badRequest("Which application? Send `applicationId`.");

  const existing = findApplication(id);
  if (!existing) return notFound("That application does not exist.");

  const { data, error } = parse(applicationStatusSchema, body);
  if (error) return validationFailed(error);

  const application = updateApplicationStatus(id, data.status, {
    actorId: user.id,
    actorName: user.name,
    note: data.note || "",
  });

  logActivity({
    userId: user.id,
    actorName: user.name,
    actorRole: user.role,
    action: "application.status",
    entity: "application",
    entityId: id,
    summary: `${existing.user?.name || "Applicant"}: ${existing.status} → ${data.status} for ${
      existing.job?.title || "a role"
    }`,
    meta: { from: existing.status, to: data.status },
    ...meta,
  });

  return ok({ application, message: "Status updated." });
});
