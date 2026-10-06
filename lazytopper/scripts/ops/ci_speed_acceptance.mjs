#!/usr/bin/env node
/**
 * CI-SPEED-1 acceptance (HARDEN-1 §2 PR-3). Pins both halves of the lane:
 *   (a) the Vercel Ignored Build Step - docs-only production merges skip, anything that ships builds,
 *       replayed over REAL trunk commits (needs full history: quality-gate.yml checks out depth 0);
 *   (b) the clock-run selection - the guard catches an unlisted date-dependent test, and the
 *       workflow runs the selection on PRs/pushes and the FULL set on the nightly schedule.
 *
 * Run by quality-gate.yml's "Date-sensitive clock selection guard + CI-speed acceptance" step.
 *   node scripts/ops/ci_speed_acceptance.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { decide, isDeployInertPath, verdictForFiles } from "./vercel_ignore_build.mjs";
import { guard, dateSignalsIn, readList, scan } from "../testClock/dateSensitive.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ANCHOR = path.resolve(HERE, "..", "..");
const REPO_ROOT = path.resolve(ANCHOR, "..");
const WORKFLOW = path.join(REPO_ROOT, ".github", "workflows", "quality-gate.yml");
const VERCEL_JSON = path.join(REPO_ROOT, "vercel.json");

const checks = [];
const check = (name, ok, detail = "") => checks.push({ name, ok: Boolean(ok), detail });
const git = (args) => execFileSync("git", args, { cwd: REPO_ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
// CRLF-normalised: a Windows checkout (core.autocrlf) must assert the same text CI's linux checkout sees.
const read = (p) => { try { return fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n"); } catch { return ""; } };

// ---- (a) Vercel Ignored Build Step ------------------------------------------------------------

{
  const vj = JSON.parse(read(VERCEL_JSON) || "{}");
  check("v1_vercel_json_wires_the_ignore_command",
    vj.ignoreCommand === "node lazytopper/scripts/ops/vercel_ignore_build.mjs" &&
      fs.existsSync(path.join(ANCHOR, "scripts", "ops", "vercel_ignore_build.mjs")),
    `ignoreCommand=${JSON.stringify(vj.ignoreCommand)}`);
}

// Synthetic single-path table: every category the build can read must BUILD.
const PATHS = [
  ["handoff/CURRENT_STATE.md", true],
  ["handoff/SESSION_LOG.md", true],
  ["ops/AGENT_STANDING_RULES.md", true],
  ["ops/arcs/CONTROLLER_WAVE_CLOSEOUT.md", true],
  ["CLAUDE.md", true],
  ["docs/SEO_DECISIONS.md", true],
  ["notes/NoteSpec_Schema.md", true],
  ["lazytopper/README.md", true],
  ["handoff/curation/conceptFigureCatalogue.curated.ts", false],
  ["ops/tool.mjs", false],
  ["lazytopper/src/data/bsre/notes.md", false],
  ["lazytopper/public/llms.md", false],
  ["lazytopper/prerendered/__desktop/index.md", false],
  ["notes/specs/trigonometry.json", false],
  ["notes/assets/fig.svg", false],
  ["middleware.ts", false],
  ["vercel.json", false],
  ["pnpm-lock.yaml", false],
  [".github/workflows/quality-gate.yml", false],
  ["lazytopper/src/pages/Home.tsx", false],
];
{
  const wrong = PATHS.filter(([p, inert]) => isDeployInertPath(p) !== inert);
  check("v2_path_table_docs_inert_and_shipping_paths_build",
    wrong.length === 0, wrong.length ? `wrong: ${wrong.map(([p]) => p).join(", ")}` : `${PATHS.length} paths`);
  check("v3_empty_or_unresolved_list_builds",
    !verdictForFiles([]).skip && !verdictForFiles(null).skip &&
      !verdictForFiles(["handoff/NEXT_ACTION.md", "lazytopper/src/App.tsx"]).skip &&
      verdictForFiles(["handoff/NEXT_ACTION.md", "CLAUDE.md"]).skip);
}

// Real trunk commits (squash merges): expected verdict for the merge's own diff.
export const REAL_COMMITS = [
  ["b52d46c5", "skip", "docs(handoff) QUICK-FIXES-1"],
  ["297cc0f4", "skip", "docs(handoff) wave A-16"],
  ["7d011734", "skip", "docs(handoff) wave B-16"],
  ["baa034f1", "skip", "docs(handoff) wave A-15"],
  ["64ee11c7", "skip", "docs(handoff) wave B-15"],
  ["53fe4d22", "skip", "docs(handoff) wave B-14"],
  ["1e489130", "build", "feat(grading) J1 - lazytopper/server"],
  ["dfb83379", "build", "feat(progress) - src + firestore-rules-tests"],
  ["613d8996", "build", "feat(notes) - prerendered + public + notes/specs + notes/assets"],
  ["965d1025", "build", "feat(seo) - middleware.ts + prerendered"],
  ["532d3635", "build", "test(grader) - .github/workflows + server"],
  ["53065a54", "build", "dependabot npm bump - package.json + lockfile"],
  ["c056ebdb", "build", "dependabot actions/checkout bump - .github/workflows only"],
];
{
  let hasHistory = true;
  try { git(["cat-file", "-e", "b52d46c5^{commit}"]); } catch { hasHistory = false; }
  if (!hasHistory) {
    check("v4_real_trunk_commit_table", false, "history not available - this suite needs full history (fetch-depth: 0)");
  } else {
    const rows = REAL_COMMITS.map(([sha, expected, label]) => {
      const r = decide({ VERCEL_ENV: "production", VERCEL_GIT_PREVIOUS_SHA: git(["rev-parse", `${sha}^`]).trim() },
        { cwd: REPO_ROOT, head: sha });
      return { sha, expected, got: r.skip ? "skip" : "build", label, n: (r.files || []).length };
    });
    const bad = rows.filter((r) => r.got !== r.expected);
    for (const r of rows) console.log(`  ${r.sha} ${r.got.padEnd(5)} (expected ${r.expected}, ${r.n} files) ${r.label}`);
    check("v4_real_trunk_commit_table", bad.length === 0,
      bad.length ? `MISMATCH: ${bad.map((r) => `${r.sha} got ${r.got}`).join(", ")}` : `${rows.length} real commits replayed`);
    // A range: a failed product build followed by a docs merge must still BUILD (PREVIOUS_SHA, not HEAD^).
    const span = decide({ VERCEL_ENV: "production", VERCEL_GIT_PREVIOUS_SHA: git(["rev-parse", "613d8996^"]).trim() },
      { cwd: REPO_ROOT, head: "b52d46c5" });
    check("v5_range_since_last_successful_deploy_builds_when_it_holds_product", !span.skip,
      `613d8996^..b52d46c5: ${span.reason}`);
  }
}
{
  const anySha = git(["rev-parse", "HEAD"]).trim();
  const preview = decide({ VERCEL_ENV: "preview", VERCEL_GIT_PREVIOUS_SHA: anySha }, { cwd: REPO_ROOT });
  const unset = decide({ VERCEL_GIT_PREVIOUS_SHA: anySha }, { cwd: REPO_ROOT });
  check("v6_previews_and_unknown_env_always_build", !preview.skip && !unset.skip);
  const noPrev = decide({ VERCEL_ENV: "production" }, { cwd: REPO_ROOT });
  const badPrev = decide({ VERCEL_ENV: "production", VERCEL_GIT_PREVIOUS_SHA: "0123456789abcdef0123456789abcdef01234567" }, { cwd: REPO_ROOT });
  const sameSha = decide({ VERCEL_ENV: "production", VERCEL_GIT_PREVIOUS_SHA: anySha }, { cwd: REPO_ROOT, head: anySha });
  check("v7_missing_unresolvable_or_empty_range_builds", !noPrev.skip && !badPrev.skip && !sameSha.skip,
    `no-prev: ${noPrev.reason} | bad-prev: ${badPrev.reason} | same-sha: ${sameSha.reason}`);
}

// ---- (b) clock-run selection ------------------------------------------------------------------

{
  const s = scan();
  const list = readList();
  const g = guard(s, list);
  check("c1_guard_passes_on_the_committed_list", g.ok,
    g.ok ? `${list.vitest.length}/${s.totals.vitest} vitest files, ${list.ops.length}/${s.totals.ops} ops entries listed`
         : `unlisted: ${g.missing.map((m) => m.id).join(", ")} stale: ${g.stale.map((m) => m.id).join(", ")}`);
  // Synthetic: one more date-dependent file the list does not name -> the guard must go red.
  const planted = { ...s, vitest: [...s.vitest, { file: "src/__planted__/clock.test.ts", signals: ["reads-now"] }],
    vitestAll: [...s.vitestAll, "src/__planted__/clock.test.ts"] };
  const gp = guard(planted, list);
  check("c2_guard_fails_on_an_unlisted_date_dependent_test", !gp.ok && gp.missing.some((m) => m.id === "src/__planted__/clock.test.ts"));
  const gs = guard(s, { ...list, vitest: [...list.vitest, "src/gone.test.ts"] });
  check("c3_guard_fails_on_a_stale_list_entry", !gs.ok && gs.stale.some((m) => m.id === "src/gone.test.ts"));
  check("c4_signals_are_mechanical",
    dateSignalsIn("const t = Date.now();").includes("reads-now") &&
      dateSignalsIn("vi.useFakeTimers({ now })").includes("pins-clock") &&
      dateSignalsIn('const d = "2026-09-29";').includes("date-literal") &&
      dateSignalsIn("// OWNER RULING (2026-10-03)\nexpect(1).toBe(1);").length === 0 &&
      dateSignalsIn("expect(sum([1, 2])).toBe(3);").length === 0);
}

{
  const wf = read(WORKFLOW);
  const stepBlock = (name) => {
    const i = wf.indexOf(`- name: ${name}`);
    if (i === -1) return "";
    const j = wf.indexOf("\n      - name:", i + 1);
    return wf.slice(i, j === -1 ? undefined : j);
  };
  check("w1_nightly_schedule_trigger_exists", /\n  schedule:\s*\n\s*- cron:\s*'[^']+'/.test(wf));
  check("w2_concurrency_separates_schedule_from_push",
    /group:\s*quality-gate-\$\{\{\s*github\.event_name\s*\}\}-\$\{\{\s*github\.ref\s*\}\}/.test(wf),
    "a nightly run must never cancel (or be cancelled by) a trunk push run");
  const clockSteps = ["Test clock at 2030 (vitest + ops matrix, LT_TEST_CLOCK)", "Test clock at IST midnight, board season"];
  const bad = clockSteps.filter((n) => {
    const b = stepBlock(n);
    return !(b &&
      /CLOCK_SCOPE:\s*\$\{\{\s*github\.event_name == 'schedule' && 'full' \|\| 'date-sensitive'\s*\}\}/.test(b) &&
      /if \[ "\$CLOCK_SCOPE" = "full" \]; then[\s\S]*pnpm --filter lazytopper exec vitest run\n[\s\S]*pnpm --filter lazytopper run test:matrix:all[\s\S]*else[\s\S]*dateSensitive\.mjs --print=vitest[\s\S]*vitest run \$FILES[\s\S]*dateSensitive\.mjs --run-ops[\s\S]*fi/.test(b) &&
      /selfCheck\.mjs/.test(b));
  });
  check("w3_clock_steps_run_selection_on_pr_and_push_full_on_schedule", bad.length === 0,
    bad.length ? `not wired: ${bad.join(" | ")}` : "both clock steps");
  const guardStep = stepBlock("Date-sensitive clock selection guard + CI-speed acceptance");
  check("w4_the_guard_step_runs_on_the_full_bar",
    /dateSensitive\.mjs --guard/.test(guardStep) && /ci_speed_acceptance\.mjs/.test(guardStep) &&
      guardStep.includes("steps.classify.outputs.docs_only != 'true'"));
  const vitestStep = stepBlock("Vitest suites (lazytopper)");
  check("w5_default_vitest_step_still_runs_everything",
    /run: pnpm --filter lazytopper exec vitest run\s*\n/.test(vitestStep),
    "no test leaves the default run");
}

// ---- report -----------------------------------------------------------------------------------
const failed = checks.filter((c) => !c.ok);
for (const c of checks) console.log(`${c.ok ? "ok  " : "FAIL"} ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
console.log(`\nCI_SPEED_ACCEPTANCE: ${checks.length - failed.length}/${checks.length} passed`);
if (failed.length) process.exitCode = 1;
