// @vitest-environment jsdom
/**
 * ME-CONCEPT-1 (ME-ENGINE-1 PR-3) — THE CONCEPT-ROW PINS.
 *
 * The Concepts rung is re-keyed on read to (chapter, Exam Trends concept) through the app's ONE
 * resolver (`mistakeConcept.loadExamConceptResolvers` → `examConceptOf`, over the REAL reviewed
 * concept map); the per-concept mistakes and "won back" ride on the same rows, above Me's
 * weakness gate only; the Tutor brief names at most 3 of the chapter's weakest Exam Trends
 * concepts. Only the CLOUD streams and the bank id index are mocked (a fixture bank of SERVED
 * labels); progressStore, the read model, the concept map, Me and the brief are REAL.
 *
 * Mutations this file turns RED (each run once on the unfixed rule, see the PR report):
 *   U  — an unmapped label drops its row (or is renamed)          → "unmapped label kept"
 *   K  — the mapped row is keyed by the bank label alone          → "chapter-scoped key"
 *   R  — a re-grade / the same paper counts as won back           → won-back table, paper rows
 *   Q  — a re-answer of the SAME question counts as won back      → won-back table
 *   W  — a later different-question full mark is not won back    → won-back table
 *   G  — per-concept mistakes filled below Me's gate              → "below the gate names nothing"
 *   B  — the brief names raw labels / > 3 / a figure              → brief pins + Me == brief == model
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import type { PracticeAttempt } from "./practiceInsights";
import type { SessionRecord, SessionPerQuestionPayload } from "./sessionRecords";
import type { MistakeLogEntry } from "./mistakeLogService";

const DAY = 24 * 60 * 60 * 1000;
/** A FIXED clock (every read below passes it as `nowMs`), far from an IST midnight. */
const NOW = Date.UTC(2026, 9, 6, 6, 0);

const H = vi.hoisted(() => ({
  attempts: [] as PracticeAttempt[],
  records: [] as SessionRecord[],
  payloads: [] as SessionPerQuestionPayload[],
  mistakes: [] as MistakeLogEntry[],
  bank: {} as Record<string, { subtopic: string; section: string; topicKey: string }>,
}));

vi.mock("./practiceInsights", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./practiceInsights")>()),
  getAttemptsFromCloud: async (_uid: string, { start }: { start?: number } = {}) =>
    H.attempts.filter((a) => start === undefined || a.timestamp >= start),
}));
vi.mock("./sessionRecords", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./sessionRecords")>()),
  getSessionRecordsFromCloud: async () => H.records,
  getAllSessionPerQuestionFromCloud: async () => H.payloads,
}));
vi.mock("./mistakeLogService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./mistakeLogService")>()),
  getMistakeLogs: async () => [],
  getMistakeLogHistoryFromCloud: async (_uid: string, startMs: number) => ({
    entries: H.mistakes.filter((e) => Date.parse(e.timestamp) >= startMs),
    complete: true,
  }),
}));
vi.mock("./tutorSessionStore", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./tutorSessionStore")>()),
  getTutorTurnsFromCloud: async () => ({ events: [], complete: true }),
}));
vi.mock("./progressBankIndex", async () => {
  const shape = await import("./progressBankShape");
  return {
    ...shape,
    conceptForQuestionId: (id: string | null | undefined) => (id ? H.bank[String(id).trim()] ?? null : null),
  };
});

import { readStudyModel, weakestExamConcepts, type StudyReadModel } from "./progressReadModel";
import { getWindowedProgress } from "./progressStore";
import { loadExamConceptResolvers, type ExamConceptResolvers } from "./mistakeConcept";
import { CONCEPT_BY_LABEL } from "../data/concepts/conceptLabelMap";
import { assembleTutorBrief, briefFromModel } from "../pages/tutor/tutorContextBrief";
import { conceptMistakesNote } from "../pages/MeProgressPage";

