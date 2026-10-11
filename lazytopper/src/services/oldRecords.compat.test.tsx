/**
 * G5 · SCORECARD-MI-1 — old stored records keep rendering, honestly.
 *
 * P13 (the stored record versions, read from code): every version below is a shape that is
 * ALREADY on students' devices / in Firestore. Old records are never converted; each must
 * render on every surface with NO error and NO invented marks — counts stay counts, labelled
 * as mistakes, and absent stays absent.
 *
 *   MI entry (mistakeLogService.ts MistakeLogEntry)
 *     v0  pre-MI-CONCEPT-1: no questionId / concept                     (random id)
 *     v1  MI-CONCEPT-1: + questionId, concept                            (random id)
 *     v2  SCORECARD-MI-1: same fields, a STABLE identity id, gradedAt time
 *     v-  a partial legacy doc with no stepDetails at all
 *     v3-marks  SCORECARD-MI-1 PR-2: + marksLostByType, marksLostByTypeVersion: 1 (GRADER-CORE-1 v2)
 *   Session record (sessionRecords.ts SessionRecord)
 *     v0  no topicSource, no topicCount       v1  + topicSource       v2  + topicCount
 *     v3  SCORECARD-MI-1 mixed paper: topicSource "mixed", topicKeys [], mixed title
 *   Per-question payload (aiClient.ts WorksheetGradeResponse)
 *     v0  no objective, no per-question topic, raw summary (types even on full marks)
 *     v1  + objective, topicSlug/topicLabel   v2  + topicSubject, counts already effective
 *     v3  SCORECARD-MI-1 PR-2 (GRADER-CORE-1 v2): + marksLostByType, rubric, "withdrawn" and
 *         "unattempted" steps, answerMismatch, objectiveResolved (an unread option, sent WITH
 *         couldNotRead:true — shown as "couldn't read this answer", controller ruling R3)
 *
 * PR-2 (B7) — a COUNT-ONLY record or payload (every version but the two v3s) never shows
 * "mark"/"marks" next to a group or a type and carries no marks attribute; a v3 payload / a
 * v3-marks entry shows MARKS, and those marks sum to its loss.
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import type { ReactNode } from "react";

// This file imports a pure helper (splitPaperMarks) from MeProgressPage, so the
// entitlementGating meta-guard treats it as rendering a gated page. Stub the gate
// the standard way. Nothing here renders the page itself.
vi.mock("../components/auth/RequireAuth", () => ({
  RequirePremium: ({ children }: { children: ReactNode }) => children,
  RequireAuth: ({ children }: { children: ReactNode }) => children,
}));

// The tutor brief's insight reads the MI log; only that READ is pointed at the entry under test.
const h = vi.hoisted(() => ({ logs: [] as unknown[] }));
vi.mock("./mistakeLogService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./mistakeLogService")>();
  return { ...actual, getMistakeLogs: vi.fn(async () => h.logs) };
});

import ResultsScorecard from "../components/results/ResultsScorecard";
import { storedCheckImproveScorecardVariant } from "../components/results/scorecardVariants";
import { CheckImproveGradedPrintDoc, buildCiCoaching } from "../components/checkimprove/CheckImproveGradedPrintDoc";
import { WorksheetGradedPrintDoc } from "../components/worksheet/WorksheetGradedPrintDoc";
import { buildGradedAnswersFromWorksheetResponse } from "./gradedAnswerAssembly";
import { splitPaperMarks } from "../pages/MeProgressPage";
import { getMistakeInsights, summarizeCareless } from "./mistakeInsightsService";
import { MARKS_BASIS_SUFFIX, describeBriefTopType, describeTopMistakeType } from "../pages/tutor/tutorContextBrief";
import {
  COULD_NOT_READ_COPY,
  MARKS_HEADING,
  MISTAKES_BY_KIND_HEADING,
  MISTAKE_TYPE_LABEL,
  RUBRIC_HEADING,
  UNREAD_OPTION_COPY,
  WITHDRAWN_HEADING,
  effectivePaperCounts,
  entryMarksLost,
  groupMarks,
  paperMarksLost,
  questionChipType,
} from "../lib/mistakeDisplay";
import type { SessionRecord } from "./sessionRecords";
import type { MistakeLogEntry } from "./mistakeLogService";
import type { WorksheetGradeResponse } from "../ai/aiClient";
import type { PersistedWorksheet } from "./worksheetSessionStore";

afterEach(() => cleanup());

/* ── P13 fixtures ─────────────────────────────────────────────────────────── */
const steps = [
  { stepNumber: 1, description: "Write x^2 + 2x = 0", studentWork: "x^2 + 2x = 0", status: "correct", marksAwarded: 1, marksDeducted: 0, teacherAnnotation: "", mistakeType: null, correctedWorking: null },
  { stepNumber: 2, description: "Find a_20", studentWork: "a_20 = 77", status: "incorrect", marksAwarded: 0, marksDeducted: 1, teacherAnnotation: "19 x 4 = 76", mistakeType: "calculation", correctedWorking: "a_20 = 79" },
  { stepNumber: 3, description: "Conclude", studentWork: "", status: "missing", marksAwarded: 0, marksDeducted: 1, teacherAnnotation: "", mistakeType: null, correctedWorking: null },
];
const RESPONSES: Record<string, WorksheetGradeResponse> = {
  v0: {
    ok: true,
    results: [
      { qNumber: 1, couldNotRead: false, totalMarks: 3, marksAwarded: 1, annotatedSteps: steps as never, mistakeSummary: { conceptual: 0, calculation: 1, silly: 0, presentation: 0 }, teacherNote: "" },
      { qNumber: 2, couldNotRead: false, totalMarks: 2, marksAwarded: 2, annotatedSteps: [], mistakeSummary: { conceptual: 1, calculation: 0, silly: 0, presentation: 1 }, teacherNote: "" },
      { qNumber: 3, couldNotRead: true, totalMarks: 2, note: "re-upload" },
    ],
    totalQuestions: 3, gradedCount: 2, pendingCount: 1, gradedMarksAwarded: 3, gradedMarksTotal: 5, worksheetTotalMarks: 7,
  },
  v1: {
    ok: true,
    results: [
      { qNumber: 1, couldNotRead: false, totalMarks: 1, marksAwarded: 1, objective: true, annotatedSteps: [], mistakeSummary: { conceptual: 1, calculation: 0, silly: 0, presentation: 0 }, topicSlug: "real-numbers", topicLabel: "Real Numbers", teacherNote: "" },
      { qNumber: 2, couldNotRead: false, totalMarks: 3, marksAwarded: 1, annotatedSteps: steps as never, mistakeSummary: { conceptual: 0, calculation: 1, silly: 0, presentation: 0 }, topicSlug: "electricity", topicLabel: "Electricity", teacherNote: "" },
    ],
    totalQuestions: 2, gradedCount: 2, pendingCount: 0, gradedMarksAwarded: 2, gradedMarksTotal: 4, worksheetTotalMarks: 4,
  },
  v2: {
    ok: true,
    results: [
      { qNumber: 1, couldNotRead: false, totalMarks: 3, marksAwarded: 1, annotatedSteps: steps as never, mistakeSummary: { conceptual: 0, calculation: 1, silly: 0, presentation: 0 }, topicSlug: "arithmetic-progression", topicLabel: "Arithmetic Progressions", topicSubject: "Maths", teacherNote: "" },
      { qNumber: 2, couldNotRead: false, totalMarks: 2, marksAwarded: 0, annotatedSteps: [steps[2]] as never, mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 }, topicSlug: "coordinate-geometry", topicLabel: "Coordinate Geometry", topicSubject: "Maths", teacherNote: "" },
    ],
    totalQuestions: 2, gradedCount: 2, pendingCount: 0, gradedMarksAwarded: 1, gradedMarksTotal: 5, worksheetTotalMarks: 5,
  },
  // PR-2 · GRADER-CORE-1 v2 (acceptsV2). Q1 an unread option as A's contract sends it
  // (couldNotRead:true + objectiveResolved:false — R3: shown as could-not-read), Q2 a crossed-out attempt + a rubric
  // + real mistakes, Q3 not attempted, Q4 an answer that does not match, Q5 a loss with no reason.
  // Graded loss = 5.5 (calculation 0.5 + presentation 1 + not attempted 3 + reason not recorded 1).
  v3: {
    ok: true,
    results: [
      { qNumber: 1, couldNotRead: true, totalMarks: 1, marksAwarded: 0, objective: true, note: "We could not read which option you chose.", answerMismatch: null, marksLostByType: { conceptual: 0, calculation: 0, silly: 0, presentation: 0, unattempted: 0, untyped: 0 }, rubric: null, objectiveResolved: false },
      {
        qNumber: 2, couldNotRead: false, totalMarks: 3, marksAwarded: 1.5, teacherNote: "",
        annotatedSteps: [
          { stepNumber: 1, description: "Crossed-out attempt", studentWork: "v = u + at so 20 = 5t", status: "withdrawn", marksAwarded: 0, marksDeducted: 0, teacherAnnotation: "", mistakeType: null, correctedWorking: null, part: null, marksAvailable: 0 },
          { stepNumber: 2, description: "Choose the equation of motion", studentWork: "v = u + at", status: "correct", marksAwarded: 1, marksDeducted: 0, teacherAnnotation: "", mistakeType: null, correctedWorking: null, part: null, marksAvailable: 1 },
          { stepNumber: 3, description: "Substitute and solve", studentWork: "20 = 4t, t = 4", status: "partial", marksAwarded: 0.5, marksDeducted: 0.5, teacherAnnotation: "20 / 4 = 5", mistakeType: "calculation", correctedWorking: "t = 5", part: null, marksAvailable: 1 },
          { stepNumber: 4, description: "State the time with its unit", studentWork: "t = 4", status: "incorrect", marksAwarded: 0, marksDeducted: 1, teacherAnnotation: "The unit is missing", mistakeType: "presentation", correctedWorking: "t = 5 s", part: null, marksAvailable: 1 },
        ] as never,
        mistakeSummary: { conceptual: 0, calculation: 1, silly: 0, presentation: 1 },
        answerMismatch: null,
        marksLostByType: { conceptual: 0, calculation: 0.5, silly: 0, presentation: 1, unattempted: 0, untyped: 0 },
        rubric: [{ point: "Chooses v = u + at", marks: 1 }, { point: "Substitutes and solves", marks: 1 }, { point: "States t = 5 s with the unit", marks: 1 }],
        objectiveResolved: null,
      },
      {
        qNumber: 3, couldNotRead: false, totalMarks: 3, marksAwarded: 0, teacherNote: "",
        annotatedSteps: [{ stepNumber: 1, description: "Answer", studentWork: "", status: "unattempted", marksAwarded: 0, marksDeducted: 3, teacherAnnotation: "", mistakeType: null, correctedWorking: null, part: null, marksAvailable: 3 }] as never,
        mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
        answerMismatch: null,
        marksLostByType: { conceptual: 0, calculation: 0, silly: 0, presentation: 0, unattempted: 3, untyped: 0 },
        rubric: null,
        objectiveResolved: null,
      },
      { qNumber: 4, couldNotRead: false, totalMarks: 1, marksAwarded: 0, annotatedSteps: [], mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 }, teacherNote: "", answerMismatch: true, marksLostByType: { conceptual: 0, calculation: 0, silly: 0, presentation: 0, unattempted: 0, untyped: 0 }, rubric: null, objectiveResolved: null },
      {
        qNumber: 5, couldNotRead: false, totalMarks: 3, marksAwarded: 2, teacherNote: "",
        annotatedSteps: [
          { stepNumber: 1, description: "Formula", studentWork: "R = V / I", status: "correct", marksAwarded: 1, marksDeducted: 0, teacherAnnotation: "", mistakeType: null, correctedWorking: null, part: null, marksAvailable: 1 },
          { stepNumber: 2, description: "Substitute", studentWork: "R = 6 / 2", status: "correct", marksAwarded: 1, marksDeducted: 0, teacherAnnotation: "", mistakeType: null, correctedWorking: null, part: null, marksAvailable: 1 },
          { stepNumber: 3, description: "Answer", studentWork: "R = 4", status: "incorrect", marksAwarded: 0, marksDeducted: 1, teacherAnnotation: "", mistakeType: null, correctedWorking: "R = 3 Ω", part: null, marksAvailable: 1 },
        ] as never,
        mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
        answerMismatch: null,
        marksLostByType: { conceptual: 0, calculation: 0, silly: 0, presentation: 0, unattempted: 0, untyped: 1 },
        rubric: null,
        objectiveResolved: null,
      },
    ] as never,
    totalQuestions: 5, gradedCount: 3, pendingCount: 2, gradedMarksAwarded: 3.5, gradedMarksTotal: 9, worksheetTotalMarks: 11,
  },
};
/** The payload versions that carry v2 MARKS (every other one is count-only). */
const MARKS_PAYLOADS = new Set(["v3"]);
const V3_LOSS = 5.5;
const baseRecord = {
  id: "CI-M-REAL-01", worksheetId: "ci:CI-M-REAL-01", surface: "check-improve", title: "Real Numbers · Paper #1", subject: "maths",
  topicKeys: ["real-numbers"], questionIds: [], marksAwarded: 3, marksTotal: 5, status: "partial",
  fourType: { conceptual: 1, calculation: 1, silly: 0, presentation: 1 }, sectionBreakdown: null, gradedAt: Date.UTC(2026, 6, 1), perQuestionRef: "ci:CI-M-REAL-01", dedupKey: "u::CI-M-REAL-01",
};
const RECORDS: Record<string, SessionRecord> = {
  v0: { ...baseRecord } as unknown as SessionRecord,
  v1: { ...baseRecord, topicSource: "inferred" } as unknown as SessionRecord,
  v2: { ...baseRecord, topicSource: "mixed", topicKeys: [], topicCount: 2 } as unknown as SessionRecord,
  v3: { ...baseRecord, topicSource: "mixed", topicKeys: [], topicCount: 10, title: "Maths + Science · 10 chapters · CI-M-REAL-01", marksAwarded: 15, marksTotal: 24 } as unknown as SessionRecord,
};
const entry = (over: Partial<MistakeLogEntry> & Record<string, unknown>): MistakeLogEntry =>
  ({
    id: "1759000000000-abc123", timestamp: "2026-09-01T10:00:00.000Z", questionText: "q", topic: "Real Numbers", subject: "Maths",
    totalMarks: 3, marksLost: 2, mistakeCounts: { conceptual: 0, calculation: 1, silly: 1, presentation: 0 },
    stepDetails: [{ stepNumber: 1, mistakeType: "calculation", marksDeducted: 1 }, { stepNumber: 2, mistakeType: "silly", marksDeducted: 0.5 }],
    ...over,
  }) as MistakeLogEntry;
