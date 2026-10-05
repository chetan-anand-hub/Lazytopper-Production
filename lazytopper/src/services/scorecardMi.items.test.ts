/**
 * SCORECARD-MI-1 PR-1 — one test per B-item / GA item that is not already pinned by the G3
 * pipeline (gradeConsistency.pipeline.test.ts), the G4 guard (lib/mistakeDisplay.guard.test.ts)
 * or an updated surface suite. Each `describe` names the item it pins.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const logMistakesMock = vi.fn(async (..._a: unknown[]) => {});
const recordWrongAnswerMock = vi.fn();
// W1 — the store's answer to "remove this stable entry": it acts only on evidence (`known`).
const removeStableMock = vi.fn(async (_uid: string, _id: string, o?: { known?: boolean }) => !!o?.known);
vi.mock("./mistakeLogService", () => ({
  logMistakes: (...a: unknown[]) => logMistakesMock(...a),
  removeStableMistakeLog: (...a: unknown[]) => removeStableMock(...(a as [string, string, { known?: boolean }])),
}));
vi.mock("./mistakeInsightsService", () => ({ isSafeEntry: () => true }));
// W4 — the per-question detect, so the subject it names can be observed end to end.
const detectQuestionMock = vi.fn();
vi.mock("../ai/aiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../ai/aiClient")>();
  return { ...actual, detectQuestion: (...a: unknown[]) => detectQuestionMock(...a) };
});
vi.mock("./adaptivePracticeEngine", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./adaptivePracticeEngine")>();
  return { ...actual, recordWrongAnswer: (...a: unknown[]) => recordWrongAnswerMock(...a) };
});

import { recordMistake } from "./mistakeIntelligence";
import { attemptDedupKey, gradeIdentityDocId, gradeIdentityKey } from "./attemptDedupKey";
import {
  ciQuestionIds,
  isMixedPaper,
  perQuestionFiling,
  resolvePerQuestionGradeTopics,
  resolveCiQuestionText,
  withObjectiveEcho,
} from "../utils/checkImproveDetection";
import { ciPaperMixLabel } from "../components/results/scorecardVariants";
import { describeTopMistakeType } from "../pages/tutor/tutorContextBrief";
import { desktopTopicBySlug } from "../lib/desktop/topics";
import type { WorksheetGradeResponse } from "../ai/aiClient";

const USER = { uid: "u-items", isLocalSession: false } as never;
const graded = (total: number, awarded: number, steps: Array<{ type: string | null; status?: string }> = [], summary: Record<string, number> = {}) =>
  ({
    ok: true,
    totalMarks: total,
    marksAwarded: awarded,
    percentage: 0,
    annotatedSteps: steps.map((s, i) => ({ stepNumber: i + 1, description: "", studentWork: "", status: s.status ?? "incorrect", marksAwarded: 0, marksDeducted: 1, teacherAnnotation: "", mistakeType: s.type, correctedWorking: null })),
    mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0, ...summary },
    teacherNote: "",
  }) as never;

beforeEach(() => {
  logMistakesMock.mockReset();
  logMistakesMock.mockResolvedValue(undefined);
  recordWrongAnswerMock.mockReset();
  removeStableMock.mockClear();
  window.localStorage.clear();
});

describe("B1 / D6 — the question a single C&I grade sends", () => {
  it("typed text wins; else the text read from the upload; NEVER the chapter name; none → empty", () => {
    expect(resolveCiQuestionText("  Solve x^2 = 4  ", [{ questionText: "detected" }])).toBe("Solve x^2 = 4");
    expect(resolveCiQuestionText("", [{ questionText: "  Find the HCF of 6 and 20.  " }])).toBe("Find the HCF of 6 and 20.");
    expect(resolveCiQuestionText("", [{ questionText: "" }])).toBe("");
    expect(resolveCiQuestionText(null, null)).toBe("");
  });
});

describe("B2 / D7 / GA-16 — each question under ITS OWN subject and chapter", () => {
  const paper = { subject: "Maths" as const, topicName: "Real Numbers", topicSlug: "real-numbers" };
  it("a resolved question carries its own chapter and subject, never the paper's first", () => {
    expect(perQuestionFiling({ topicSlug: "electricity", topicLabel: "Electricity", topicSubject: "Science" }, paper, true)).toEqual({
      subject: "Science",
      topicName: "Electricity",
      topicSlug: "electricity",
    });
  });
  it("an UNRESOLVED question on a mixed paper stays unfiled (honest unknown), never the first chapter", () => {
    expect(perQuestionFiling({ topicSlug: "" }, paper, true)).toEqual({ subject: "Maths", topicName: "", topicSlug: "" });
  });
  it("W4 — an UNRESOLVED question on a mixed paper takes the subject ITS OWN detect named, never the paper's", () => {
    expect(perQuestionFiling({ topicSlug: "", topicSubject: "Science" }, paper, true)).toEqual({ subject: "Science", topicName: "", topicSlug: "" });
  });
  it("W4 — the per-question detect keeps a NAMED subject when no chapter resolves, and invents none", async () => {
    detectQuestionMock.mockReset();
    detectQuestionMock
      .mockResolvedValueOnce({ ok: true, detectedTopic: "something no chapter matches", detectedSubject: "Science" })
      .mockResolvedValueOnce({ ok: true, detectedTopic: null, detectedSubject: null });
    const out = await resolvePerQuestionGradeTopics(
      [
        { questionNumber: 1, questionText: "Why does a ray of light bend?" },
        { questionNumber: 2, questionText: "An unreadable fragment" },
      ],
      [],
    );
    expect(out[0]).toEqual({ qNumber: 1, topicSlug: "", topicName: "", subject: "Science" });
    // CONTROL — no subject named → still unknown (never the resolver's "Maths" fallback).
    expect(out[1]).toEqual({ qNumber: 2, topicSlug: "", topicName: "", subject: "" });
  });
  it("CONTROL — on a single-topic paper an unresolved question inherits the paper's topic", () => {
    expect(perQuestionFiling({ topicSlug: null }, paper, false)).toEqual(paper);
  });
  it("the paper is titled with its real mix", () => {
    const resp = {
      results: [
        { qNumber: 1, couldNotRead: false, totalMarks: 1, topicSlug: "real-numbers", topicSubject: "Maths" },
        { qNumber: 2, couldNotRead: false, totalMarks: 2, topicSlug: "electricity", topicSubject: "Science" },
        { qNumber: 3, couldNotRead: false, totalMarks: 2, topicSlug: "life-processes", topicSubject: "Science" },
      ],
    } as unknown as WorksheetGradeResponse;
    expect(isMixedPaper(resp.results)).toBe(true);
    expect(ciPaperMixLabel(resp)).toBe("Maths + Science · 3 chapters");
    // CONTROL — one chapter is not a mix.
    expect(ciPaperMixLabel({ results: [resp.results[0]] } as unknown as WorksheetGradeResponse)).toBeNull();
  });
});

describe("B5 / D5 / GA-17 — a re-grade REPLACES, never duplicates (MI identity, ruling A2)", () => {
  it("the identity is uid + surface + submission + question (+ answer) and NEVER the score", () => {
    const base = { surface: "check-improve", submissionId: "CI-M-REAL-01", questionId: "ci:CI-M-REAL-01:q3" };
    const k = gradeIdentityKey("u1", base);
    expect(k).toBe("u1::check-improve::CI-M-REAL-01::ci:CI-M-REAL-01:q3");
    expect(k).not.toMatch(/\d+\/\d+/);
    expect(gradeIdentityKey("u1", { ...base, answerKey: "t:abc" })).not.toBe(k);
    expect(gradeIdentityKey("u1", { ...base, submissionId: "CI-M-REAL-02" })).not.toBe(k);
    expect(gradeIdentityKey("u2", base)).not.toBe(k);
    // a Firestore-legal document id: no "/", no ".", no whitespace
    expect(gradeIdentityDocId("u1", { surface: "x", question: "a/b. c" })).not.toMatch(/[/.\s]/);
  });

  it("HELD (gate) — the ATTEMPT key still carries the score; objective_dedup_acceptance.mjs:94 pins it", () => {
    expect(attemptDedupKey("u1", { questionId: "q" }, 0, 1)).not.toBe(attemptDedupKey("u1", { questionId: "q" }, 1, 1));
  });

  it("a re-grade with a DIFFERENT outcome writes to the SAME entry id (replace)", async () => {
    const ctx = { subject: "Maths", topic: "Real Numbers", question: "Q", questionId: "ci:C:q1", surface: "check-improve", submissionId: "C" };
    await recordMistake(USER, graded(3, 1, [{ type: "conceptual" }]), ctx);
    await recordMistake(USER, graded(3, 2, [{ type: "conceptual" }]), ctx);
    expect(logMistakesMock).toHaveBeenCalledTimes(2);
    const ids = logMistakesMock.mock.calls.map((c) => (c[2] as { id?: string } | undefined)?.id);
    expect(ids[0]).toBeTruthy();
    expect(ids[1]).toBe(ids[0]);
  });

  it("a re-grade of the same knowledge gap bridges to weak areas ONCE, not twice", async () => {
    const ctx = { subject: "Maths", topic: "Real Numbers", topicKey: "real-numbers", question: "Q", questionId: "ci:C:q2", surface: "check-improve", submissionId: "C" };
    await recordMistake(USER, graded(3, 1, [{ type: "conceptual" }]), ctx);
    await recordMistake(USER, graded(3, 2, [{ type: "conceptual" }]), ctx);
    expect(recordWrongAnswerMock).toHaveBeenCalledTimes(1);
  });

  /* W1 (FU-B15-MI-CLEAN-REGRADE-STALE) — MI never keeps a mistake the scorecard no longer shows. */
  const flipCtx = (q: string) => ({ subject: "Maths", topic: "Real Numbers", topicKey: "real-numbers", question: "Q", questionId: `ci:C:${q}`, surface: "check-improve", submissionId: "C" });
  it("W1 — mistake → clean → mistake: the clean re-grade REMOVES the entry, the mistake re-writes it, the gap bridges ONCE", async () => {
    const ctx = flipCtx("q7");
    const first = await recordMistake(USER, graded(3, 1, [{ type: "conceptual" }]), ctx);
    expect(first.outcome).toBe("logged");
    const id = (logMistakesMock.mock.calls[0][2] as { id: string }).id;
    const clean = await recordMistake(USER, graded(3, 3, [{ type: null, status: "correct" }]), ctx);
    expect(clean.outcome).toBe("skipped-clean");
    expect(clean.cleared).toBe(true);
    expect(removeStableMock).toHaveBeenCalledWith("u-items", id, { known: true });
    const again = await recordMistake(USER, graded(3, 1, [{ type: "conceptual" }]), ctx);
    expect(again.outcome).toBe("logged");
    expect(logMistakesMock).toHaveBeenCalledTimes(2);
    expect((logMistakesMock.mock.calls[1][2] as { id: string }).id).toBe(id);
    expect(recordWrongAnswerMock).toHaveBeenCalledTimes(1);
  });

  it("W1 — a NOT-ATTEMPTED re-grade removes the entry too", async () => {
    const ctx = flipCtx("q8");
    await recordMistake(USER, graded(3, 1, [{ type: "silly" }]), ctx);
    const id = (logMistakesMock.mock.calls[0][2] as { id: string }).id;
    const na = await recordMistake(USER, graded(3, 0, [{ type: null, status: "missing" }]), ctx);
    expect(na.outcome).toBe("skipped-not-attempted");
    expect(na.cleared).toBe(true);
    expect(removeStableMock).toHaveBeenCalledWith("u-items", id, { known: true });
  });

  it("W1 CONTROL — a FIRST clean grade has no evidence of an entry (known:false), and a repeat clean grade removes nothing more", async () => {
    const ctx = flipCtx("q9");
    const r = await recordMistake(USER, graded(3, 3, [{ type: null, status: "correct" }]), ctx);
    expect(r).toEqual({ outcome: "skipped-clean", bridged: false });
    expect(removeStableMock).toHaveBeenLastCalledWith("u-items", expect.any(String), { known: false });
    await recordMistake(USER, graded(3, 1, [{ type: "calculation" }]), ctx);
    await recordMistake(USER, graded(3, 3, [{ type: null, status: "correct" }]), ctx);
    const repeat = await recordMistake(USER, graded(3, 3, [{ type: null, status: "correct" }]), ctx);
    expect(repeat.cleared).toBeUndefined();
    expect(removeStableMock).toHaveBeenLastCalledWith("u-items", expect.any(String), { known: false });
  });

  it("W1 — a cache-restore of the SAME result is still a duplicate (dedup is the latest outcome, not any past one)", async () => {
    const ctx = flipCtx("q10");
    await recordMistake(USER, graded(3, 1, [{ type: "calculation" }]), ctx);
    const restore = await recordMistake(USER, graded(3, 1, [{ type: "calculation" }]), ctx);
    expect(restore.outcome).toBe("duplicate");
    // A → B → A writes A again: the entry (replaced by B) must show A once more.
    await recordMistake(USER, graded(3, 2, [{ type: "calculation" }]), ctx);
    const back = await recordMistake(USER, graded(3, 1, [{ type: "calculation" }]), ctx);
    expect(back.outcome).toBe("logged");
    expect(logMistakesMock).toHaveBeenCalledTimes(3);
  });

  it("a not-attempted question is its own state — no MI entry, never a type (D3)", async () => {
    const r = await recordMistake(USER, graded(2, 0, [{ type: null, status: "missing" }]), { subject: "Maths", topic: "T", question: "Q" });
    expect(r.outcome).toBe("skipped-not-attempted");
    expect(logMistakesMock).not.toHaveBeenCalled();
  });
});

