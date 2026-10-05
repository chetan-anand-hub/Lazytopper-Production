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
 *   · the engine / fetch-filter / graded-read are UNTOUCHED (git zero-diff). ★ THE PERSISTENCE
 *     MODULE IS NO LONGER ON THAT LIST: quickPracticeSessionService.ts's blanket ban was lifted by
 *     FORBID-5 (Wave 5D) so BATCH-1b can extend it, and its protection is now
 *     quickPracticeSessionService.persist.contract.test.ts, asserted present + collected + run in
 *     §4. The grader (checkSolution.cjs) was never banned by THIS gate at all.
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
// SCORECARD-MI-1 PR-2 — owner ruling 2026-10-05 (taxonomy and wording; marks not counts): the
// tutorRoundTrip pins below transpile and CALL the real openers, so they need these.
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";

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
  //
  // ★★ quickPracticeSessionService.ts — blanket ban LIFTED 2026-08-05 (owner decision, Wave 5D
  // lane FORBID-5). THIS GATE IS THE ONLY ONE THAT EVER BANNED IT. The arrays in
  // check_improve_convergence_acceptance.mjs and check_improve_overlay_additive_acceptance.mjs were
  // ENUMERATED at trunk a895dbdb to establish that, not grepped, and neither contains it; repo-wide
  // there are exactly THREE `const FORBIDDEN = [` arrays and all three live in this directory. So
  // unlike App.tsx and checkSolution.cjs — each of which was banned in TWO gates — this lift is
  // genuinely one-sided and no twin amendment is owed.
  //
  // WHY NOW: BATCH-1b's Ruling 1 mandates extending THIS EXACT FILE to carry Quick Practice batch
  // grading. This array is PR-scoped with no lane-scoping and no exception mechanism, so the ban
  // blocked that lane outright. Precedent: #519 (DesktopShell.tsx), PR-C1 (checkSolution.cjs),
  // #581 (SolutionChecker.tsx), #601 (App.tsx). THE PROTECTION CHANGES FORM, IT DOES NOT DISAPPEAR.
  //
  // WHAT THIS BAN WAS ACTUALLY BUYING, made explicit — because a blanket ban says "something here
  // must not change" and never says what. The entry read only `// persistQuickPracticeSession`,
  // inside a section headed "engine, fetch-filter, persistence, grader, graded-read: zero diff".
  // ★ NOTHING ELSE IN THIS GATE ASSERTS ONE BYTE OF THAT MODULE — no source regex, no import check,
  // no behavioural check — so the FORBIDDEN entry was its ENTIRE protection here. And the
  // pre-existing `quickPracticeSessionService.test.ts` covers only the PURE units
  // (buildSeenQuestionIds / sessionRotationOffset / buildQuickPracticeResponse, plus
  // buildQuickPracticeSessionRecord called directly): `persistQuickPracticeSession`, the function
  // the ban's own comment named, had ZERO executable coverage repo-wide. Concretely, the ban was
  // the only thing standing between the product and:
  //   (a) THE DOUBLE-WRITE HAZARD — a second writeSessionRecord / writeSessionPerQuestion call per
  //       finished set surfaces as DUPLICATED attempts in Mistake Intelligence, the store the tutor
  //       reads;
  //   (b) a doc id that stops being a pure function of the session's own facts — a counter, a clock
  //       or Math.random inside it turns every re-finish into a NEW row instead of an overwrite;
  //   (c) the perQuestion payload drifting off the record it belongs to, which orphans "review my
  //       answers" silently: no throw, no type error, nothing red;
  //   (d) the `"quick-practice"` surface marker being renamed on one half only (two surface
  //       vocabularies exist in this codebase and the record/marker split has bitten before);
  //   (e) the signed-out / isLocalSession refusal disappearing (CLAUDE.md §7 — no Firestore write
  //       without an auth check);
  //   (f) an unattempted question being PADDED with a fabricated 0 instead of omitted.
  //
  // THE REPLACEMENT: `lazytopper/src/services/quickPracticeSessionService.persist.contract.test.ts`
  // — targeted tests over `persistQuickPracticeSession` itself, pinning every item above, with the
  // REAL record/code builders running and only the two WRITE seams spied. Count deliberately NOT
  // recorded here: a carried number goes stale the first time a test is added, and this comment is
  // not what re-reads it. Every mutation proven RED against a green control on the unmodified file.
  // ★ One first-draft assertion was PROVEN A SILENT NO-OP by that exercise — a two-call equality
  // check on the doc id stayed 12/12 GREEN while `Date.now()` was appended to the code, because
  // both calls land in the same millisecond — and was replaced by an IDENTITY assertion against
  // `quickPracticeCode()` before this ban was lifted. Its PRESENCE AND WIRING are asserted below,
  // so this lift cannot decay into "no protection at all".
  //
  // → THE OTHER FOUR ENTRIES REMAIN, BY DELIBERATE DECISION, and this is NOT a precedent for the
  // set: BATCH-1b touches neither the draw engine, the fetch-filter, the SessionRecord shape nor
  // the graded read. Do NOT re-add this entry without a deliberate owner decision — the absence
  // assertion below will fail if you do.
  "lazytopper/src/data/predictionDataService.ts", // the subtopicHint fetch-filter (draw stays)
  "lazytopper/src/data/practiceSetGenerator.ts", // the question draw / count logic
  // ★★ tutorRoundTrip.ts — blanket ban LIFTED (SCORECARD-MI-1 PR-2, H6/H8): superseded by owner
  // ruling 2026-10-05 (taxonomy and wording; marks not counts). WAS:
  //   "lazytopper/src/pages/tutor/tutorRoundTrip.ts", // composePracticeRecordReturnOpener — the graded read
  // PR-2 must change THIS file: its three openers named the root cause with the PRE-RULING split
  // (method = conceptual + calculation, presentation-led = presentation + silly), quoted a crossed-out
  // ("withdrawn") step as the fault, and phrased a v2 "unattempted" step as one ("is where it turned")
  // — the documented TRANSITIONAL Tutor contradiction (W6). It ends here. THE PROTECTION CHANGES FORM:
  // the inverse assertion, the replacement contract suite (EXISTS · COLLECTED · RUNS · SUBJECT) and
  // pins that TRANSPILE AND CALL the real openers (below). The graded READ path this ban protected —
  // `composePracticeRecordReturnOpener` over the record + payload — is still the read, and is pinned.
  // The C&I overlay gate's FLOOR checks on this file (the thin opener's signature + honest-floor line)
  // are untouched and still pass. Do NOT re-add without an owner decision.
  "lazytopper/src/services/sessionRecords.ts", // the SessionRecord shape / read — narrowed to ADDITIVE-ONLY below (owner ruling 2026-10-05: marks not counts)
];

