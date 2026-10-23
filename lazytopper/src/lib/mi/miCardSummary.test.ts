// @vitest-environment jsdom
/**
 * MI-CONSISTENCY-1 — the ONE MI card's selector (lib/mi/miCardSummary). Pure over a read-model
 * snapshot; the card hosts (Home, phone Home, the sidebar) all render THIS output.
 */
import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from "vitest";
import { selectMiCard, selectMiCards, conceptGapsIn, MI_ROW_LABEL, MI_PRESENTATION_TIP } from "./miCardSummary";
import { buildMistakeView, buildStudyActivity, type StudyReadModel } from "../../services/progressReadModel";
import { emptyWindowed, type RungTrend } from "../../services/progressStore";
import type { MistakeLogEntry } from "../../services/mistakeLogService";
import { recordWrongAnswer, loadWrongAnswerLog } from "../../services/adaptivePracticeEngine";
import { recordAttempt } from "../../services/practiceInsights";
import { setActiveProgressUser } from "../../services/studentProgressStore";
import { MISTAKE_TYPE_LABEL, zeroMarksLost, type MarksLostByType } from "../mistakeDisplay";

const END = Date.UTC(2026, 9, 20, 6, 30);
const RANGE = { start: END - 30 * 86400000, end: END };
const CTX = { source: "home" as const, returnTo: "/" };

let n = 0;
// Stored subject strings vary ("Maths" / "Mathematics" / "science"): the selector reads the stored key.
function entry(subject: string, topic: string, m: Partial<MarksLostByType>): MistakeLogEntry {
  n += 1;
  const marks = { ...zeroMarksLost(), ...m };
  return {
    id: `e${n}`,
    timestamp: new Date(END - n * 3600000).toISOString(),
    questionText: `q${n}`,
    topic,
    subject,
    totalMarks: 5,
    marksLost: Object.values(marks).reduce((s, v) => s + v, 0),
    mistakeCounts: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
    stepDetails: [],
    marksLostByType: marks,
    marksLostByTypeVersion: 1,
  } as unknown as MistakeLogEntry;
}

interface Paper { available: number; scored: number; blank?: number; taps?: number; answers?: number }
function rung(key: "maths" | "science", p: Paper): RungTrend {
  return {
    key, label: key === "maths" ? "Maths" : "Science", before: 50, now: 50, delta: 0, sampleBefore: 3, sampleNow: 3, spanDays: 9,
    marksScored: p.scored, marksAvailable: p.available,
    ...(p.blank ? { marksNotAttempted: p.blank } : {}),
    ...(p.taps ? { marksWrongObjective: p.taps } : {}),
  };
}
function model(papers: Partial<Record<"maths" | "science", Paper | { answers: number; belowGate: true }>>, entries: MistakeLogEntry[]): StudyReadModel {
  const progress = emptyWindowed("month");
  for (const k of ["maths", "science"] as const) {
    const p = papers[k];
    if (!p) continue;
    if ("belowGate" in p) {
      progress.subjectTotals[k] = { marksScored: 1, marksAvailable: 2, marksLost: 1, marksNotAttempted: 0, answers: p.answers };
      continue;
    }
    progress.subjects.push(rung(k, p));
    progress.subjectTotals[k] = { marksScored: p.scored, marksAvailable: p.available, marksLost: p.available - p.scored, marksNotAttempted: p.blank ?? 0, answers: p.answers ?? 20 };
  }
  return {
    window: "month", subject: null, topicKey: null, range: RANGE, progress,
    mistakes: buildMistakeView(entries, RANGE, true),
    activity: buildStudyActivity(progress, [], RANGE, true),
  };
}
const sum = (rows: { marks: number }[]) => Math.round(rows.reduce((s, r) => s + r.marks, 0) * 10) / 10;
const row = (s: ReturnType<typeof selectMiCard>, key: string) => s.rows.find((r) => r.key === key)!.marks;

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(END);
});
afterAll(() => vi.useRealTimers());
beforeEach(() => {
  localStorage.clear();
  setActiveProgressUser("u-card");
});

