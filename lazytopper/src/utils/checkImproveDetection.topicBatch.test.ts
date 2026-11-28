// TOPIC-BATCH-1 - ONE batched "topics" call replaces one detect per question. Same output shape, same guard,
// same subject rule; any failure / partial reply falls back to the per-question read for the missing questions only.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

type Req = { question?: string; purpose?: string; questions?: Array<{ questionNumber: number; questionText: string }> };
const h = vi.hoisted(() => ({
  calls: [] as Array<{ req: Req; opts: unknown }>,
  single: new Map<string, { detectedTopic: string | null; detectedSubject: string | null }>(),
  batch: null as null | (() => unknown),
}));
vi.mock("../ai/aiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../ai/aiClient")>();
  return {
    ...actual,
    detectQuestion: async (req: Req, opts?: unknown) => {
      h.calls.push({ req, opts });
      if (req.purpose === "topics") {
        if (!h.batch) throw new Error("batch unavailable");
        return h.batch();
      }
      return { ok: true, ...(h.single.get(String(req.question)) ?? { detectedTopic: null, detectedSubject: null }) };
    },
  };
});

import { resolvePerQuestionGradeTopics, questionSetSignature } from "./checkImproveDetection";

const TRIG = "Prove that (1 + tan²A)/(1 + cot²A) = tan²A";
const QUAD = "Find the roots of 2x² - 5x + 3 = 0 by the quadratic formula.";
const SECTOR = "Find the area of the sector of a circle of radius 7 cm and angle 60°.";
const QS = [
  { questionNumber: 1, questionText: TRIG },
  { questionNumber: 2, questionText: QUAD },
  { questionNumber: 3, questionText: SECTOR },
];
const shape = (o: Array<{ qNumber: number; topicSlug: string; subject: string }>) => o.map((x) => [x.qNumber, x.topicSlug, x.subject]);
const singles = () => h.calls.filter((c) => c.req.purpose === "topic");
const batches = () => h.calls.filter((c) => c.req.purpose === "topics");

beforeEach(() => {
  h.calls = [];
  h.single.clear();
  h.batch = null;
  h.single.set(TRIG, { detectedTopic: null, detectedSubject: "Maths" });
  h.single.set(QUAD, { detectedTopic: "quadratic-equations", detectedSubject: "Maths" });
  h.single.set(SECTOR, { detectedTopic: null, detectedSubject: "Maths" });
});
afterEach(() => vi.unstubAllEnvs());

