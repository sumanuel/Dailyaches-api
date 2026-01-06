import { getAuthUser } from "../../auth/requireUser";
import { query } from "../../db/query";

export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event);
  const body = await readBody(event);

  console.log("CREATE pain-type - User ID:", user.id, "Name:", body.name);

  if (
    !body.name ||
    typeof body.name !== "string" ||
    body.name.trim().length === 0
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: "Name is required and must be a non-empty string",
    });
  }

  // Check if pain type with this name already exists for this user
  const existingPainType = await query(
    "SELECT id, name FROM pain_types WHERE user_id = $1 AND LOWER(name) = LOWER($2)",
    [user.id, body.name.trim()]
  );

  console.log(
    "CREATE pain-type - Existing check result:",
    existingPainType.rows
  );
  console.log("CREATE pain-type - Searching for name:", body.name.trim());
  console.log(
    "CREATE pain-type - Searching for LOWER(name):",
    body.name.trim().toLowerCase()
  );

  // Debug: Show all pain types for this user
  const allPainTypes = await query(
    "SELECT id, name FROM pain_types WHERE user_id = $1",
    [user.id]
  );
  console.log("CREATE pain-type - All pain types for user:", allPainTypes.rows);

  if (existingPainType.rows.length > 0) {
    console.log(
      "CREATE pain-type - Duplicate found:",
      existingPainType.rows[0]
    );
    throw createError({
      statusCode: 409,
      statusMessage: "A pain type with this name already exists",
    });
  }

  console.log("CREATE pain-type - Creating new pain type");

  const result = await query(
    "INSERT INTO pain_types (user_id, name, image_url) VALUES ($1, $2, $3) RETURNING id, name, image_url, created_at",
    [user.id, body.name.trim(), body.image_url || null]
  );

  console.log("CREATE pain-type - Created successfully:", result.rows[0]);

  return { painType: result.rows[0] };
});
