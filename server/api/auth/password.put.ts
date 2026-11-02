import { createError, readBody } from "h3";
import bcrypt from "bcryptjs";
import { getAuthUser } from "../../auth/requireUser";
import { signAccessToken } from "../../auth/jwt";
import { query } from "../../db/query";

type PasswordBody = {
  current_password?: unknown;
  new_password?: unknown;
};

// Changes the password of the signed-in user. Other sessions are closed (their
// tokens predate password_changed_at); the response carries a fresh token for
// this device. A wrong current password is a 403, not a 401: a 401 makes the
// app think the session expired and log out.
export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event);
  const body = ((await readBody(event)) || {}) as PasswordBody;

  // Login and register trim the password, so it is trimmed here too.
  const current = typeof body.current_password === "string" ? body.current_password.trim() : "";
  const next = typeof body.new_password === "string" ? body.new_password.trim() : "";

  if (!current || !next) {
    throw createError({
      statusCode: 400,
      statusMessage: "current_password and new_password are required",
    });
  }
  if (next.length < 6) {
    throw createError({
      statusCode: 400,
      statusMessage: "password must be at least 6 characters",
    });
  }
  if (next === current) {
    throw createError({
      statusCode: 400,
      statusMessage: "new password must be different from the current one",
    });
  }

  const row = await query<{ password_hash: string }>(
    "select password_hash from users where id = $1",
    [user.id]
  );
  if (!(await bcrypt.compare(current, row.rows[0].password_hash))) {
    throw createError({
      statusCode: 403,
      statusMessage: "Current password is incorrect",
    });
  }

  // Stamped by the app, not the database: the same value goes into the new token.
  const changedAt = new Date();
  await query(
    "update users set password_hash = $1, password_changed_at = $2, updated_at = now() where id = $3",
    [await bcrypt.hash(next, 10), changedAt, user.id]
  );

  return {
    success: true,
    token: signAccessToken({
      sub: String(user.id),
      email: user.email,
      pca: changedAt.getTime(),
    }),
  };
});
