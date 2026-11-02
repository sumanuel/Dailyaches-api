-- When the password last changed. Tokens issued before that moment stop
-- working, so changing the password closes the session on other devices.
alter table users add column if not exists password_changed_at timestamptz null;
