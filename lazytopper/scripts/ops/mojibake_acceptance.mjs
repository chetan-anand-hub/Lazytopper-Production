import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const outDir = path.join(repoRoot, ".project_memory", "ops", "out");
const outPath = path.join(outDir, "mojibake_acceptance.json");

const mojibakeRegex =
  /(?:\uFFFD|\u0393\u00C7|[\u00C2\u00C3\u00CE\u00CF\u00E2\u00F0][\u0080-\u00BF\u00C0-\u00FF\u2013-\u201F\u2020-\u2022\u2030\u2039\u203A\u20AC\u2122\u0152\u0153\u0160\u0161\u0178\u017D\u017E\u02C6\u02DC])/u;

function normalizePath(input) {
  return String(input || "").replace(/\\/g, "/");
}

function addCheck(checks, name, ok, details = "") {
  checks.push({ name, ok: Boolean(ok), details: String(details || "") });
}

async function run() {
  const checks = [];
  const knownBadSamples = [
    "don\uFFFDt",
    "x = 5 \u00E2\u2021\u2019 y = 7",
    "Jump into HPQs \u00E2\u2020\u2019",
    "Step 2 \u00E2\u20AC\u00A2 Practice",
    "40 \u00C3\u2014 30",
    "2\u00CF\u20ACr",
    "\u00F0\u0178\u2018\u20AC",
    "\u0393\u00C7",
  ];
  const knownGoodSamples = [
    "don't",
    "x = 5 \u21D2 y = 7",
    "40 \u00D7 30",
    "2\u03C0r",
    "normal ascii text",
  ];

  addCheck(
    checks,
    "known_bad_samples_detected",
    knownBadSamples.every((sample) => mojibakeRegex.test(sample)),
    knownBadSamples.join(" | ")
  );
  addCheck(
    checks,
    "known_good_samples_not_detected",
    knownGoodSamples.every((sample) => !mojibakeRegex.test(sample)),
    knownGoodSamples.join(" | ")
  );

  const checker = spawnSync("node", ["scripts/check-mojibake.cjs"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  addCheck(
    checks,
    "repo_scan_passes",
    checker.status === 0,
    `${String(checker.stdout || "").trim()} ${String(checker.stderr || "").trim()}`.trim()
  );

  // ★★ [GUARD-3] THE FRAME AND THE SCOPING, PROVEN ON A DISPOSABLE REPO — NOT ASSERTED.
  //
  // Everything above this point is a self-check against the LIVE tree, which proves only that the
  // live tree happens to be clean. It says nothing about WHAT THE GATE CAN SEE — and "cannot see"
  // is the entire defect class this lane exists to close (six instances, `check:mojibake` the
  // sixth). Before GUARD-3 the checker resolved its root as `lazytopper/`, so `handoff/` was
  // structurally invisible and `repo_scan_passes` was green for months over 616 corrupt lines.
  //
  // So build a throwaway git repo with a KNOWN-BAD line in each of the two frames and assert the
  // gate's behaviour in BOTH directions. These three checks are what make the scoping falsifiable:
  // point the gate back at `lazytopper/` and #1 goes red; drop the report-only carve-out and #2
  // goes red; make the carve-out a SILENT skip and #3 goes red.
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "mojibake-frame-"));
  let frame = { stdout: "", status: null };
  try {
    const g = (args) => spawnSync("git", args, { cwd: tmp, encoding: "utf8" });
    g(["init", "-q"]);
    g(["config", "user.email", "gate@example.com"]);
    g(["config", "user.name", "gate"]);
    // ★ ESCAPED, NOT LITERAL — and the distinction is the whole ruling in miniature. In a handoff
    // RECORD a specimen must stay literal, because a reader has to SEE the corruption to recognise
    // it. Here it is a FIXTURE: nobody reads it to learn what mojibake looks like, so the escape
    // costs nothing and keeps this enforced file honest under its own gate. (It was literal on the
    // first draft and `check:mojibake` failed on it — the gate catching its own author, correctly.)
    const BAD = `smart quote artifact: ${String.fromCharCode(0x00E2, 0x20AC, 0x201D)} here`;
    await fs.mkdir(path.join(tmp, "handoff"), { recursive: true });
    await fs.mkdir(path.join(tmp, "lazytopper", "src"), { recursive: true });
    await fs.writeFile(path.join(tmp, "handoff", "SESSION_LOG.md"), `${BAD}\n`, "utf8");
    await fs.writeFile(path.join(tmp, "lazytopper", "src", "Probe.ts"), `// ${BAD}\n`, "utf8");
    g(["add", "-A"]);
    frame = spawnSync("node", [path.join(repoRoot, "scripts", "check-mojibake.cjs")], {
      cwd: tmp,
      encoding: "utf8",
    });
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
  const frameOut = String(frame.stdout || "");
  const scopeLine = frameOut.split("\n").find((l) => l.startsWith("MOJIBAKE_SCOPE")) || "no line";
  const reportLine =
    frameOut.split("\n").find((l) => l.startsWith("MOJIBAKE_REPORT_ONLY")) || "no line";

  // ── 1 ── The gate ENUMERATES FROM THE GIT ROOT, so it SEES both frames. `handoff/SESSION_LOG.md`
  // appearing at all is the proof: under the old `lazytopper/`-anchored root it could not be
  // listed by `git ls-files`, and no verdict about it was possible in either direction.
  addCheck(
    checks,
    "gate_sees_handoff_tree_from_git_root",
    frameOut.includes("handoff/SESSION_LOG.md"),
    `${scopeLine} || ${reportLine}`
  );

  // ── 2 ── ★★ THE SCOPING, BOTH DIRECTIONS IN ONE RUN. The identical byte sequence sits in
  // `lazytopper/src/` and in `handoff/`. Product mojibake must FAIL (exit 1, listed as an enforced
  // hit); record mojibake must be REPORTED and must NOT change the verdict. This is the assertion
  // that stops the carve-out becoming a bypass: if someone widened REPORT_ONLY_PREFIXES to cover
  // `lazytopper/` — or to `''` — the exit code would drop to 0 and this goes red.
  addCheck(
    checks,
    "product_mojibake_fails_and_record_mojibake_only_reports",
    frame.status === 1 &&
      frameOut.includes("lazytopper/src/Probe.ts") &&
      /enforced_hits=1\b/.test(frameOut) &&
      /MOJIBAKE_REPORT_ONLY: handoff\/: 1 non-enforced hits/.test(frameOut),
    `status=${frame.status} || ${scopeLine} || ${reportLine}`
  );

  // ── 3 ── ★★ THE COUNT IS VISIBLE ON A CLEAN RUN TOO. A carve-out that printed nothing when the
  // record tree is clean would be indistinguishable from the pre-GUARD-3 blind spot — which is the
  // exact thing being fixed. The live-tree run above (`repo_scan_passes`, green) must ALSO carry
  // the count line, so the number is monitoring rather than exemption.
  const liveOut = String(checker.stdout || "");
  addCheck(
    checks,
    "report_only_count_is_printed_on_a_passing_run",
    /^MOJIBAKE_REPORT_ONLY: handoff\/: \d+ non-enforced hits/m.test(liveOut),
    liveOut.split("\n").find((l) => l.startsWith("MOJIBAKE_REPORT_ONLY")) || "NO COUNT LINE"
  );

  const failed = checks.filter((item) => !item.ok);
  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      total: checks.length,
      passed: checks.length - failed.length,
      failed: failed.length,
    },
    checks,
  };
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf8");

  if (failed.length > 0) {
    console.error(`Mojibake acceptance FAILED (${failed.length}/${checks.length}).`);
    for (const failure of failed) {
      console.error(`- ${failure.name}: ${failure.details}`);
    }
    console.error(`Report: ${normalizePath(path.relative(repoRoot, outPath))}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Mojibake acceptance PASSED (${checks.length}/${checks.length}).`);
  console.log(`Report: ${normalizePath(path.relative(repoRoot, outPath))}`);
}

run().catch(async (err) => {
  const report = {
    generatedAt: new Date().toISOString(),
    error: String(err?.stack || err?.message || err),
  };
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf8");
  console.error("Mojibake acceptance errored.");
  console.error(String(err?.stack || err));
  console.error(`Report: ${normalizePath(path.relative(repoRoot, outPath))}`);
  process.exitCode = 1;
});
