// @vitest-environment node
//
// ════════════════════════════════════════════════════════════════════════════
// BATCH-1b — THE COLLECT-AND-BATCH GRADE. The first executable coverage of the
// client half of #578 (per-question answer images in the structured grader).
// ════════════════════════════════════════════════════════════════════════════
//
// ★★ WHY EVERY "NO API CALL" TEST HERE HAS A CONTROL. An assertion that the grader
// was NOT called passes just as happily when the module is broken, when the import is
// wrong, or when the seam was never reached at all. Each such test is paired with a
// case on the SAME grader spy that MUST call, so a green "0 calls" is only ever green
// because the classification said so.
//
// ★★ WHAT IS NOT PROVEN HERE, STATED SO IT IS NOT MISREAD AS PROVEN. These tests
// exercise the batching client against an injected grader. They do NOT prove a real
// batched request reaches Gemini (that needs a keyed server — see the lane report), and
// they do NOT prove anything is WIRED: no page invokes `gradeQuickPracticeBatch` yet.
// #578 shipped mounted-and-dead for four days; a suite that reads as liveness proof
// would repeat exactly that.
//
// The server's own half — the interleave, the one-call-per-batch property, and the
// "results are built from the SENT questions" mapping — is covered by
// `lazytopper/server/routes/checkSolution.test.cjs` §7 and is deliberately not
// duplicated. What is pinned below is the CLIENT's decisions: what goes in the batch,
// how many calls it costs, and what it does with the reply.

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { WorksheetGradeResponse, WorksheetQuestionGrade } from "../ai/aiClient";
import type * as SessionRecordsModule from "./sessionRecords";

// Typed to the REAL signatures — an untyped `vi.fn()` types `mock.calls` as `[][]`, so
// every `calls[0][1]` read is a TS2493 empty-tuple error: green under tsconfig.app.json
// (which excludes tests) and RED in CI's separate typecheck:test step.
const writeSessionRecord = vi.fn<typeof SessionRecordsModule.writeSessionRecord>(() => "recorded");
const writeSessionPerQuestion = vi.fn<typeof SessionRecordsModule.writeSessionPerQuestion>();

// Only the two WRITE seams are spied; the REAL record/code builders run.
vi.mock("./sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./sessionRecords")>();
  return { ...actual, writeSessionRecord, writeSessionPerQuestion };
});

const {
  classifyQuickPracticeAnswer,
  selectQuickPracticeBatch,
  buildBatchQuestionInput,
  batchGradeToCheckSolution,
  gradeQuickPracticeBatch,
  persistQuickPracticeSession,
} = await import("./quickPracticeSessionService");

type SavedAnswer = Parameters<typeof selectQuickPracticeBatch>[0][number];
type Grader = NonNullable<Parameters<typeof gradeQuickPracticeBatch>[0]["grade"]>;

const IMG = "BASE64IMAGEDATA";

/** A displayed question with NOTHING produced for it. Each test adds exactly the one
 *  piece of evidence it is about, so no test is accidentally about two things. */
const q = (qNumber: number, over: Partial<SavedAnswer> = {}): SavedAnswer => ({
  questionId: `bank-${qNumber}`,
  qNumber,
  marks: 3,
  questionText: `Question ${qNumber} text`,
  ...over,
});

/** A 1-mark Section-A MCQ — the type the "by working, never by type" rule is most
 *  often got wrong on. */
const mcq = (qNumber: number, over: Partial<SavedAnswer> = {}): SavedAnswer =>
  q(qNumber, {
    marks: 1,
    section: "A",
    format: "mcq",
    objective: true,
    options: ["2", "root 2"],
    answer: "root 2",
    ...over,
  });

const gradeResult = (qNumber: number, over: Partial<WorksheetQuestionGrade> = {}): WorksheetQuestionGrade => ({
  qNumber,
  couldNotRead: false,
  totalMarks: 3,
  ok: true,
  marksAwarded: 2,
  percentage: 67,
  annotatedSteps: [],
  mistakeSummary: { conceptual: 1, calculation: 0, silly: 0, presentation: 0 },
  teacherNote: "Good method.",
  ...over,
});

