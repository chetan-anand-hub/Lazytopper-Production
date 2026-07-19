#!/usr/bin/env node
/**
 * Tutor ⇄ Quick-Practice OVERLAY — acceptance gate (the C&I overlay's twin, #476).
 *
 * WHY A GATE AND NOT A vitest FILE: vitest is linux-pinned + not in CI here, so a vitest file
 * asserting these properties would never run anywhere that blocks a merge. This is the house
 * pattern (check_improve_overlay_additive_acceptance / qr_upload_channel): assert the properties
 * as source + git-diff invariants, in the matrix, on every PR.
 *
 * WHAT IT PROVES:
 *   · the DIRECT /practice/:grade/:subject visit is byte-identical (the `overlay` prop is
 *     default-off) — a normal hub / direct QP visit is unchanged;
 *   · every behavioural change on the page is `overlay`-GATED (breadcrumb suppressed, pinned ✕
 *     added, per-question "Ask tutor" suppressed, scorecard app-nav items omitted);
 *   · the host mounts the REAL PracticePage inside a nested MemoryRouter seeded with the tutor
 *     round-trip URL (the owner-ruled approach — NOT prop-threaded entry context), with a
 *     nav-guard that closes the panel on any in-panel navigation away from the practice route;
 *   · the tutor wiring: the "Practise this" CTA opens the overlay (no navigate); the QP navigate
 *     leg (routeToPractice / routeOut) is RETIRED; closing reads the graded record back over the
 *     EXISTING storage round-trip (composePracticeRecordReturnOpener — untouched, QP is the ref impl);
 *   · the C&I + QP hosts share ONE frame stylesheet (tutorOverlay.css) so the twins can't drift;
 *   · the engine / fetch-filter / persistence / grader / graded-read are UNTOUCHED (git zero-diff).
 *
 * METHOD: source assertions run against COMMENT-STRIPPED source (a grep hit in a comment is not a
 * usage). The forbidden-path diff is PR-scoped and, in CI, HARD-FAILS on an unresolvable base.
 *
 * Run from lazytopper/: node scripts/ops/quick_practice_overlay_additive_acceptance.mjs
 */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LAZY = path.join(__dirname, "..", "..");
const ROOT = path.join(LAZY, "..");

const read = (p) => readFileSync(path.join(LAZY, p), "utf8");

/** Strip // line, block, and JSX comments — a grep hit in a comment is not a usage. */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/([^:])\/\/[^\n"'`]*$/gm, "$1");
}

