import { createError, readBody } from "h3";
import { getHeader } from "h3";
import { query } from "../../db/query";
import { ensureUsersInfra } from "../../db/setup";

type Body = { email?: string };

// One-time helper to set an admin, protected by ADMIN_SETUP_TOKEN.
// Usage:
// POST /api/admin/bootstrap
// Header: x-admin-setup-token: <ADMIN_SETUP_TOKEN>
// Body: { "email": "you@example.com" }
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const expected = config.adminSetupToken;

  if (!expected) {
    throw createError({
      statusCode: 400,
      statusMessage: "ADMIN_SETUP_TOKEN is not configured",
    });
  }

  const provided = getHeader(event, "x-admin-setup-token");
  if (!provided || provided !== expected) {
    throw createError({ statusCode: 403, statusMessage: "Forbidden" });
  }

  const body = (await readBody(event)) as Body;
  const email = (body.email || "").trim().toLowerCase();
  if (!email) {
    throw createError({ statusCode: 400, statusMessage: "email is required" });
  }

  await ensureUsersInfra();

  const result = await query<{ id: number; email: string; role: string }>(
    "update users set role = $1, updated_at = now() where email = $2 returning id, email, role",
    ["admin", email]
  );

  const user = result.rows[0];
  if (!user) {
    throw createError({ statusCode: 404, statusMessage: "User not found" });
  }

  return { user };
});
