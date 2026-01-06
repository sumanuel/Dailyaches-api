import { query } from "./query";

function normalizeSchema(schema?: string) {
  const s = (schema || "public").trim();
  return s.length ? s : "public";
}

export async function ensureUsersInfra() {
  const config = useRuntimeConfig();
  const schema = normalizeSchema(config.dbSchema);

  console.log("Setting up database schema:", schema);

  // Create schema if not exists
  await query(`create schema if not exists "${schema.replace(/"/g, '""')}"`);

  // Ensure search_path for this session
  await query(`set search_path to "${schema.replace(/"/g, '""')}", public`);

  console.log("Creating users table if not exists...");
  await query(`
    create table if not exists users (
      id bigserial primary key,
      email text not null unique,
      password_hash text not null,
      name text null,
      phone text null,
      birth_date date null,
      role text not null default 'user',
      is_active boolean not null default true,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);

  console.log("Adding missing columns to users table...");
  // If the table existed from a previous version, ensure new columns exist
  try {
    await query(`
      do $$
      begin
        if not exists (select 1 from information_schema.columns where table_name = 'users' and column_name = 'role') then
          alter table users add column role text not null default 'user';
        end if;
        
        if not exists (select 1 from information_schema.columns where table_name = 'users' and column_name = 'is_active') then
          alter table users add column is_active boolean not null default true;
        end if;
        
        if not exists (select 1 from information_schema.columns where table_name = 'users' and column_name = 'phone') then
          alter table users add column phone text null;
        end if;
        
        if not exists (select 1 from information_schema.columns where table_name = 'users' and column_name = 'birth_date') then
          alter table users add column birth_date date null;
        end if;
      end
      $$;
    `);
    console.log("All missing columns added successfully");
  } catch (error) {
    console.error("Error adding columns:", error);
    throw error;
  }
}