// ★ SHAPE, asserted UNCONDITIONALLY. Ported from the C&I twin, which has carried it since a commit
// that really did modify a guarded file passed that gate 31/31 green: `changed.includes(f)` is
// exact array membership and `git diff --name-only` emits REPO-ROOT-relative paths, so an entry
// missing the `lazytopper/` prefix can NEVER match and guards NOTHING while reading as protection.
// THIS GATE HAD NO SUCH LOOP AT ALL until FORBID-4 — its then-five surviving entries were
// unverified. Filesystem-only, so it can never skip the way the diff loop below does.
for (const f of FORBIDDEN) {
  check(`FORBIDDEN(path): ${f} resolves to a real repo-relative file`,
    !f.startsWith("/") && !f.includes("\\") && existsSync(path.join(ROOT, f)),
    "this entry can never match `git diff --name-only` output, so it guards NOTHING "
    + "— check the lazytopper/ prefix");
}

// ★ MEMBERSHIP, asserted UNCONDITIONALLY — the four surviving entries. The git-diff loop below
// only runs when a base ref resolves; on a shallow checkout it skips entirely, so "these four are
// guarded AT ALL" is pinned here where nothing can skip it. Membership is NOT matchability: the
// FORBIDDEN(path) loop above is what proves an entry can match. The two are complementary.
// ⚠ THE LIFTED ENTRY'S LINE MUST LEAVE THIS LIST TOO — a removal from FORBIDDEN alone would fail
// the gate on its own amendment, and the surviving entries' lines must NOT be touched.
// superseded by owner ruling 2026-10-05: taxonomy and wording; marks not counts — WAS four entries;
// tutorRoundTrip.ts's line left BOTH lists together (SCORECARD-MI-1 PR-2, H6/H8). Inverse below.
for (const f of [
  "lazytopper/src/data/predictionDataService.ts",
  "lazytopper/src/data/practiceSetGenerator.ts",
  "lazytopper/src/services/sessionRecords.ts",
]) {
  check(`FORBIDDEN(wired): ${f} is still in the guarded set (FORBID-4 lifted App.tsx; FORBID-5 lifted quickPracticeSessionService.ts; SCORECARD-MI-1 PR-2 lifted tutorRoundTrip.ts — nothing else)`,
    FORBIDDEN.includes(f),
    "both lifts were deliberate ONE-FILE amendments — this entry must survive them");
}

