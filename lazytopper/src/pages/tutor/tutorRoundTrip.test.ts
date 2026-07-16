import { describe, it, expect } from "vitest";
import {
  buildQuickPracticeRoundTripHref,
  matchReturningAttempts,
  matchReturningPracticeRecord,
  composePracticeReturnOpener,
  composePracticeRecordReturnOpener,
} from "./tutorRoundTrip";
import type { TutorPendingMarker } from "../../services/tutorSessionStore";
import type { PracticeAttempt } from "../../services/practiceInsights";
import type { SessionRecord, SessionPerQuestionPayload } from "../../services/sessionRecords";
import type { CheckSolutionAnnotatedStep } from "../../ai/aiClient";

const marker = (over: Partial<TutorPendingMarker> = {}): TutorPendingMarker => ({
  surface: "practice",
  topicKey: "trigonometry",
  departureTs: 1000,
  ...over,
});

const attempt = (over: Partial<PracticeAttempt> = {}): PracticeAttempt => ({
  id: "a1",
  questionId: "q1",
  topicKey: "trigonometry",
  subject: "maths",
  difficulty: "Medium",
  correct: true,
  timestamp: 2000,
  ...over,
});

describe("buildQuickPracticeRoundTripHref — Fix 1: routes to Quick Practice, not the worksheet builder", () => {
  it("builds /practice/:grade/:subject (NOT /practice/worksheets) with the concept focus", () => {
    const href = buildQuickPracticeRoundTripHref({
      returnTo: "/tutor/10/Maths/trigonometry",
      subject: "maths",
      topicKey: "trigonometry",
      concept: "Heights & distances",
    });
    expect(href).toContain("/practice/10/Maths?");
    expect(href).not.toContain("/practice/worksheets");
    expect(href).toContain("topic=trigonometry");
    expect(href).toContain("focus=Heights+%26+distances");
    expect(href).toContain("subtopicHint=Heights+%26+distances");
    expect(href).toContain("source=tutor");
    expect(href).toContain("returnTo=%2Ftutor%2F10%2FMaths%2Ftrigonometry");
  });

  it("carries NO mark-band (D-TUT-7: the missed concept, not a mark filter)", () => {
    const href = buildQuickPracticeRoundTripHref({
      returnTo: "/x",
      subject: "science",
      topicKey: "life-processes",
    });
    expect(href).toContain("/practice/10/Science?");
    expect(href).not.toContain("marksMin");
    expect(href).not.toContain("marksMax");
  });
});

describe("matchReturningAttempts — Fix 1: practiceInsights return detection", () => {
  const slugMatches = (a: string, b: string) => a === b;

  it("keeps only attempts after departure with a matching canonical topicKey", () => {
    const attempts = [
      attempt({ id: "before", timestamp: 500 }), // pre-departure
      attempt({ id: "other", topicKey: "polynomials", timestamp: 3000 }), // wrong topic
      attempt({ id: "hit", timestamp: 3000 }), // kept
    ];
    const out = matchReturningAttempts(attempts, marker(), slugMatches);
    expect(out.map((a) => a.id)).toEqual(["hit"]);
  });

  it("returns [] when nothing matches (banner stays actionable, never a false opener)", () => {
    expect(matchReturningAttempts([attempt({ timestamp: 500 })], marker(), slugMatches)).toEqual([]);
  });
});

describe("composePracticeReturnOpener — Fix 1: honest, no invented method/presentation split", () => {
  it("celebrates a clean set", () => {
    const opener = composePracticeReturnOpener([attempt(), attempt({ id: "a2" })], "Trigonometry");
    expect(opener.text).toContain("2 out of 2");
    expect(opener.follow?.send).toMatch(/harder/i);
  });

  it("names the misses without fabricating a root cause", () => {
    const opener = composePracticeReturnOpener(
      [attempt(), attempt({ id: "a2", correct: false })],
      "Trigonometry",
    );
    expect(opener.text).toContain("1 of 2");
    expect(opener.text).toMatch(/slipped/i);
    // No fourType language — that split belongs to the grader (C&I), not Practice.
    expect(opener.text).not.toMatch(/presentation|conceptual|calculation/i);
  });
});

// ── The QP graded-record leg (this FU) ───────────────────────────────────────

