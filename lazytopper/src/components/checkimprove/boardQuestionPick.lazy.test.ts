import { describe, it, expect, beforeEach } from "vitest";
import {
  __resetBankChaptersForTest,
  bankChaptersForSubject,
  ensureBankChapters,
  getBankRows,
  isBankChapterLoaded,
} from "../../data/bankChapters/loader";
import { chooseBoardTryRow, pickBoardTryQuestion, type BoardTryRow } from "./boardQuestionPick";

/**
 * ACTIVATION-2 D (review of #1224, MED) — the picker loads ONE chapter at a time, starting at a
 * deterministic rotation over the subject's chapter list and moving on only when a chapter has
 * nothing to offer; it never loads the whole subject for one question.
 */
const SUBJECTS = ["Maths", "Science"] as const;

beforeEach(() => {
  __resetBankChaptersForTest();
});

describe("ACTIVATION-2 D · one chapter at a time", () => {
  it.each(SUBJECTS)("%s: loads exactly the chapters from the rotation start up to the first one with a question", async (subject) => {
    const chapters = bankChaptersForSubject(subject);
    for (const rotation of [0, 5, 11]) {
      __resetBankChaptersForTest();
      const q = await pickBoardTryQuestion({ subject, rotation });
      expect(q).not.toBeNull();
      const loaded = chapters.filter((s) => isBankChapterLoaded(s));
      expect(loaded.length).toBeLessThan(chapters.length);
      // The chapter the pick came from is loaded, and it is the LAST one the walk reached.
      const start = rotation % chapters.length;
      const walk = chapters.map((_, i) => chapters[(start + i) % chapters.length]);
      const reached = walk.slice(0, walk.findIndex((s) => !isBankChapterLoaded(s)));
      expect(new Set(reached)).toEqual(new Set(loaded));
      const last = reached[reached.length - 1];
      expect(getBankRows([last]).some((r) => String(r.id) === q!.id)).toBe(true);
      // every chapter passed over really had nothing to offer
      for (const s of reached.slice(0, -1)) {
        expect(chooseBoardTryRow(getBankRows([s]) as unknown as BoardTryRow[], new Set(), rotation)).toBeNull();
      }
    }
  }, 120_000);

  it("moves to the next chapter when every question of this one was already offered", async () => {
    const chapters = bankChaptersForSubject("Science");
    const first = await pickBoardTryQuestion({ subject: "Science", rotation: 0 });
    await ensureBankChapters(chapters);
    const sameChapter = chapters.find((s) => getBankRows([s]).some((r) => String(r.id) === first!.id))!;
    const offered = new Set(
      (getBankRows([sameChapter]) as unknown as BoardTryRow[]).map((r) => String(r.id)),
    );
    const next = await pickBoardTryQuestion({ subject: "Science", rotation: 0, exclude: offered });
    expect(next).not.toBeNull();
    expect(offered.has(next!.id)).toBe(false);
  }, 120_000);
});
