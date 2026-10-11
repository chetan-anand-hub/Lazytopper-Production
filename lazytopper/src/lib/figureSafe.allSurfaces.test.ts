// @vitest-environment node
//
// RULE5-BIND-1 (cofounder D66b step 4 / D68d) — THE PERMANENT GUARD. No question that is SERVED anywhere in the product may need
// a figure it lacks. PR-1 (#1058) kept such rows out of Worksheets, Chapter Tests and Full Mocks only; Quick Practice, the HPQ
// page, the predicted papers and the notes pages never applied Rule 5, so the same rows were still on screen there.
//
// This test closes that gap structurally. Every surface reads one of these served sources:
//   - Quick Practice, Worksheets, Chapter Tests, Full Mocks, Notes board questions, SEO pages -> canonicalQuestionBank
//     (the withheld rows are already removed) and, for Quick Practice's fallback packs, promptDPracticePacks
//   - the HPQ page                                                                      -> highlyProbableQuestions (minus HPQ_WITHHELD_IDS)
//   - the predicted papers / Full Mock predicted pool                                    -> predictedQuestions, sciencePredictedQuestions
// and asserts the one predicate (`needsMissingFigure`, = publishability Rule 5) holds for none of them. A new question that says
// "in the given figure" with no bound figure turns this RED before it can ship; the fix is to bind an official figure or withhold it.
import { describe, expect, it } from "vitest";
import "../test/preloadBankChapters";
import { needsMissingFigure } from "./figureSafe";
import { canonicalQuestionBank } from "../data/canonicalQuestionBank";
import { highlyProbableQuestions } from "../data/highlyProbableQuestions";
import { HPQ_WITHHELD_IDS } from "../data/hpqCompetencyAdditions";
import { predictedQuestions } from "../data/predictedQuestions";
import { sciencePredictedQuestions } from "../data/predictedQuestionsScience";
import { PROMPT_D_WITHHELD_IDS, promptDPracticePacks } from "../data/promptDPracticePacks";
import { BOARD_QUESTIONS } from "../lib/boardQuestions/boardQuestions";

interface Served {
  source: string;
  id: string;
  questionText: string;
  answer?: string;
  requiresDiagram?: boolean;
}

const served: Served[] = [];
for (const q of canonicalQuestionBank as any[]) served.push({ source: "canonical", id: q.id, questionText: q.questionText ?? "", answer: q.answer, requiresDiagram: q.requiresDiagram });
for (const b of highlyProbableQuestions as any[]) for (const q of b.questions ?? []) if (!HPQ_WITHHELD_IDS.has(q.id)) served.push({ source: "hpq", id: q.id, questionText: q.question ?? "", answer: q.answer, requiresDiagram: q.requiresDiagram });
for (const q of predictedQuestions as any[]) served.push({ source: "predicted", id: q.id, questionText: q.questionText ?? "", answer: q.answer, requiresDiagram: q.requiresDiagram });
for (const q of sciencePredictedQuestions as any[]) served.push({ source: "predicted", id: q.id, questionText: q.questionText ?? "", answer: q.answer, requiresDiagram: q.requiresDiagram });
(function walk(n: any) {
  if (!n || typeof n !== "object") return;
  if (Array.isArray(n)) return n.forEach(walk);
  const stem = n.questionText ?? n.question ?? n.text;
  if (n.id && typeof stem === "string") {
    if (!PROMPT_D_WITHHELD_IDS.has(n.id)) served.push({ source: "practice-pack", id: n.id, questionText: stem, answer: n.answer, requiresDiagram: n.requiresDiagram });
    return;
  }
  Object.values(n).forEach(walk);
})(promptDPracticePacks);

describe("D68d — no served row on any surface needs a figure it lacks", () => {
  it("scans every served source (non-vacuous: thousands of rows across four sources)", () => {
    const bySource = new Map<string, number>();
    for (const r of served) bySource.set(r.source, (bySource.get(r.source) ?? 0) + 1);
    expect([...bySource.keys()].sort()).toEqual(["canonical", "hpq", "practice-pack", "predicted"]);
    expect(bySource.get("canonical")!).toBeGreaterThan(10000);
    expect(bySource.get("hpq")!).toBeGreaterThan(100);
    expect(bySource.get("predicted")!).toBeGreaterThan(100);
    expect(bySource.get("practice-pack")!).toBeGreaterThan(200);
  });

  it("no served row needs a missing figure", () => {
    const bad = served.filter((r) => needsMissingFigure(r)).map((r) => `${r.source}:${r.id}`);
    expect(bad).toEqual([]);
  });

  it("CONTROL: the check can fail — a row that says 'in the given figure' with no bound figure is caught", () => {
    expect(needsMissingFigure({ id: "NO-SUCH-ROW", questionText: "In the given figure, find x." })).toBe(true);
    expect(needsMissingFigure({ id: "NO-SUCH-ROW", questionText: "Find x if 2x = 6." })).toBe(false);
  });

  it("every notes-page board question is a served canonical row (the notes surface adds no row of its own)", () => {
    const canonicalIds = new Set(served.filter((r) => r.source === "canonical").map((r) => r.id));
    const missing: string[] = [];
    for (const t of Object.values(BOARD_QUESTIONS)) for (const q of t.questions) if (!canonicalIds.has(q.id)) missing.push(q.id);
    expect(missing).toEqual([]);
  });
});