// ★ THE INVERSE ASSERTIONS — what makes each lift itself OBSERVABLE. A silent re-add of a blanket
// entry turns this red and forces a deliberate owner decision, instead of quietly re-blocking the
// next lane with no discussion.
check("FORBIDDEN(lifted): App.tsx is NOT in the guarded set (ban replaced by GUARD 3 + App.routing.contract.test.tsx)",
  !FORBIDDEN.includes("lazytopper/src/App.tsx"),
  "re-adding the blanket entry needs an owner decision AND removal of the replacement tests");
check("FORBIDDEN(lifted): quickPracticeSessionService.ts is NOT in the guarded set (ban replaced by quickPracticeSessionService.persist.contract.test.ts)",
  !FORBIDDEN.includes("lazytopper/src/services/quickPracticeSessionService.ts"),
  "re-adding the blanket entry needs an owner decision AND removal of the replacement tests — "
  + "it would also re-block BATCH-1b, whose Ruling 1 mandates extending that exact file");

/* ══════════════════════════════════════════════════════════════════════════
   ★★ THE REPLACEMENT PROTECTION FOR THE LIFTED quickPracticeSessionService BAN (FORBID-5).
   ══════════════════════════════════════════════════════════════════════════
   Same reasoning as the App.tsx block below: a deleted FORBIDDEN entry plus a test file nobody
   invokes is strictly WORSE than the ban it replaced, because it READS as protection. So all
   three halves are asserted — the tests EXIST, they are COLLECTED by the vitest include glob, and
   vitest actually RUNS in CI. Filesystem-only, so this can never skip the way the diff loop can.
   ══════════════════════════════════════════════════════════════════════════ */
const QP_PERSIST_TESTS = "lazytopper/src/services/quickPracticeSessionService.persist.contract.test.ts";
check(`QP-PERSIST-TESTS: ${QP_PERSIST_TESTS} exists (the replacement for the lifted blanket ban)`,
  existsSync(path.join(ROOT, QP_PERSIST_TESTS)),
  "the blanket FORBIDDEN entry was lifted in favour of these tests — without them "
  + "persistQuickPracticeSession is unguarded and the double-write hazard is unwatched");
check("QP-PERSIST-TESTS: they are COLLECTED by the vitest include glob (src/**/*.test.{ts,tsx})",
  /include:\s*\["src\/\*\*\/\*\.test\.\{ts,tsx\}"\]/
    .test(readFileSync(path.join(LAZY, "vitest.config.ts"), "utf8"))
  && QP_PERSIST_TESTS.startsWith("lazytopper/src/") && QP_PERSIST_TESTS.endsWith(".test.ts"),
  "the include glob no longer matches the replacement tests — they would never be discovered");
check("QP-PERSIST-TESTS: vitest actually RUNS in CI (quality-gate.yml has a required `vitest run` step)",
  /vitest run/.test(readFileSync(path.join(ROOT, ".github/workflows/quality-gate.yml"), "utf8")),
  "no vitest step in CI — a .test.ts cannot replace a forbidden-path entry that nothing executes");
