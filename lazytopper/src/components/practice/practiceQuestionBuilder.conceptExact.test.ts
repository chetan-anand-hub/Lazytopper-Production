// @vitest-environment node
/**
 * CONCEPT-MAP-FILL-1 PR-2 — PROOF that a Topic Hub concept Practise serves EXACTLY the requested ids.
 *
 * Cofounder D74: `focusBankIds` + `strictFocus` was only a reorder/filter over a set the engine had already
 * drawn, so ids outside that draw were never served. This test goes through the REAL builder (the one
 * PracticePage calls) with a concept's id set (>= 8 ids, one chapter) and asserts served == requested.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { ensureBankChapters } from "../../data/bankChapters/loader";
import { conceptBankIds } from "../../lib/desktop/conceptPractice";
import { buildPracticeQuestionsWithAiTopup } from "./practiceQuestionBuilder";

const CHAPTER = "metals-and-non-metals";
const CASES: Array<[string, string[]]> = [
  ["Alloys", ["Alloys"]],
  ["Formation and Properties of Ionic Compounds", ["Formation and Properties of Ionic Compounds"]],
  ["Refining + Basic Metallurgical Processes", ["Basic Metallurgical Processes", "Refining of Metals"]],
];

beforeAll(async () => {
  await ensureBankChapters([CHAPTER]);
});

describe("concept Practise through the real builder", () => {
  it.each(CASES)("%s: the served set equals the requested id set", async (_label, keys) => {
    const ids = conceptBankIds(CHAPTER, keys);
    expect(ids.length).toBeGreaterThanOrEqual(8);
    const count = Math.min(ids.length, 50);
    const served = await buildPracticeQuestionsWithAiTopup({
      grade: "10",
      subjectKey: "Science",
      topicLabel: "MetalsNonMetals",
      packTopicKey: "MetalsNonMetals",
      count,
      difficulty: "All",
      focusBankIds: ids,
      strictFocus: true,
    });
    const got = served.map((q) => String(q.id));
    const want = new Set(ids);
    expect(got.filter((id) => !want.has(id)), "served ids that are NOT in the concept").toEqual([]);
    expect(new Set(got).size, "no duplicates").toBe(got.length);
    if (ids.length <= 50) expect(new Set(got), "every requested id is served").toEqual(want);
    else expect(got.length).toBe(50);
  });
});
