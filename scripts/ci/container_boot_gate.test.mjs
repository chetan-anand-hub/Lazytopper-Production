// Tests for the container-boot classifier (scripts/ci/container_boot_gate.mjs).
// Run: node --test scripts/ci/container_boot_gate.test.mjs   (no dependencies; needs git)
//
// The push cases run against a REAL temporary git repository, so `before..HEAD`, ancestry and
// missing-object handling are exercised through git itself, not a stub of it.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { decideBoot, imageHits, nonSkippable } from "./container_boot_gate.mjs";

const OK = () => "success";

const SCRIPT = fileURLToPath(new URL("./container_boot_gate.mjs", import.meta.url));

function makeRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "boot-gate-"));
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

test("imageHits: the relevance list is unchanged in kind", () => {
  assert.deepEqual(imageHits(["handoff/X.md", "Dockerfile", "lazytopper/package.json", "lazytopper/src/a.ts"]),
    ["Dockerfile", "lazytopper/package.json"]);
  assert.deepEqual(imageHits(["lazytopper/server/index.cjs", "artifacts/api-server/src/index.ts"]).length, 2);
  assert.deepEqual(imageHits(["docs/a.md", "lazytopper/src/pages/X.tsx"]), []);
});

test("push: an image-relevant file in before..HEAD -> BOOT", () => {
  const r = makeRepo();
  const before = r.commit("README.md", "a");
  r.commit("handoff/NOTE.md", "b");
  r.commit("Dockerfile", "FROM node");
  const d = decideBoot({ event: "push", pushBefore: before, git: r.git, prevBoot: OK });
  assert.equal(d.skip, false);
  assert.deepEqual(d.hits, ["Dockerfile"]);
  assert.match(d.reason, /not on the skip list/);
});

test("push: docs only in before..HEAD (previous boot green) -> SKIP", () => {
  const r = makeRepo();
  r.commit("Dockerfile", "FROM node");
  const before = r.commit("README.md", "a");
  r.commit("handoff/NOTE.md", "b");
  r.commit("docs/design/x.md", "c");
  r.commit("AGENTS.md", "d");
  const d = decideBoot({ event: "push", pushBefore: before, git: r.git, prevBoot: OK });
  assert.equal(d.skip, true, d.reason);
  assert.deepEqual(d.hits, []);
  assert.equal(d.files.length, 3);
});

test("push: handoff/CURRENT_STATE.md only -> SKIP", () => {
  const r = makeRepo();
  const before = r.commit("Dockerfile", "FROM node");
  r.commit("handoff/CURRENT_STATE.md", "x");
  assert.equal(decideBoot({ event: "push", pushBefore: before, git: r.git, prevBoot: OK }).skip, true);
});

// Review of #1265: RELEVANT misses paths the image loads at boot (the gateway compiles
// lazytopper/src/** at runtime; `COPY . .`). On a push, every one of these must BOOT.
for (const file of [
  "lazytopper/src/tutor/hintLadder.ts",
  "lazytopper/src/data/bsre/x.json",
  "lazytopper/src/data/bsre/hint_ladder_policy_triangles_v1.md", // .md read at runtime
  "tsconfig.base.json",
  "lib/db/src/index.ts",
  "notes/specs/a.json", // read by the build via import.meta.glob
  ".npmrc",
  ".github/workflows/container-boot.yml", // the gate's own machinery
  "some-new-top-level-dir/file.txt", // unknown -> boot
]) {
  test(`push: ${file} only -> BOOT`, () => {
    const r = makeRepo();
    const before = r.commit("README.md", "a");
    r.commit(file, "x");
    const d = decideBoot({ event: "push", pushBefore: before, git: r.git, prevBoot: OK });
    assert.equal(d.skip, false, d.reason);
    assert.deepEqual(d.hits, [file]);
  });
}