// ★ AND THE ASSERTION THE BAN WAS ACTUALLY BUYING IS STILL IN THERE. Presence + wiring alone would
// pass against an emptied file. The double-write hazard is the load-bearing one, so it is named.
const qpPersistSrc = existsSync(path.join(ROOT, QP_PERSIST_TESTS))
  ? readFileSync(path.join(ROOT, QP_PERSIST_TESTS), "utf8")
  : "";
check("QP-PERSIST-TESTS: they still pin ONE graded set -> ONE record + ONE payload (the double-write hazard)",
  /toHaveBeenCalledTimes\(1\)/.test(qpPersistSrc)
  && /writeSessionRecord/.test(qpPersistSrc) && /writeSessionPerQuestion/.test(qpPersistSrc),
  "the file exists and runs, but the assertion the ban was buying is gone — that is a "
  + "replacement in name only");

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

/* ══════════════════════════════════════════════════════════════════════════
   ★★ SCORECARD-MI-1 PR-2 (H6/H8) — the lifted tutorRoundTrip.ts ban, re-formed.
   superseded by owner ruling 2026-10-05: taxonomy and wording; marks not counts.
   The REAL openers are transpiled (TypeScript's transpileModule: no type-check, type-only imports
   erased; the one runtime import is the pure lib/mistakeDisplay) and CALLED — never re-derived.
   ══════════════════════════════════════════════════════════════════════════ */
