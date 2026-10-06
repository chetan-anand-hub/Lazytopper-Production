// @vitest-environment node
/**
 * BANK-FIX-1 PR-1, owner-approved addendum (2026-10-06): the Prompt-D practice fallback.
 *
 * When the engine returns 0 rows for a topic, Practice falls back to the Prompt-D pack
 * for that topic (`buildPracticeQuestionsWithAiTopup`). Two served defects, found by
 * BANK-FIX-1:
 *   1. Prompt-D rows keep their stem in `text`, but `mapUnifiedQuestionToPractice` read only
 *      `questionText` — so every fallback question was served with an EMPTY stem (and the
 *      drill de-dupe, keyed on that text, collapsed the whole pack to one blank question).
 *   2. Human Eye's fallback never loaded: the resolver produced `human_eye_and_colourful_world`
 *      while the pack is keyed `human_eye_colourful_world`.
 */
import { describe, expect, it } from "vitest";
import { BOARD_CHAPTER_KEYS } from "../../config/syllabus2026-27";
import { promptDPracticePacks } from "../../data/promptDPracticePacks";
import {
  buildPracticeQuestionsWithAiTopup,
  mapUnifiedQuestionToPractice,
  resolvePracticePackKey,
} from "./practiceQuestionBuilder";

const MATHS = new Set<string>(BOARD_CHAPTER_KEYS.slice(0, 13));
const subjectOf = (key: string) => (MATHS.has(key) ? "maths" : "science") as "maths" | "science";
const subjectKeyOf = (key: string) => (MATHS.has(key) ? "Maths" : "Science") as "Maths" | "Science";

describe("Prompt-D fallback: every question carries its text", () => {
  const rows = (["maths", "science"] as const).flatMap((s) =>
    Object.values(promptDPracticePacks[s]).flatMap((p) => p.questions),
  );

  it("the mapper serves a non-empty stem for every Prompt-D row", () => {
    expect(rows.length).toBeGreaterThan(200);
    const blank = rows
      .map((q) => mapUnifiedQuestionToPractice(q as unknown as Record<string, unknown>, q.id))
      .filter((q) => !String(q.questionText ?? "").trim())
      .map((q) => q.id);
    expect(blank).toEqual([]);
  });

  it("the mapped stem IS the row's text (not some other field)", () => {
    const q = promptDPracticePacks.maths.polynomials.questions[0];
    expect(mapUnifiedQuestionToPractice(q as unknown as Record<string, unknown>, q.id).questionText).toBe(q.text.trim());
  });

  it("a bank-shaped row still uses questionText (control)", () => {
    const q = mapUnifiedQuestionToPractice({ id: "X", questionText: "  bank stem ", text: "other" }, "X");
    expect(q.questionText).toBe("bank stem");
  });

  it("end to end: when the engine has nothing, the fallback serves several distinct, non-empty questions", async () => {
    const out = await buildPracticeQuestionsWithAiTopup({
      grade: "10",
      subjectKey: "Maths",
      topicLabel: "zz-no-such-topic-bankfix1",
      packTopicKey: "polynomials",
      count: 10,
      difficulty: "All",
    });
    const fromPack = out.filter((q) => /^M-POLY-\d+$/.test(String(q.id)));
    expect(fromPack.length).toBeGreaterThanOrEqual(5);
    for (const q of fromPack) expect(String(q.questionText ?? "").trim()).not.toBe("");
    expect(new Set(fromPack.map((q) => q.questionText)).size).toBe(fromPack.length);
  });
});

describe("Prompt-D fallback: every board chapter's key resolves to a pack", () => {
  for (const key of BOARD_CHAPTER_KEYS) {
    it(`${key}`, () => {
      const packs = promptDPracticePacks[subjectOf(key)];
      for (const explicitTopicKey of [key, null]) {
        const packKey = resolvePracticePackKey({ subjectKey: subjectKeyOf(key), topicParam: key, explicitTopicKey });
        expect(packs[packKey], `${key} (explicit=${explicitTopicKey}) -> ${packKey}`).toBeDefined();
      }
    });
  }

  it("Human Eye resolves to the Human Eye pack (the defect this pins)", () => {
    const k = resolvePracticePackKey({ subjectKey: "Science", topicParam: "human-eye-and-colourful-world", explicitTopicKey: "human-eye-and-colourful-world" });
    expect(promptDPracticePacks.science[k]?.topicName).toBe("The Human Eye and the Colourful World");
  });
});
