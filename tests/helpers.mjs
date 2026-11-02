// Integration-test support: a throwaway schema (dailyaches_test) in the same
// database, migrated from scratch, and the API running against it. Your real
// data in dailyaches_api is never touched.
// Stop `npm run dev` before running the tests: both would share the .nuxt folder.
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { migrate } from "../scripts/migrate.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const TEST_SCHEMA = "dailyaches_test";
const PORT = 3199;
const BASE = `http://127.0.0.1:${PORT}/api`;

const loadEnv = () => {
  const envFile = join(root, ".env");
  if (existsSync(envFile)) process.loadEnvFile(envFile);
};

const resetSchema = async () => {
  const pool = new pg.Pool({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || "daily-aches",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD,
    max: 1,
  });
  try {
    await pool.query(`drop schema if exists ${TEST_SCHEMA} cascade`);
  } finally {
    await pool.end();
  }
  await migrate({ schema: TEST_SCHEMA });
};

const waitForHealth = async (child, timeoutMs) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error("The API exited before it was ready");
    try {
      const response = await fetch(`${BASE}/health`);
      if (response.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("The API did not answer /api/health in time");
};

export async function startApi() {
  loadEnv();
  await resetSchema();

  const child = spawn(
    process.execPath,
    [join(root, "node_modules/nuxt/bin/nuxt.mjs"), "dev", "--host", "127.0.0.1", "--port", String(PORT)],
    {
      cwd: root,
      env: { ...process.env, DB_SCHEMA: TEST_SCHEMA, NUXT_IGNORE_LOCK: "1" },
      stdio: "ignore",
    },
  );
  await waitForHealth(child, 120_000);

  const request = async (method, path, { token, body } = {}) => {
    const response = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    return { status: response.status, body: data };
  };

  let counter = 0;
  // A new account with one person and one pain type, ready to record against.
  const seedUser = async () => {
    counter += 1;
    const email = `test.${Date.now()}.${counter}@example.test`;
    const register = await request("POST", "/auth/register", {
      body: { email, password: "secret123", name: "Prueba" },
    });
    const token = register.body.token;
    const person = await request("POST", "/people", { token, body: { name: "Persona" } });
    const painType = await request("POST", "/pain-types", {
      token,
      body: { name: "Cabeza", image_url: "DolorDeCabeza.png" },
    });
    return {
      token,
      personId: Number(person.body.person.id),
      painTypeId: Number(painType.body.painType.id),
    };
  };

  const stop = () => {
    if (child.exitCode !== null) return;
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"]);
    } else {
      child.kill();
    }
  };

  return { request, seedUser, stop };
}
