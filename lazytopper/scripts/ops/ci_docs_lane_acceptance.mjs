#!/usr/bin/env node
/**
 * CI DOCS LANE — the classifier that decides whether a PR takes the docs-only fast path or the
 * full integration bar, AND the acceptance suite that pins it.
 *
 * ★ ONE FILE ON PURPOSE. The workflow invokes THIS module (`--classify`); the suite tests THIS
 *   module. There is no second copy of the rules to drift. `repo_boundary_acceptance.mjs` records
 *   why that matters: "The classifier under test must be the REAL one. A private copy in this file
 *   drifted for four PRs while the suite reported green."
 *
 * ★★ THE CONSTRAINT THAT SHAPES THIS WHOLE FILE — READ IT BEFORE CHANGING ANYTHING.
 *   A docs-only PR's CI run is the ONLY run in this project that sees the MERGED WHOLE. A product
 *   PR's CI runs against ITS OWN base, so lanes built in parallel are never compiled and tested
 *   together until something merges both. Measured: Wave 5A's four lanes ran 94, 95 and 96 test
 *   files; the wave-closing handoff ran 97 — a number no lane run could produce. Earlier, #574 and
 *   #575 (two P0 live-user fixes) reached production having never been tested together.
 *
 *   So the "wasteful" handoff run is the project's integration check. This lane does NOT remove
 *   it. It decides WHEN it is needed, and it is deliberately biased toward running it: an
 *   unnecessary full run costs about five minutes, a skipped one costs a P0 reaching production
 *   untested.
 *
 * ★ FAILS CLOSED, EVERYWHERE. Every unknown, every error, every unresolvable list, every event
 *   that is not a pull_request => FULL BAR. `--classify` never exits non-zero: a crash must not
 *   skip the gate, it must fall back to running everything.
 *
 * MODES
 *   node scripts/ops/ci_docs_lane_acceptance.mjs             # the acceptance suite (default)
 *   node scripts/ops/ci_docs_lane_acceptance.mjs --classify  # the real classifier, called by CI
 *   node scripts/ops/ci_docs_lane_acceptance.mjs --mutate=1..4
 *
 * [FU-CI-DOCS-FAST-PATH]
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ANCHOR = path.resolve(HERE, "..", ".."); // lazytopper/
const REPO_ROOT = path.resolve(ANCHOR, "..");
const WORKFLOW_PATH = path.join(REPO_ROOT, ".github", "workflows", "quality-gate.yml");
const ANCHOR_PACKAGE_JSON = path.join(ANCHOR, "package.json");

// ---------------------------------------------------------------------------------------------
// THE RULES
// ---------------------------------------------------------------------------------------------

/**
 * ★ THE RULE TABLE IS THE MUTATION SURFACE. Production ALWAYS uses DEFAULT_RULES; the acceptance
 * suite passes a mutated copy to prove each assertion can actually go red. A zero from a matcher
 * nobody proved can fire is indistinguishable from a dead matcher.
 */
export const DEFAULT_RULES = Object.freeze({
  // M1 — a docs path must END IN .md, not merely LIVE under handoff/. Do not classify by
  // directory alone: handoff/ could one day hold a script, and a script is code.
  requireMarkdownExtension: true,
  // M2 — an empty or unresolvable changed-file list takes the FULL bar. THE ONE THAT MATTERS.
  unresolvableIsFullBar: true,
  // M3 — a wave-closing handoff takes the FULL bar even though every path in it is markdown.
  waveCloserForcesFull: true,
  // M4 — the verdict names its subject (how many files were inspected), not just its verdict.
  announceSubject: true,
});

