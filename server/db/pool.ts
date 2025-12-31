import { createError } from "h3";
import pg from "pg";

const { Pool } = pg;

let pool: pg.Pool | undefined;

export function getPool() {
  if (pool) return pool;

  const config = useRuntimeConfig();
  const connectionString = config.postgresUrl;
  const schema = (config.dbSchema || "public").trim() || "public";

  if (connectionString) {
    pool = new Pool({
      connectionString,
      max: 10,
      options: `-c search_path=${schema},public`,
    });

    return pool;
  }

  const host = config.dbHost;
  const port = config.dbPort ? Number(config.dbPort) : 5432;
  const database = config.dbName;
  const user = config.dbUser;
  const password = config.dbPassword;

  if (!host || !database || !user) {
    throw createError({
      statusCode: 500,
      statusMessage:
        "Database is not configured (set POSTGRES_URL or DB_HOST/DB_NAME/DB_USER)",
    });
  }

  pool = new Pool({
    host,
    port,
    database,
    user,
    password,
    max: 10,
    options: `-c search_path=${schema},public`,
  });

  return pool;
}
