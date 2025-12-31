import { createError } from "h3";
import { getAuthUser } from "./requireUser";

export async function getAdminUser(event: any) {
  const user = await getAuthUser(event);
  if (String(user.role).toLowerCase() !== "admin") {
    throw createError({ statusCode: 403, statusMessage: "Admin only" });
  }
  return user;
}
