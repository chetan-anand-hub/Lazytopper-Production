/**
 * scope_guard_blindspot_acceptance.mjs — [GUARD-1]
 *
 * Proves the scope guard SEES what it claims to check.
 *
 * ★ WHY THIS FILE EXISTS. `scope:guard` ran its untracked enumeration
 * (`git ls-files --others`) from the lazytopper/ anchor. That command is CWD-SCOPED, so files in a
 * NEW top-level directory were omitted from the guard's input entirely — not reported
 * `[unclassified]`, but never seen. The guard printed SCOPE_GUARD_OK on a change it never looked at.
 *
 * ★ AND THE OLD SELF-CHECK COULD NOT CATCH IT. The guard's "no-blind-spot invariant" compared the
 * classified count to `all.length` — the same list the omission had already shrunk. A self-check
 * asserted against its own input is a tautology. So this file asserts from OUTSIDE: it builds real
 * files in a real scratch repo and demands the guard NAME them in its output.
 *
 * ★ MUTATION-VERIFIED. `--mutate` restores the anchor-scoped enumeration and asserts the blind-spot
 * case goes RED. A guard that classifies correctly and a guard that never looks both produce a green
 * run on today's file set, so without the mutation this suite would prove nothing.
 *
 * Run:  node scripts/ops/scope_guard_blindspot_acceptance.mjs
 *       node scripts/ops/scope_guard_blindspot_acceptance.mjs --mutate
 */
import { promises as fs } from "fs";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const anchorRoot = path.resolve(__dirname, "..", ".."); // lazytopper/
const guardSrc = path.join(anchorRoot, "scripts", "scopeGuard.mjs");
const policyRel = path.join("docs", "project_memory", "governance", "repo_boundary_policy.json");
const outDir = path.join(anchorRoot, ".project_memory", "ops", "out");
const outPath = path.join(outDir, "scope_guard_blindspot_acceptance.json");
const mutate = process.argv.slice(2).includes("--mutate");

const checks = [];
function addCheck(name, ok, details = "") {
  checks.push({ name, ok: Boolean(ok), details: String(details || "") });
}

