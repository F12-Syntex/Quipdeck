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

function build() {
  if (process.env.E2E_SKIP_BUILD === "1") return;
  const res = spawnSync("npm", ["run", "build"], {
    cwd: ROOT,
    stdio: "inherit",
    env: process.env,
  });
  if (res.status !== 0) throw new Error("npm run build failed");
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
  build();
  const port = await freePort();
  const child = spawn(
    process.execPath,
    [require.resolve("next/dist/bin/next", { paths: [ROOT] }), "start", "-p", String(port), "-H", "127.0.0.1"],
    { cwd: ROOT, stdio: ["ignore", "inherit", "inherit"], env: { ...process.env, NODE_ENV: "production" } },
  );
  const url = `http://127.0.0.1:${port}`;
  const stop = () =>
    new Promise((resolve) => {
      if (child.exitCode !== null) return resolve();
      child.once("exit", () => resolve());
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
