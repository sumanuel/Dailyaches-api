import { getAuthUser } from "../../auth/requireUser";
import { query } from "../../db/query";

export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event);
  const id = getRouterParam(event, "id");

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "ID is required" });
  }

  const personId = parseInt(id);
  if (isNaN(personId)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid ID" });
  }

  // Check if the person exists and belongs to the user
  const existingPerson = await query(
    "SELECT id FROM people WHERE id = $1 AND user_id = $2",
    [personId, user.id]
  );

  if (existingPerson.length === 0) {
    throw createError({ statusCode: 404, statusMessage: "Person not found" });
  }

  // Delete the person
  await query("DELETE FROM people WHERE id = $1 AND user_id = $2", [
    personId,
    user.id,
  ]);

  return { success: true, message: "Person deleted successfully" };
});
