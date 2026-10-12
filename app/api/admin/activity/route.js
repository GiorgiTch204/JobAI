import { ok, searchParamsOf, withAdmin } from "@/lib/http";
import { distinctActions, listActivity } from "@/lib/db/activity.repo";

export const dynamic = "force-dynamic";

export const GET = withAdmin(async (request) => {
  const params = searchParamsOf(request);
  const { rows, total, page, perPage } = listActivity({
    search: params.get("search") || "",
    action: params.get("action") || "",
    userId: params.get("userId") || "",
    page: Number(params.get("page")) || 1,
    perPage: Number(params.get("perPage")) || 30,
  });

  return ok({
    activity: rows,
    total,
    page,
    perPage,
    pages: Math.max(1, Math.ceil(total / perPage)),
    actions: distinctActions(),
  });
});