test("push: mixed markdown + src -> BOOT", () => {
  const r = makeRepo();
  const before = r.commit("README.md", "a");
  r.commit("handoff/CURRENT_STATE.md", "x");
  r.commit("lazytopper/src/pages/X.tsx", "x");
  const d = decideBoot({ event: "push", pushBefore: before, git: r.git, prevBoot: OK });
  assert.equal(d.skip, false);
  assert.deepEqual(d.hits, ["lazytopper/src/pages/X.tsx"]);
});

test("nonSkippable: only top-level .md, and .github minus container-boot.yml, are skippable", () => {
  assert.deepEqual(nonSkippable(["CLAUDE.md", "handoff/a.md", "ops/x/AGENT.md", ".github/workflows/quality-gate.yml"]), []);
  assert.deepEqual(nonSkippable(["lazytopper/README.md", "ops/evals/run.mjs", ".github/workflows/container-boot.yml"]),
    ["lazytopper/README.md", "ops/evals/run.mjs", ".github/workflows/container-boot.yml"]);
});

test("push: docs-only, but the previous trunk boot did not pass / is unreadable -> BOOT", () => {
  const r = makeRepo();
  const before = r.commit("README.md", "a");
  r.commit("handoff/a.md", "b");
  for (const prevBoot of [() => "failure", () => "cancelled", () => "still in_progress", () => "no run found",
    () => { throw new Error("HTTP 403"); }]) {
    const d = decideBoot({ event: "push", pushBefore: before, git: r.git, prevBoot });
    assert.equal(d.skip, false, d.reason);
    assert.match(d.reason, /previous trunk boot/);
  }
  let asked = null;
  decideBoot({ event: "push", pushBefore: before, git: r.git, prevBoot: (b) => { asked = b; return "success"; } });
  assert.equal(asked, before, "the run consulted is the one for PUSH_BEFORE");
});

test("push: only commits AFTER before count (an older image change does not re-boot)", () => {
  const r = makeRepo();
  r.commit("pnpm-lock.yaml", "lock");
  const before = r.head();
  r.commit("docs/a.md", "a");
  assert.equal(decideBoot({ event: "push", pushBefore: before, git: r.git, prevBoot: OK }).skip, true);
});

test("push: unknown before SHA -> BOOT (unset, empty, all-zero, short, garbage)", () => {
  const r = makeRepo();
  r.commit("docs/a.md", "a");
  for (const pushBefore of [undefined, "", "0".repeat(40), "abc123", "not-a-sha-at-all-not-a-sha-at-all-xxxxx"]) {
    const d = decideBoot({ event: "push", pushBefore, git: r.git, prevBoot: OK });
    assert.equal(d.skip, false, `before=${JSON.stringify(pushBefore)}`);
    assert.match(d.reason, /RUNNING \(fail-safe\)/);
  }
});

test("push: before SHA not present in the checkout -> BOOT", () => {
  const r = makeRepo();
  r.commit("docs/a.md", "a");
  const d = decideBoot({ event: "push", pushBefore: "1234567890abcdef1234567890abcdef12345678", git: r.git, prevBoot: OK });
  assert.equal(d.skip, false);
  assert.match(d.reason, /fail-safe/);
});

test("push: force push (before is not an ancestor of HEAD) -> BOOT, even when the diff is docs-only", () => {
  const r = makeRepo();
  const base = r.commit("docs/a.md", "a");
  const rewritten = r.commit("docs/b.md", "b"); // the old trunk tip
  r.git(["reset", "-q", "--hard", base]);
  r.commit("docs/c.md", "c"); // the force-pushed new tip
  const d = decideBoot({ event: "push", pushBefore: rewritten, git: r.git, prevBoot: OK });
  assert.equal(d.skip, false);
  assert.match(d.reason, /fast-forward/);
});

test("push: empty diff -> BOOT", () => {
  const r = makeRepo();
  const head = r.commit("docs/a.md", "a");
  assert.equal(decideBoot({ event: "push", pushBefore: head, git: r.git, prevBoot: OK }).skip, false);
});

