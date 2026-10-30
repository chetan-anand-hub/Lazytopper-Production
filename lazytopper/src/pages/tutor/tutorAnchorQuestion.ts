// src/pages/tutor/tutorAnchorQuestion.ts
// TUTOR-ANCHOR-KEY-1 - the tutor always knows the exact question it was opened about, and its key.
//
// Every surface that hands the tutor a SPECIFIC question does it the same way: the tutor URL's `q` is the
// bank question id (Quick Practice, worksheet / chapter test / full mock scorecards, the signed-out
// scorecard ask). The tutor used to read only a shortened stem from it, so the model answered from its own
// chemistry and contradicted the board key. This module resolves that id to the bank row and builds the
// `anchorQuestion` the tutor request carries on EVERY turn: the FULL stem, the options with their letters,
// the official key, the solution steps, and (when known) the student's pick and the verdict the card showed.
//
// Pure helpers only: no network, no write, no grading. The key is the bank's own; nothing here decides
// whether an answer is right (the pick's verdict is the one the question card already computed).

import type { TutorAnchorQuestion, TutorReturnedWork } from "../../ai/tutorClient";
import { resolveCorrectOptionIndex } from "../../lib/objectiveScoring";

const LETTERS = "ABCDEFGH";

/** The structural slice of a bank row this module reads (CanonicalQuestion, loosely - test rows are partial). */
export interface AnchorBankRow {
  id?: unknown;
  questionText?: unknown;
  format?: unknown;
  marks?: unknown;
  options?: unknown;
  answer?: unknown;
  correctOption?: unknown;
  solutionSteps?: unknown;
  finalAnswer?: unknown;
  ncertRef?: unknown;
  pyqYear?: unknown;
  isPYQ?: unknown;
  sourceOverride?: unknown;
}

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

const OWN_SOURCE = "LazyTopper practice question";

/** TUTOR-KEY-TRUST-1 - the source label of a bank row, from the tags the bank really carries (inspected across
 *  the banks): `sourceOverride:"others"` / `LTG-` ids are LazyTopper's own; a `pyqYear`
 *  is a board paper; `ncertRef` "Exemplar Ex 1.1 Q2" / "NCERT Ex 1.1 Q2" / "Exercise Q3" / "In-text Q3" name the
 *  textbook; "CBSE CFPQ ..." is the CBSE competency-focus set; ids with EXMPLR / NCERT cover rows without a ref.
 *  Anything else (APQ, cbjesc* chapter practice, unknown) -> "LazyTopper practice question". */
export function sourceLabelOf(row: AnchorBankRow | null | undefined): string {
  if (!row) return OWN_SOURCE;
  const id = str(row.id);
  if (row.sourceOverride === "others" || /^LTG-/i.test(id)) return OWN_SOURCE;
  const year = str(row.pyqYear);
  if (year) return `CBSE ${year} board paper`;
  const ref = str(row.ncertRef).replace(/\s*\((?:MCQ|SA|LA|VSA|CBQ|Case)[^)]*\)\s*$/i, "").trim();
  if (/^exemplar/i.test(ref)) return `NCERT ${ref}`;
  if (/^ncert/i.test(ref)) return ref;
  if (/^(exercise|in-text|example)\b/i.test(ref)) return `NCERT ${ref}`;
  if (/^CBSE CFPQ/i.test(ref)) return "CBSE competency-focus practice question";
  if (/^PYQ\b/i.test(ref) || row.isPYQ === true) return "CBSE board paper";
  if (/exmplr|-exem\d*-/i.test(id)) return "NCERT Exemplar";
  if (/ncert/i.test(id)) return "NCERT";
  return OWN_SOURCE;
}

/** The anchor for a bank row, or null when the row has no question text (nothing honest to anchor on).
 *  `pick`/`correct` are the student's option text and the card's verdict; a pick without a verdict is
 *  never sent (the tutor must not guess right or wrong). */