const UID = "u-concept";
const RN = "real-numbers";
const FTA = "Fundamental Theorem of Arithmetic";
const IRR = "Irrationality Proofs";

/** Served Real Numbers labels: two roll up to FTA, one to Irrationality Proofs, one is unmapped. */
const MATHS_BANK = {
  "fta-1": { subtopic: "HCF and LCM", section: "B", topicKey: RN },
  "fta-2": { subtopic: "Prime Factorisation", section: "B", topicKey: RN },
  "irr-1": { subtopic: "Irrationality Proof", section: "C", topicKey: RN },
  "euc-1": { subtopic: "Euclid's division lemma", section: "A", topicKey: RN },
};

let resolvers: ExamConceptResolvers;
let seq = 0;

function attempt(questionId: string, daysAgo: number, scored: number, available = 4, topicKey = RN, subject = "maths"): PracticeAttempt {
  seq += 1;
  return {
    id: `a${seq}`,
    timestamp: NOW - daysAgo * DAY,
    subject,
    topicKey,
    topicName: topicKey,
    questionId,
    marksScored: scored,
    marksAvailable: available,
    correct: scored >= available,
    mode: "graded",
  } as unknown as PracticeAttempt;
}

/** Six graded answers on one question, part marks only (1/4 early, 3/4 late): a gated row, no
 *  fully-correct answer — so nothing is won back unless a case adds one. */
function sixOn(questionId: string, topicKey = RN, subject = "maths"): PracticeAttempt[] {
  return [25, 22, 19, 12, 9, 7].map((d, i) => attempt(questionId, d, i < 3 ? 1 : 3, 4, topicKey, subject));
}

function mistake(id: string, questionId: string | undefined, daysAgo: number, over: Partial<MistakeLogEntry> = {}): MistakeLogEntry {
  return {
    id,
    timestamp: new Date(NOW - daysAgo * DAY).toISOString(),
    questionText: "Q",
    topic: "Real Numbers",
    subject: "Maths",
    totalMarks: 4,
    marksLost: 2,
    mistakeCounts: { conceptual: 1, calculation: 0, silly: 0, presentation: 0 },
    stepDetails: [],
    ...(questionId ? { questionId } : {}),
    ...over,
  } as MistakeLogEntry;
}

function paper(worksheetId: string, daysAgo: number, questionIds: string[], marks: number[]): void {
  H.records.push({
    id: `WS-${worksheetId}`,
    worksheetId,
    surface: "worksheet",
    title: "Real Numbers",
    subject: "maths",
    topicKeys: [RN],
    questionIds,
    marksAwarded: marks.reduce((s, m) => s + m, 0),
    marksTotal: 4 * marks.length,
    status: "graded",
    fourType: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
    sectionBreakdown: null,
    gradedAt: NOW - daysAgo * DAY,
    perQuestionRef: `ws:${worksheetId}`,
    dedupKey: `${UID}::${worksheetId}`,
  } as unknown as SessionRecord);
  H.payloads.push({
    ref: `ws:${worksheetId}`,
    code: `ws:${worksheetId}`,
    worksheetId,
    surface: "worksheet",
    gradedAt: NOW - daysAgo * DAY,
    response: { results: marks.map((m, i) => ({ qNumber: i + 1, totalMarks: 4, marksAwarded: m })) } as unknown as SessionPerQuestionPayload["response"],
  });
}

/** The above-the-gate Maths student: three gated concept rows (FTA, Irrationality, Euclid). */
function richMaths(): void {
  H.bank = { ...MATHS_BANK };
  H.attempts = [...sixOn("fta-1"), ...sixOn("irr-1"), ...sixOn("euc-1")];
  H.records = [];
  H.payloads = [];
  H.mistakes = [];
}

async function mathsModel(): Promise<StudyReadModel> {
  return readStudyModel(UID, { window: "month", subject: "maths", tutor: false, nowMs: NOW });
}

