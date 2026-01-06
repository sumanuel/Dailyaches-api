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

  const body = await readBody(event);
  const { name, relation, image_url, phone, whatsapp_enabled } = body;

  if (!name || name.trim() === "") {
    throw createError({ statusCode: 400, statusMessage: "Name is required" });
  }

  // Check if the person exists and belongs to the user
  const existingPerson = await query(
    "SELECT id FROM people WHERE id = $1 AND user_id = $2",
    [personId, user.id]
  );

  if (existingPerson.rows.length === 0) {
    throw createError({ statusCode: 404, statusMessage: "Person not found" });
  }

  // Update the person
  const updatedPerson = await query(
    "UPDATE people SET name = $1, relation = $2, image_url = $3, phone = $4, whatsapp_enabled = $5, updated_at = NOW() WHERE id = $6 AND user_id = $7 RETURNING id, name, relation, image_url, phone, whatsapp_enabled, created_at, updated_at",
    [
      name.trim(),
      relation?.trim() || null,
      image_url?.trim() || null,
      phone?.trim() || null,
      whatsapp_enabled || false,
      personId,
      user.id,
    ]
  );

  return { success: true, person: updatedPerson.rows[0] };
});
