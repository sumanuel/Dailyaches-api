import { getAuthUser } from "../../auth/requireUser";
import { query } from "../../db/query";

export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event);
  const body = await readBody(event);

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

  const result = await query(
    "INSERT INTO pain_types (user_id, name, image_url) VALUES ($1, $2, $3) RETURNING id, name, image_url, created_at",
    [user.id, body.name.trim(), body.image_url || null]
  );

  return { painType: result.rows[0] };
});
