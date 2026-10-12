import { ok, route } from "@/lib/http";
import { db } from "@/lib/db/client";
import { activeDriver } from "@/lib/db/driver";

export const dynamic = "force-dynamic";

/** Liveness probe: proves the server is up and the database answers. */
export const GET = route(async () => {
  const row = db.prepare("SELECT COUNT(*) AS n FROM users").get();

  return ok({
    status: "healthy",
    database: "connected",
    driver: activeDriver(),
    users: row.n,
    time: new Date().toISOString(),
  });
});
