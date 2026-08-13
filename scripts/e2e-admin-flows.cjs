#!/usr/bin/env node
/**
 * End-to-end test bootstrap for admin API flows.
 *
 *   npm run test:e2e
 *
 * Steps:
 *   1. Start a throwaway Docker Postgres (ewp-test-pg).
 *   2. `prisma db push` + `prisma db seed` against it.
 *   3. Create a test ADMIN user (records its id to a temp env file).
 *   4. Start `next dev` on :3100 with JWT_SECRET set.
 *   5. Run vitest (tests/e2e) with TEST_API_URL + TEST_ADMIN_ID.
 *   6. Teardown: stop dev server, remove the Postgres container, remove temp files.
 */
const { spawnSync, spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const PORT = 3100;
const CONTAINER = "ewp-test-pg";
const PASSWORD = "ewp_test_pass";
const DB_URL = `postgresql://postgres:${PASSWORD}@localhost:5433/ewp_test`;
const JWT_SECRET = "test-only-jwt-secret-that-is-at-least-32-chars-long!!";

const project = path.resolve(__dirname, "..");
const tmpEnv = path.join(os.tmpdir(), `ewp-test-${process.pid}.env`);
const tmpVars = path.join(os.tmpdir(), `ewp-test-vars-${process.pid}.json`);

function run(cmd, args, opts = {}) {
  console.log(`\n> ${cmd} ${args.join(" ")}`);
  const resolved = process.platform === "win32" && cmd === "npx" ? "npx.cmd" : cmd;
  const r = spawnSync(resolved, args, {
    stdio: "inherit",
    cwd: project,
    shell: process.platform === "win32" && cmd === "npx",
    ...opts,
  });
  if (r.status !== 0) {
    console.error(`FAILED (${r.status}): ${cmd} ${args.join(" ")}`);
    process.exit(r.status ?? 1);
  }
}

function envForPrisma() {
  // Prisma CLI reads `.env`, not `.env.local`. Write a temp one for the test run.
  fs.writeFileSync(tmpEnv, `DATABASE_URL="${DB_URL}"\nDIRECT_URL="${DB_URL}"\nJWT_SECRET="${JWT_SECRET}"\n`);
}

async function createAdminUser() {
  const prisma = new PrismaClient({ datasourceUrl: DB_URL });
  try {
    const user = await prisma.user.upsert({
      where: { phone: "+00000000000" },
      update: { role: "ADMIN", isVerified: true },
      create: {
        phone: "+00000000000",
        name: "E2E Admin",
        email: "e2e-admin@example.com",
        role: "ADMIN",
        language: "en",
        isVerified: true,
      },
    });
    fs.writeFileSync(tmpVars, JSON.stringify({ adminId: user.id }));
    console.log(`\nADMIN user created: ${user.id}`);
  } finally {
    await prisma.$disconnect();
  }
}

function waitForServer(url, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      fetch(url)
        .then(() => resolve(true))
        .catch(() => {
          if (Date.now() - start > timeoutMs) reject(new Error(`server did not start at ${url}`));
          else setTimeout(tick, 1000);
        });
    };
    tick();
  });
}

function startDevServer() {
  // next dev reads .env.local by default; inject JWT_SECRET via the process env.
  // Next refuses to start a second dev server for the same project, so free the
  // port first in case an earlier run leaked a `next dev` child on Windows.
  freePort(PORT);
  const child = spawn("npm", ["run", "dev", "--", "-p", String(PORT)], {
    cwd: project,
    stdio: "pipe",
    env: { ...process.env, JWT_SECRET, DATABASE_URL: DB_URL, DIRECT_URL: DB_URL },
    shell: process.platform === "win32",
  });
  child.stdout?.on("data", (d) => process.stdout.write(`[dev] ${d}`));
  child.stderr?.on("data", (d) => process.stderr.write(`[dev-err] ${d}`));
  return child;
}

function freePort(port) {
  try {
    if (process.platform !== "win32") return;
    const out = spawnSync(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        `Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique`,
      ],
      { encoding: "utf8" },
    );
    const pid = Number((out.stdout ?? "").trim());
    if (pid) spawnSync("taskkill", ["/PID", String(pid), "/F"], { stdio: "ignore" });
  } catch {
    /* best effort */
  }
}

