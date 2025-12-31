import { createError } from "h3";
import { getRouterParam } from "h3";
import { getAdminUser } from "../../../auth/requireAdmin";
import { query } from "../../../db/query";
import { ensureUsersInfra } from "../../../db/setup";

export default defineEventHandler(async (event) => {
  await getAdminUser(event);
  await ensureUsersInfra();

  const idParam = getRouterParam(event, "id");
  const id = Number(idParam);
  if (!id || !Number.isFinite(id)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid user id" });
  }

  const result = await query<{
    id: number;
    email: string;
    name: string | null;
    role: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  }>(
    "select id, email, name, role, is_active, created_at, updated_at from users where id = $1",
    [id]
  );

  const user = result.rows[0];
  if (!user) {
    throw createError({ statusCode: 404, statusMessage: "User not found" });
  }

  return { user };
});