const okResponse = (results: WorksheetQuestionGrade[]): WorksheetGradeResponse => ({
  ok: true,
  results,
  totalQuestions: results.length,
  gradedCount: results.filter((r) => !r.couldNotRead).length,
  pendingCount: results.filter((r) => r.couldNotRead).length,
  gradedMarksAwarded: 0,
  gradedMarksTotal: 0,
  worksheetTotalMarks: 0,
});

/** ONE spy, shared by the "must not call" and "must call" halves of every control
 *  pair — the same object proving both directions. */
let grader: ReturnType<typeof vi.fn<Grader>>;
const run = (answers: SavedAnswer[]) =>
  gradeQuickPracticeBatch({ worksheetId: "qp-1", subject: "Maths", answers, grade: grader });

beforeEach(() => {
  vi.clearAllMocks();
  grader = vi.fn<Grader>(async (req) => okResponse(req.questions.map((qq) => gradeResult(qq.qNumber))));
});

/* ───────────────────────────────────────────────────────────────────────────
   1 · SAVING AN ANSWER COSTS NOTHING (§5.1) — with the control that does call.
   ─────────────────────────────────────────────────────────────────────────── */
describe("1 · collecting answers issues no grade call", () => {
  it("classifying/partitioning a whole session makes NO call to the grader", () => {
    const answers = [q(1, { imageBase64: IMG }), mcq(2, { pickedOption: "(b)", pickedCorrect: true }), q(3)];
    selectQuickPracticeBatch(answers);
    answers.forEach(classifyQuickPracticeAnswer);
    expect(grader).toHaveBeenCalledTimes(0);
  });

  it("CONTROL — the SAME spy IS called once when the session is actually graded", async () => {
    await run([q(1, { imageBase64: IMG })]);
    expect(grader).toHaveBeenCalledTimes(1);
  });
});

/* ───────────────────────────────────────────────────────────────────────────
   2 · A BARE MCQ PICK IS SCORED LOCALLY (§5.2) — with its control.
   ─────────────────────────────────────────────────────────────────────────── */
describe("2 · a bare option pick is free", () => {
  it("a session of ONLY bare picks issues ZERO grade calls and still scores them", async () => {
    const res = await run([
      mcq(1, { pickedOption: "(b)", pickedCorrect: true }),
      mcq(2, { pickedOption: "(a)", pickedCorrect: false }),
    ]);
    expect(grader).toHaveBeenCalledTimes(0);
    expect(res.calls).toBe(0);
    expect(res.outcome).toBe("skipped-nothing-to-batch");
    expect(res.entries.map((e) => e.mcq)).toEqual(["correct", "wrong"]);
  });

  it("CONTROL — adding ONE photographed answer to that same session DOES call the grader once", async () => {
    const res = await run([
      mcq(1, { pickedOption: "(b)", pickedCorrect: true }),
      q(2, { imageBase64: IMG }),
    ]);
    expect(grader).toHaveBeenCalledTimes(1);
    expect(res.calls).toBe(1);
    // The free pick is still scored locally — batching does not re-grade what was free.
    expect(res.entries[0].mcq).toBe("correct");
    expect(res.entries[0].graded).toBeUndefined();
  });
});

/* ───────────────────────────────────────────────────────────────────────────
   3 · ★★ INCLUSION IS BY WORKING, NEVER BY TYPE (§5.3) — BOTH DIRECTIONS.
   ─────────────────────────────────────────────────────────────────────────── */