beforeAll(async () => {
  resolvers = await loadExamConceptResolvers();
});

beforeEach(() => {
  seq = 0;
  richMaths();
});

describe("ME-CONCEPT-1 · the fixture labels resolve as the pins assume (preconditions, through the app's resolver)", () => {
  it("HCF and LCM / Prime Factorisation → FTA, Irrationality Proof → Irrationality Proofs, Euclid's division lemma → unmapped", () => {
    expect(resolvers.examConceptOf(MATHS_BANK["fta-1"])).toBe(FTA);
    expect(resolvers.examConceptOf(MATHS_BANK["fta-2"])).toBe(FTA);
    expect(resolvers.examConceptOf(MATHS_BANK["irr-1"])).toBe(IRR);
    expect(resolvers.examConceptOf(MATHS_BANK["euc-1"])).toBeUndefined();
  });
});

describe("ME-CONCEPT-1 · the concept rung is re-keyed to (chapter, Exam Trends concept)", () => {
  it("★ U — an UNMAPPED label keeps its subtopic row exactly as before (key = label = subtopic); mapped labels roll up", async () => {
    const m = await mathsModel();
    const byKey = new Map(m.progress.concepts.map((r) => [r.key, r]));
    expect([...byKey.keys()].sort()).toEqual([`${RN}|${FTA}`, `${RN}|${IRR}`, "Euclid's division lemma"].sort());
    expect(byKey.get("Euclid's division lemma")).toMatchObject({ label: "Euclid's division lemma", examConcept: false, chapter: RN });
    expect(byKey.get(`${RN}|${FTA}`)).toMatchObject({ label: FTA, examConcept: true, chapter: RN });
  });

  it("★ K — two chapters with the SAME bank label no longer merge (Corrosion: Chemical Reactions vs Metals)", async () => {
    const CRE = "chemical-reactions-and-equations";
    const MNM = "metals-and-non-metals";
    H.bank = {
      "cor-cre": { subtopic: "Corrosion", section: "B", topicKey: CRE },
      "cor-mnm": { subtopic: "Corrosion", section: "B", topicKey: MNM },
    };
    H.attempts = [...sixOn("cor-cre", CRE, "science"), ...sixOn("cor-mnm", MNM, "science")];
    const cre = resolvers.examConceptOf(H.bank["cor-cre"]);
    const mnm = resolvers.examConceptOf(H.bank["cor-mnm"]);
    expect(cre && mnm && cre !== mnm).toBe(true); // precondition: both mapped, to different concepts
    const wp = await getWindowedProgress(UID, "month", { subject: "science" }, NOW);
    expect(wp.concepts.map((r) => [r.key, r.label, r.chapter]).sort()).toEqual(
      [
        [`${CRE}|${cre}`, cre, CRE],
        [`${MNM}|${mnm}`, mnm, MNM],
      ].sort(),
    );
    expect(wp.concepts.every((r) => r.sampleBefore === 3 && r.sampleNow === 3)).toBe(true);
  });
});

/* ───────────── won back by concept — read-time, never writes resolvedAt ───────────── */

interface WonBackCase {
  name: string;
  /** Arrange the evidence; the mistake under test is returned. */
  arrange: () => MistakeLogEntry;
  wonBack: number;
}