test("push: any git error -> BOOT", () => {
  const boom = () => { throw new Error("git exploded"); };
  const d = decideBoot({ event: "push", pushBefore: "a".repeat(40), git: boom, prevBoot: OK });
  assert.equal(d.skip, false);
  assert.match(d.reason, /git exploded/);
});

test("pull_request: behaviour unchanged (merge-base diff; docs skip, image boots, failure boots)", () => {
  const fake = (files) => (args) => (args[0] === "merge-base" ? "mb\n" : files.join("\n"));
  assert.equal(decideBoot({ event: "pull_request", baseRef: "trunk", git: fake(["handoff/a.md"]) }).skip, true);
  const img = decideBoot({ event: "pull_request", baseRef: "trunk", git: fake(["docs/a.md", "railway.json"]) });
  assert.equal(img.skip, false);
  assert.deepEqual(img.hits, ["railway.json"]);
  assert.equal(decideBoot({ event: "pull_request", baseRef: "trunk", git: () => { throw new Error("no base"); } }).skip, false);
  assert.equal(decideBoot({ event: "pull_request", baseRef: "", git: fake([]) }).skip, false);
  // A PR never consults PUSH_BEFORE.
  assert.equal(decideBoot({ event: "pull_request", baseRef: "trunk", pushBefore: "0".repeat(40), git: fake(["docs/a.md"]) }).skip, true);
});

test("workflow_dispatch and unknown events -> BOOT", () => {
  for (const event of ["workflow_dispatch", "merge_group", "", undefined]) {
    assert.equal(decideBoot({ event, git: () => "docs/a.md" }).skip, false, `event=${event}`);
  }
});

test("CLI --classify: docs-only push skips only when the real gh reader sees a green previous boot", () => {
  const r = makeRepo();
  const before = r.commit("docs/a.md", "a");
  r.commit("docs/b.md", "b");
  const out = path.join(r.dir, "..", `${path.basename(r.dir)}.out`);
  // A fake `gh` on PATH stands in for the GitHub API; it answers with $FAKE_RUNS.
  const bin = fs.mkdtempSync(path.join(os.tmpdir(), "boot-gate-bin-"));
  fs.writeFileSync(path.join(bin, "gh"), `#!/bin/sh\nprintf '%s' "$FAKE_RUNS"\n`, { mode: 0o755 });
  const runs = (conclusion, status = "completed") =>
    JSON.stringify({ workflow_runs: [{ head_sha: before, status, conclusion, created_at: "2026-10-19T00:00:00Z" }] });
  const runCli = (pushBefore, fakeRuns, extraEnv = {}) => {
    fs.writeFileSync(out, "");
    const res = spawnSync(process.execPath, [SCRIPT, "--classify"], {
      cwd: r.dir, encoding: "utf8",
      env: { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}`, EVENT_NAME: "push", BASE_REF: "",
        PUSH_BEFORE: pushBefore, GITHUB_OUTPUT: out, GITHUB_REPOSITORY: "o/r", GITHUB_REF_NAME: "trunk",
        FAKE_RUNS: fakeRuns, ...extraEnv },
    });
    assert.equal(res.status, 0, res.stderr);
    return fs.readFileSync(out, "utf8");
  };
  assert.match(runCli(before, runs("success")), /^skip=true$/m);
  assert.match(runCli(before, runs("failure")), /^skip=false$/m);
  assert.match(runCli(before, runs(null, "in_progress")), /^skip=false$/m);
  assert.match(runCli(before, "not json"), /^skip=false$/m);
  assert.match(runCli(before, runs("success"), { GITHUB_REPOSITORY: "" }), /^skip=false$/m);
  assert.match(runCli("", runs("success")), /^skip=false$/m);
  r.commit("artifacts/api-server/src/index.ts", "x");
  assert.match(runCli(before, runs("success")), /^skip=false$/m);
});

test("importing the module does not run the CLI", () => {
  // If it did, the import at the top of this file would already have exited the process (code 2).
  assert.equal(typeof decideBoot, "function");
});
