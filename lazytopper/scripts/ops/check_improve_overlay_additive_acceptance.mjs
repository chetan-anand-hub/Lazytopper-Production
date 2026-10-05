#!/usr/bin/env node
/**
 * Tutor ⇄ Check & Improve OVERLAY — acceptance gate (build v1.1, Option A).
 *
 * WHY A GATE AND NOT A vitest FILE: vitest is linux-pinned + not in CI here, so a vitest
 * file asserting these properties would never run anywhere that blocks a merge. This is the
 * house pattern (qr_upload_channel / check_improve_convergence acceptance): assert the
 * properties as source + git-diff invariants, in the matrix, on every PR.
 *
 * WHAT IT PROVES — the additive guarantee (report §5.1) made enforceable, plus the overlay
 * wiring the convergence gate does not cover:
 *   · the DIRECT /check-improve visit is byte-identical (the `overlay` prop is default-off);
 *   · the overlay's page hunks are each `overlay`-GATED — incl. the graded response now handed
 *     in-hand on close (Option 2b, the tutor-graded-context build);
 *   · the poll-free return path composes the RICH return-opener when the graded response is in
 *     hand, with the EXISTING (byte-identical) composeReturnOpener as the honest floor (the tutor
 *     never grades), and the check-improve navigate/marker leg is RETIRED;
 *   · the graded question + the eval-gated per-step digest reach the model as one-shot returnedWork
 *     context (never persisted); the digest ships only behind RETURNED_WORK_DIGEST_ENABLED;
 *   · the grader, the scorecard, the record shape, and the THIN composeReturnOpener (the honest
 *     floor) are UNTOUCHED — the rich composer is ADDED BESIDE, never edited.
 *
 * METHOD: source assertions run against COMMENT-STRIPPED source (a grep hit in a comment is
 * not a usage). The forbidden-path diff is PR-scoped and, in CI, HARD-FAILS on an
 * unresolvable base (a check that can silently not-run is not a check).
 *
 * Run from lazytopper/: node scripts/ops/check_improve_overlay_additive_acceptance.mjs
 */
import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LAZY = path.join(__dirname, "..", "..");
const ROOT = path.join(LAZY, "..");

const read = (p) => readFileSync(path.join(LAZY, p), "utf8");

/** Strip // line, /* block *\/, and JSX {/* … *\/} comments — a grep hit in a comment
 *  is not a usage (this repo's most-repeated failure mode). */
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

const pageRaw = read("src/pages/desktop/DesktopCheckImprovePage.tsx");
const page = stripComments(pageRaw);
const appRaw = read("src/App.tsx");
const app = stripComments(appRaw);
const hookRaw = read("src/pages/tutor/useTutorSession.ts");
const hook = stripComments(hookRaw);
const tutorPageRaw = read("src/pages/tutor/TutorPage.tsx");
const tutorPage = stripComments(tutorPageRaw);
const hostRaw = read("src/pages/tutor/TutorCheckImproveOverlay.tsx");
const host = stripComments(hostRaw);

/* ══════════════════════════════════════════════════════════════════════════
   1 · THE ADDITIVE GUARANTEE — the direct /check-improve visit is byte-identical.
   ══════════════════════════════════════════════════════════════════════════ */
section("1 · Additive guarantee (default-off — the single most important set)");

// GUARD 1 — the question field is UNCHANGED empty. The build carries NO seed (GAP-1 is
// topicKey-only), so `question` is byte-identical `useState<string>("")` regardless of
// `overlay`. The single most important guard: a direct visitor sees exactly today's field.
check(
  'GUARD 1: question state is byte-identical useState<string>("") (no seed — direct visit unchanged)',
  /const \[question, setQuestion\] = useState<string>\(""\)/.test(page),
);

// GUARD 2 — detection still fires ONLY on the button, never auto (not on mount/open/seed).
const readQuestionRefs = (page.match(/handleReadQuestion\b/g) || []).length;
check(
  "GUARD 2: handleReadQuestion is only DEFINED + bound to onClick (no auto-fire)",
  readQuestionRefs === 2 &&
    /onClick=\{handleReadQuestion\}/.test(page) &&
    !/handleReadQuestion\(\)/.test(page.replace(/function handleReadQuestion/g, "")),
  `found ${readQuestionRefs} refs to handleReadQuestion (expected exactly 2: def + onClick)`,
);

// GUARD 6 — the overlay prop is genuinely OPTIONAL: a bare <DesktopCheckImprovePage /> must
// still typecheck (this is what keeps the App route, gate :320, green).
check(
  "GUARD 6: overlay prop is optional (React.FC<{ overlay?: CheckImproveOverlayProps }>)",
  /React\.FC<\{\s*overlay\?:\s*CheckImproveOverlayProps\s*\}>/.test(page),
);

// GUARD 5 — the convergence gate's load-bearing :320: App renders the page UNCONDITIONALLY
// with NO props. Option A mounts the overlay ELSEWHERE (inside the tutor), never via the
// route, so the route element is untouched.
check(
  "GUARD 5: App route still renders <DesktopCheckImprovePage /> with NO props (convergence :320)",
  /path="\/check-improve"\s*\n\s*element=\{withRouteSuspense\(<DesktopCheckImprovePage \/>\)\}/.test(app),
);

