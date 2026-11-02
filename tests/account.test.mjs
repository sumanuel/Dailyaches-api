import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { startApi } from "./helpers.mjs";

let api;
before(async () => {
  api = await startApi();
});
after(() => api?.stop());

const login = (email, password) =>
  api.request("POST", "/auth/login", { body: { email, password } });

const changePassword = (token, body) =>
  api.request("PUT", "/auth/password", { token, body });

describe("changing the password", () => {
  test("needs a token", async () => {
    const { status } = await api.request("PUT", "/auth/password", {
      body: { current_password: "a", new_password: "b" },
    });
    assert.equal(status, 401);
  });

  test("rejects missing, short and unchanged passwords with 400", async () => {
    const user = await api.seedUser();
    for (const body of [
      {},
      { current_password: user.password },
      { current_password: user.password, new_password: "abc" },
      { current_password: user.password, new_password: user.password },
      { current_password: 123, new_password: "newsecret" },
    ]) {
      const { status } = await changePassword(user.token, body);
      assert.equal(status, 400, JSON.stringify(body));
    }
  });

  test("answers 403, not 401, when the current password is wrong", async () => {
    const user = await api.seedUser();
    const { status } = await changePassword(user.token, {
      current_password: "wrong-password",
      new_password: "newsecret",
    });
    // A 401 would make the app log the user out.
    assert.equal(status, 403);
    assert.equal((await login(user.email, user.password)).status, 200);
  });

  test("swaps the password and closes older sessions", async () => {
    const user = await api.seedUser();
    const { status, body } = await changePassword(user.token, {
      current_password: user.password,
      new_password: "newsecret",
    });
    assert.equal(status, 200);
    assert.ok(body.token);

    assert.equal((await login(user.email, user.password)).status, 401, "old password");
    assert.equal((await login(user.email, "newsecret")).status, 200, "new password");

    const oldSession = await api.request("GET", "/auth/me", { token: user.token });
    assert.equal(oldSession.status, 401, "token from before the change");
    const thisDevice = await api.request("GET", "/auth/me", { token: body.token });
    assert.equal(thisDevice.status, 200, "fresh token keeps this device signed in");
  });

  test("keeps the data", async () => {
    const user = await api.seedUser();
    const changed = await changePassword(user.token, {
      current_password: user.password,
      new_password: "newsecret",
    });
    const people = await api.request("GET", "/people", { token: changed.body.token });
    assert.equal(people.body.people.length, 1);
  });
});

describe("deleting the account", () => {
  const deleteAccount = (token, body) =>
    api.request("DELETE", "/auth/account", { token, body });

  test("needs a token and a password", async () => {
    const user = await api.seedUser();
    assert.equal((await api.request("DELETE", "/auth/account", { body: { password: "x" } })).status, 401);
    assert.equal((await deleteAccount(user.token, {})).status, 400);
  });

  test("answers 403 for a wrong password and keeps everything", async () => {
    const user = await api.seedUser();
    const { status } = await deleteAccount(user.token, { password: "wrong-password" });
    assert.equal(status, 403);
    assert.equal((await login(user.email, user.password)).status, 200);
  });

  test("removes the account with its people, pain types and records", async () => {
    const user = await api.seedUser();
    await api.request("POST", "/records", {
      token: user.token,
      body: { person_id: user.personId, pain_type_id: user.painTypeId, pain_level: 4 },
    });

    const { status } = await deleteAccount(user.token, { password: user.password });
    assert.equal(status, 200);

    assert.equal((await login(user.email, user.password)).status, 401);
    assert.equal((await api.request("GET", "/auth/me", { token: user.token })).status, 401);
    const left = await api.sql(
      `select
         (select count(*)::int from users where email = $1) as users,
         (select count(*)::int from people where id = $2) as people,
         (select count(*)::int from pain_types where id = $3) as pain_types,
         (select count(*)::int from records where person_id = $2) as records`,
      [user.email, user.personId, user.painTypeId],
    );
    assert.deepEqual(left.rows[0], { users: 0, people: 0, pain_types: 0, records: 0 });
  });

  test("leaves other accounts alone", async () => {
    const mine = await api.seedUser();
    const other = await api.seedUser();
    await deleteAccount(mine.token, { password: mine.password });

    const people = await api.request("GET", "/people", { token: other.token });
    assert.equal(people.body.people.length, 1);
  });

  test("refuses to delete the only admin, but lets one of two go", async () => {
    // A fresh schema per run, so these two are the only admins unless made otherwise.
    const first = await api.seedUser();
    const second = await api.seedUser();
    await api.sql("update users set role = 'admin' where email = $1", [first.email]);

    const blocked = await deleteAccount(first.token, { password: first.password });
    assert.equal(blocked.status, 409);

    await api.sql("update users set role = 'admin' where email = $1", [second.email]);
    const allowed = await deleteAccount(first.token, { password: first.password });
    assert.equal(allowed.status, 200);
  });
});
