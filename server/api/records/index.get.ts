import { getAuthUser } from "../../auth/requireUser";
import { query } from "../../db/query";

export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event);
  const filter = parseRecordsQuery(getQuery(event));
  const { where, params } = buildRecordsWhere(user.id, filter);

  // Joins are inner on NOT NULL foreign keys, so counting records alone
  // gives the same total.
  const totalResult = await query<{ total: number }>(
    `SELECT COUNT(*)::int AS total FROM records r WHERE ${where}`,
    params
  );

  const pageParams = [...params];
  let paging = "";
  if (filter.limit !== undefined) {
    pageParams.push(filter.limit, filter.offset);
    paging = `LIMIT $${pageParams.length - 1} OFFSET $${pageParams.length}`;
  }

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
    WHERE ${where}
    ORDER BY r.created_at DESC, r.id DESC
    ${paging}
  `,
    pageParams
  );

  return {
    records: records.rows,
    total: totalResult.rows[0].total,
    limit: filter.limit ?? null,
    offset: filter.offset,
  };
});
