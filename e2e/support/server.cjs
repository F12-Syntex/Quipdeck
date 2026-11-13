/* eslint-disable @typescript-eslint/no-require-imports */
"use strict";
/*
 * Build once, start `next start` on a free port, tear down (P1-6, D-TEST-1).
 *   const { startServer } = require("./support/server.cjs");
 *   const server = await startServer();   // { url, stop() }
 * Set E2E_SKIP_BUILD=1 to reuse an existing `.next` build.
 */
const { spawn, spawnSync } = require("node:child_process");
const net = require("node:net");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");

const ROOT = path.resolve(__dirname, "..", "..");

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

/*
 * `node --test` runs the test files as parallel child processes. They share
 * one runner parent (process.ppid), which keys two cross-process helpers:
 *   - a build lock, so `npm run build` runs once per run, not once per file;
 *   - a slot semaphore (E2E_SLOTS, default 2), so timing-sensitive browser
 *     tests do not fight over the CPU.
 * A lock whose owner pid is dead is taken over.
 */
const RUN_KEY = String(process.env.E2E_RUN_KEY || process.ppid);
const LOCK_ROOT = path.join(os.tmpdir(), "quipdeck-e2e-" + RUN_KEY);

function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Take an exclusive directory lock; returns a release function. */
async function lock(name, timeoutMs) {
  fs.mkdirSync(LOCK_ROOT, { recursive: true });
  const dir = path.join(LOCK_ROOT, name);
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      fs.mkdirSync(dir);
      fs.writeFileSync(path.join(dir, "pid"), String(process.pid));
      return () => fs.rmSync(dir, { recursive: true, force: true });
    } catch (err) {
      if (err.code !== "EEXIST") throw err;
      let owner = 0;
      try {
        owner = Number(fs.readFileSync(path.join(dir, "pid"), "utf8"));
      } catch {}
      if (owner && !alive(owner)) {
        fs.rmSync(dir, { recursive: true, force: true });
        continue;
      }
      if (Date.now() > deadline) throw new Error("timed out waiting for lock " + name);
      await sleep(250);
    }
  }
}

function newestMtime(dir) {
  let newest = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const t = entry.isDirectory() ? newestMtime(full) : fs.statSync(full).mtimeMs;
    if (t > newest) newest = t;
  }
  return newest;
}

async function build() {
  if (process.env.E2E_SKIP_BUILD === "1") return;
  const release = await lock("build", 600000);
  try {
    const done = path.join(LOCK_ROOT, "built");
    if (fs.existsSync(done) && fs.statSync(done).mtimeMs >= newestMtime(path.join(ROOT, "src"))) return;
    const res = spawnSync("npm", ["run", "build"], {
      cwd: ROOT,
      stdio: "inherit",
      env: process.env,
    });
    if (res.status !== 0) throw new Error("npm run build failed");
    fs.writeFileSync(done, "1");
  } finally {
    release();
  }
}

async function takeSlot() {
  const slots = Math.max(1, Number(process.env.E2E_SLOTS) || 2);
  const deadline = Date.now() + 1800000;
  for (;;) {
    for (let i = 0; i < slots; i++) {
      try {
        return await lock("slot-" + i, 0);
      } catch {}
    }
    if (Date.now() > deadline) throw new Error("timed out waiting for an e2e slot");
    await sleep(500);
  }
}

async function waitForHttp(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let last;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return;
      last = new Error("status " + res.status);
    } catch (err) {
      last = err;
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("server did not start: " + (last && last.message));
}

async function startServer() {
  await build();
  const releaseSlot = await takeSlot();
  const port = await freePort();
  const child = spawn(
    process.execPath,
    [require.resolve("next/dist/bin/next", { paths: [ROOT] }), "start", "-p", String(port), "-H", "127.0.0.1"],
    { cwd: ROOT, stdio: ["ignore", "inherit", "inherit"], env: { ...process.env, NODE_ENV: "production" } },
  );
  const url = `http://127.0.0.1:${port}`;
  const stop = () =>
    new Promise((resolve) => {
      const finish = () => {
        releaseSlot();
        resolve();
      };
      if (child.exitCode !== null) return finish();
      child.once("exit", finish);
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 3000).unref();
    });
  try {
    await waitForHttp(url + "/", 30000);
  } catch (err) {
    await stop();
    throw err;
  }
  return { url, stop };
}

module.exports = { startServer };