check("FORBIDDEN(lifted): tutorRoundTrip.ts is NOT in the guarded set (owner ruling 2026-10-05; ban replaced by tutorRoundTrip.contract.test.ts + the opener pins)",
  !FORBIDDEN.includes("lazytopper/src/pages/tutor/tutorRoundTrip.ts"),
  "re-adding the blanket entry needs an owner decision AND removal of the replacement pins");
{
  const requireCjs = createRequire(import.meta.url);
  const ts = requireCjs(path.join(LAZY, "node_modules", "typescript"));
  const out = mkdtempSync(path.join(tmpdir(), "lt-qpov-"));
  for (const rel of ["pages/tutor/tutorRoundTrip.ts", "lib/mistakeDisplay.ts"]) {
    const js = ts.transpileModule(read(`src/${rel}`), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    }).outputText;
    const dest = path.join(out, rel.replace(/\.ts$/, ".js"));
    mkdirSync(path.dirname(dest), { recursive: true });
    writeFileSync(dest, js);
  }
  writeFileSync(path.join(out, "package.json"), '{"type":"commonjs"}');
  const rt = requireCjs(path.join(out, "pages/tutor/tutorRoundTrip.js"));
  const rec = (over = {}) => ({
    id: "CI-1", worksheetId: "ci:CI-1", surface: "check-improve", title: "T", subject: "maths", topicKeys: [], questionIds: [],
    marksAwarded: 3, marksTotal: 5, status: "graded", fourType: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
    sectionBreakdown: null, gradedAt: 2, perQuestionRef: "ci:CI-1", dedupKey: "u::CI-1", ...over,
  });
  const step = (over = {}) => ({ stepNumber: 1, description: "Real step", studentWork: "w", status: "incorrect", marksAwarded: 0,
    marksDeducted: 1, teacherAnnotation: "Fix this.", mistakeType: "calculation", correctedWorking: null, ...over });
  const resp = (steps, extra = {}) => ({ ok: true, totalQuestions: 1, gradedCount: 1, pendingCount: 0, gradedMarksAwarded: 3,
    gradedMarksTotal: 5, worksheetTotalMarks: 5,
    results: [{ qNumber: 1, couldNotRead: false, ok: true, totalMarks: 5, marksAwarded: 3, percentage: 60, annotatedSteps: steps, ...extra }] });
  const silly = rec({ fourType: { conceptual: 0, calculation: 0, silly: 2, presentation: 0 } });
  check("TRT (H6): silly is CARELESS in the owner's groups — 'you already know this', never the pre-ruling 'presentation' bucket",
    /You already know this/.test(rt.composeReturnOpener(silly, "T").text) && !/presentation/.test(rt.composeReturnOpener(silly, "T").text));
  const calc = rec({ fourType: { conceptual: 0, calculation: 2, silly: 0, presentation: 0 } });
  check("TRT (H6): calculation is CARELESS, never a 'method' fault (the rich opener, the record's read)",
    /You already know this/.test(rt.composeCheckImproveRichReturnOpener(calc, resp([step()]), "T").text)
      && !/method itself/.test(rt.composeCheckImproveRichReturnOpener(calc, resp([step()]), "T").text));
  const byMarks = rec({ fourType: { conceptual: 1, calculation: 3, silly: 0, presentation: 0 }, marksLostByTypeVersion: 1,
    marksLostByType: { conceptual: 1.5, calculation: 0.5, silly: 0, presentation: 0, unattempted: 0, untyped: 0 } });
  check("TRT (H6, marks not counts): MARKS decide when the record carries them — 1.5 knowledge marks beat 3 careless COUNTS",
    /method itself/.test(rt.composeReturnOpener(byMarks, "T").text));
  const struck = [step({ stepNumber: 1, status: "withdrawn", description: "Struck attempt", teacherAnnotation: "Crossed." }), step({ stepNumber: 2, description: "Real fault" })];
  const struckOpener = rt.composePracticeRecordReturnOpener(calc, { ref: "r", code: "c", worksheetId: "w", surface: "quick-practice", gradedAt: 2, response: resp(struck) }, "T");
  check("TRT (H8): a crossed-out (withdrawn) step is NEVER quoted as the fault — the graded read quotes the next real one",
    !!struckOpener && /Real fault/.test(struckOpener.text) && !/Struck attempt/.test(struckOpener.text));
  check("TRT (H8): a v2 'unattempted' step is never phrased as a fault (nothing quotable → the honest floor)",
    rt.composeCheckImproveRichReturnOpener(calc, resp([step({ status: "unattempted", description: "Part b" })]), "T") === null);
  const digest = rt.buildReturnedWork({ question: { text: "Q", imageBase64: null }, response: resp(struck), includeDigest: true });
  check("TRT (H8): a crossed-out step never reaches the model's digest",
    !!digest && Array.isArray(digest.steps) && !digest.steps.some((x) => x.status === "withdrawn"));
  const trt = stripComments(read("src/pages/tutor/tutorRoundTrip.ts"));
  check("TRT (H6): the pre-ruling grouping is gone — no method / presentation-led sums; the openers read the ONE root-cause function",
    !/const method = /.test(trt) && !/const presLed = /.test(trt) && (trt.match(/dominantLoss\(record\)/g) || []).length === 2);
  const TRT_CONTRACT = "lazytopper/src/pages/tutor/tutorRoundTrip.contract.test.ts";
  const trtTests = existsSync(path.join(ROOT, TRT_CONTRACT)) ? readFileSync(path.join(ROOT, TRT_CONTRACT), "utf8") : "";
  check(`TRT-CONTRACT: ${TRT_CONTRACT} exists (the replacement for the lifted blanket ban)`,
    existsSync(path.join(ROOT, TRT_CONTRACT)), "the ban was lifted in favour of this suite — without it the graded read is unguarded");
  check("TRT-CONTRACT: it is COLLECTED by the vitest include glob (src/**/*.test.{ts,tsx})",
    /include:\s*\["src\/\*\*\/\*\.test\.\{ts,tsx\}"\]/.test(readFileSync(path.join(LAZY, "vitest.config.ts"), "utf8"))
      && TRT_CONTRACT.startsWith("lazytopper/src/") && TRT_CONTRACT.endsWith(".test.ts"));
  check("TRT-CONTRACT: vitest actually RUNS in CI (quality-gate.yml has a required `vitest run` step)",
    /vitest run/.test(readFileSync(path.join(ROOT, ".github/workflows/quality-gate.yml"), "utf8")));
  check("TRT-CONTRACT: it still asserts its SUBJECT (owner groups · marks decide · withdrawn never quoted · not attempted is not a fault)",
    [/silly is CARELESS too/, /MARKS decide/, /withdrawn \(crossed-out\) step is NEVER quoted/, /'unattempted' step is not phrased as a fault/].every((r) => r.test(trtTests)),
    "the suite exists and runs, but the assertions the lift relies on are gone");
}

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

