// @vitest-environment node
/**
 * BANK-STEPS-1 - one table-driven pin over the ledger (`BANK_STEPS_1`), read through the app's assembled data
 * (the raw bank, the served bank, the per-chapter loader, and the REAL chapter-test and worksheet generators).
 *
 * PR-1 PAUSE (this file's first version). For every ledger entry still `paused`:
 *   (a) the id exists in the raw bank, is in WITHHELD_QUESTION_IDS, and is not served by any assembled path;
 *   (b) with all of them withheld, each of the 26 topics still assembles a full chapter test (A6 / B4 / C3 / D2) and all three
 *       worksheet presets (Board mix 25, Quick drill 15 on A-B, High-marks focus 20 on C-E hard);
 *   (c) the number of `paused` entries equals the size of the BANK-STEPS-1 PAUSE block in canonicalQuestionBank.ts. This is the ONE
 *       place a source file is read: the block is a comment-delimited run of Set members, which no assembled structure exposes.
 * The ledger is generated from the scout CSV by script; ids are never typed by hand. This file never reads the clock.
 */
import "../../test/preloadBankChapters";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { RAW_CANONICAL_QUESTION_BANK, WITHHELD_QUESTION_IDS, canonicalQuestionBank } from "../canonicalQuestionBank";
import { selectBankQuestions } from "../bankQuery";
import { drawChapterTest, CT_BLUEPRINT, type CTSubject } from "../../components/chaptertest/chapterTestBlueprint";
import { generateFromPlan, getTopics, planWorksheet } from "../../components/worksheet/worksheetModel";
import { BANK_STEPS_1 } from "./bankSteps1Ledger";

type Row = { id: string; topicKey?: string };
const rawIds = new Set((RAW_CANONICAL_QUESTION_BANK as unknown as Row[]).map((q) => q.id));
const servedIds = new Set((canonicalQuestionBank as unknown as Row[]).map((q) => q.id));
const paused = BANK_STEPS_1.filter((e) => e.state === "paused");

const PAUSE_HEADER = "// BANK-STEPS-1 PAUSE";
const UNREPAIRABLE_HEADER = "// BANK-STEPS-1 UNREPAIRABLE";

describe("BANK-STEPS-1 ledger", () => {
  it("has unique ids, and every entry names a real row, a verdict and its evidence", () => {
    expect(new Set(BANK_STEPS_1.map((e) => e.id)).size).toBe(BANK_STEPS_1.length);
    expect(BANK_STEPS_1.filter((e) => !rawIds.has(e.id)).map((e) => e.id)).toEqual([]);
    expect(BANK_STEPS_1.filter((e) => !e.evidence.trim() || !e.file.trim()).map((e) => e.id)).toEqual([]);
    expect(BANK_STEPS_1.every((e) => e.verdict === "MISPAIRED" || e.verdict === "PARTIAL" || e.verdict === "NO-ANSWER" || e.verdict === "OVER-PAUSED" || e.verdict === "SINGLE-STEP" || e.verdict === "WRONG-CONTENT" || e.verdict === "TEXT-FAULT" || e.verdict === "WRONG-CHAPTER")).toBe(true);
    // HIDE8-FIG8-1 Part A (owner ruling 19 Oct 2026 07:08 IST): a WRONG-CHAPTER row is correct but misfiled and withheld (`paused`) until re-filed.
    expect(BANK_STEPS_1.filter((e) => e.verdict === "WRONG-CHAPTER").every((e) => e.state === "paused" || e.state === "repaired")).toBe(true);
    // a NO-ANSWER row is incomplete, not wrong (D143): it is logged `found` and stays served until its answer-fill PR.
    expect(BANK_STEPS_1.filter((e) => e.verdict === "NO-ANSWER").every((e) => e.state === "found" || e.state === "repaired" || e.state === "dropped")).toBe(true); // dropped: 2026-STAT-SA-03, unsolvable as printed (D170)
    // a SINGLE-STEP row (GARBLE-1, D159) is correct and served with one step: logged `found` until its chapter repair.
    expect(BANK_STEPS_1.filter((e) => e.verdict === "SINGLE-STEP").every((e) => e.state === "found" || e.state === "repaired" || e.state === "dropped" || e.state === "paused")).toBe(true);
    // GARBLE-1 FIND-3 (D189): a TEXT-FAULT row is correct science with a truncated/garbled text, served and ledgered `found` until its text-clean repair; a WRONG-CONTENT row is withheld (`paused`).
    expect(BANK_STEPS_1.filter((e) => e.verdict === "TEXT-FAULT").every((e) => e.state === "found" || e.state === "repaired")).toBe(true);
    expect(BANK_STEPS_1.filter((e) => e.verdict === "WRONG-CONTENT").every((e) => e.state === "paused" || e.state === "repaired")).toBe(true);
    expect(BANK_STEPS_1.filter((e) => e.verdict !== "NO-ANSWER" && e.verdict !== "SINGLE-STEP" && e.verdict !== "TEXT-FAULT").every((e) => e.state !== "found")).toBe(true);
  });

  it("(a) every paused id is withheld and is served by no path", () => {
    expect(paused.length).toBeGreaterThan(0);
    expect(paused.filter((e) => !WITHHELD_QUESTION_IDS.has(e.id)).map((e) => e.id)).toEqual([]);
    expect(paused.filter((e) => servedIds.has(e.id)).map((e) => e.id)).toEqual([]);
    const byChapter = new Map<string, string[]>();
    for (const e of paused) {
      const row = (RAW_CANONICAL_QUESTION_BANK as unknown as Row[]).find((q) => q.id === e.id);
      const key = String(row?.topicKey);
      byChapter.set(key, [...(byChapter.get(key) ?? []), e.id]);
    }
    for (const [topicKey, ids] of byChapter) {
      const served = new Set(selectBankQuestions({ topicKeys: [topicKey] }).map((q) => q.id));
      expect(ids.filter((id) => served.has(id)), topicKey).toEqual([]);
    }
  });

  it("a `found` id is NOT withheld: it is still served", () => {
    const found = BANK_STEPS_1.filter((e) => e.state === "found");
    expect(found.length).toBeGreaterThan(0);
    expect(found.filter((e) => WITHHELD_QUESTION_IDS.has(e.id) || !servedIds.has(e.id)).map((e) => e.id)).toEqual([]);
  });

  it("(c) the paused count equals the size of the PAUSE block", () => {
    const src = readFileSync(new URL("../canonicalQuestionBank.ts", import.meta.url), "utf8");
    const start = src.indexOf(PAUSE_HEADER);
    expect(start).toBeGreaterThan(-1);
    const setEnd = src.indexOf("\n]);", start);
    const tail = src.slice(start, setEnd);
    const next = tail.indexOf(UNREPAIRABLE_HEADER);
    const block = next === -1 ? tail : tail.slice(0, next);
    const ids = [...block.matchAll(/^\s*"([^"]+)",/gm)].map((m) => m[1]);
    expect(ids.length).toBe(paused.length);
    expect([...ids].sort()).toEqual(paused.map((e) => e.id).sort());
  });
});

