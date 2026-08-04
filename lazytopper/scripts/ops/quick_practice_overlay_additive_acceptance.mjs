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
 *   · ★ the host constructs NO Router of its own (the #490 regression guard — a nested Router
 *     inside the app's always-present <BrowserRouter> throws and broke production). It renders
 *     the REAL PracticePage at the seed location via <Routes location> + a RouteContext reset,
 *     so PracticePage's ~36 route reads resolve to the seed unchanged;
 *   · ★ navigation is CONTAINED by a navigator override (no nested Router ⇒ no history
 *     isolation), so a stray in-panel nav returns to the tutor instead of tearing the student
 *     out of the thread — without editing any shared child component;
 *   · ★ the integration test HARNESS reproduces production (outer router + matched /tutor parent
 *     route) and carries a CONTROL case that must throw — the durable fix for how #490 shipped;
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
import { existsSync, readFileSync } from "node:fs";
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
const app = stripComments(read("src/App.tsx"));
const hostRaw = read("src/pages/tutor/TutorQuickPracticeOverlay.tsx");
const host = stripComments(hostRaw);
const hook = stripComments(read("src/pages/tutor/useTutorSession.ts"));
const tutorPage = stripComments(read("src/pages/tutor/TutorPage.tsx"));
const ciHost = stripComments(read("src/pages/tutor/TutorCheckImproveOverlay.tsx"));
const overlayTest = stripComments(read("src/pages/tutor/TutorQuickPracticeOverlay.integration.test.tsx"));
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
// via the route).
//
// ★ THIS USED TO BE A COMMENT AND NOTHING ELSE. It read "Asserted as a forbidden zero-diff on
// App.tsx in §4" and delegated the WHOLE assertion to that blanket ban — so when FORBID-4 lifted
// the ban (see §4), this property would have been left with no executable coverage anywhere in
// the repo. It is now asserted directly, as the twin of the C&I gate's GUARD 5.
//
// DELIBERATELY NARROW. It pins ONLY what the ban was buying: the route exists, and PracticePage is
// mounted PROPLESS. It does NOT pin the wrapper chain (MobileSelfChrome / PracticeLimitGate /
// SectionErrorBoundary / withRouteSuspense), because none of that is what the overlay contract
// depends on, and over-pinning a file's incidental shape is how a replacement guard blocks an
// unrelated lane later. [FU-CONTRACT-TESTS-OVERPIN-CURRENT-BEHAVIOUR]
check(
  "GUARD 3: the /practice/:grade/:subject route still exists in App",
  /path="\/practice\/:grade\/:subject"/.test(app),
);
check(
  "GUARD 3: App mounts <PracticePage /> PROPLESS — no overlay prop via the route (Option A)",
  /<PracticePage \/>/.test(app) && !/<PracticePage\s+[^/>]/.test(app),
  "the overlay is mounted inside the tutor by TutorQuickPracticeOverlay, never by the route — "
  + "an `overlay=` here would put a direct/hub visit into overlay mode",
);

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
// tutor thread); overlayMode threads through to the variant.
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

// HUNK E — THE WAY HOME, named. Closing the panel was always the return, but a bare ✕ made the
// student infer it. Both the scorecard row and the close-bar label now say so — and BOTH are
// overlay-gated, so a direct / hub visit is byte-identical (no ticket, no label).
check(
  "HUNK E: the scorecard return ticket is overlay-GATED (absent on a direct/hub visit)",
  /returnTicket: overlay\s*\?\s*\{ label: "Back to your tutor", onReturn: overlay\.onClose \}\s*:\s*undefined/.test(page),
);
check(
  "HUNK E: returnTicket is an OPTIONAL variant input, rendered via the SHARED returnTicketAction",
  /returnTicket\?: \{ label: string; onReturn: \(\) => void \};[\s\S]*?const floor: MenuId\[\]/.test(variants) &&
    /\.\.\.\(returnTicket \? \[returnTicketAction\(returnTicket\)\] : \[\]\)/.test(variants),
);
check(
  "HUNK E: the overlay close-bar carries a NAMED return beside the ✕, both calling overlayReturn",
  /Back to your tutor &rarr;/.test(page) &&
    (page.match(/onClick=\{overlayReturn\}/g) || []).length === 2,
  "the named label and the ✕ must both route through overlayReturn",
);

/* ══════════════════════════════════════════════════════════════════════════
   3 · THE HOST — seeded WITHOUT a nested Router + nav containment + tutor wiring.
   ══════════════════════════════════════════════════════════════════════════ */
section("3 · The host (no nested Router) + nav containment + tutor wiring");

// ★ REGRESSION GUARD FOR #490 — the single most important check in this file. v1 seeded the
// route by mounting a nested <MemoryRouter>; the app is ALWAYS inside <BrowserRouter>
// (main.tsx), react-router throws Router-in-Router, and every student hit an error page. No
// Router may ever be constructed inside this host again.
check(
  "★ NO-NESTED-ROUTER (#490 regression guard): the host constructs no Router of its own",
  !/<(MemoryRouter|BrowserRouter|HashRouter|Router|RouterProvider)\b/.test(host),
  "a Router inside the app's BrowserRouter throws at runtime — this was the #490 break",
);

// HOST — the REAL PracticePage, rendered at the seed location using the EXISTING router.
check(
  "HOST: renders the REAL PracticePage at the seed location via <Routes location> (no new Router)",
  /import PracticePage from "\.\.\/PracticePage";/.test(host) &&
    /<Routes location=\{seedUrl\}>/.test(host) &&
    /<PracticePage overlay=\{\{ onClose \}\} \/>/.test(host),
);
check(
  "HOST: the route matches the round-trip path (/practice/:grade/:subject)",
  /path="\/practice\/:grade\/:subject"/.test(host),
);
// The RouteContext reset is what makes <Routes location> legal under the tutor's own matched
// route: without it react-router asserts the seed pathname must begin with the parent-matched
// pathname, and "/practice/…" under "/tutor/…" fails that invariant (spike-verified).
check(
  "HOST: RouteContext is reset to zero matches (makes <Routes location> legal under /tutor/…)",
  /<UNSAFE_RouteContext\.Provider value=\{\{ outlet: null, matches: \[\], isDataRoute: false \}\}>/.test(host),
);
// ★ NAV CONTAINMENT — without a nested Router there is NO history isolation, so any navigation
// inside the panel would hit the REAL router and tear the student out of the tutor. The
// contained navigator turns navigation into "return to the tutor" (onClose), covering even the
// in-page navs not enumerated anywhere — and WITHOUT editing the shared child components, so
// their non-overlay behaviour is byte-identical by construction.
check(
  "HOST: navigation is CONTAINED — a navigator override routes push/replace/go to onClose",
  /<UNSAFE_NavigationContext\.Provider value=\{containedNavigation\}>/.test(host) &&
    /push: \(\) => onClose\(\)/.test(host) &&
    /replace: \(\) => onClose\(\)/.test(host) &&
    /go: \(\) => onClose\(\)/.test(host),
);
check(
  "HOST: href generation is passed through (links still render; only navigating is contained)",
  /createHref: parentNavigation\.navigator\.createHref/.test(host),
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
   3b · ★ THE TEST HARNESS ITSELF — the durable fix for HOW #490 shipped.
   ══════════════════════════════════════════════════════════════════════════
   #490's bug was not caught because its test rendered the overlay in ISOLATION: the nested
   router was the only router, so it was legal in the test and illegal in production. The
   assertion was fine; the HARNESS was the defect. A gate that only checks product source would
   have missed that entirely — so we gate the harness too. If someone "simplifies" this test by
   dropping the outer router or the control case, CI fails here, loudly.
   ══════════════════════════════════════════════════════════════════════════ */
section("3b · The integration test reproduces production (the #490 process fix)");

check(
  "★ HARNESS: the integration test mounts an OUTER router (not isolation — this is the #490 gap)",
  /<MemoryRouter initialEntries=\{\[TUTOR_URL\]\}>/.test(overlayTest),
  "without the app's always-present outer Router the test proves nothing about production",
);
check(
  "★ HARNESS: the host is mounted INSIDE a matched /tutor/… parent route (real nesting depth)",
  /path="\/tutor\/:grade\/:subject\/:topicKey"/.test(overlayTest),
);
check(
  "★ HARNESS: there is a CONTROL case that mounts a nested Router and asserts it THROWS",
  /CONTROL/.test(overlayTest) &&
    /<MemoryRouter initialEntries=\{\[seedUrl\]\}>/.test(overlayTest) &&
    /toThrow\(\/cannot render a <Router> inside another <Router>\/i\)/.test(overlayTest),
  "if the control cannot fail, the harness is not proven to reproduce production",
);
check(
  "HARNESS: a containment case proves a stray in-panel nav does NOT navigate the app out",
  /CONTAINMENT/.test(overlayTest) && /outer-path/.test(overlayTest),
);
check(
  "HARNESS: containment is proven overlay-ONLY (the same nav outside the overlay still navigates)",
  /CONTAINMENT is overlay-ONLY/.test(overlayTest),
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
  // ★★ App.tsx — blanket ban LIFTED 2026-08-04 (owner decision, Wave 5C lane FORBID-4), in
  // LOCK-STEP with the identical entry in check_improve_overlay_additive_acceptance.mjs.
  // APP.TSX WAS BANNED IN TWO GATES, NOT ONE — amending only one would have left the other red
  // and blocked ME-PROGRESS anyway while looking unblocked. Both were amended in the same PR.
  // (It is NOT in check_improve_convergence_acceptance.mjs — that array was enumerated to
  // establish this, not grepped; several documents claimed otherwise and were wrong.)
  //
  // WHY NOW: ME-PROGRESS must repoint the `/me` route to a single responsive MeProgressPage,
  // replacing DesktopMePage + MobileMePage — the Option-B convergence already shipped for Exam
  // Trends, Topic Hub, Worksheets and Check & Improve. That is a bounded `element=` change, but
  // this array is PR-scoped with no lane-scoping and no exception mechanism, so the ban blocked it
  // outright. Precedent: #519 (DesktopShell.tsx), PR-C1 (checkSolution.cjs), #581
  // (SolutionChecker.tsx). THE PROTECTION CHANGES FORM, IT DOES NOT DISAPPEAR.
  //
  // WHAT THIS GATE'S BAN WAS ACTUALLY BUYING, made explicit — and it was buying MORE here than in
  // the C&I twin. The entry read only "routing (the /practice route element is untouched)", and
  // §1's GUARD 3 was a COMMENT with no check behind it that pointed straight back at this ban. So
  // the Option-A invariant — the route mounts <PracticePage /> PROPLESS, because the overlay is
  // mounted inside the tutor by TutorQuickPracticeOverlay and never via the route — had NO
  // executable coverage at all. It also silently covered the premise this whole host is built on:
  // EXACTLY ONE Router, owned by main.tsx. A second Router in the app tree is #490 verbatim, and
  // the NO-NESTED-ROUTER check in §3 guards only the HOST, never App.tsx.
  //
  // THE REPLACEMENT IS IN TWO HALVES, both of which had to be added:
  //   1. GUARD 3 in §1 is now a REAL check (route present + PracticePage propless) — the source
  //      half, in this gate, on every PR.
  //   2. `lazytopper/src/App.routing.contract.test.tsx` — 9 targeted tests that mount the REAL App
  //      inside the app's always-present outer router and the full main.tsx provider stack,
  //      pinning exactly one Router (with a CONTROL that nests a second and must THROW) and that
  //      both guarded route elements resolve to a mounted page carrying no props. All mutations
  //      proven RED. Its PRESENCE AND WIRING are asserted below.
  // Do NOT re-add the blanket entry without a deliberate owner decision — the absence assertion
  // below will fail if you do.
  //
  // → THE OTHER FIVE ENTRIES REMAIN, BY DELIBERATE DECISION. This is a one-file amendment and NOT
  // a precedent for the set: ME-PROGRESS touches none of the engine, fetch-filter, persistence or
  // graded-read modules, and lifting a ban before there is a need unprotects more than the case
  // justifies.
  "lazytopper/src/data/predictionDataService.ts", // the subtopicHint fetch-filter (draw stays)
  "lazytopper/src/data/practiceSetGenerator.ts", // the question draw / count logic
  "lazytopper/src/services/quickPracticeSessionService.ts", // persistQuickPracticeSession
  "lazytopper/src/pages/tutor/tutorRoundTrip.ts", // composePracticeRecordReturnOpener — the graded read
  "lazytopper/src/services/sessionRecords.ts", // the SessionRecord shape / read
];

// ★ SHAPE, asserted UNCONDITIONALLY. Ported from the C&I twin, which has carried it since a commit
// that really did modify a guarded file passed that gate 31/31 green: `changed.includes(f)` is
// exact array membership and `git diff --name-only` emits REPO-ROOT-relative paths, so an entry
// missing the `lazytopper/` prefix can NEVER match and guards NOTHING while reading as protection.
// THIS GATE HAD NO SUCH LOOP AT ALL until FORBID-4 — its five surviving entries were unverified.
// Filesystem-only, so it can never skip the way the diff loop below does.
for (const f of FORBIDDEN) {
  check(`FORBIDDEN(path): ${f} resolves to a real repo-relative file`,
    !f.startsWith("/") && !f.includes("\\") && existsSync(path.join(ROOT, f)),
    "this entry can never match `git diff --name-only` output, so it guards NOTHING "
    + "— check the lazytopper/ prefix");
}

// ★ MEMBERSHIP, asserted UNCONDITIONALLY — the five surviving entries. The git-diff loop below
// only runs when a base ref resolves; on a shallow checkout it skips entirely, so "these five are
// guarded AT ALL" is pinned here where nothing can skip it. Membership is NOT matchability: the
// FORBIDDEN(path) loop above is what proves an entry can match. The two are complementary.
for (const f of [
  "lazytopper/src/data/predictionDataService.ts",
  "lazytopper/src/data/practiceSetGenerator.ts",
  "lazytopper/src/services/quickPracticeSessionService.ts",
  "lazytopper/src/pages/tutor/tutorRoundTrip.ts",
  "lazytopper/src/services/sessionRecords.ts",
]) {
  check(`FORBIDDEN(wired): ${f} is still in the guarded set (FORBID-4 lifted App.tsx ONLY)`,
    FORBIDDEN.includes(f),
    "the App.tsx lift was a deliberate ONE-FILE amendment — this entry must survive it");
}

// ★ THE INVERSE ASSERTION — what makes the lift itself OBSERVABLE. A silent re-add of the blanket
// entry turns this red and forces a deliberate owner decision, instead of quietly re-blocking the
// next convergence lane with no discussion.
check("FORBIDDEN(lifted): App.tsx is NOT in the guarded set (ban replaced by GUARD 3 + App.routing.contract.test.tsx)",
  !FORBIDDEN.includes("lazytopper/src/App.tsx"),
  "re-adding the blanket entry needs an owner decision AND removal of the replacement tests");

/* ══════════════════════════════════════════════════════════════════════════
   ★★ THE REPLACEMENT PROTECTION FOR THE LIFTED App.tsx BAN (FORBID-4), half 2.
   ══════════════════════════════════════════════════════════════════════════
   Asserted independently in BOTH overlay gates on purpose: each ran its own ban on App.tsx, so
   each needs its own proof that something replaced it. A deleted FORBIDDEN entry plus a test file
   nobody invokes is strictly WORSE than the ban it replaced, because it READS as protection. All
   three halves are asserted — the tests EXIST, they are COLLECTED by the vitest include glob, and
   vitest actually RUNS in CI. Filesystem-only, so this can never skip.
   ══════════════════════════════════════════════════════════════════════════ */
const APP_CONTRACT_TESTS = "lazytopper/src/App.routing.contract.test.tsx";
check(`APP-TESTS: ${APP_CONTRACT_TESTS} exists (the replacement for the lifted blanket ban)`,
  existsSync(path.join(ROOT, APP_CONTRACT_TESTS)),
  "the blanket FORBIDDEN entry was lifted in favour of these tests — without them App.tsx routing is unguarded");
check("APP-TESTS: they are COLLECTED by the vitest include glob (src/**/*.test.{ts,tsx})",
  /include:\s*\["src\/\*\*\/\*\.test\.\{ts,tsx\}"\]/
    .test(readFileSync(path.join(ROOT, "lazytopper/vitest.config.ts"), "utf8"))
  && APP_CONTRACT_TESTS.startsWith("lazytopper/src/") && APP_CONTRACT_TESTS.endsWith(".test.tsx"),
  "the include glob no longer matches the replacement tests — they would never be discovered");
check("APP-TESTS: vitest actually RUNS in CI (quality-gate.yml has a required `vitest run` step)",
  /vitest run/.test(readFileSync(path.join(ROOT, ".github/workflows/quality-gate.yml"), "utf8")),
  "no vitest step in CI — a .test.tsx cannot replace a forbidden-path entry that nothing executes");

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
console.log("  host: NO nested Router (#490 guard) · seed via <Routes location> + RouteContext reset · navigation CONTAINED to onClose · shared --qp frame ·");
console.log("  harness: the integration test mounts an OUTER router inside a matched /tutor route + a CONTROL case that must throw ·");
console.log("  wiring: Practise-this opens the overlay · routeToPractice/routeOut retired · graded read-back over the existing storage round-trip ·");
console.log("  forbidden zero-diff: predictionDataService · practiceSetGenerator · quickPracticeSessionService · tutorRoundTrip · sessionRecords ·");
console.log("  ban LIFTED, protection re-formed: App.tsx → GUARD 3 (route propless) + App.routing.contract.test.tsx (FORBID-4)\n");
