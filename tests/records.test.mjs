import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { startApi } from "./helpers.mjs";

let api;
before(async () => {
  api = await startApi();
});
after(() => api?.stop());

const createRecord = (user, extra = {}) =>
  api.request("POST", "/records", {
    token: user.token,
    body: { person_id: user.personId, pain_type_id: user.painTypeId, pain_level: 5, ...extra },
  });

describe("deleting a person", () => {
  test("takes their records with it instead of failing", async () => {
    const user = await api.seedUser();
    await createRecord(user);
    await createRecord(user);

    const removed = await api.request("DELETE", `/people/${user.personId}`, { token: user.token });
    assert.equal(removed.status, 200);

    const records = await api.request("GET", "/records", { token: user.token });
    assert.equal(records.body.records.length, 0);
  });

  test("leaves other people's records alone", async () => {
    const user = await api.seedUser();
    const other = await api.request("POST", "/people", { token: user.token, body: { name: "Otra" } });
    await createRecord(user);
    await createRecord({ ...user, personId: Number(other.body.person.id) });

    await api.request("DELETE", `/people/${user.personId}`, { token: user.token });

    const records = await api.request("GET", "/records", { token: user.token });
    assert.equal(records.body.records.length, 1);
    assert.equal(records.body.records[0].person_name, "Otra");
  });
});

describe("deleting a pain type", () => {
  test("is refused with 409 while records use it", async () => {
    const user = await api.seedUser();
    await createRecord(user);

    const removed = await api.request("DELETE", `/pain-types/${user.painTypeId}`, { token: user.token });
    assert.equal(removed.status, 409);

    const records = await api.request("GET", "/records", { token: user.token });
    assert.equal(records.body.records.length, 1);
  });
});

describe("created_at on a new record", () => {
  test("defaults to now", async () => {
    const user = await api.seedUser();
    const before = Date.now();
    const { body } = await createRecord(user);
    const created = Date.parse(body.record.created_at);
    assert.ok(created >= before - 5000 && created <= Date.now() + 5000);
  });

  test("accepts a past moment", async () => {
    const user = await api.seedUser();
    const when = "2026-01-15T08:30:00.000Z";
    const { status, body } = await createRecord(user, { created_at: when });
    assert.equal(status, 200);
    assert.equal(new Date(body.record.created_at).toISOString(), when);
  });

  test("rejects the future, nonsense and the distant past", async () => {
    const user = await api.seedUser();
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    for (const created_at of [tomorrow, "not a date", 12345, "1999-12-31T00:00:00Z"]) {
      const { status } = await createRecord(user, { created_at });
      assert.equal(status, 400, `created_at ${created_at}`);
    }
  });

  test("can be corrected afterwards", async () => {
    const user = await api.seedUser();
    const { body } = await createRecord(user);
    const when = "2026-02-01T12:00:00.000Z";
    const updated = await api.request("PUT", `/records/${body.record.id}`, {
      token: user.token,
      body: { created_at: when },
    });
    assert.equal(updated.status, 200);
    assert.equal(new Date(updated.body.record.created_at).toISOString(), when);
  });
});

describe("listing records", () => {
  const seedMany = async (user, count) => {
    for (let i = 0; i < count; i += 1) {
      const day = String(i + 1).padStart(2, "0");
      await createRecord(user, { created_at: `2026-03-${day}T10:00:00.000Z`, pain_level: (i % 10) + 1 });
    }
  };

  test("returns everything, newest first, when no limit is given", async () => {
    const user = await api.seedUser();
    await seedMany(user, 5);
    const { body } = await api.request("GET", "/records", { token: user.token });
    assert.equal(body.records.length, 5);
    assert.equal(body.total, 5);
    assert.equal(body.limit, null);
    const dates = body.records.map((r) => r.created_at);
    assert.deepEqual(dates, [...dates].sort().reverse());
  });

  test("pages with limit and offset and reports the total", async () => {
    const user = await api.seedUser();
    await seedMany(user, 5);

    const first = await api.request("GET", "/records?limit=2", { token: user.token });
    const second = await api.request("GET", "/records?limit=2&offset=2", { token: user.token });
    const last = await api.request("GET", "/records?limit=2&offset=4", { token: user.token });

    assert.equal(first.body.records.length, 2);
    assert.equal(first.body.total, 5);
    assert.equal(second.body.records.length, 2);
    assert.equal(last.body.records.length, 1);
    const ids = [...first.body.records, ...second.body.records, ...last.body.records].map((r) => r.id);
    assert.equal(new Set(ids).size, 5, "no record repeats across pages");
  });

  test("filters by date range (from inclusive, to exclusive)", async () => {
    const user = await api.seedUser();
    await seedMany(user, 5); // March 1st to 5th
    const { body } = await api.request(
      "GET",
      "/records?from=2026-03-02T00:00:00Z&to=2026-03-04T00:00:00Z",
      { token: user.token },
    );
    assert.equal(body.total, 2);
    assert.deepEqual(
      body.records.map((r) => new Date(r.created_at).getUTCDate()).sort(),
      [2, 3],
    );
  });

  test("filters by person and pain type", async () => {
    const user = await api.seedUser();
    const other = await api.request("POST", "/people", { token: user.token, body: { name: "Otra" } });
    const otherId = Number(other.body.person.id);
    await createRecord(user);
    await createRecord(user);
    await createRecord({ ...user, personId: otherId });

    const mine = await api.request("GET", `/records?person_id=${user.personId}`, { token: user.token });
    const theirs = await api.request("GET", `/records?person_id=${otherId}`, { token: user.token });
    const none = await api.request("GET", `/records?pain_type_id=${user.painTypeId + 9999}`, { token: user.token });
    assert.equal(mine.body.total, 2);
    assert.equal(theirs.body.total, 1);
    assert.equal(none.body.total, 0);
  });

  test("never shows another user's records", async () => {
    const a = await api.seedUser();
    const b = await api.seedUser();
    await createRecord(a);
    const { body } = await api.request("GET", "/records", { token: b.token });
    assert.equal(body.total, 0);
  });

  test("rejects bad parameters with 400", async () => {
    const user = await api.seedUser();
    for (const qs of ["limit=0", "limit=201", "limit=abc", "offset=2", "limit=5&offset=-1", "from=nope", "from=2026-03-04T00:00:00Z&to=2026-03-02T00:00:00Z", "person_id=x"]) {
      const { status } = await api.request("GET", `/records?${qs}`, { token: user.token });
      assert.equal(status, 400, qs);
    }
  });

  test("needs a token", async () => {
    const { status } = await api.request("GET", "/records");
    assert.equal(status, 401);
  });
});

describe("today's records", () => {
  const today = (user, tz) =>
    api.request("GET", `/records/today${tz ? `?tz=${encodeURIComponent(tz)}` : ""}`, { token: user.token });

  test("include the ones made now and leave out older days, in any time zone", async () => {
    const user = await api.seedUser();
    await createRecord(user);
    await createRecord(user, { created_at: new Date(Date.now() - 26 * 3600 * 1000).toISOString() });

    for (const tz of [undefined, "America/Mexico_City", "Pacific/Kiritimati", "Etc/GMT+12"]) {
      const { status, body } = await today(user, tz);
      assert.equal(status, 200, `tz ${tz}`);
      assert.equal(body.records.length, 1, `tz ${tz}`);
    }
  });

  test("refuse an unknown time zone", async () => {
    const user = await api.seedUser();
    assert.equal((await today(user, "Mars/Olympus")).status, 400);
  });
});