describe("3 · what goes in the batch is decided by the working, not the question type", () => {
  it("an MCQ WITH photographed working IS in the batch", async () => {
    const res = await run([mcq(1, { pickedOption: "(b)", pickedCorrect: false, imageBase64: IMG })]);
    expect(classifyQuickPracticeAnswer(mcq(1, { pickedOption: "(b)", imageBase64: IMG }))).toBe("batch");
    expect(res.sentQNumbers).toEqual([1]);
    expect(grader.mock.calls[0][0].uploads?.map((u) => u.qNumber)).toEqual([1]);
  });

  it("the SAME MCQ WITHOUT working is NOT in the batch", async () => {
    const res = await run([mcq(1, { pickedOption: "(b)", pickedCorrect: false })]);
    expect(classifyQuickPracticeAnswer(mcq(1, { pickedOption: "(b)" }))).toBe("local-mcq");
    expect(res.sentQNumbers).toEqual([]);
    expect(grader).toHaveBeenCalledTimes(0);
  });

  it("a SUBJECTIVE question the student SKIPPED is NOT in the batch (the other direction)", async () => {
    const sectionC = q(1, { marks: 3, section: "C" });
    expect(classifyQuickPracticeAnswer(sectionC)).toBe("skipped");
    const res = await run([sectionC]);
    expect(res.sentQNumbers).toEqual([]);
    expect(grader).toHaveBeenCalledTimes(0);
    // Nothing produced → neither a grade nor an mcq outcome. Never a fabricated 0.
    expect(res.entries[0].graded).toBeUndefined();
    expect(res.entries[0].mcq).toBeUndefined();
  });

  it("one mixed session partitions correctly: MCQ-with-working batched, bare pick local, skip omitted", () => {
    const sel = selectQuickPracticeBatch([
      mcq(1, { pickedOption: "(b)", pickedCorrect: true, imageBase64: IMG }),
      mcq(2, { pickedOption: "(a)", pickedCorrect: false }),
      q(3, { section: "C" }),
      q(4, { section: "D", imageBase64: IMG }),
    ]);
    expect(sel.batch.map((a) => a.qNumber)).toEqual([1, 4]);
    expect(sel.localMcq.map((a) => a.qNumber)).toEqual([2]);
    expect(sel.skipped.map((a) => a.qNumber)).toEqual([3]);
  });

  it("★ nothing in the classifier reads section/format/objective — flipping ALL THREE changes nothing", () => {
    const withWorking = { imageBase64: IMG, pickedOption: "(b)" };
    const asObjective = q(1, { section: "A", format: "mcq", qType: "mcq", objective: true, ...withWorking });
    const asSubjective = q(1, { section: "D", format: "subjective", qType: "long", objective: false, ...withWorking });
    expect(classifyQuickPracticeAnswer(asObjective)).toBe(classifyQuickPracticeAnswer(asSubjective));
    const bareObjective = q(2, { section: "A", format: "mcq", objective: true, pickedOption: "(b)" });
    const bareSubjective = q(2, { section: "D", format: "subjective", objective: false, pickedOption: "(b)" });
    expect(classifyQuickPracticeAnswer(bareObjective)).toBe(classifyQuickPracticeAnswer(bareSubjective));
  });

  it("★ the objective signals are still FORWARDED to the server, which owns the 0/1 clamp", async () => {
    await run([mcq(1, { pickedOption: "(b)", pickedCorrect: false, imageBase64: IMG })]);
    const sent = grader.mock.calls[0][0].questions[0];
    // The 1-marker ruling is the SERVER's deterministic clamp; this module must hand it
    // the key it needs and never score the MCQ itself.
    expect(sent.objective).toBe(true);
    expect(sent.section).toBe("A");
    expect(sent.answer).toBe("root 2");
    expect(sent.options).toEqual(["2", "root 2"]);
    expect(sent.marks).toBe(1);
  });
});

/* ───────────────────────────────────────────────────────────────────────────
   4 · ★★ EXACTLY ONE CALL FOR THE WHOLE SESSION (§5.4).
   ─────────────────────────────────────────────────────────────────────────── */
