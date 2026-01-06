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

  await query("DELETE FROM pain_types WHERE id = $1 AND user_id = $2", [
    parseInt(id),
    user.id,
  ]);

  return { message: "Pain type deleted successfully" };
});
