import { createError, readBody } from "h3";
import { getRouterParam } from "h3";
import { getAdminUser } from "../../../auth/requireAdmin";
import { query } from "../../../db/query";
import { ensureUsersInfra } from "../../../db/setup";

type PatchBody = {
  name?: string | null;
  role?: string;
  is_active?: boolean;
};

export default defineEventHandler(async (event) => {
  const admin = await getAdminUser(event);
  await ensureUsersInfra();

  const idParam = getRouterParam(event, "id");
  const id = Number(idParam);
  if (!id || !Number.isFinite(id)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid user id" });
  }

  const body = (await readBody(event)) as PatchBody;

  const fields: string[] = [];
  const values: any[] = [];
  let i = 1;

  if ("name" in body) {
    fields.push(`name = $${i++}`);
    values.push(
      body.name === null ? null : String(body.name || "").trim() || null
    );
  }

  if (body.role !== undefined) {
    const role = String(body.role).trim().toLowerCase();
    if (!role)
      throw createError({
        statusCode: 400,
        statusMessage: "role cannot be empty",
      });
    if (!["user", "admin"].includes(role)) {
      throw createError({
        statusCode: 400,
        statusMessage: "role must be user or admin",
      });
    }

    // Prevent removing your own admin role accidentally
    if (admin.id === id && role !== "admin") {
      throw createError({
        statusCode: 400,
        statusMessage: "Cannot remove your own admin role",
      });
    }

    fields.push(`role = $${i++}`);
    values.push(role);
  }

  if (body.is_active !== undefined) {
    // Prevent disabling yourself
    if (admin.id === id && body.is_active === false) {
      throw createError({
        statusCode: 400,
        statusMessage: "Cannot disable your own user",
      });
    }

    fields.push(`is_active = $${i++}`);
    values.push(Boolean(body.is_active));
  }

  if (!fields.length) {
    throw createError({
      statusCode: 400,
      statusMessage: "No fields to update",
    });
  }

  fields.push(`updated_at = now()`);

  values.push(id);

  const result = await query<{
    id: number;
    email: string;
    name: string | null;
    role: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  }>(
    `update users set ${fields.join(
      ", "
    )} where id = $${i} returning id, email, name, role, is_active, created_at, updated_at`,
    values
  );

  const user = result.rows[0];
  if (!user) {
    throw createError({ statusCode: 404, statusMessage: "User not found" });
  }

  return { user };
});
