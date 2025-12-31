import { query } from "./query";

function normalizeSchema(schema?: string) {
  const s = (schema || "public").trim();
  return s.length ? s : "public";
}

export async function ensureUsersInfra() {
  const config = useRuntimeConfig();
  const schema = normalizeSchema(config.dbSchema);

  // Create schema if not exists
  await query(`create schema if not exists "${schema.replace(/"/g, '""')}"`);

  // Ensure search_path for this session
  await query(`set search_path to "${schema.replace(/"/g, '""')}", public`);

  await query(`
    create table if not exists users (
      id bigserial primary key,
      email text not null unique,
      password_hash text not null,
      name text null,
      role text not null default 'user',
      is_active boolean not null default true,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);

  // If the table existed from a previous version, ensure new columns exist
  await query(
    `alter table users add column if not exists role text not null default 'user'`
  );
  await query(
    `alter table users add column if not exists is_active boolean not null default true`
  );
}