describe("4 · N photographed answers cost ONE grade call, not N", () => {
  it("six photographed answers → grader called exactly once, carrying all six", async () => {
    const answers = [1, 2, 3, 4, 5, 6].map((n) => q(n, { imageBase64: `${IMG}-${n}` }));
    const res = await run(answers);
    expect(grader).toHaveBeenCalledTimes(1);
    expect(res.calls).toBe(1);
    const req = grader.mock.calls[0][0];
    expect(req.questions.map((x) => x.qNumber)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(req.uploads?.map((u) => u.qNumber)).toEqual([1, 2, 3, 4, 5, 6]);
    // ★ each upload carries ITS OWN image — an off-by-one here is the pairing bug the
    // whole #578 design exists to prevent, and the client can introduce it too.
    expect(req.uploads?.map((u) => u.imageBase64)).toEqual([1, 2, 3, 4, 5, 6].map((n) => `${IMG}-${n}`));
    expect(res.entries.filter((e) => e.graded).length).toBe(6);
  });

  it("the uploads are keyed by qNumber and every one names a question that was sent", async () => {
    await run([q(1, { imageBase64: IMG }), q(2), q(3, { imageBase64: IMG })]);
    const req = grader.mock.calls[0][0];
    const sent = new Set(req.questions.map((x) => x.qNumber));
    for (const u of req.uploads ?? []) expect(sent.has(u.qNumber)).toBe(true);
    // A question with nothing photographed is not in the request at all.
    expect(sent.has(2)).toBe(false);
  });
});

/* ───────────────────────────────────────────────────────────────────────────
   5 · EVERY RETURNED qNumber WAS ONE WE SENT (§5.5).
   ─────────────────────────────────────────────────────────────────────────── */
describe("5 · a reply about a question we did not ask is dropped and reported", () => {
  it("an unsolicited qNumber is never merged onto a displayed question", async () => {
    grader = vi.fn<Grader>(async () => okResponse([gradeResult(1), gradeResult(99, { marksAwarded: 3 })]));
    const res = await run([q(1, { imageBase64: IMG }), q(2, { pickedOption: "(a)", pickedCorrect: true, marks: 1 })]);
    expect(res.unsolicitedQNumbers).toEqual([99]);
    expect(res.entries[0].graded).toBeDefined();
    // Q2 was never sent, so nothing from the reply may land on it.
    expect(res.entries[1].graded).toBeUndefined();
  });

  it("CONTROL — a reply about a qNumber that WAS sent lands on its own question", async () => {
    const res = await run([q(1, { imageBase64: IMG }), q(2, { imageBase64: IMG })]);
    expect(res.unsolicitedQNumbers).toEqual([]);
    expect(res.entries[0].graded?.marksAwarded).toBe(2);
    expect(res.entries[1].graded?.marksAwarded).toBe(2);
  });

  it("★ a couldNotRead result becomes NO grade — never a 0 the student did not earn", async () => {
    grader = vi.fn<Grader>(async () => okResponse([{ qNumber: 1, couldNotRead: true, totalMarks: 3 }]));
    const res = await run([q(1, { imageBase64: IMG })]);
    expect(batchGradeToCheckSolution({ qNumber: 1, couldNotRead: true, totalMarks: 3 })).toBeNull();
    expect(res.entries[0].graded).toBeUndefined();
    expect(res.entries[0].mcq).toBeUndefined();
  });

  it("grade numbers pass through untouched — this module never re-scores", () => {
    const mapped = batchGradeToCheckSolution(
      gradeResult(1, { totalMarks: 5, marksAwarded: 3.5, percentage: 70, teacherNote: "note" }),
    );
    expect(mapped).toMatchObject({ ok: true, totalMarks: 5, marksAwarded: 3.5, percentage: 70, teacherNote: "note" });
  });
});

/* ───────────────────────────────────────────────────────────────────────────
   6 · ★ THE TYPED-ANSWER GAP — reported, never swallowed.
   ─────────────────────────────────────────────────────────────────────────── */
describe("6 · typed-only working has no channel on the batch grader", () => {
  it("typed working with no photo is classified typed-no-channel and reported to the caller", async () => {
    const typed = q(1, { textAnswer: "x = 4 and x = -2" });
    expect(classifyQuickPracticeAnswer(typed)).toBe("typed-no-channel");
    const res = await run([typed]);
    expect(res.typedNoChannelQNumbers).toEqual([1]);
    // It is NOT sent (there is no field to send it in) and NOT silently dropped.
    expect(res.sentQNumbers).toEqual([]);
    expect(res.entries[0].graded).toBeUndefined();
  });

  it("CONTROL — the same answer WITH a photo rides the batch normally", async () => {
    const res = await run([q(1, { textAnswer: "x = 4 and x = -2", imageBase64: IMG })]);
    expect(res.typedNoChannelQNumbers).toEqual([]);
    expect(res.sentQNumbers).toEqual([1]);
  });
});

/* ───────────────────────────────────────────────────────────────────────────
   7 · ★★ ONE GRADED SET → ONE RECORD + ONE PAYLOAD, WITH A SUBSET GRADED (§5.6/§5.7).
   The invariant #606's contract suite was built to protect, exercised through the
   BATCHED path end to end.
   ─────────────────────────────────────────────────────────────────────────── */
describe("7 · the batched result persists as ONE record and ONE payload", () => {
  const USER = { uid: "u-real", isLocalSession: false } as unknown as Parameters<
    typeof persistQuickPracticeSession
  >[0]["user"];

  const persist = (entries: Parameters<typeof persistQuickPracticeSession>[0]["entries"]) =>
    persistQuickPracticeSession({
      user: USER,
      title: "Real Numbers — Quick Practice",
      subject: "maths",
      topicSlug: "real-numbers",
      filterSignature: "medium|5q",
      startedAt: 1_700_000_000_000,
      entries,
    });

  it("★ five displayed, only TWO photographed: ONE record, ONE payload, results stay SPARSE", async () => {
    const res = await run([
      q(1, { imageBase64: IMG }),
      q(2, { section: "C" }),
      mcq(3, { pickedOption: "(b)", pickedCorrect: true }),
      q(4, { imageBase64: IMG }),
      q(5, { section: "D" }),
    ]);
    expect(grader).toHaveBeenCalledTimes(1);
    expect(persist(res.entries)).toBe("recorded");

    expect(writeSessionRecord).toHaveBeenCalledTimes(1);
    expect(writeSessionPerQuestion).toHaveBeenCalledTimes(1);

    const record = writeSessionRecord.mock.calls[0][1];
    const payload = writeSessionPerQuestion.mock.calls[0][1];
    // ★ EVERY DISPLAYED id is on the record …
    expect(record.questionIds).toEqual(["bank-1", "bank-2", "bank-3", "bank-4", "bank-5"]);
    // … while the payload's response stays sparse: 2 graded + 1 bare pick = 3 of 5.
    expect(payload.response.results.map((r) => r.qNumber)).toEqual([1, 3, 4]);
    expect(payload.response.totalQuestions).toBe(5);
    expect(payload.response.gradedCount).toBe(3);
    // The payload is BOUND to its record. `SessionRecord.id` IS the surface code, so
    // the payload's `code` must equal it — that identity is what "review my answers"
    // resolves through.
    expect(payload.code).toBe(record.id);
    expect(payload.worksheetId).toBe(record.worksheetId);
    expect(payload.ref).toBe(record.perQuestionRef);
    expect(payload.gradedAt).toBe(record.gradedAt);
    expect(payload.surface).toBe("quick-practice");
  });

  it("★ a RETRY of the same batched set overwrites — still ONE row, same doc id", async () => {
    const answers = [q(1, { imageBase64: IMG }), q(2, { imageBase64: IMG })];
    const first = await run(answers);
    persist(first.entries);
    const second = await run(answers);
    persist(second.entries);
    expect(writeSessionRecord).toHaveBeenCalledTimes(2);
    // The doc id IS the derived code, so a re-finish of the same set overwrites the same
    // row instead of minting a second one.
    expect(writeSessionRecord.mock.calls[0][1].id).toBe(writeSessionRecord.mock.calls[1][1].id);
    expect(writeSessionRecord.mock.calls[0][1].dedupKey).toBe(writeSessionRecord.mock.calls[1][1].dedupKey);
    expect(writeSessionPerQuestion.mock.calls[0][1].code).toBe(writeSessionPerQuestion.mock.calls[1][1].code);
  });
});

/* ───────────────────────────────────────────────────────────────────────────
   8 · A FAILED BATCH LEAVES NO ORPHAN (§5.8).
   ─────────────────────────────────────────────────────────────────────────── */
describe("8 · a failed batched grade is honest", () => {
  it("a thrown grader returns skipped-error, fabricates no grade, and writes NOTHING", async () => {
    grader = vi.fn<Grader>(async () => {
      throw new Error("network down");
    });
    const res = await run([q(1, { imageBase64: IMG }), q(2, { imageBase64: IMG })]);
    expect(res.outcome).toBe("skipped-error");
    expect(res.entries.every((e) => !e.graded && !e.mcq)).toBe(true);

    const outcome = persistQuickPracticeSession({
      user: { uid: "u-real", isLocalSession: false } as unknown as Parameters<
        typeof persistQuickPracticeSession
      >[0]["user"],
      title: "t",
      subject: "maths",
      topicSlug: "real-numbers",
      filterSignature: "f",
      startedAt: 1,
      entries: res.entries,
    });
    expect(outcome).toBe("skipped-nothing-attempted");
    expect(writeSessionRecord).toHaveBeenCalledTimes(0);
    expect(writeSessionPerQuestion).toHaveBeenCalledTimes(0);
  });

  it("an ok:false reply is skipped-error too, and the FREE local scores survive it", async () => {
    grader = vi.fn<Grader>(async () => ({ ...okResponse([]), ok: false, error: "grader said no" }));
    const res = await run([
      mcq(1, { pickedOption: "(b)", pickedCorrect: true }),
      q(2, { imageBase64: IMG }),
    ]);
    expect(res.outcome).toBe("skipped-error");
    expect(res.error).toBe("grader said no");
    // A grader outage must not erase what was scored for free.
    expect(res.entries[0].mcq).toBe("correct");
    expect(res.entries[1].graded).toBeUndefined();
  });
});

/* ───────────────────────────────────────────────────────────────────────────
   9 · THE REQUEST SHAPE HANDED TO THE SERVER.
   ─────────────────────────────────────────────────────────────────────────── */
describe("9 · the request built for /api/grade-worksheet", () => {
  it("carries the bank marking scheme through untouched", () => {
    const input = buildBatchQuestionInput(
      q(4, { marks: 5, solutionSteps: ["Factorise [1]", "Solve [2]"], finalAnswer: "x = 4", topicLabel: "Quadratics" }),
    );
    expect(input).toMatchObject({
      qNumber: 4,
      marks: 5,
      solutionSteps: ["Factorise [1]", "Solve [2]"],
      finalAnswer: "x = 4",
      topicLabel: "Quadratics",
    });
  });

  it("omits empty optional fields rather than sending blanks", () => {
    const input = buildBatchQuestionInput(q(1, { topicLabel: "", answer: "", options: [], solutionSteps: [] }));
    expect(input.topicLabel).toBeUndefined();
    expect(input.answer).toBeUndefined();
    expect(input.options).toBeUndefined();
    expect(input.solutionSteps).toBeUndefined();
  });

  it("the qNumber sent is the DISPLAYED position — the join key the reply comes back on", async () => {
    // Only questions 2 and 5 of a five-question set were photographed; their DISPLAYED
    // positions must survive into the request, or the reply cannot be joined back.
    const res = await run([q(1), q(2, { imageBase64: IMG }), q(3), q(4), q(5, { imageBase64: IMG })]);
    expect(grader.mock.calls[0][0].questions.map((x) => x.qNumber)).toEqual([2, 5]);
    expect(res.entries[1].graded).toBeDefined();
    expect(res.entries[4].graded).toBeDefined();
    expect(res.entries[0].graded).toBeUndefined();
  });
});
