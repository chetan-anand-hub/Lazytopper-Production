// @vitest-environment node
/**
 * START-HERE-WRITTEN-FIX — PROOF that a Start-here "Written - 1 Q" link serves the PICKED bank row.
 *
 * Live defect (17 Oct): `focusBankIds=LTG-S-CHEMRXN-250&strictFocus=true&count=1` served a random
 * Section E case study instead of the 3-mark Short row -250. The exact-set branch of the REAL builder
 * was gated on the floored count (MIN_QUESTION_COUNT = 3), so a 1-id list never reached it; the normal
 * chapter draw ran and the page cut it to one random row. PracticePage tests mock the builder, which is
 * why this was green — this test goes through the real builder.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { ensureBankChapters } from "../../data/bankChapters/loader";
import { buildPracticeQuestionsWithAiTopup } from "./practiceQuestionBuilder";

const CHAPTER = "chemical-reactions-and-equations";
const TOPIC = "ChemicalReactions";
const PICKED = "LTG-S-CHEMRXN-250";

const build = (count: number, focusBankIds: string[]) =>
  buildPracticeQuestionsWithAiTopup({
    grade: "10",
    subjectKey: "Science",
    topicLabel: TOPIC,
    packTopicKey: TOPIC,
    count,
    difficulty: "All",
    focusBankIds,
    strictFocus: true,
  });

beforeAll(async () => {
  await ensureBankChapters([CHAPTER]);
});

describe("Start-here written: a 1-question exact set through the real builder", () => {
  it("count 1 + one picked id serves exactly that id (repeated: the old draw was random)", async () => {
    for (let i = 0; i < 6; i += 1) {
      const served = await build(1, [PICKED]);
      expect(served.map((q) => String(q.id))).toEqual([PICKED]);
      expect(served[0].marks).toBe(3);
    }
  });

  it("count 2 + two picked ids serves exactly those ids, in order", async () => {
    const served = await build(2, [PICKED, "LTG-S-CHEMRXN-249"]);
    expect(served.map((q) => String(q.id))).toEqual([PICKED, "LTG-S-CHEMRXN-249"]);
  });

  it("control: count 3 with 3 ids is unchanged (served == the 3 ids, picked first)", async () => {
    const ids = [PICKED, "LTG-S-CHEMRXN-249", "LTG-S-CHEMRXN-251"];
    const served = await build(3, ids);
    const got = served.map((q) => String(q.id));
    expect(got[0]).toBe(PICKED);
    expect(got.length).toBe(3);
    expect(new Set(got)).toEqual(new Set(ids));
  });
});
