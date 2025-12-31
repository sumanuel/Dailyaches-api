import { createError, readBody } from "h3";
import bcrypt from "bcryptjs";
import { query } from "../../db/query";
import { ensureUsersInfra } from "../../db/setup";
import { signAccessToken } from "../../auth/jwt";

type LoginBody = {
  email?: string;
  password?: string;
};

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as LoginBody;
  const email = (body.email || "").trim().toLowerCase();
  const password = (body.password || "").trim();

  if (!email || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: "email and password are required",
    });
  }

  await ensureUsersInfra();

  const result = await query<{
    id: number;
    email: string;
    name: string | null;
    password_hash: string;
    role: string;
    is_active: boolean;
  }>(
    "select id, email, name, password_hash, role, is_active from users where email = $1",
    [email]
  );

  const userRow = result.rows[0];
  if (!userRow) {
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid credentials",
    });
  }

  if (!userRow.is_active) {
    throw createError({ statusCode: 403, statusMessage: "User is disabled" });
  }

  const ok = await bcrypt.compare(password, userRow.password_hash);
  if (!ok) {
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid credentials",
    });
  }

  const token = signAccessToken({
    sub: String(userRow.id),
    email: userRow.email,
  });

  return {
    token,
    user: {
      id: userRow.id,
      email: userRow.email,
      name: userRow.name,
      role: userRow.role,
      is_active: userRow.is_active,
    },
  };
});
