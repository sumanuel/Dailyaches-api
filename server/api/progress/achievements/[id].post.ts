import { createError } from "h3";
import { getAuthUser } from "../../../auth/requireUser";
import { withTransaction } from "../../../db/transaction";
import { ACHIEVEMENTS } from "../../../utils/gamification";
import { unlockManualAchievement } from "../../../utils/progress";

// Claims an achievement that is not unlocked by the records alone (sharing
// happens in the app, so the app says so). Automatic ones cannot be claimed:
// the server unlocks them itself. Claiming twice changes nothing.
export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event);
  const raw = getRouterParam(event, "id") ?? "";
  const id = /^\d+$/.test(raw) ? Number(raw) : NaN;

  if (!Number.isSafeInteger(id)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid ID" });
  }
  const rule = ACHIEVEMENTS.find((entry) => entry.id === id);
  if (!rule) {
    throw createError({ statusCode: 404, statusMessage: "Achievement not found" });
  }
  if (!rule.manual) {
    throw createError({
      statusCode: 400,
      statusMessage: "This achievement unlocks automatically",
    });
  }

  const progress = await withTransaction((client) =>
    unlockManualAchievement(client, user.id, id)
  );
  return { progress };
});
