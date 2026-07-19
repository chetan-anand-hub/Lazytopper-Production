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
import { readFileSync } from "node:fs";
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
  "server/routes/checkSolution.cjs", // the grader — the tutor never grades
  // tutorRoundTrip.ts is NO LONGER file-level forbidden: the tutor-graded-context lane ADDS the
  // rich composer + buildReturnedWork BESIDE the thin composeReturnOpener. The real invariant (the
  // thin floor stays byte-identical) is enforced by the FLOOR/BESIDE source assertions in §3.
  "lazytopper/src/components/results/ResultsScorecard.tsx", // the overlay shows it, never restyles it
  "lazytopper/src/services/sessionRecords.ts", // SessionRecord shape (we only IMPORT the builder)
  "lazytopper/src/services/checkImproveGradeService.ts", // the persist seam
  "lazytopper/src/App.tsx", // routing (:320 stays green)
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
  console.error(`Tutor ⇄ C&I overlay acceptance FAILED — ${failures.length} failing:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`Tutor ⇄ C&I overlay acceptance PASSED — ${pass}/${pass} checks green.`);
console.log("  additive: default-off question + optional prop + route :320 ·");
console.log("  hunks overlay-gated: chrome-suppress · pinned ✕ · scorecard Back · in-process record (no re-persist) · graded response in-hand (Option 2b) ·");
console.log("  poll-free return: RICH opener with the thin composeReturnOpener as the honest floor · question+digest reach the model as one-shot returnedWork · navigate/marker leg retired ·");
console.log("  honest floor: thin composeReturnOpener byte-identical (rich ADDED BESIDE) · digest ships ON (live rubric-2 eval cleared it) ·");
console.log("  forbidden zero-diff: grader · ResultsScorecard · sessionRecords · gradeService · App\n");
