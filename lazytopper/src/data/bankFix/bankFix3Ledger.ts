// lazytopper/src/data/bankFix/bankFix3Ledger.ts
//
// BANK-FIX-3 PR-A (2026-10-07) — the MUTATION LEDGER for the third bank-fix lane.
// One entry per bank row this PR changed, withheld, restored, or examined and left alone:
//   verdict "fixed"             — content changed in the row's own source file (`fields` = the runtime
//                                 fields that differ). Content-changed official rows carry
//                                 `sourceOverride: "others"` and no pyqYear / pyqSet / isPYQ (owner ruling 2).
//   verdict "withheld"          — no longer served; the id stays in RAW_CANONICAL_QUESTION_BANK and is listed in
//                                 the "BANK-FIX-3" block of WITHHELD_QUESTION_IDS (`category` = why).
//   verdict "restored"          — was withheld by BANK-FIX-1 PR-2 and is served again (owner ruling 10:21Z:
//                                 liquid transfer / rate of flow is IN — NCERT's deleted list names only the
//                                 conversion of SOLIDS; CBSE SQP 2023-24 asked pipe-into-pond).
//   verdict "held-for-resolve"  — key and steps disagree; the row is UNCHANGED here and is in the blind
//                                 re-solve packet (bf3). A later lane applies the solver's verdict.
//   verdict "re-sourced-official" — an Others row verified VERBATIM against the official CBSE PDF: the override is
//                                 removed and the official source fields restored (served as PYQ again).
//   verdict "flag-rejected"     — the scout flag (explanation vs key) was checked: the explanation does NOT
//                                 contradict the key, so the row is unchanged.
// `resolve: "pending"` = in the bf3 blind re-solve packet; the re-solve verdict is owed before the PR opens.
// `key` / `keyOptionIndex` / `keyMustContain` are pinned by bankFix3.test.ts. Row ids are never changed.

export interface BankFix3Entry {
  id: string;
  verdict: "fixed" | "withheld" | "restored" | "held-for-resolve" | "flag-rejected" | "re-sourced-official";
  /** D-number / item of the BANK-FIX-3 brief. */
  item: string;
  /** Omitted = the question bank. "hpq" = highlyProbableQuestions (hpqCompetencyAdditions.ts). */
  surface?: "hpq";
  fields: readonly string[];
  others: boolean;
  resolve?: "pending";
  category?: string;
  key?: string;
  /** 0-based option the stored key must resolve to (app resolver). */
  keyOptionIndex?: number;
  /** values the stored answer / finalAnswer must carry. */
  keyMustContain?: readonly string[];
  /** values the served answer / finalAnswer / steps / stem must NOT carry any more. */
  mustNotContain?: readonly string[];
  why: string;
}

