import { createError } from "h3";
import { getRouterParam } from "h3";
import { getAdminUser } from "../../../auth/requireAdmin";
import { query } from "../../../db/query";
import { ensureUsersInfra } from "../../../db/setup";

export default defineEventHandler(async (event) => {
  const admin = await getAdminUser(event);
  await ensureUsersInfra();

  const idParam = getRouterParam(event, "id");
  const id = Number(idParam);
  if (!id || !Number.isFinite(id)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid user id" });
  }

  // Soft delete: disable the user
  if (admin.id === id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Cannot delete your own user",
    });
  }

  const result = await query<{
    id: number;
    email: string;
    name: string | null;
    role: string;
    is_active: boolean;
  }>(
    "update users set is_active = false, updated_at = now() where id = $1 returning id, email, name, role, is_active",
    [id]
  );

  const user = result.rows[0];
  if (!user) {
    throw createError({ statusCode: 404, statusMessage: "User not found" });
  }

  return { user };
});
