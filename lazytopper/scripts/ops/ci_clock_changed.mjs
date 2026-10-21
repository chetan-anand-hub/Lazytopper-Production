#!/usr/bin/env node
/**
 * CI-CLOCK-CUT (owner ruling 2026-10-22 on FU-CI-CLOCK-LEGS-INVESTIGATE) — the selection behind the
 * PR job `clock-changed`.
 *
 * Until CI-CLOCK-CUT every full-bar run paid six `clock (...)` legs (the whole date-sensitive
 * manifest in two halves + the whole ops matrix, at 2030-06-15 and at IST midnight): ~22-29 billed
 * minutes per PR, and in their whole life they caught no product date bug — only flakes. The FULL
 * suite + ops matrix under BOTH clocks still runs every night (`nightly-full-clock`, which opens an
 * issue on a scheduled failure). On a PR, `clock-changed` runs at BOTH clocks only the manifest
 * test files this change can have made date-wrong:
 *
 *   (1) test files in lazytopper/scripts/testClock/date-sensitive-tests.json that this change
 *       added or modified, and
 *   (2) test files this change ADDED TO the manifest (the manifest records no test -> source
 *       mapping, so a test whose tested source started reading the clock is reached through the
 *       manifest entry the runtime recorder forces into the same PR).
 *
 * ★ "0 date-sensitive tests changed" IS AN HONEST SKIP, AND IT IS SUCCESS ONLY BECAUSE THE NIGHTLY
 *   COVERS IT. The line is printed so the log says what ran. It is never inferred from a missing
 *   input: if the base this change is measured against cannot be resolved, this FAILS (exit 1) —
 *   if a check matters, its absence must fail.
 *
 * WHAT IS THE BASE
 *   pull_request       merge-base(origin/<BASE_REF>, HEAD), as the classifier computes it
 *   push               EVENT_BEFORE..HEAD (the trunk tip before this push)
 *   merge_group        MERGE_GROUP_BASE_SHA..HEAD
 *   workflow_dispatch  N/A: `nightly-full-clock` runs the FULL suite at both clocks in the same run
 *   anything else      FAIL
 *
 * USAGE (repo root)
 *   node lazytopper/scripts/ops/ci_clock_changed.mjs --select
 *       stdout: the selected files (relative to lazytopper/), one per line — EMPTY when none;
 *       stderr: CLOCK_CHANGED_* lines; exit 1 when the base cannot be resolved.
 */

import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { enumerateVitestFiles, readList } from "../testClock/dateSensitive.mjs";
import { substringCollisions } from "./ci_shard_plan.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ANCHOR = path.resolve(HERE, "..", ".."); // lazytopper/
const REPO_ROOT = path.resolve(ANCHOR, "..");
export const MANIFEST_REPO_PATH = "lazytopper/scripts/testClock/date-sensitive-tests.json";
export const ZERO_LINE = "CLOCK_CHANGED: 0 date-sensitive tests changed";
const ZERO_SHA = /^0+$/;
const SHA = /^[0-9a-f]{7,40}$/;

const toPosix = (p) => String(p).replace(/\\/g, "/");

/**
 * Pure. `changedFiles` are REPO-ROOT paths (git diff); manifests are lazytopper-relative.
 * Returns { files, changedTests, addedToManifest } — files sorted, de-duplicated, existing only.
 */
export function selectClockChanged({ changedFiles, manifestHead, manifestBase = [], existing }) {
  const head = new Set(manifestHead.map(toPosix));
  const base = new Set(manifestBase.map(toPosix));
  const exists = new Set(existing.map(toPosix));
  const changedTests = changedFiles.map(toPosix)
    .filter((f) => f.startsWith("lazytopper/"))
    .map((f) => f.slice("lazytopper/".length))
    .filter((f) => head.has(f) && exists.has(f));
  const addedToManifest = [...head].filter((f) => !base.has(f) && exists.has(f));
  const files = [...new Set([...changedTests, ...addedToManifest])].sort();
  return { files, changedTests: [...new Set(changedTests)].sort(), addedToManifest: addedToManifest.sort() };
}

/**
 * Pure (env in, decision out). { mode: "diff", base?, baseRef?, reason } | { mode: "na", reason } |
 * { mode: "fail", reason }. `diff` with baseRef means "merge-base against origin/<baseRef>".
 */