export const BANK_FIX_3: readonly BankFix3Entry[] = [
  // ── 1. D30 ──────────────────────────────────────────────────────────────────────────────────────
  { id: "Z3-QE-002", verdict: "fixed", item: "D30", fields: ["finalAnswer", "questionText", "solutionSteps", "subtopic"], others: true, resolve: "pending", key: "(i) 1344 ft (ii) 1344 ft (iii) t = 5 and t = 10 (iv) 17 s", keyMustContain: ["1344", "17 s"], mustNotContain: ["1444", "maximum height", "(v)"], why: "Sub-part (iv) 'maximum height' is maximisation (2026-27 QE has no maxima). Deleted from the stem, steps and finalAnswer; old (v) renumbered (iv). Steps re-balanced to [1 mark] x 4 = 4 marks ((i) and (ii) were one step). Subtopic re-tagged to the in-syllabus mapped label 'Quadratic Functions (Projectile Height Applications)'." },
  // ── 2. D31 ──────────────────────────────────────────────────────────────────────────────────────
  { id: "Z3-QE-005", verdict: "withheld", item: "D31", fields: [], others: false, category: "out-of-syllabus", why: "out of syllabus: maximisation (2026-27 QE has no maxima). Both parts ask for the MAXIMUM fenced area. Not a template of any generated row." },
  { id: "Z3-QE-006", verdict: "withheld", item: "D31", fields: [], others: false, category: "out-of-syllabus", why: "out of syllabus: maximisation (2026-27 QE has no maxima). The case asks for the dimensions giving the MAXIMUM area. Not a template of any generated row." },
  // ── 3. scratch-pad / self-correction text ───────────────────────────────────────────────────────
  { id: "CHEM-NCERT-1-SA-008", verdict: "fixed", item: "3", fields: ["solutionSteps", "sourceOverride"], others: true, resolve: "pending", keyMustContain: ["Ca(OH)₂ + CO₂ → CaCO₃ + H₂O", "2AgNO₃", "3CuCl₂", "2KCl"], why: "Step (a) carried a mid-count 'wait:' correction. Rewritten as a clean atom count (Ca, C, O 4 = 4, H). Marks 1 + 0.5 + 0.5 + 1 = 3 unchanged; equations unchanged." },
  { id: "QE-N-EXMPLR-4-LA-001", verdict: "fixed", item: "3", fields: ["solutionSteps", "sourceOverride"], others: true, resolve: "pending", keyMustContain: ["45 km/h"], why: "Step 4 started a wrong cross-multiplication then 'wait:' restarted it. Kept only the correct working: 1800/[x(x + 5)] = 4/5 => x^2 + 5x - 2250 = 0. Answer 45 km/h unchanged." },
  { id: "TRI-N-NCERT-6-LA-006", verdict: "fixed", item: "3", fields: ["answer", "solutionSteps", "sourceOverride"], others: true, resolve: "pending", why: "Answer had '△ABC ~ △BCA (wait — use the third similarity)'. Removed; part (ii) now uses △BCA ~ △ACD (B<->A, C<->C, A<->D, right angles at C, ∠CBA = ∠CAD), giving BC/AC = CA/CD. The old correspondence A<->D, B<->C, C<->A did not match the right angles; fixed in the answer and step 5." },
  { id: "TRI-PRF-D-006", verdict: "fixed", item: "3", fields: ["solutionSteps"], others: true, resolve: "pending", why: "Part (iii) had a mis-attributed ratio, then 'Wait —' and two side-ratio lines it did not use. Replaced with: by (i) and (ii), △ACD ~ △CBD (A<->C, C<->B, D<->D) => AD/CD = CD/BD => CD² = AD × BD. Already Others." },
  { id: "TRIG-PRF-D-002", verdict: "fixed", item: "3", fields: ["solutionSteps"], others: true, resolve: "pending", why: "Removed the 'Wait — combining with common denominator' line and the miswritten numerator before it; (i) + (ii) now goes straight to [sin³θ − cos³θ]/[sinθ·cosθ·(sinθ−cosθ)]. Already Others." },
  { id: "TRIG-PRF-D-003", verdict: "fixed", item: "3", fields: ["solutionSteps"], others: true, resolve: "pending", why: "Removed the abandoned numerator expansion and 'Let me use a cleaner approach:'; only the factorisation (cotA + cosecA)(1 − cosecA + cotA) remains. Already Others." },
  { id: "TRIG-PRF-C-003", verdict: "fixed", item: "3", fields: ["solutionSteps", "sourceOverride"], others: true, resolve: "pending", why: "Removed the unused common-denominator line and 'Wait — let's factor more carefully:'; the a³ + b³ route is kept." },
  { id: "APQ-M-TRI-006", verdict: "fixed", item: "3", fields: ["solutionSteps", "sourceOverride"], others: true, resolve: "pending", why: "Variant 2 stated 'Medians AD = ½BC, PM = ½QR' (false) then '(wait, ...)'. Rewritten: D, M are mid-points so BD/QM = BC/QR = AB/PQ; with ∠B = ∠Q, △ABD ~ △PQM (SAS) => AB/PQ = AD/PM." },
  // ── 4. key vs steps — not decided here ───────────────────────────────────────────────────────────
  { id: "REP-M13", verdict: "held-for-resolve", item: "4", fields: [], others: false, resolve: "pending", key: "Both A and R are true, and R is the correct explanation of A.", keyOptionIndex: 0, why: "Key (a) but the steps argue a different A-R pair (self/cross-pollination) and conclude (d). Unchanged; sent answer-free to the bf3 blind re-solve." },
  { id: "PLE-N01", verdict: "held-for-resolve", item: "4", fields: [], others: false, resolve: "pending", key: "Parallel lines", keyOptionIndex: 0, why: "Key (a) but the steps answer a different question ('graph is a straight line', option (c)). Unchanged; sent answer-free to the bf3 blind re-solve." },
  // ── 5. answer vs finalAnswer ─────────────────────────────────────────────────────────────────────
  { id: "APQ-M-CIRC-009", verdict: "fixed", item: "5", fields: ["answer", "sourceOverride"], others: true, resolve: "pending", key: "80°", keyOptionIndex: 2, why: "answer said '(cannot be uniquely determined ...)' but finalAnswer and the official MS give (c) 80° (∠K = 50° per the official figure). answer set to '80°'. The row stays WITHHELD (BANK-FIX-1 PR-2, 'figure'): the figure is still not bound." },
  // ── 6. explanation vs key — every one benign ─────────────────────────────────────────────────────
  { id: "EL2-001", verdict: "flag-rejected", item: "6", fields: [], others: false, key: "Charge", keyOptionIndex: 2, why: "Explanation names Charge (the key); 'rate of flow of energy is power' is a distractor note, not a contradiction." },
  { id: "LT2-060", verdict: "flag-rejected", item: "6", fields: [], others: false, key: "Dioptre", keyOptionIndex: 2, why: "Explanation 'measured in dioptre (D)' agrees with the key." },
  { id: "RN-E02", verdict: "flag-rejected", item: "6", fields: [], others: false, key: "2² × 3 × 13", keyOptionIndex: 0, why: "Explanation derives 2² × 3 × 13 (the key) and names (D) only as wrong." },
  { id: "TR3-035", verdict: "flag-rejected", item: "6", fields: [], others: false, key: "∠A = ∠P", keyOptionIndex: 1, why: "Explanation concludes ∠A = ∠P (the key) and rejects the other three." },
  { id: "CR2-006", verdict: "flag-rejected", item: "6", fields: [], others: false, key: "A) Mg", keyOptionIndex: 0, why: "Explanation concludes 'A) Mg' (the key)." },
  { id: "CR2-029", verdict: "flag-rejected", item: "6", fields: [], others: false, key: "B) Cu", keyOptionIndex: 1, why: "Explanation concludes 'B) Cu' (the key)." },
  { id: "RN-E08", verdict: "flag-rejected", item: "6", fields: [], others: false, key: "a unique way (except for order)", keyOptionIndex: 2, why: "Explanation ('exactly one prime factorisation, regardless of the order') supports the key (c); it does not name (a) as correct. Note for the controller: options (a) 'exactly one way' and (c) are close in meaning." },
  // ── CI-1 sweep #1 (verifier-2026-10-07): minimal faithful rewrites, nothing withheld ────────────
  { id: "qe-comp-01", surface: "hpq", verdict: "fixed", item: "CI-1 #18", fields: ["answer", "explanation", "finalAnswer", "question", "solutionSteps"], others: false, resolve: "pending", keyMustContain: ["t = 4 s", "k = 20", "t = 2 s"], mustNotContain: ["greatest", "highest"], why: "Part (iii) 'Hence find the greatest height' is maximisation (2026-27 QE has no maxima; same as D30). Dropped that half; (iii) now asks the time at which the ball is at height k, i.e. the equal root t = 2 s. Steps 1 + 1 + 1 + 1 = 4 marks. Authored row." },
  { id: "2026-TRIG-P1-E-010", verdict: "fixed", item: "CI-1 #1", fields: ["answer", "finalAnswer", "questionText", "solutionSteps"], others: false, resolve: "pending", keyMustContain: ["40/sqrt(3)", "40/3", "80/3", "46.19"], mustNotContain: ["1/(2sqrt(3))", "80 m", "45 deg"], why: "Part (ii) used tan θ = 1/(2√3) (≈16.1°): heights & distances allow only 30/45/60°. A 45° part would make three angles (GUARD-3 G4-HD-TRIANGLES), so the case now uses only 30° and 60°: (i) h = 40/√3 (unchanged); (ii) the observer walks in until the angle is 60°: d = 40/3, walked 80/3 ≈ 26.67 m; (iii) line of sight from the first point = 40/cos 30° = 80√3/3 ≈ 46.19 m. Factory row (trigonometry.pack1 per-item spec); LT-authored." },
  { id: "APQ-M-TRIG-002", verdict: "fixed", item: "CI-1 #2", fields: ["solutionSteps"], others: true, resolve: "pending", key: "8/17", keyOptionIndex: 0, mustNotContain: ["cos ∠UPQ"], why: "The step used sin(90° − θ) = cos θ (trigonometric ratios of complementary angles: deleted). Question kept; step now angle-chases: ∠SPT and ∠PQU both complement ∠UPQ, so sin ∠SPT = sin ∠PQU = PU/PQ = 8/17. Same answer. Already Others." },
  { id: "ARC-H04", verdict: "fixed", item: "CI-1 #3", fields: ["finalAnswer", "questionText", "solutionSteps", "subtopic"], others: true, resolve: "pending", keyMustContain: ["9.625", "(ii) 3.5 cm²"], mustNotContain: ["OBD"], why: "Shaded = quadrant minus △OBD (D on OA), a triangle that is not the sector's own: combinations of plane figures are OUT (owner ruling R3). Rewritten so the triangle is the quadrant's own △OAB: the shaded region is the minor segment ACB = 9.625 − 6.125 = 3.5 cm². Subtopic 'Composite Figures' -> 'Area of Minor Segment' (mapped). Already Others." },
  // ── controller DECISION (official CBSE PDF verified) ─────────────────────────────────────────────
  { id: "PYQ-M-2025-SAV-004", verdict: "re-sourced-official", item: "C1 decision", fields: ["pyqSet", "pyqYear", "solutionSteps", "sourceOverride", "subtopic"], others: false, resolve: "pending", keyMustContain: ["100"], why: "CBSE Class X Maths Standard (041) 2025, set 30/3/1, Q35: stem verbatim with the official paper (p17; official 0·5 = 0.5). sourceOverride removed; pyqYear 2025, pyqSet 1 (the file convention for 30/3/1 rows), ncertRef PYQ 30/3/1 Q35 kept. Steps split to the official marking scheme 1 + ½ + 1 + 1 + ½ + 1 = 5 (MS answer 100). Subtopic chapter-echo General -> Volume of Solids (mapped). Kept served." },
  // ── owner ruling 10:21Z: SAV liquid transfer / rate of flow is IN ───────────────────────────────
  { id: "SAV-N-EXEM2-12-LA-010", verdict: "restored", item: "owner 10:21Z", fields: ["subtopic"], others: false, resolve: "pending", keyMustContain: ["54"], why: "restored by owner ruling 10:21Z (liquid transfer is IN). Text, answer and steps checked: 486π / 9π = 54, correct. Subtopic 'Hemispherical Bowl to Bottles' (unmapped) -> 'Volume of Solids' (mapped). Same item as SAV2P1-R02 (5-mark exemplar vs 3-mark pack)." },
  { id: "SAV2-R06", verdict: "restored", item: "owner 10:21Z", fields: ["solutionSteps", "sourceOverride", "subtopic"], others: true, resolve: "pending", keyMustContain: ["1792"], why: "restored by owner ruling 10:21Z. Steps solved n·V·16/17 = 1,850,400 as an EQUATION giving n = 1792 (it gives 1792.4). Rewritten as the no-overflow inequality: n ≤ 1792.4, so at most 1792 bricks. Key unchanged. Subtopic 'Combination/Transformation' -> 'Volume of Solids'." },
  { id: "SAV2P1-R02", verdict: "restored", item: "owner 10:21Z", fields: ["subtopic"], others: false, resolve: "pending", keyMustContain: ["54"], why: "restored by owner ruling 10:21Z. Text, answer and steps checked: 486π / 9π = 54, correct. Subtopic 'Combination/Transformation' -> 'Volume of Solids'. Same item as SAV-N-EXEM2-12-LA-010." },
];

