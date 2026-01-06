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

  const body = await readBody(event);
  const { person_id, pain_type_id, pain_level, notes } = body;

  // Validate required fields
  if (pain_level !== undefined && (pain_level < 1 || pain_level > 10)) {
    throw createError({
      statusCode: 400,
      statusMessage: "pain_level must be between 1 and 10",
    });
  }

  // Check if the record exists and belongs to the user
  const existingRecord = await query(
    "SELECT id FROM records WHERE id = $1 AND user_id = $2",
    [recordId, user.id]
  );

  if (existingRecord.rows.length === 0) {
    throw createError({ statusCode: 404, statusMessage: "Record not found" });
  }

  // Validate person_id if provided
  if (person_id) {
    const personCheck = await query(
      "SELECT id FROM people WHERE id = $1 AND user_id = $2",
      [person_id, user.id]
    );

    if (personCheck.rows.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: "Person not found or does not belong to user",
      });
    }
  }

  // Validate pain_type_id if provided
  if (pain_type_id) {
    const painTypeCheck = await query(
      "SELECT id FROM pain_types WHERE id = $1 AND user_id = $2",
      [pain_type_id, user.id]
    );

    if (painTypeCheck.rows.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: "Pain type not found or does not belong to user",
      });
    }
  }

  // Build update query dynamically
  const updateFields = [];
  const values = [];
  let paramCount = 1;

  if (person_id !== undefined) {
    updateFields.push(`person_id = $${paramCount++}`);
    values.push(person_id);
  }

  if (pain_type_id !== undefined) {
    updateFields.push(`pain_type_id = $${paramCount++}`);
    values.push(pain_type_id);
  }

  if (pain_level !== undefined) {
    updateFields.push(`pain_level = $${paramCount++}`);
    values.push(pain_level);
  }

  if (notes !== undefined) {
    updateFields.push(`notes = $${paramCount++}`);
    values.push(notes);
  }

  if (updateFields.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "No fields to update",
    });
  }

  updateFields.push(`updated_at = NOW()`);

  const updateQuery = `
    UPDATE records
    SET ${updateFields.join(", ")}
    WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
    RETURNING id, person_id, pain_type_id, pain_level, notes, created_at, updated_at
  `;

  values.push(recordId, user.id);

  const result = await query(updateQuery, values);

  return { success: true, record: result.rows[0] };
});
