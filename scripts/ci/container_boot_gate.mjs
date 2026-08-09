#!/usr/bin/env node
/**
 * container_boot_gate — the rung this repo's evidence ladder was missing.
 *
 *   A test proves the code works. A build chunk proves it ships.
 *   ONLY A BOOT PROVES IT RUNS.
 *
 * ★★ WHAT THIS GATE DOES AND DOES NOT CATCH — read this before advertising it.
 *
 * An EXECUTED PASS is scoped to the environment that executed it. Every other gate in
 * this repo runs in a dev worktree where the whole pnpm workspace resolves, so nothing
 * here could previously see the DEPLOYED IMAGE at all. This gate builds that image and
 * boots it. That is its whole and only unique claim.
 *
 * It was commissioned against three sightings. It catches ONE of them, and the scope is
 * stated here rather than implied, because a guard advertised as catching three classes
 * while catching one is a silent no-op wearing a better suit.
 *
 *   SIGHTING 1 — `tsx` undeclared in lazytopper/. NOT CAUGHT BY A BOOT, and it is not a
 *     boot crash. artifacts/api-server/src/index.ts schedules the warmup child on a
 *     45_000 ms setTimeout (WARMUP_INITIAL_DELAY_MS), runWarmup() returns early unless
 *     DATABASE_URL is set, and the spawn failure path is `child.on("error") -> logger.error`
 *     with NO process.exit. A container that boots green is therefore consistent with tsx
 *     being entirely absent. It IS caught, in CI, by
 *     lazytopper/server/spawnedLoaderResolution.test.cjs (in `lazytopper test:matrix:all`).
 *     This gate adds the IMAGE-ENVIRONMENT variant of that probe below, which is the part
 *     a dev-worktree test genuinely cannot make: `resolves-in-a-worktree` is not
 *     `resolves-in-the-image`.
 *
 *   SIGHTING 2 — unguarded `require('typescript')` at lazytopper/server/index.cjs:4 while
 *     firebase-admin sits in a try/catch below it. `typescript` is a devDependency, so the
 *     instinct is that it cannot be there at runtime. IT IS THERE. The Dockerfile installs
 *     devDependencies and DELIBERATELY does not prune ("We deliberately do NOT run
 *     `--prod` / prune: pruning typescript here would break the gateway"), and
 *     `ENV NODE_ENV=production` is set AFTER the install, so pnpm does not skip devDeps.
 *     A booting container is therefore GREEN on this today, CORRECTLY. What this gate
 *     buys is the LATENT form: the day someone adds a prune, moves that ENV line above
 *     the install, or drops the package, the boot goes red. That is the one sighting this
 *     gate converts from "read during triage" into "checked every time".
 *
 *   SIGHTING 3 — accountExport.test.cjs failing in a BARE WORKTREE. Not an image property
 *     at all; it is a property of a checkout with no node_modules. NOT CAUGHT, and it
 *     should not be — the image always has an install.
 *
 * ★ WHY THE GATEWAY'S READY LINE IS THE CHILD'S, NOT THE PARENT'S. The parent logs
 *   "AI Gateway started" IMMEDIATELY AFTER `spawn()` returns — it proves the spawn call
 *   did not throw, NOT that the gateway booted. MOUNT != LIVE. The load-bearing line is
 *   the one the CHILD prints from inside its own listen callback,
 *   `LazyTopper AI server running on port <n>` (lazytopper/server/index.cjs), piped up
 *   through the parent's logger. Asserting only the parent's line would bake the very
 *   confusion this project keeps paying for into the gate itself.
 *
 * Usage:
 *   node scripts/ci/container_boot_gate.mjs --classify
 *   node scripts/ci/container_boot_gate.mjs --assert --log <file> --url <base>
 */

import fs from "node:fs";
import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f) => {
  const i = args.indexOf(f);
  return i === -1 ? undefined : args[i + 1];
};

/* ══════════════════════════════════════════════════════════════════════════════
   1 · CLASSIFY — is this change set capable of moving the image?
   ══════════════════════════════════════════════════════════════════════════════ */

/**
 * Paths that can change what the image contains or how it boots.
 *
 * ★ FAIL OPEN, ALWAYS. The output is `skip`, never `relevant` — so a crashed
 *   classifier, a failed merge-base or a missing output all leave `skip` unset, and
 *   `if: skip != 'true'` RUNS the gate. There is no input to this file that can turn
 *   the gate off by accident. That polarity is deliberate and mirrors the docs-lane
 *   classifier in quality-gate.yml, which learned it the expensive way.
 */
const RELEVANT = [
  /^Dockerfile$/,
  /^\.dockerignore$/,
  /^railway\.json$/,
  /^pnpm-lock\.yaml$/,
  /^pnpm-workspace\.yaml$/,
  // Any manifest anywhere: the image is a frozen workspace install, so a dependency
  // moving between sections in ANY package can change what ships.
  /(^|\/)package\.json$/,
  // The two processes the image actually runs.
  /^lazytopper\/server\//,
  /^artifacts\/api-server\//,
  // The gate's own machinery — it must be able to verify changes to itself.
  /^scripts\/ci\//,
  /^\.github\/workflows\/container-boot\.yml$/,
];