const ENTRIES: Record<string, MistakeLogEntry> = {
  v0: entry({}),
  v1: entry({ questionId: "PYQ-M-REAL-001", concept: "Euclid's division lemma" }),
  v2: entry({ id: "check-improve__CI-M-REAL-01__ci:CI-M-REAL-01:q3", questionId: "ci:CI-M-REAL-01:q3" }),
  vPartial: entry({ stepDetails: undefined as never, mistakeCounts: { conceptual: 1, calculation: 0, silly: 0, presentation: 0 } }),
  // PR-2 — a v2 entry: its marks per bucket, VERSIONED (loss 3: knowledge 1, technique 0.5,
  // careless 0.5, not attempted 1).
  "v3-marks": entry({
    id: "check-improve::CI-M-REAL-02::ci:CI-M-REAL-02:q2", questionId: "ci:CI-M-REAL-02:q2", totalMarks: 5, marksLost: 3,
    mistakeCounts: { conceptual: 1, calculation: 1, silly: 0, presentation: 1 },
    stepDetails: [{ stepNumber: 1, mistakeType: "conceptual", marksDeducted: 1 }, { stepNumber: 2, mistakeType: "calculation", marksDeducted: 0.5 }, { stepNumber: 3, mistakeType: "presentation", marksDeducted: 0.5 }],
    marksLostByType: { conceptual: 1, calculation: 0.5, silly: 0, presentation: 0.5, unattempted: 1, untyped: 0 },
    marksLostByTypeVersion: 1,
  }),
};
const ws = {
  worksheetId: "ws-old", createdAt: "2026-07-01T00:00:00.000Z", title: "Old", subject: "Maths", grade: "10", sectionFilter: "All", totalMarks: 7,
  questions: [1, 2, 3].map((n) => ({ qNumber: n, id: `b-${n}`, subject: "Maths", topicKey: "real-numbers", topicLabel: "Real Numbers", section: n === 1 ? "A" : "C", marks: n === 1 ? 1 : 3, questionText: `Question ${n}` })),
} as unknown as PersistedWorksheet;