// ★★ BANK-LEAN-1 (owner ruling C1, wave A-10) — sessionRecords.ts is still guarded, but
// it may change in its IMPORT DECLARATIONS (and comment-only lines), and nowhere else. The
// owner ruled that `worksheetNomenclature` / `topicAbbr` move to the bank-free
// `components/worksheet/worksheetNaming.ts` and that sessionRecords.ts import them FROM
// THERE. Before that, its one import of worksheetModel put the ~8.6 MB question bank on
// every page that reads a session record. This entry exists to protect "the SessionRecord
// shape / read", and an import path cannot touch either. So the protection CHANGES FORM and
// does not disappear: the file must be byte-identical to its merge-base once import
// declarations and `//` comment lines are removed. Any edit to code, to the shape or to the
// read still turns this red. The entry stays in FORBIDDEN, so the membership assertions above
// are unchanged. Mirrored in LOCK-STEP in check_improve_overlay_additive_acceptance.mjs (same
// entry, same rule): a lift in only one gate is the PR-C1 / FORBIDDEN-4 trap. The rule is
// self-tested below with fixtures. A matcher nobody proved can fire is not a guard.
// ★★ SCORECARD-MI-1 PR-2 (H5 / H10) — superseded by owner ruling 2026-10-05: marks not counts ·
// taxonomy and wording. WAS: IMPORT-ONLY (BANK-LEAN-1, kept above as history) — the file had to be
// byte-identical to its merge-base outside its import declarations. PR-2 MUST change it: the record
// gains the versioned marks (H10), its four-type skips every not-graded / not-attempted question
// (H10), and a Check & Improve record gains each question's own subject and chapter (H5). The entry
// STAYS in FORBIDDEN and the rule is NARROWED AGAIN, not removed — ADDITIVE-ONLY. What the entry
// protected ("the SessionRecord shape / read") must still hold, so the file may change ONLY if:
//   (1) every member of SessionRecord, SessionPerQuestionPayload and SessionFourType at the
//       merge-base is still present, byte-identical — nothing removed, nothing retyped;
//   (2) every NEW member is OPTIONAL — an old record, which lacks it, still reads;
//   (3) the read predicate `isSessionRecord` and the `VALID_SURFACES` allow-list are unchanged —
//       an old record is accepted exactly as before.
// The pins after the rule assert what the additions DO, and the additive contract suite proves an
// old record reads back unchanged. Mirrored in LOCK-STEP in the twin overlay gate (same entry, same
// rule): a lift in only one gate is the PR-C1 / FORBID-4 trap. Self-tested below with fixtures.
const ADDITIVE_ONLY_ENTRIES = new Set(["lazytopper/src/services/sessionRecords.ts"]);
function srCode(src) {
  return stripComments(String(src).replace(/\r\n/g, "\n"));
}
function srInterfaceMembers(src, name) {
  const m = srCode(src).match(new RegExp(`export interface ${name} \\{([\\s\\S]*?)\\n\\}`));
  return m ? m[1].split("\n").map((l) => l.trim()).filter(Boolean) : null;
}
function srBlock(src, re) {
  const m = srCode(src).match(re);
  return m ? m[0].split("\n").map((l) => l.trim()).filter(Boolean).join("\n") : null;
}
const SR_READ_PREDICATE = /function isSessionRecord\([\s\S]*?\n\}/;
const SR_VALID_SURFACES = /const VALID_SURFACES[\s\S]*?\];/;
function additiveOnlyProblems(baseSrc, headSrc) {
  const problems = [];
  for (const name of ["SessionRecord", "SessionPerQuestionPayload", "SessionFourType"]) {
    const before = srInterfaceMembers(baseSrc, name);
    const after = srInterfaceMembers(headSrc, name);
    if (!before || !after) {
      problems.push(`${name}: interface not found`);
      continue;
    }
    for (const l of before) if (!after.includes(l)) problems.push(`${name}: existing member changed or removed: ${l}`);
    for (const l of after) {
      if (!before.includes(l) && /^[A-Za-z_$][\w$]*\s*:/.test(l)) problems.push(`${name}: new member is not optional: ${l}`);
    }
  }
  for (const [label, re] of [["isSessionRecord (the read predicate)", SR_READ_PREDICATE], ["VALID_SURFACES", SR_VALID_SURFACES]]) {
    const b = srBlock(baseSrc, re);
    const h = srBlock(headSrc, re);
    if (!b || !h || b !== h) problems.push(`${label} changed`);
  }
  return problems;
}
function additiveOnlyChange(base, f) {
  try {
    const mb = execFileSync("git", ["merge-base", base, "HEAD"], { cwd: ROOT }).toString().trim();
    const show = (ref) =>
      execFileSync("git", ["show", `${ref}:${f}`], { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 }).toString();
    return additiveOnlyProblems(show(mb), show("HEAD"));
  } catch (e) {
    return [`could not compare against the merge-base: ${e && e.message}`];
  }
}
{
  const fx = [
    "export interface SessionRecord {",
    "  id: string;",
    "  /** doc */",
    "  fourType: SessionFourType;",
    "}",
    "export interface SessionPerQuestionPayload {",
    "  ref: string;",
    "}",
    "export interface SessionFourType {",
    "  conceptual: number;",
    "}",
    "const VALID_SURFACES: SessionSurface[] = [",
    '  "worksheet",',
    "];",
    "function isSessionRecord(v: unknown): v is SessionRecord {",
    "  return !!v;",
    "}",
    "export function build() {",
    "  return 1;",
    "}",
    "",
  ].join("\n");
  // superseded by owner ruling 2026-10-05: marks not counts — WAS the two import-only fixtures.
  check("FORBIDDEN(additive-only): an OPTIONAL new member + a builder-body change is ALLOWED (owner ruling 2026-10-05: marks not counts)",
    additiveOnlyProblems(fx, fx.replace("  fourType: SessionFourType;\n", "  fourType: SessionFourType;\n  marksLostByType?: MarksLostByType;\n").replace("return 1;", "return 2;")).length === 0,
    "the additive-only rule rejects the very change it exists to allow");
  check("FORBIDDEN(additive-only): CONTROL — a REQUIRED new member is caught (an old record would no longer type-check)",
    additiveOnlyProblems(fx, fx.replace("  id: string;\n", "  id: string;\n  extra: number;\n")).length > 0,
    "the additive-only rule would let a non-additive shape change through");
  check("FORBIDDEN(additive-only): CONTROL — an existing member removed or retyped is caught",
    additiveOnlyProblems(fx, fx.replace("  id: string;\n", "  id: number;\n")).length > 0
      && additiveOnlyProblems(fx, fx.replace("  ref: string;\n", "")).length > 0,
    "the additive-only rule would let an existing field change or vanish");
  check("FORBIDDEN(additive-only): CONTROL — a changed read predicate (old records read differently) is caught",
    additiveOnlyProblems(fx, fx.replace("return !!v;", "return !!v && false;")).length > 0
      && additiveOnlyProblems(fx, fx.replace('  "worksheet",\n', '  "worksheet",\n  "other",\n')).length > 0,
    "the additive-only rule would let the read of an old record change");
  for (const f of ADDITIVE_ONLY_ENTRIES) {
    check(`FORBIDDEN(additive-only): ${f} is still in the guarded set`, FORBIDDEN.includes(f),
      "the additive-only rule narrows an entry; it must never stand in for a removed one");
  }
}

