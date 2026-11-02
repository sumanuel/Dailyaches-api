// The game rules. They mirror utils/gamification.js in the app (levels,
// achievement rules and points); tests/progress.test.mjs holds values taken
// from there so a drift in either side shows up.

export const POINTS_PER_RECORD = 10;

export const LEVELS = [
  { level: 1, pointsRequired: 0 },
  { level: 2, pointsRequired: 40 },
  { level: 3, pointsRequired: 95 },
  { level: 4, pointsRequired: 170 },
  { level: 5, pointsRequired: 270 },
  { level: 6, pointsRequired: 395 },
  { level: 7, pointsRequired: 545 },
  { level: 8, pointsRequired: 725 },
  { level: 9, pointsRequired: 935 },
  { level: 10, pointsRequired: 1180 },
];

// `records` / `level` unlock automatically; `manual` ones are claimed through
// POST /api/progress/achievements/:id (sharing happens in the app).
export type AchievementRule = {
  id: number;
  points: number;
  records?: number;
  level?: number;
  manual?: boolean;
};

export const ACHIEVEMENTS: AchievementRule[] = [
  { id: 1, points: 15, records: 1 },
  { id: 2, points: 20, records: 3 },
  { id: 3, points: 30, records: 5 },
  { id: 4, points: 45, records: 10 },
  { id: 5, points: 70, records: 20 },
  { id: 6, points: 110, records: 40 },
  { id: 7, points: 20, level: 2 },
  { id: 8, points: 45, level: 4 },
  { id: 9, points: 70, level: 6 },
  { id: 10, points: 100, level: 8 },
  { id: 11, points: 160, level: 10 },
  { id: 12, points: 30, manual: true },
];

export const levelFor = (points: number) => {
  let current = LEVELS[0].level;
  for (const entry of LEVELS) {
    if (points >= entry.pointsRequired) current = entry.level;
  }
  return current;
};

export type ProgressState = {
  points: number;
  recordsCount: number;
  unlocked: Set<number>;
};

// Unlocks every automatic achievement the state qualifies for. A bonus can
// raise the level and so unlock the next one, hence the loop. Returns the new
// state and the ids unlocked by this call.
export function applyRules(state: ProgressState) {
  const unlocked = new Set(state.unlocked);
  let points = state.points;
  const newlyUnlocked: number[] = [];
  let changed = true;

  while (changed) {
    changed = false;
    const level = levelFor(points);
    for (const rule of ACHIEVEMENTS) {
      if (rule.manual || unlocked.has(rule.id)) continue;
      const byRecords = rule.records !== undefined && state.recordsCount >= rule.records;
      const byLevel = rule.level !== undefined && level >= rule.level;
      if (byRecords || byLevel) {
        unlocked.add(rule.id);
        points += rule.points;
        newlyUnlocked.push(rule.id);
        changed = true;
      }
    }
  }

  return { points, recordsCount: state.recordsCount, unlocked, newlyUnlocked };
}