export function resolveBaseSpec(env = {}) {
  const event = env.EVENT_NAME || "";
  if (event === "pull_request") {
    const baseRef = env.BASE_REF || "";
    if (!baseRef) return { mode: "fail", reason: "pull_request with no BASE_REF — cannot tell what this PR changed" };
    return { mode: "diff", baseRef, reason: `merge-base against origin/${baseRef}` };
  }
  if (event === "push") {
    const before = String(env.EVENT_BEFORE || "").trim();
    if (!SHA.test(before) || ZERO_SHA.test(before)) {
      return { mode: "fail", reason: `push with no usable EVENT_BEFORE ("${before}") — cannot tell what this push changed` };
    }
    return { mode: "diff", base: before, reason: `push range ${before.slice(0, 12)}..HEAD` };
  }
  if (event === "merge_group") {
    const b = String(env.MERGE_GROUP_BASE_SHA || "").trim();
    if (!SHA.test(b) || ZERO_SHA.test(b)) return { mode: "fail", reason: `merge_group with no usable base_sha ("${b}")` };
    return { mode: "diff", base: b, reason: `merge group range ${b.slice(0, 12)}..HEAD` };
  }
  // schedule: review 2026-10-22 — classify routes schedule to the nightly path today, but a forced full bar
  // (CI_FORCE_FULL_BAR) would run this job on schedule; nightly-full-clock in the same run covers it, so N/A, never a false red.
  if (event === "workflow_dispatch" || event === "schedule") {
    return { mode: "na", reason: `${event}: nightly-full-clock in this same run covers the FULL suite at both clocks` };
  }
  return { mode: "fail", reason: `event=${event || "(unset)"} has no defined base for clock-changed` };
}

const git = (args) => execFileSync("git", args, { cwd: REPO_ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

function manifestAt(rev) {
  try {
    const json = JSON.parse(git(["show", `${rev}:${MANIFEST_REPO_PATH}`]));
    return Array.isArray(json.vitest) ? json.vitest : [];
  } catch {
    return []; // the manifest did not exist at the base: every entry is "added", which runs MORE.
  }
}

function runSelect() {
  const env = {
    EVENT_NAME: process.env.EVENT_NAME || process.env.GITHUB_EVENT_NAME || "",
    BASE_REF: process.env.BASE_REF || process.env.GITHUB_BASE_REF || "",
    EVENT_BEFORE: process.env.EVENT_BEFORE || "",
    MERGE_GROUP_BASE_SHA: process.env.MERGE_GROUP_BASE_SHA || "",
  };
  const spec = resolveBaseSpec(env);
  const fail = (why) => {
    console.error(`CLOCK_CHANGED_FAIL: ${why}`);
    console.error("CLOCK_CHANGED_VERDICT: FAIL — the base is missing, so what changed is unknown; this never skips silently.");
    process.exitCode = 1;
  };
  if (spec.mode === "fail") return fail(spec.reason);
  if (spec.mode === "na") {
    console.error(`${ZERO_LINE} — N/A: ${spec.reason}`);
    return;
  }
  let base = spec.base;
  try {
    if (spec.baseRef) base = git(["merge-base", `origin/${spec.baseRef}`, "HEAD"]).trim();
    else git(["cat-file", "-e", `${base}^{commit}`]);
  } catch (err) {
    return fail(`${spec.reason}: ${String(err?.message || err).split("\n")[0]}`);
  }
  if (!SHA.test(base)) return fail(`${spec.reason}: no usable base sha ("${base}")`);
  let changed;
  try {
    changed = git(["diff", "--name-only", "--no-renames", base, "HEAD"]).split("\n").map((s) => s.trim()).filter(Boolean);
  } catch (err) {
    return fail(`diff ${base.slice(0, 12)}..HEAD failed: ${String(err?.message || err).split("\n")[0]}`);
  }
  const all = enumerateVitestFiles();
  const sel = selectClockChanged({
    changedFiles: changed, manifestHead: readList().vitest, manifestBase: manifestAt(base), existing: all,
  });
  console.error(
    `CLOCK_CHANGED_SCOPE: event=${env.EVENT_NAME} base=${base.slice(0, 12)} (${spec.reason}) changed_paths=${changed.length} ` +
      `changed_manifest_tests=${sel.changedTests.length} added_to_manifest=${sel.addedToManifest.length} selected=${sel.files.length}`,
  );
  if (!sel.files.length) {
    console.error(`${ZERO_LINE} — honest skip; nightly-full-clock runs the FULL suite at both clocks every night.`);
    return;
  }
  const collisions = substringCollisions(sel.files, all);
  if (collisions.length) return fail(`vitest filters are substrings — ${collisions.slice(0, 5).join("; ")}`);
  console.error(`CLOCK_CHANGED: ${sel.files.length} date-sensitive test file(s) selected: ${sel.files.join(" ")}`);
  process.stdout.write(sel.files.join("\n") + "\n");
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) {
  if (process.argv.includes("--select")) {
    try { runSelect(); } catch (err) {
      console.error(`CLOCK_CHANGED_FAIL: selector threw: ${String(err?.message || err)}`);
      process.exitCode = 1;
    }
  } else {
    console.error("usage: ci_clock_changed.mjs --select");
    process.exitCode = 2;
  }
}
