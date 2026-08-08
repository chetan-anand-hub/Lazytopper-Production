/**
 * Check & Improve convergence — acceptance gate.
 *
 * WHY THIS IS A CI GATE AND NOT A vitest FILE: vitest is linux-pinned and does not
 * run on a Windows dev box, and CI runs the MATRICES, not the general vitest suite —
 * so a vitest file asserting these properties would never actually run anywhere that
 * blocks a merge. (Same reasoning as qr_upload_channel_acceptance.mjs, which is the
 * house pattern this follows.)
 *
 * WHY IT EXISTS AT ALL: C&I shipped as two twin components chosen by a route-level
 * `isDesktop` ternary. The mobile twin DRIFTED — it rendered the answer above the
 * question, so a student uploaded their solution and then met a disabled button
 * telling them to read a question that sat below it — and nobody noticed, because a
 * twin split means the bug only exists on one of them. Convergence removes the split.
 * This gate exists so it cannot come back, and so the promises made while removing it
 * are proven on every PR rather than asserted in a report nobody re-runs.
 *
 * ★ ITEM ZERO — MISTAKE INTELLIGENCE. MI is the product's moat and the owner named it
 * twice. Exactly ONE presentational rail card was deleted; every MI path is untouched.
 * "mistake" appears on 55 lines of the converged file at the base commit and only 3 of
 * them were allowed to go. A grep-and-delete on "mistake" would have destroyed this
 * surface — one of the 55 hits is a COMMENT, and the card that was deleted is
 * STRUCTURALLY NEAR-IDENTICAL to one that had to survive (same cardStyle, same
 * padding, same eyebrow, differing only in testing `user ?` vs `saveStatus ===`).
 * These checks pin the outcome so no future edit can quietly take the wrong one.
 *
 * A NOTE ON METHOD: every source assertion runs against COMMENT-STRIPPED source.
 * A grep hit is not a usage — this file's own comments mention `matchMedia` and
 * `isNarrow`, and a naive matcher would fail on its own prose (or, worse, pass a
 * regression because a real hit hid among comments).
 */
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LAZY = path.join(__dirname, '..', '..');
const ROOT = path.join(LAZY, '..');

const CONVERGED = path.join(LAZY, 'src', 'pages', 'desktop', 'DesktopCheckImprovePage.tsx');
const RETIRED_TWIN = path.join(LAZY, 'src', 'pages', 'app', 'CheckImprove.tsx');
const APP = path.join(LAZY, 'src', 'App.tsx');
const UPLOAD_LIMITS = path.join(LAZY, 'src', 'services', 'uploadLimits.ts');
const DETECTION = path.join(LAZY, 'src', 'utils', 'checkImproveDetection.ts');
const EQUATION_INPUT = path.join(LAZY, 'src', 'components', 'equation', 'EquationInput.tsx');
const QR_HANDOFF = path.join(LAZY, 'src', 'components', 'qr', 'QrAnswerHandoff.tsx');
const QR_UPLOAD_PAGE = path.join(LAZY, 'src', 'pages', 'QrAnswerUploadPage.tsx');
const QR_SERVICE = path.join(LAZY, 'src', 'services', 'qrUploadService.ts');
const QR_CHANNEL = path.join(LAZY, 'server', 'services', 'qrUploadChannel.cjs');

let pass = 0;
const failures = [];
function check(label, cond, detail = '') {
  if (cond) {
    pass += 1;
    console.log(`  ok  ${label}`);
  } else {
    failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
    console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`);
  }
}
function section(t) {
  console.log(`\n${t}`);
}

const read = (p) => readFileSync(p, 'utf8');

/** Strip // line comments, block comments, and JSX {/* … *\/} comments.
 *  A grep hit inside a comment is not a usage (the repo's most-repeated failure). */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/([^:])\/\/[^\n"'`]*$/gm, '$1');
}

const convergedRaw = read(CONVERGED);
const converged = stripComments(convergedRaw);
const appRaw = read(APP);
const app = stripComments(appRaw);

// ── REF RESOLUTION — the honest version (2026-07-18 gate fix) ────────────────
// Two checks below compare against git history, and they have DIFFERENT needs, so the
// original single `base` ref was wrong for both:
//
//   • The MI moat (item 0) is PERMANENT. The 52 lines that survived the convergence
//     must survive byte-identical FOREVER — so it is anchored to a FIXED SHA (the
//     commit PR-1 forked from), never a moving branch ref. Anchoring it to
//     `origin/base/...` was the bug: once #466 merged, that ref IS trunk, so the file
//     was compared to ITSELF (55→54, "0 gone" → false red); and on CI's shallow
//     checkout the ref was absent entirely, so the whole check SILENTLY SKIPPED —
//     green build, moat unguarded, on every run including the "fully green" one.
//
//   • FORBIDDEN is PR-SCOPED. checkSolution.cjs may legitimately change in a DIFFERENT
//     lane later, so "did THIS change set touch it?" is a question about the PR, not
//     about all of history — answered by the merge-base with the PR's target branch.
//     On a push-to-trunk run there is no PR to scope against, so it reports N/A rather
//     than the old vacuous green (base===HEAD ⇒ empty diff ⇒ everything "passes").
//
// ★ THE LOAD-BEARING RULE: in CI, a ref we NEED but cannot resolve is a HARD FAILURE,
// never a skip. A check that can silently not-run is not a check. This exact gate
// skipped its hardest checks on every CI run because `quality-gate.yml` did a depth-1
// checkout that hid the refs. That workflow now fetches depth-0 + the base branch; THIS
// half of the fix makes the gate REFUSE TO PASS if that ever regresses. The predecessor
// workflow "never ran" for a sibling reason (wrong directory) — a check silently not
// running is a repeat failure mode in this repo, so it is now designed against.
const IN_CI = !!process.env.CI;
const EVENT = process.env.GITHUB_EVENT_NAME || null;   // 'pull_request' | 'push' | null
const PR_TARGET = process.env.GITHUB_BASE_REF || null; // set ONLY on pull_request events

// The convergence's PR-1 base. Verified an ancestor of trunk (`git merge-base
// --is-ancestor e8f75af origin/base/approved-thru-437`), so it is durable — full SHA,
// not an abbreviation, so it stays unambiguous as history grows.
const MI_ANCHOR = 'e8f75af2b17815c0dac924821abefb2d9c4fb226';

