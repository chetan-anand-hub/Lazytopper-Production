// src/components/startHere/startHereBank.ts
//
// START-HERE-1 — the BANK-REACHING half: which chapters have CBQ MCQs, and the five questions.
//
// ⚠ LOAD THIS MODULE WITH `import()` ONLY (see startHereModel.ts) — it reaches the question bank.
//
// The set is built from the SAME served pool Quick Practice's CBQ landing uses
// (`PredictionCore.getLikelyQuestionsForConcept`, kept through `isCbq`), restricted to MCQ
// rows whose answer key resolves to one of four written options (the #352 bar, the same bar
// Quick Practice's own MCQ grading uses). Real bank rows only: no AI top-up, no generated text.

import { ensureBankSubject } from "../../data/bankChapters/loader";
import { PredictionCore } from "../../data/predictionCore";
import { isCbq } from "../../lib/cbq/cbqClassification";
import { resolveCorrectOptionIndex } from "../../lib/objectiveScoring";
import { stableHash8 } from "../../services/sessionRecords";
import { buildSeenQuestionIds } from "../../services/quickPracticeSessionService";
import { getAttempts } from "../../services/practiceInsights";
import { practiceTopicLabel } from "../practice/cbqAvailability";
import { START_HERE_COUNT, type StartHereQType } from "./startHereModel";
import type { DesktopSubject } from "../../lib/desktop/navigation";

interface BankRowLike {
  id?: unknown;
  subject?: unknown;
  competencyVerified?: unknown;
  options?: unknown;
  answer?: unknown;
  correctOption?: unknown;
  format?: unknown;
  kind?: unknown;
  questionType?: unknown;
  difficulty?: unknown;
  canonicalDifficulty?: unknown;
  bloomSkill?: unknown;
  bloomLevel?: unknown;
}

/**
 * [PremiseQ P4] Assertion-Reason is marked inconsistently in the bank — `questionType:
 * "AssertionReason"`, `kind: "assertion-reason"` / `"Assertion-Reasoning"`, `format:
 * "Assertion-Reasoning"` all occur. ONE predicate reads every spelling (read-only on src/data).
 */
const AR_MARK = /assertion/i;
export function isAssertionReasonRow(row: BankRowLike): boolean {
  return [row.questionType, row.kind, row.format].some((v) => typeof v === "string" && AR_MARK.test(v));
}

/** Four written options, and the answer key resolves to one of them. */
export function isFourOptionMcq(row: BankRowLike): boolean {
  const options = Array.isArray(row.options) ? row.options.map(String) : [];
  if (options.length !== 4 || options.some((o) => !o.trim())) return false;
  return (
    resolveCorrectOptionIndex(
      typeof row.correctOption === "string" ? row.correctOption : undefined,
      typeof row.answer === "string" ? row.answer : undefined,
      options,
    ) >= 0
  );
}

function rowQType(row: BankRowLike): StartHereQType | null {
  if (!isCbq(row as { competencyVerified?: unknown }) || !isFourOptionMcq(row)) return null;
  return isAssertionReasonRow(row) ? "ar" : "mcq";
}

export function startHereChapterRows(subject: DesktopSubject, slug: string): BankRowLike[] {
  const label = practiceTopicLabel(subject, slug);
  if (!label || label.toLowerCase() === "generic") return [];
  const want = subject.toLowerCase();
  return (PredictionCore.getLikelyQuestionsForConcept(label) as unknown as BankRowLike[]).filter(
    (q) => String(q.subject ?? "").trim().toLowerCase() === want,
  );
}

/** Per chapter: how many CBQ MCQs / A-R items it has (a type is offered only when it can fill the set). */
export type StartHereAvailability = Record<string, Record<StartHereQType, number>>;

export async function startHereAvailability(
  subject: DesktopSubject,
  slugs: readonly string[],
): Promise<StartHereAvailability> {
  await ensureBankSubject(subject);
  const out: StartHereAvailability = {};
  for (const slug of slugs) {
    const counts = { mcq: 0, ar: 0 };
    const seen = new Set<string>();
    for (const row of startHereChapterRows(subject, slug)) {
      const id = String(row.id ?? "");
      if (!id || seen.has(id)) continue;
      const t = rowQType(row);
      if (!t) continue;
      seen.add(id);
      counts[t] += 1;
    }
    out[slug] = counts;
  }
  return out;
}

/** A chapter can host a Start-here set of this type only when it has a full set of them. */
export function typeOffered(counts: Record<StartHereQType, number> | undefined, t: StartHereQType): boolean {
  return !!counts && counts[t] >= START_HERE_COUNT;
}

const DIFFICULTY_RANK: Record<string, number> = { hard: 0, medium: 1, easy: 2 };
const difficultyRank = (row: BankRowLike): number =>
  DIFFICULTY_RANK[String(row.canonicalDifficulty ?? row.difficulty ?? "").trim().toLowerCase()] ?? 1;
const BLOOM_FIRST = /^(analy[sz]ing|evaluating)$/i;
const bloomRank = (row: BankRowLike): number => (BLOOM_FIRST.test(String(row.bloomSkill ?? row.bloomLevel ?? "").trim()) ? 0 : 1);

/**
 * The five question ids. Order of preference: UNSEEN first (the existing seen-set — what this
 * student has already answered on the chapter — so a second run is not a repeat), then difficulty
 * Hard before Medium, then Analysing / Evaluating first. Hard but fair: an Easy question is used
 * only when the chapter has fewer than five others. Deterministic: the tie-break is a hash of
 * the id and `rotation` (a fresh visit rotates), never Math.random.
 */
export function chooseStartHereIds(
  rows: readonly BankRowLike[],
  qtype: StartHereQType,
  seen: ReadonlySet<string>,
  rotation: number,
): string[] {
  const pool: BankRowLike[] = [];
  const have = new Set<string>();
  for (const row of rows) {
    const id = String(row.id ?? "");
    if (!id || have.has(id) || rowQType(row) !== qtype) continue;
    have.add(id);
    pool.push(row);
  }
  const nonEasy = pool.filter((r) => difficultyRank(r) < 2);
  const candidates = nonEasy.length >= START_HERE_COUNT ? nonEasy : pool;
  const tie = (r: BankRowLike): number => parseInt(stableHash8(`${String(r.id)}|${rotation}`), 16);
  return [...candidates]
    .sort(
      (a, b) =>
        Number(seen.has(String(a.id))) - Number(seen.has(String(b.id))) ||
        difficultyRank(a) - difficultyRank(b) ||
        bloomRank(a) - bloomRank(b) ||
        tie(a) - tie(b),
    )
    .slice(0, START_HERE_COUNT)
    .map((r) => String(r.id));
}

/** The five ids for a chapter + type, from the real bank and this student's seen-set. */
export async function pickStartHereSet(args: {
  subject: DesktopSubject;
  chapter: string;
  qtype: StartHereQType;
  rotation: number;
}): Promise<string[]> {
  await ensureBankSubject(args.subject);
  let seen = new Set<string>();
  try {
    seen = buildSeenQuestionIds(getAttempts(), practiceTopicLabel(args.subject, args.chapter) || args.chapter);
    for (const id of buildSeenQuestionIds(getAttempts(), args.chapter)) seen.add(id);
  } catch {
    /* an unreadable seen-set only costs the no-repeat preference */
  }
  return chooseStartHereIds(startHereChapterRows(args.subject, args.chapter), args.qtype, seen, args.rotation);
}