describe("the owner's card: headline 101.5, typed 43.5, untyped 58 — the tiles add up", () => {
  // Maths only: 200 available, 98.5 scored → 101.5 lost; typed 43.5; 10 blank; 30 wrong taps;
  // and a v2 "reason not recorded" deduction — so the untyped 58 = 30 taps + 10 blank + 18 no reason.
  const m = () =>
    model({ maths: { available: 200, scored: 98.5, blank: 10, taps: 30 } }, [
      entry("Maths", "Real Numbers", { conceptual: 20 }),
      entry("Maths", "Polynomials", { calculation: 12.5 }),
      entry("Maths", "Polynomials", { silly: 6, untyped: 3 }),
      entry("Maths", "Real Numbers", { presentation: 5 }),
    ]);

  it("★ headline 101.5; the four types 43.5; taps 30 + blank 10 + no reason 18 = 58; seven tiles sum to 101.5", () => {
    const s = selectMiCard(m(), "maths", CTX, 0);
    expect(s.lost).toBe(101.5);
    expect(s.typed).toBe(43.5);
    expect(s.rows.map((r) => [r.label, r.marks])).toEqual([
      [MISTAKE_TYPE_LABEL.conceptual, 20],
      [MISTAKE_TYPE_LABEL.calculation, 12.5],
      [MISTAKE_TYPE_LABEL.silly, 6],
      [MISTAKE_TYPE_LABEL.presentation, 5],
      [MI_ROW_LABEL.wrongTap, 30],
      [MI_ROW_LABEL.blank, 10],
      [MI_ROW_LABEL.unrecorded, 18],
    ]);
    expect(sum(s.rows)).toBe(s.lost);
    expect(row(s, "wrongTap") + row(s, "blank") + row(s, "unrecorded")).toBe(58);
  });

  it("★ Both equals Maths when Science has no answers; Science alone is the honest empty state", () => {
    const cards = selectMiCards(m(), CTX);
    expect(cards.both.rows).toEqual(cards.maths.rows);
    expect(cards.both.lost).toBe(cards.maths.lost);
    expect(cards.science.state).toBe("empty");
    expect(cards.science.lost).toBe(0);
  });
});

describe("scope: Maths / Science by the stored subject key — Both is their exact sum", () => {
  const m = () =>
    model({ maths: { available: 40, scored: 30, taps: 2 }, science: { available: 30, scored: 20, blank: 1 } }, [
      entry("Maths", "Real Numbers", { conceptual: 3 }),
      entry("Mathematics", "Polynomials", { silly: 2 }),
      entry("Science", "Light – Reflection and Refraction", { presentation: 4, untyped: 1 }),
      entry("science", "Chemical Reactions and Equations", { calculation: 2 }),
    ]);

  it("★ a Science-only mistake never shows under Maths (and vice versa)", () => {
    const { maths, science } = selectMiCards(m(), CTX);
    expect(row(maths, "presentation")).toBe(0);
    expect(row(maths, "calculation")).toBe(0);
    expect(row(science, "conceptual")).toBe(0);
    expect(row(science, "silly")).toBe(0);
    expect(row(science, "presentation")).toBe(4);
  });

  it("★ every scope's tiles add up to its own headline, and Both = Maths + Science, tile by tile", () => {
    const cards = selectMiCards(m(), CTX);
    for (const s of Object.values(cards)) expect(sum(s.rows)).toBe(s.lost);
    expect(cards.both.lost).toBe(cards.maths.lost + cards.science.lost);
    cards.both.rows.forEach((r, i) => expect(r.marks).toBe(cards.maths.rows[i].marks + cards.science.rows[i].marks));
  });

  it("a paper below Me's gate is not counted, and the card says so (never named from two answers)", () => {
    const s = selectMiCard(model({ maths: { available: 40, scored: 30 }, science: { answers: 2, belowGate: true } }, [entry("Maths", "Real Numbers", { conceptual: 3 })]), "both", CTX, 0);
    expect(s.withheld).toEqual(["Science"]);
    expect(s.lost).toBe(10);
    const sci = selectMiCard(model({ science: { answers: 2, belowGate: true } }, []), "science", CTX, 0);
    expect(sci.state).toBe("thin");
  });
});

