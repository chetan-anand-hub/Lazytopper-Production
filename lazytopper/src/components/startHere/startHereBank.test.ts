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
  isWrittenRow,
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
      const entry = START_HERE_AVAILABILITY[subject] as Record<string, { mcq: number; ar: number; written: number }>;
      for (const t of desktopTopicsBySubject(subject)) expect(entry[t.slug], `${subject}/${t.slug}`).toBeDefined();
      expect(Object.values(entry).some((c) => c.mcq >= 5)).toBe(true);
    }
  });
});

/**
 * START-HERE-WRITTEN - the third type: ONE Science CBQ short-answer (written) question, typed.
 * Science only (maths symbols are hard to type, owner ruling 16 Oct); a chapter with no written
 * CBQ item does not offer the type.
 */
describe("START-HERE-WRITTEN · one written Science CBQ", () => {
  it("Science / electricity: exactly ONE id, a CBQ short-answer row of this chapter with the bank's steps", async () => {
    await ensureBankSubject("Science");
    const ids = await pickStartHereSet({ subject: "Science", chapter: "electricity", qtype: "written", rotation: 1 });
    expect(ids).toHaveLength(1);
    const rows = startHereChapterRows("Science", "electricity") as Row[];
    const row = rows.find((r) => String(r.id) === ids[0]);
    expect(row, `${ids[0]} is a row of electricity`).toBeDefined();
    expect(isCbq(row as never)).toBe(true);
    expect(String(row!.subject).toLowerCase()).toBe("science");
    expect(isWrittenRow(row!)).toBe(true);
    expect(isFourOptionMcq(row!)).toBe(false);
    expect(isAssertionReasonRow(row!)).toBe(false);
    expect((row!.solutionSteps as unknown[]).length).toBeGreaterThan(0);
    // Same difficulty order as the MCQ set: no unchosen written row is harder than the chosen one.
    for (const r of rows.filter((x) => isWrittenRow(x))) expect(rank(r)).toBeGreaterThanOrEqual(rank(row!));
  });

  it("Maths offers NO written type: every Maths chapter counts 0 written (and the picker gets nothing)", async () => {
    const slugs = desktopTopicsBySubject("Maths").map((t) => t.slug);
    const avail = await startHereAvailability("Maths", slugs);
    for (const slug of slugs) {
      expect(avail[slug].written, slug).toBe(0);
      expect(typeOffered(avail[slug], "written")).toBe(false);
    }
    expect(await pickStartHereSet({ subject: "Maths", chapter: "real-numbers", qtype: "written", rotation: 1 })).toEqual([]);
  }, 120_000);

  it("a chapter with 0 written items does not offer the type; 1 is enough", () => {
    expect(typeOffered({ mcq: 20, ar: 10, written: 0 }, "written")).toBe(false);
    expect(typeOffered({ mcq: 20, ar: 10, written: 1 }, "written")).toBe(true);
    // CONTROL: MCQ / A-R still need a full five.
    expect(typeOffered({ mcq: 4, ar: 5, written: 3 }, "mcq")).toBe(false);
    expect(typeOffered({ mcq: 4, ar: 5, written: 3 }, "ar")).toBe(true);
  });

  it("the written predicate: Science CBQ Short / VSA with bank steps; never an MCQ, an A-R, a Maths row or a step-less row", () => {
    const w = (id: string, extra: Row = {}): Row => ({
      id, subject: "Science", competencyVerified: true, format: "Short", marks: 3, difficulty: "Hard",
      solutionSteps: ["step 1", "step 2"], ...extra,
    });
    expect(isWrittenRow(w("short"))).toBe(true);
    expect(isWrittenRow(w("vsa", { format: "VSA", marks: 2 }))).toBe(true);
    expect(isWrittenRow(w("maths", { subject: "Maths" }))).toBe(false);
    expect(isWrittenRow(w("nocbq", { competencyVerified: false }))).toBe(false);
    expect(isWrittenRow(w("nosteps", { solutionSteps: [] }))).toBe(false);
    expect(isWrittenRow(w("case", { format: "Case-Based", marks: 4 }))).toBe(false);
    expect(isWrittenRow(w("long", { format: "Long", marks: 5 }))).toBe(false);
    expect(isWrittenRow(w("mcq", { format: "MCQ", options: ["a", "b", "c", "d"], answer: "a" }))).toBe(false);
    expect(isWrittenRow(w("ar", { format: "Assertion-Reasoning" }))).toBe(false);
    expect(isWrittenRow(w("fig", { image: "fig.png" }))).toBe(false);
    // The types never mix.
    const rows = [w("short"), { id: "m", competencyVerified: true, difficulty: "Hard", options: ["a", "b", "c", "d"], answer: "a" }];
    expect(chooseStartHereIds(rows, "written", new Set(), 0)).toEqual(["short"]);
    expect(chooseStartHereIds(rows, "mcq", new Set(), 0)).toEqual(["m"]);
  });

  it("an unseen written question beats a seen one; Hard before Medium", () => {
    const w = (id: string, difficulty: string): Row => ({
      id, subject: "Science", competencyVerified: true, format: "Short", difficulty, solutionSteps: ["s"],
    });
    const rows = [w("m1", "Medium"), w("h1", "Hard"), w("h2", "Hard")];
    const first = chooseStartHereIds(rows, "written", new Set(), 0);
    expect(first).toHaveLength(1);
    expect(first[0].startsWith("h")).toBe(true);
    const next = chooseStartHereIds(rows, "written", new Set(first), 0);
    expect(next).toHaveLength(1);
    expect(next[0]).not.toBe(first[0]);
    expect(next[0].startsWith("h")).toBe(true);
  });
});