let pass = 0;
const failures = [];
function check(label, cond, detail = "") {
  if (cond) {
    pass += 1;
    console.log(`  ok  ${label}`);
  } else {
    failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
    console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`);
  }
}
function section(t) {
  console.log(`\n${t}`);
}

const pageRaw = read("src/pages/PracticePage.tsx");
const page = stripComments(pageRaw);
const hostRaw = read("src/pages/tutor/TutorQuickPracticeOverlay.tsx");
const host = stripComments(hostRaw);
const hook = stripComments(read("src/pages/tutor/useTutorSession.ts"));
const tutorPage = stripComments(read("src/pages/tutor/TutorPage.tsx"));
const ciHost = stripComments(read("src/pages/tutor/TutorCheckImproveOverlay.tsx"));
const css = read("src/pages/tutor/tutorOverlay.css");
const variants = stripComments(read("src/components/results/scorecardVariants.ts"));

/* ══════════════════════════════════════════════════════════════════════════
   1 · THE ADDITIVE GUARANTEE — a direct /practice visit is byte-identical.
   ══════════════════════════════════════════════════════════════════════════ */
section("1 · Additive guarantee (default-off — the single most important set)");

// GUARD 1 — the overlay prop is genuinely OPTIONAL: a bare <PracticePage /> must still
// typecheck (this is what keeps the App route element unchanged).
check(
  "GUARD 1: overlay prop is optional (React.FC<{ overlay?: PracticeOverlayProps }>)",
  /React\.FC<\{\s*overlay\?:\s*PracticeOverlayProps\s*\}>\s*=\s*\(\{\s*overlay\s*\}\)/.test(page),
);
check(
  "GUARD 1: PracticeOverlayProps is exported (the host imports it / the prop is typed)",
  /export interface PracticeOverlayProps \{/.test(page),
);

// GUARD 2 — the breadcrumb is STILL present and unchanged (a direct visit renders it); it is
// only gated OFF in overlay mode. The button + its handler are byte-present.
check(
  "GUARD 2: the breadcrumb back button is unchanged (onClick={handleBreadcrumbBack} still present)",
  /onClick=\{handleBreadcrumbBack\}/.test(page),
);

// GUARD 3 — the App route element is untouched (Option A mounts the overlay in the tutor, never
// via the route). Asserted as a forbidden zero-diff on App.tsx in §4.

/* ══════════════════════════════════════════════════════════════════════════
   2 · THE OVERLAY-GATED HUNKS — every behavioural change is behind `overlay`.
   ══════════════════════════════════════════════════════════════════════════ */
section("2 · The page hunks are overlay-gated");

// HUNK A — the pinned ✕ close-bar is overlay-gated and closes via overlayReturn.
check(
  "HUNK A: the pinned close-bar is overlay-gated ({overlay && ( … onClick={overlayReturn} ))",
  /\{overlay && \(/.test(page) && /onClick=\{overlayReturn\}/.test(page),
);
check(
  "HUNK A: overlayReturn returns to the tutor via overlay.onClose (payload-free storage round-trip)",
  /const overlayReturn = \(\) => overlay\?\.onClose\(\);/.test(page),
);

// HUNK B — the breadcrumb <nav> is suppressed in overlay mode (a panel has no back-stack).
check(
  "HUNK B: the breadcrumb <nav> is overlay-gated ({!overlay && ( … <nav ))",
  /\{!overlay && \(\s*<nav/.test(page),
);

// HUNK C — the per-question "Ask tutor" CTA is suppressed in overlay (circular inside the tutor).
check(
  "HUNK C: onAskTutor is overlay-gated (overlay ? undefined : askTutorAboutQuestion)",
  /onAskTutor=\{overlay \? undefined : askTutorAboutQuestion\}/.test(page),
);

// HUNK D — the scorecard's three app-navigation items are omitted in overlay (they'd leave the
// tutor + dead-end the isolated MemoryRouter); overlayMode threads through to the variant.
check(
  "HUNK D: the scorecard variant is told overlayMode: !!overlay",
  /overlayMode: !!overlay/.test(page),
);
check(
  "HUNK D: quickPracticeScorecardVariant omits chapter/predicted/study when overlayMode",
  /const floor: MenuId\[\] = \[[\s\S]*?overlayMode \? \[\] : \(\["chapter", "predicted", "study"\] as MenuId\[\]\)/.test(variants) &&
    /if \(!overlayMode && accuracy !== null && mcqAnswered >= 3\)/.test(variants),
);
check(
  "HUNK D: overlayMode is an OPTIONAL, default-false input (existing callers byte-identical)",
  /overlayMode\?: boolean;/.test(variants) && /overlayMode = false,/.test(variants),
);

/* ══════════════════════════════════════════════════════════════════════════
   3 · THE HOST (MemoryRouter, owner-ruled) + THE TUTOR WIRING.
   ══════════════════════════════════════════════════════════════════════════ */
section("3 · The MemoryRouter host + tutor wiring (poll-free open, retired navigate leg)");

// HOST — the REAL PracticePage, mounted in a nested MemoryRouter seeded with the round-trip URL.
check(
  "HOST: mounts the REAL PracticePage inside a MemoryRouter seeded with the seed URL",
  /import PracticePage from "\.\.\/PracticePage";/.test(host) &&
    /<MemoryRouter initialEntries=\{\[seedUrl\]\}>/.test(host) &&
    /<PracticePage overlay=\{\{ onClose \}\} \/>/.test(host),
);
check(
  "HOST: the route matches the round-trip path (/practice/:grade/:subject)",
  /path="\/practice\/:grade\/:subject"/.test(host),
);
// HOST nav-guard — any pathname change closes the panel (robust catch-all for stray in-page nav).
check(
  "HOST: an OverlayNavGuard closes the panel on any pathname change (catch-all for in-page nav)",
  /function OverlayNavGuard/.test(host) &&
    /if \(location\.pathname !== homePathRef\.current\)/.test(host) &&
    /<OverlayNavGuard onLeave=\{onClose\} \/>/.test(host),
);
// HOST width — uses the shared frame + the QP width modifier.
check(
  "HOST: uses the shared frame classes + the --qp width modifier",
  /lt-tutor-overlay__backdrop/.test(host) && /lt-tutor-overlay__panel lt-tutor-overlay__panel--qp/.test(host),
);

// TUTOR HOOK — open flips the panel + writes the pending marker (NO navigate); close resolves it.
check(
  "OPEN: openQuickPracticeOverlay opens the panel + writes a surface:\"practice\" pending marker (no navigate)",
  /const openQuickPracticeOverlay = useCallback\(\(\) => \{\s*setQuickPracticeOverlayOpen\(true\);[\s\S]*?surface: "practice",[\s\S]*?updatePending\(marker\);\s*persist\(messages, marker\);/.test(hook),
);
check(
  "CLOSE: closeQuickPractice resolves the graded round-trip on close (storage read-back)",
  /const closeQuickPractice = useCallback\(\(\) => \{\s*setQuickPracticeOverlayOpen\(false\);[\s\S]*?resolvePendingRoundTrip\(marker\);/.test(hook),
);
check(
  "SEED: quickPracticeHref is the buildQuickPracticeRoundTripHref URL (byte-identical to the navigate leg)",
  /const quickPracticeHref = useMemo\(\s*\(\) =>\s*buildQuickPracticeRoundTripHref\(\{/.test(hook),
);
// RETIRED — the QP navigate leg is gone: routeToPractice removed, routeOut (its last caller) removed.
check(
  "RETIRED: routeToPractice is gone (the navigate leg is retired)",
  !/routeToPractice/.test(hook),
);
check(
  "RETIRED: routeOut is gone (no caller remains after both legs became overlays)",
  !/const routeOut = useCallback/.test(hook),
);

// TUTORPAGE — the EXISTING CTA opens the overlay (the swap), and the host is mounted.
check(
  'SWAP: the "Practise this" CTA opens the overlay (onClick={openQuickPracticeOverlay})',
  /onClick=\{openQuickPracticeOverlay\}/.test(tutorPage),
);
check(
  "SWAP: TutorPage mounts <TutorQuickPracticeOverlay open onClose seedUrl />",
  /<TutorQuickPracticeOverlay\s+open=\{quickPracticeOverlayOpen\}\s+onClose=\{closeQuickPractice\}\s+seedUrl=\{quickPracticeHref\}/.test(tutorPage),
);

/* ══════════════════════════════════════════════════════════════════════════
   3a · THE SHARED FRAME — both hosts point at one stylesheet (twins can't drift).
   ══════════════════════════════════════════════════════════════════════════ */
section("3a · Shared overlay frame");
check(
  "SHARED: both hosts import ./tutorOverlay.css (one source of truth)",
  /import "\.\/tutorOverlay\.css";/.test(host) && /import "\.\/tutorOverlay\.css";/.test(ciHost),
);
check(
  "SHARED: the C&I host uses the shared lt-tutor-overlay__ classes (no stale lt-ci-overlay__)",
  /lt-tutor-overlay__backdrop/.test(ciHost) && !/lt-ci-overlay__/.test(ciHost),
);
check(
  "SHARED: tutorOverlay.css defines the base frame + the QP width knob",
  /\.lt-tutor-overlay__panel \{/.test(css) && /\.lt-tutor-overlay__panel--qp \{/.test(css),
);

/* ══════════════════════════════════════════════════════════════════════════
   4 · FORBIDDEN — engine, fetch-filter, persistence, grader, graded-read: zero diff.
   ══════════════════════════════════════════════════════════════════════════ */
section("4 · Forbidden paths untouched (git-scoped) — this is a HOSTING change only");

const IN_CI = !!process.env.CI;
const EVENT = process.env.GITHUB_EVENT_NAME || null;
const PR_TARGET = process.env.GITHUB_BASE_REF || null;

const FORBIDDEN = [
  "lazytopper/src/data/predictionDataService.ts", // the subtopicHint fetch-filter (draw stays)
  "lazytopper/src/data/practiceSetGenerator.ts", // the question draw / count logic
  "lazytopper/src/services/quickPracticeSessionService.ts", // persistQuickPracticeSession
  "lazytopper/src/pages/tutor/tutorRoundTrip.ts", // composePracticeRecordReturnOpener — the graded read
  "lazytopper/src/services/sessionRecords.ts", // the SessionRecord shape / read
  "lazytopper/src/App.tsx", // routing (the /practice route element is untouched)
];

function hasRef(ref) {
  try {
    execFileSync("git", ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`], { cwd: ROOT, stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}
function resolveForbiddenBase() {
  if (PR_TARGET) {
    for (const r of [`origin/${PR_TARGET}`, PR_TARGET]) if (hasRef(r)) return r;
    return null;
  }
  if (!IN_CI) {
    for (const r of ["origin/base/approved-thru-437", "base/approved-thru-437"]) if (hasRef(r)) return r;
  }
  return null;
}

const forbiddenBase = resolveForbiddenBase();
if (forbiddenBase) {
  const changed = execFileSync("git", ["diff", "--name-only", `${forbiddenBase}...HEAD`], { cwd: ROOT })
    .toString()
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const f of FORBIDDEN) {
    check(`FORBIDDEN: ${f} shows zero changes (vs ${forbiddenBase})`, !changed.includes(f),
      changed.includes(f) ? "THIS FILE WAS MODIFIED" : "");
  }
} else if (EVENT === "push") {
  console.log("  --  N/A: push-to-trunk run — no PR to scope a forbidden-path diff to.");
} else if (IN_CI) {
  check("FORBIDDEN: the PR base ref is reachable in CI (fetch-depth must be 0)", false,
    `could not resolve the PR target ref${PR_TARGET ? ` (origin/${PR_TARGET})` : ""} — hard failure by design.`);
} else {
  console.log("  ~~  SKIPPED (local, non-CI): no base ref — forbidden-path diff not checked.");
}

console.log("");
if (failures.length > 0) {
  console.error(`Tutor ⇄ Quick-Practice overlay acceptance FAILED — ${failures.length} failing:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`Tutor ⇄ Quick-Practice overlay acceptance PASSED — ${pass}/${pass} checks green.`);
console.log("  additive: optional overlay prop · breadcrumb byte-present · direct visit unchanged ·");
console.log("  hunks overlay-gated: pinned ✕ · breadcrumb suppressed · Ask-tutor suppressed · scorecard app-nav omitted ·");
console.log("  host: REAL PracticePage in a MemoryRouter seeded with the round-trip URL · nav-guard catch-all · shared --qp frame ·");
console.log("  wiring: Practise-this opens the overlay · routeToPractice/routeOut retired · graded read-back over the existing storage round-trip ·");
console.log("  forbidden zero-diff: predictionDataService · practiceSetGenerator · quickPracticeSessionService · tutorRoundTrip · sessionRecords · App\n");
