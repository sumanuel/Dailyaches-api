import type { PoolClient } from "pg";
import { getPool } from "./pool";

// Runs `work` in one transaction: everything commits, or nothing does.
export async function withTransaction<T>(
  work: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    const result = await work(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