describe("wrong MCQ taps — clamped to Me's remainder (reviewer #1316)", () => {
  it("★ a Quick Practice card checked WITH working, then clicked wrong: the tap is clamped, the typed mark stays typed", () => {
    // The click and the checked answer share ONE attempt identity (latest wins = the mcq click), so
    // the rung names 1 wrong tap while the MI entry types that same mark conceptual. Remainder = 0.
    const s = selectMiCard(model({ maths: { available: 1, scored: 0, taps: 1 } }, [entry("Maths", "Real Numbers", { conceptual: 1 })]), "maths", CTX, 0);
    expect(row(s, "conceptual")).toBe(1);
    expect(row(s, "wrongTap")).toBe(0);
    expect(sum(s.rows)).toBe(s.lost);
  });

  it("★ a wrong MCQ WITH working that the grader typed counts under its type, never as a tap or 'no reason'", () => {
    const s = selectMiCard(model({ maths: { available: 2, scored: 1 } }, [entry("Maths", "Real Numbers", { silly: 1 })]), "maths", CTX, 0);
    expect(row(s, "silly")).toBe(1);
    expect(row(s, "wrongTap")).toBe(0);
    expect(row(s, "unrecorded")).toBe(0);
  });

  it("★ a question re-tapped after a checked answer is NOT a tap: another question's untyped marks stay 'No reason recorded'", () => {
    // q1: checked with working (typed conceptual 1), then re-tapped wrong in Quick Practice — the
    // pick and the typed entry share the question id. q2: a worksheet objective wrong, no reason.
    // The aggregate (1) would fit inside the remainder (1) and wrongly move q2's mark into taps.
    const m = model({ maths: { available: 2, scored: 0, taps: 1 } }, [{ ...entry("Maths", "Real Numbers", { conceptual: 1 }), questionId: "q1" } as MistakeLogEntry]);
    m.progress.wrongObjectiveEvidence = { maths: [{ qid: "q1", marks: 1 }] };
    const s = selectMiCard(m, "maths", CTX, 0);
    expect(row(s, "conceptual")).toBe(1);
    expect(row(s, "wrongTap")).toBe(0);
    expect(row(s, "unrecorded")).toBe(1);
    expect(sum(s.rows)).toBe(s.lost);
    // Control: the same pick on a question with NO typed entry is a tap.
    m.progress.wrongObjectiveEvidence = { maths: [{ qid: "q9", marks: 1 }] };
    expect(row(selectMiCard(m, "maths", CTX, 0), "wrongTap")).toBe(1);
  });

  it("a wrong tap WITHOUT working stays a tap; unattempted stays 'Left blank', never a mistake type", () => {
    const s = selectMiCard(model({ maths: { available: 3, scored: 0, taps: 1, blank: 2 } }, []), "maths", CTX, 0);
    expect(row(s, "wrongTap")).toBe(1);
    expect(row(s, "blank")).toBe(2);
    expect(s.typed).toBe(0);
  });
});

