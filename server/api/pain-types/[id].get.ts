import { getAuthUser } from "../../auth/requireUser";
import { query } from "../../db/query";

export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event);
  const id = getRouterParam(event, "id");

  if (!id || isNaN(parseInt(id))) {
    throw createError({
      statusCode: 400,
      statusMessage: "Valid ID is required",
    });
  }

  const painType = await query(
    "SELECT id, name, image_url, created_at FROM pain_types WHERE id = $1 AND user_id = $2",
    [parseInt(id), user.id]
  );

  if (painType.rows.length === 0) {
    throw createError({
      statusCode: 404,
      statusMessage: "Pain type not found",
    });
  }

  return { painType: painType.rows[0] };
});