function changedFiles() {
  const base = process.env["BASE_REF"];
  if (process.env["EVENT_NAME"] !== "pull_request" || !base) return null;
  const mergeBase = execFileSync("git", ["merge-base", `origin/${base}`, "HEAD"], {
    encoding: "utf8",
  }).trim();
  return execFileSync("git", ["diff", "--name-only", `${mergeBase}..HEAD`], {
    encoding: "utf8",
  })
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function classify() {
  let files = null;
  let reason = "";
  try {
    files = changedFiles();
  } catch (err) {
    // A failed merge-base must RUN the gate, never silently skip it.
    console.log(`classifier: could not derive changed files (${err.message}) -> RUNNING`);
    return emit(false, "unresolved (fail-open)", []);
  }

  if (files === null) {
    // push to trunk, or workflow_dispatch. The integration check must not be
    // forgettable, so trunk always boots the image.
    return emit(false, "not a pull_request -> always run", []);
  }

  const hits = files.filter((f) => RELEVANT.some((re) => re.test(f)));
  reason = hits.length ? "image-relevant paths changed" : "no image-relevant path changed";
  return emit(hits.length === 0, reason, hits, files);
}

function emit(skip, reason, hits, files = []) {
  const out = process.env["GITHUB_OUTPUT"];
  console.log(`CONTAINER_BOOT_INSPECTED_FILES: ${files.length}`);
  console.log(`CONTAINER_BOOT_RELEVANT_HITS: ${hits.length}`);
  for (const h of hits) console.log(`  hit: ${h}`);
  console.log(`CONTAINER_BOOT_REASON: ${reason}`);
  console.log(`CONTAINER_BOOT_WILL_RUN: ${!skip}`);
  if (out) fs.appendFileSync(out, `skip=${skip ? "true" : "false"}\nreason=${reason}\n`);
  return 0;
}

/* ══════════════════════════════════════════════════════════════════════════════
   2 · ASSERT — the container actually came up
   ══════════════════════════════════════════════════════════════════════════════ */

/**
 * Each entry is a claim about the RUNNING container. `required` entries fail the gate.
 *
 * ★ `gatewayParentSpawn` is recorded and deliberately NOT required. It is the line the
 *   brief named, and it is the weaker claim — see the header. Keeping it visible but
 *   non-load-bearing documents the distinction in the output itself.
 */
const READY = [
  {
    id: "apiServerListening",
    required: true,
    re: /Server listening/,
    what: "api-server bound its port (artifacts/api-server/src/index.ts app.listen callback)",
  },
  {
    id: "gatewayParentSpawn",
    required: false,
    re: /AI Gateway started/,
    what: "parent logged the spawn call returning — NOT proof the gateway booted",
  },
  {
    id: "gatewayChildListening",
    required: true,
    re: /LazyTopper AI server running on port (\d+)/,
    what: "the GATEWAY CHILD printed its own listen line — this is the real gateway proof",
  },
];

async function assertBoot() {
  const logPath = val("--log");
  const base = val("--url");
  const log = fs.readFileSync(logPath, "utf8");

  let failed = 0;
  console.log("─── ready lines ───");
  for (const r of READY) {
    const m = log.match(r.re);
    const mark = m ? "PASS" : r.required ? "FAIL" : "absent";
    console.log(`[${mark}] ${r.id} — ${r.what}`);
    if (m) console.log(`        matched: ${JSON.stringify(m[0])}`);
    if (!m && r.required) failed++;
  }

  console.log("─── healthcheck ───");
  // railway.json's healthcheckPath. If this 200s, the path Railway itself probes works.
  const url = `${base}/shared-api/healthz`;
  let status = 0;
  let body = "";
  try {
    const res = await fetch(url);
    status = res.status;
    body = (await res.text()).slice(0, 200);
  } catch (err) {
    console.log(`[FAIL] ${url} — request threw: ${err.message}`);
    failed++;
  }
  if (status) {
    console.log(`[${status === 200 ? "PASS" : "FAIL"}] ${url} -> ${status} ${JSON.stringify(body)}`);
    if (status !== 200) failed++;
  }

  if (failed) {
    console.error(`\nCONTAINER BOOT GATE: FAILED (${failed} required assertion(s))`);
    console.error("Full container log follows so the failure is diagnosable from CI alone:");
    console.error(log);
    process.exit(1);
  }
  console.log("\nCONTAINER BOOT GATE: the image built, booted, and served its healthcheck.");
}

if (has("--classify")) process.exit(classify());
else if (has("--assert")) await assertBoot();
else {
  console.error("usage: --classify | --assert --log <file> --url <base>");
  process.exit(2);
}
