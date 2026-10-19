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
import { decideBoot, imageHits } from "./container_boot_gate.mjs";

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
  const d = decideBoot({ event: "push", pushBefore: before, git: r.git });
  assert.equal(d.skip, false);
  assert.deepEqual(d.hits, ["Dockerfile"]);
  assert.match(d.reason, /image-relevant paths changed/);
});

test("push: docs only in before..HEAD -> SKIP", () => {
  const r = makeRepo();
  r.commit("Dockerfile", "FROM node");
  const before = r.commit("README.md", "a");
  r.commit("handoff/NOTE.md", "b");
  r.commit("lazytopper/src/pages/X.tsx", "x");
  const d = decideBoot({ event: "push", pushBefore: before, git: r.git });
  assert.equal(d.skip, true);
  assert.deepEqual(d.hits, []);
  assert.equal(d.files.length, 2);
});

test("push: only commits AFTER before count (an older image change does not re-boot)", () => {
  const r = makeRepo();
  r.commit("pnpm-lock.yaml", "lock");
  const before = r.head();
  r.commit("docs/a.md", "a");
  assert.equal(decideBoot({ event: "push", pushBefore: before, git: r.git }).skip, true);
});

test("push: unknown before SHA -> BOOT (unset, empty, all-zero, short, garbage)", () => {
  const r = makeRepo();
  r.commit("docs/a.md", "a");
  for (const pushBefore of [undefined, "", "0".repeat(40), "abc123", "not-a-sha-at-all-not-a-sha-at-all-xxxxx"]) {
    const d = decideBoot({ event: "push", pushBefore, git: r.git });
    assert.equal(d.skip, false, `before=${JSON.stringify(pushBefore)}`);
    assert.match(d.reason, /RUNNING \(fail-safe\)/);
  }
});

test("push: before SHA not present in the checkout -> BOOT", () => {
  const r = makeRepo();
  r.commit("docs/a.md", "a");
  const d = decideBoot({ event: "push", pushBefore: "1234567890abcdef1234567890abcdef12345678", git: r.git });
  assert.equal(d.skip, false);
  assert.match(d.reason, /fail-safe/);
});

test("push: force push (before is not an ancestor of HEAD) -> BOOT, even when the diff is docs-only", () => {
  const r = makeRepo();
  const base = r.commit("docs/a.md", "a");
  const rewritten = r.commit("docs/b.md", "b"); // the old trunk tip
  r.git(["reset", "-q", "--hard", base]);
  r.commit("docs/c.md", "c"); // the force-pushed new tip
  const d = decideBoot({ event: "push", pushBefore: rewritten, git: r.git });
  assert.equal(d.skip, false);
  assert.match(d.reason, /fast-forward/);
});

test("push: empty diff -> BOOT", () => {
  const r = makeRepo();
  const head = r.commit("docs/a.md", "a");
  assert.equal(decideBoot({ event: "push", pushBefore: head, git: r.git }).skip, false);
});

test("push: any git error -> BOOT", () => {
  const boom = () => { throw new Error("git exploded"); };
  const d = decideBoot({ event: "push", pushBefore: "a".repeat(40), git: boom });
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

test("CLI --classify writes skip=true for a docs-only push and skip=false for an image push", () => {
  const r = makeRepo();
  const before = r.commit("docs/a.md", "a");
  r.commit("docs/b.md", "b");
  const out = path.join(r.dir, "..", `${path.basename(r.dir)}.out`);
  const runCli = (pushBefore) => {
    fs.writeFileSync(out, "");
    const res = spawnSync(process.execPath, [SCRIPT, "--classify"], {
      cwd: r.dir, encoding: "utf8",
      env: { ...process.env, EVENT_NAME: "push", BASE_REF: "", PUSH_BEFORE: pushBefore, GITHUB_OUTPUT: out },
    });
    assert.equal(res.status, 0, res.stderr);
    return fs.readFileSync(out, "utf8");
  };
  assert.match(runCli(before), /^skip=true$/m);
  r.commit("artifacts/api-server/src/index.ts", "x");
  assert.match(runCli(before), /^skip=false$/m);
  assert.match(runCli(""), /^skip=false$/m);
});

test("importing the module does not run the CLI", () => {
  // If it did, the import at the top of this file would already have exited the process (code 2).
  assert.equal(typeof decideBoot, "function");
});