/* ══════════════════════════════════════════════════════════════════════════
   2 · THE OVERLAY-GATED HUNKS — every behavioural change is behind `overlay`.
   ══════════════════════════════════════════════════════════════════════════ */
section("2 · The page hunks are overlay-gated");

// HUNK A — chrome suppression. In overlay mode the page renders BARE (no MobileShell, even
// at mobile width) so a full-screen sheet has no app nav to escape the tutor. Overlay-gated:
// the non-overlay branches keep MobileShell (direct mobile visit byte-identical), and
// useIsDesktop still governs camera-vs-QR in the body.
check(
  "HUNK A: withChrome forks on overlay first (overlay ? bare : isDesktop ? bare : MobileShell)",
  /overlay \? \(/.test(page) && /isDesktop \? \(\s*<>\{body\}<\/>\s*\) : \(/.test(page),
);
check(
  "HUNK A: the direct-visit mobile path STILL renders MobileShell (chrome suppression is overlay-only)",
  /<MobileShell title="Check & Improve" subtitle=\{subtitle\} showNav>/.test(page),
);

// HUNK B — the pinned ✕ closes via the payload-aware overlayReturn (keyed off scorecardOpen).
check(
  "HUNK B: the pinned overlay ✕ calls overlayReturn (payload-aware close)",
  /onClick=\{overlayReturn\}/.test(page),
);
check(
  "HUNK B: overlayReturn is keyed off the page's OWN scorecardOpen (no new signal invented)",
  /const overlayReturn = \(\) => \{[\s\S]*?if \(scorecardOpen\) \{[\s\S]*?overlay\.onClose\(\s*buildOverlayReturnRecord\(\),\s*\{ text: question, imageBase64: qImageBase64 \},/.test(page),
);
// HUNK B2 (tutor-graded-context) — the graded response is handed in-hand on close (Option 2b),
// built in exact lock-step with the record so the two never diverge, and NOT re-persisted.
check(
  "HUNK B2: the close passes the graded response in-hand (buildOverlayReturnResponse — Option 2b)",
  /overlay\.onClose\(\s*buildOverlayReturnRecord\(\),\s*\{ text: question, imageBase64: qImageBase64 \},\s*buildOverlayReturnResponse\(\),\s*\)/.test(page),
);
check(
  "HUNK B2: buildOverlayReturnResponse mirrors the record's whole-paper-vs-single split (no divergence)",
  /const buildOverlayReturnResponse = \(\): WorksheetGradeResponse \| undefined => \{[\s\S]*?if \(wsResult && confirmed\) return wsResult;[\s\S]*?if \(result && resultCtx\) return singleCheckToWorksheetResponse\(result\);/.test(page),
);

// HUNK C — the scorecard's "Back to your tutor" forks on overlay to hand back the record +
// question, else the untouched returnTicketInput. TWO sites (whole-paper + single-question).
const backForks = (
  page.match(/returnTicket: overlay\s*\?\s*\{ label: "Back to your tutor", onReturn: overlayReturn \}\s*:\s*returnTicketInput/g) || []
).length;
check(
  "HUNK C: both scorecard sites fork returnTicket on overlay (else returnTicketInput, byte-identical)",
  backForks === 2,
  `found ${backForks} overlay-forked returnTicket sites (expected 2)`,
);

// HUNK D — the record is built IN-PROCESS with the SAME builder the persist path uses, and
// is NOT re-persisted (persistCheckImproveSession stays at its 2 grade-path call sites).
check(
  "HUNK D: buildOverlayReturnRecord uses buildCheckImproveSessionRecord (the persist path's own builder)",
  /const buildOverlayReturnRecord[\s\S]*?buildCheckImproveSessionRecord\(\{/.test(page),
);
const persistCalls = (page.match(/persistCheckImproveSession\(\{/g) || []).length;
check(
  "HUNK D: the hand-back does NOT re-persist — persistCheckImproveSession stays at 2 grade-path calls",
  persistCalls === 2,
  `found ${persistCalls} persistCheckImproveSession call sites (expected 2)`,
);

/* ══════════════════════════════════════════════════════════════════════════
   3 · THE POLL-FREE RETURN + THE RETIRED NAVIGATE LEG (tutor side).
   ══════════════════════════════════════════════════════════════════════════ */
section("3 · Tutor wiring — poll-free return, retired navigate leg");

// The overlay open is a state flip — NO routeOut, NO navigate, NO pending marker.
check(
  "RETURN: openCheckImproveOverlay just opens the panel (no navigate/routeOut)",
  /const openCheckImproveOverlay = useCallback\(\(\) => \{\s*setCheckImproveOverlayOpen\(true\);\s*\}, \[\]\);/.test(hook),
);
// The RETIRED leg: no surface:"check-improve" pending marker is created anywhere in the hook.
check(
  'RETIRED: the check-improve navigate/marker leg is gone (no `surface: "check-improve"` marker in the hook)',
  !/surface: "check-improve"/.test(hook),
);
// The close composes the RICH opener when the graded response is in hand, with the EXISTING
// (byte-identical) thin composeReturnOpener as the honest floor (the tutor never grades; poll-free).
check(
  "RETURN: closeCheckImprove composes the RICH opener with the thin composeReturnOpener as the floor",
  /const rich = gradedResponse\s*\?\s*composeCheckImproveRichReturnOpener\(record, gradedResponse, topicLabel\)\s*:\s*null;[\s\S]*?injectReturn\(rich \?\? composeReturnOpener\(record, topicLabel, "check-improve"\)\);/.test(hook),
);
// The graded question + eval-gated digest are assembled into one-shot returnedWork model context.
check(
  "RETURN: closeCheckImprove assembles one-shot returnedWork (question + eval-gated digest) via buildReturnedWork",
  /returnedWorkRef\.current = buildReturnedWork\(\{[\s\S]*?includeDigest: RETURNED_WORK_DIGEST_ENABLED,/.test(hook),
);
// The returnedWork context is passed to the model on the return turn (Piece 1 reaches the model).
check(
  "RETURN: returnedWork is passed to callTutor (the question reaches the MODEL, not just the host)",
  /returnedWork: returnedWorkRef\.current,/.test(hook),
);
// The in-memory question is held (the seam), never persisted.
check(
  "RETURN: the raw question is held in-memory (overlayQuestionRef), never persisted",
  /overlayQuestionRef\.current = question/.test(hook),
);

// TutorPage: the EXISTING CTA opens the overlay (the swap), and the host is mounted.
check(
  'SWAP: the "Get my attempt marked" CTA opens the overlay (onClick={openCheckImproveOverlay})',
  /onClick=\{openCheckImproveOverlay\}/.test(tutorPage),
);
check(
  "SWAP: TutorPage mounts <TutorCheckImproveOverlay open={...} onClose={closeCheckImprove} />",
  /<TutorCheckImproveOverlay open=\{checkImproveOverlayOpen\} onClose=\{closeCheckImprove\} \/>/.test(tutorPage),
);
// The host mounts the REAL page (not a copy) with the overlay prop.
check(
  "HOST: TutorCheckImproveOverlay mounts the REAL DesktopCheckImprovePage with overlay={{ onClose }}",
  /import DesktopCheckImprovePage/.test(host) &&
    /<DesktopCheckImprovePage overlay=\{\{ onClose \}\} \/>/.test(host),
);

/* ── The honest floor stays (tutor-graded-context) — tutorRoundTrip.ts is ADDED-BESIDE, not
      edited. The file-level forbidden ban is superseded (this lane legitimately adds the rich
      composer + buildReturnedWork), so the real invariant is re-expressed as source assertions:
      the THIN composeReturnOpener is byte-present and unchanged, and the rich composer sits
      BESIDE it (never replacing it). This is the §4 HARD constraint made enforceable. */
const roundTrip = stripComments(read("src/pages/tutor/tutorRoundTrip.ts"));
check(
  "FLOOR: the thin composeReturnOpener keeps its exact 3-arg signature (added-beside, not edited)",
  /export function composeReturnOpener\(\s*record: SessionRecord,\s*topicLabel: string,\s*surface: "check-improve" \| "worksheet" = "check-improve",\s*\): ReturnOpener \{/.test(roundTrip),
);
check(
  "FLOOR: the thin composeReturnOpener honest-floor line is byte-identical (no marks → generic opener)",
  /You're back with your graded \$\{topicLabel\} \$\{source\}\. Want to go through where it slipped, together\?/.test(roundTrip),
);
check(
  "BESIDE: composeCheckImproveRichReturnOpener is added as a SEPARATE export (never replaces the thin one)",
  /export function composeCheckImproveRichReturnOpener\(/.test(roundTrip) &&
    /export function composeReturnOpener\(/.test(roundTrip),
);
check(
  "DIGEST: the per-step digest ships ON via the single flag (live rubric-2 eval cleared it — Half B)",
  /export const RETURNED_WORK_DIGEST_ENABLED = true;/.test(roundTrip),
);

/* ══════════════════════════════════════════════════════════════════════════
   4 · FORBIDDEN — the grader, round-trip internals, scorecard, record: zero diff.
   ══════════════════════════════════════════════════════════════════════════ */
section("4 · Forbidden paths untouched (git-scoped)");

const IN_CI = !!process.env.CI;
const EVENT = process.env.GITHUB_EVENT_NAME || null;
const PR_TARGET = process.env.GITHUB_BASE_REF || null;

const FORBIDDEN = [
  // ★ THE `lazytopper/` PREFIX IS LOAD-BEARING. `changed.includes(f)` is exact array
  // membership, and `git diff --name-only` emits repo-root-relative paths, so an
  // unprefixed form could NEVER match. PROVEN BY A CONTROL CASE: a commit that really
  // did append a line to the grader passed this gate 31/31 green. See the
  // FORBIDDEN(path) loop below.
  //
  // ★★ checkSolution.cjs — blanket ban LIFTED (owner decision, Wave 3 PR-C1), in step
  // with the identical entry in check_improve_convergence_acceptance.mjs. THE GRADER
  // WAS BANNED IN TWO GATES, NOT ONE — lifting it in only one would have left the
  // responseSchema lane (PR-C2) red here while looking unblocked there. Protection
  // changes FORM, not existence (the #519 DesktopShell precedent): the replacement is
  // `lazytopper/server/routes/checkSolution.test.cjs`, whose presence and wiring are
  // asserted below. The invariant THIS gate cares about is unchanged and still holds:
  // the tutor never grades — it reads graded work, it does not produce it.
  // Do NOT re-add the blanket entry without a deliberate owner decision.
  // tutorRoundTrip.ts is NO LONGER file-level forbidden: the tutor-graded-context lane ADDS the
  // rich composer + buildReturnedWork BESIDE the thin composeReturnOpener. The real invariant (the
  // thin floor stays byte-identical) is enforced by the FLOOR/BESIDE source assertions in §3.
  //
  // ★★ App.tsx — blanket ban LIFTED 2026-08-04 (owner decision, Wave 5C lane FORBID-4), in
  // LOCK-STEP with the identical entry in quick_practice_overlay_additive_acceptance.mjs.
  // APP.TSX WAS BANNED IN TWO GATES, NOT ONE — exactly the trap the grader hit in PR-C1.
  // Lifting it in only one would have left ME-PROGRESS red here while looking unblocked there,
  // so both were amended in the same PR. (It is NOT in check_improve_convergence_acceptance.mjs;
  // several documents claimed it was and every one of them was wrong — the array was enumerated,
  // not grepped, to establish that.)
  //
  // WHY NOW: the ME-PROGRESS lane must repoint the `/me` route to a single responsive
  // MeProgressPage, replacing DesktopMePage + MobileMePage — the Option-B convergence already
  // shipped for Exam Trends, Topic Hub, Worksheets and Check & Improve itself. That is a bounded
  // `element=` change and nothing else, but this array is PR-scoped with no lane-scoping and no
  // exception mechanism, so the ban blocked it outright. Precedent: #519 (DesktopShell.tsx),
  // PR-C1 (checkSolution.cjs), #581 (SolutionChecker.tsx).
  // THE PROTECTION CHANGES FORM, IT DOES NOT DISAPPEAR.
  //
  // WHAT THIS GATE'S BAN WAS ACTUALLY BUYING, made explicit — the entry read only
  // "routing (:320 stays green)", i.e. it existed to protect GUARD 5 above, which asserts the
  // /check-improve route element still renders <DesktopCheckImprovePage /> with NO props (Option A
  // mounts the C&I overlay inside the tutor, never via the route). GUARD 5 is a SOURCE regex and
  // it already runs unconditionally, so the ban's marginal contribution here was narrow: it also
  // covered (a) the same propless invariant expressed BEHAVIOURALLY rather than as source shape,
  // and (b) the premise both overlay hosts are built on — that there is EXACTLY ONE Router, owned
  // by main.tsx. A second Router anywhere in the app tree is the #490 defect verbatim.
  //
  // THE REPLACEMENT: `lazytopper/src/App.routing.contract.test.tsx` — 9 targeted tests that mount
  // the REAL App inside the app's always-present outer router and the full main.tsx provider
  // stack, pinning: exactly one Router (with a CONTROL case that nests a second one and must
  // THROW, so the assertion cannot pass vacuously), and that BOTH guarded route elements
  // (/check-improve and /practice/:grade/:subject) still resolve to a mounted page carrying NO
  // overlay prop and no props at all. All mutations proven RED. Its PRESENCE AND WIRING are
  // asserted below, so this lift cannot decay into "no protection at all".
  //
  // → THE OTHER THREE ENTRIES REMAIN, BY DELIBERATE DECISION. This is a one-file amendment and
  // NOT a precedent for the set: ME-PROGRESS does not touch the scorecard, the SessionRecord
  // shape or the persist seam, and lifting a ban before there is a need unprotects more than the
  // case justifies. Do NOT re-add the App.tsx entry without a deliberate owner decision — the
  // absence assertion below will fail if you do.
  //
  // ★★ ResultsScorecard.tsx — blanket ban LIFTED 2026-08-05 (owner decision, Wave 5E lane
  // FORBID-6), in LOCK-STEP with the identical entry in
  // check_improve_convergence_acceptance.mjs. THE SCORECARD WAS BANNED IN TWO GATES, NOT ONE —
  // exactly the trap the grader hit in PR-C1 and App.tsx hit in FORBID-4. Lifting it here only
  // would have left the batch-grading arc red over there while looking unblocked, so both were
  // amended in the SAME PR. (It is NOT in quick_practice_overlay_additive_acceptance.mjs — that
  // array was ENUMERATED at trunk 9717248c to establish this, not grepped; its four entries are
  // predictionDataService, practiceSetGenerator, tutorRoundTrip and sessionRecords.)
  //
  // WHY NOW: the owner has ruled Quick Practice becomes exam-shaped — nothing grades per
  // question, ONE batched call at Finish, then a scorecard across the set plus per-answer
  // board-style depth. ResultsScorecard is where those results land, so until this lifted the
  // batching lane would have removed per-question feedback with NOWHERE to show the grades: a
  // broken loop, not merely a dead capability. This array is PR-scoped with no lane-scoping and
  // no exception mechanism, so the ban blocked that lane outright. Precedent: #519
  // (DesktopShell.tsx), PR-C1 (checkSolution.cjs), #581 (SolutionChecker.tsx), #601 (App.tsx),
  // #606 (quickPracticeSessionService.ts). THE PROTECTION CHANGES FORM, IT DOES NOT DISAPPEAR.
  //
  // WHAT THIS GATE'S BAN WAS ACTUALLY BUYING, made explicit — and the entry read only
  // "the overlay shows it, never restyles it". ★ HUNK C above asserts that
  // DesktopCheckImprovePage BUILDS a `returnTicket` and forks it on `overlay`; it says NOTHING
  // about whether the scorecard RENDERS it. So the one invariant this gate most depends on —
  // THE STUDENT GETS BACK TO THE TUTOR IN ONE TAP — had its producer checked and its consumer
  // unchecked. A shell that dropped an action, dropped the `onClick` wiring, or reordered
  // `variant.actions` would leave HUNK C green and the overlay IMPOSSIBLE TO CLOSE. ⚠ The
  // ticket rides BOTH footer layouts: the stacked what-next menu and the flat 2-up row that
  // C&I's all-pending branch uses — the moment a stranded student most wants the way home.
  // "Never restyles it" also covered the close affordances (Escape / ✕ / dim close; a click
  // INSIDE the card must not), the honest states CLAUDE.md §5 requires (no deflated 0 hero
  // behind allPending, no fabricated "across G of T graded", no invented 0/0 MCQ line, an
  // attempts hero never rendered as marks/total), and the deferred config-seam guard.
  //
  // THE REPLACEMENT:
  // `lazytopper/src/components/results/ResultsScorecard.contract.test.tsx` — targeted render
  // tests over the shell itself, every assertion POSITIVE on the rendered result and paired
  // with a control, all mutations proven RED against a green control on the unmodified file.
  // ★★ IT DELIBERATELY DOES NOT PIN THE VARIANT SET — the batch-grading lane ADDS a variant,
  // and a test pinning today's set would forbid exactly the change this lift exists to permit;
  // its `variant-set openness` block proves a new surface renders and that C&I's output is
  // unchanged by the addition. Its PRESENCE AND WIRING are asserted below.
  //
  // → THE OTHER TWO ENTRIES REMAIN, BY DELIBERATE DECISION: the batching arc touches neither
  // the SessionRecord shape nor the C&I persist seam. Do NOT re-add this entry without a
  // deliberate owner decision — the absence assertion below will fail if you do.
  "lazytopper/src/services/sessionRecords.ts", // SessionRecord shape (we only IMPORT the builder) — narrowed to ADDITIVE-ONLY below (owner ruling 2026-10-05: marks not counts)
  // ★★ checkImproveGradeService.ts — blanket ban LIFTED (SCORECARD-MI-1 PR-2, H4/H9): superseded by
  // owner ruling 2026-10-05 (taxonomy and wording; marks not counts). WAS:
  //   "lazytopper/src/services/checkImproveGradeService.ts", // the persist seam
  // PR-2 must change THIS file: its single-question adapter now carries GA-38's `objective` flag,
  // the GRADER-CORE-1 v2 fields and an honest not-graded paper itself — so the tutor's IN-HAND
  // response (HUNK B2, `buildOverlayReturnResponse` → `singleCheckToWorksheetResponse`, whose line
  // stays pinned byte-identical above) finally carries them too. The convergence gate lifted its own
  // ban on this file in the SAME PR (a half-lift is the PR-C1 / FORBID-4 trap). THE PROTECTION
  // CHANGES FORM: the inverse assertion, the replacement contract suite (EXISTS · COLLECTED · RUNS ·
  // SUBJECT) and the pins on the adapter below. Do NOT re-add without an owner decision.
];

// ★ MEMBERSHIP, asserted UNCONDITIONALLY — the two surviving entries. The git-diff loop below
// only runs when a base ref resolves (a PR, or a local full clone); on a shallow checkout it
// skips entirely, so "these two are guarded AT ALL" is pinned here where nothing can skip it.
// NOTE: membership is not matchability — a gate can print "shows zero changes" while matching
// nothing (that is exactly how an unprefixed entry once passed 31/31 green). The FORBIDDEN(path)
// loop below is what proves matchability; these two assertions are complementary, not redundant.
// ⚠ THE LIFTED ENTRY'S LINE MUST LEAVE THIS LIST TOO — a removal from FORBIDDEN alone would fail
// the gate on its own amendment — and the surviving entries' lines must NOT be touched.
// superseded by owner ruling 2026-10-05: taxonomy and wording; marks not counts — WAS two entries
// (sessionRecords.ts + checkImproveGradeService.ts); the latter's line left BOTH lists together
// (SCORECARD-MI-1 PR-2, H4/H9), its inverse assertion is below.
for (const f of [
  "lazytopper/src/services/sessionRecords.ts",
]) {
  check(`FORBIDDEN(wired): ${f} is still in the guarded set (FORBID-4 lifted App.tsx; FORBID-6 lifted ResultsScorecard.tsx; SCORECARD-MI-1 PR-2 lifted checkImproveGradeService.ts — nothing else)`,
    FORBIDDEN.includes(f),
    "both lifts were deliberate ONE-FILE amendments — this entry must survive them");
}

// ★ THE INVERSE ASSERTIONS — what makes each lift itself OBSERVABLE. A silent re-add of a blanket
// entry turns this red and forces the deliberate owner decision the comments above ask for,
// instead of quietly re-blocking the next lane with no discussion.
check("FORBIDDEN(lifted): App.tsx is NOT in the guarded set (ban replaced by App.routing.contract.test.tsx)",
  !FORBIDDEN.includes("lazytopper/src/App.tsx"),
  "re-adding the blanket entry needs an owner decision AND removal of the replacement tests");
check("FORBIDDEN(lifted): ResultsScorecard.tsx is NOT in the guarded set (ban replaced by ResultsScorecard.contract.test.tsx)",
  !FORBIDDEN.includes("lazytopper/src/components/results/ResultsScorecard.tsx"),
  "re-adding the blanket entry needs an owner decision AND removal of the replacement tests — "
  + "it would also re-block the Quick Practice batch-grading arc, whose results land in that component");

// ★ SHAPE, asserted UNCONDITIONALLY — the guard that would have caught the missing
// `lazytopper/` prefix, and the reason it can never come back. An entry that does not
// resolve to a real repo-relative file cannot match `git diff --name-only` output and
// therefore guards NOTHING, while reading as protection to every future reader.
// Filesystem-only (no subprocess, no git base) so it can never skip the way the diff
// loop below does when no base ref resolves.
for (const f of FORBIDDEN) {
  check(`FORBIDDEN(path): ${f} resolves to a real repo-relative file`,
    !f.startsWith("/") && !f.includes("\\") && existsSync(path.join(ROOT, f)),
    "this entry can never match `git diff --name-only` output, so it guards NOTHING "
    + "— check the lazytopper/ prefix");
}

// ★★ THE REPLACEMENT PROTECTION FOR THE LIFTED GRADER BAN (PR-C1). Asserted here too,
// deliberately: this gate ran its own independent ban on the grader, so it needs its
// own independent proof that something replaced it. A lift verified in only one of the
// two gates would leave this one silently protecting nothing.
check("GRADER-TESTS: the targeted grader tests exist (the replacement for the lifted blanket ban)",
  existsSync(path.join(ROOT, "lazytopper/server/routes/checkSolution.test.cjs")),
  "the blanket FORBIDDEN entry was lifted in favour of these tests — without them the grader is unguarded");
check("GRADER-TESTS: they are WIRED into lazytopper test:matrix:all (a test nobody runs guards nothing)",
  /"test:matrix:all":[^\n]*test:server:check-solution/
    .test(readFileSync(path.join(ROOT, "lazytopper/package.json"), "utf8")),
  "present but unwired — add `npm run test:server:check-solution` to test:matrix:all");

/* ══════════════════════════════════════════════════════════════════════════
   ★★ THE REPLACEMENT PROTECTION FOR THE LIFTED App.tsx BAN (FORBID-4).
   ══════════════════════════════════════════════════════════════════════════
   Same reasoning as the GRADER-TESTS block above, and asserted independently in BOTH overlay
   gates on purpose: each ran its own ban on App.tsx, so each needs its own proof that something
   replaced it. A deleted FORBIDDEN entry plus a test file nobody invokes is strictly WORSE than
   the ban it replaced, because it READS as protection. So all three halves are asserted — the
   tests EXIST, they are COLLECTED by the vitest include glob, and vitest actually RUNS in CI.
   Filesystem-only (no subprocess, no git base) so this can never skip the way the diff loop can.
   ══════════════════════════════════════════════════════════════════════════ */
const APP_CONTRACT_TESTS = "lazytopper/src/App.routing.contract.test.tsx";
check(`APP-TESTS: ${APP_CONTRACT_TESTS} exists (the replacement for the lifted blanket ban)`,
  existsSync(path.join(ROOT, APP_CONTRACT_TESTS)),
  "the blanket FORBIDDEN entry was lifted in favour of these tests — without them App.tsx routing is unguarded");
// COLLECTED: vitest's include glob is what decides whether the file is even discovered. A test
// outside the glob is invisible and silently guards nothing.
check("APP-TESTS: they are COLLECTED by the vitest include glob (src/**/*.test.{ts,tsx})",
  /include:\s*\["src\/\*\*\/\*\.test\.\{ts,tsx\}"\]/
    .test(readFileSync(path.join(ROOT, "lazytopper/vitest.config.ts"), "utf8"))
  && APP_CONTRACT_TESTS.startsWith("lazytopper/src/") && APP_CONTRACT_TESTS.endsWith(".test.tsx"),
  "the include glob no longer matches the replacement tests — they would never be discovered");
// RUNS: the vitest step in the root workflow is a REQUIRED gate with no exclusions. If vitest ever
// stops running in CI, this replacement protection is gone and this gate must say so — that is
// precisely why the assertion reaches into the workflow rather than trusting a comment.
check("APP-TESTS: vitest actually RUNS in CI (quality-gate.yml has a required `vitest run` step)",
  /vitest run/.test(readFileSync(path.join(ROOT, ".github/workflows/quality-gate.yml"), "utf8")),
  "no vitest step in CI — a .test.tsx cannot replace a forbidden-path entry that nothing executes");

/* ══════════════════════════════════════════════════════════════════════════
   ★★ THE REPLACEMENT PROTECTION FOR THE LIFTED ResultsScorecard BAN (FORBID-6).
   ══════════════════════════════════════════════════════════════════════════
   Same reasoning as the two blocks above, and asserted independently in BOTH gates that
   banned the file on purpose: each ran its own ban, so each needs its own proof that
   something replaced it. All three halves — the tests EXIST, they are COLLECTED by the
   vitest include glob, and vitest actually RUNS in CI — plus the SUBJECT, because a
   replacement that stopped asserting what the ban was buying is the silent no-op this whole
   exercise exists to prevent. Filesystem-only, so it can never skip the way the diff loop can.
   ══════════════════════════════════════════════════════════════════════════ */
const RS_CONTRACT_TESTS = "lazytopper/src/components/results/ResultsScorecard.contract.test.tsx";
check(`RESULTSSCORECARD-TESTS: ${RS_CONTRACT_TESTS} exists (the replacement for the lifted blanket ban)`,
  existsSync(path.join(ROOT, RS_CONTRACT_TESTS)),
  "the blanket FORBIDDEN entry was lifted in favour of these tests — without them the scorecard "
  + "shell is unguarded and HUNK C's return ticket has a checked producer and an unchecked consumer");
check("RESULTSSCORECARD-TESTS: they are COLLECTED by the vitest include glob (src/**/*.test.{ts,tsx})",
  /include:\s*\["src\/\*\*\/\*\.test\.\{ts,tsx\}"\]/
    .test(readFileSync(path.join(ROOT, "lazytopper/vitest.config.ts"), "utf8"))
  && RS_CONTRACT_TESTS.startsWith("lazytopper/src/") && RS_CONTRACT_TESTS.endsWith(".test.tsx"),
  "the include glob no longer matches the replacement tests — they would never be discovered");
check("RESULTSSCORECARD-TESTS: vitest actually RUNS in CI (quality-gate.yml has a required `vitest run` step)",
  /vitest run/.test(readFileSync(path.join(ROOT, ".github/workflows/quality-gate.yml"), "utf8")),
  "no vitest step in CI — a .test.tsx cannot replace a forbidden-path entry that nothing executes");
const rsContractSrc = existsSync(path.join(ROOT, RS_CONTRACT_TESTS))
  ? readFileSync(path.join(ROOT, RS_CONTRACT_TESTS), "utf8")
  : "";
check("RESULTSSCORECARD-TESTS: they still assert the RETURN TICKET reaches a clickable button",
  /returnTicket/.test(rsContractSrc) && /onReturn/.test(rsContractSrc)
  && /toHaveBeenCalledTimes\(1\)/.test(rsContractSrc),
  "this gate's HUNK C checks the PRODUCER of the ticket — these tests are the only check on the "
  + "consumer, and without them the overlay can become impossible to close with nothing red");
check("RESULTSSCORECARD-TESTS: they keep the variant SET open (they must NOT forbid adding a variant)",
  /variant-set openness/.test(rsContractSrc),
  "the batch-grading lane ADDS a variant — a replacement that pinned today's set would forbid "
  + "exactly the change this lift exists to permit");

/* ══════════════════════════════════════════════════════════════════════════
   ★★ SCORECARD-MI-1 PR-2 (H4/H9) — the lifted checkImproveGradeService.ts ban, re-formed.
   superseded by owner ruling 2026-10-05: taxonomy and wording; marks not counts.
   ══════════════════════════════════════════════════════════════════════════ */
check("FORBIDDEN(lifted): checkImproveGradeService.ts is NOT in the guarded set (owner ruling 2026-10-05; ban replaced by checkImproveGradeService.contract.test.ts + the adapter pins)",
  !FORBIDDEN.includes("lazytopper/src/services/checkImproveGradeService.ts"),
  "re-adding the blanket entry needs an owner decision AND removal of the replacement pins");
{
  const cigs = stripComments(read("src/services/checkImproveGradeService.ts"));
  check("CIGS (H4/H9): the tutor's in-hand response carries GA-38's objective flag and the v2 fields — the ADAPTER itself carries them (one path)",
    /graded\.objective === true \? \{ objective: true \} : \{\}/.test(cigs) && /\.\.\.v2GradeFields\(graded\)/.test(cigs),
    "HUNK B2 hands the tutor singleCheckToWorksheetResponse(result) — without these the tutor reads a grade stripped of its flags");
  check("CIGS (H4/H9): an answer that was NOT graded reaches the tutor as \"nothing graded, one pending\" — never a graded 0",
    /if \(!isGradedQuestion\(result\)\) \{[\s\S]{0,200}?gradedCount: 0,\s*pendingCount: 1,/.test(cigs));
  const CIGS_CONTRACT = "lazytopper/src/services/checkImproveGradeService.contract.test.ts";
  // The SUBJECT is read COMMENT-STRIPPED: a header comment naming the subject must never stand in
  // for the test itself (proven by a mutation that deleted the test and stayed green).
  const cigsTests = existsSync(path.join(ROOT, CIGS_CONTRACT)) ? stripComments(readFileSync(path.join(ROOT, CIGS_CONTRACT), "utf8")) : "";
  check(`CIGS-CONTRACT: ${CIGS_CONTRACT} exists (the replacement for the lifted blanket ban)`,
    existsSync(path.join(ROOT, CIGS_CONTRACT)), "the ban was lifted in favour of this suite — without it the persist seam is unguarded");
  check("CIGS-CONTRACT: it is COLLECTED by the vitest include glob (src/**/*.test.{ts,tsx})",
    /include:\s*\["src\/\*\*\/\*\.test\.\{ts,tsx\}"\]/.test(readFileSync(path.join(LAZY, "vitest.config.ts"), "utf8"))
      && CIGS_CONTRACT.startsWith("lazytopper/src/") && CIGS_CONTRACT.endsWith(".test.ts"));
  check("CIGS-CONTRACT: vitest actually RUNS in CI (quality-gate.yml has a required `vitest run` step)",
    /vitest run/.test(readFileSync(path.join(ROOT, ".github/workflows/quality-gate.yml"), "utf8")));
  check("CIGS-CONTRACT: it still asserts its SUBJECT (one record + one payload · objective + v2 carried · never a graded 0)",
    [/exactly ONE record and ONE payload/, /objective:true survives/, /v2 fields are carried/, /never a graded 0/].every((r) => r.test(cigsTests)),
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
// shape" ("we only IMPORT the builder"), and an import path cannot touch the shape. So the
// protection CHANGES FORM and does not disappear: the file must be byte-identical to its
// merge-base once import declarations and `//` comment lines are removed. Any edit to code,
// to the shape or to the read still turns this red. The entry stays in FORBIDDEN, so the
// membership assertions above are unchanged. Mirrored in LOCK-STEP in
// quick_practice_overlay_additive_acceptance.mjs (same entry, same rule): a lift in only one
// gate is the PR-C1 / FORBID-4 trap. The rule is self-tested below with fixtures. A matcher
// nobody proved can fire is not a guard.
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
// superseded by owner ruling 2026-10-05: marks not counts — HARDENED (verifier N3, controller fix
// round 2026-10-05): "the read unchanged" now covers the WHOLE read of an old record, not only its
// predicate — the cloud read, its merge over the local mirror and the local read are frozen too
// (a probe that made the cloud read drop non-graded records passed both gates GREEN before this).
const SR_CLOUD_READ = /export async function getSessionRecordsFromCloud\([\s\S]*?\n\}/;
const SR_MERGE_BY_ID = /function mergeById\([\s\S]*?\n\}/;
const SR_LOCAL_READ = /export function loadLocalSessionRecords\([\s\S]*?\n\}/;
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
  for (const [label, re] of [
    ["isSessionRecord (the read predicate)", SR_READ_PREDICATE],
    ["VALID_SURFACES", SR_VALID_SURFACES],
    // superseded by owner ruling 2026-10-05: marks not counts — hardened (verifier N3).
    ["getSessionRecordsFromCloud (the cloud read)", SR_CLOUD_READ],
    ["mergeById (cloud over the local mirror)", SR_MERGE_BY_ID],
    ["loadLocalSessionRecords (the local read)", SR_LOCAL_READ],
  ]) {
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
    // superseded by owner ruling 2026-10-05: marks not counts — hardened (verifier N3): the fixture
    // carries the three frozen read functions too.
    "export function loadLocalSessionRecords(uid?: string | null): SessionRecord[] {",
    "  return [];",
    "}",
    "function mergeById(primary: SessionRecord[], secondary: SessionRecord[]): SessionRecord[] {",
    "  return [...secondary, ...primary];",
    "}",
    "export async function getSessionRecordsFromCloud(uid?: string | null): Promise<SessionRecord[]> {",
    "  return mergeById([], loadLocalSessionRecords(uid));",
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
  // superseded by owner ruling 2026-10-05: marks not counts — hardened (verifier N3): the WHOLE read.
  check("FORBIDDEN(additive-only): CONTROL — a changed cloud read, merge or local read (old records read differently) is caught",
    additiveOnlyProblems(fx, fx.replace("  return mergeById([], loadLocalSessionRecords(uid));", "  return mergeById([], loadLocalSessionRecords(uid)).filter((r) => r.status === \"graded\");")).length > 0
      && additiveOnlyProblems(fx, fx.replace("  return [...secondary, ...primary];", "  return [...primary];")).length > 0
      && additiveOnlyProblems(fx, fx.replace("  return [];\n}\nfunction mergeById", "  return [].slice(1);\n}\nfunction mergeById")).length > 0,
    "the additive-only rule would let the cloud / merged / local read of an old record change");
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
  // The SUBJECT is read COMMENT-STRIPPED: a header comment naming the subject must never stand in
  // for the test itself (proven by a mutation that deleted the test and stayed green).
  const srTests = existsSync(path.join(ROOT, SR_CONTRACT)) ? stripComments(readFileSync(path.join(ROOT, SR_CONTRACT), "utf8")) : "";
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
  console.error(`Tutor ⇄ C&I overlay acceptance FAILED — ${failures.length} failing:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`Tutor ⇄ C&I overlay acceptance PASSED — ${pass}/${pass} checks green.`);
console.log("  additive: default-off question + optional prop + route :320 ·");
console.log("  hunks overlay-gated: chrome-suppress · pinned ✕ · scorecard Back · in-process record (no re-persist) · graded response in-hand (Option 2b) ·");
console.log("  poll-free return: RICH opener with the thin composeReturnOpener as the honest floor · question+digest reach the model as one-shot returnedWork · navigate/marker leg retired ·");
console.log("  honest floor: thin composeReturnOpener byte-identical (rich ADDED BESIDE) · digest ships ON (live rubric-2 eval cleared it) ·");
// superseded by owner ruling 2026-10-05: taxonomy and wording; marks not counts
console.log("  forbidden: sessionRecords ADDITIVE-ONLY (members kept, new members optional, the read unchanged) ·");
console.log("  ban LIFTED, protection re-formed: checkImproveGradeService → checkImproveGradeService.contract.test.ts + adapter pins (SCORECARD-MI-1 PR-2) ·");
console.log("  bans LIFTED, protection re-formed: grader → checkSolution.test.cjs (PR-C1) · App.tsx → App.routing.contract.test.tsx (FORBID-4) ·");
console.log("  ResultsScorecard → ResultsScorecard.contract.test.tsx (FORBID-6; presence, collection, CI execution and SUBJECT asserted)\n");