export function buildAnchorQuestion(
  row: AnchorBankRow | null | undefined,
  pick?: { pick?: string | null; correct?: boolean | null } | null,
): TutorAnchorQuestion | null {
  if (!row) return null;
  const id = str(row.id);
  const questionText = str(row.questionText);
  if (!id || !questionText) return null;

  const rawOptions = Array.isArray(row.options) ? row.options.map((o) => String(o ?? "").trim()).filter(Boolean) : [];
  const answer = str(row.answer) || str(row.finalAnswer);
  const out: TutorAnchorQuestion = { id, questionText, source: sourceLabelOf(row) };
  const format = str(row.format);
  if (format) out.format = format;
  if (typeof row.marks === "number" && row.marks > 0) out.marks = row.marks;
  if (rawOptions.length > 0) {
    out.options = rawOptions.slice(0, LETTERS.length).map((o, i) => `${LETTERS[i]}. ${o}`);
    const at = resolveCorrectOptionIndex(str(row.correctOption) || undefined, str(row.answer) || undefined, rawOptions);
    if (at >= 0 && at < LETTERS.length) out.answerLetter = LETTERS[at];
  }
  if (answer) out.answer = answer;
  const steps = Array.isArray(row.solutionSteps) ? row.solutionSteps.map((s) => String(s ?? "").trim()).filter(Boolean) : [];
  if (steps.length > 0) out.solutionSteps = steps;
  const finalAnswer = str(row.finalAnswer);
  if (finalAnswer) out.finalAnswer = finalAnswer;
  const p = str(pick?.pick);
  if (p && typeof pick?.correct === "boolean") {
    out.studentPick = p;
    out.verdict = pick.correct ? "right" : "wrong";
  }
  return out;
}

/** Which bank question (and which tap) the thread is about, from the thread itself and the tutor URL.
 *  The NEWEST return-result opener decides: it names its question in `meta` (and the student's tap), and
 *  an opener WITHOUT a question (e.g. a Check & Improve return) means the older question is stale, so
 *  nothing is anchored. When the URL's `q` names a different question than that opener, the URL wins. With no opener at all, the URL's `q` (the hop that opened the tutor) is the
 *  question. `qn:<n>` ids (Answer Checker's own upload) are positional, hold no bank row, and so
 *  resolve to nothing downstream. */
export function anchorTargetOf(
  messages: ReadonlyArray<{ kind?: string; meta?: { q?: string; pick?: string; correct?: boolean } }>,
  urlQuestionId?: string | null,
): { id: string; pick: string | null; correct: boolean | null } | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i];
    if (m.kind !== "return-result") continue;
    const meta = m.meta;
    if (!meta || typeof meta.q !== "string" || !meta.q) return null;
    // The URL names a DIFFERENT question than the opener (the student came back about B after A): the URL wins,
    // and B is re-resolved from the bank (no row -> no anchor; A is never kept).
    const urlId = String(urlQuestionId ?? "").trim();
    if (urlId && urlId !== meta.q) return { id: urlId, pick: null, correct: null };
    const pick = typeof meta.pick === "string" && meta.pick && typeof meta.correct === "boolean" ? meta.pick : null;
    return { id: meta.q, pick, correct: pick === null ? null : (meta.correct as boolean) };
  }
  const id = String(urlQuestionId ?? "").trim();
  return id ? { id, pick: null, correct: null } : null;
}

const squash = (v: unknown): string => String(v ?? "").toLowerCase().replace(/\s+/g, " ").trim();

/** TUTOR-KEY-TRUST-1 - which returnedWork rides a turn that has (or lacks) a bank anchor. With NO anchor the
 *  returnedWork is the current context (an Answer Checker return) and is kept. With an anchor it is kept ONLY
 *  when it is about the SAME question (same stem); a stale one about another question is dropped, so the
 *  newest context (URL q / newest opener) wins. */
export function returnedWorkForAnchor(
  rw: TutorReturnedWork | null | undefined,
  anchor: TutorAnchorQuestion | null | undefined,
): TutorReturnedWork | null {
  if (!rw) return null;
  if (!anchor) return rw;
  const a = squash(anchor.questionText);
  const r = squash(rw.question);
  if (!r) return null; // an image-only / step-only return cannot be shown to be the anchored question
  const head = (t: string) => t.slice(0, 80);
  return a && (a.includes(head(r)) || r.includes(head(a))) ? rw : null;
}
