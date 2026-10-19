// Tests for the shared docs-only push rule (scripts/ci/docs_only_push.mjs, CI-COST-3).
// Run: node --test scripts/ci/docs_only_push.test.mjs   (no dependencies; needs git)
//
// Push cases run against a REAL temporary git repository, so `before..HEAD`, ancestry, renames
// and missing objects go through git itself. The workflow-shape checks are textual on purpose:
// this file runs on a bare runner (container-boot.yml's self-test step) with no install.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { decide, decidePush, notSkippable, prevRunReader, skipListFor } from "./docs_only_push.mjs";
import { nonSkippable as bootNonSkippable } from "./container_boot_gate.mjs";

const OK = () => "success";
const SCRIPT = fileURLToPath(new URL("./docs_only_push.mjs", import.meta.url));
const REPO = path.resolve(path.dirname(SCRIPT), "..", "..");
const GATED = ["golden-eval.yml", "search-ping.yml", "state-board.yml"];

function makeRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "docs-only-"));
  const git = (args) => execFileSync("git", args, { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  git(["init", "-q", "-b", "trunk"]);
  git(["config", "user.email", "t@example.com"]);
  git(["config", "user.name", "t"]);
  git(["config", "commit.gpgsign", "false"]);
  const commit = (file, body) => {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), body);
    git(["add", "-A"]);
    git(["commit", "-q", "-m", `touch ${file}`]);
    return git(["rev-parse", "HEAD"]).trim();
  };
  return { dir, git, commit, head: () => git(["rev-parse", "HEAD"]).trim() };
}

const push = (r, before, workflowFile, prevRun = OK) =>
  decidePush({ pushBefore: before, git: r.git, prevRun, workflowFile });

test("the skip list for container-boot.yml is the CI-COST-2 list (one shared copy)", () => {
  const probe = [
    "handoff/a.md", "docs/x/y.png", "ledger/MERGE_LEDGER.md", "screenshots/a.png", "ops/x/AGENT.md",
    "CLAUDE.md", ".claude/settings.json", ".github/CODEOWNERS", ".github/workflows/quality-gate.yml",
    ".github/workflows/container-boot.yml", "lazytopper/README.md", "ops/evals/run.mjs", "lazytopper/src/a.ts",
    "scripts/ci/docs_only_push.mjs", "notes/a.md", "x.mdx", "a/b.md",
  ];
  assert.deepEqual(notSkippable(probe, "container-boot.yml"), bootNonSkippable(probe));
  assert.deepEqual(bootNonSkippable(probe), [
    ".github/workflows/container-boot.yml", "lazytopper/README.md", "ops/evals/run.mjs", "lazytopper/src/a.ts",
    "scripts/ci/docs_only_push.mjs", "notes/a.md", "x.mdx", "a/b.md",
  ]);
});

for (const wf of GATED) {
  test(`${wf}: its OWN workflow file runs; other workflows and docs skip`, () => {
    assert.deepEqual(notSkippable([`.github/workflows/${wf}`], wf), [`.github/workflows/${wf}`]);
    const others = GATED.filter((w) => w !== wf).map((w) => `.github/workflows/${w}`);
    assert.deepEqual(notSkippable([...others, ".github/workflows/container-boot.yml", "handoff/CURRENT_STATE.md"], wf), []);
    // A workflow file whose name merely starts with the gated one is not the gated one.
    assert.deepEqual(notSkippable([`.github/workflows/${wf}.bak`], wf), []);
    assert.equal(skipListFor(wf).length, 8);
  });

  test(`${wf}: docs-only push with a green predecessor -> SKIP; any code path -> RUN`, () => {
    const r = makeRepo();
    r.commit("lazytopper/src/a.ts", "x");
    const before = r.commit("README.md", "a");
    r.commit("handoff/NEXT_ACTION.md", "b");
    r.commit("docs/plan.md", "c");
    const d = push(r, before, wf);
    assert.equal(d.skip, true, d.reason);
    assert.equal(d.files.length, 2);
    assert.match(d.reason, new RegExp(`previous trunk run passed`));
    r.commit("scripts/ci/docs_only_push.mjs", "machinery");
    const d2 = push(r, before, wf);
    assert.equal(d2.skip, false);
    assert.deepEqual(d2.hits, ["scripts/ci/docs_only_push.mjs"]);
  });
}

// Paths each gated workflow actually reads. A docs-only verdict on any of them would be a hole.
for (const file of [
  "lazytopper/server/eval/golden/runs/x/manifest.json", // golden data
  "lazytopper/server/eval/golden/case.md", // golden markdown is DATA
  "lazytopper/public/sitemap.xml", // search-ping diffs it
  "lazytopper/scripts/seo/searchPing.ts",
  "scripts/ops/state_board.mjs", // state-board's builder
  "vercel.json",
  "lazytopper/src/data/bsre/notes.md", // .md read at runtime
  "pnpm-lock.yaml",
  "some-new-dir/file.txt", // unknown -> run
]) {
  test(`push: ${file} only -> RUN for every gated workflow`, () => {
    const r = makeRepo();
    const before = r.commit("README.md", "a");
    r.commit(file, "x");
    for (const wf of GATED) assert.equal(push(r, before, wf).skip, false, `${wf}: ${file}`);
  });
}