// ── What sessionRecords' additions DO (superseded by owner ruling 2026-10-05: marks not counts ·
//    taxonomy and wording). Source pins on the file itself + the additive contract suite.
{
  const sr = stripComments(read("src/services/sessionRecords.ts"));
  check("SR (H10): every record builder uses the ONE reduction (recordFourTypeAndMarks) — no couldNotRead-only loop left",
    (sr.match(/recordFourTypeAndMarks\(response\.results\)/g) || []).length === 5 && !/r\.couldNotRead \|\| !r\.mistakeSummary/.test(sr));
  check("SR (H10): the reduction skips EVERY not-graded and not-attempted question (the MI front door's own predicates)",
    /if \(!isGradedQuestion\(r\) \|\| isLossOnlyNotAttempted\(r\)\) continue;/.test(sr));
  check("SR (H10): marks are written ONLY versioned — a count-only record stays count-only",
    /marksLostByType: pm\.byType, marksLostByTypeVersion: MARKS_LOST_BY_TYPE_VERSION/.test(sr));
  check("SR (H5): a record without the per-question breakdown answers its own subject (old records read unchanged)",
    /return own\.size > 0 \? Array\.from\(own\) : \[record\.subject\];/.test(sr));
  const SR_CONTRACT = "lazytopper/src/services/sessionRecords.additive.contract.test.ts";
  const srTests = existsSync(path.join(ROOT, SR_CONTRACT)) ? readFileSync(path.join(ROOT, SR_CONTRACT), "utf8") : "";
  check(`SR-CONTRACT: ${SR_CONTRACT} exists (owner ruling 2026-10-05: marks not counts — the additive rule's behaviour suite)`,
    existsSync(path.join(ROOT, SR_CONTRACT)), "the rule was narrowed in favour of this suite — without it the additions are unguarded");
  check("SR-CONTRACT: it is COLLECTED by the vitest include glob (src/**/*.test.{ts,tsx})",
    /include:\s*\["src\/\*\*\/\*\.test\.\{ts,tsx\}"\]/.test(readFileSync(path.join(LAZY, "vitest.config.ts"), "utf8"))
      && SR_CONTRACT.startsWith("lazytopper/src/") && SR_CONTRACT.endsWith(".test.ts"),
    "the include glob no longer matches the suite — it would never be discovered");
  check("SR-CONTRACT: vitest actually RUNS in CI (quality-gate.yml has a required `vitest run` step)",
    /vitest run/.test(readFileSync(path.join(ROOT, ".github/workflows/quality-gate.yml"), "utf8")),
    "no vitest step in CI — a .test.ts cannot replace a guard that nothing executes");
  check("SR-CONTRACT: it still asserts its SUBJECT (old records read unchanged · marks only v2 · no type when not graded · mixed subjects)",
    [/OLD RECORDS READ UNCHANGED/, /records NO marks/, /add NO type/, /listed under both subjects/].every((r) => r.test(srTests)),
    "the suite exists and runs, but the assertions the narrowed rule relies on are gone");
}

