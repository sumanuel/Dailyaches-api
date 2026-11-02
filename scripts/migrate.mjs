// Applies the SQL files in migrations/ that have not run yet, in name order,
// each in its own transaction. Usage: npm run migrate
// The schema comes from DB_SCHEMA (default dailyaches_api) and the connection
// from the same DB_* variables as the API, read from .env when present.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATIONS_DIR = join(root, "migrations");

const quote = (identifier) => `"${String(identifier).replace(/"/g, '""')}"`;

export const listMigrations = () =>
  readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort();

// Returns the names of the migrations it applied.
export async function migrate({ schema, log = () => {} } = {}) {
  const envFile = join(root, ".env");
  if (existsSync(envFile)) process.loadEnvFile(envFile);

  const targetSchema = (schema || process.env.DB_SCHEMA || "dailyaches_api").trim();
  const pool = new pg.Pool({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || "daily-aches",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD,
    max: 1,
  });

  const client = await pool.connect();
  const applied = [];
  try {
    await client.query(`create schema if not exists ${quote(targetSchema)}`);
    await client.query(`set search_path to ${quote(targetSchema)}, public`);
    await client.query(`
      create table if not exists schema_migrations (
        name text primary key,
        applied_at timestamptz not null default now()
      )
    `);

    const done = new Set(
      (await client.query("select name from schema_migrations")).rows.map(
        (row) => row.name,
      ),
    );

    for (const file of listMigrations()) {
      if (done.has(file)) continue;
      log(`Applying ${file}`);
      await client.query("begin");
      try {
        await client.query(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
        await client.query("insert into schema_migrations (name) values ($1)", [file]);
        await client.query("commit");
        applied.push(file);
      } catch (error) {
        await client.query("rollback");
        throw new Error(`Migration ${file} failed: ${error.message}`);
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
  return applied;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  migrate({ log: console.log })
    .then((applied) =>
      console.log(applied.length ? `Done: ${applied.length} applied` : "Nothing to apply"),
    )
    .catch((error) => {
      console.error(error.message);
      process.exit(1);
    });
}
