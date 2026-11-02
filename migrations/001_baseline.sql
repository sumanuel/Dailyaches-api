-- Baseline: the tables the API already used before migrations existed.
-- Everything is "if not exists", so it is safe on a database that has them.

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
);

create table if not exists people (
  id bigserial primary key,
  user_id bigint not null references users(id),
  name text not null,
  relation text,
  image_url text,
  phone text,
  whatsapp_enabled boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists pain_types (
  id bigserial primary key,
  user_id bigint not null references users(id),
  name text not null,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists records (
  id bigserial primary key,
  user_id bigint not null references users(id),
  person_id bigint not null references people(id),
  pain_type_id bigint not null references pain_types(id),
  pain_level integer not null check (pain_level >= 1 and pain_level <= 10),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