async function main() {
  const mode = process.argv[2] ?? "all";

  if (mode === "down") {
    spawnSync("docker", ["rm", "-f", CONTAINER], { stdio: "inherit" });
    for (const f of [tmpEnv, tmpVars]) if (fs.existsSync(f)) fs.unlinkSync(f);
    console.log("Teardown complete.");
    return;
  }

  console.log("== 1/6 Start Docker Postgres ==");
  spawnSync("docker", ["rm", "-f", CONTAINER], { stdio: "ignore" });
  run("docker", [
    "run", "-d", "--name", CONTAINER,
    "-e", `POSTGRES_PASSWORD=${PASSWORD}`,
    "-e", "POSTGRES_DB=ewp_test",
    "-p", "5433:5432",
    "postgres:16-alpine",
  ]);
  // Wait for Postgres to accept connections (probe the auto-created db).
  const prismaProbe = new PrismaClient({ datasourceUrl: DB_URL });
  let ready = false;
  for (let i = 0; i < 30; i++) {
    try { await prismaProbe.$queryRaw`SELECT 1`; ready = true; break; }
    catch { await new Promise((r) => setTimeout(r, 1000)); }
  }
  await prismaProbe.$disconnect();
  if (!ready) { console.error("Postgres did not become ready."); process.exit(1); }
  console.log("Postgres ready.");

  console.log("== 2/6 Push schema + seed ==");
  envForPrisma();
  // Temporarily point prisma at the test .env (it reads `.env`).
  const dotEnvPath = path.join(project, ".env");
  const hadEnv = fs.existsSync(dotEnvPath);
  if (hadEnv) fs.copyFileSync(dotEnvPath, `${dotEnvPath}.bak`);
  fs.copyFileSync(tmpEnv, dotEnvPath);
  try {
    run("npx", ["prisma", "db", "push", "--skip-generate"], { env: { ...process.env, DATABASE_URL: DB_URL, DIRECT_URL: DB_URL } });
    run("npx", ["prisma", "db", "seed"], { env: { ...process.env, DATABASE_URL: DB_URL, DIRECT_URL: DB_URL } });
  } finally {
    if (hadEnv) fs.renameSync(`${dotEnvPath}.bak`, dotEnvPath);
    else fs.unlinkSync(dotEnvPath);
  }

  console.log("== 3/6 Create ADMIN user ==");
  await createAdminUser();

  console.log("== 4/6 Start dev server ==");
  const server = startDevServer();
  try {
    await waitForServer(`http://localhost:${PORT}`);

    console.log("== 5/6 Run e2e tests ==");
    const vars = JSON.parse(fs.readFileSync(tmpVars, "utf8"));
    const r = spawnSync(process.platform === "win32" ? "npx.cmd" : "npx", ["vitest", "run", "tests/e2e"], {
      stdio: "inherit",
      cwd: project,
      shell: process.platform === "win32",
      env: {
        ...process.env,
        TEST_API_URL: `http://localhost:${PORT}`,
        TEST_ADMIN_ID: vars.adminId,
        JWT_SECRET,
      },
    });

    console.log("== 6/6 Teardown ==");
    killTree(server.pid);
    spawnSync("docker", ["rm", "-f", CONTAINER], { stdio: "ignore" });
    for (const f of [tmpEnv, tmpVars]) if (fs.existsSync(f)) fs.unlinkSync(f);

    process.exit(r.status ?? 1);
  } catch (e) {
    console.error(e);
    killTree(server.pid);
    spawnSync("docker", ["rm", "-f", CONTAINER], { stdio: "ignore" });
    for (const f of [tmpEnv, tmpVars]) if (fs.existsSync(f)) fs.unlinkSync(f);
    process.exit(1);
  }
}

function killTree(pid) {
  try {
    if (process.platform === "win32") {
      // taskkill /T kills the whole tree; plain .kill("SIGTERM") only stops the
      // cmd wrapper on Windows, leaving `next dev` holding the port.
      spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
    } else {
      try { process.kill(pid, "SIGTERM"); } catch { /* already gone */ }
    }
  } catch { /* already gone */ }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
