// src/config/solutions3BoardLedger.ts
//
// SOLUTIONS-3 (owner ruling 1, 18 Oct 2026) — the VERIFICATION LEDGER for the "CBSE board pattern:
// Assertion-Reason and case-based questions" section of the solutions pages. Read by
// `scripts/solutions/selectSolutions.ts` (`selectBoard`): only a `publish` entry whose `hash` still
// equals rowHash() of the bank row is published; `hold` never is; a candidate not listed here is
// `unverified` and never published.
//
// ★ WHY A SEPARATE LEDGER. For 2026-27 Class 10 keeps the rationalised NCERT books, and neither the
//   textbook nor the Exemplar contains Assertion-Reason items: AR and case-based questions are a CBSE
//   board-paper FORMAT. So there is no book check here (SOLUTIONS-2's step 1): these rows are never
//   shown as numbered book questions, and the selection drops any row whose text cites a book
//   location (§ / Section / Theorem / Example / Exercise / page + number) or claims a past paper.
// ★ METHOD (every pass an independent `claude -p` agent with a fresh context, 18 Oct 2026):
//   1. SYLLABUS — every rule-passing row against the OFFICIAL CBSE 2026-27 Class X Mathematics content
//      (Maths_SecP1X_2026-27.pdf, cbseacademic.nic.in; read via the Wayback capture of that exact URL,
//      16 Jun 2026, because the live site's TLS certificate had expired) and the Maths lists of
//      scripts/src/syllabusGuard.ts, copied verbatim into the prompt. OUT or BORDERLINE → `hold`.
//   2. BLIND SOLVE — EVERY row (all AR candidates and all case-based candidates), question and
//      options only, never the key.
//   3. JUDGE — a further agent compared each blind answer with the stored key and steps. Any
//      disagreement → re-solved once by a fresh agent; still disagreeing, or a key judged wrong → `hold`.
//   4. TEXT/STEPS AUDIT — every row re-read in full (question, options, steps, answer) for wrong
//      steps, incomplete answers, unstated assumptions, figure dependence and drafting artifacts;
//      anything beyond generic "NCERT formula" wording → `hold`. A second, independent audit re-read
//      every `publish` row.
// ★ CONTENT-BOUND. `hash` = rowHash() (selectSolutions.ts) of the question, options, keys, steps and
//   ncertRef the verifiers saw. If the bank row changes, it drops off the page until verified again.
// ★ The Triangles pilot's two board rows (TRI-N-NCERT-6-AR-001, TRI-N-NCERT-6-CB-001; D261) are
//   re-verified here; `solutionsPilot.guard.test.tsx` requires them to be `publish` with a live hash.

import type { LedgerEntry } from "./solutions2Ledger";

