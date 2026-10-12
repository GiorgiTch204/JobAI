import { ok, searchParamsOf, withUser } from "@/lib/http";
import { listApplications } from "@/lib/db/applications.repo";

export const dynamic = "force-dynamic";

export const GET = withUser(async (request, { user }) => {
  const params = searchParamsOf(request);
  const { rows, total, page, perPage } = listApplications({
    userId: user.id,
    status: params.get("status") || "",
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
  });
});
