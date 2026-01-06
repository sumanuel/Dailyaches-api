import { getAuthUser } from "../../auth/requireUser";
import { query } from "../../db/query";

export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event);
  const id = getRouterParam(event, "id");
  const body = await readBody(event);

  if (!id || isNaN(parseInt(id))) {
    throw createError({
      statusCode: 400,
      statusMessage: "Valid ID is required",
    });
  }

  if (
    !body.name ||
    typeof body.name !== "string" ||
    body.name.trim().length === 0
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: "Name is required and must be a non-empty string",
    });
  }

  // Check if the pain type exists and belongs to the user
  const existing = await query(
    "SELECT id FROM pain_types WHERE id = $1 AND user_id = $2",
    [parseInt(id), user.id]
  );

  if (existing.rows.length === 0) {
    throw createError({
      statusCode: 404,
      statusMessage: "Pain type not found",
    });
  }

  // Check if another pain type with this name already exists for this user
  const duplicateCheck = await query(
    "SELECT id FROM pain_types WHERE user_id = $1 AND LOWER(name) = LOWER($2) AND id != $3",
    [user.id, body.name.trim(), parseInt(id)]
  );

  if (duplicateCheck.rows.length > 0) {
    throw createError({
      statusCode: 409,
      statusMessage: "Another pain type with this name already exists",
    });
  }

  const result = await query(
    "UPDATE pain_types SET name = $1, image_url = $2, updated_at = NOW() WHERE id = $3 AND user_id = $4 RETURNING id, name, image_url, created_at, updated_at",
    [body.name.trim(), body.image_url || null, parseInt(id), user.id]
  );

  return { painType: result.rows[0] };
});
