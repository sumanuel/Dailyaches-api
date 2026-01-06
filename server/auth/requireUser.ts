import { createError, defineEventHandler, getHeader } from "h3";
import { query } from "../db/query";
import { ensureUsersInfra } from "../db/setup";
import { verifyAccessToken } from "./jwt";

export type AuthUser = {
  id: number;
  email: string;
  name: string | null;
  phone: string | null;
  birth_date: string | null;
  role: string;
  is_active: boolean;
};

export async function getAuthUser(event: any): Promise<AuthUser> {
  const authHeader = getHeader(event, "authorization");
  if (!authHeader) {
    throw createError({
      statusCode: 401,
      statusMessage: "Missing Authorization header",
    });
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid Authorization header",
    });
  }

  const token = match[1];
  const payload = verifyAccessToken(token);

  await ensureUsersInfra();
  const result = await query<AuthUser>(
    "select id, email, name, phone, birth_date, role, is_active from users where id = $1",
    [Number(payload.sub)]
  );

  const user = result.rows[0];
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: "User not found" });
  }

  if (!user.is_active) {
    throw createError({ statusCode: 403, statusMessage: "User is disabled" });
  }

  return user;
}

export const requireUser = defineEventHandler(async (event) => {
  return await getAuthUser(event);
});
