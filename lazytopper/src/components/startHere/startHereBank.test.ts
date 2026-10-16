import { describe, it, expect } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { desktopTopicsBySubject } from "../../lib/desktop/topics";
import {
  START_HERE_SUBJECTS,
  computeStartHereAvailabilityMap,
  renderStartHereAvailabilityFile,
} from "./startHereAvailabilitySource";
import { START_HERE_AVAILABILITY } from "./startHereAvailability.generated";
import { ensureBankSubject } from "../../data/bankChapters/loader";
import { isCbq } from "../../lib/cbq/cbqClassification";
import { resolveCorrectOptionIndex } from "../../lib/objectiveScoring";
import {
  chooseStartHereIds,
  isAssertionReasonRow,
  isFourOptionMcq,
  pickStartHereSet,
  startHereAvailability,
  startHereChapterRows,
  typeOffered,
} from "./startHereBank";

/**
 * START-HERE-1 §2.3 — the five questions. Real bank rows, table-driven over two chapters (one
 * per subject): all `isCbq`, all MCQ with four written options whose key resolves, from the chosen
 * chapter, Hard before Medium, never Easy while five others exist, and a second run is not a repeat.
 */
const CHAPTERS = [
  { subject: "Maths", chapter: "real-numbers" },
  { subject: "Science", chapter: "electricity" },
] as const;

type Row = Record<string, unknown>;
const rank = (r: Row): number =>
  ({ hard: 0, medium: 1, easy: 2 })[String(r.canonicalDifficulty ?? r.difficulty ?? "").toLowerCase() as "hard"] ?? 1;

describe.each(CHAPTERS)("the five for $subject / $chapter", ({ subject, chapter }) => {
  it("★★ 5 distinct rows, all CBQ, all four-option MCQ (not A-R), from this chapter and subject", async () => {
    await ensureBankSubject(subject);
    const ids = await pickStartHereSet({ subject, chapter, qtype: "mcq", rotation: 1 });
    expect(ids).toHaveLength(5);
    expect(new Set(ids).size).toBe(5);
    const byId = new Map(startHereChapterRows(subject, chapter).map((r) => [String((r as Row).id), r as Row]));
    for (const id of ids) {
      const row = byId.get(id);
      expect(row, `${id} is a row of ${chapter}`).toBeDefined();
      expect(isCbq(row as never)).toBe(true);
      expect(String(row!.subject).toLowerCase()).toBe(subject.toLowerCase());
      const opts = (row!.options as string[]).map(String);
      expect(opts).toHaveLength(4);
      expect(resolveCorrectOptionIndex(row!.correctOption as string | undefined, row!.answer as string, opts)).toBeGreaterThanOrEqual(0);
      expect(isAssertionReasonRow(row!)).toBe(false);
    }
  });

  it("★ Hard before Medium, never Easy: no unchosen CBQ MCQ is harder than a chosen one", async () => {
    await ensureBankSubject(subject);
    const ids = await pickStartHereSet({ subject, chapter, qtype: "mcq", rotation: 1 });
    const rows = startHereChapterRows(subject, chapter) as Row[];
    const chosen = rows.filter((r) => ids.includes(String(r.id)));
    const pool = rows.filter((r) => isFourOptionMcq(r) && isCbq(r as never) && !isAssertionReasonRow(r));
    const worstChosen = Math.max(...chosen.map(rank));
    expect(worstChosen).toBeLessThan(2); // never Easy: the chapter has plenty of others
    for (const r of pool) {
      if (ids.includes(String(r.id))) continue;
      expect(rank(r)).toBeGreaterThanOrEqual(worstChosen);
    }
  });

  it("★★ a second run is not a repeat: the seen-set rotates the next five", async () => {
    await ensureBankSubject(subject);
    const first = await pickStartHereSet({ subject, chapter, qtype: "mcq", rotation: 1 });
    const rows = startHereChapterRows(subject, chapter) as Row[];
    const second = chooseStartHereIds(rows, "mcq", new Set(first), 2);
    expect(second).toHaveLength(5);
    expect(second.filter((id) => first.includes(id))).toEqual([]);
  });

  it("the Assertion-Reason type is offered only with a full set, and every row is A-R", async () => {
    await ensureBankSubject(subject);
    const avail = await startHereAvailability(subject, [chapter]);
    expect(typeOffered(avail[chapter], "mcq")).toBe(true);
    if (!typeOffered(avail[chapter], "ar")) return;
    const ids = await pickStartHereSet({ subject, chapter, qtype: "ar", rotation: 1 });
    expect(ids).toHaveLength(5);
    const byId = new Map((startHereChapterRows(subject, chapter) as Row[]).map((r) => [String(r.id), r]));
    for (const id of ids) expect(isAssertionReasonRow(byId.get(id)!)).toBe(true);
  });
});

