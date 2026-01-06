import { getAuthUser } from "../../auth/requireUser";
import { query } from "../../db/query";

export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event);
  const body = await readBody(event);

  // Validate input
  if (
    body.name !== undefined &&
    (typeof body.name !== "string" || body.name.trim().length === 0)
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: "Name must be a non-empty string",
    });
  }

  if (
    body.email !== undefined &&
    (typeof body.email !== "string" || !body.email.includes("@"))
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: "Email must be a valid email address",
    });
  }

  if (
    body.phone !== undefined &&
    body.phone !== null &&
    typeof body.phone !== "string"
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: "Phone must be a string or null",
    });
  }

  if (body.birth_date !== undefined && body.birth_date !== null) {
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (
      typeof body.birth_date !== "string" ||
      !dateRegex.test(body.birth_date)
    ) {
      throw createError({
        statusCode: 400,
        statusMessage: "Birth date must be in YYYY-MM-DD format",
      });
    }
  }

  // Build update query dynamically
  const updates = [];
  const values = [];
  let paramIndex = 1;

  if (body.name !== undefined) {
    updates.push(`name = $${paramIndex}`);
    values.push(body.name.trim());
    paramIndex++;
  }

  if (body.email !== undefined) {
    updates.push(`email = $${paramIndex}`);
    values.push(body.email.trim().toLowerCase());
    paramIndex++;
  }

  if (body.phone !== undefined) {
    updates.push(`phone = $${paramIndex}`);
    values.push(body.phone?.trim() || null);
    paramIndex++;
  }

  if (body.birth_date !== undefined) {
    updates.push(`birth_date = $${paramIndex}`);
    values.push(body.birth_date || null);
    paramIndex++;
  }

  if (updates.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "No valid fields to update",
    });
  }

  // Add updated_at and user id
  updates.push(`updated_at = now()`);
  values.push(user.id);

  const updateQuery = `
    UPDATE users
    SET ${updates.join(", ")}
    WHERE id = $${paramIndex}
    RETURNING id, email, name, phone, birth_date, role, is_active, created_at, updated_at
  `;

  const result = await query(updateQuery, values);

  if (result.rows.length === 0) {
    throw createError({
      statusCode: 404,
      statusMessage: "User not found",
    });
  }

  return {
    success: true,
    user: result.rows[0],
  };
});