const qpRecord = (over: Partial<SessionRecord> = {}): SessionRecord => ({
  id: "QP-TRIG-01",
  worksheetId: "qp:QP-TRIG-01",
  surface: "quick-practice",
  title: "Trigonometry · Practice set",
  subject: "maths",
  topicKeys: ["trigonometry"],
  questionIds: ["q1", "q2"],
  marksAwarded: 3,
  marksTotal: 5,
  status: "graded",
  fourType: { conceptual: 0, calculation: 1, silly: 0, presentation: 0 },
  sectionBreakdown: null,
  gradedAt: 2000,
  perQuestionRef: "qp:QP-TRIG-01",
  dedupKey: "uid::QP-TRIG-01",
  ...over,
});

const step = (over: Partial<CheckSolutionAnnotatedStep> = {}): CheckSolutionAnnotatedStep => ({
  stepNumber: 2,
  description: "Substitute into the identity",
  studentWork: "sin^2 t + cos^2 t = 2",
  status: "incorrect",
  marksAwarded: 0,
  marksDeducted: 1,
  teacherAnnotation: "The identity equals 1, not 2.",
  mistakeType: "calculation",
  correctedWorking: "sin^2 t + cos^2 t = 1",
  ...over,
});

const payload = (steps: CheckSolutionAnnotatedStep[] | null): SessionPerQuestionPayload => ({
  ref: "qp:QP-TRIG-01",
  code: "QP-TRIG-01",
  worksheetId: "qp:QP-TRIG-01",
  surface: "quick-practice",
  gradedAt: 2000,
  response: {
    ok: true,
    results: [
      {
        qNumber: 1,
        couldNotRead: false,
        ok: true,
        totalMarks: 3,
        marksAwarded: 2,
        percentage: 67,
        ...(steps ? { annotatedSteps: steps } : {}),
        mistakeSummary: { conceptual: 0, calculation: 1, silly: 0, presentation: 0 },
      },
    ],
    totalQuestions: 2,
    gradedCount: 1,
    pendingCount: 0,
    gradedMarksAwarded: 3,
    gradedMarksTotal: 5,
    worksheetTotalMarks: 5,
  },
});

describe("matchReturningPracticeRecord — the surface-string map + canonical topic match", () => {
  const slugMatches = (a: string, b: string) => a === b;

  it("matches a 'quick-practice' RECORD against a 'practice' MARKER (the two vocabularies)", () => {
    const out = matchReturningPracticeRecord([qpRecord()], marker(), slugMatches);
    expect(out?.id).toBe("QP-TRIG-01");
  });

  it("never matches a record from another surface", () => {
    const ci = qpRecord({ id: "CI-1", surface: "check-improve" });
    expect(matchReturningPracticeRecord([ci], marker(), slugMatches)).toBeNull();
  });

  it("compares topics THROUGH the slug matcher, not raw includes ([FU-PROG-TOPIC-KEY-MISMATCH])", () => {
    // The record stores a canonical slug; the marker carries the tutor's key. A raw
    // `includes` would miss this — the matcher must be consulted.
    const loose = (a: string, b: string) => a.toLowerCase() === b.toLowerCase().replace(/\s+/g, "-");
    const out = matchReturningPracticeRecord([qpRecord()], marker({ topicKey: "Trigonometry" }), loose);
    expect(out?.id).toBe("QP-TRIG-01");
  });

  it("ignores records graded BEFORE departure, and takes the newest after it", () => {
    const stale = qpRecord({ id: "old", gradedAt: 500 });
    const newer = qpRecord({ id: "newest", gradedAt: 9000 });
    const out = matchReturningPracticeRecord([stale, qpRecord(), newer], marker(), slugMatches);
    expect(out?.id).toBe("newest");
  });

  it("does NOT treat empty topicKeys as a wildcard (a guess is not a match)", () => {
    expect(matchReturningPracticeRecord([qpRecord({ topicKeys: [] })], marker(), slugMatches)).toBeNull();
  });

  it("returns null for a non-practice marker (the C&I leg owns those)", () => {
    expect(
      matchReturningPracticeRecord([qpRecord()], marker({ surface: "check-improve" }), slugMatches),
    ).toBeNull();
  });
});