test("push: a RENAME of code into docs/ is not docs-only (both sides are listed)", () => {
  const r = makeRepo();
  r.commit("lazytopper/src/feature.ts", "export const a = 1;\n".repeat(20));
  const before = r.head();
  fs.mkdirSync(path.join(r.dir, "docs"), { recursive: true });
  r.git(["mv", "lazytopper/src/feature.ts", "docs/feature.ts"]);
  r.git(["commit", "-q", "-m", "move"]);
  // CONTROL: git's default (rename detection) prints only the new path — that alone would skip.
  assert.deepEqual(r.git(["diff", "--name-only", "-M", `${before}..HEAD`]).trim().split("\n"), ["docs/feature.ts"]);
  const d = push(r, before, "golden-eval.yml");
  assert.equal(d.skip, false, d.reason);
  assert.deepEqual(d.hits, ["lazytopper/src/feature.ts"]);
});

test("push: predecessor not green / unreadable / no reader -> RUN, and the run consulted is PUSH_BEFORE's", () => {
  const r = makeRepo();
  const before = r.commit("README.md", "a");
  r.commit("handoff/a.md", "b");
  for (const prevRun of [() => "failure", () => "cancelled", () => "still in_progress", () => "still queued",
    () => "no run found", () => "null", () => { throw new Error("HTTP 403"); }, null]) {
    const d = decidePush({ pushBefore: before, git: r.git, prevRun, workflowFile: "state-board.yml" });
    assert.equal(d.skip, false, d.reason);
    assert.match(d.reason, /previous trunk run/);
  }
  let asked = null;
  push(r, before, "state-board.yml", (b) => { asked = b; return "success"; });
  assert.equal(asked, before);
});

test("push: fail-safe ladder (unknown/zero/short before, absent object, force push, empty diff, git error) -> RUN", () => {
  const r = makeRepo();
  const base = r.commit("docs/a.md", "a");
  for (const b of [undefined, "", "0".repeat(40), "abc123", "z".repeat(40), "1234567890abcdef1234567890abcdef12345678"]) {
    assert.equal(push(r, b, "golden-eval.yml").skip, false, `before=${JSON.stringify(b)}`);
  }
  const rewritten = r.commit("docs/b.md", "b");
  r.git(["reset", "-q", "--hard", base]);
  r.commit("docs/c.md", "c");
  assert.match(push(r, rewritten, "golden-eval.yml").reason, /fast-forward/);
  assert.match(push(r, r.head(), "golden-eval.yml").reason, /empty diff/);
  const boom = decidePush({ pushBefore: "a".repeat(40), git: () => { throw new Error("git exploded"); }, prevRun: OK, workflowFile: "golden-eval.yml" });
  assert.equal(boom.skip, false);
  assert.match(boom.reason, /git exploded/);
});

test("decide: ONLY push can skip — pull_request, schedule, dispatch, deployment_status always run", () => {
  const r = makeRepo();
  const before = r.commit("README.md", "a");
  r.commit("handoff/a.md", "b");
  assert.equal(decide({ event: "push", pushBefore: before, workflowFile: "golden-eval.yml", git: r.git, prevRun: OK }).skip, true);
  for (const event of ["pull_request", "schedule", "workflow_dispatch", "deployment_status", "", undefined]) {
    const d = decide({ event, pushBefore: before, workflowFile: "golden-eval.yml", git: r.git, prevRun: OK });
    assert.equal(d.skip, false, `event=${event}`);
  }
  assert.equal(decide({ event: "push", pushBefore: before, workflowFile: "", git: r.git, prevRun: OK }).skip, false);
});

test("prevRunReader: queries THIS workflow's push runs for `before`, newest first", () => {
  const before = "b".repeat(40);
  let query = null;
  const exec = (cmd, args) => {
    query = args[1];
    return JSON.stringify({ workflow_runs: [
      { head_sha: before, status: "completed", conclusion: "failure", created_at: "2026-10-19T01:00:00Z" },
      { head_sha: before, status: "completed", conclusion: "success", created_at: "2026-10-19T02:00:00Z" },
      { head_sha: "c".repeat(40), status: "completed", conclusion: "failure", created_at: "2026-10-19T03:00:00Z" },
    ] });
  };
  const read = prevRunReader("search-ping.yml", { exec, env: { GITHUB_REPOSITORY: "o/r", GITHUB_REF_NAME: "base/approved-thru-437" } });
  assert.equal(read(before), "success");
  assert.match(query, /^repos\/o\/r\/actions\/workflows\/search-ping\.yml\/runs\?event=push&branch=base%2Fapproved-thru-437&head_sha=b{40}&/);
  assert.throws(() => prevRunReader("x.yml", { exec, env: {} })(before), /unset/);
});

