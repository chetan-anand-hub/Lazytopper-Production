// SEARCH-PING DEPLOY-INERT SKIP (CI-SPEED-1, owner ruling 2026-10-07 "Amend guard in #969").
//
// vercel.json `ignoreCommand` (vercel_ignore_build.mjs) skips a PRODUCTION build when every file
// changed since the last deployed commit is deploy-inert markdown. www then keeps serving the
// previous commit, so search-ping's rollout wait for the pushed SHA could never succeed and would
// time out red (~32 min) after every docs-only merge.
//
// This module decides, BEFORE the wait, whether the pushed commit was deliberately not deployed.
// It decides by what is ACTUALLY LIVE on www (version.json), never by github.event.before, which
// can disagree with Vercel's previous-deployed SHA.
//
//   live == pushed, or live descends from pushed  -> "existing": the unchanged wait handles it
//   live is an ANCESTOR of pushed AND every file in `git diff live..pushed` is deploy-inert by
//     vercel_ignore_build.mjs's OWN classifier (verdictForFiles) on CONFIRM_READS consecutive
//     reads of the same live SHA                  -> skip (no wait, no ping)
//   anything else - unreadable live, a git error, not an ancestor, a code file in the range, the
//     settle window running out                   -> wait (the existing behaviour, unchanged)
//
// ★ FAILS TOWARD WAITING, EVERYWHERE. A wrong skip silently drops a ping; a wrong wait costs at
//   worst the red timeout that existed before this file. Only the one confirmed shape skips.
//
// ★ ONE COPY OF THE RULE. The deploy-inert decision is verdictForFiles from vercel_ignore_build.mjs,
//   and the changed-file list comes from its listChangedPaths (same git arguments). This file holds
//   no path rule of its own; searchPing.guard.test.ts and ci_speed_acceptance.mjs pin that.

import { verdictForFiles } from "./vercel_ignore_build.mjs";

/** The settle window: at most SETTLE_READS reads, READ_INTERVAL apart (~2 minutes). */
export const SETTLE_READS = 8;
export const SETTLE_INTERVAL_MS = 15 * 1000;
/** Consecutive reads of the SAME live SHA with an all-inert range needed to skip. */
export const CONFIRM_READS = 3;

/** The line the owner ruling names. Logged on the skip path only. */
export const SKIP_LINE = "deploy skipped by ignoreCommand: nothing new to ping";

function sameCommit(a, b) {
  const x = String(a || "").toLowerCase();
  const y = String(b || "").toLowerCase();
  return Boolean(x && y) && (x.startsWith(y) || y.startsWith(x));
}

/**
 * Classify ONE read of the live SHA. kind:
 *   "unknown"  - nothing readable; keep settling
 *   "existing" - live is this commit or descends from it; hand over to the unchanged wait
 *   "wait"     - definitive: not skippable (code in range, not an ancestor, git error)
 *   "inert"    - live is an ancestor and the whole range is deploy-inert
 */
export function classifyLiveRead(sha, live, deps) {
  if (typeof live !== "string" || !/^[0-9a-f]{7,40}$/i.test(live)) {
    return { kind: "unknown", reason: "live SHA unreadable" };
  }
  if (sameCommit(live, sha)) return { kind: "existing", reason: `www already serves ${live}` };
  try {
    if (deps.isAncestor(sha, live)) {
      return { kind: "existing", reason: `www serves ${live}, a descendant of ${sha}` };
    }
    if (!deps.isAncestor(live, sha)) {
      return { kind: "wait", reason: `live ${live} is not an ancestor of ${sha}` };
    }
    const files = deps.changedFiles(live, sha);
    const verdict = verdictForFiles(files);
    const range = `${live.slice(0, 12)}..${sha.slice(0, 12)}`;
    if (!verdict.skip) return { kind: "wait", reason: `${range}: ${verdict.reason}`, range, files };
    return { kind: "inert", reason: `${range}: ${verdict.reason}`, range, files };
  } catch (err) {
    return { kind: "wait", reason: `git check failed (${String(err?.message || err).split("\n")[0]})` };
  }
}

/**
 * The decision. deps: { readLiveSha: async () => string|null, isAncestor(a, d) => bool
 * ("a is an ancestor of d"), changedFiles(from, to) => string[], sleep(ms), log(line) }.
 * Returns { skip, path: "skip"|"wait"|"existing", reason, live?, range?, files? }.
 */
export async function decideInertSkip(
  sha,
  deps,
  { settleReads = SETTLE_READS, intervalMs = SETTLE_INTERVAL_MS, confirmReads = CONFIRM_READS } = {},
) {
  let streakSha = null;
  let streak = 0;
  for (let read = 1; read <= settleReads; read += 1) {
    let live = null;
    try {
      live = await deps.readLiveSha();
    } catch {
      live = null;
    }
    const c = classifyLiveRead(sha, live, deps);
    deps.log(`SEARCH_PING_SKIP_CHECK: read ${read}/${settleReads} live=${live ?? "(none)"} -> ${c.kind} (${c.reason})`);
    if (c.kind === "existing") return { skip: false, path: "existing", reason: c.reason, live };
    if (c.kind === "wait") return { skip: false, path: "wait", reason: c.reason, live, range: c.range, files: c.files };
    if (c.kind === "inert") {
      streak = sameCommit(live, streakSha) ? streak + 1 : 1;
      streakSha = live;
      if (streak >= confirmReads) {
        return { skip: true, path: "skip", reason: c.reason, live, range: c.range, files: c.files };
      }
    } else {
      streak = 0;
      streakSha = null;
    }
    if (read < settleReads) await deps.sleep(intervalMs);
  }
  return {
    skip: false,
    path: "wait",
    reason: `settle window ended without ${confirmReads} consecutive deploy-inert reads - waiting`,
  };
}
