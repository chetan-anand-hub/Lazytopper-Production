// @vitest-environment node
/**
 * FOLLOWUPS-5 L — an EXACT set (strict focus ids, no sectionFilter) where SOME ids resolve but
 * fewer than requested serves ONLY the resolved ids. Before: the builder topped the set up from the
 * canonical/AI fallback with an unrelated question (a concept link with one withheld id served the
 * concept's real row plus a random other one). Zero resolved stays as today (deferred: needs an
 * empty-state design). Goes through the REAL builder (PracticePage tests mock it).
 */
import { describe, it, expect, beforeAll } from "vitest";
import { ensureBankChapters } from "../../data/bankChapters/loader";
import { buildPracticeQuestionsWithAiTopup } from "./practiceQuestionBuilder";

const CHAPTER = "chemical-reactions-and-equations";
const TOPIC = "ChemicalReactions";
const VALID = "LTG-S-CHEMRXN-250";

const build = (count: number, focusBankIds: string[], sectionFilter?: string) =>
  buildPracticeQuestionsWithAiTopup({
    grade: "10",
    subjectKey: "Science",
    topicLabel: TOPIC,
    packTopicKey: TOPIC,
    count,
    difficulty: "All",
    focusBankIds,
    strictFocus: true,
    sectionFilter,
  });

beforeAll(async () => {
  await ensureBankChapters([CHAPTER]);
});

describe("exact set with an unresolved id", () => {
  it("ids [valid, NOPE-XYZ], count 2 -> exactly [valid], no unrelated top-up", async () => {
    const served = await build(2, [VALID, "NOPE-XYZ"]);
    expect(served.map((q) => String(q.id))).toEqual([VALID]);
  });

  it("ids [NOPE-XYZ, valid, NOPE-ABC], count 3 -> exactly [valid]", async () => {
    const served = await build(3, ["NOPE-XYZ", VALID, "NOPE-ABC"]);
    expect(served.map((q) => String(q.id))).toEqual([VALID]);
  });

  it("control: both ids resolve -> both served, in order (unchanged)", async () => {
    const served = await build(2, [VALID, "LTG-S-CHEMRXN-249"]);
    expect(served.map((q) => String(q.id))).toEqual([VALID, "LTG-S-CHEMRXN-249"]);
  });

  it("control: zero ids resolve -> today's behaviour (falls through to the chapter draw, not empty)", async () => {
    const served = await build(2, ["NOPE-XYZ", "NOPE-ABC"]);
    expect(served.length).toBeGreaterThan(0);
    expect(served.some((q) => String(q.id) === "NOPE-XYZ")).toBe(false);
  });
});
