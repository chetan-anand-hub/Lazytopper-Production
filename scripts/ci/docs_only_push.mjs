#!/usr/bin/env node
/**
 * docs_only_push — the ONE rule that lets a post-merge (push-to-trunk) workflow skip its
 * expensive work when the push changed nothing but documentation.
 *
 * Factored out of scripts/ci/container_boot_gate.mjs (CI-COST-2, #1265), where it was proven,
 * and shared with Golden Eval, search-ping (push trigger only) and State Board (CI-COST-3,
 * owner-approved 2026-10-19). There is exactly one copy of the skip list and one copy of the
 * fail-safe ladder; container_boot_gate.mjs calls decidePush() for its push path.
 *
 * ★ SCOPE. PUSH EVENTS ONLY. A pull_request, schedule, workflow_dispatch or deployment_status
 *   run is never classified here — the CLI emits docs_only=false for every non-push event, and
 *   each workflow additionally names `push` in its own `if:` so that is structural, not trusted.
 *
 * ★ POLARITY. The output is `docs_only`, and ONLY the literal 'true' skips. A crashed step, a
 *   missing output, an empty string, anything else -> the gated work RUNS. Every rung below that
 *   cannot PROVE "only skip-listed paths changed, and the previous trunk run of this workflow
 *   passed" returns skip:false.
 *
 * Fail-safe ladder (each one -> RUN):
 *   · before-SHA unset, malformed or all-zero (a new branch / first push);
 *   · before-SHA absent from the checkout;
 *   · before-SHA not an ancestor of HEAD (a force push rewrote trunk);
 *   · an empty diff, or any git error;
 *   · ANY changed path not on the skip list (unknown paths run);
 *   · the previous trunk push's run of THIS workflow (the run for `before`) not a completed
 *     success, or not readable at all. A red or still-running predecessor is never hidden by a
 *     following docs-only push: a skipped run is only green when its predecessor was, so the
 *     chain stays red until a real run passes — and an in-flight predecessor that a later push
 *     cancels or supersedes is re-covered by the next run, never silently dropped.
 *
 * Usage (in a workflow step, push events):
 *   node scripts/ci/docs_only_push.mjs --workflow golden-eval.yml
 *     env: EVENT_NAME, PUSH_BEFORE, GITHUB_OUTPUT, GITHUB_REPOSITORY, GITHUB_REF_NAME, GH_TOKEN
 *     writes: docs_only=true|false, reason=<text>   (always exits 0)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const GIT_OPTS = { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 };
export const defaultGit = (gitArgs) => execFileSync("git", gitArgs, GIT_OPTS);
export const lines = (out) => String(out).split("\n").map((s) => s.trim()).filter(Boolean);
const FULL_SHA = /^[0-9a-f]{40}$/i;
const ZERO_SHA = /^0+$/;
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The allow-to-SKIP list: paths that are obviously not code, data, build input or runtime input
 * for ANY of the gated workflows. It is the CI-COST-2 list verbatim; only the self-exception is
 * parameterised, so each workflow still runs when its OWN workflow file changes.
 */
export function skipListFor(workflowFile) {
  const self = escapeRe(`workflows/${workflowFile}`);
  return [
    /^handoff\//,
    /^docs\//,
    /^ledger\//,
    /^screenshots\//,
    /^ops\/.*\.md$/,
    // Top-level markdown only (AGENTS.md, CLAUDE.md, ...). NOT any *.md: the tutor retriever reads
    // .md files under lazytopper/src at runtime, and golden-eval markdown under lazytopper/ is data.
    /^[^/]+\.md$/,
    /^\.claude\//,
    // Other workflows and repo metadata — but never the gated workflow's own file.
    new RegExp(`^\\.github\\/(?!${self}$)`),
  ];
}

/** The changed paths that are NOT on the skip list (an empty result = docs-only). */
export function notSkippable(files, workflowFile) {
  const list = skipListFor(workflowFile);
  return files.filter((f) => !list.some((re) => re.test(f)));
}

/**
 * Reader for "how did the previous trunk push's run of this workflow end?". Returns the
 * conclusion string ("success", "failure", ...), "still <status>" or "no run found"; THROWS when
 * the API cannot be read. Injectable in decidePush for tests.
 */
export function prevRunReader(workflowFile, { exec = execFileSync, env = process.env } = {}) {
  return (before) => {
    const repo = env["GITHUB_REPOSITORY"];
    const branch = env["GITHUB_REF_NAME"];
    if (!repo || !branch) throw new Error("GITHUB_REPOSITORY / GITHUB_REF_NAME unset");
    const q = `repos/${repo}/actions/workflows/${workflowFile}/runs?event=push&branch=${encodeURIComponent(branch)}&head_sha=${before}&per_page=20`;
    const out = exec("gh", ["api", q], { ...GIT_OPTS, env: { ...env } });
    const runs = (JSON.parse(out)?.workflow_runs || [])
      .filter((r) => r && r.head_sha === before)
      .sort((x, y) => String(y.created_at).localeCompare(String(x.created_at)));
    if (!runs.length) return "no run found";
    return runs[0].status === "completed" ? String(runs[0].conclusion) : `still ${runs[0].status}`;
  };
}