/** A number printed against a GROUP or TYPE must be a count of mistakes, never "marks". */
const INVENTED_MARKS = /(Knowledge gap|Exam technique|Careless|Concept gap|Calculation slip|Silly slip|Presentation)\s*·\s*\d+(\.\d+)?\s*marks?/i;
/** The same, with or without the "·" — a type row prints its label and its number side by side.
 *  No trailing \b on purpose: textContent runs adjacent blocks together ("Concept gap1 markMarks
 *  to gain…"), so a word boundary after "mark" would never be there to match. */
const INVENTED_MARKS_ANY = /(Knowledge gap|Exam technique|Careless|Concept gap|Calculation slip|Silly slip|Presentation)\s*(·\s*)?\d+(\.\d+)?\s*marks?/i;
/** Sum of every `data-marks` a container shows under `selector`. */
const marksIn = (c: Element, selector: string) => Array.from(c.querySelectorAll(selector)).reduce((s, e) => s + Number(e.getAttribute("data-marks")), 0);
/** A count-only render: nothing a student reads next to a group or a type says "mark(s)". */
function expectCountOnly(c: Element) {
  const text = c.textContent || "";
  expect(text).not.toMatch(INVENTED_MARKS);
  expect(text).not.toMatch(INVENTED_MARKS_ANY);
  expect(c.querySelectorAll("[data-marks]")).toHaveLength(0);
  for (const e of Array.from(c.querySelectorAll(".lt-sc__gsub, .lt-sc__ct, .lt-gp__chip, .lt-cigp__chip"))) {
    expect(e.textContent || "").not.toMatch(/\bmarks?\b/);
  }
}

