import { getAuthUser } from "../../auth/requireUser";
import { withTransaction } from "../../db/transaction";
import { readProgress } from "../../utils/progress";

// Points, level, records counted and the achievements unlocked. The first call
// of an account that predates progress builds it from the records it has.
export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event);
  const progress = await withTransaction((client) => readProgress(client, user.id));
  return { progress };
});
