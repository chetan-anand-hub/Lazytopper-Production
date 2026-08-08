import { describe, it, expect, vi, beforeEach } from "vitest";

// MI-CONCEPT-1 — what the mistake-ingestion front door actually PERSISTS.
//
// `logMistakes` is spied (the rest of mistakeLogService stays REAL, so the
// legacy-shape read below exercises the real parser). `isSafeEntry` is deliberately
// NOT mocked — the new optional fields must survive the real safety gate.

const logMistakesSpy = vi.fn(async () => {});

vi.mock("./mistakeLogService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./mistakeLogService")>();
  return { ...actual, logMistakes: (...a: unknown[]) => logMistakesSpy(...(a as [])) };
});
vi.mock("./adaptivePracticeEngine", () => ({ recordWrongAnswer: vi.fn() }));

import { canonicalQuestionBank } from "../data/canonicalQuestionBank";
import { isChapterEchoSubtopic } from "./progressBankIndex";
import { recordMistake } from "./mistakeIntelligence";
import { getMistakeLogs, type MistakeLogEntry } from "./mistakeLogService";

const USER = { uid: "u-concept", isLocalSession: false } as never;

/** A real bank question with a usable (non chapter-echo) subtopic. */
const REAL = canonicalQuestionBank.find(
  (q) => q && typeof q.id === "string" && q.id && q.subtopic && !isChapterEchoSubtopic(q.subtopic),
)!;

/** A graded response that lost marks with a conceptual step — i.e. loggable. */
function gradedWrong() {
  return {
    ok: true,
    totalMarks: 3,
    marksAwarded: 1,
    annotatedSteps: [
      { stepNumber: 1, description: "Method", studentWork: "x", status: "incorrect", marksAwarded: 0, marksDeducted: 2, teacherAnnotation: "Wrong", mistakeType: "conceptual", correctedWorking: "…" },
    ],
    mistakeSummary: { conceptual: 1, calculation: 0, silly: 0, presentation: 0 },
  } as never;
}

/** The entry handed to logMistakes by the most recent recordMistake call. */
function loggedEntry(): Omit<MistakeLogEntry, "id"> {
  expect(logMistakesSpy).toHaveBeenCalled();
  const call = logMistakesSpy.mock.calls[logMistakesSpy.mock.calls.length - 1] as unknown[];
  return call[1] as Omit<MistakeLogEntry, "id">;
}

beforeEach(() => {
  logMistakesSpy.mockClear();
  localStorage.clear();
});

