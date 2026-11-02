-- Deleting a person used to fail with a 500 while they still had records
-- (the foreign key had no cascade). Their records now go with them.
-- Pain types keep the opposite rule on purpose: the API answers 409 while
-- records use them, so nobody loses history by deleting a type.

alter table records drop constraint if exists records_person_id_fkey;
alter table records
  add constraint records_person_id_fkey
  foreign key (person_id) references people(id) on delete cascade;

-- Listing is always "this user's records, newest first".
create index if not exists records_user_created_idx
  on records (user_id, created_at desc, id desc);
