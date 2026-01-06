import { getAuthUser } from "../../auth/requireUser";
import { query } from "../../db/query";

export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event);
  const id = getRouterParam(event, "id");

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "ID is required" });
  }

  const recordId = parseInt(id);
  if (isNaN(recordId)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid ID" });
  }

  // Check if record exists and belongs to user
  const existingRecord = await query(
    "SELECT id FROM records WHERE id = $1 AND user_id = $2",
    [recordId, user.id]
  );

  if (existingRecord.rows.length === 0) {
    throw createError({ statusCode: 404, statusMessage: "Record not found" });
  }

  // Delete the record
  await query("DELETE FROM records WHERE id = $1 AND user_id = $2", [
    recordId,
    user.id,
  ]);

  return { success: true, message: "Record deleted successfully" };
});
