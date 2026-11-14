/* eslint-disable @typescript-eslint/no-require-imports */
"use strict";
/*
 * One place that wires the YouTube stub into a Playwright page (D-TEST-2),
 * used by the e2e harness, the a11y suite and the gate screenshots:
 *   - every `/embed/` request gets a blank page (nothing reaches YouTube);
 *   - `iframe_api` is served from yt-stub.js (unless `stub: false`);
 *   - `/__yt-stub/still/<videoId>.jpg` is served from fixtures/, so the stub
 *     player paints a real still of the clip instead of a grey slab. The
 *     stills are YouTube thumbnails of the seed videos (Blender Foundation
 *     open movies, CC-BY, and the YouTube IFrame API demo video), saved
 *     locally: tests never request i.ytimg.com (CL-20 checks). An id with
 *     no still gets a black pixel.
 */
const fs = require("node:fs");
const path = require("node:path");

const STUB = path.join(__dirname, "yt-stub.js");
const FIXTURES = path.join(__dirname, "fixtures");
const BLACK_GIF = Buffer.from("R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==", "base64");

async function routeYouTube(page, { stub = true } = {}) {
  await page.route("**/embed/**", (r) =>
    r.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>blank</title>" }),
  );
  if (stub) {
    await page.route("**/iframe_api", (r) => r.fulfill({ path: STUB, contentType: "text/javascript" }));
  }
  await page.route("**/__yt-stub/still/*", (r) => {
    const name = path.basename(new URL(r.request().url()).pathname);
    const file = path.join(FIXTURES, name);
    if (/^[\w-]+\.jpg$/.test(name) && fs.existsSync(file)) {
      return r.fulfill({ path: file, contentType: "image/jpeg" });
    }
    // No still for this id (the seeded broken clip): a black pixel, not a
    // 404, so the page logs no resource error (SV-5, SV-6, R-1 check logs).
    return r.fulfill({ status: 200, contentType: "image/gif", body: BLACK_GIF });
  });
}

module.exports = { routeYouTube, STUB, FIXTURES };