describe("Biggest chance to gain — the type with the most marks, with Me's own action", () => {
  it("★ concept gap → the chapter's targeted practice (Me's meChapterPractisePath)", () => {
    const s = selectMiCard(model({ maths: { available: 20, scored: 10 } }, [entry("Maths", "Real Numbers", { conceptual: 4 }), entry("Maths", "Polynomials", { silly: 3 })]), "maths", CTX, 0);
    expect(s.chance).toMatchObject({ type: "conceptual", amount: "4 marks", group: "knowledge" });
    expect(s.chance?.action).toEqual({
      kind: "practise",
      chapter: "Real Numbers",
      href: "/practice/10/Maths?topic=real-numbers&backLabel=Back+to+Real+Numbers&source=home&returnTo=%2F",
    });
  });

  it("★ careless (silly / calculation) → Me's 'Take these marks back' sheet, never the weak-area bridge", () => {
    const s = selectMiCard(model({ science: { available: 20, scored: 10 } }, [entry("Science", "Light – Reflection and Refraction", { silly: 5 }), entry("Science", "Light – Reflection and Refraction", { conceptual: 1 })]), "science", CTX, 0);
    expect(s.chance).toMatchObject({ type: "silly", amount: "5 marks", group: "careless" });
    expect(s.chance?.action).toEqual({
      kind: "slips",
      paper: "Science",
      worksheetHref: "/practice/worksheets?scope=full-subject&subject=Science&mistakeAware=1&source=home&returnTo=%2F",
      practiceHref: "/practice/10/Science?source=home&returnTo=%2F",
    });
  });

  it("presentation → Me's tip, no drill invented", () => {
    const s = selectMiCard(model({ maths: { available: 10, scored: 5 } }, [entry("Maths", "Real Numbers", { presentation: 2.5 })]), "maths", CTX, 0);
    expect(s.chance).toMatchObject({ type: "presentation", amount: "2.5 marks", action: { kind: "tip", text: MI_PRESENTATION_TIP } });
  });

  it("★ honest empty state: marks lost but no type named → no chance; nothing lost → no chance", () => {
    expect(selectMiCard(model({ maths: { available: 5, scored: 2, taps: 3 } }, []), "maths", CTX, 0).chance).toBeNull();
    expect(selectMiCard(model({ maths: { available: 5, scored: 5 } }, []), "maths", CTX, 0).chance).toBeNull();
  });

  it("a tie goes to the fixed type order (concept gap first)", () => {
    const s = selectMiCard(model({ maths: { available: 10, scored: 6 } }, [entry("Maths", "Polynomials", { calculation: 2 }), entry("Maths", "Real Numbers", { conceptual: 2 })]), "maths", CTX, 0);
    expect(s.chance?.type).toBe("conceptual");
  });
});

describe("Measure leg — concept gaps still to clear (all time, concept only, alias-proof)", () => {
  it("★ in scope by the chapter's paper; a clean, fully correct drill clears one while marks lost stays", () => {
    recordWrongAnswer("graded:real-numbers", "real-numbers", "real-numbers", "Medium", 2);
    recordWrongAnswer("graded:real-numbers", "real-numbers", "real-numbers", "Medium", 2);
    recordWrongAnswer("graded:light-reflection-and-refraction", "light-reflection-and-refraction", "light-reflection-and-refraction", "Medium");
    const m = model({ maths: { available: 10, scored: 6 } }, [entry("Maths", "Real Numbers", { conceptual: 4 })]);
    expect(conceptGapsIn("both")).toBe(3);
    expect(conceptGapsIn("maths")).toBe(2);
    expect(conceptGapsIn("science")).toBe(1);
    const before = selectMiCard(m, "maths", CTX);
    recordAttempt({ uid: "u-card" } as never, { subject: "Maths", topic: "Real Numbers", question: "clean drill", marksScored: 3, marksAvailable: 3, mode: "graded" });
    const after = selectMiCard(m, "maths", CTX);
    expect([before.conceptGaps, after.conceptGaps]).toEqual([2, 1]);
    expect(after.lost).toBe(before.lost);
  });

  it("a slug the registry cannot place counts only under Both — never guessed into a paper", () => {
    recordWrongAnswer("x", "not-a-chapter", "not-a-chapter", "Medium");
    expect(Object.keys(loadWrongAnswerLog().entries)).toHaveLength(1);
    expect([conceptGapsIn("both"), conceptGapsIn("maths"), conceptGapsIn("science")]).toEqual([1, 0, 0]);
  });
});
