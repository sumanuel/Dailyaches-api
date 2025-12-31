import { query } from "../db/query";

export default defineEventHandler(async () => {
  const result = await query<{ ok: number }>("select 1 as ok");

  return {
    status: "ok",
    db: result.rows?.[0] ?? null,
  };
});
