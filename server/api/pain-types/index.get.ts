import { getAuthUser } from "../../auth/requireUser";
import { query } from "../../db/query";

export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event);

  const painTypes = await query(
    "SELECT id, name, image_url, created_at FROM pain_types WHERE user_id = $1 ORDER BY created_at DESC",
    [user.id]
  );

  return { painTypes: painTypes.rows };
});