const forbiddenBase = resolveForbiddenBase();
if (forbiddenBase) {
  const changed = execFileSync("git", ["diff", "--name-only", `${forbiddenBase}...HEAD`], { cwd: ROOT })
    .toString()
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const f of FORBIDDEN) {
    const touched = changed.includes(f);
    // superseded by owner ruling 2026-10-05: marks not counts · taxonomy and wording — WAS the
    // import-only test (`onlyImportsChanged`); sessionRecords.ts is now ADDITIVE-ONLY (H5 / H10).
    const additive = ADDITIVE_ONLY_ENTRIES.has(f);
    const problems = touched && additive ? additiveOnlyChange(forbiddenBase, f) : [];
    const ok = !touched || (additive && problems.length === 0);
    check(`FORBIDDEN: ${f} shows ${additive ? "no NON-ADDITIVE change (members kept, new members optional, the read unchanged)" : "zero changes"} (vs ${forbiddenBase})`, ok,
      ok ? "" : problems.length ? problems.join("; ") : "THIS FILE WAS MODIFIED");
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
// superseded by owner ruling 2026-10-05: taxonomy and wording; marks not counts
console.log("  forbidden zero-diff: predictionDataService · practiceSetGenerator · sessionRecords ADDITIVE-ONLY ·");
console.log("  ban LIFTED, protection re-formed: tutorRoundTrip → tutorRoundTrip.contract.test.ts + transpiled opener pins (SCORECARD-MI-1 PR-2) ·");
console.log("  ban LIFTED, protection re-formed: App.tsx → GUARD 3 (route propless) + App.routing.contract.test.tsx (FORBID-4) ·");
console.log("  ban LIFTED, protection re-formed: quickPracticeSessionService.ts → quickPracticeSessionService.persist.contract.test.ts (FORBID-5)\n");