const WON_BACK_CASES: WonBackCase[] = [
  {
    name: "no later answer at all → not won back",
    arrange: () => mistake("qp-1", "fta-1", 20),
    wonBack: 0,
  },
  {
    name: "★ Q — the SAME question later answered fully correct → not won back (question-level, unchanged)",
    arrange: () => {
      H.attempts.push(attempt("fta-1", 2, 4));
      return mistake("qp-1", "fta-1", 20);
    },
    wonBack: 0,
  },
  {
    name: "★ W — a DIFFERENT question of the same concept, later, fully correct, separate attempt → WON BACK",
    arrange: () => {
      H.attempts.push(attempt("fta-2", 2, 4));
      return mistake("qp-1", "fta-1", 20);
    },
    wonBack: 1,
  },
  {
    name: "a different question of the same concept fully correct but EARLIER → not won back",
    arrange: () => {
      H.attempts.push(attempt("fta-2", 24, 4));
      return mistake("qp-1", "fta-1", 20);
    },
    wonBack: 0,
  },
  {
    name: "a different question of the same concept later but only PART marks → not won back",
    arrange: () => {
      H.attempts.push(attempt("fta-2", 2, 3));
      return mistake("qp-1", "fta-1", 20);
    },
    wonBack: 0,
  },
  {
    name: "a question of ANOTHER concept later fully correct → not won back",
    arrange: () => {
      H.attempts.push(attempt("irr-1", 2, 4));
      return mistake("qp-1", "fta-1", 20);
    },
    wonBack: 0,
  },
  {
    name: "★ R — a paper re-graded later: q2 (same concept, different question) full marks IN THE SAME PAPER → not won back",
    arrange: () => {
      // The paper was answered 15 days ago; its grade was re-read 3 days ago (same worksheet).
      paper("ws-regrade", 3, ["fta-1", "fta-2"], [1, 4]);
      return mistake("ws-m1", "ws:ws-regrade:q1", 15);
    },
    wonBack: 0,
  },
  {
    name: "★ W — a LATER, SEPARATE paper with a different question of the concept fully correct → WON BACK",
    arrange: () => {
      paper("ws-first", 15, ["fta-1"], [1]);
      paper("ws-later", 3, ["fta-2"], [4]);
      return mistake("ws-m1", "ws:ws-first:q1", 15);
    },
    wonBack: 1,
  },
];

describe("ME-CONCEPT-1 · WON BACK by concept (owner rule: a later, different question, a separate attempt; re-grades never count)", () => {
  for (const c of WON_BACK_CASES) {
    it(c.name, async () => {
      const entry = c.arrange();
      H.mistakes = [entry];
      const before = JSON.stringify(entry);
      const m = await mathsModel();
      const row = m.mistakes.byConcept[`${RN}|${FTA}`];
      // Precondition: the mistake resolved (through its questionId) onto the FTA concept.
      expect(row, "the mistake must resolve to its concept").toBeDefined();
      expect(row.live).toBe(1);
      expect(row.wonBack.count).toBe(c.wonBack);
      expect(row.wonBack.marks).toBe(c.wonBack ? 2 : 0);
      // Read-time only: the entry is not written to (no resolvedAt, the stored label untouched).
      expect(JSON.stringify(entry)).toBe(before);
      expect(entry.resolvedAt).toBeUndefined();
    });
  }

  it("★ X — an UNMAPPED label shared by two chapters: a later fully-correct answer in the OTHER chapter does NOT win it back (verifier finding 1)", async () => {
    const LABEL = "Zq Shared Unmapped";
    H.bank["x-rn"] = { subtopic: LABEL, section: "B", topicKey: RN };
    H.bank["x-po"] = { subtopic: LABEL, section: "B", topicKey: "polynomials" };
    H.attempts.push(attempt("x-po", 2, 4, 4, "polynomials"));
    const entry = mistake("qp-x", "x-rn", 20);
    H.mistakes = [entry];
    const m = await mathsModel();
    const row = m.mistakes.byConcept[LABEL];
    expect(row, "the unmapped mistake keeps its subtopic row key").toBeDefined();
    expect(row.live).toBe(1);
    expect(row.wonBack.count).toBe(0);
    // control: the SAME chapter's later, different, fully-correct answer does win it back
    H.bank["x-rn2"] = { subtopic: LABEL, section: "B", topicKey: RN };
    H.attempts.push(attempt("x-rn2", 1, 4));
    const again = await mathsModel();
    expect(again.mistakes.byConcept[LABEL].wonBack.count).toBe(1);
  });

  it("a mistake resolved by a RE-GRADE is not live: it sits on no concept row and is never won back", async () => {
    H.attempts.push(attempt("fta-2", 2, 4));
    H.mistakes = [mistake("qp-r", "fta-1", 20, { resolvedAt: new Date(NOW - 19 * DAY).toISOString(), resolvedBy: "re-grade" })];
    const m = await mathsModel();
    expect(m.mistakes.byConcept).toEqual({});
  });
});