test("CLI: writes docs_only=true ONLY for a proven docs-only push; anything else false, exit 0", () => {
  const r = makeRepo();
  const before = r.commit("docs/a.md", "a");
  r.commit("handoff/b.md", "b");
  const out = path.join(r.dir, "..", `${path.basename(r.dir)}.out`);
  const bin = fs.mkdtempSync(path.join(os.tmpdir(), "docs-only-bin-"));
  fs.writeFileSync(path.join(bin, "gh"), `#!/bin/sh\nprintf '%s' "$FAKE_RUNS"\n`, { mode: 0o755 });
  const runs = (conclusion, status = "completed") =>
    JSON.stringify({ workflow_runs: [{ head_sha: before, status, conclusion, created_at: "2026-10-19T00:00:00Z" }] });
  const runCli = (argv, env) => {
    fs.writeFileSync(out, "");
    const res = spawnSync(process.execPath, [SCRIPT, ...argv], {
      cwd: r.dir, encoding: "utf8",
      env: { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}`, EVENT_NAME: "push",
        PUSH_BEFORE: before, GITHUB_OUTPUT: out, GITHUB_REPOSITORY: "o/r", GITHUB_REF_NAME: "trunk",
        FAKE_RUNS: runs("success"), ...env },
    });
    assert.equal(res.status, 0, res.stderr);
    return fs.readFileSync(out, "utf8");
  };
  const W = ["--workflow", "golden-eval.yml"];
  assert.match(runCli(W, {}), /^docs_only=true$/m);
  assert.match(runCli(W, { FAKE_RUNS: runs("failure") }), /^docs_only=false$/m);
  assert.match(runCli(W, { FAKE_RUNS: runs(null, "in_progress") }), /^docs_only=false$/m);
  assert.match(runCli(W, { FAKE_RUNS: "not json" }), /^docs_only=false$/m);
  assert.match(runCli(W, { GITHUB_REPOSITORY: "" }), /^docs_only=false$/m);
  assert.match(runCli(W, { EVENT_NAME: "pull_request" }), /^docs_only=false$/m);
  assert.match(runCli(W, { EVENT_NAME: "workflow_dispatch" }), /^docs_only=false$/m);
  assert.match(runCli(W, { PUSH_BEFORE: "" }), /^docs_only=false$/m);
  assert.match(runCli([], {}), /^docs_only=false$/m);
  r.commit("lazytopper/src/x.ts", "x");
  assert.match(runCli(W, {}), /^docs_only=false$/m);
});

// ── The wiring in the three gated workflows (textual: no YAML parser on a bare runner) ──────────
const GATE_IF = "github.event_name != 'push' || steps.docs.outputs.docs_only != 'true'";
for (const [wf, gatedSteps] of [
  ["golden-eval.yml", ["G1 — golden gate", "G1 + G2 — golden suites"]],
  ["state-board.yml", ["Build ledger record", "Commit + push ledger"]],
]) {
  test(`${wf}: the classifier runs on push only, for this workflow, fail-safe; each expensive step is gated`, () => {
    const y = fs.readFileSync(path.join(REPO, ".github", "workflows", wf), "utf8");
    const step = (name) => {
      const i = y.indexOf(`- name: ${name}`);
      assert.notEqual(i, -1, `${wf}: no step "${name}"`);
      const next = y.indexOf("\n      - ", i + 1);
      return y.slice(i, next === -1 ? undefined : next);
    };
    const cls = step("Docs-only push?");
    assert.match(cls, /\n\s+id: docs\n/);
    assert.match(cls, /\n\s+if: github\.event_name == 'push'\n/);
    assert.match(cls, /\n\s+continue-on-error: true\n/);
    assert.match(cls, new RegExp(`run: node scripts/ci/docs_only_push\\.mjs --workflow ${wf.replace(".", "\\.")}\\n`));
    assert.match(cls, /PUSH_BEFORE: \$\{\{ github\.event\.before \}\}/);
    for (const name of gatedSteps) assert.ok(step(name).includes(`if: ${GATE_IF}\n`), `${wf}: "${name}" is not gated`);
    // History for a push only; every other event keeps the depth-1 checkout it had.
    assert.match(y, /fetch-depth: \$\{\{ github\.event_name == 'push' && '0' \|\| '1' \}\}/);
    assert.match(y, /\n\s+actions: read\n/);
    // The trigger set is untouched (no paths filter added).
    assert.doesNotMatch(y, /^\s+paths(-ignore)?:/m);
  });
}

test("search-ping.yml: a classify job gates `ping` on push only; ping keeps !cancelled() so a failed classifier still pings", () => {
  const y = fs.readFileSync(path.join(REPO, ".github", "workflows", "search-ping.yml"), "utf8");
  assert.match(y, /run: node scripts\/ci\/docs_only_push\.mjs --workflow search-ping\.yml\n/);
  assert.match(y, /\n  ping:\n    needs: classify\n/);
  assert.match(y, /if: \$\{\{ !cancelled\(\) && \(github\.event_name != 'push' \|\| needs\.classify\.outputs\.docs_only != 'true'\) && \(/);
  assert.match(y, /docs_only: \$\{\{ steps\.docs\.outputs\.docs_only \}\}/);
});

test("importing the module does not run the CLI", () => {
  assert.equal(typeof decidePush, "function");
});
