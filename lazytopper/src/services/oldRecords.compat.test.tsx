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
 *   Session record (sessionRecords.ts SessionRecord)
 *     v0  no topicSource, no topicCount       v1  + topicSource       v2  + topicCount
 *     v3  SCORECARD-MI-1 mixed paper: topicSource "mixed", topicKeys [], mixed title
 *   Per-question payload (aiClient.ts WorksheetGradeResponse)
 *     v0  no objective, no per-question topic, raw summary (types even on full marks)
 *     v1  + objective, topicSlug/topicLabel   v2  + topicSubject, counts already effective
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import ResultsScorecard from "../components/results/ResultsScorecard";
import { storedCheckImproveScorecardVariant } from "../components/results/scorecardVariants";
import { CheckImproveGradedPrintDoc, buildCiCoaching } from "../components/checkimprove/CheckImproveGradedPrintDoc";
import { WorksheetGradedPrintDoc } from "../components/worksheet/WorksheetGradedPrintDoc";
import { buildGradedAnswersFromWorksheetResponse } from "./gradedAnswerAssembly";
import { splitPaperMarks } from "../pages/MeProgressPage";
import { summarizeCareless } from "./mistakeInsightsService";
import { describeTopMistakeType } from "../pages/tutor/tutorContextBrief";
import { MISTAKE_TYPE_LABEL, effectivePaperCounts, questionChipType } from "../lib/mistakeDisplay";
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
};
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
};
const ws = {
  worksheetId: "ws-old", createdAt: "2026-07-01T00:00:00.000Z", title: "Old", subject: "Maths", grade: "10", sectionFilter: "All", totalMarks: 7,
  questions: [1, 2, 3].map((n) => ({ qNumber: n, id: `b-${n}`, subject: "Maths", topicKey: "real-numbers", topicLabel: "Real Numbers", section: n === 1 ? "A" : "C", marks: n === 1 ? 1 : 3, questionText: `Question ${n}` })),
} as unknown as PersistedWorksheet;

/** A number printed against a GROUP or TYPE must be a count of mistakes, never "marks". */
const INVENTED_MARKS = /(Knowledge gap|Exam technique|Careless|Concept gap|Calculation slip|Silly slip|Presentation)\s*·\s*\d+(\.\d+)?\s*marks?/i;

describe("G5 · every stored record version renders on every surface, with no invented marks", () => {
  for (const [rv, record] of Object.entries(RECORDS)) {
    for (const [pv, response] of Object.entries({ none: null, ...RESPONSES })) {
      it(`stored C&I scorecard · record ${rv} × payload ${pv}`, () => {
        const variant = storedCheckImproveScorecardVariant(record, { gradedDateLabel: "1 Jul 2026", onDone: () => {}, response: response as WorksheetGradeResponse | null });
        const { container } = render(<ResultsScorecard variant={variant} onClose={() => {}} />);
        const text = container.textContent || "";
        expect(text).toContain(`${record.marksAwarded}`);
        expect(text).not.toMatch(INVENTED_MARKS);
        // the stored counts render AS STORED (never converted): conceptual 1 → "1 mistake"
        expect(text).toContain("Knowledge gap · 1 mistake");
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
      for (const c of [ci.container, wsDoc.container]) {
        const text = c.textContent || "";
        expect(text).not.toMatch(INVENTED_MARKS);
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
    it(`Me / the easy-marks card / the tutor brief read MI entry ${ev} without inventing marks`, () => {
      const split = splitPaperMarks({ key: "maths", label: "Maths", marksAvailable: 10, marksScored: 6 } as never, [e]);
      expect(split).not.toBeNull();
      // every attributed mark comes from a step deduction that is ON the entry — nothing else
      const fromSteps = (e.stepDetails ?? []).reduce((s, d) => s + (Number(d.marksDeducted) || 0), 0);
      expect(split!.knowledge + split!.technique + split!.careless).toBeCloseTo(Math.min(fromSteps, split!.lost), 5);
      expect(split!.unclassified).toBeCloseTo(split!.lost - (split!.knowledge + split!.technique + split!.careless), 5);
      const careless = summarizeCareless([e]);
      expect(careless.marksLost).toBeLessThanOrEqual(fromSteps);
      expect(describeTopMistakeType("silly")).toBe("careless (silly slip)");
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