export const SOLUTIONS_3_BOARD_LEDGER: Readonly<Record<string, LedgerEntry>> = {
  "RN-N-NCERT-1-CB-001": { status: "publish", hash: "1135cf5ced52dac7", note: "syllabus IN (official 2026-27 content); case blind solve agrees; judge: key correct; text/steps audit clean" },
  "RN-N-EXMPLR-1-CB-001": { status: "publish", hash: "2e13c1435717be48", note: "syllabus IN (official 2026-27 content); case blind solve agrees (re-solve; the first solve's stated parts contradicted its own working); judge: key correct; text/steps audit clean" },
  "POLY-N-NCERT-2-AR-002": { status: "hold", note: "second audit: maths correct, but both independent audits flag the 'standard NCERT formula / identity' wording (and thin or circular steps) on a page that says these are not NCERT questions; release after a bank wording fix" },
  "POLY-N-EXEM-2-AR-001": { status: "publish", hash: "cdafd964c8407501", note: "syllabus IN (official 2026-27 content); AR blind solve agrees; judge: key correct; text/steps audit clean" },
  "POLY-N-EXEM-2-AR-002": { status: "publish", hash: "7488610713203b13", note: "syllabus IN (official 2026-27 content); AR blind solve agrees; judge: key correct; text/steps audit clean" },
  "POLY-N-EXEM-2-CB-001": { status: "publish", hash: "aab2e5c91f3e98a7", note: "syllabus IN (official 2026-27 content); case blind solve agrees; judge: key correct; text/steps audit clean" },
  "PLE-N-NCERT-3-CB-001": { status: "publish", hash: "6fce6c7f34637661", note: "syllabus IN (official 2026-27 content); case blind solve agrees; judge: key correct; text/steps audit clean" },
  "PLE-N-NCERT-3-CB-002": { status: "publish", hash: "e25533831b7153ff", note: "syllabus IN (official 2026-27 content); case blind solve agrees; judge: key correct; text/steps audit clean; PR review: ncertRef corrected to NCERT Ex 3.2 Q3(iv) against the 2026-27 PDF (content unchanged, so the earlier blind solve and audit still apply)" },
  "PLE-N-NCERT-3-CB-003": { status: "publish", hash: "553726edb1397405", note: "syllabus IN (official 2026-27 content); case blind solve agrees; judge: key correct; text/steps audit clean; PR review: ncertRef corrected to NCERT Ex 3.3 Q2(v) against the 2026-27 PDF (content unchanged, so the earlier blind solve and audit still apply)" },
  "QE-N-NCERT-4-AR-001": { status: "publish", hash: "68149a38d043fd3f", note: "syllabus IN (official 2026-27 content); AR blind solve agrees; judge: key correct; text/steps audit clean" },
  "QE-N-NCERT-4-AR-002": { status: "publish", hash: "491cd04bf833be0e", note: "syllabus IN (official 2026-27 content); AR blind solve agrees; judge: key correct; text/steps audit clean" },
  "QE-N-NCERT-4-CB-001": { status: "publish", hash: "80769841f5bb17de", note: "syllabus IN (official 2026-27 content); case blind solve agrees; judge: key correct; text/steps audit clean" },
  "QE-N-NCERT-4-CB-002": { status: "hold", note: "text/steps audit: the solution assumes AP > BP; the question only gives the difference (7 m), so the other labelling is equally valid" },
  "QE-N-NCERT-4-CB-003": { status: "publish", hash: "e6b77f5b8067cccd", note: "syllabus IN (official 2026-27 content); case blind solve agrees; judge: key correct; text/steps audit clean" },
  "QE-N-EXMPLR-4-AR-001": { status: "publish", hash: "c0c33450846870ad", note: "syllabus IN (official 2026-27 content); AR blind solve agrees; judge: key correct; text/steps audit clean" },
  "QE-N-EXMPLR-4-AR-002": { status: "publish", hash: "ddc20ca0b5a0d505", note: "syllabus IN (official 2026-27 content); AR blind solve agrees; judge: key correct; text/steps audit clean" },
  "QE-N-EXMPLR-4-CB-002": { status: "publish", hash: "c30d2e2dba40c6ef", note: "syllabus IN (official 2026-27 content); case blind solve agrees; judge: key correct; text/steps audit clean" },
  "QE-N-EXMPLR-4-CB-003": { status: "publish", hash: "9cf1a7a915d331e6", note: "syllabus IN (official 2026-27 content); case blind solve agrees; judge: key correct; text/steps audit clean" },
  "AP-N-NCERT-5-AR-001": { status: "publish", hash: "6dbbdebcff3019ed", note: "syllabus IN (official 2026-27 content); AR blind solve agrees; judge: key correct; text/steps audit clean" },
  "AP-N-NCERT-5-AR-002": { status: "hold", note: "second audit: maths correct, but both independent audits flag the 'standard NCERT formula / identity' wording (and thin or circular steps) on a page that says these are not NCERT questions; release after a bank wording fix" },
  "AP-N-NCERT-5-CB-001": { status: "hold", note: "text/steps audit: part (iv) rests on an unstated end point (the deposits are never said to stop); first blind solve also disagreed on (iii)" },
  "AP-N-NCERT-5-CB-002": { status: "publish", hash: "4b518231157cf8fe", note: "syllabus IN (official 2026-27 content); case blind solve agrees; judge: key correct; text/steps audit clean" },
  "AP-N-EXEM-5-AR-001": { status: "publish", hash: "e76e68a4e42651f1", note: "syllabus IN (official 2026-27 content); AR blind solve agrees; judge: key correct; text/steps audit clean" },
  "AP-N-EXEM-5-AR-002": { status: "hold", note: "syllabus BORDERLINE: compound interest is not in the official 2026-27 AP content" },
  "AP-N-EXEM-5-CB-001": { status: "publish", hash: "69798522aeb36a66", note: "syllabus IN (official 2026-27 content); case blind solve agrees; judge: key correct; text/steps audit clean" },
  "TRI-N-NCERT-6-AR-001": { status: "publish", hash: "4d35bea8019afcd9", note: "D261 pilot row, re-verified: syllabus IN (official 2026-27 content); AR blind solve agrees; judge: key correct; text/steps audit clean" },
  "TRI-N-NCERT-6-CB-001": { status: "publish", hash: "f8df337684ccbfe3", note: "D261 pilot row, re-verified: syllabus IN (official 2026-27 content); case blind solve agrees; judge: key correct; text/steps audit clean" },
  "CG-N-NCERT-7-EX-003": { status: "publish", hash: "550947eb466e25a3", note: "syllabus IN (official 2026-27 content); case blind solve agrees; judge: key correct; text/steps audit clean" },
  "CG-N-EXMPLR-7-EX-023": { status: "publish", hash: "e7ded218352da2fb", note: "syllabus IN (official 2026-27 content); case blind solve agrees; judge: key correct; text/steps audit clean" },
  "CG-N-EXMPLR-7-EX-024": { status: "publish", hash: "41bc879ca1efd0a4", note: "syllabus IN (official 2026-27 content); AR blind solve agrees; judge: key correct; text/steps audit clean" },
  "TRIG-N-EXMPLR-8-AR-001": { status: "hold", note: "text/steps audit: the right-triangle derivation covers only acute A, but the Assertion includes 0° and 90°, so 'R explains A' is overstated" },
  "TRIG-N-NCERT-9-CB-002": { status: "hold", note: "text/steps audit: the final answer omits part (a) (the two distances h√3 and h/√3)" },
  "TRIG-N-EXMPLR-9-CB-002": { status: "publish", hash: "8d29ee5fcd412e6b", note: "syllabus IN (official 2026-27 content); case blind solve agrees; judge: key correct; text/steps audit clean" },
  "CIRC-N-EXEM-10-AR-001": { status: "publish", hash: "04a6266568d07f15", note: "syllabus IN (official 2026-27 content); AR blind solve agrees; judge: key correct; text/steps audit clean" },
  "CIRC-N-EXEM-10-CB-001": { status: "publish", hash: "1a7374eebda97a90", note: "syllabus IN (official 2026-27 content); case blind solve agrees; judge: key correct; text/steps audit clean" },
  "ARC-N-NCERT-11-AR-002": { status: "hold", note: "second audit: maths correct, but both independent audits flag the 'standard NCERT formula / identity' wording (and thin or circular steps) on a page that says these are not NCERT questions; release after a bank wording fix" },
  "ARC-N-NCERT-11-CB-001": { status: "hold", note: "text/steps audit: the answer depends on π = 22/7, which the question never states" },
  "ARC-N-EXEM-11-AR-001": { status: "hold", note: "second audit: syllabus BORDERLINE (major segment with no central angle; the official content limits segment problems to 60°, 90° and 120°)" },
  "ARC-N-EXEM-11-AR-002": { status: "publish", hash: "ee7099faa46c4578", note: "syllabus IN (official 2026-27 content); AR blind solve agrees; judge: key correct; text/steps audit clean" },
  "ARC-N-EXEM-11-CB-001": { status: "hold", note: "PR review: the answer depends on π = 22/7, which the question never states (held, consistent with ARC-N-NCERT-11-CB-001)" },
  "SAV-N-NCERT-12-CB-001": { status: "publish", hash: "a5a3d8e4af1a5d96", note: "syllabus IN (official 2026-27 content); case blind solve agrees; judge: key correct; text/steps audit clean; PR review: ncertRef corrected to NCERT Ex 12.1 Q7 against the 2026-27 PDF (content unchanged, so the earlier blind solve and audit still apply)" },
  "SAV-N-EXMPLR-12-AR-002": { status: "publish", hash: "05fd6176092ba830", note: "syllabus IN (official 2026-27 content); AR blind solve agrees; judge: key correct; text/steps audit clean" },
  "STAT-N-NCERT-13-AR-002": { status: "hold", note: "second audit: maths correct, but both independent audits flag the 'standard NCERT formula / identity' wording (and thin or circular steps) on a page that says these are not NCERT questions; release after a bank wording fix" },
  "STAT-N-NCERT-13-CB-001": { status: "publish", hash: "d9f755a5efb0f5d9", note: "syllabus IN (official 2026-27 content); case blind solve agrees; judge: key correct; text/steps audit clean; PR review: ncertRef corrected to NCERT Ex 13.1 Q7 against the 2026-27 PDF (content unchanged, so the earlier blind solve and audit still apply)" },
  "STAT-N-EXEM-13-AR-001": { status: "hold", note: "text/steps audit: the Reason is judged true, but the empirical relation is an approximation, not a symmetric-case result; also syllabus BORDERLINE (empirical relation not in the official content)" },
  "STAT-N-EXEM-13-CB-001": { status: "hold", note: "syllabus BORDERLINE + steps: the modal class is the first class, so the mode needs an assumed f0 = 0 (unjustified convention)" },
  "PROB-N-NCERT-14-AR-001": { status: "hold", note: "second audit: maths correct, but both independent audits flag the 'standard NCERT formula / identity' wording (and thin or circular steps) on a page that says these are not NCERT questions; release after a bank wording fix" },
  "PROB-N-NCERT-14-AR-002": { status: "publish", hash: "55a764a836b2575d", note: "syllabus IN (official 2026-27 content); AR blind solve agrees; judge: key correct; text/steps audit clean; PR review: ncertRef corrected to NCERT Ex 14.1 Q1(i) against the 2026-27 PDF (content unchanged, so the earlier blind solve and audit still apply)" },
  "PROB-N-NCERT-14-CB-001": { status: "hold", note: "second audit: syllabus BORDERLINE (part (iv) relies on 'mutually exclusive' / sample-space terminology not in the official content)" },
  "PROB-N-EXEM-14-AR-002": { status: "hold", note: "second audit: maths correct, but both independent audits flag the 'standard NCERT formula / identity' wording (and thin or circular steps) on a page that says these are not NCERT questions; release after a bank wording fix" },
};