describe("selection rules on synthetic rows", () => {
  const mcq = (id: string, difficulty: string, extra: Row = {}): Row => ({
    id, competencyVerified: true, difficulty, options: ["a", "b", "c", "d"], answer: "a", ...extra,
  });

  it("Easy is used only when the chapter has fewer than five others", () => {
    const rows = [mcq("h1", "Hard"), mcq("h2", "Hard"), mcq("m1", "Medium"), mcq("e1", "Easy"), mcq("e2", "Easy"), mcq("e3", "Easy")];
    const ids = chooseStartHereIds(rows, "mcq", new Set(), 0);
    expect(ids).toHaveLength(5);
    expect(ids.slice(0, 3).sort()).toEqual(["h1", "h2", "m1"]); // the non-Easy come first
    const withSix = [...rows, mcq("m2", "Medium"), mcq("m3", "Medium")];
    expect(chooseStartHereIds(withSix, "mcq", new Set(), 0).some((id) => id.startsWith("e"))).toBe(false);
  });

  it("Analysing / Evaluating lead within a difficulty; an unseen question beats a seen one", () => {
    const rows = [
      mcq("recall", "Hard", { bloomSkill: "Remembering" }),
      mcq("analyse", "Hard", { bloomSkill: "Analysing" }),
      mcq("evaluate", "Hard", { bloomSkill: "Evaluating" }),
      mcq("m1", "Medium"), mcq("m2", "Medium"), mcq("m3", "Medium"),
    ];
    const ids = chooseStartHereIds(rows, "mcq", new Set(), 0);
    expect(ids.slice(0, 2).sort()).toEqual(["analyse", "evaluate"]);
    const seen = chooseStartHereIds(rows, "mcq", new Set(["analyse"]), 0);
    expect(seen).toHaveLength(5);
    expect(seen).not.toContain("analyse"); // the seen one is pushed out by an unseen one
  });

  it("only CBQ, four-option, key-resolving MCQs qualify (non-CBQ, three options, an unresolved key do not)", () => {
    const rows = [
      mcq("ok", "Hard"),
      { ...mcq("nocbq", "Hard"), competencyVerified: false },
      { ...mcq("three", "Hard"), options: ["a", "b", "c"] },
      { ...mcq("nokey", "Hard"), answer: "zzz" },
    ];
    expect(chooseStartHereIds(rows, "mcq", new Set(), 0)).toEqual(["ok"]);
  });

  it("[P4] every Assertion-Reason spelling in the bank is read by the one predicate", () => {
    expect(isAssertionReasonRow({ questionType: "AssertionReason" })).toBe(true);
    expect(isAssertionReasonRow({ kind: "assertion-reason" })).toBe(true);
    expect(isAssertionReasonRow({ kind: "Assertion-Reasoning" })).toBe(true);
    expect(isAssertionReasonRow({ format: "Assertion-Reasoning" })).toBe(true);
    expect(isAssertionReasonRow({ format: "MCQ", questionType: "MCQ" })).toBe(false);
  });

  it("the two types never mix: an A-R row is not a Quick-5 row, and vice versa", () => {
    const rows = [mcq("plain", "Hard"), mcq("ar", "Hard", { format: "Assertion-Reasoning" })];
    expect(chooseStartHereIds(rows, "mcq", new Set(), 0)).toEqual(["plain"]);
    expect(chooseStartHereIds(rows, "ar", new Set(), 0)).toEqual(["ar"]);
  });
});

/**
 * QP-SCORECARD-2 D3 — the precomputed availability map can never drift from the bank.
 *
 * The Start-here card lists chapters / question types from startHereAvailability.generated.ts
 * (no bank download). This guard recomputes the map with the SAME runtime function over the
 * REAL bank and asserts the committed file is byte-identical to its rendering. A bank change
 * that moves any count fails here until `node scripts/generateStartHereAvailability.mjs --write`
 * is re-run (that script runs THIS file with START_HERE_AVAILABILITY_WRITE=1).
 */
const FILE = resolve(__dirname, "startHereAvailability.generated.ts");

describe("QP-SCORECARD-2 D3 · startHereAvailability.generated.ts equals the runtime computation", () => {
  it("★★ the committed file is exactly the rendering of the live-bank computation", async () => {
    const map = await computeStartHereAvailabilityMap();
    const text = renderStartHereAvailabilityFile(map);
    if (process.env.START_HERE_AVAILABILITY_WRITE === "1") writeFileSync(FILE, text, "utf8");
    const committed = readFileSync(FILE, "utf8").replace(/\r\n/g, "\n");
    expect(committed, "STALE: run `node scripts/generateStartHereAvailability.mjs --write`").toBe(text);
    // And the imported module carries the same numbers (not just the same text).
    expect(JSON.parse(JSON.stringify(START_HERE_AVAILABILITY))).toEqual(map);
  }, 120_000);

  it("every chapter the card lists has an entry, and at least one chapter per subject can host a set", () => {
    for (const subject of START_HERE_SUBJECTS) {
      const entry = START_HERE_AVAILABILITY[subject] as Record<string, { mcq: number; ar: number }>;
      for (const t of desktopTopicsBySubject(subject)) expect(entry[t.slug], `${subject}/${t.slug}`).toBeDefined();
      expect(Object.values(entry).some((c) => c.mcq >= 5)).toBe(true);
    }
  });
});