/** Ids BANK-FIX-3 restored to service after BANK-FIX-1 PR-2 withheld them (owner ruling 10:21Z). */
export const BANK_FIX_3_RESTORED_IDS: ReadonlySet<string> = new Set(
  BANK_FIX_3.filter((e) => e.verdict === "restored").map((e) => e.id),
);

/** Others rows this lane returned to their official source (bankFix1.pr2.test.ts ruling-2 check skips them). */
export const BANK_FIX_3_OFFICIAL_RESOURCED_IDS: ReadonlySet<string> = new Set(
  BANK_FIX_3.filter((e) => e.verdict === "re-sourced-official").map((e) => e.id),
);

/** Served rows this lane withheld, per chapter — later floors in bankFix1.pr2.test.ts subtract these. */
export const BANK_FIX_3_WITHHELD_BY_CHAPTER: Readonly<Record<string, number>> = { "quadratic-equations": 2 };

/**
 * Scratch-pad / self-correction text that must never be served in an answer, finalAnswer, explanation or
 * solution step. Narrow on purpose: "does not wait for the brain" (a reflex arc) is content, not scratch.
 */
export const SCRATCH_TEXT_RE =
  /\bwait\b\s*[—–:,!-]|\bwait\s*\(|\blet me\b|\blet's (?:factor|redo|recalculate|re-?check|try again|use)\b|\bcleaner approach\b|\brecalculating\b|\bhmm+\b|\bactually,? (?:no|wait)\b|\boops\b/i;
