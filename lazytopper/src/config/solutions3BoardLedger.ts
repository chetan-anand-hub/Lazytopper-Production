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
  "RN-N-NCERT-1-CB-001": { status: "publish", hash: "574136b1743b679b", note: "syllabus IN (official 2026-27 content); case blind solve agrees; judge: key correct; text/steps audit clean" },
  "RN-N-EXMPLR-1-CB-001": { status: "publish", hash: "3e4f736e4da57140", note: "syllabus IN (official 2026-27 content); case blind solve agrees (re-solve; the first solve's stated parts contradicted its own working); judge: key correct; text/steps audit clean" },
  "POLY-N-NCERT-2-AR-002": { status: "hold", note: "second audit: maths correct, but both independent audits flag the 'standard NCERT formula / identity' wording (and thin or circular steps) on a page that says these are not NCERT questions; release after a bank wording fix" },
  "POLY-N-EXEM-2-AR-001": { status: "publish", hash: "a9a6caa36545b368", note: "syllabus IN (official 2026-27 content); AR blind solve agrees; judge: key correct; text/steps audit clean" },
  "POLY-N-EXEM-2-AR-002": { status: "publish", hash: "2d46dba5aeabc523", note: "syllabus IN (official 2026-27 content); AR blind solve agrees; judge: key correct; text/steps audit clean" },
  "POLY-N-EXEM-2-CB-001": { status: "publish", hash: "51680710caa5ae06", note: "syllabus IN (official 2026-27 content); case blind solve agrees; judge: key correct; text/steps audit clean" },
  "PLE-N-NCERT-3-CB-001": { status: "publish", hash: "08e21246cf277ee3", note: "syllabus IN (official 2026-27 content); case blind solve agrees; judge: key correct; text/steps audit clean" },
  "PLE-N-NCERT-3-CB-002": { status: "publish", hash: "1fd0383392ca40d4", note: "syllabus IN (official 2026-27 content); case blind solve agrees; judge: key correct; text/steps audit clean; PR review: ncertRef corrected to NCERT Ex 3.2 Q3(iv) against the 2026-27 PDF (content unchanged, so the earlier blind solve and audit still apply)" },
  "PLE-N-NCERT-3-CB-003": { status: "publish", hash: "224d5c22dd6bc36c", note: "syllabus IN (official 2026-27 content); case blind solve agrees; judge: key correct; text/steps audit clean; PR review: ncertRef corrected to NCERT Ex 3.3 Q2(v) against the 2026-27 PDF (content unchanged, so the earlier blind solve and audit still apply)" },
  "QE-N-NCERT-4-AR-001": { status: "publish", hash: "03de13db13cedb5d", note: "syllabus IN (official 2026-27 content); AR blind solve agrees; judge: key correct; text/steps audit clean" },
  "QE-N-NCERT-4-AR-002": { status: "publish", hash: "f5a5a6fc9901b597", note: "syllabus IN (official 2026-27 content); AR blind solve agrees; judge: key correct; text/steps audit clean" },
  "QE-N-NCERT-4-CB-001": { status: "publish", hash: "8011ed764a478c62", note: "syllabus IN (official 2026-27 content); case blind solve agrees; judge: key correct; text/steps audit clean" },
  "QE-N-NCERT-4-CB-002": { status: "hold", note: "text/steps audit: the solution assumes AP > BP; the question only gives the difference (7 m), so the other labelling is equally valid" },
  "QE-N-NCERT-4-CB-003": { status: "publish", hash: "1ad1f2c7bb3371e4", note: "syllabus IN (official 2026-27 content); case blind solve agrees; judge: key correct; text/steps audit clean" },
  "QE-N-EXMPLR-4-AR-001": { status: "publish", hash: "9216e818c170d1f9", note: "syllabus IN (official 2026-27 content); AR blind solve agrees; judge: key correct; text/steps audit clean" },
  "QE-N-EXMPLR-4-AR-002": { status: "publish", hash: "2619ba77a827221c", note: "syllabus IN (official 2026-27 content); AR blind solve agrees; judge: key correct; text/steps audit clean" },
  "QE-N-EXMPLR-4-CB-002": { status: "publish", hash: "f5503ea066be310b", note: "syllabus IN (official 2026-27 content); case blind solve agrees; judge: key correct; text/steps audit clean" },
  "QE-N-EXMPLR-4-CB-003": { status: "publish", hash: "865e2ad1c2ef8ac9", note: "syllabus IN (official 2026-27 content); case blind solve agrees; judge: key correct; text/steps audit clean" },
  "AP-N-NCERT-5-AR-001": { status: "publish", hash: "0ed37b11a59bd617", note: "syllabus IN (official 2026-27 content); AR blind solve agrees; judge: key correct; text/steps audit clean" },
  "AP-N-NCERT-5-AR-002": { status: "hold", note: "second audit: maths correct, but both independent audits flag the 'standard NCERT formula / identity' wording (and thin or circular steps) on a page that says these are not NCERT questions; release after a bank wording fix" },
  "AP-N-NCERT-5-CB-001": { status: "hold", note: "text/steps audit: part (iv) rests on an unstated end point (the deposits are never said to stop); first blind solve also disagreed on (iii)" },
  "AP-N-NCERT-5-CB-002": { status: "publish", hash: "0ba25be5b9e7087e", note: "syllabus IN (official 2026-27 content); case blind solve agrees; judge: key correct; text/steps audit clean" },
  "AP-N-EXEM-5-AR-001": { status: "publish", hash: "215d65f340c791f4", note: "syllabus IN (official 2026-27 content); AR blind solve agrees; judge: key correct; text/steps audit clean" },
  "AP-N-EXEM-5-AR-002": { status: "hold", note: "syllabus BORDERLINE: compound interest is not in the official 2026-27 AP content" },
  "AP-N-EXEM-5-CB-001": { status: "publish", hash: "3fd084d12916ca30", note: "syllabus IN (official 2026-27 content); case blind solve agrees; judge: key correct; text/steps audit clean" },
  "TRI-N-NCERT-6-AR-001": { status: "publish", hash: "dea3ede4043e339e", note: "D261 pilot row, re-verified: syllabus IN (official 2026-27 content); AR blind solve agrees; judge: key correct; text/steps audit clean" },
  "TRI-N-NCERT-6-CB-001": { status: "publish", hash: "bddbd7b343f57bb6", note: "D261 pilot row, re-verified: syllabus IN (official 2026-27 content); case blind solve agrees; judge: key correct; text/steps audit clean" },
  "CG-N-NCERT-7-EX-003": { status: "publish", hash: "131599af15db093e", note: "syllabus IN (official 2026-27 content); case blind solve agrees; judge: key correct; text/steps audit clean" },
  "CG-N-EXMPLR-7-EX-023": { status: "publish", hash: "22f385b0da23aa9e", note: "syllabus IN (official 2026-27 content); case blind solve agrees; judge: key correct; text/steps audit clean" },
  "CG-N-EXMPLR-7-EX-024": { status: "publish", hash: "3dd9e760f5c5786a", note: "syllabus IN (official 2026-27 content); AR blind solve agrees; judge: key correct; text/steps audit clean" },
  "TRIG-N-EXMPLR-8-AR-001": { status: "hold", note: "text/steps audit: the right-triangle derivation covers only acute A, but the Assertion includes 0° and 90°, so 'R explains A' is overstated" },
  "TRIG-N-NCERT-9-CB-002": { status: "hold", note: "text/steps audit: the final answer omits part (a) (the two distances h√3 and h/√3)" },
  "TRIG-N-EXMPLR-9-CB-002": { status: "publish", hash: "681c688ea211ab24", note: "syllabus IN (official 2026-27 content); case blind solve agrees; judge: key correct; text/steps audit clean" },
  "CIRC-N-EXEM-10-AR-001": { status: "publish", hash: "1f3b07fd6e866332", note: "syllabus IN (official 2026-27 content); AR blind solve agrees; judge: key correct; text/steps audit clean" },
  "CIRC-N-EXEM-10-CB-001": { status: "publish", hash: "76fea1d10055a929", note: "syllabus IN (official 2026-27 content); case blind solve agrees; judge: key correct; text/steps audit clean" },
  "ARC-N-NCERT-11-AR-002": { status: "hold", note: "second audit: maths correct, but both independent audits flag the 'standard NCERT formula / identity' wording (and thin or circular steps) on a page that says these are not NCERT questions; release after a bank wording fix" },
  "ARC-N-NCERT-11-CB-001": { status: "hold", note: "text/steps audit: the answer depends on π = 22/7, which the question never states" },
  "ARC-N-EXEM-11-AR-001": { status: "hold", note: "second audit: syllabus BORDERLINE (major segment with no central angle; the official content limits segment problems to 60°, 90° and 120°)" },
  "ARC-N-EXEM-11-AR-002": { status: "publish", hash: "50dd563042430b4d", note: "syllabus IN (official 2026-27 content); AR blind solve agrees; judge: key correct; text/steps audit clean" },
  "ARC-N-EXEM-11-CB-001": { status: "hold", note: "PR review: the answer depends on π = 22/7, which the question never states (held, consistent with ARC-N-NCERT-11-CB-001)" },
  "SAV-N-NCERT-12-CB-001": { status: "publish", hash: "3c8341138ac23c26", note: "syllabus IN (official 2026-27 content); case blind solve agrees; judge: key correct; text/steps audit clean; PR review: ncertRef corrected to NCERT Ex 12.1 Q7 against the 2026-27 PDF (content unchanged, so the earlier blind solve and audit still apply)" },
  "SAV-N-EXMPLR-12-AR-002": { status: "publish", hash: "be101f42fdd43a97", note: "syllabus IN (official 2026-27 content); AR blind solve agrees; judge: key correct; text/steps audit clean" },
  "STAT-N-NCERT-13-AR-002": { status: "hold", note: "second audit: maths correct, but both independent audits flag the 'standard NCERT formula / identity' wording (and thin or circular steps) on a page that says these are not NCERT questions; release after a bank wording fix" },
  "STAT-N-NCERT-13-CB-001": { status: "publish", hash: "00dc67912afa73a7", note: "syllabus IN (official 2026-27 content); case blind solve agrees; judge: key correct; text/steps audit clean; PR review: ncertRef corrected to NCERT Ex 13.1 Q7 against the 2026-27 PDF (content unchanged, so the earlier blind solve and audit still apply)" },
  "STAT-N-EXEM-13-AR-001": { status: "hold", note: "text/steps audit: the Reason is judged true, but the empirical relation is an approximation, not a symmetric-case result; also syllabus BORDERLINE (empirical relation not in the official content)" },
  "STAT-N-EXEM-13-CB-001": { status: "hold", note: "syllabus BORDERLINE + steps: the modal class is the first class, so the mode needs an assumed f0 = 0 (unjustified convention)" },
  "PROB-N-NCERT-14-AR-001": { status: "hold", note: "second audit: maths correct, but both independent audits flag the 'standard NCERT formula / identity' wording (and thin or circular steps) on a page that says these are not NCERT questions; release after a bank wording fix" },
  "PROB-N-NCERT-14-AR-002": { status: "publish", hash: "d2487f59fdafdbc6", note: "syllabus IN (official 2026-27 content); AR blind solve agrees; judge: key correct; text/steps audit clean; PR review: ncertRef corrected to NCERT Ex 14.1 Q1(i) against the 2026-27 PDF (content unchanged, so the earlier blind solve and audit still apply)" },
  "PROB-N-NCERT-14-CB-001": { status: "hold", note: "second audit: syllabus BORDERLINE (part (iv) relies on 'mutually exclusive' / sample-space terminology not in the official content)" },
  "PROB-N-EXEM-14-AR-002": { status: "hold", note: "second audit: maths correct, but both independent audits flag the 'standard NCERT formula / identity' wording (and thin or circular steps) on a page that says these are not NCERT questions; release after a bank wording fix" },
};
