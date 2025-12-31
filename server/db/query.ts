import type { QueryResult, QueryResultRow } from "pg";
import { getPool } from "./pool";

export async function query<T extends QueryResultRow = any>(
  text: string,
  params: any[] = []
): Promise<QueryResult<T>> {
  const pool = getPool();
  return await pool.query<T>(text, params);
}