describe("GA-41 — a free-check replay files the MI entry at GRADE time", () => {
  it("the entry's timestamp is gradedAt, not the replay time", async () => {
    const gradedAt = Date.UTC(2026, 9, 1, 9, 30, 0);
    await recordMistake(USER, graded(3, 1, [{ type: "silly" }]), { subject: "Maths", topic: "T", question: "Q", gradedAt });
    expect((logMistakesMock.mock.calls[0][1] as { timestamp: string }).timestamp).toBe(new Date(gradedAt).toISOString());
  });
});

describe("GA-38 — a re-opened single C&I grade keeps its objective flag", () => {
  const adapted = { ok: true, results: [{ qNumber: 1, couldNotRead: false, totalMarks: 1 }] } as unknown as WorksheetGradeResponse;
  it("objective:true is carried into the stored response", () => {
    expect(withObjectiveEcho(adapted, { objective: true }).results[0].objective).toBe(true);
  });
  it("CONTROL — absent stays absent (never invented)", () => {
    expect("objective" in withObjectiveEcho(adapted, {}).results[0]).toBe(false);
  });
});

describe("B5 multi — ids stay unique when detected numbers repeat (GA-09 / GA-17)", () => {
  it("the second Q10 gets its own id", () => {
    expect(ciQuestionIds("C", [{ qNumber: 9 }, { qNumber: 10 }, { qNumber: 10 }])).toEqual(["ci:C:q9", "ci:C:q10", "ci:C:q10#2"]);
  });
});