describe("composePracticeRecordReturnOpener — real step detail, never invented", () => {
  it("names the marks AND the specific step, quoting the grader's own annotation", () => {
    const opener = composePracticeRecordReturnOpener(qpRecord(), payload([step()]), "Trigonometry");
    expect(opener).not.toBeNull();
    expect(opener!.text).toContain("3 out of 5");
    expect(opener!.text).toContain("step 2");
    expect(opener!.text).toContain("Substitute into the identity");
    expect(opener!.text).toContain("The identity equals 1, not 2.");
    // calculation-led -> the arithmetic framing, not a method rewrite.
    expect(opener!.text).toMatch(/arithmetic/i);
    expect(opener!.follow?.send).toContain("step 2");
  });

  it("picks the FIRST non-correct step and skips correct ones", () => {
    const steps = [
      step({ stepNumber: 1, status: "correct", teacherAnnotation: "Good." }),
      step({ stepNumber: 2, status: "incorrect", description: "The turn", teacherAnnotation: "Here." }),
    ];
    const opener = composePracticeRecordReturnOpener(qpRecord(), payload(steps), "Trigonometry");
    expect(opener!.text).toContain("The turn");
    expect(opener!.text).not.toContain("Good.");
  });

  it("skips a non-correct step that carries NO annotation (nothing honest to quote)", () => {
    const steps = [
      step({ stepNumber: 1, status: "incorrect", teacherAnnotation: "   ", description: "Silent" }),
      step({ stepNumber: 2, status: "partial", teacherAnnotation: "Half the identity.", description: "Real" }),
    ];
    const opener = composePracticeRecordReturnOpener(qpRecord(), payload(steps), "Trigonometry");
    expect(opener!.text).toContain("Real");
    expect(opener!.text).not.toContain("Silent");
  });

  it("NEVER quotes a step's marks — the objective clamp zeroes them by design (#445)", () => {
    // An objective question's per-step marks are clamped to 0; quoting them would read
    // as "you scored nothing" when the mark lives at answer level.
    const objective = payload([step({ marksAwarded: 0, marksDeducted: 0 })]);
    objective.response.results[0].objective = true;
    const opener = composePracticeRecordReturnOpener(qpRecord(), objective, "Trigonometry");
    expect(opener).not.toBeNull();
    // The annotation still rides — the views keep annotations, they only drop the chip.
    expect(opener!.text).toContain("The identity equals 1, not 2.");
    expect(opener!.text).not.toMatch(/0 marks/i);
  });

  it("separates presentation from method — careless is not a weakness (MI doctrine)", () => {
    const rec = qpRecord({ fourType: { conceptual: 0, calculation: 0, silly: 1, presentation: 2 } });
    const opener = composePracticeRecordReturnOpener(rec, payload([step()]), "Trigonometry");
    expect(opener!.text).toMatch(/presentation, not your maths/i);
    expect(opener!.text).toMatch(/the finish costing you/i);
  });

  it("distinguishes a MISSING step from a wrong one", () => {
    const opener = composePracticeRecordReturnOpener(
      qpRecord(),
      payload([step({ status: "missing", teacherAnnotation: "No working shown." })]),
      "Trigonometry",
    );
    expect(opener!.text).toMatch(/never got written/i);
  });

  it("celebrates a clean set only when there is REAL working behind it", () => {
    const clean = qpRecord({ marksAwarded: 5, marksTotal: 5 });
    const worked = composePracticeRecordReturnOpener(
      clean,
      payload([step({ status: "correct", teacherAnnotation: "Spot on." })]),
      "Trigonometry",
    );
    expect(worked!.text).toContain("5 out of 5");
    expect(worked!.text).toMatch(/working held up/i);
  });

  // ── The honest-degrade ladder: null -> the caller falls back to the marks line ──

  it("returns null for an MCQ-only set (a bare click shows no reasoning — D-PROG-2)", () => {
    expect(composePracticeRecordReturnOpener(qpRecord(), payload(null), "Trigonometry")).toBeNull();
  });

  it("returns null for a clean MCQ-only set rather than praising working that doesn't exist", () => {
    const clean = qpRecord({ marksAwarded: 5, marksTotal: 5 });
    expect(composePracticeRecordReturnOpener(clean, payload(null), "Trigonometry")).toBeNull();
  });

  it("returns null when the payload is missing entirely", () => {
    expect(composePracticeRecordReturnOpener(qpRecord(), null, "Trigonometry")).toBeNull();
  });

  it("returns null when the record carries no marks", () => {
    const noMarks = qpRecord({ marksTotal: 0, marksAwarded: 0 });
    expect(composePracticeRecordReturnOpener(noMarks, payload([step()]), "Trigonometry")).toBeNull();
  });

  it("ignores an unreadable question's steps", () => {
    const p = payload([step()]);
    p.response.results[0].couldNotRead = true;
    expect(composePracticeRecordReturnOpener(qpRecord(), p, "Trigonometry")).toBeNull();
  });
});