/**
 * The push decision, as a pure function of `before`, a git runner and a previous-run reader.
 * Returns { skip, reason, hits, files }. `prevLabel` only names the predecessor in the reason
 * text (container_boot_gate passes "previous trunk boot" so its output is unchanged).
 *
 * ★ `--no-renames`: with rename detection on (git's default for `git diff`), `--name-only` prints
 *   only the NEW path of a rename, so `git mv lazytopper/src/x.ts docs/x.ts` would list just
 *   `docs/x.ts` and read as docs-only. Without it, both sides of a rename are listed.
 */
export function decidePush({
  pushBefore,
  git = defaultGit,
  prevRun,
  workflowFile,
  prevLabel = "previous trunk run",
  passedWord = "passed",
} = {}) {
  const run = (reason) => ({ skip: false, reason, hits: [], files: [] });
  const before = String(pushBefore || "").trim();
  if (!FULL_SHA.test(before) || ZERO_SHA.test(before)) {
    return run(`push: before SHA unknown (${before || "unset"}) -> RUNNING (fail-safe)`);
  }
  let files;
  try {
    git(["cat-file", "-e", `${before}^{commit}`]);
    // exits non-zero (throws) when `before` is not an ancestor: a force push rewrote trunk.
    git(["merge-base", "--is-ancestor", before, "HEAD"]);
    files = lines(git(["diff", "--no-renames", "--name-only", `${before}..HEAD`]));
  } catch (err) {
    const why = String(err?.message || err).split("\n")[0].slice(0, 120);
    return run(`push: cannot diff ${before.slice(0, 12)}..HEAD as a fast-forward (${why}) -> RUNNING (fail-safe)`);
  }
  if (files.length === 0) return run("push: empty diff -> RUNNING (fail-safe)");
  const hits = notSkippable(files, workflowFile);
  if (hits.length) {
    return { skip: false, reason: "push: a path not on the skip list changed -> RUNNING", hits, files };
  }
  if (typeof prevRun !== "function") {
    return { skip: false, reason: `push: no ${prevLabel} reader -> RUNNING (fail-safe)`, hits, files };
  }
  let prev;
  try {
    prev = prevRun(before);
  } catch (err) {
    const why = String(err?.message || err).split("\n")[0].slice(0, 120);
    return { skip: false, reason: `push: ${prevLabel} unreadable (${why}) -> RUNNING (fail-safe)`, hits, files };
  }
  if (prev !== "success") {
    return { skip: false, reason: `push: ${prevLabel} (${before.slice(0, 12)}) is ${prev}, not success -> RUNNING`, hits, files };
  }
  return { skip: true, reason: `push: every changed path is on the skip list and the ${prevLabel} ${passedWord}`, hits, files };
}

/** The CLI decision: non-push events never skip. */
export function decide({ event, pushBefore, workflowFile, git = defaultGit, prevRun } = {}) {
  if (event !== "push") {
    return { skip: false, reason: `event=${event || "(unset)"} is not push -> always run`, hits: [], files: [] };
  }
  if (!workflowFile) return { skip: false, reason: "no --workflow given -> RUNNING (fail-safe)", hits: [], files: [] };
  return decidePush({
    pushBefore,
    git,
    prevRun: prevRun || prevRunReader(workflowFile),
    workflowFile,
    prevLabel: `previous trunk ${workflowFile} run`,
  });
}

function cli(argv) {
  const i = argv.indexOf("--workflow");
  const workflowFile = i === -1 ? "" : String(argv[i + 1] || "");
  let d;
  try {
    d = decide({ event: process.env["EVENT_NAME"], pushBefore: process.env["PUSH_BEFORE"], workflowFile });
  } catch (err) {
    d = { skip: false, reason: `classifier error (${String(err?.message || err).slice(0, 120)}) -> RUNNING (fail-safe)`, hits: [], files: [] };
  }
  console.log(`DOCS_ONLY_WORKFLOW: ${workflowFile || "(none)"}`);
  console.log(`DOCS_ONLY_INSPECTED_FILES: ${d.files.length}`);
  console.log(`DOCS_ONLY_NON_DOCS_HITS: ${d.hits.length}`);
  for (const h of d.hits.slice(0, 50)) console.log(`  hit: ${h}`);
  console.log(`DOCS_ONLY_REASON: ${d.reason}`);
  console.log(`DOCS_ONLY_WILL_SKIP: ${d.skip}`);
  const out = process.env["GITHUB_OUTPUT"];
  if (out) fs.appendFileSync(out, `docs_only=${d.skip ? "true" : "false"}\nreason=${d.reason}\n`);
  return 0;
}

// ★ ONLY WHEN RUN AS A SCRIPT, so tests and container_boot_gate.mjs can import without the CLI.
const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) process.exit(cli(process.argv.slice(2)));
