import { createError, readBody } from "h3";
import bcrypt from "bcryptjs";
import { getAuthUser } from "../../auth/requireUser";
import { query } from "../../db/query";
import { withTransaction } from "../../db/transaction";

// Deletes the signed-in account and everything it owns. Needs the password, so
// a stolen token alone cannot wipe the data. Same 403 rule as the password change.
export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event);
  const body = ((await readBody(event)) || {}) as { password?: unknown };
  const password = typeof body.password === "string" ? body.password.trim() : "";

  if (!password) {
    throw createError({ statusCode: 400, statusMessage: "password is required" });
  }

  const row = await query<{ password_hash: string }>(
    "select password_hash from users where id = $1",
    [user.id]
  );
  if (!(await bcrypt.compare(password, row.rows[0].password_hash))) {
    throw createError({ statusCode: 403, statusMessage: "Password is incorrect" });
  }

  if (user.role === "admin") {
    const others = await query<{ count: number }>(
      "select count(*)::int as count from users where role = 'admin' and is_active and id <> $1",
      [user.id]
    );
    if (others.rows[0].count === 0) {
      throw createError({
        statusCode: 409,
        statusMessage: "Cannot delete the only admin account",
      });
    }
  }

  await withTransaction(async (client) => {
    await client.query("delete from records where user_id = $1", [user.id]);
    await client.query("delete from people where user_id = $1", [user.id]);
    await client.query("delete from pain_types where user_id = $1", [user.id]);
    await client.query("delete from users where id = $1", [user.id]);
  });

  return { success: true };
});
