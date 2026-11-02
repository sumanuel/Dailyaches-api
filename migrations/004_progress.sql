-- Points and achievements live on the server, so a new device or a reinstall
-- shows the same progress. The level is derived from the points, not stored.
-- Both tables go when the account does.

create table if not exists user_progress (
  user_id bigint primary key references users(id) on delete cascade,
  points integer not null default 0 check (points >= 0),
  -- Records ever created: it does not go down when a record is deleted, like
  -- the points (progress only grows).
  records_count integer not null default 0 check (records_count >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists user_achievements (
  user_id bigint not null references users(id) on delete cascade,
  achievement_id integer not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);
