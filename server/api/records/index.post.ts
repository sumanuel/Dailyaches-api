import { getAuthUser } from "../../auth/requireUser";
import { query } from "../../db/query";

export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event);
  const body = await readBody(event);

  // Validate required fields
  if (!body.person_id || !body.pain_type_id || !body.pain_level) {
    throw createError({
      statusCode: 400,
      statusMessage:
        "Missing required fields: person_id, pain_type_id, pain_level",
    });
  }

  // Validate pain_level range
  if (body.pain_level < 1 || body.pain_level > 10) {
    throw createError({
      statusCode: 400,
      statusMessage: "pain_level must be between 1 and 10",
    });
  }

  // Verify that person_id belongs to the user
  const personCheck = await query(
    "SELECT id FROM people WHERE id = $1 AND user_id = $2",
    [body.person_id, user.id]
  );

  if (personCheck.rows.length === 0) {
    throw createError({
      statusCode: 404,
      statusMessage: "Person not found or does not belong to user",
    });
  }

  // Verify that pain_type_id belongs to the user
  const painTypeCheck = await query(
    "SELECT id FROM pain_types WHERE id = $1 AND user_id = $2",
    [body.pain_type_id, user.id]
  );

  if (painTypeCheck.rows.length === 0) {
    throw createError({
      statusCode: 404,
      statusMessage: "Pain type not found or does not belong to user",
    });
  }

  // Insert the record
  const result = await query(
    `
    INSERT INTO records (user_id, person_id, pain_type_id, pain_level, notes)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, person_id, pain_type_id, pain_level, notes, created_at
  `,
    [
      user.id,
      body.person_id,
      body.pain_type_id,
      body.pain_level,
      body.notes || null,
    ]
  );

  return { record: result.rows[0] };
});
