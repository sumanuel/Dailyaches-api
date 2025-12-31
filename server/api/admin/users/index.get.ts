import { getQuery } from "h3";
import { getAdminUser } from "../../../auth/requireAdmin";
import { query } from "../../../db/query";
import { ensureUsersInfra } from "../../../db/setup";

export default defineEventHandler(async (event) => {
  await getAdminUser(event);
  await ensureUsersInfra();

  const q = getQuery(event);
  const limit = Math.min(Math.max(Number(q.limit || 20), 1), 100);
  const offset = Math.max(Number(q.offset || 0), 0);
  const search = (q.search ? String(q.search) : "").trim().toLowerCase();

  if (search) {
    const result = await query<{
      id: number;
      email: string;
      name: string | null;
      role: string;
      is_active: boolean;
      created_at: string;
      updated_at: string;
    }>(
      `select id, email, name, role, is_active, created_at, updated_at
       from users
       where lower(email) like $1 or lower(coalesce(name, '')) like $1
       order by id desc
       limit $2 offset $3`,
      [`%${search}%`, limit, offset]
    );

    return { items: result.rows, limit, offset };
  }

  const result = await query<{
    id: number;
    email: string;
    name: string | null;
    role: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  }>(
    `select id, email, name, role, is_active, created_at, updated_at
     from users
     order by id desc
     limit $1 offset $2`,
    [limit, offset]
  );

  return { items: result.rows, limit, offset };
});