/**
 * ★ THE WAVE-CLOSER OPT-IN, AND WHY IT IS THE HARDEST TO FORGET.
 *
 * A label, a body marker or a workflow_dispatch input are all things a human must REMEMBER. A
 * mechanism nobody applies means the integration run silently stops happening — which is the exact
 * failure this lane exists to prevent, arriving through a different door.
 *
 * These two paths are not a ritual. CLAUDE.md section 10 REQUIRES that every wave-closing handoff
 * update `CURRENT_STATE.md` (it records the new trunk SHA) and PREPEND to `SESSION_LOG.md`. You
 * cannot write a wave-closer without them — the opt-in IS the work.
 *
 * Verified against the real record, not assumed:
 *   #600, #576, #553 (wave closers) — every one touches BOTH files          => FULL
 *   #577 (mid-wave pointer doc)     — NEXT_ACTION.md + OPEN_QUESTIONS only  => fast path
 *
 * And it fails safe in both directions. A mid-wave PR that happens to touch SESSION_LOG.md just
 * pays five minutes. A wave-closer CANNOT dodge the full bar, because omitting these files would
 * itself violate section 10 and be caught in review.
 */
export const WAVE_CLOSER_PATHS = Object.freeze([
  "handoff/CURRENT_STATE.md",
  "handoff/SESSION_LOG.md",
]);

/** An explicit human override, for the case the file heuristic cannot see. Forces FULL, never fast. */
export const FULL_BAR_MARKER = "[ci-full]";

const DOCS_DIR_PREFIX = "handoff/";

