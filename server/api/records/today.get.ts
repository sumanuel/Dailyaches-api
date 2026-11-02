import { createError } from "h3";
import { getAuthUser } from "../../auth/requireUser";
import { query } from "../../db/query";

// "Today" depends on where the person is: `?tz=America/Mexico_City` picks the
// time zone, UTC when it is not sent.
const parseTimeZone = (raw: unknown) => {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === undefined) return "UTC";
  try {
    if (typeof value !== "string") throw new Error("not a string");
    new Intl.DateTimeFormat("en", { timeZone: value });
    return value;
  } catch {
    throw createError({ statusCode: 400, statusMessage: "tz must be an IANA time zone" });
  }
};

export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event);

  const timeZone = parseTimeZone(getQuery(event).tz);

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
    AND (r.created_at AT TIME ZONE $2)::date = (now() AT TIME ZONE $2)::date
    ORDER BY r.created_at DESC
  `,
    [user.id, timeZone]
  );

  return { records: records.rows };
});