/* ───────────── the gate, the brief, and Me == brief == the model ───────────── */

describe("ME-CONCEPT-1 · ONE gate (Me's): below it nothing is named; above it Me == brief == the model", () => {
  it("★ G — below the gate (2 graded answers) the model fills no per-concept mistakes, no row carries any, the brief names nothing", async () => {
    H.attempts = [attempt("fta-1", 3, 0), attempt("fta-2", 2, 4)];
    H.mistakes = [mistake("qp-1", "fta-1", 3)];
    const m = await mathsModel();
    expect(m.mistakes.entries).toHaveLength(1); // precondition: the live mistake is there
    expect(m.mistakes.byConcept).toEqual({});
    expect(m.progress.concepts.some((r) => r.mistakes)).toBe(false);
    const brief = await assembleTutorBrief({ uid: UID, topicKey: RN, subject: "maths", window: "month", nowMs: NOW });
    expect(brief.topic.weakConcepts).toBeUndefined();
    // CONTROL — the same mistake ABOVE the gate is named (the gate is what withheld it).
    richMaths();
    H.mistakes = [mistake("qp-1", "fta-1", 3)];
    expect(Object.keys((await mathsModel()).mistakes.byConcept)).toEqual([`${RN}|${FTA}`]);
  });

  it("★ B — a mistake with only a stored label (no resolvable questionId) names NOTHING — never the raw label", async () => {
    H.mistakes = [
      mistake("legacy-1", undefined, 5, { concept: "HCF and LCM", marksLost: 3 }),
      mistake("ci-1", "ci:CODE:q1", 5, { concept: "HCF and LCM", marksLost: 3 }),
    ];
    const m = await mathsModel();
    expect(m.mistakes.entries).toHaveLength(2);
    expect(m.mistakes.byConcept).toEqual({});
    const brief = briefFromModel(m, RN);
    expect(brief.topic.weakConcepts).toBeUndefined();
  });

  it("★ B — the brief names at most 3 Exam Trends concepts, by marks not won back, never an unmapped label, never a figure", async () => {
    // A Maths chapter with 3 Exam Trends concepts (the most any chapter has today): one served
    // label per concept (picked from the reviewed map), plus one unmapped label that lost the MOST.
    const MATHS_CHAPTERS = ["trigonometry", "triangles", "circles", "statistics", "quadratic-equations", "polynomials"] as const;
    let AP = "";
    const picked = new Map<string, string>();
    for (const ch of MATHS_CHAPTERS) {
      picked.clear();
      for (const [label, concept] of Object.entries(CONCEPT_BY_LABEL[ch])) {
        if (typeof concept === "string" && ![...picked.values()].includes(concept)) picked.set(label, concept);
      }
      AP = ch;
      if (picked.size >= 3) break;
    }
    const labels = [...picked.keys()].slice(0, 3);
    expect(labels.length).toBe(3); // precondition: three distinct concepts
    H.bank = { ...MATHS_BANK, "ap-unmapped": { subtopic: "Euclid's division lemma", section: "A", topicKey: AP } };
    labels.forEach((label, i) => (H.bank[`ap-${i}`] = { subtopic: label, section: "B", topicKey: AP }));
    H.mistakes = [
      mistake("ap-u", "ap-unmapped", 4, { topic: AP, marksLost: 5 }),
      ...labels.map((_, i) => mistake(`ap-m${i}`, `ap-${i}`, 4, { topic: AP, marksLost: 4 - i * 0.5 })),
    ];
    const m = await mathsModel();
    const brief = briefFromModel(m, AP);
    const expected = labels.map((l) => picked.get(l)!);
    expect(brief.topic.weakConcepts).toEqual(expected);
    expect(brief.topic.weakConcepts).not.toContain("Euclid's division lemma");
    expect(JSON.stringify(brief.topic)).not.toMatch(/%|mastery|percent/i);
    for (const k of Object.keys(brief.topic)) expect(["trend", "weakConcepts"]).toContain(k);
  });

  it("★ B — the cap: of five weak Exam Trends concepts the brief's rule names the THREE that cost the most, by marks not won back", () => {
    const row = (label: string, marksLost: number, won = 0) => ({
      key: `${RN}|${label}`,
      label,
      chapter: RN,
      examConcept: true,
      live: 2,
      byType: { conceptual: 2, calculation: 0, silly: 0, presentation: 0 },
      marksLost,
      wonBack: { count: won ? 1 : 0, marks: won },
    });
    const byConcept = Object.fromEntries(
      [row("A", 2), row("B", 6, 5), row("C", 4), row("D", 3), row("E", 5), { ...row("U", 9), examConcept: false }].map((r) => [r.key, r]),
    );
    // B lost 6 but won 5 back (1 open) → behind A (2); the unmapped U is never named.
    expect(weakestExamConcepts({ byConcept }, RN)).toEqual(["E", "C", "D"]);
    expect(weakestExamConcepts({ byConcept }, RN, 3)).toHaveLength(3);
    expect(weakestExamConcepts({ byConcept }, "polynomials")).toEqual([]);
  });

  it("★ Me == brief == the model — the rows carry the model's per-concept objects, Me's note prints them, the brief names the model's weakest", async () => {
    H.attempts.push(attempt("fta-2", 2, 4)); // wins back the FTA mistake below
    H.mistakes = [
      mistake("qp-1", "fta-1", 20, { mistakeCounts: { conceptual: 1, calculation: 1, silly: 0, presentation: 0 } }),
      mistake("qp-2", "irr-1", 10, { marksLost: 3, mistakeCounts: { conceptual: 0, calculation: 0, silly: 2, presentation: 0 } }),
    ];
    const m = await mathsModel();
    const fta = m.progress.concepts.find((r) => r.key === `${RN}|${FTA}`)!;
    const irr = m.progress.concepts.find((r) => r.key === `${RN}|${IRR}`)!;
    // The model: the rows carry the SAME per-concept objects as `mistakes.byConcept`.
    expect(fta.mistakes).toEqual(m.mistakes.byConcept[fta.key]);
    expect(irr.mistakes).toEqual(m.mistakes.byConcept[irr.key]);
    expect(fta.mistakes).toMatchObject({ live: 1, byType: { conceptual: 1, calculation: 1 }, wonBack: { count: 1, marks: 2 } });
    expect(irr.mistakes).toMatchObject({ live: 1, byType: { silly: 2 }, wonBack: { count: 0, marks: 0 } });
    // Me's note for a row is those fields — counts, never a %.
    expect(conceptMistakesNote(fta.mistakes)).toBe("Concept gap 1 · Calculation slip 1 · 1 won back");
    expect(conceptMistakesNote(irr.mistakes)).toBe("Silly slip 2");
    expect(conceptMistakesNote(undefined)).toBeNull();

    // The brief: the model's weakest (FTA is fully won back, so only Irrationality Proofs remains).
    const brief = await assembleTutorBrief({ uid: UID, topicKey: RN, subject: "maths", window: "month", nowMs: NOW });
    expect(brief).toEqual(briefFromModel(m, RN));
    expect(brief.topic.weakConcepts).toEqual(weakestExamConcepts(m.mistakes, RN));
    expect(brief.topic.weakConcepts).toEqual([IRR]);
  });
});