/** Is this single path a docs path? Extension-checked, never directory-only. */
export function isDocsPath(filePath, rules = DEFAULT_RULES) {
  const p = String(filePath || "").replace(/\\/g, "/").replace(/^\.\//, "");
  if (!p) return false;
  const isMarkdown = p.toLowerCase().endsWith(".md");
  const underHandoff = p.startsWith(DOCS_DIR_PREFIX);
  const isRootFile = !p.includes("/");
  if (!underHandoff && !isRootFile) return false;
  // ★ M1 LIVES HERE. Drop the extension test and `handoff/tool.mjs` reads as documentation.
  if (rules.requireMarkdownExtension && !isMarkdown) return false;
  return true;
}

/**
 * The whole decision, as a pure function. `resolved:false` means we could not establish WHAT
 * changed — which is not "nothing changed", and must never be read as such.
 */
export function classifyChangeset(
  { files, resolved, reason, deliberate = false, prTitle = "" },
  rules = DEFAULT_RULES
) {
  const inspected = Array.isArray(files) ? files.length : 0;

  if (!resolved || !Array.isArray(files) || files.length === 0) {
    // ★ M2 LIVES HERE — THE ONE THAT MATTERS. "We could not tell" must mean "run everything".
    const verdict = rules.unresolvableIsFullBar ? "full" : "docs-only";
    return {
      verdict,
      inspected,
      docs: [],
      code: [],
      waveCloser: [],
      marker: false,
      reason: reason || "the changed-file list could not be resolved",
      failedClosed: rules.unresolvableIsFullBar && !deliberate,
      deliberate,
    };
  }

  const docs = files.filter((f) => isDocsPath(f, rules));
  const code = files.filter((f) => !isDocsPath(f, rules));
  const waveCloser = files.filter((f) =>
    WAVE_CLOSER_PATHS.includes(String(f).replace(/\\/g, "/"))
  );
  const marker = String(prTitle || "").toLowerCase().includes(FULL_BAR_MARKER);

  if (code.length) {
    return {
      verdict: "full",
      inspected,
      docs,
      code,
      waveCloser,
      marker,
      reason: `${code.length} non-docs path(s) changed, e.g. ${code.slice(0, 3).join(", ")}`,
      failedClosed: false,
    };
  }
  if (marker) {
    return { verdict: "full", inspected, docs, code, waveCloser, marker,
      reason: `the PR title carries the ${FULL_BAR_MARKER} override`, failedClosed: false };
  }
  // ★ M3 LIVES HERE.
  if (rules.waveCloserForcesFull && waveCloser.length) {
    return { verdict: "full", inspected, docs, code, waveCloser, marker,
      reason: `wave-closing handoff (${waveCloser.join(", ")}) — this run IS the integration check`,
      failedClosed: false };
  }
  return { verdict: "docs-only", inspected, docs, code, waveCloser, marker,
    reason: "every changed path is documentation and this is not a wave closer", failedClosed: false };
}

// ---------------------------------------------------------------------------------------------
// THE SUBJECT — where the changed-file list comes from
// ---------------------------------------------------------------------------------------------

function git(args, cwd = REPO_ROOT) {
  return execSync(`git ${args}`, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

/**
 * ★ DERIVED FROM THE MERGE-BASE DIFF — NOT from a working tree, NOT from the PR's declared file
 * list, and NOT from the branch point.
 *
 * #566 LANDED 13 FILES WHILE REPORTING 4, AND NO GATE SAW IT. That blind spot has one cause: the
 * number came from a source that was not the thing the merge would apply. This repo SQUASH-merges,
 * and a squash diffs against the base AT MERGE TIME — so a rebased branch can silently re-carry
 * files that a branch-point diff or a cached PR file list never shows.
 *
 * `git merge-base origin/<base_ref> HEAD` recomputed on the CI checkout, then a two-dot diff from
 * it, is the same comparison the squash performs. It cannot inherit #566's blind spot because it
 * does not consult any list that was computed earlier or elsewhere: it re-derives from the two
 * commits that actually exist at run time. The workflow's `fetch-depth: 0` plus its explicit base
 * fetch are what make that resolvable — with a shallow checkout, merge-base fails, and this
 * function then reports `resolved:false`, which is the FULL bar.
 */
export function resolveChangedFiles(env = process.env) {
  const event = env.EVENT_NAME || env.GITHUB_EVENT_NAME || "";
  // ★ A PUSH TO TRUNK ALWAYS TAKES THE FULL BAR, structurally. Every merge produces one, so the
  // integration run cannot be forgotten even if the PR-side heuristic is ever wrong.
  if (event !== "pull_request") {
    // ★ `deliberate` separates POLICY from FAILURE. Both run everything, but a log line that calls
    // a designed always-full-bar path "could not classify" teaches the reader to discount the
    // words — and the next line they discount will be a real one.
    return { files: null, resolved: false, deliberate: true,
      reason: `event=${event || "(unset)"} is not a pull_request — trunk always takes the full bar` };
  }
  const baseRef = env.BASE_REF || env.GITHUB_BASE_REF || "";
  if (!baseRef) return { files: null, resolved: false, reason: "no base ref on the event payload" };
  let mergeBase = "";
  try {
    mergeBase = git(`merge-base "origin/${baseRef}" HEAD`).trim();
  } catch (err) {
    return { files: null, resolved: false,
      reason: `merge-base against origin/${baseRef} failed: ${String(err?.message || err).split("\n")[0]}` };
  }
  if (!/^[0-9a-f]{7,40}$/.test(mergeBase)) {
    return { files: null, resolved: false, reason: `merge-base returned no usable sha ("${mergeBase}")` };
  }
  let out = "";
  try {
    // --no-renames so a file MOVED into handoff/ still shows its old path. A rename collapsed into
    // one path could hide a .ts leaving the source tree.
    out = git(`diff --name-only --no-renames ${mergeBase} HEAD`);
  } catch (err) {
    return { files: null, resolved: false, mergeBase,
      reason: `diff against ${mergeBase.slice(0, 12)} failed: ${String(err?.message || err).split("\n")[0]}` };
  }
  const files = out.split("\n").map((s) => s.trim()).filter(Boolean);
  if (!files.length) {
    return { files: [], resolved: false, mergeBase,
      reason: `the merge-base diff against ${mergeBase.slice(0, 12)} listed no files` };
  }
  return { files, resolved: true, mergeBase, reason: `merge-base ${mergeBase.slice(0, 12)}` };
}

// ---------------------------------------------------------------------------------------------
// --classify : what CI actually runs
// ---------------------------------------------------------------------------------------------

function runClassify() {
  let resolved;
  try {
    resolved = resolveChangedFiles();
  } catch (err) {
    resolved = { files: null, resolved: false, reason: `classifier threw: ${String(err?.message || err)}` };
  }
  const result = classifyChangeset({ ...resolved, prTitle: process.env.PR_TITLE || "" });

  // ★ A GUARD'S OUTPUT MUST NAME ITS SUBJECT, NOT JUST ITS VERDICT. (M4 lives here.)
  if (DEFAULT_RULES.announceSubject) {
    console.log(
      `CI_DOCS_LANE_SCOPE: event=${process.env.EVENT_NAME || "(unset)"} ` +
        `base=${process.env.BASE_REF || "(none)"} merge_base=${(resolved.mergeBase || "(none)").slice(0, 12)} ` +
        `inspected=${result.inspected} docs=${result.docs.length} code=${result.code.length} ` +
        `wave_closer=${result.waveCloser.length ? "yes" : "no"} marker=${result.marker ? "yes" : "no"} ` +
        `resolved=${resolved.resolved ? "yes" : "NO"}`
    );
    if (result.inspected) {
      console.log(`CI_DOCS_LANE_FILES: ${result.docs.concat(result.code).slice(0, 40).join(" ")}`);
    }
  }
  console.log(`CI_DOCS_LANE_VERDICT: ${result.verdict === "docs-only" ? "DOCS-ONLY FAST PATH" : "FULL BAR"} — ${result.reason}`);
  if (result.failedClosed) console.log("CI_DOCS_LANE_FAILED_CLOSED: yes — could not classify, so everything runs");
  else if (result.deliberate) console.log("CI_DOCS_LANE_FULL_BY_POLICY: yes — not a classification failure");

  const out = process.env.GITHUB_OUTPUT;
  if (out) {
    // Only ever writes `true` for a positively-classified docs-only set. Any other outcome writes
    // `false`, and the workflow's `!= 'true'` polarity means even a MISSING output runs everything.
    fs.appendFileSync(out, `docs_only=${result.verdict === "docs-only" ? "true" : "false"}\n`);
    fs.appendFileSync(out, `inspected=${result.inspected}\n`);
    fs.appendFileSync(out, `verdict=${result.verdict}\n`);
  }
  // NEVER non-zero: a crashing classifier must fall back to the full bar, not fail the job.
  process.exitCode = 0;
}

// ---------------------------------------------------------------------------------------------
// The acceptance suite
// ---------------------------------------------------------------------------------------------

const checks = [];
const check = (name, ok, detail) => checks.push({ name, ok: Boolean(ok), detail: detail || "" });

function readText(p) {
  try { return fs.readFileSync(p, "utf8"); } catch { return ""; }
}

/** Split the workflow into `- name:` step blocks so gating can be asserted per step, not by grep. */
function workflowSteps(text) {
  const lines = text.split(/\r?\n/);
  const starts = [];
  lines.forEach((line, i) => { if (/^\s{6}- name:\s*/.test(line)) starts.push(i); });
  return starts.map((start, idx) => {
    const end = idx + 1 < starts.length ? starts[idx + 1] : lines.length;
    const block = lines.slice(start, end).join("\n");
    return { name: lines[start].replace(/^\s{6}- name:\s*/, "").trim(), block, start: start + 1 };
  });
}

/** The comment block immediately preceding a step, i.e. the lines this lane is asked to de-stale. */
function commentBlockBefore(text, stepName) {
  const lines = text.split(/\r?\n/);
  const idx = lines.findIndex((l) => /^\s{6}- name:\s*/.test(l) && l.includes(stepName));
  if (idx === -1) return "";
  const out = [];
  for (let i = idx - 1; i >= 0 && /^\s*#/.test(lines[i]); i -= 1) out.unshift(lines[i]);
  return out.join("\n");
}

const FULL_BAR_STEPS = [
  "Set up Java",
  "Install ripgrep",
  "Firestore rules tests",
  "Root guard matrix",
  "Typecheck (root",
  "Edge security tests",
  "Build (lazytopper)",
  "Ops matrix",
  "Typecheck test files",
  "Vitest suites",
];

const GATE_EXPR = "steps.classify.outputs.docs_only != 'true'";

function runSuite(mutation) {
  const rules = { ...DEFAULT_RULES };
  if (mutation === 1) rules.requireMarkdownExtension = false;
  if (mutation === 2) rules.unresolvableIsFullBar = false;
  if (mutation === 3) rules.waveCloserForcesFull = false;
  if (mutation === 4) rules.announceSubject = false;

  const V = (input) => classifyChangeset({ resolved: true, ...input }, rules).verdict;

  // --- The seven assertions the brief pins -----------------------------------------------------
  check("a1_docs_only_handoff_md_takes_the_fast_path",
    V({ files: ["handoff/NEXT_ACTION.md", "handoff/OPEN_QUESTIONS_AND_FOLLOWUPS.md"] }) === "docs-only",
    "handoff/NEXT_ACTION.md + handoff/OPEN_QUESTIONS_AND_FOLLOWUPS.md — the shape of #577");

  // ★ THREE SHAPES DELIBERATELY. The source-tree path is rejected by the DIRECTORY rule, so it
  //   alone would keep passing under M1 and the mutation would prove nothing. The other two are
  //   rejected by the EXTENSION rule and nothing else — they are what makes M1 bite.
  check("a2_one_ts_file_forces_the_full_bar",
    V({ files: ["handoff/NEXT_ACTION.md", "lazytopper/src/pages/Home.tsx"] }) === "full" &&
      V({ files: ["handoff/NEXT_ACTION.md", "handoff/migrate.ts"] }) === "full" &&
      V({ files: ["handoff/NEXT_ACTION.md", "release.ts"] }) === "full",
    "a source .tsx, a .ts inside handoff/, and a .ts at the repo root");

  check("a3_one_yml_file_forces_the_full_bar",
    V({ files: ["handoff/NEXT_ACTION.md", ".github/workflows/quality-gate.yml"] }) === "full",
    "a workflow edit is code — this PR's own shape");

  check("a4_a_root_markdown_file_alone_takes_the_fast_path",
    V({ files: ["CLAUDE.md"] }) === "docs-only",
    "a root *.md with no directory component");

  // ★ THE ONE THAT MATTERS. Both sub-cases: nothing resolved, and an empty list.
  check("a5_unresolvable_or_empty_change_list_fails_closed_to_full",
    V({ files: null, resolved: false, reason: "test" }) === "full" &&
      V({ files: [], resolved: true }) === "full" &&
      V({ files: [], resolved: false }) === "full",
    "an empty list is NOT 'nothing changed' — it is 'we do not know', which runs everything");

  check("a6_wave_closer_forces_full_on_a_pure_markdown_changeset",
    V({ files: ["handoff/CURRENT_STATE.md", "handoff/SESSION_LOG.md", "handoff/NEXT_ACTION.md"] }) === "full" &&
      V({ files: ["handoff/NEXT_ACTION.md"], prTitle: "docs(handoff): thing [ci-full]" }) === "full",
    "the #600 / #576 / #553 shape, plus the explicit [ci-full] override");

  {
    // ★ M4 is asserted on the RENDERED output, not on the flag — a flag nobody prints is not a
    // subject line. Capture what --classify would emit for a known changeset.
    const r = classifyChangeset(
      { files: ["handoff/NEXT_ACTION.md", "handoff/SURFACE_TRACKER.md"], resolved: true }, rules);
    const line = rules.announceSubject
      ? `CI_DOCS_LANE_SCOPE: inspected=${r.inspected} docs=${r.docs.length} code=${r.code.length}`
      : "";
    check("a7_the_classifier_names_its_subject_not_only_its_verdict",
      /inspected=2\b/.test(line) && /docs=2\b/.test(line) && Boolean(r.reason),
      line || "(subject line suppressed)");
  }

  // --- Rules the brief's section 6 forbids breaking --------------------------------------------
  // ★ THE COMPANION MARKDOWN IS DELIBERATELY *NOT* A WAVE-CLOSER FILE. Paired with
  //   CURRENT_STATE.md this check passed under M1 — but for the wrong reason: the wave-closer rule
  //   was carrying it, and the extension rule it claims to test was never exercised. A check that
  //   passes for a reason other than the one it names is asserting nothing.
  check("a8_a_non_markdown_file_under_handoff_is_code",
    V({ files: ["handoff/NEXT_ACTION.md", "handoff/tool.mjs"] }) === "full",
    "do not classify by directory alone — handoff/ could one day hold a script");

  const wf = readText(WORKFLOW_PATH);
  const steps = workflowSteps(wf);

  {
    // Strip comments: the rules may be DESCRIBED in prose, but must not be RE-IMPLEMENTED in shell.
    const wfCode = wf.replace(/^\s*#.*$/gm, "");
    check("a9_the_workflow_calls_this_module_and_keeps_no_private_copy",
      /ci_docs_lane_acceptance\.mjs\s+--classify/.test(wf) &&
        !/handoff\//.test(wfCode) && !/\.md\b/.test(wfCode),
      "quality-gate.yml must delegate the decision here, not re-implement the rules in shell — " +
        "a second copy of a classifier drifts, and the suite keeps testing the first one");
  }

  check("a10_the_changed_file_list_comes_from_the_merge_base",
    /git\s+merge-base/.test(readText(fileURLToPath(import.meta.url))) &&
      /--no-renames/.test(readText(fileURLToPath(import.meta.url))),
    "the #566 blind spot: a squash diffs against the base AT MERGE TIME");

  {
    const mojibake = steps.find((s) => /Mojibake check/.test(s.name));
    check("a11_mojibake_runs_on_every_path",
      Boolean(mojibake) && !/^\s{8}if:/m.test(mojibake.block),
      mojibake ? "the Mojibake step carries no `if:` — it is the one gate a docs PR can fail"
               : "the Mojibake step is missing from quality-gate.yml");
  }

  {
    const missing = FULL_BAR_STEPS.filter((n) => {
      const s = steps.find((x) => x.name.includes(n));
      return !s || !s.block.includes(GATE_EXPR);
    });
    check("a12_every_full_bar_step_is_gated_by_the_same_expression",
      missing.length === 0,
      missing.length ? `ungated or missing: ${missing.join(", ")}`
                     : `${FULL_BAR_STEPS.length} steps all gated on \`${GATE_EXPR}\``);
  }

  check("a13_no_workflow_level_paths_filter",
    !/^\s*paths(-ignore)?:/m.test(wf),
    "quality-gate is a REQUIRED check; a required check that never runs leaves the PR stuck on " +
      "\"expected — waiting for status\", unmergeable with no error. Classify INSIDE the job.");

  check("a14_a_push_to_trunk_always_takes_the_full_bar",
    /event !== "pull_request"/.test(readText(fileURLToPath(import.meta.url))) &&
      /push:\s*\n\s*branches:\s*\[base\/approved-thru-437\]/.test(wf),
    "every merge produces a push run, so the integration check cannot be forgotten");

  // --- [FU-SEC1-CI-WIRE-SERVER-TESTS] — the durable half of the fix ----------------------------
  // ★ WIRING TWO SUITES ONCE IS NOT A FIX. SEC-1's suites were green locally and ungated in CI,
  //   and nothing would have said so. This check enumerates the server suites from DISK and demands
  //   each one appear in the matrix chain, so the NEXT unwired suite goes red instead of silent.
  {
    const pkg = JSON.parse(readText(ANCHOR_PACKAGE_JSON) || "{}");
    const chain = String(pkg.scripts?.["test:matrix:all"] || "");
    const found = [];
    const walk = (dir) => {
      let entries = [];
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) { if (e.name !== "node_modules") walk(full); }
        else if (/\.test\.cjs$/.test(e.name)) found.push(path.relative(ANCHOR, full).replace(/\\/g, "/"));
      }
    };
    walk(path.join(ANCHOR, "server"));
    const scriptFor = (rel) =>
      Object.entries(pkg.scripts || {}).find(([k, v]) => k.startsWith("test:server:") && String(v).includes(rel));
    const unwired = found.filter((rel) => {
      const entry = scriptFor(rel);
      return !entry || !new RegExp(`\\b${entry[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(chain);
    });
    check("a15_every_server_test_cjs_is_wired_into_the_matrix_chain",
      found.length > 0 && unwired.length === 0,
      unwired.length ? `UNWIRED (green locally, ungated in CI): ${unwired.join(", ")}`
                     : `${found.length} server .test.cjs suites enumerated from disk, all wired`);
  }

  check("a16_this_suite_is_itself_wired_into_the_matrix_chain",
    /"test:matrix:all":[^\n]*test:ci:docs-lane/.test(readText(ANCHOR_PACKAGE_JSON)),
    "a guard nobody invokes guards nothing");

  // --- Section 5: the two stale comments, and the shape that stops them re-staling --------------
  check("a17_the_two_stale_counts_are_gone",
    !/5 suites, 175\/175/.test(wf) && !/59 suites were NEVER gated/.test(wf),
    "both numbers were true once; neither was true at 81d0d53c");

  {
    const rootBlock = commentBlockBefore(wf, "Root guard matrix");
    const vitestBlock = commentBlockBefore(wf, "Vitest suites");
    // ★ A COUNT IN A COMMENT IS A DERIVED VALUE WITH NO TEST BEHIND IT. The replacement must point
    //   at the source instead of restating the number, or it re-stales exactly the same way.
    const restatesACount = /\b\d+\s*(?:suites?|tests?|test files|checks?)\b/i.test(rootBlock);
    const pointsAtTheRun = /read[^\n]*\b(log|run)\b/i.test(rootBlock) && /read[^\n]*\b(log|run)\b/i.test(vitestBlock);
    check("a18_the_replacement_comments_point_at_the_run_instead_of_restating_a_count",
      !restatesACount && pointsAtTheRun,
      restatesACount ? "the root-matrix comment still states a count"
                     : "both comments send the reader to the step's own log for the totals");
  }

  // --- Report ----------------------------------------------------------------------------------
  const failed = checks.filter((c) => !c.ok);
  for (const c of checks) console.log(`${c.ok ? "ok  " : "FAIL"} ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
  console.log(
    `\nCI_DOCS_LANE_ACCEPTANCE_SCOPE: workflow=${path.relative(REPO_ROOT, WORKFLOW_PATH).replace(/\\/g, "/")} ` +
      `steps_parsed=${steps.length} checks=${checks.length} mutation=${mutation || "none"}`
  );

  if (mutation) {
    const TARGET = { 1: "a2_one_ts_file_forces_the_full_bar",
                     2: "a5_unresolvable_or_empty_change_list_fails_closed_to_full",
                     3: "a6_wave_closer_forces_full_on_a_pure_markdown_changeset",
                     4: "a7_the_classifier_names_its_subject_not_only_its_verdict" }[mutation];
    const target = checks.find((c) => c.name === TARGET);
    if (target?.ok) {
      console.error(
        `\nMUTATION CONTROL FAILED: mutation ${mutation} applied and ${TARGET} STILL PASSED. ` +
          "This suite does not detect the defect it claims to."
      );
      process.exitCode = 1;
      return;
    }
    console.log(`\nMUTATION CONTROL OK — mutation ${mutation} turned ${TARGET} RED (${failed.length}/${checks.length} failed).`);
    return;
  }

  if (failed.length) {
    console.error(`\nCI docs-lane acceptance FAILED (${failed.length}/${checks.length}).`);
    process.exitCode = 1;
    return;
  }
  console.log(`\nCI docs-lane acceptance PASSED — ${checks.length}/${checks.length} checks green.`);
}

// ---------------------------------------------------------------------------------------------

// ★ ONLY WHEN RUN AS A SCRIPT. Without this guard, `import`ing the classifier to reuse its rules
// ALSO executed the whole acceptance suite as a side effect — which is how the first replay of this
// lane's own classifier against real trunk merges printed 18 green checks nobody asked for, ahead
// of the answer. A module that runs a test suite on import cannot be composed with anything.
const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (invokedDirectly) {
  const argv = process.argv.slice(2);
  if (argv.includes("--classify")) {
    runClassify();
  } else {
    const m = argv.find((a) => a.startsWith("--mutate"));
    const n = m ? Number(m.split("=")[1] || "0") : 0;
    runSuite(Number.isFinite(n) && n >= 1 && n <= 4 ? n : 0);
  }
}
