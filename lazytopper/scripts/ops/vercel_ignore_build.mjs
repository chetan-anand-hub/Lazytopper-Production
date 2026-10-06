#!/usr/bin/env node
// VERCEL IGNORED BUILD STEP (CI-SPEED-1, HARDEN-1 §2 PR-3 (a)).
//
// Wired as `ignoreCommand` in the repo-root vercel.json. Vercel runs it from the project Root
// Directory (`.` = the repo root) BEFORE install, so this file uses node built-ins only.
//
//   exit 0  => Vercel SKIPS the build (the deployment is cancelled by the Ignored Build Step)
//   exit 1  => Vercel BUILDS, exactly as it did before this file existed
//
// ★ FAILS TOWARDS BUILDING, EVERYWHERE. Only one outcome skips: a PRODUCTION deployment whose
//   every changed file since the LAST SUCCESSFUL production deployment is deploy-inert
//   documentation. Every other case - a preview, an unknown environment, a missing or
//   unresolvable previous SHA, a git error, an empty diff, a crash - builds. A wrongly skipped
//   build leaves students on old bytes; a wrongly run build costs a few minutes and a reload.
//
// ★ WHY VERCEL_GIT_PREVIOUS_SHA AND NOT HEAD^. Vercel sets it (in this step only) to the commit
//   of the last SUCCESSFUL deployment for the branch. If a product merge's build FAILED and a
//   docs merge follows, HEAD^..HEAD would see only markdown and skip, leaving the product change
//   undeployed; PREVIOUS..HEAD still contains the product change, so it builds. Consecutive
//   skipped docs merges accumulate in the same range, and the next product merge builds them all.
//
// ★ PREVIEWS ALWAYS BUILD. A preview is a pre-merge gate in this project (headers, rewrites and
//   prerender are verified on it), so this step never touches them. Only production is skipped.
//
// ★ WHAT "DEPLOY-INERT" MEANS (the spec's docs-only set: handoff/**, ops/**, *.md outside src):
//   a path ending in `.md` that has no `src`, `public`, `prerendered` or `dist` directory
//   segment. `.md` is REQUIRED even under handoff/ and ops/ - a directory can hold a script one
//   day (handoff/curation/*.ts already exists), and the CI docs lane makes the same call (M1).
//   Everything that ships bytes is therefore a build: lazytopper/**, notes/specs + notes/assets,
//   lazytopper/prerendered/**, lazytopper/public/**, middleware.ts, vercel.json, package.json,
//   pnpm-lock.yaml, .github/** (not shipped, but not docs either - build, conservatively).
//
// What Vercel shows for a skipped production commit: the deployment is CANCELED with
// "The Deployment has been canceled as a result of running the command defined in the
// 'Ignored Build Step' setting." /version.json keeps serving the previous merge SHA.

import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Directory segments whose contents can ship (or be read by the build) even when they are .md. */
export const SHIPPING_SEGMENTS = Object.freeze(["src", "public", "prerendered", "dist"]);

/** Is this one path deploy-inert documentation? Extension-checked, never directory-only. */
export function isDeployInertPath(filePath) {
  const p = String(filePath || "").replace(/\\/g, "/").replace(/^\.\//, "");
  if (!p) return false;
  if (!p.toLowerCase().endsWith(".md")) return false;
  const dirs = p.split("/").slice(0, -1);
  return !dirs.some((d) => SHIPPING_SEGMENTS.includes(d));
}

/** The verdict for a resolved changed-file list. `null`/empty = unknown, which builds. */
export function verdictForFiles(files) {
  if (!Array.isArray(files) || files.length === 0) {
    return { skip: false, reason: "the changed-file list is empty or unresolved - building" };
  }
  const shipping = files.filter((f) => !isDeployInertPath(f));
  if (shipping.length) {
    return { skip: false, reason: `${shipping.length} shipping path(s), e.g. ${shipping.slice(0, 3).join(", ")}` };
  }
  return { skip: true, reason: `all ${files.length} changed path(s) are deploy-inert docs` };
}

function defaultGit(args, cwd) {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

/**
 * The whole decision. `env` is Vercel's system env; `git` is injectable so the acceptance suite
 * can replay real trunk commits with a chosen HEAD.
 */
export function decide(env = process.env, { git = defaultGit, cwd = process.cwd(), head = "HEAD" } = {}) {
  const vercelEnv = env.VERCEL_ENV || "";
  if (vercelEnv !== "production") {
    return { skip: false, reason: `VERCEL_ENV=${vercelEnv || "(unset)"} - only production builds are ever skipped` };
  }
  const prev = String(env.VERCEL_GIT_PREVIOUS_SHA || "").trim();
  if (!/^[0-9a-f]{7,40}$/i.test(prev)) {
    return { skip: false, reason: "no VERCEL_GIT_PREVIOUS_SHA (first deployment or not exposed) - building" };
  }
  try {
    git(["cat-file", "-e", `${prev}^{commit}`], cwd);
  } catch {
    return { skip: false, reason: `previous deployment ${prev.slice(0, 12)} is not in this clone - building` };
  }
  let out;
  try {
    out = git(["diff", "--name-only", "--no-renames", prev, head], cwd);
  } catch (err) {
    return { skip: false, reason: `git diff ${prev.slice(0, 12)}..${head} failed - building (${String(err?.message || err).split("\n")[0]})` };
  }
  const files = out.split("\n").map((s) => s.trim()).filter(Boolean);
  const v = verdictForFiles(files);
  return { ...v, files, range: `${prev.slice(0, 12)}..${head}` };
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (invokedDirectly) {
  let result;
  try {
    result = decide();
  } catch (err) {
    result = { skip: false, reason: `ignore step threw - building (${String(err?.message || err)})` };
  }
  console.log(`VERCEL_IGNORE_BUILD: ${result.skip ? "SKIP" : "BUILD"} - ${result.reason}${result.range ? ` [${result.range}]` : ""}`);
  process.exit(result.skip ? 0 : 1);
}
