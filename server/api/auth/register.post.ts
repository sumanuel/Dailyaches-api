import { createError, readBody } from "h3";
import bcrypt from "bcryptjs";
import { query } from "../../db/query";
import { ensureUsersInfra } from "../../db/setup";
import { signAccessToken } from "../../auth/jwt";

type RegisterBody = {
  email?: string;
  password?: string;
  name?: string;
};

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as RegisterBody;
  const email = String(body.email || "")
    .trim()
    .toLowerCase();
  const password = String(body.password || "").trim();
  const name = body.name ? String(body.name).trim() : null;

  if (!email || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: "email and password are required",
    });
  }

  if (password.length < 6) {
    throw createError({
      statusCode: 400,
      statusMessage: "password must be at least 6 characters",
    });
  }

  await ensureUsersInfra();

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const result = await query<{
      id: number;
      email: string;
      name: string | null;
      role: string;
      is_active: boolean;
    }>(
      "insert into users (email, password_hash, name) values ($1, $2, $3) returning id, email, name, role, is_active",
      [email, passwordHash, name]
    );

    const user = result.rows[0];
    const token = signAccessToken({ sub: String(user.id), email: user.email });

    return { token, user };
  } catch (err: any) {
    console.error("Error registering user:", err);
    console.error("Error code:", err?.code);
    // 23505 = unique_violation
    if (err?.code === "23505") {
      throw createError({
        statusCode: 409,
        statusMessage: "Email already registered",
      });
    }
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to register user",
    });
  }
});
