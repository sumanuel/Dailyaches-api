import { getAuthUser } from "../../auth/requireUser";
import { query } from "../../db/query";

export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event);
  const id = getRouterParam(event, "id");

  console.log("DELETE pain-type - ID:", id, "User ID:", user.id);

  if (!id || isNaN(parseInt(id))) {
    throw createError({
      statusCode: 400,
      statusMessage: "Valid ID is required",
    });
  }

  // Check if the pain type exists and belongs to the user
  const existing = await query(
    "SELECT id, name FROM pain_types WHERE id = $1 AND user_id = $2",
    [parseInt(id), user.id]
  );

  console.log("DELETE pain-type - Existing check result:", existing.rows);

  if (existing.rows.length === 0) {
    throw createError({
      statusCode: 404,
      statusMessage: "Pain type not found",
    });
  }

  console.log("DELETE pain-type - Deleting pain type:", existing.rows[0].name);

  // Check if the pain type is being used in any records
  const usageCheck = await query(
    "SELECT COUNT(*) as count FROM records WHERE pain_type_id = $1 AND user_id = $2",
    [parseInt(id), user.id]
  );

  console.log("DELETE pain-type - Usage check result:", usageCheck.rows[0]);

  if (usageCheck.rows[0].count > 0) {
    throw createError({
      statusCode: 409,
      statusMessage:
        "Cannot delete pain type because it is being used in existing records",
    });
  }

  await query("DELETE FROM pain_types WHERE id = $1 AND user_id = $2", [
    parseInt(id),
    user.id,
  ]);

  console.log("DELETE pain-type - Successfully deleted");

  return { message: "Pain type deleted successfully" };
});
