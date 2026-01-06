import { getAuthUser } from "../../auth/requireUser";
import { query } from "../../db/query";

export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event);

  const records = await query(
    `
    SELECT
      r.id,
      r.person_id,
      r.pain_type_id,
      r.pain_level,
      r.notes,
      r.created_at,
      p.name as person_name,
      pt.name as pain_type_name,
      pt.image_url as pain_type_image
    FROM records r
    JOIN people p ON r.person_id = p.id
    JOIN pain_types pt ON r.pain_type_id = pt.id
    WHERE r.user_id = $1
    ORDER BY r.created_at DESC
  `,
    [user.id]
  );

  return { records: records.rows };
});