describe("GA-26 — the weak-area wrong-answer log belongs to ONE student", async () => {
  const engine = await vi.importActual<typeof import("./adaptivePracticeEngine")>("./adaptivePracticeEngine");
  it("two students on one device never see each other's gaps", () => {
    window.localStorage.setItem("lazytopper.progress.active_uid.v1", "student-a");
    engine.recordWrongAnswer("q1", "real-numbers", "", "Medium");
    expect(Object.keys(engine.loadWrongAnswerLog().entries)).toHaveLength(1);
    window.localStorage.setItem("lazytopper.progress.active_uid.v1", "student-b");
    expect(Object.keys(engine.loadWrongAnswerLog().entries)).toHaveLength(0);
  });
  it("the old UNSCOPED log is never merged into a signed-in student's log", () => {
    window.localStorage.setItem("lazytopper.wrongAnswerLog.v1", JSON.stringify({ version: 1, entries: { "x::y": { questionId: "y", topicKey: "x", conceptKey: "y", difficulty: "Medium", timestamp: 1, count: 3 } } }));
    window.localStorage.setItem("lazytopper.progress.active_uid.v1", "student-c");
    expect(engine.loadWrongAnswerLog().entries).toEqual({});
  });
});

describe("B3 — the tutor hears the top type by its owner GROUP", () => {
  it("careless / knowledge gap / exam technique", () => {
    expect(describeTopMistakeType("calculation")).toBe("careless (calculation slip)");
    expect(describeTopMistakeType("conceptual")).toBe("knowledge gap (concept gap)");
    expect(describeTopMistakeType("presentation")).toBe("exam technique (presentation)");
    expect(describeTopMistakeType("guesswork")).toBe("guesswork");
  });
});

describe("GA-42 — the coordinate-geometry blurb no longer advertises a deleted sub-topic", () => {
  it("checked against the banned phrase in scripts/src/syllabusGuard.ts (read from the file, not from memory)", () => {
    const guard = readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../scripts/src/syllabusGuard.ts"), "utf8");
    expect(guard).toContain('"Area of a Triangle in Coordinate Geometry"');
    const blurb = desktopTopicBySlug("coordinate-geometry")?.blurb ?? "";
    expect(blurb.length).toBeGreaterThan(0);
    expect(blurb).not.toMatch(/area of a triangle/i);
  });
});
