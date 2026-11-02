import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, describe, test } from "node:test";
import { startApi } from "./helpers.mjs";

// Values produced by the app's own rules (see generatedFrom inside), so the two
// sides cannot drift apart unnoticed.
const golden = JSON.parse(readFileSync(new URL("./progress-golden.json", import.meta.url), "utf8"));
const goldenAfter = (records) => golden.sequence[records - 1];

let api;
before(async () => {
  api = await startApi();
});
after(() => api?.stop());

const createRecord = (user) =>
  api.request("POST", "/records", {
    token: user.token,
    body: { person_id: user.personId, pain_type_id: user.painTypeId, pain_level: 5 },
  });

const getProgress = (user) => api.request("GET", "/progress", { token: user.token });
const claim = (user, id) =>
  api.request("POST", `/progress/achievements/${id}`, { token: user.token });

const unlockedIds = (progress) => progress.unlocked_achievements.map((a) => a.id).sort((a, b) => a - b);

const assertMatches = (progress, expected, label) => {
  assert.equal(progress.points, expected.points, `${label}: points`);
  assert.equal(progress.level, expected.level, `${label}: level`);
  assert.deepEqual(unlockedIds(progress), expected.unlocked, `${label}: achievements`);
};

describe("progress of a new account", () => {
  test("starts empty", async () => {
    const user = await api.seedUser();
    const { status, body } = await getProgress(user);
    assert.equal(status, 200);
    assert.deepEqual(body.progress, {
      points: 0,
      level: 1,
      records_count: 0,
      unlocked_achievements: [],
    });
  });

  test("needs a token", async () => {
    assert.equal((await api.request("GET", "/progress")).status, 401);
    assert.equal((await api.request("POST", "/progress/achievements/12")).status, 401);
  });
});

describe("recording pain", () => {
  test("returns the progress and matches the app's rules on every record", async () => {
    const user = await api.seedUser();
    for (let n = 1; n <= golden.sequence.length; n += 1) {
      const { status, body } = await createRecord(user);
      assert.equal(status, 200);
      assert.equal(body.progress.records_count, n);
      assertMatches(body.progress, goldenAfter(n), `after ${n} records`);
    }
    const stored = await getProgress(user);
    assertMatches(stored.body.progress, goldenAfter(golden.sequence.length), "stored");
  });

  test("keeps the record in the response", async () => {
    const user = await api.seedUser();
    const { body } = await createRecord(user);
    assert.ok(body.record.id);
    assert.equal(body.record.pain_level, 5);
  });

  test("counts parallel records without losing any", async () => {
    const user = await api.seedUser();
    const results = await Promise.all([1, 2, 3, 4, 5].map(() => createRecord(user)));
    assert.ok(results.every((r) => r.status === 200));

    const { body } = await getProgress(user);
    assert.equal(body.progress.records_count, 5);
    assertMatches(body.progress, goldenAfter(5), "five records in parallel");
  });

  test("does not take points away when a record is deleted", async () => {
    const user = await api.seedUser();
    const first = await createRecord(user);
    await createRecord(user);
    const before = (await getProgress(user)).body.progress;

    await api.request("DELETE", `/records/${first.body.record.id}`, { token: user.token });

    const after = (await getProgress(user)).body.progress;
    assert.equal(after.points, before.points);
    assert.equal(after.records_count, before.records_count);
  });

  test("keeps accounts apart", async () => {
    const a = await api.seedUser();
    const b = await api.seedUser();
    await createRecord(a);
    assert.equal((await getProgress(b)).body.progress.points, 0);
  });
});

describe("an account that already had records before progress existed", () => {
  const seedOldRecords = async (user, count) => {
    const { rows } = await api.sql("select id from users where email = $1", [user.email]);
    for (let i = 0; i < count; i += 1) {
      await api.sql(
        "insert into records (user_id, person_id, pain_type_id, pain_level) values ($1, $2, $3, 4)",
        [rows[0].id, user.personId, user.painTypeId],
      );
    }
  };

  test("starts from the records it has", async () => {
    const user = await api.seedUser();
    await seedOldRecords(user, 3);
    const { body } = await getProgress(user);
    assert.equal(body.progress.records_count, 3);
    assertMatches(body.progress, goldenAfter(3), "backfilled");
  });

  test("counts the next record on top, without counting it twice", async () => {
    const user = await api.seedUser();
    await seedOldRecords(user, 3);
    const { body } = await createRecord(user); // first contact is a new record
    assert.equal(body.progress.records_count, 4);
    assertMatches(body.progress, goldenAfter(4), "backfilled then one more");
  });
});

describe("claiming the sharing achievement", () => {
  test("gives its points once", async () => {
    const user = await api.seedUser();
    const first = await claim(user, 12);
    assert.equal(first.status, 200);
    assertMatches(first.body.progress, golden.shareFresh, "first claim");

    const second = await claim(user, 12);
    assert.equal(second.status, 200);
    assertMatches(second.body.progress, golden.shareFresh, "second claim");
  });

  test("on top of earlier progress, and the bonus can unlock more", async () => {
    const user = await api.seedUser();
    for (let i = 0; i < 3; i += 1) await createRecord(user);
    const { body } = await claim(user, 12);
    assertMatches(body.progress, golden.shareAfterThree, "share after three records");
  });

  test("refuses automatic, unknown and malformed ids", async () => {
    const user = await api.seedUser();
    assert.equal((await claim(user, 1)).status, 400, "automatic achievement");
    assert.equal((await claim(user, 999)).status, 404, "unknown id");
    assert.equal((await claim(user, "abc")).status, 400, "not a number");
    assert.equal((await getProgress(user)).body.progress.points, 0, "nothing was granted");
  });
});

describe("deleting the account", () => {
  test("removes its progress and achievements", async () => {
    const user = await api.seedUser();
    await createRecord(user);
    const { rows } = await api.sql("select id from users where email = $1", [user.email]);
    const userId = rows[0].id;

    const deleted = await api.request("DELETE", "/auth/account", {
      token: user.token,
      body: { password: user.password },
    });
    assert.equal(deleted.status, 200);

    const left = await api.sql(
      `select (select count(*)::int from user_progress where user_id = $1) as progress,
              (select count(*)::int from user_achievements where user_id = $1) as achievements`,
      [userId],
    );
    assert.deepEqual(left.rows[0], { progress: 0, achievements: 0 });
  });
});
