/**
 * cbqPackShape.test.ts — CBQ-1 (C2): how every LazyTopper-generated Science CBQ is PRESENTED to a student.
 *
 * ★ WHY.
 * (1) The practice card shows options A–D in listed order (no shuffle), and the first packs keyed most MCQs
 *     at A — a student could score by always picking A. Each pack must spread its MCQ keys across A–D.
 * (2) A multi-part question must show what each part is worth (CBSE prints marks against every part); the
 *     first packs printed none, or only on the last part. Every part shown on its own line must carry its
 *     marks, equal to that part's steps in the marking scheme — or the stem must state "N mark(s) each".
 * Both were found by independent verifiers on C2 PR-3/PR-4 and fixed for all packs in the C2 polish PR.
 */

import "../../test/preloadBankChapters";

import { describe, it, expect } from "vitest";

import { canonicalQuestionBank } from "../canonicalQuestionBank";
import { isCbq } from "../../lib/cbq/cbqClassification";
import type { CanonicalQuestion } from "../predictionTypes";

const LAB = "(?:[a-h]|i{1,3}|iv|v|vi)";
const PART = new RegExp(`^\\((${LAB})\\)\\s`);
const STEP = new RegExp(`^\\[(\\d+(?:\\.\\d+)?)\\s*marks?\\]\\s*(?:\\((${LAB})\\))?`, "i");
const MARK = /[[(]\s*(\d+(?:\.5)?)\s*marks?\s*[\])]/i;
const EACH = /[[(]\s*\d+(?:\.5)?\s*marks?\s+each\s*[\])]/i;

/** Problems with a row's printed per-part marks (empty = fine). */
function partMarkProblems(q: Pick<CanonicalQuestion, "id" | "marks" | "questionText" | "solutionSteps">): string[] {
  if (q.marks < 2) return [];
  const lines = q.questionText.split("\n");
  const parts: [string, number][] = [];
  lines.forEach((l, i) => { const m = l.match(PART); if (m) parts.push([m[1], i]); });
  if (parts.length < 2) {
    const inline = new Set([...q.questionText.matchAll(new RegExp(`\\((${LAB})\\)`, "g"))].map((m) => m[1]));
    return inline.size >= 2 && !/\[Marks:/.test(q.questionText) && !MARK.test(q.questionText) ? [`${q.id}: inline parts without marks`] : [];
  }
  if (EACH.test(q.questionText)) return [];
  const sums = new Map<string, number>(); let cur: string | null = null;
  for (const s of q.solutionSteps ?? []) {
    const m = s.match(STEP); const lab: string | null = m ? (m[2] ?? cur) : null; cur = lab;
    if (m && lab) sums.set(lab, (sums.get(lab) ?? 0) + Number(m[1]));
  }
  const out: string[] = [];
  for (const [lab, i] of parts) {
    const m = lines[i].match(MARK);
    if (!m) out.push(`${q.id} (${lab}): no marks printed`);
    else if (sums.has(lab) && Math.abs(Number(m[1]) - (sums.get(lab) ?? 0)) > 1e-9) out.push(`${q.id} (${lab}): printed ${m[1]} ≠ steps ${sums.get(lab)}`);
  }
  return out;
}

describe("CBQ-1 · generated Science CBQ packs: presentation", () => {
  // C2's CBQ packs use the -2xx id range (D8); the older GEN-THIN-1 -1xx rows predate this presentation rule.
  const rows = canonicalQuestionBank.filter(
    (q) => q.subject === "Science" && q.origin === "lt-generated" && isCbq(q) && /^LTG-S-[A-Z]+-2\d\d$/.test(q.id),
  );
  const byChapter = new Map<string, CanonicalQuestion[]>();
  for (const q of rows) byChapter.set(q.topicKey, [...(byChapter.get(q.topicKey) ?? []), q]);

  it("covers every Science chapter (control: the filter is not empty)", () => {
    expect(byChapter.size).toBe(13);
  });

  it("each chapter's generated MCQs are keyed evenly across A–D (max − min ≤ 1)", () => {
    for (const [slug, qs] of byChapter) {
      const mcq = qs.filter((q) => q.format === "MCQ");
      const at = [0, 1, 2, 3].map((i) => mcq.filter((q) => q.options?.indexOf(q.answer ?? "") === i).length);
      expect(Math.max(...at) - Math.min(...at), `${slug} ${at.join("/")}`).toBeLessThanOrEqual(1);
    }
  });

  it("every multi-part question prints each part's marks, equal to that part's steps", () => {
    expect(rows.flatMap((q) => partMarkProblems(q))).toEqual([]);
  });

  it("control: the checker reports a stem without part marks, and a printed mark that disagrees with the steps", () => {
    const steps = ["[1 mark] (a) one", "[2 marks] (b) two"];
    expect(partMarkProblems({ id: "X", marks: 3, questionText: "Stem\n(a) First?\n(b) Second?", solutionSteps: steps })).toHaveLength(2);
    expect(partMarkProblems({ id: "X", marks: 3, questionText: "Stem\n(a) First? [1 mark]\n(b) Second? [1 mark]", solutionSteps: steps })).toHaveLength(1);
    expect(partMarkProblems({ id: "X", marks: 3, questionText: "Stem\n(a) First? [1 mark]\n(b) Second? [2 marks]", solutionSteps: steps })).toEqual([]);
  });
});