function hasRef(ref) {
  try {
    execFileSync('git', ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`], { cwd: ROOT, stdio: 'pipe' });
    return true;
  } catch { return false; }
}

// The PR-scoped base for the FORBIDDEN diff: the PR's target branch on a pull_request,
// the integration branch on a local run, and NOTHING on a push-to-trunk run (no PR).
function resolveForbiddenBase() {
  if (PR_TARGET) {
    for (const r of [`origin/${PR_TARGET}`, PR_TARGET]) if (hasRef(r)) return r;
    return null; // pull_request but the target ref is unreachable — handled as a CI failure below
  }
  if (!IN_CI) {
    for (const r of ['origin/base/approved-thru-437', 'base/approved-thru-437']) if (hasRef(r)) return r;
  }
  return null; // push-to-trunk (or unknown CI event) — N/A, not a pass
}

/* ══════════════════════════════════════════════════════════════════════════
   0 · MISTAKE INTELLIGENCE — item ZERO. Every path byte-untouched.
   ══════════════════════════════════════════════════════════════════════════ */
section('0 · MISTAKE INTELLIGENCE (item zero)');

// The MI front doors.
check('MI: `recordMistake` imported from services/mistakeIntelligence',
  /import\s*\{\s*recordMistake\s*\}\s*from\s*"\.\.\/\.\.\/services\/mistakeIntelligence"/.test(converged));
check('MI: `recordAttempt` imported from services/practiceInsights',
  /import\s*\{\s*recordAttempt\s*,\s*type\s+DetectionOverrideLog\s*\}\s*from\s*"\.\.\/\.\.\/services\/practiceInsights"/.test(converged));

// The write paths still fire. Call-site COUNT is pinned: the surface writes MI from
// the single-question path and the whole-paper path, and losing either is silent.
const recordMistakeCalls = (converged.match(/recordMistake\(/g) || []).length;
const recordAttemptCalls = (converged.match(/recordAttempt\(/g) || []).length;
check('MI: `recordMistake` called from both grade paths (2 call sites)',
  recordMistakeCalls === 2, `found ${recordMistakeCalls}`);
check('MI: `recordAttempt` called from both grade paths (2 call sites)',
  recordAttemptCalls === 2, `found ${recordAttemptCalls}`);

// The taxonomy and its colours.
for (const key of ['conceptual', 'calculation', 'silly', 'presentation']) {
  check(`MI: MISTAKE_LABELS retains "${key}"`,
    new RegExp(`${key}:\\s*\\{\\s*label:`).test(converged));
}

// The payload shape — the default that keeps a missing summary honest (all zeros)
// rather than absent.
const summaryShapes = (converged.match(/mistakeSummary\s*\?\?\s*\{\s*conceptual:\s*0,\s*calculation:\s*0,\s*silly:\s*0,\s*presentation:\s*0\s*\}/g) || []).length;
check('MI: every `mistakeSummary ?? {…}` default shape intact (3 sites)',
  summaryShapes === 3, `found ${summaryShapes}`);

// The per-step mistake chips — student-visible MI output.
check('MI: the per-step mistake-type chips still render',
  /step\.mistakeType\s*&&\s*MISTAKE_LABELS\[step\.mistakeType\]/.test(converged) &&
  /MISTAKE_LABELS\[step\.mistakeType\]\.label/.test(converged));

// ★ ALL THREE mistake-history regions. The spec originally modelled only two; there
// are three, because there are TWO separate graded-result renderers (whole-paper and
// single-question) and each carries its own save copy. Asserting only the famous one
// would let a whole-paper regression pass green.
check('MI region A/3: whole-paper result save-failed copy',
  /couldn't write to your mistake history this time/.test(convergedRaw));
check('MI region B/3: single-question result — "✓ Saved to your mistake history."',
  /✓ Saved to your mistake history\./.test(convergedRaw));
check('MI region C/3: single-question result — the surviving "Mistake history" card',
  /sectionEyebrow\}>Mistake history<\/div>/.test(convergedRaw));
check('MI: the surviving result card is keyed on saveStatus (NOT the deleted `user ?` card)',
  /saveStatus === "saved"/.test(converged) && /saveStatus === "save-failed"/.test(converged));

// ★ The card that was deleted — its three strings must be GONE, and only those.
check('MI: the deleted rail card\'s signed-in filler is gone',
  !/Signed in as/.test(convergedRaw) && !/Each successful grading is saved/.test(convergedRaw));

// ★ THE MI INVARIANT, asserted as the REAL property rather than a proxy for it.
//
// The first draft of this check counted total "mistake" lines and asserted == 53.
// That is a PROXY, and it broke immediately — on a COMMENT this very file's author
// wrote describing the surviving rail. A proxy check fails for reasons that are not
// bugs and passes for reasons that are, which makes it worse than no check: it
// trains you to "just update the number".
//
// The property that actually matters is: of the 55 lines that contained "mistake" at
// the base commit, exactly 52 survive BYTE-IDENTICAL and exactly 3 are gone (the rail
// card's). New lines mentioning "mistake" — the relocated disclosure required by
// owner decision (c), or a comment — are irrelevant to whether MI was touched.
// So: compare against the base commit, and say what was compared.
const DELETED_EXPECTED = [
  '<div style={sectionEyebrow}>Mistake history</div>',
  'Each successful grading is saved to your mistake history so we',
  "Sign in to save mistake history. Without an account we'll",
];
if (hasRef(MI_ANCHOR)) {
  const norm = (s) => s.split('\n').map((l) => l.trim()).filter((l) => /mistake/i.test(l));
  const baseFile = execFileSync(
    'git', ['show', `${MI_ANCHOR}:lazytopper/src/pages/desktop/DesktopCheckImprovePage.tsx`],
    { cwd: ROOT, maxBuffer: 1024 * 1024 * 16 },
  ).toString();
  const baseLines = norm(baseFile);
  const nowLines = norm(convergedRaw);
  const nowSet = [...nowLines];
  const survived = [];
  const gone = [];
  for (const l of baseLines) {
    const i = nowSet.indexOf(l);
    if (i >= 0) { nowSet.splice(i, 1); survived.push(l); } else { gone.push(l); }
  }
  check('MI: the anchor e8f75af had 55 "mistake" lines (re-derived from the SHA, not remembered)',
    baseLines.length === 55, `found ${baseLines.length}`);
  // ★ THE MOAT, made permanent. Anchored to the FIXED SHA, this is no longer a one-shot
  // "the convergence didn't touch MI" — it is a standing guarantee that those 52 lines
  // survive byte-identical in EVERY future commit. Any lane that alters one goes red.
  check('MI: all 52 survivors are still present BYTE-IDENTICAL (permanent moat guard)',
    survived.length === 52, `found ${survived.length}`);
  check('MI: exactly the deleted rail card\'s 3 lines are gone — no more, no fewer',
    gone.length === 3 && DELETED_EXPECTED.every((d) => gone.some((g) => g === d)),
    `gone(${gone.length}): ${JSON.stringify(gone)}`);
} else if (IN_CI) {
  // ★ HARD FAILURE, by design. In CI the anchor MUST be reachable; if it is not, the
  // moat check could not run, and a check that silently did not run reads as green.
  // This is the single most important line in the file.
  check('MI: the e8f75af moat anchor is reachable in CI (fetch-depth must be 0)',
    false,
    'anchor commit absent from the checkout — the 52-survivor moat check COULD NOT RUN. '
    + 'This is a hard failure on purpose: quality-gate.yml must fetch full history so the '
    + 'anchor is present. A check that cannot run is not a check.');
} else {
  console.log('  ~~  SKIPPED (local, non-CI): anchor e8f75af is not in this clone.');
  console.log('      Run `git fetch origin base/approved-thru-437` to enable the full MI moat check.');
  console.log('      (A local skip is fine — CI is where this MUST run, and there its absence FAILS.)');
}

// The relocated disclosure + the only login path on the surface. Decision (c) exists
// because the QR is desktop-AND-signed-in only, so deleting this outright would leave
// a signed-out desktop student with no QR and no way to sign in — a dead end.
check('MI: the signed-out disclosure survived RELOCATION (decision c)',
  /Sign in to save mistake history/.test(convergedRaw));
check('MI: the only gotoLogin on the surface survived relocation',
  /onClick=\{gotoLogin\}/.test(converged));

/* ══════════════════════════════════════════════════════════════════════════
   1 · THE CONVERGENCE MECHANISM — no window-derived value may drive layout.
   ══════════════════════════════════════════════════════════════════════════ */
section('1 · The convergence mechanism (§2.1)');

// ★ THE RULE, AS A MECHANISM. The rule used to be "never useIsDesktop for layout" —
// and this file never used useIsDesktop. It rolled its OWN matchMedia("(max-width:
// 960px)") driving an `isNarrow` flag through 13 sites including both layout grids,
// satisfying the old rule to the letter while committing the exact sin it existed to
// prevent. So the rule is now about the BEHAVIOUR, and this is the assertion that
// makes it real: a rename cannot evade it.
check('LAYOUT: ZERO matchMedia in the converged file (comment-stripped)',
  !/matchMedia/.test(converged));
check('LAYOUT: ZERO `isNarrow` in the converged file (comment-stripped)',
  !/isNarrow/.test(converged));

// The mechanism itself: flex-wrap against a real container.
check('LAYOUT: the fluid row uses flexWrap',
  /flexWrap:\s*"wrap"/.test(converged));

// ★ THE NUMBER THAT DOES THE WORK. 340 is not a preference. The shell sidebar is
// 260px and this page pads 64px, so a 1024px window leaves a 700px content box; two
// cards + a 16px gap must fit in 700 ⇒ basis ≤ 342. At 420 the cards needed a 1180px
// window and STACKED on every 1024 and 1152 laptop — the exact opposite of "question
// and answer sit side by side at desktop".
const basisMatch = converged.match(/const CARD_BASIS = (\d+);/);
const basis = basisMatch ? Number(basisMatch[1]) : -1;
check('LAYOUT: CARD_BASIS is 340 (≤342, so Q+A sit side by side at a 1024px window)',
  basis === 340, `found ${basis}`);
check('LAYOUT: both cards share the same fluid basis',
  (converged.match(/flex: `1 1 \$\{CARD_BASIS\}px`/g) || []).length === 2);

// ★ HEADER title block has a NON-ZERO flex-basis (Fix A, 2026-07-18). This is the whole
// bug, one level up from CARD_BASIS: the title block was on `flex: 1` (= basis 0%), so
// it never demanded width, so `flexWrap` on the header row could NEVER fire and the
// 30px title wrapped to five lines at 360px. Assert the PROPERTY (a real basis exists
// and is used), not a proxy — a grep for `flexWrap` would have passed the buggy code,
// and a count would not have caught it either. Guard both directions: a real constant,
// used on the title block, and `flex: 1` never reintroduced as the title's flex.
const headerBasisMatch = converged.match(/const HEADER_TITLE_BASIS = (\d+);/);
const headerBasis = headerBasisMatch ? Number(headerBasisMatch[1]) : 0;
check('LAYOUT: HEADER_TITLE_BASIS is a real non-zero basis (the header wrap can now fire)',
  headerBasis > 0 && headerBasis <= 526,
  `found ${headerBasis} — must be >0 (else the wrap is unreachable) and ≤526 (else the header stacks on the 1024px desktop the owner verified)`);
check('LAYOUT: the title block USES that basis, not `flex: 1`',
  /flex: `1 1 \$\{HEADER_TITLE_BASIS\}px`/.test(converged) &&
  !/<div style=\{\{ minWidth: 0, flex: 1 \}\}>/.test(converged));

// DOM order: the inverted-flow bug is structurally impossible when there is one order.
const qIdx = convergedRaw.indexOf('1 · The question');
const aIdx = convergedRaw.indexOf('2 · Your answer');
check('LAYOUT: DOM order is QUESTION before ANSWER — always, with no branch to invert it',
  qIdx > 0 && aIdx > 0 && qIdx < aIdx, `question@${qIdx} answer@${aIdx}`);

// useIsDesktop survives ONLY as device capability.
check('LAYOUT: useIsDesktop is imported (device capability only — chrome + camera)',
  /import \{ useIsDesktop \} from "\.\.\/\.\.\/hooks\/useIsDesktop"/.test(converged));

/* ══════════════════════════════════════════════════════════════════════════
   2 · THE ROUTE — one component at every width.
   ══════════════════════════════════════════════════════════════════════════ */
section('2 · The route resolves to ONE component');

check('ROUTE: /check-improve renders DesktopCheckImprovePage unconditionally',
  /path="\/check-improve"\s*\n\s*element=\{withRouteSuspense\(<DesktopCheckImprovePage \/>\)\}/.test(app));
check('ROUTE: the twin ternary is gone (no <CheckImprove /> element in App)',
  !/<CheckImprove \/>/.test(app));
check('ROUTE: the retired twin is NOT imported (tsc noUnusedLocals stays green)',
  !/lazy\(\(\) => import\("\.\/pages\/app\/CheckImprove"\)\)/.test(app));

// ★ THE TWIN IS GONE (PR-2, after live-verify). Through PR-1 this asserted the exact
// OPPOSITE — that the file still EXISTED — because the cheap one-line rollback
// depended on it. That check was spent the moment the deletion landed, and it is
// struck in the same PR that spent it rather than left to rot into a false green.
// What replaces it is the inverse invariant, which is the one that matters from here:
// the twin must never come BACK, because a second C&I component is how the drift
// started in the first place.
check('DELETED: the retired mobile twin is gone from the tree (PR-2)',
  !existsSync(RETIRED_TWIN));
check('DELETED: nothing imports the retired twin',
  !/pages\/app\/CheckImprove"/.test(app));

/* ══════════════════════════════════════════════════════════════════════════
   3 · THE UPLOAD PROMISE + THE GUARD (§2.3 / §2.5 / item 2)
   ══════════════════════════════════════════════════════════════════════════ */
section('3 · The upload promise and the guard');

// F11 — UPLOAD_LIMIT_SENTENCE is a TEMPLATE LITERAL. Asserting the literal string
// against the source would fail on a correct file. Assert the IMPORTED VALUE.
const limits = await import(
  'file://' + path.join(LAZY, 'src', 'services', 'uploadLimits.ts').replace(/\\/g, '/')
).catch(() => null);

if (limits) {
  check('COPY: the canonical sentence states the numbers the guard enforces',
    limits.UPLOAD_LIMIT_SENTENCE.includes(limits.formatUploadLimit(limits.MAX_UPLOAD_PDF_BYTES)) &&
    limits.UPLOAD_LIMIT_SENTENCE.includes(limits.formatUploadLimit(limits.MAX_UPLOAD_IMAGE_BYTES)),
    limits.UPLOAD_LIMIT_SENTENCE);
  check('COPY: D4 — the shared noun is "image", not "photo"',
    /image/.test(limits.UPLOAD_LIMIT_SENTENCE) && !/photo/.test(limits.UPLOAD_LIMIT_SENTENCE),
    limits.UPLOAD_LIMIT_SENTENCE);
} else {
  // Honest: state what was NOT checked rather than passing silently.
  const src = read(UPLOAD_LIMITS);
  check('COPY: D4 — the shared noun is "image" (source-level fallback; runtime import unavailable)',
    /JPG\/PNG image up to/.test(src) && !/JPG\/PNG photo up to/.test(src));
}

check('COPY: the converged file RENDERS the canonical sentence (never hand-writes it)',
  /import \{ checkUploadFile, UPLOAD_LIMIT_SENTENCE \}/.test(converged) &&
  /\{UPLOAD_LIMIT_SENTENCE\}/.test(converged));

// The false promise that started this. "PNG or JPG" hid PDF — the path the guard's own
// refusal calls RECOMMENDED. A student with a 3-page solution read it and concluded
// PDF was not allowed. [FU-CI-UPLOAD-COPY-CANONICAL]
// Comment-stripped: the code must not SAY it, but a comment may legitimately quote the
// old copy to record why it went. (This check's first draft used the raw source and
// failed on exactly such a comment — a grep hit is not a usage, in either direction.)
check('COPY: the false "PNG or JPG" promise is gone from the rendered copy',
  !/PNG or JPG/.test(converged));
check('COPY: the answer tab says "Upload image", not "Upload photo" (D4)',
  /"Upload image"/.test(converged) && !/"Upload photo"/.test(converged));
check('COPY: the multi-page line is present and TRUE (PDF is the multi-page path, D5/D6)',
  /scan feature to send it as one PDF/.test(convergedRaw));

// §2.5 — accept is a HINT, not a guard. Tightening it stops an iPhone picker OFFERING
// a HEIC that checkUploadFile then refuses: an avoidable refusal we manufactured.
check('ACCEPT: no loose `image/*` remains in the converged file',
  !/accept="image\/\*/.test(converged));
const tightAccepts = (converged.match(/accept="image\/jpeg,image\/png,application\/pdf"/g) || []).length;
check('ACCEPT: both inputs use the tight accept (question + answer)',
  tightAccepts === 2, `found ${tightAccepts}`);

// item 2 — the guard itself is unchanged and still on BOTH inputs, with the right
// subject noun. accept never replaces it.
check('GUARD: checkUploadFile still guards the ANSWER input',
  /checkUploadFile\(file, "answers"\)/.test(converged));
check('GUARD: checkUploadFile still guards the QUESTION input',
  /checkUploadFile\(file, "question"\)/.test(converged));

/* ══════════════════════════════════════════════════════════════════════════
   4 · THE BRAND — the purple is gone, ALL FIVE of it.
   ══════════════════════════════════════════════════════════════════════════ */
section('4 · The purple (§5.6 / F2)');

// hsl(280) is the hue this design system reserves for "presentation" mistakes
// (MistakeIntelligencePanel.tsx:29) and Section E (l2/PaperBlueprint.tsx:34). It was
// painting the primary CTAs on a mistake-grading surface.
//
// ★ Still scoped to the CONVERGED FILE — but the REASON changed at PR-2 and the note
// changes with it. Through PR-1 the scope existed because the retired twin still held
// all five purples on disk. The twin is now deleted, and the scope survives for a
// different reason: hsl(280) is CORRECT where it lives (the presentation-mistake chip
// and Section E). A tree-wide assertion would go red on the two files that are right.
check('BRAND: zero hsl(280 in the converged file',
  !/hsl\(280/.test(convergedRaw));
// ★ THE FIFTH. Killing "all 4 hsl(280)" left rgba(139,92,246,0.25) — #8b5cf6, the
// DISABLED Grade CTA, i.e. the state a student sees FIRST, before they upload anything.
// A grep for hsl(280 finds it; a replace of hsl(280 does not fix it.
check('BRAND: zero rgba(139,92,246 — the fifth purple, the disabled CTA',
  !/139\s*,\s*92\s*,\s*246/.test(convergedRaw));

/* ══════════════════════════════════════════════════════════════════════════
   5 · WHAT MUST NOT BREAK — the mechanically assertable §4 items.
   ══════════════════════════════════════════════════════════════════════════ */
section('5 · §4 items a script can reach');

// item 1 (PARTIAL — the round trip is owner live-verify; see the report)
check('§4.1 QR: the handoff is mounted, in the answer panel, with its required mode',
  /<QrAnswerHandoff/.test(converged) && /mode=\{isMultiQuestion \? "document" : "photo"\}/.test(converged));
check('§4.1 QR: delivery still lands in the SAME answer box (setImageBase64), not a new path',
  /onImageReceived=\{\(\{ imageBase64: b64, imageMimeType: mime \}\)/.test(converged));

// item 3 — the whole-paper path REQUIRES an uploaded answer sheet.
check('§4.3 multi-question: isMultiQuestion still requires an uploaded answer sheet',
  /isMultiQuestion/.test(converged));

// single-file state: ONE string, never an array. The 5MB body cap + base64 inflation
// is why multi-image is not the answer ([FU-CI-MULTIPAGE-CAPTURE]).
check('§4.6 state: imageBase64 is ONE string|null — never an array',
  /const \[imageBase64, setImageBase64\] = useState<string \| null>\(null\)/.test(converged) &&
  !/imageBase64.*useState<string\[\]/.test(converged));

// item 9 — "Your papers" stays a header control (volume rule), not a rail.
check('§4.9 Your papers: the history control + overlay panel survive',
  /Your papers ·/.test(convergedRaw) && /<CheckImproveHistoryPanel/.test(converged));

// ★ The regression the props-diff caught. The twins had drifted and the MOBILE one was
// AHEAD: it lazily loaded a re-opened paper's per-question payload so the by-topic lens
// could render. Converging on the desktop file wholesale would have silently regressed
// a student on a phone. The richer path won.
check('§4.9 re-open: the per-question payload is fetched so the by-topic lens can render',
  /getSessionPerQuestion\(user\?\.uid, r\.perQuestionRef\)/.test(converged) &&
  /response: reopenResponse/.test(converged));

// item 10 — Camera/Files, absorbed from the retired twin. Device capability, and the
// ONLY legitimate use of a device flag in the answer path.
check('§4.10 camera: capture="environment" behaviour is absorbed and device-gated',
  /setAttribute\("capture", "environment"\)/.test(converged) &&
  /removeAttribute\("capture"\)/.test(converged) &&
  /!isDesktop && !imageBase64/.test(converged));

// item 11 — an owner-owned launch gate. Not ours to flip.
const detection = read(DETECTION);
check('§4.11 SHOW_DETECTION_META is still true (owner gate — not ours to flip)',
  /export const SHOW_DETECTION_META = true;/.test(detection));

// Chrome ownership — one header at mobile width, never two.
check('CHROME: the page owns MobileShell at mobile width (ExamTrendsRanked convention)',
  /<MobileShell title="Check & Improve"/.test(converged));
check('CHROME: /check-improve stays in isMobileSelfChromedRoute (old brand bar stays suppressed)',
  /pathname === "\/check-improve" \|\|/.test(app));

/* ══════════════════════════════════════════════════════════════════════════
   6 · FORBIDDEN — the grader and the MI modules are untouched.
   ══════════════════════════════════════════════════════════════════════════ */
section('6 · Forbidden paths untouched');

const FORBIDDEN = [
  // ★ THE `lazytopper/` PREFIX IS LOAD-BEARING. The diff check below is
  // `changed.includes(f)` — exact array membership — and `git diff --name-only`
  // emits paths relative to the REPO ROOT, so an unprefixed entry can NEVER match.
  // PROVEN BY A CONTROL CASE, not by reading: a commit that really did append a
  // line to the grader once passed this gate 91/91 green, printing
  // "ok  FORBIDDEN: server/routes/checkSolution.cjs shows zero changes".
  // The FORBIDDEN(path) loop below makes that shape impossible to reintroduce.
  //
  // ★★ checkSolution.cjs — blanket ban LIFTED (owner decision, Wave 3 PR-C1).
  // The grader is still the file the owner named directly as untouchable; what
  // changed is the FORM of the protection, following the #519 precedent that
  // lifted the DesktopShell.tsx ban. Two lanes now have owner-approved reasons to
  // edit it — the responseSchema lane (PR-C2) and Quick Practice batch grading —
  // and a blanket ban would have forced BOTH to amend this file first anyway,
  // which is a rubber stamp, not a guard.
  // The replacement is `lazytopper/server/routes/checkSolution.test.cjs`: 32
  // targeted tests pinning the retry-once paths, the three generationConfig caps,
  // the no-working/mistakeType-null chain and the parser's full accepted range.
  // All 13 mutations proven RED. Its PRESENCE AND WIRING are asserted below, so
  // this lift cannot decay into "no protection at all".
  // Do NOT re-add the blanket entry without a deliberate owner decision.
  //
  // ★★ mistakeIntelligence.ts — blanket ban LIFTED 2026-08-08 (owner decision, Wave ME-A
  // lane OPS-LIFT-1). Precedent: #519 (DesktopShell.tsx), PR-C1 (checkSolution.cjs), #581
  // (SolutionChecker.tsx), #601 (App.tsx), #606 (quickPracticeSessionService.ts), FORBID-6
  // (ResultsScorecard.tsx). THE PROTECTION CHANGES FORM, IT DOES NOT DISAPPEAR.
  //
  // WHY NOW: the Me/Progress arc writes THROUGH this front door. MI-CONCEPT-1 (#637) adds
  // the bank `concept` and the `questionId` write-through to the log entry — additively,
  // 0 deletions — and ARRIVAL-1 / RETRY-1 queue behind it. This array is PR-scoped with no
  // lane-scoping and no exception mechanism, so the ban blocked the arc outright while
  // reading as a considered decision about each of those lanes. It was not: it predates
  // all of them.
  //
  // WHAT THIS BAN WAS ACTUALLY BUYING, made explicit — because a blanket ban says
  // "something here must not change" and never says what. ★ NOTHING IN THIS GATE ASSERTED
  // ONE BYTE OF THIS MODULE'S BEHAVIOUR: the only other mention of it anywhere in this file
  // is the §2 check that the C&I page IMPORTS `recordMistake` — which says nothing about
  // what the front door then does — so the FORBIDDEN entry was its ENTIRE protection.
  // Concretely the ban was the only thing standing between the mistake log and:
  //   (a) A SECOND WRITER. `recordMistake` is the single ingestion door into the store the
  //       tutor and /me read. A second module importing `logMistakes` is a DOUBLE-WRITE
  //       HAZARD, and it is the one failure no behavioural test can catch — you cannot
  //       prove a negative existential by calling a function;
  //   (b) THE TAXONOMY DRIFTING off the four types (conceptual / calculation / silly /
  //       presentation) that every downstream aggregate, hotspot and insight keys on;
  //   (c) `marksLost` accounting regressing — a negative deficit propagates into every /me
  //       aggregate as a CREDIT, silently cancelling real mark loss elsewhere;
  //   (d) ONE-ENTRY-PER-QUESTION becoming N — the fan-out that would surface as duplicated
  //       attempts in Mistake Intelligence, the exact corruption the controller model
  //       records as the double-write near-miss;
  //   (e) ★ CARELESS MISTAKES BECOMING A TOPIC WEAKNESS. silly + presentation must never
  //       reach the weak-area bridge, or a student who understands a topic is sent back to
  //       re-learn it. This is the moat, and it is a two-line condition away from breaking.
  //
  // THE REPLACEMENT: `lazytopper/src/services/mistakeIntelligence.contract.test.ts` —
  // targeted tests pinning every item above (count deliberately NOT recorded here: a
  // carried number goes stale the first time a test is added, and this comment is not what
  // re-reads it). Each of the five is mutation-proven RED against a green control.
  // ★★ THE REPLACEMENT DELIBERATELY DOES NOT PIN THE ENTRY'S KEY SET, the context field
  // list, or the dedup signature — #637 ADDS `concept` and `questionId` to the entry, and a
  // test pinning today's shape would forbid exactly the change this lift exists to permit.
  // That is the FORBID-1 failure, whose replacement asserted a CTA was enabled: true on the
  // day, unrelated to the ban, and it blocked GATE-2 four days later. The suite's
  // `additive-shape openness` block is the positive proof it cannot become a freeze.
  // Its PRESENCE, WIRING AND SUBJECT are asserted below, so this lift cannot decay into
  // "no protection at all".
  //
  // → THE OTHER FOUR ENTRIES REMAIN, BY DELIBERATE DECISION: the Me/Progress arc reads
  // practiceInsights and the MI panels but writes neither, and it does not go near the C&I
  // persist seam. Do NOT re-add this entry without a deliberate owner decision — the
  // absence assertion below will fail if you do.
  'lazytopper/src/services/practiceInsights.ts',
  'lazytopper/src/services/checkImproveGradeService.ts',
  'lazytopper/src/components/desktop/MistakeIntelCard.tsx',
  'lazytopper/src/components/desktop/l2/MistakeIntelligencePanel.tsx',
  // DesktopShell.tsx - blanket ban LIFTED (owner decision, PR-B1). The file now has
  // legitimate, owner-approved reasons to change: the rail's nav items, and the header
  // stacking context that traps the avatar dropdown. Protection moves from "nobody may
  // touch it" to targeted regression tests landing in PR-B2 alongside those changes.
  // Do NOT re-add this entry without a deliberate owner decision.
  // ★ Added by the question-side-parity PR. The owner named these directly: "the
  // solution checker engine, the scorecard and other important features and fixes we
  // have done so far shouldn't at all be changed." They were protected by nothing but
  // good intentions before — now the gate refuses any PR that touches them.
  //   ResultsScorecard — C&I mounts it (the graded-result view).
  //   SolutionChecker  — shares EquationInput; the whole autoGrow default-off proof
  //                      exists so THIS file can stay byte-identical.
  // ⚠ HISTORICAL: BOTH of those entries have since been lifted (FORBID-1 and FORBID-6) and
  // NEITHER is in the array below any more. The owner's sentence still stands — what changed
  // is the FORM of the protection. See the two lift records further down for what each ban
  // was buying and which test file now carries it.
  // NOTE: EquationInput.tsx is deliberately NOT here — it legitimately gains `autoGrow`;
  // its guard is the default-off assertion in §7, not a forbidden-path entry.
  //
  // ★★ SolutionChecker.tsx — blanket ban LIFTED 2026-08-03 (owner decision, Wave 5A
  // lane FORBID-1). WHY NOW: a locked Premium affordance had to be added to this
  // component — GATE-2 (#598) shipped the 402 catch that opens the sheet, and GATE-3
  // shipped the pre-emptive locked CTA — and this array is PR-scoped with no exception
  // mechanism, so the ban blocked it outright. Same precedent as #519 (DesktopShell.tsx)
  // and PR-C1 (checkSolution.cjs): THE PROTECTION CHANGES FORM, IT DOES NOT DISAPPEAR.
  //
  // WHAT THE BAN WAS ACTUALLY BUYING, made explicit — because a blanket ban says
  // "something here must not change" and never says what. This consumer mounts the
  // shared <EquationInput> passing NO `autoGrow` and NO `maxRows`. If the shared
  // default ever flipped on, then WITHOUT THIS FILE CHANGING ONE BYTE:
  //   (a) the textarea gains `lt-eq__textarea--grow`, whose only rule is
  //       `resize: none` — the student loses the resize handle; and
  //   (b) the height clamp becomes `[rows, maxRows ?? rows]`, which with no `maxRows`
  //       collapses to [4, 4] — the box is PINNED at four rows and can never grow.
  // §7's AUTOGROW checks below assert a REGEX over EquationInput.tsx's own source.
  // They never asserted anything about THIS file — not its opt-out, not one line of its
  // rendered behaviour — so until now the FORBIDDEN entry was the whole protection.
  //
  // THE REPLACEMENT: `lazytopper/src/components/question/SolutionChecker.contract.test.tsx`
  // — targeted tests (count deliberately NOT recorded here: a carried number goes stale
  // the first time a test is added, and this comment is not what re-reads it) pinning
  // the autoGrow opt-out (with a POSITIVE CONTROL, so the
  // negative assertion cannot pass vacuously if `--grow` is ever renamed), the public
  // prop contract, every rendering state, the image-XOR-text grade payload, the
  // objective-signal omission rule, the versioned localStorage key, and the
  // recordMistake/recordAttempt persistence twins. All 16 mutations proven RED.
  // Its PRESENCE AND WIRING are asserted below, so this lift cannot decay into "no
  // protection at all". Do NOT re-add the blanket entry without a deliberate owner
  // decision — the absence assertion below will fail if you do.
  //
  // ★★ ResultsScorecard.tsx — blanket ban LIFTED 2026-08-05 (owner decision, Wave 5E lane
  // FORBID-6). The comment that used to sit here predicted this exactly: "BATCH-2 may need
  // it later; that is its own owner decision at that time, and it would need TWO amendments
  // (this gate AND check_improve_overlay_additive_acceptance.mjs), not one." IT WAS BANNED
  // IN TWO GATES, NOT ONE, and both were amended in the SAME PR — a half-lift blocks the arc
  // exactly as a full ban would while reading as done. (It is NOT in
  // quick_practice_overlay_additive_acceptance.mjs — that array was ENUMERATED at trunk
  // 9717248c to establish this, not grepped; its four entries are predictionDataService,
  // practiceSetGenerator, tutorRoundTrip and sessionRecords.)
  //
  // WHY NOW: the owner has ruled Quick Practice becomes exam-shaped — nothing grades per
  // question, ONE batched call at Finish, and the student then sees a scorecard across the
  // set plus per-answer board-style depth. ResultsScorecard is where those results land, so
  // until this lifted the batching lane would have removed per-question feedback with
  // NOWHERE to show the grades: a broken loop, not merely a dead capability. This array is
  // PR-scoped with no lane-scoping and no exception mechanism, so the ban blocked that lane
  // outright. Precedent: #519 (DesktopShell.tsx), PR-C1 (checkSolution.cjs), #581
  // (SolutionChecker.tsx), #601 (App.tsx), #606 (quickPracticeSessionService.ts).
  // THE PROTECTION CHANGES FORM, IT DOES NOT DISAPPEAR.
  //
  // WHAT THIS BAN WAS ACTUALLY BUYING, made explicit — because a blanket ban says
  // "something here must not change" and never says what. ★ NOTHING IN THIS GATE ASSERTED
  // ONE BYTE OF THAT COMPONENT'S RENDERED BEHAVIOUR: every check here is a source regex over
  // the C&I page, the grader or the MI modules, so the FORBIDDEN entry was its ENTIRE
  // protection. The sibling suite `scorecardVariants.test.ts` covers the BUILDERS (what goes
  // into a variant), never the shell (what comes out of one). Concretely the ban was the
  // only thing standing between C&I and:
  //   (a) THE RETURN TICKET BECOMING UNREACHABLE — the tutor overlay hands the student back
  //       in one tap by appending a `{ label, onReturn }` ticket to the variant's actions
  //       (`returnTicketAction` → `{ label, tag: "Back", tone: "secondary", onClick }`), and
  //       this shell is what turns that object into a clickable button. Drop an action, drop
  //       the onClick wiring, or reorder the array and the overlay becomes IMPOSSIBLE TO
  //       CLOSE — it typechecks, it renders, nothing throws. ⚠ The ticket rides BOTH footer
  //       layouts: the stacked what-next menu AND the flat 2-up row that C&I's all-pending
  //       branch uses, i.e. the moment a stranded student most wants the way home;
  //   (b) the close affordances regressing (Escape / ✕ / dim close; a click INSIDE the card
  //       must not) and the Escape listener leaking past unmount;
  //   (c) FABRICATED NUMBERS (CLAUDE.md §5): the all-pending honest state collapsing into a
  //       deflated 0 hero, the "across G of T graded" descriptor appearing when the counts
  //       were deliberately omitted, an invented 0/0 MCQ accuracy line, an attempts hero
  //       rendered as marks/total (D-PROG-2);
  //   (d) the deferred config-seam stub reaching a live host.
  //
  // THE REPLACEMENT:
  // `lazytopper/src/components/results/ResultsScorecard.contract.test.tsx` — targeted render
  // tests over the shell itself (count deliberately NOT recorded here: a carried number goes
  // stale the first time a test is added, and this comment is not what re-reads it), pinning
  // every item above, each POSITIVE on the rendered result and paired with a control. Every
  // mutation proven RED against a green control on the unmodified file.
  // ★ ONE FIRST-DRAFT ASSERTION WAS PROVEN A SILENT NO-OP by that exercise: a
  // capture/re-capture equality on C&I's HTML stayed GREEN under a mutation that restyled
  // the card whenever the PREVIOUS render used a different surface, because earlier tests in
  // the file had already dirtied that state so BOTH captures carried the leak equally. It was
  // replaced by a DIFFERENTIAL assertion (C&I after a C&I predecessor vs C&I after a
  // Practice-side predecessor) before this ban was lifted.
  // ★★ THE REPLACEMENT DELIBERATELY DOES NOT PIN THE VARIANT SET, the surface set, or any
  // variant builder — the batching lane ADDS a variant, and a test pinning today's set would
  // forbid exactly the change this lift exists to permit. Its `variant-set openness` block is
  // the positive proof. Its PRESENCE AND WIRING are asserted below, so this lift cannot decay
  // into "no protection at all".
  //
  // → THE OTHER FIVE ENTRIES REMAIN, BY DELIBERATE DECISION, and this is NOT a precedent for
  // the set: the batching arc touches neither the MI modules nor the C&I persist seam.
  // Do NOT re-add this entry without a deliberate owner decision — the absence assertion
  // below will fail if you do.
];

// ★ MEMBERSHIP, asserted UNCONDITIONALLY (not gated on a resolvable git base). The
// git-diff loop below only runs when a base ref is present (a PR, or a local full clone);
// on a shallow checkout it skips. So the guarantee "these are guarded at all" is pinned
// here, where nothing can skip it — a shallow checkout that could not run the diff still
// proves the guards are WIRED. Membership is NOT matchability: the FORBIDDEN(path) loop
// below is what proves an entry can match `git diff --name-only` output. Complementary.
// ⚠ THE LIFTED ENTRY'S LINE MUST LEAVE THIS LIST TOO — a removal from FORBIDDEN alone would
// fail the gate on its own amendment — and the surviving entries' lines must NOT.
//
// ★ THIS LOOP REPLACES a single hand-written check that named ResultsScorecard and NOTHING
// ELSE. Deleting that check with its entry (FORBID-6) would have left this gate with no
// unconditional membership assertion at all, so the five survivors are enumerated here
// instead: the lift must not cost the gate a guarantee it already had.
// ★ OPS-LIFT-1 CONFIRMS THE WARNING ABOVE IS LOAD-BEARING, NOT DECORATION: the
// mistakeIntelligence.ts line left BOTH this list and FORBIDDEN in the SAME PR. Removing it
// from FORBIDDEN alone would have failed the gate on its own amendment — this loop asserts
// membership UNCONDITIONALLY, so it does not care why the entry went away.
for (const f of [
  'lazytopper/src/services/practiceInsights.ts',
  'lazytopper/src/services/checkImproveGradeService.ts',
  'lazytopper/src/components/desktop/MistakeIntelCard.tsx',
  'lazytopper/src/components/desktop/l2/MistakeIntelligencePanel.tsx',
]) {
  check(`FORBIDDEN(wired): ${f} is still in the guarded set (FORBID-1 lifted SolutionChecker.tsx; FORBID-6 lifted ResultsScorecard.tsx; OPS-LIFT-1 lifted mistakeIntelligence.ts — nothing else)`,
    FORBIDDEN.includes(f),
    'all three lifts were deliberate ONE-FILE amendments — this entry must survive them');
}

// ★ THE INVERSE ASSERTION for FORBID-6 — what makes the scorecard lift itself OBSERVABLE.
// A silent re-add turns this red and forces a deliberate owner decision instead of quietly
// re-blocking the Quick Practice batch-grading arc with no discussion.
check('FORBIDDEN(lifted): ResultsScorecard.tsx is NOT in the guarded set (ban replaced by ResultsScorecard.contract.test.tsx)',
  !FORBIDDEN.includes('lazytopper/src/components/results/ResultsScorecard.tsx'),
  're-adding the blanket entry needs an owner decision AND removal of the replacement tests — '
  + 'it would also re-block the batch-grading arc, whose results land in that component');

// ★ The SolutionChecker.tsx membership check that used to sit here was REMOVED with the
// entry it asserted (FORBID-1) — leaving it would have failed the gate on its own
// amendment. It is replaced by the INVERSE assertion, so the lift is itself observable:
// a silent re-add turns this red and forces the deliberate owner decision the comment
// above asks for, instead of quietly re-blocking GATE-2.
check('FORBIDDEN(lifted): SolutionChecker.tsx is NOT in the guarded set (ban replaced by SolutionChecker.contract.test.tsx)',
  !FORBIDDEN.includes('lazytopper/src/components/question/SolutionChecker.tsx'),
  're-adding the blanket entry needs an owner decision AND removal of the replacement tests');
check('FORBIDDEN(wired): EquationInput.tsx is NOT guarded (it legitimately gains autoGrow; §7 proves it stays default-off)',
  !FORBIDDEN.some((f) => f.endsWith('equation/EquationInput.tsx')));

// ★ THE INVERSE ASSERTION for OPS-LIFT-1 — what makes the MI front-door lift OBSERVABLE.
// A silent re-add turns this red and forces a deliberate owner decision instead of quietly
// re-blocking the Me/Progress arc (#637 MI-CONCEPT-1, then ARRIVAL-1 and RETRY-1) with no
// discussion. ⚠ CHECKED IN BOTH DIRECTIONS ON PURPOSE: the membership loop above proves the
// FOUR survivors are still guarded, and this proves the ONE that left really left. A
// half-amendment — dropped from FORBIDDEN but still asserted as wired, or the reverse —
// fails one of the two, which is exactly the trap the comment above that loop names.
check('FORBIDDEN(lifted): mistakeIntelligence.ts is NOT in the guarded set (ban replaced by mistakeIntelligence.contract.test.ts)',
  !FORBIDDEN.includes('lazytopper/src/services/mistakeIntelligence.ts'),
  're-adding the blanket entry needs an owner decision AND removal of the replacement tests — '
  + 'it would also re-block the Me/Progress arc, which writes through this front door');

// ★★ THE REPLACEMENT PROTECTION FOR THE LIFTED SolutionChecker BAN (FORBID-1).
// Identical reasoning to the GRADER-TESTS block below: a deleted FORBIDDEN entry plus a
// test file nobody invokes is strictly WORSE than the ban it replaced, because it reads
// as protection. So all three halves are asserted — the tests EXIST, they RUN in CI, and
// they still contain the assertion the ban was actually buying.
//
// ⚠ NOTE FOR FUTURE READERS: this file's own header says "CI runs the MATRICES, not the
// general vitest suite", which was true when it was written and is NOT true now.
// `.github/workflows/quality-gate.yml` gained a REQUIRED `vitest run` step over the whole
// lazytopper suite with no exclusions (resolving [FU-CI-GATE-VITEST]) — which is exactly
// what makes a .test.tsx a legitimate replacement for a forbidden-path entry today.
// The wiring is asserted rather than trusted, because that header was right once.
// Filesystem-only (no subprocess, no git base) so it can never skip.
const SC_TESTS = 'lazytopper/src/components/question/SolutionChecker.contract.test.tsx';
check(`SOLUTIONCHECKER-TESTS: ${SC_TESTS} exists (the replacement for the lifted blanket ban)`,
  existsSync(path.join(ROOT, SC_TESTS)),
  'the blanket FORBIDDEN entry was lifted in favour of these tests — without them SolutionChecker is unguarded');
const qualityGate = existsSync(path.join(ROOT, '.github/workflows/quality-gate.yml'))
  ? read(path.join(ROOT, '.github/workflows/quality-gate.yml'))
  : '';
check('SOLUTIONCHECKER-TESTS: they RUN — quality-gate.yml has a required lazytopper `vitest run` step',
  /pnpm --filter lazytopper exec vitest run/.test(qualityGate),
  'a test nobody runs guards nothing — the CI vitest step is what executes this suite');
check('SOLUTIONCHECKER-TESTS: they are COLLECTED — vitest include glob covers src/**/*.test.tsx',
  /include:\s*\["src\/\*\*\/\*\.test\.\{ts,tsx\}"\]/.test(read(path.join(LAZY, 'vitest.config.ts'))),
  'the file exists and CI runs vitest, but the include glob would not pick it up');

// ★★ THE REPLACEMENT PROTECTION FOR THE LIFTED ResultsScorecard BAN (FORBID-6).
// Asserted independently in BOTH gates that banned the file, on purpose: each ran its own
// ban, so each needs its own proof that something replaced it. A deleted FORBIDDEN entry
// plus a test file nobody invokes is strictly WORSE than the ban it replaced, because it
// READS as protection. All three halves are asserted — the tests EXIST, they RUN in CI, and
// they are COLLECTED by the include glob. Filesystem-only, so this can never skip.
const RS_TESTS = 'lazytopper/src/components/results/ResultsScorecard.contract.test.tsx';
check(`RESULTSSCORECARD-TESTS: ${RS_TESTS} exists (the replacement for the lifted blanket ban)`,
  existsSync(path.join(ROOT, RS_TESTS)),
  'the blanket FORBIDDEN entry was lifted in favour of these tests — without them the scorecard '
  + 'shell is unguarded and the tutor overlay\'s one-tap way home is unwatched');
check('RESULTSSCORECARD-TESTS: they RUN — quality-gate.yml has a required lazytopper `vitest run` step',
  /pnpm --filter lazytopper exec vitest run/.test(qualityGate),
  'a test nobody runs guards nothing — the CI vitest step is what executes this suite');
check('RESULTSSCORECARD-TESTS: they are COLLECTED — vitest include glob covers src/**/*.test.tsx',
  /include:\s*\["src\/\*\*\/\*\.test\.\{ts,tsx\}"\]/.test(read(path.join(LAZY, 'vitest.config.ts')))
  && RS_TESTS.startsWith('lazytopper/src/') && RS_TESTS.endsWith('.test.tsx'),
  'the file exists and CI runs vitest, but the include glob would not pick it up');
// ★ SUBJECT, not just presence — a replacement that stopped asserting the thing the ban was
// buying is the silent no-op this whole exercise exists to prevent. The two load-bearing
// subjects are named here so a future edit that guts them turns THIS gate red as well:
// the return ticket reaching a clickable button, and the variant set staying OPEN so the
// batch-grading lane can add one.
const rsTests = existsSync(path.join(ROOT, RS_TESTS)) ? read(path.join(ROOT, RS_TESTS)) : '';
check('RESULTSSCORECARD-TESTS: they still assert the RETURN TICKET is rendered and clickable',
  /returnTicket/.test(rsTests) && /onReturn/.test(rsTests) && /toHaveBeenCalledTimes\(1\)/.test(rsTests),
  'the ticket assertions were the ban\'s single biggest subject — without them the tutor '
  + 'overlay can become impossible to close with nothing red');
check('RESULTSSCORECARD-TESTS: they keep the variant SET open (they must NOT forbid adding a variant)',
  /variant-set openness/.test(rsTests),
  'the batch-grading lane ADDS a variant — a replacement that pinned today\'s set would forbid '
  + 'exactly the change this lift exists to permit');
// ★ The suite must still assert the thing the ban existed for. Without this, the suite
// could be gutted to a single trivial test and every check above would stay green.
const scTestSrc = existsSync(path.join(ROOT, SC_TESTS)) ? read(path.join(ROOT, SC_TESTS)) : '';
check('SOLUTIONCHECKER-TESTS: the autoGrow opt-out is still pinned (the ban\'s actual subject)',
  /lt-eq__textarea--grow/.test(scTestSrc) && /POSITIVE CONTROL/.test(scTestSrc),
  'the suite no longer asserts the autoGrow relationship, or lost the control that keeps it non-vacuous');
check('SOLUTIONCHECKER-TESTS: the grade-call payload and the persistence twins are still pinned',
  /checkSolutionImage\.mock\.calls/.test(scTestSrc) && /recordAttempt\.mock\.calls/.test(scTestSrc),
  'the suite no longer inspects the grader payload or the recordMistake/recordAttempt twins');

// ★★ GATE-3 AMENDMENT — THE REPLACEMENT PROTECTION MUST COVER THE LAYER THAT ARRIVED.
//
// The block above was written when the contract suite was the WHOLE replacement for the
// lifted ban. GATE-3 then added the visible Premium boundary to SolutionChecker — a
// second, independently-deletable behaviour — and the checks above cannot see it: they
// assert the autoGrow opt-out, the grade payload and the persistence twins, every one of
// which stays green with the entire locked CTA ripped out.
//
// ★ THE SAME REASONING AS THE BLOCK ABOVE, APPLIED AGAIN: a lifted ban is only safe while
// something actually asserts the behaviour. Leaving the new layer unasserted would rebuild
// the exact hole the lift was allowed to open — protection that READS as protection.
//
// ⚠ AND ONE MORE THING THE CONTRACT SUITE CANNOT DO. It mocks a PREMIUM student
// throughout (deliberately — that is what keeps its contract assertions meaning what they
// meant before). So it is structurally incapable of noticing that the free path broke.
// The tier matrix needs its own file, and this asserts that file exists and still has
// teeth.
const SC_ENTITLEMENT = 'lazytopper/src/components/question/SolutionChecker.entitlement.test.tsx';
check(`SOLUTIONCHECKER-PREMIUM: ${SC_ENTITLEMENT} exists (the visible Premium boundary, GATE-3)`,
  existsSync(path.join(ROOT, SC_ENTITLEMENT)),
  'the locked CTA is a behaviour of a file whose blanket ban was lifted — without these '
  + 'tests it can be deleted silently');
const scEntSrc = existsSync(path.join(ROOT, SC_ENTITLEMENT)) ? read(path.join(ROOT, SC_ENTITLEMENT)) : '';
// ★ TRIAL == PREMIUM. The single easiest thing to get wrong here, and the one with the
// worst failure mode: a paying-equivalent student told their feature is locked.
check('SOLUTIONCHECKER-PREMIUM: trial is still asserted to be TREATED AS PREMIUM',
  /TRIAL: ENABLED/.test(scEntSrc),
  'the trial==premium case is the one a tier refactor breaks first — it must stay pinned');
// ★ A DEAD BUTTON IS WORSE THAN A LIVE ONE. The locked CTA must open the sheet, not sit
// inert, and it must stay in the tab order.
check('SOLUTIONCHECKER-PREMIUM: the locked CTA is still asserted LIVE and FOCUSABLE',
  /TAPPING IT OPENS THE SHEET/.test(scEntSrc) && /document\.activeElement/.test(scEntSrc),
  'without these the lock can decay into an inert, unreachable button and stay green');
// ★ THE BACKSTOP. GATE-2's 402 catch is what covers a stale client view of entitlement.
// The pre-emptive lock makes it RARE, not unnecessary — removing it would be a regression.
check('SOLUTIONCHECKER-PREMIUM: GATE-2\'s 402 catch is still pinned (the lock did not replace it)',
  /402/.test(scEntSrc) && /PremiumRequiredError/.test(scEntSrc),
  'the pre-emptive lock is the optimistic layer; the 402 is the backstop for a stale '
  + 'client view, and both must exist');
// ★★ MOUNT != LIVE. The lane's entire risk. An assertion against <SolutionChecker> alone
// proves the component CAN lock, never that a student REACHES the lock.
check('SOLUTIONCHECKER-PREMIUM: the lock is still proven through a REAL PARENT\'S REAL TRIGGER',
  /PracticeQuestionCard/.test(scEntSrc) && /MOUNT != LIVE/.test(scEntSrc),
  'the trigger trace is what separates this from the MentorSolveDrawer defect — imported, '
  + 'rendered, and dead');

// ★★ THE REPLACEMENT PROTECTION FOR THE LIFTED MI FRONT-DOOR BAN (OPS-LIFT-1).
// Same three-part reasoning as the two blocks above, because the failure mode is the same:
// a deleted FORBIDDEN entry plus a test file nobody invokes is strictly WORSE than the ban
// it replaced, since it READS as protection. So all three halves are asserted — the tests
// EXIST, they RUN in CI, and they are COLLECTED by the include glob.
// ⚠ THIS SUITE IS A `.test.ts`, NOT A `.test.tsx` — it exercises a service, not a render.
// The include glob is `src/**/*.test.{ts,tsx}`, so both are collected; the assertion below
// checks THIS file's own extension rather than copying the `.tsx` line from the blocks
// above, which would have passed vacuously while collecting nothing.
// Filesystem-only (no subprocess, no git base), so this can never skip.
const MI_TESTS = 'lazytopper/src/services/mistakeIntelligence.contract.test.ts';
check(`MI-CONTRACT-TESTS: ${MI_TESTS} exists (the replacement for the lifted blanket ban)`,
  existsSync(path.join(ROOT, MI_TESTS)),
  'the blanket FORBIDDEN entry was lifted in favour of these tests — without them the single '
  + 'ingestion door into the store the tutor and /me read is unguarded');
check('MI-CONTRACT-TESTS: they RUN — quality-gate.yml has a required lazytopper `vitest run` step',
  /pnpm --filter lazytopper exec vitest run/.test(qualityGate),
  'a test nobody runs guards nothing — the CI vitest step is what executes this suite');
check('MI-CONTRACT-TESTS: they are COLLECTED — vitest include glob covers src/**/*.test.ts',
  /include:\s*\["src\/\*\*\/\*\.test\.\{ts,tsx\}"\]/.test(read(path.join(LAZY, 'vitest.config.ts')))
  && MI_TESTS.startsWith('lazytopper/src/') && MI_TESTS.endsWith('.test.ts'),
  'the file exists and CI runs vitest, but the include glob would not pick it up');
// ★ SUBJECT, not just presence — a replacement that stopped asserting the thing the ban was
// buying is the silent no-op this whole exercise exists to prevent. All FIVE subjects the
// lift record above enumerates are named here, so a future edit that guts any one of them
// turns THIS gate red as well and not merely that suite.
const miTests = existsSync(path.join(ROOT, MI_TESTS)) ? read(path.join(ROOT, MI_TESTS)) : '';
check('MI-CONTRACT-TESTS (T1): the SINGLE-WRITER scan over the tree is still there',
  /scanMistakeLogWriters/.test(miTests) && /namespaceImporters/.test(miTests)
  && /dynamicImporters/.test(miTests) && /reExporters/.test(miTests),
  'a second module importing `logMistakes` is a DOUBLE-WRITE HAZARD into the store the tutor '
  + 'reads — and the three bypass routes must stay scanned, or the scan measures a subset');
check('MI-CONTRACT-TESTS (T1): the scanner is proven to REJECT, not merely to accept',
  /the scanner REJECTS, not merely accepts/.test(miTests),
  'a parser only ever run over the real tree can be shown to ACCEPT and never to REJECT — '
  + 'its green is worthless without the fixtures that prove it fires');
check('MI-CONTRACT-TESTS (T2): the four-type taxonomy is pinned by IDENTITY, not by a count',
  /the mistake taxonomy is exactly the four types/.test(miTests)
  && /the set is not SMALLER/.test(miTests) && /the set is not LARGER/.test(miTests),
  'a count passes while the set is wrong — both directions must stay asserted');
check('MI-CONTRACT-TESTS (T3): marksLost accounting, including the zero clamp',
  /marksLost accounting/.test(miTests) && /CLAMPED AT ZERO/.test(miTests),
  'a negative deficit propagates into every /me aggregate as a CREDIT');
check('MI-CONTRACT-TESTS (T4): one entry per graded question — never one per mistake',
  /one entry per graded question/.test(miTests) && /exactly ONE log write/.test(miTests),
  'the fan-out surfaces as duplicated attempts in Mistake Intelligence');
check('MI-CONTRACT-TESTS (T5): careless mistakes are still proven NOT to become a topic weakness',
  /careless mistakes never become a topic weakness/.test(miTests)
  && /never bridged to weak areas/.test(miTests) && /CONTROL/.test(miTests),
  'THE MOAT — silly/presentation must not reach the weak-area bridge, and the conceptual/'
  + 'calculation CONTROL is what stops that assertion passing over a dead bridge');
// ★★ AND THE OPENNESS PROOF — the half that stops this replacement becoming the ban again.
// FORBID-1's replacement pinned an incidental present-day fact and blocked a later lane for
// a reason nobody could act on. #637 ADDS `concept` and `questionId` to the persisted entry;
// a suite pinning today's key set would forbid exactly the change this lift exists to permit.
check('MI-CONTRACT-TESTS: the entry shape stays OPEN to additive change (the anti-FORBID-1 half)',
  /additive-shape openness/.test(miTests)
  && !/toEqual\(\s*\[\s*"timestamp"/.test(miTests),
  'a replacement that froze the entry\'s key set would re-impose the lifted ban by the back '
  + 'door and block MI-CONCEPT-1, ARRIVAL-1 and RETRY-1');

// ★★ THE REPLACEMENT PROTECTION FOR THE LIFTED GRADER BAN (PR-C1).
// Lifting a blanket ban is only safe if the thing replacing it actually runs. A
// deleted FORBIDDEN entry plus a test file nobody invokes is strictly WORSE than the
// old broken-prefix entry — that at least read as an intention. So both halves are
// asserted: the tests EXIST, and they are WIRED into the matrix that CI runs.
// Filesystem-only (no subprocess, no git base) so it can never skip the way the diff
// loop below does on a shallow checkout.
check('GRADER-TESTS: the targeted grader tests exist (the replacement for the lifted blanket ban)',
  existsSync(path.join(ROOT, 'lazytopper/server/routes/checkSolution.test.cjs')),
  'the blanket FORBIDDEN entry was lifted in favour of these tests — without them the grader is unguarded');
check('GRADER-TESTS: they are WIRED into lazytopper test:matrix:all (a test nobody runs guards nothing)',
  /test:server:check-solution/.test(read(path.join(ROOT, 'lazytopper/package.json'))) &&
  /"test:matrix:all":[^\n]*test:server:check-solution/.test(read(path.join(ROOT, 'lazytopper/package.json'))),
  'present but unwired — add `npm run test:server:check-solution` to test:matrix:all');
check('GRADER-TESTS: the OBJECTIVE EXCEPTION stays pinned by objective_dedup_acceptance.mjs (not duplicated)',
  /handleCheckSolution: objective === true for a Section-A question/
    .test(read(path.join(ROOT, 'lazytopper/scripts/ops/objective_dedup_acceptance.mjs'))));

// ★ SHAPE, asserted UNCONDITIONALLY — the guard that would have caught the missing
// `lazytopper/` prefix, and the reason it can never come back.
//
// Membership (above) proves an entry is IN the list. It does not prove the entry can
// ever MATCH anything: `changed.includes(f)` compares against `git diff --name-only`
// output, which is repo-relative from the ROOT. An entry that does not resolve to a
// real file there is protecting nothing, however deliberate and well-commented it
// looks — and it reads as protection to every future reader, which is worse than an
// absent entry because it stops anyone from adding a real one.
//
// Deliberately filesystem-only (no subprocess, no git base), so this can never skip
// the way the diff loop below does on a shallow checkout.
for (const f of FORBIDDEN) {
  check(`FORBIDDEN(path): ${f} resolves to a real repo-relative file`,
    !f.startsWith('/') && !f.includes('\\') && existsSync(path.join(ROOT, f)),
    'this entry can never match `git diff --name-only` output, so it guards NOTHING '
    + '— check the lazytopper/ prefix');
}

// PR-scoped (not anchored): "did THIS change set touch a forbidden path?" On a push to
// trunk there is no PR, so it reports N/A — never the old vacuous green.
const forbiddenBase = resolveForbiddenBase();
if (forbiddenBase) {
  // `A...HEAD` diffs from merge-base(A, HEAD) to HEAD — exactly the PR's own changes.
  const changed = execFileSync('git', ['diff', '--name-only', `${forbiddenBase}...HEAD`], { cwd: ROOT })
    .toString().split('\n').map((s) => s.trim()).filter(Boolean);
  for (const f of FORBIDDEN) {
    check(`FORBIDDEN: ${f} shows zero changes (vs ${forbiddenBase})`, !changed.includes(f),
      changed.includes(f) ? 'THIS FILE WAS MODIFIED' : '');
  }
  // ★ §7.4 — the existing EquationInput test must pass UNTOUCHED. vitest is not gated in
  // CI, so "passes" is asserted as its strongest scriptable proxy: the test file shows
  // ZERO diff. Unchanged + green-before ⇒ green-now, since the component change is proven
  // behaviour-neutral when autoGrow is off (the default the test relies on).
  check('EQ-TEST: EquationInput.test.tsx shows zero changes (the autoGrow proof — it passes untouched)',
    !changed.includes('lazytopper/src/components/equation/EquationInput.test.tsx'),
    changed.includes('lazytopper/src/components/equation/EquationInput.test.tsx') ? 'THE TEST FILE WAS MODIFIED' : '');
} else if (EVENT === 'push') {
  // Push-to-trunk: legitimately no PR to scope against. NOT a check and NOT a pass —
  // the diff would be empty and "pass" every forbidden path without examining one.
  console.log('  --  N/A: push-to-trunk run — no PR to scope a forbidden-path diff to.');
  console.log('      (The PR that introduced the change was gated on ITS own run. Not counted as a pass.)');
} else if (IN_CI) {
  // A pull_request (or other CI event) whose base ref we could not resolve. Same rule
  // as the MI anchor: in CI, a needed-but-missing ref FAILS rather than skips.
  check('FORBIDDEN: the PR base ref is reachable in CI (fetch-depth must be 0)',
    false,
    `could not resolve the PR target ref${PR_TARGET ? ` (origin/${PR_TARGET})` : ''} — `
    + 'the forbidden-path diff could not be scoped. Hard failure by design; quality-gate.yml '
    + 'must fetch the base branch.');
} else {
  console.log('  ~~  SKIPPED (local, non-CI): no base ref — forbidden-path diff not checked.');
  console.log('      (A local skip is fine; the PR run scopes it against the real base.)');
}

/* ══════════════════════════════════════════════════════════════════════════
   7 · QUESTION-SIDE PARITY — the question side gains the answer side's hands.
   Four mirrors (math · QR · camera/files · paste) + the one shared-component
   change (autoGrow), which MUST default off so SolutionChecker is untouched.
   ══════════════════════════════════════════════════════════════════════════ */
section('7 · Question-side parity (the four mirrors + autoGrow)');

// MIRROR 1 — the question's math input. The plain single-line <input type="text"> is
// gone; the `type` branch now mounts <EquationInput> (the same palette the answer uses),
// and it STILL calls clearDetection on every edit so an edited question drops its stale
// detection chip. Assert the PROPERTY, comment-stripped.
check('PARITY-1: the question `type` branch mounts <EquationInput> (ariaLabel "Type the question")',
  /ariaLabel="Type the question"/.test(converged));
check('PARITY-1: the old single-line <input type="text"> is gone from the surface',
  !/<input\s+type="text"/.test(converged));
check('PARITY-1: the question edit STILL fires clearDetection (no stale chip on an edited question)',
  /setQuestion\(v\);\s*clearDetection\(\)/.test(converged));

// MIRROR 2 — the QR handoff for the question. Assert the PROP mode="question" (its OWN
// third mode, §2a — NOT the answer's "document", whose copy says "your answers"). The
// answer's bimodal mode={isMultiQuestion ? "document" : "photo"} is `mode={`, not `mode="`,
// so this static-question-mode literal identifies the question mount uniquely. There must
// now be TWO QrAnswerHandoff mounts (answer + question).
check('PARITY-2: a second <QrAnswerHandoff> is mounted with the static prop mode="question"',
  /mode="question"/.test(converged));
const qrMounts = (converged.match(/<QrAnswerHandoff/g) || []).length;
check('PARITY-2: exactly two QrAnswerHandoff mounts now exist (answer + question)',
  qrMounts === 2, `found ${qrMounts}`);
check('PARITY-2: the question QR carries the question-voice label, not the answer default',
  /label="Question paper on your phone\?"/.test(converged));

// MIRROR 3 — Camera/Files for the question, device-gated on !isDesktop && !qImageBase64,
// toggling capture on the EXISTING qFileInputRef (no second file input, so the tight-accept
// count in §3 stays 2). Distinct gate from the answer's !imageBase64.
check('PARITY-3: the question camera/files pair is device-gated (!isDesktop && !qImageBase64)',
  /!isDesktop && !qImageBase64/.test(converged) && /qFileInputRef\.current/.test(converged));

// MIRROR 4 — paste on BOTH cards, via the EXISTING file handlers (so checkUploadFile still
// refuses a bad pasted file) and gated on a clipboard FILE being present (so text paste is
// untouched — return without preventDefault).
check('PARITY-4: both cards bind onPaste to the shared handler (question + answer)',
  /onPaste=\{\(e\) => handleCardPaste\(e, "question"\)\}/.test(converged) &&
  /onPaste=\{\(e\) => handleCardPaste\(e, "answer"\)\}/.test(converged));
check('PARITY-4: paste only acts on a clipboard FILE (text paste falls through untouched)',
  /const file = e\.clipboardData\?\.files\?\.\[0\];\s*if \(!file\) return;/.test(converged));
check('PARITY-4: pasted files ride the existing guarded handlers (handleQuestionFile / handleFileChosen)',
  /handleCardPaste[\s\S]*?handleQuestionFile\(file\)[\s\S]*?handleFileChosen\(file\)/.test(converged));

// AUTOGROW — the ONE shared-component change. It MUST default false so every existing
// consumer (SolutionChecker) is byte-identical. Assert against the COMMENT-STRIPPED
// EquationInput source (a comment there mentions autoGrow — strip first, §9.6).
const eqInputSrc = stripComments(read(EQUATION_INPUT));
check('AUTOGROW: EquationInput declares an optional `autoGrow?: boolean` prop',
  /autoGrow\?:\s*boolean/.test(eqInputSrc));
check('AUTOGROW: `autoGrow` DEFAULTS TO false (SolutionChecker, which never passes it, is unchanged)',
  /autoGrow\s*=\s*false/.test(eqInputSrc));
check('AUTOGROW: the grow path is JS (height from scrollHeight), never CSS field-sizing (no Safari)',
  /scrollHeight/.test(eqInputSrc) && !/field-sizing/.test(eqInputSrc));
// Both C&I mounts opt in at the SAME min-3 (owner's "clean initial look"); question grows
// to 8, answer to 14.
check('AUTOGROW: the question EquationInput opts in at min-3, max-8',
  /rows=\{3\}\s*\n\s*autoGrow\s*\n\s*maxRows=\{8\}/.test(converged));
check('AUTOGROW: the answer EquationInput opts in at min-3, max-14',
  /rows=\{3\}\s*\n\s*autoGrow\s*\n\s*maxRows=\{14\}/.test(converged));

/* ══════════════════════════════════════════════════════════════════════════
   7b · QR "question" MODE (§2a) — a NEW third mode value, threaded through the
   client type, both COPY maps, the phone "Sent" line, AND the server allowlist.
   Additive: the answer side's document/photo behaviour is byte-identical.
   These read raw source (the copy strings are code, not comments).
   ══════════════════════════════════════════════════════════════════════════ */
section('7b · QR "question" mode threading (§2a)');

const qrHandoff = read(QR_HANDOFF);
const qrUploadPage = read(QR_UPLOAD_PAGE);
const qrService = read(QR_SERVICE);
const qrChannel = read(QR_CHANNEL);

// The type carries the new value AND still the old two (exhaustiveness forces every
// Record<QrHandoffMode> site to add the key — tsc is the real guard; this pins the shape).
check('QRMODE: QrHandoffMode is "document" | "photo" | "question"',
  /QrHandoffMode\s*=\s*"document"\s*\|\s*"photo"\s*\|\s*"question"/.test(qrService));

// The question mount uses its own mode; the ANSWER mount is byte-identical (still bimodal).
check('QRMODE: the answer QR is UNCHANGED — still mode={isMultiQuestion ? "document" : "photo"}',
  /mode=\{isMultiQuestion \? "document" : "photo"\}/.test(converged));

// COPY key ADDED in both maps; the document/photo entries stay byte-identical (v1.3 §5).
check('QRMODE: QrAnswerHandoff COPY gained a question key (question-voice link)',
  /Send the question paper — PDF or photo — from your phone/.test(qrHandoff));
check('QRMODE: QrAnswerHandoff document + photo copy is UNCHANGED (answer side byte-identical)',
  /link: "Send the PDF — or a photo — from your phone"/.test(qrHandoff) &&
  /Photograph your written answer on your phone/.test(qrHandoff));
check('QRMODE: QrAnswerUploadPage COPY gained a question key (question-voice head)',
  /head: "Send the question paper"/.test(qrUploadPage));
check('QRMODE: QrAnswerUploadPage document + photo copy is UNCHANGED (answer side byte-identical)',
  /head: "Send your answers"/.test(qrUploadPage) && /head: "Send your answer"/.test(qrUploadPage));
check('QRMODE: the phone "Sent" line reads "your question paper" for a question',
  /"your question paper"/.test(qrUploadPage));

// ★ THE DATA-LAYER SITE the frozen 5-site list missed — the SERVER allowlist. Without it a
// "question" mint is coerced to "document" on the wire (VARIANTS.has → false → default), so
// the phone shows answer copy and the whole copy fix is cosmetic-only. This is the branch
// that makes the round-trip real; the qr_upload_channel acceptance mint→peek asserts it runs.
check('QRMODE: server allowlist includes VARIANT_QUESTION (round-trip is real, not cosmetic-only)',
  /const VARIANT_QUESTION = 'question';/.test(qrChannel) &&
  /VARIANTS = new Set\(\[VARIANT_DOCUMENT, VARIANT_PHOTO, VARIANT_QUESTION\]\)/.test(qrChannel));

console.log('');
if (failures.length > 0) {
  console.error(`Check & Improve convergence acceptance FAILED — ${failures.length} failing:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`Check & Improve convergence acceptance PASSED — ${pass}/${pass} checks green.`);
console.log('  MI untouched (52 survive + 1 relocated) · one component · zero matchMedia · basis 340 ·');
console.log('  question-before-answer · canonical sentence · tight accept · guard on both inputs ·');
console.log('  five purples gone · QR + camera + Your-papers intact · SHOW_DETECTION_META unflipped ·');
console.log('  question-side parity: EquationInput + QR(question mode) + camera + paste · autoGrow default-off ·');
console.log('  QR "question" mode threaded (client type + both COPY maps + server allowlist; answer byte-identical) ·');
console.log('  bans LIFTED, protection re-formed: SolutionChecker → SolutionChecker.contract.test.tsx (FORBID-1) ·');
console.log('  ResultsScorecard → ResultsScorecard.contract.test.tsx (FORBID-6) ·');
console.log('  mistakeIntelligence → mistakeIntelligence.contract.test.ts (OPS-LIFT-1) — presence, CI execution,');
console.log('  collection and SUBJECT asserted for each; FOUR MI/persist entries still guarded\n');
