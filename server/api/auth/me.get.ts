import { getAuthUser } from "../../auth/requireUser";

export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event);
  return { user };
});
