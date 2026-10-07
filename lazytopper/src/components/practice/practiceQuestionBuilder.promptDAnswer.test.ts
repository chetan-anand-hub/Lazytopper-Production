// @vitest-environment node
/**
 * BANK-FIX-1 PR-2: Prompt-D fallback rows carry a model answer, and the mapper serves it.
 *
 * PR-1 made the fallback serve its stems (promptDFallback.guard.test.ts). The rows still had no
 * answer at all, so a student who reached the fallback could not check their work. PR-2 writes a
 * model answer + CBSE step-mark scheme into every served row, withholds four rows that cannot be
 * answered as written, and removes the 19 "-D2" "(Drill variant)" clones that padded the
 * trigonometry alias pack with the same questions under a second id.
 */
import { describe, expect, it } from "vitest";
import { PROMPT_D_WITHHELD_IDS, promptDPracticePacks } from "../../data/promptDPracticePacks";
import { mapUnifiedQuestionToPractice } from "./practiceQuestionBuilder";

const rows = (["maths", "science"] as const).flatMap((s) =>
  Object.values(promptDPracticePacks[s]).flatMap((p) => p.questions),
);

describe("Prompt-D rows: every served row has an answer", () => {
  it("every row has a non-empty answer, finalAnswer and solutionSteps", () => {
    expect(rows.length).toBeGreaterThan(200);
    const bad = rows
      .filter((q) => !q.answer?.trim() || !q.finalAnswer?.trim() || !(q.solutionSteps?.length))
      .map((q) => q.id);
    expect(bad).toEqual([]);
  });

  it("every step carries a [N mark] prefix and the step marks sum to the row's marks", () => {
    const bad: string[] = [];
    for (const q of rows) {
      let total = 0;
      for (const step of q.solutionSteps ?? []) {
        const m = /^\[(\d+(?:\.\d+)?) marks?\]/.exec(step);
        if (!m) { bad.push(`${q.id}: no prefix`); total = NaN; break; }
        total += Number(m[1]);
      }
      if (total !== q.marks) bad.push(`${q.id}: ${total} != ${q.marks}`);
    }
    expect(bad).toEqual([]);
  });

  it("the mapper passes finalAnswer through (and the answer)", () => {
    const q = promptDPracticePacks.maths.polynomials.questions[0];
    const mapped = mapUnifiedQuestionToPractice(q as unknown as Record<string, unknown>, q.id);
    expect(mapped.finalAnswer).toBe(q.finalAnswer);
    expect(mapped.answer).toBe(q.answer);
    expect(mapped.solutionSteps).toEqual(q.solutionSteps);
  });

  it("control: a row with no finalAnswer gets none (nothing is invented)", () => {
    const mapped = mapUnifiedQuestionToPractice({ id: "X", text: "stem" }, "X");
    expect(mapped.finalAnswer).toBeUndefined();
    expect(mapped.answer).toBe("");
  });
});

describe("Prompt-D withholds and drill clones", () => {
  const ids = new Set(rows.map((q) => q.id));

  it("the four withheld rows are not served, and ids never change", () => {
    expect([...PROMPT_D_WITHHELD_IDS].sort()).toEqual(["M-PLE-7", "M-STAT-7", "M-STAT-8", "S-HER-14"]);
    expect([...PROMPT_D_WITHHELD_IDS].filter((id) => ids.has(id))).toEqual([]);
  });

  it("no '-D2' drill clone is served, and no stem says '(Drill variant)'", () => {
    expect(rows.filter((q) => /-D2$/.test(q.id) || /\(Drill variant\)/.test(q.text)).map((q) => q.id)).toEqual([]);
  });

  it("the trigonometry alias pack is exactly the introduction + applications rows", () => {
    const m = promptDPracticePacks.maths;
    expect(m.trigonometry.questions.map((q) => q.id)).toEqual([
      ...m.introduction_to_trigonometry.questions.map((q) => q.id),
      ...m.applications_of_trigonometry.questions.map((q) => q.id),
    ]);
    // 19 = 9 introduction + 10 applications rows (the pack was 19 seed + 19 "-D2" clones on trunk)
    expect(m.trigonometry.questions.length).toBe(19);
  });

  it("no two served rows share an id", () => {
    const seen = new Map<string, number>();
    for (const q of rows) seen.set(q.id, (seen.get(q.id) ?? 0) + 1);
    // the trigonometry alias pack re-serves its seed rows by design; every other id is unique
    const aliasIds = new Set(promptDPracticePacks.maths.trigonometry.questions.map((q) => q.id));
    expect([...seen].filter(([id, n]) => n > (aliasIds.has(id) ? 2 : 1)).map(([id]) => id)).toEqual([]);
  });
});
