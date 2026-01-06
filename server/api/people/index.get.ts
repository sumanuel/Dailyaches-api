import { getAuthUser } from "../../auth/requireUser";
import { query } from "../../db/query";

export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event);

  const people = await query(
    "SELECT id, name, relation, image_url, created_at FROM people WHERE user_id = $1 ORDER BY created_at DESC",
    [user.id]
  );

  return { people: people.rows };
});