function git(args, cwd) {
  const r = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${r.stderr || r.stdout}`);
  return String(r.stdout || "");
}

/**
 * Build a throwaway git repo shaped like this monorepo: .git at the root, the guard living in and
 * running from a lazytopper/ anchor. Real files + a real git index — nothing is stubbed, so the
 * enumeration semantics under test are the genuine ones.
 */
async function makeFixture(guardText) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "scopeguard-blindspot-"));
  git(["init", "-q"], dir);
  git(["config", "user.email", "guard@test.local"], dir);
  git(["config", "user.name", "guard test"], dir);

  const anchor = path.join(dir, "lazytopper");
  mkdirSync(path.join(anchor, "scripts"), { recursive: true });
  mkdirSync(path.join(anchor, path.dirname(policyRel)), { recursive: true });
  mkdirSync(path.join(anchor, "src"), { recursive: true });

  writeFileSync(path.join(anchor, "scripts", "scopeGuard.mjs"), guardText, "utf8");
  await fs.copyFile(path.join(anchorRoot, policyRel), path.join(anchor, policyRel));

  // Seed + commit so later edits register as tracked modifications.
  writeFileSync(path.join(anchor, "src", "App.tsx"), "export default 1;\n", "utf8");
  writeFileSync(path.join(dir, "firestore.rules"), "// baseline\n", "utf8");
  writeFileSync(path.join(anchor, "package.json"), JSON.stringify({ name: "lt" }), "utf8");
  git(["add", "-A"], dir);
  git(["commit", "-qm", "seed"], dir);
  return { dir, anchor };
}

function runGuard(anchor, mode) {
  const r = spawnSync(process.execPath, ["scripts/scopeGuard.mjs", "--mode", mode], {
    cwd: anchor,
    encoding: "utf8",
  });
  return { stdout: String(r.stdout || ""), status: r.status };
}

// ★ [GUARD-3] BARE INVOCATION — no `--mode`. This is how a human actually runs `pnpm run
// scope:guard`, and until GUARD-3 it was the ONE path this suite never exercised: every assertion
// above passes an explicit mode, so the auto-detect could have been a rubber stamp and the suite
// would still have reported 7/7 green. (Proven, not assumed: making `detectMode` accept every lane
// combination left this file passing 7/7.) The two assertions below are the reason that mutation
// now goes red.
function runGuardBare(anchor) {
  const r = spawnSync(process.execPath, ["scripts/scopeGuard.mjs"], {
    cwd: anchor,
    encoding: "utf8",
  });
  return { stdout: String(r.stdout || ""), status: r.status };
}

async function run() {
  let guardText = await fs.readFile(guardSrc, "utf8");

  // ★ THE MUTATION: put the untracked enumeration back on the anchor frame — the original defect.
  if (mutate) {
    const before = guardText;
    guardText = guardText.replace(
      "return listFilesFrom(GIT_ROOT || ROOT, cmd);",
      "return listFilesFrom(ROOT, cmd);"
    );
    if (guardText === before) {
      throw new Error(
        "MUTATION DID NOT APPLY — the enumeration call site changed shape. Fix this harness; a " +
          "mutation that silently fails to apply turns this suite into the very no-op it guards against."
      );
    }
  }

  const { dir, anchor } = await makeFixture(guardText);

  // ── Assertion 1 ── a file in a NEW top-level directory must be SEEN.
  // Seen means: named in the guard's output. Landing in `unknown` is the correct verdict for an
  // unmodelled directory (that is assertion 4); the defect was that it appeared nowhere at all.
  mkdirSync(path.join(dir, "newthing"), { recursive: true });
  writeFileSync(path.join(dir, "newthing", "probe.txt"), "x\n", "utf8");
  const newDir = runGuard(anchor, "mixed");
  const sawNewDir = newDir.stdout.includes("newthing/probe.txt");
  addCheck(
    "new_top_level_dir_is_inspected",
    sawNewDir,
    sawNewDir
      ? "guard named newthing/probe.txt in its output"
      : `BLIND SPOT: newthing/probe.txt absent from guard output. Got:\n${newDir.stdout.trim()}`
  );

  // ── Assertion 4 (paired with 1) ── an unmodelled path must fail LOUDLY, not be waved through.
  addCheck(
    "unmodelled_path_still_fails_loudly",
    newDir.stdout.includes("[unclassified] newthing/probe.txt") && newDir.status === 1,
    `status=${newDir.status}`
  );

  // ── The guard must STATE what it inspected ──
  addCheck(
    "guard_reports_its_inspection_scope",
    /SCOPE_GUARD_SCOPE: root=\S+ anchor=\S+ inspected=\d+/.test(newDir.stdout),
    newDir.stdout.split("\n").find((l) => l.startsWith("SCOPE_GUARD_SCOPE")) || "no scope line"
  );

  // ★ [GUARD-3] ...AND THE COUNTER MUST NAME ITS SCOPE.
  // The counter re-runs `git ls-files --others` — UNTRACKED ONLY — in the old anchor frame. That is
  // the correct measurement: `git diff --name-only` is git-root-relative from any cwd, so a
  // tracked-modified file outside the anchor was never missed and must NOT be counted here.
  // It was called `anchor_frame_would_miss`, which claims more than it measures — a reader could
  // take `=0` as "the old frame caught everything". This check pins the name to the measurement, so
  // a future rename back to the over-broad form fails here rather than quietly misleading.
  addCheck(
    "blind_spot_counter_name_states_untracked_scope",
    /anchor_frame_would_miss_untracked=\d+/.test(newDir.stdout) &&
      !/anchor_frame_would_miss=\d+/.test(newDir.stdout),
    newDir.stdout.split("\n").find((l) => l.startsWith("SCOPE_GUARD_SCOPE")) || "no scope line"
  );

  await fs.rm(path.join(dir, "newthing"), { recursive: true, force: true });

  // ── Assertion 2 ── firestore.rules classifies into its own lane.
  writeFileSync(path.join(dir, "firestore.rules"), "// changed\n", "utf8");
  const fsRules = runGuard(anchor, "firestore");
  addCheck(
    "firestore_rules_classifies_into_firestore_lane",
    fsRules.stdout.includes("SCOPE_GUARD_OK") && fsRules.stdout.includes("lanes=firestore"),
    fsRules.stdout.trim().split("\n").slice(-1)[0]
  );
  // Same file under a mode that does NOT allow it must fail — proves the lane is ENFORCED, not just
  // classified. A lane that classifies but is never checked is a silent no-op. [D47]
  const fsRulesWrongMode = runGuard(anchor, "product");
  addCheck(
    "firestore_lane_is_enforced_not_merely_classified",
    fsRulesWrongMode.status === 1 && fsRulesWrongMode.stdout.includes("[firestore] firestore.rules"),
    `status=${fsRulesWrongMode.status}`
  );
  git(["checkout", "--", "firestore.rules"], dir);

  // ── Assertion 3 ── no regression: an in-anchor product file still classifies as product.
  writeFileSync(path.join(anchor, "src", "App.tsx"), "export default 2;\n", "utf8");
  const productRun = runGuard(anchor, "product");
  addCheck(
    "in_anchor_product_file_still_classifies",
    productRun.stdout.includes("SCOPE_GUARD_OK") && productRun.stdout.includes("lanes=product"),
    productRun.stdout.trim().split("\n").slice(-1)[0]
  );
  git(["checkout", "--", "lazytopper/src/App.tsx"], dir);

  // ── [GUARD-3] Assertion 5 ── BARE INVOCATION, PERMISSIVE DIRECTION: a docs-only change PASSES.
  // Before GUARD-3 the bare invocation hardcoded mode="tooling", whose only lane is trackedTooling,
  // so the single most common change in this repo — a handoff edit — printed [docs] LANE VIOLATIONS
  // on correct work while `--mode docs` passed on the IDENTICAL tree. A guard that reddens the
  // ordinary case trains people to stop reading it.
  mkdirSync(path.join(dir, "handoff"), { recursive: true });
  writeFileSync(path.join(dir, "handoff", "CURRENT_STATE.md"), "# docs\n", "utf8");
  const docsOnly = runGuardBare(anchor);
  addCheck(
    "bare_invocation_passes_a_docs_only_change",
    docsOnly.status === 0 && docsOnly.stdout.includes("SCOPE_GUARD_OK"),
    `status=${docsOnly.status} ${docsOnly.stdout.trim().split("\n").slice(-1)[0]}`
  );

  // ── [GUARD-3] Assertion 6 ── BARE INVOCATION, RESTRICTIVE DIRECTION — THE ONE THAT MATTERS.
  // ★★ A PERMISSIVE AUTO-DETECT IS WORSE THAN A WRONG ONE, because it still prints OK. Auto-detect
  // must pick the NARROWEST DECLARED mode covering the changed lanes and FAIL when no declared mode
  // covers them. `product + docs` is exactly such a combination: no entry in `modeToLanes` contains
  // both, so mixing product code and handoff docs in one commit must still be rejected with no
  // `--mode` given. Without this assertion the whole auto-detect change is unguarded.
  writeFileSync(path.join(anchor, "src", "App.tsx"), "export default 3;\n", "utf8");
  const uncovered = runGuardBare(anchor);
  addCheck(
    "bare_invocation_still_rejects_an_uncovered_lane_combination",
    uncovered.status === 1 &&
      uncovered.stdout.includes("SCOPE_GUARD_FAIL") &&
      uncovered.stdout.includes("no declared mode covers this lane combination"),
    `status=${uncovered.status} ${uncovered.stdout.trim().split("\n").slice(-1)[0]}`
  );
  git(["checkout", "--", "lazytopper/src/App.tsx"], dir);
  await fs.rm(path.join(dir, "handoff"), { recursive: true, force: true });

  await fs.rm(dir, { recursive: true, force: true });

  const failed = checks.filter((c) => !c.ok);
  const report = {
    generatedAt: new Date().toISOString(),
    mutated: mutate,
    summary: { total: checks.length, passed: checks.length - failed.length, failed: failed.length },
    checks,
  };
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");

  for (const c of checks) console.log(`${c.ok ? "PASS" : "FAIL"}  ${c.name}${c.ok ? "" : `\n      ${c.details}`}`);

  if (mutate) {
    // Under mutation the blind-spot assertion MUST be red. If it is green, the mutation proved
    // nothing and the suite is decorative — fail hard rather than report a comforting number.
    const blindSpot = checks.find((c) => c.name === "new_top_level_dir_is_inspected");
    if (blindSpot?.ok) {
      console.error(
        "\nMUTATION CONTROL FAILED: restored the anchor-scoped enumeration and the blind-spot " +
          "assertion STILL PASSED. This suite does not actually detect the defect."
      );
      process.exitCode = 1;
      return;
    }
    console.log(
      `\nMUTATION CONTROL OK — blind-spot assertion went RED as required (${failed.length}/${checks.length} failed).`
    );
    return;
  }

  if (failed.length) {
    console.error(`\nScope guard blind-spot acceptance FAILED (${failed.length}/${checks.length}).`);
    process.exitCode = 1;
    return;
  }
  console.log(`\nScope guard blind-spot acceptance PASSED (${checks.length}/${checks.length}).`);
}

run().catch((err) => {
  console.error("Scope guard blind-spot acceptance errored.");
  console.error(String(err?.stack || err));
  process.exitCode = 1;
});