describe("recordMistake — concept + questionId on the entry", () => {
  it("the real bank fixture resolved (not an empty-bank no-op)", () => {
    expect(REAL).toBeDefined();
    expect(String(REAL.subtopic).length).toBeGreaterThan(0);
  });

  // ★ TEST 2 — QUICK PRACTICE. Its ctx.questionId is the BARE BANK ID (deliberately
  // un-namespaced, see quickPracticeSessionService), so the front door resolves the
  // concept centrally with no help from the call site.
  it("★ a Quick-Practice-shaped write (bare bank id, no concept supplied) carries a concept resolved FROM THE ID", async () => {
    const res = await recordMistake(USER, gradedWrong(), {
      subject: "Maths",
      topic: "Some Topic Label",
      topicKey: "real-numbers",
      question: "Q text",
      questionId: String(REAL.id),
    });
    expect(res.outcome).toBe("logged");
    const entry = loggedEntry();
    expect(entry.questionId).toBe(String(REAL.id));
    // Byte-identical to the bank — not slugified, not case-folded, not the topic.
    expect(entry.concept).toBe(REAL.subtopic);
    expect(entry.concept).not.toBe(entry.topic);
  });

  // ★ TEST 1 — WORKSHEET / FULL-MOCK / CHAPTER-TEST. Their ctx.questionId is a
  // SYNTHETIC attempt id that cannot resolve, so the call site resolves from the
  // persisted bank id and supplies `concept`. Both fields must land.
  it("★ a worksheet-shaped write (synthetic attempt id + supplied concept) carries BOTH fields", async () => {
    const res = await recordMistake(USER, gradedWrong(), {
      subject: "Maths",
      topic: "Polynomials",
      topicKey: "polynomials",
      question: "Q text",
      questionId: "ws:ws-abc:q2",
      concept: REAL.subtopic,
    });
    expect(res.outcome).toBe("logged");
    const entry = loggedEntry();
    expect(entry.questionId).toBe("ws:ws-abc:q2");
    expect(entry.concept).toBe(REAL.subtopic);
  });

  // ★ TEST 3 — THE CONTROL. An id that is not in the bank must yield NO concept and
  // the entry must STILL PERSIST. Absent is honest; approximate is not.
  it("★ CONTROL — an unresolvable id carries NO concept and the entry still persists", async () => {
    const res = await recordMistake(USER, gradedWrong(), {
      subject: "Maths",
      topic: "Real Numbers",
      topicKey: "real-numbers",
      question: "Q text",
      questionId: "not-a-bank-id-7a21",
    });
    expect(res.outcome).toBe("logged");
    const entry = loggedEntry();
    expect(entry.questionId).toBe("not-a-bank-id-7a21");
    expect(entry.concept).toBeUndefined();
    expect("concept" in entry).toBe(false);
    // Still a complete, persisted entry — the mistake is not dropped for want of a concept.
    expect(entry.marksLost).toBe(2);
    expect(entry.mistakeCounts.conceptual).toBe(1);
  });

  // ★ TEST 5 — CHECK & IMPROVE. Free-typed answers are not bank questions: no id,
  // therefore no concept. Unchanged behaviour, asserted so it stays unchanged.
  it("★ a Check & Improve entry (no id at all) carries NEITHER field and still persists", async () => {
    const res = await recordMistake(USER, gradedWrong(), {
      subject: "Maths",
      topic: "Real Numbers",
      topicKey: "real-numbers",
      question: "Free-typed working",
    });
    expect(res.outcome).toBe("logged");
    const entry = loggedEntry();
    expect("questionId" in entry).toBe(false);
    expect("concept" in entry).toBe(false);
    expect(entry.marksLost).toBe(2);
  });

  it("a supplied concept WINS over central resolution and is stored verbatim", async () => {
    await recordMistake(USER, gradedWrong(), {
      subject: "Maths",
      topic: "T",
      question: "Q",
      questionId: String(REAL.id),
      concept: "Explicitly Supplied Concept",
    });
    expect(loggedEntry().concept).toBe("Explicitly Supplied Concept");
  });
});

// ★ TEST 6 — THE OLD SHAPE. Entries written BEFORE this change have neither field.
// Test the migration FROM THE OLD SHAPE, not from clean: a clean-state test has the
// exact blind spot that shipped a live break in Wave 4.
describe("legacy entries written before MI-CONCEPT-1", () => {
  it("★ a pre-change entry (no concept, no questionId) still parses and is returned intact", async () => {
    const legacy = {
      id: "legacy-1",
      timestamp: new Date().toISOString(),
      questionText: "An entry written before MI-CONCEPT-1",
      topic: "Real Numbers",
      subject: "Maths",
      totalMarks: 3,
      marksLost: 2,
      mistakeCounts: { conceptual: 1, calculation: 0, silly: 0, presentation: 0 },
      stepDetails: [{ stepNumber: 1, mistakeType: "conceptual", marksDeducted: 2 }],
    };
    localStorage.setItem("lazytopper.mistakeLogs.v1:u-legacy", JSON.stringify([legacy]));

    const out = await getMistakeLogs("u-legacy", 30);

    expect(out).toHaveLength(1);
    expect(out[0]).toEqual(legacy);
    expect(out[0].concept).toBeUndefined();
    expect(out[0].questionId).toBeUndefined();
    // The fields that existed before are untouched — nothing was migrated away.
    expect(out[0].marksLost).toBe(2);
    expect(out[0].mistakeCounts.conceptual).toBe(1);
  });
});
