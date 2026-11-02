import type { PoolClient } from "pg";
import { ACHIEVEMENTS, POINTS_PER_RECORD, applyRules, levelFor } from "./gamification";

// Progress of one user, kept in user_progress and user_achievements. Every
// function takes the client of a transaction so a record and its points are
// saved together or not at all.

export type Progress = {
  points: number;
  level: number;
  records_count: number;
  unlocked_achievements: { id: number; unlocked_at: string }[];
};

type Counters = { points: number; records_count: number };

const readCounters = async (client: PoolClient, userId: number | string) =>
  (
    await client.query<Counters>(
      "select points, records_count from user_progress where user_id = $1",
      [userId]
    )
  ).rows[0];

const unlockedIds = async (client: PoolClient, userId: number | string) =>
  new Set(
    (
      await client.query<{ achievement_id: number }>(
        "select achievement_id from user_achievements where user_id = $1",
        [userId]
      )
    ).rows.map((row) => row.achievement_id)
  );

const saveUnlocked = async (client: PoolClient, userId: number | string, ids: number[]) => {
  for (const id of ids) {
    await client.query(
      "insert into user_achievements (user_id, achievement_id) values ($1, $2) on conflict do nothing",
      [userId, id]
    );
  }
};

const loadProgress = async (client: PoolClient, userId: number | string): Promise<Progress> => {
  const { points, records_count } = await readCounters(client, userId);
  const unlocked = await client.query<{ achievement_id: number; unlocked_at: Date }>(
    "select achievement_id, unlocked_at from user_achievements where user_id = $1 order by achievement_id",
    [userId]
  );
  return {
    points,
    level: levelFor(points),
    records_count,
    unlocked_achievements: unlocked.rows.map((entry) => ({
      id: entry.achievement_id,
      unlocked_at: entry.unlocked_at.toISOString(),
    })),
  };
};

// Makes sure the user has a progress row and locks it for this transaction.
// An account from before progress existed starts from the records it already
// has (10 points each, plus whatever achievements those unlock).
export async function lockProgress(client: PoolClient, userId: number | string) {
  const existing = await client.query("select 1 from user_progress where user_id = $1", [userId]);
  if (existing.rows.length === 0) {
    const count = (
      await client.query<{ total: number }>(
        "select count(*)::int as total from records where user_id = $1",
        [userId]
      )
    ).rows[0].total;
    const start = applyRules({
      points: count * POINTS_PER_RECORD,
      recordsCount: count,
      unlocked: new Set(),
    });
    const inserted = await client.query(
      "insert into user_progress (user_id, points, records_count) values ($1, $2, $3) on conflict do nothing",
      [userId, start.points, count]
    );
    // Only the request that created the row writes its achievements.
    if (inserted.rowCount === 1) await saveUnlocked(client, userId, start.newlyUnlocked);
  }
  await client.query("select 1 from user_progress where user_id = $1 for update", [userId]);
}

// Reads the progress, creating it first if needed.
export async function readProgress(client: PoolClient, userId: number | string) {
  await lockProgress(client, userId);
  return loadProgress(client, userId);
}

// One more record: +10 points and whatever it unlocks. Call lockProgress before
// inserting the record, so an account's first progress counts only older records.
export async function addRecordToProgress(client: PoolClient, userId: number | string) {
  await lockProgress(client, userId);
  const current = await readCounters(client, userId);
  const next = applyRules({
    points: current.points + POINTS_PER_RECORD,
    recordsCount: current.records_count + 1,
    unlocked: await unlockedIds(client, userId),
  });
  await client.query(
    "update user_progress set points = $1, records_count = $2, updated_at = now() where user_id = $3",
    [next.points, next.recordsCount, userId]
  );
  await saveUnlocked(client, userId, next.newlyUnlocked);
  return loadProgress(client, userId);
}

// Claims a manual achievement. Claiming it again changes nothing.
export async function unlockManualAchievement(
  client: PoolClient,
  userId: number | string,
  achievementId: number
) {
  await lockProgress(client, userId);
  const rule = ACHIEVEMENTS.find((entry) => entry.id === achievementId);
  const unlocked = await unlockedIds(client, userId);
  if (rule && !unlocked.has(achievementId)) {
    const current = await readCounters(client, userId);
    unlocked.add(achievementId);
    const next = applyRules({
      points: current.points + rule.points,
      recordsCount: current.records_count,
      unlocked,
    });
    await client.query(
      "update user_progress set points = $1, updated_at = now() where user_id = $2",
      [next.points, userId]
    );
    await saveUnlocked(client, userId, [achievementId, ...next.newlyUnlocked]);
  }
  return loadProgress(client, userId);
}