describe("BANK-STEPS-1 supply - every topic still fills its tests with the paused rows withheld", () => {
  const topics = [
    ...getTopics("Maths").map((t) => ({ subject: "Maths" as CTSubject, ...t })),
    ...getTopics("Science").map((t) => ({ subject: "Science" as CTSubject, ...t })),
  ];

  it("covers all 26 topics", () => {
    expect(topics.length).toBe(26);
  });

  it.each(topics.map((t) => [t.key, t] as const))("%s: a full chapter test (A6/B4/C3/D2), on three seeds", (_key, t) => {
    for (const seed of [1, 2, 3]) {
      const d = drawChapterTest({ subject: t.subject, topicKey: t.key, topicLabel: t.label, worksheetId: `bs1-${t.key}-${seed}`, createdAt: "fixed", seed });
      expect(d.enoughQuestions, `${t.key} seed ${seed}`).toBe(true);
      for (const spec of CT_BLUEPRINT) {
        expect(d.blueprint.find((b) => b.section === spec.section)?.actualCount, `${t.key} ${spec.section}`).toBe(spec.targetCount);
      }
      expect(d.paper.questions.filter((q) => WITHHELD_QUESTION_IDS.has(q.id)).map((q) => q.id)).toEqual([]);
    }
  });

  const PRESETS = [
    { name: "Board mix", sections: undefined, difficulty: "All", requested: 25 },
    { name: "Quick drill", sections: ["A", "B"], difficulty: "All", requested: 15 },
    { name: "High-marks focus", sections: ["C", "D", "E"], difficulty: "Hard", requested: 20 },
  ] as const;

  it.each(topics.map((t) => [t.key, t] as const))("%s: all three worksheet presets deliver their full count", (_key, t) => {
    for (const p of PRESETS) {
      const plan = planWorksheet({
        subject: t.subject,
        scope: "topic",
        topics: [t],
        sections: p.sections ? [...p.sections] : undefined,
        difficulty: p.difficulty as never,
        requested: p.requested,
      });
      const qs = generateFromPlan(plan);
      expect(qs.length, `${t.key} ${p.name}`).toBe(p.requested);
      expect(qs.filter((q) => WITHHELD_QUESTION_IDS.has(String(q.id))).map((q) => q.id)).toEqual([]);
    }
  });
});