describe("G5 · every stored record version renders on every surface, with no invented marks", () => {
  for (const [rv, record] of Object.entries(RECORDS)) {
    for (const [pv, response] of Object.entries({ none: null, ...RESPONSES })) {
      it(`stored C&I scorecard · record ${rv} × payload ${pv}`, () => {
        const variant = storedCheckImproveScorecardVariant(record, { gradedDateLabel: "1 Jul 2026", onDone: () => {}, response: response as WorksheetGradeResponse | null });
        const { baseElement: container } = render(<ResultsScorecard variant={variant} onClose={() => {}} />);
        const text = container.textContent || "";
        expect(text).toContain(`${record.marksAwarded}`);
        if (MARKS_PAYLOADS.has(pv)) {
          // a v2 payload is shown in MARKS (B7) — and those marks sum to its graded loss
          const block = container.querySelector('[data-testid="sc-marks-lost"]')!;
          expect(block).not.toBeNull();
          const rows = Array.from(container.querySelectorAll('[data-group="not-attempted"][data-marks], [data-group="untyped"][data-marks]')).filter((e) => !block.contains(e));
          const total = marksIn(block, "[data-marks]") + rows.reduce((s, e) => s + Number(e.getAttribute("data-marks")), 0);
          expect(total).toBeCloseTo(V3_LOSS, 9);
          expect(total).toBeCloseTo(paperMarksLost(RESPONSES[pv].results)!.lost, 9);
          expect(text).toContain(MARKS_HEADING);
          expect(text).not.toContain(MISTAKES_BY_KIND_HEADING);
          return;
        }
        expectCountOnly(container);
        // the stored counts render AS STORED (never converted): conceptual 1 → "1 mistake"
        expect(text).toContain("Knowledge gap · 1 mistake");
        expect(text).not.toContain(MARKS_HEADING);
      });
    }
  }

  for (const [pv, response] of Object.entries(RESPONSES)) {
    it(`both graded PDFs · payload ${pv}`, () => {
      const qs = response.results.map((r) => ({ ...r, totalMarks: r.totalMarks }));
      const ci = render(
        <CheckImproveGradedPrintDoc
          code="CI-OLD" name="Old" questions={qs as never} gradedMarksAwarded={response.gradedMarksAwarded} gradedMarksTotal={response.gradedMarksTotal}
          pendingCount={response.pendingCount}
          coaching={buildCiCoaching({ gradedMarksAwarded: response.gradedMarksAwarded, gradedMarksTotal: response.gradedMarksTotal, counts: effectivePaperCounts(response.results), pendingCount: response.pendingCount })}
        />,
      );
      const wsDoc = render(<WorksheetGradedPrintDoc ws={ws} response={response} name="Old" code="WS-OLD" coaching="" />);
      for (const [c, chipsId] of [[ci.container, "cigp-marks-chips"], [wsDoc.container, "gp-marks-chips"]] as const) {
        const text = c.textContent || "";
        if (MARKS_PAYLOADS.has(pv)) {
          // v2: the header chips are MARKS and sum to the graded loss; the crossed-out work and
          // the rubric are shown apart; each question that was not graded says so
          const chips = c.querySelector(`[data-testid="${chipsId}"]`)!;
          expect(chips).not.toBeNull();
          expect(marksIn(chips, "[data-marks]")).toBeCloseTo(V3_LOSS, 9);
          expect(c.querySelector('[data-testid="grade-withdrawn"]')?.textContent).toContain(WITHDRAWN_HEADING);
          expect(c.querySelector('[data-testid="grade-rubric"]')?.textContent).toContain(RUBRIC_HEADING);
          expect(c.querySelector('[data-grade-state="answer-mismatch"]')).not.toBeNull();
          // R3 — couldNotRead always wins: Q1 (couldNotRead + objectiveResolved:false) says
          // "retake the photo", never "couldn't read your option"
          expect(c.querySelector('[data-grade-state="could-not-read"]')?.textContent).toContain(COULD_NOT_READ_COPY);
          expect(c.querySelector('[data-grade-state="unread-option"]')).toBeNull();
          expect(text).not.toContain(UNREAD_OPTION_COPY);
        } else {
          expectCountOnly(c);
        }
        expect(text).not.toMatch(/clean (work|sheet)/i);
        // GA-40 — maths through the shared renderer: never the raw `x^2` / `a_20`
        expect(text).not.toMatch(/x\^2|a_20/);
      }
      // a "missing" step reads Not attempted, wherever it appears
      if (JSON.stringify(response).includes('"missing"')) {
        expect(ci.container.textContent).toContain("Not attempted");
      }
    });
  }

  for (const [ev, e] of Object.entries(ENTRIES)) {
    it(`Me / the easy-marks card / the tutor brief read MI entry ${ev} without inventing marks`, async () => {
      const split = splitPaperMarks({ key: "maths", label: "Maths", marksAvailable: 10, marksScored: 6 } as never, [e]);
      expect(split).not.toBeNull();
      const fromSteps = (e.stepDetails ?? []).reduce((s, d) => s + (Number(d.marksDeducted) || 0), 0);
      const v2 = entryMarksLost(e);
      if (v2) {
        // a v3-marks entry is split by ITS marks, grouped by the owner's ruling, summing to its loss
        const g = groupMarks(v2);
        expect([split!.knowledge, split!.technique, split!.careless, split!.notAttempted]).toEqual([g.knowledge, g.technique, g.careless, g.notAttempted]);
        expect(g.knowledge + g.technique + g.careless + g.notAttempted + g.untyped).toBeCloseTo(e.marksLost, 9);
        expect(split!.splitKnown).toBe(true);
      } else {
        // every attributed mark comes from a step deduction that is ON the entry — nothing else
        expect(split!.knowledge + split!.technique + split!.careless).toBeCloseTo(Math.min(fromSteps, split!.lost), 5);
        // a count-only entry is never given a not-attempted figure
        expect(split!.notAttempted).toBe(0);
      }
      expect(split!.unclassified).toBeCloseTo(split!.lost - (split!.knowledge + split!.technique + split!.careless + split!.notAttempted), 5);
      const careless = summarizeCareless([e]);
      expect(careless.marksLost).toBeLessThanOrEqual(fromSteps);
      expect(describeTopMistakeType("silly")).toBe("careless (silly slip)");
      // the tutor brief's top type, exactly as assembleTutorBrief builds it from the insight
      h.logs = [e];
      const ins = await getMistakeInsights("g5-student", 14);
      const top = describeBriefTopType(ins.topMistakeType, ins.topMistakeBasis);
      if (v2) {
        expect(ins.topMistakeBasis).toBe("marks");
        expect(ins.marksLostByType).toEqual(v2);
        expect(top).toBe(`knowledge gap (concept gap)${MARKS_BASIS_SUFFIX}`);
      } else {
        expect(ins.marksLostByType).toBeNull();
        expect(ins.topMistakeBasis).not.toBe("marks");
        expect(top).not.toMatch(/\bmarks?\b/);
      }
    });
  }
});

describe("GA-34 — the screen and the PDF name ONE type per question, with ONE name", () => {
  it("the graded-sheet chip and the worksheet PDF tag agree for every payload version", () => {
    for (const response of Object.values(RESPONSES)) {
      const answers = buildGradedAnswersFromWorksheetResponse(response);
      const { container } = render(<WorksheetGradedPrintDoc ws={ws} response={response} name="x" code="y" coaching="" />);
      const tags = Array.from(container.querySelectorAll(".lt-gp__tag")).map((t) => t.textContent);
      const chips = answers.map((a) => a.mistakeType).filter(Boolean);
      expect(tags).toEqual(chips);
      for (const r of response.results) {
        const t = questionChipType(r);
        if (t) expect(chips).toContain(MISTAKE_TYPE_LABEL[t]);
      }
      cleanup();
    }
  });
});
