import { ok, searchParamsOf, withAdmin } from "@/lib/http";
import { listUsers } from "@/lib/db/users.repo";

export const dynamic = "force-dynamic";

export const GET = withAdmin(async (request) => {
  const params = searchParamsOf(request);
  const { rows, total, page, perPage } = listUsers({
    search: params.get("search") || "",
    role: params.get("role") || "",
    status: params.get("status") || "",
    sort: params.get("sort") || "newest",
    page: Number(params.get("page")) || 1,
    perPage: Number(params.get("perPage")) || 20,
  });

  return ok({ users: rows, total, page, perPage, pages: Math.max(1, Math.ceil(total / perPage)) });
});