describe("TOPIC-BATCH-1", () => {
  it("batch success: ONE call, no per-question calls, the guard and subject rule applied as on the single path", async () => {
    h.batch = () => ({
      ok: true,
      topics: [
        { questionNumber: 1, detectedTopic: null, detectedSubject: "Maths" },
        { questionNumber: 2, detectedTopic: "quadratic-equations", detectedSubject: "Maths" },
        { questionNumber: 3, detectedTopic: null, detectedSubject: "Maths" },
      ],
    });
    const out = await resolvePerQuestionGradeTopics(QS, []);
    expect(batches()).toHaveLength(1);
    expect(singles()).toHaveLength(0);
    expect(batches()[0].req.questions).toEqual(QS);
    expect(shape(out)).toEqual([
      [1, "trigonometry", "Maths"],
      [2, "quadratic-equations", "Maths"],
      [3, "", "Maths"],
    ]);
  });

  it("★ batched output equals the per-question output for the same model answers", async () => {
    h.batch = () => ({
      ok: true,
      topics: QS.map((q) => ({ questionNumber: q.questionNumber, ...h.single.get(q.questionText)! })),
    });
    const batched = await resolvePerQuestionGradeTopics(QS, []);
    vi.stubEnv("VITE_TOPIC_BATCH_DISABLED", "1");
    const oneByOne = await resolvePerQuestionGradeTopics(QS, []);
    expect(batched).toEqual(oneByOne);
  });

  it("partial reply: ONLY the missing questions are re-read one by one (and an unknown number is ignored)", async () => {
    h.batch = () => ({
      ok: true,
      topics: [
        { questionNumber: 2, detectedTopic: "quadratic-equations", detectedSubject: "Maths" },
        { questionNumber: 99, detectedTopic: "trigonometry", detectedSubject: "Maths" },
      ],
    });
    const out = await resolvePerQuestionGradeTopics(QS, []);
    expect(singles().map((c) => c.req.question).sort()).toEqual([SECTOR, TRIG].sort());
    expect(shape(out)).toEqual([
      [1, "trigonometry", "Maths"],
      [2, "quadratic-equations", "Maths"],
      [3, "", "Maths"],
    ]);
  });

  it("failure (throws): full per-question fallback", async () => {
    h.batch = null; // the mock throws
    const out = await resolvePerQuestionGradeTopics(QS, []);
    expect(batches()).toHaveLength(1);
    expect(singles()).toHaveLength(3);
    expect(shape(out)).toEqual([
      [1, "trigonometry", "Maths"],
      [2, "quadratic-equations", "Maths"],
      [3, "", "Maths"],
    ]);
  });

  it("malformed / ok:false reply: full per-question fallback, never a guessed chapter", async () => {
    for (const bad of [{ ok: false, error: "x" }, { ok: true }, { ok: true, topics: "nope" }]) {
      h.calls = [];
      h.batch = () => bad;
      const out = await resolvePerQuestionGradeTopics(QS, []);
      expect(singles()).toHaveLength(3);
      expect(out).toHaveLength(3);
    }
  });

  it("flag off (VITE_TOPIC_BATCH_DISABLED=1): today's path - N per-question calls, NO batched call", async () => {
    vi.stubEnv("VITE_TOPIC_BATCH_DISABLED", "1");
    h.batch = () => ({ ok: true, topics: [] });
    const out = await resolvePerQuestionGradeTopics(QS, []);
    expect(batches()).toHaveLength(0);
    expect(singles()).toHaveLength(3);
    expect(singles().every((c) => c.req.questions === undefined)).toBe(true);
    expect(out).toHaveLength(3);
  });

  it("signed-out free check: callOpts is forwarded to the batched call AND to every fallback call", async () => {
    const FREE = { freeCheck: true } as never;
    h.batch = () => ({ ok: true, topics: [{ questionNumber: 1, detectedTopic: null, detectedSubject: null }] });
    await resolvePerQuestionGradeTopics(QS, [], FREE);
    expect(batches()[0].opts).toBe(FREE);
    expect(singles()).toHaveLength(2);
    singles().forEach((c) => expect(c.opts).toBe(FREE));
  });

  it("no callOpts: the call carries none (byte-identical to before for a signed-in student)", async () => {
    h.batch = () => ({ ok: true, topics: [] });
    await resolvePerQuestionGradeTopics(QS, []);
    expect(h.calls.every((c) => c.opts === undefined)).toBe(true);
  });

  it("an unreadable question stays honestly empty and is never sent; one readable question is not batched; a repeated number is not batched", async () => {
    h.batch = () => ({ ok: true, topics: [] });
    const blank = await resolvePerQuestionGradeTopics([{ questionNumber: 1, questionText: "  " }, { questionNumber: 2, questionText: QUAD }], []);
    expect(batches()).toHaveLength(0);
    expect(shape(blank)).toEqual([[1, "", ""], [2, "quadratic-equations", "Maths"]]);
    h.calls = [];
    await resolvePerQuestionGradeTopics([{ questionNumber: 1, questionText: TRIG }, { questionNumber: 1, questionText: QUAD }], []);
    expect(batches()).toHaveLength(0);
    expect(singles()).toHaveLength(2);
  });

  it("questionSetSignature is unchanged (numbers + trimmed texts, never marks)", () => {
    expect(questionSetSignature(QS)).toBe(JSON.stringify([[1, TRIG], [2, QUAD], [3, SECTOR]]));
    expect(questionSetSignature([])).toBe("");
  });
});
