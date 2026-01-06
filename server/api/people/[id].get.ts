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

  const person = await query(
    "SELECT id, name, relation, image_url, created_at FROM people WHERE id = $1 AND user_id = $2",
    [personId, user.id]
  );

  if (person.length === 0) {
    throw createError({ statusCode: 404, statusMessage: "Person not found" });
  }

  return { success: true, person: person[0] };
});
