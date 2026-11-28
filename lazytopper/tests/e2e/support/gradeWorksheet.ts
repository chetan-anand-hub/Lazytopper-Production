/**
 * UI-E2E-4 — RECORDED `/api/grade-worksheet` replies for the paper surfaces (Chapter Test, Full Mock),
 * in the SERVER's own shapes. No model is called and nothing is charged.
 *
 * Where each shape comes from (read, not invented):
 *   - the graded body (synchronous 200, and a job's `final`): server/routes/checkSolution.cjs
 *     `buildWorksheetBody` — ok, worksheetId, results, totalQuestions, gradedCount, pendingCount,
 *     gradedMarksAwarded, gradedMarksTotal, worksheetTotalMarks, summary, provider, model.
 *   - one graded row: the repo's recorded grader output for the set entry,
 *     server/eval/golden/responses/v2/GS-M09-b.set.json `results[0]` (a 3-mark answer, 2.5/3, one
 *     calculation slip) — used VERBATIM for the paper's first 3-mark question. Every other question
 *     the page sends is answered with the SAME row shape at full marks (one correct step), because a
 *     paper's written questions are not golden items and no model output exists for them.
 *   - the job path (GRADING-JOBS-1): the 202 from handleGradeWorksheet (ok, jobId, state, total,
 *     pollAfterMs, pollPath) and the poll body from server/grading/jobs.cjs `viewOf` (ok, jobId,
 *     state, total, done, results[] with `index` + `final`, pollAfterMs while live; `model` + `final`
 *     when done). Job ids are 40 hex chars (jobs.cjs JOB_ID_RE).
 *   - the account's packs: server/routes/packs.cjs `handleMine` for a student with no pack on a trial
 *     (packs [], licensee, boardPassCredit, and `freeTest` = the ONE free test, nothing pinned yet,
 *     from services/testSeriesChecks.cjs freeTestStatus: { paperKey: null, checksPerPaper: 2, used: 0 }).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Page, Request } from "@playwright/test";

import type { TestStudent } from "./signedIn";

const HERE = dirname(fileURLToPath(import.meta.url));
const GOLDEN = join(HERE, "..", "..", "..", "server", "eval", "golden");

export interface GradedStep {
  stepNumber: number;
  description: string;
  status: string;
  marksAwarded: number;
  marksDeducted: number;
  mistakeType: string | null;
  marksAvailable?: number;
  [k: string]: unknown;
}
export interface GradedRow {
  qNumber: number;
  couldNotRead: boolean;
  totalMarks: number;
  marksAwarded: number;
  percentage: number;
  annotatedSteps: GradedStep[];
  mistakeSummary: Record<string, number>;
  marksLostByType: Record<string, number>;
  teacherNote: string;
  [k: string]: unknown;
}
export interface GradedBody {
  ok: true;
  worksheetId: string;
  results: GradedRow[];
  totalQuestions: number;
  gradedCount: number;
  pendingCount: number;
  gradedMarksAwarded: number;
  gradedMarksTotal: number;
  worksheetTotalMarks: number;
  summary: string;
  provider: string;
  model: string;
}

/** The golden set reply (GS-M09-b, parity request) and its first row: a 3-mark answer at 2.5/3. */
const GOLDEN_SET = JSON.parse(readFileSync(join(GOLDEN, "responses", "v2", "GS-M09-b.set.json"), "utf8")) as GradedBody;
export const GOLDEN_ROW: GradedRow = GOLDEN_SET.results[0];

/** The questions as the page sends them (chapterTestQuestionInput). Only what the reply needs. */
interface SentQuestion {
  qNumber: number;
  marks: number;
  questionText?: string;
}

const zeroLoss = () => ({ conceptual: 0, calculation: 0, silly: 0, presentation: 0, unattempted: 0, untyped: 0 });

/** A full-marks row in the golden row's shape: one correct step worth the whole question. */
function fullMarksRow(q: SentQuestion): GradedRow {
  const step = GOLDEN_ROW.annotatedSteps[0];
  return {
    ...GOLDEN_ROW,
    qNumber: q.qNumber,
    totalMarks: q.marks,
    marksAwarded: q.marks,
    percentage: 100,
    annotatedSteps: [
      {
        ...step,
        description: `Complete answer to Q${q.qNumber}`,
        studentWork: `Answer to Q${q.qNumber}`,
        teacherAnnotation: "✓ Correct and complete.",
        status: "correct",
        marksAwarded: q.marks,
        marksDeducted: 0,
        marksAvailable: q.marks,
        mistakeType: null,
        correctedWorking: null,
      },
    ],
    mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0, departure: 0 },
    marksLostByType: zeroLoss(),
    teacherNote: "Complete and well presented.",
    rubric: [{ point: `Complete answer to Q${q.qNumber}`, marks: q.marks }],
  };
}

/**
 * The reply to ONE grade request: the golden row for the first 3-mark question, full marks for the
 * rest. Totals follow buildWorksheetBody (rounded to the half mark).
 */
export function gradedBodyFor(requestBody: { worksheetId: string; questions: SentQuestion[] }): GradedBody {
  const questions = requestBody.questions.filter((q) => (Number(q.qNumber) || 0) > 0 && String(q.questionText ?? "").trim().length > 0);
  const slipQ = questions.find((q) => Number(q.marks) === GOLDEN_ROW.totalMarks)?.qNumber;
  const results = questions.map((q) => (q.qNumber === slipQ ? { ...GOLDEN_ROW, qNumber: q.qNumber } : fullMarksRow(q)));
  const half = (n: number) => Math.round(n * 2) / 2;
  const awarded = results.reduce((s, r) => s + r.marksAwarded, 0);
  const total = results.reduce((s, r) => s + r.totalMarks, 0);
  return {
    ok: true,
    worksheetId: requestBody.worksheetId,
    results,
    totalQuestions: results.length,
    gradedCount: results.length,
    pendingCount: 0,
    gradedMarksAwarded: half(awarded),
    gradedMarksTotal: half(total),
    worksheetTotalMarks: half(total),
    summary: GOLDEN_SET.summary,
    provider: GOLDEN_SET.provider,
    model: GOLDEN_SET.model,
  };
}

/** `GET /api/packs/mine` for a trial student with no pack, whose ONE free test is not pinned yet. */
export function trialPacksMine(student: TestStudent) {
  return {
    packs: [],
    licensee: { name: student.displayName, email: student.email },
    boardPassCredit: { creditInr: 0, expiresAtMs: null, payInr: null },
    freeTest: { paperKey: null, checksPerPaper: 2, used: 0 },
  };
}

export interface GradeCall {
  /** "POST /api/grade-worksheet" or "GET /api/grade-worksheet/jobs/<id>". */
  call: string;
  auth: boolean;
  preferAsync: boolean;
  surface: string | undefined;
  /** POST only: the request body the page sent. */
  body?: { worksheetId: string; subject?: string; questions: SentQuestion[]; imageBase64?: string; imageMimeType?: string };
}

export interface GradeRecorder {
  calls: GradeCall[];
  /** The graded body the stub answered with (null until the POST arrives). */
  graded: () => GradedBody | null;
}

/** A 40-hex job id (jobs.cjs JOB_ID_RE), fixed so a failure names the same job every run. */
export const JOB_ID = "e2e0e2e0e2e0e2e0e2e0e2e0e2e0e2e0e2e0e2e0";
/** The server's poll interval (jobs.cjs POLL_AFTER_MS). */
const POLL_AFTER_MS = 2500;

/**
 * Answer the page's grade with a recorded reply.
 *   mode "job":  the POST (sent with `Prefer: respond-async`) gets the server's 202; the first poll
 *                says `running` with the first row landed; the second says `done` with `final`.
 *   mode "sync": the POST gets the synchronous 200 (what the server sends when jobs are off).
 */
export async function routeGradeWorksheet(page: Page, mode: "job" | "sync"): Promise<GradeRecorder> {
  const calls: GradeCall[] = [];
  let graded: GradedBody | null = null;
  let polls = 0;
  const meta = (req: Request) => {
    const h = req.headers();
    return {
      auth: /^Bearer\s+\S+/.test(h["authorization"] ?? ""),
      preferAsync: /respond-async/i.test(h["prefer"] ?? ""),
      surface: h["x-lazytopper-surface"],
    };
  };
  await page.route(
    (url) => url.pathname === "/api/grade-worksheet" || url.pathname.startsWith("/api/grade-worksheet/jobs/"),
    async (route) => {
      const req = route.request();
      const path = new URL(req.url()).pathname;
      const json = (status: number, body: unknown) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
      if (req.method() === "POST" && path === "/api/grade-worksheet") {
        const body = req.postDataJSON() as GradeCall["body"];
        calls.push({ call: `POST ${path}`, ...meta(req), body });
        graded = gradedBodyFor(body as { worksheetId: string; questions: SentQuestion[] });
        if (mode === "sync") return json(200, graded);
        return json(202, {
          ok: true,
          jobId: JOB_ID,
          state: "running",
          total: graded.results.length,
          pollAfterMs: POLL_AFTER_MS,
          pollPath: `/api/grade-worksheet/jobs/${JOB_ID}`,
        });
      }
      if (req.method() === "GET" && path === `/api/grade-worksheet/jobs/${JOB_ID}` && graded) {
        calls.push({ call: `GET ${path}`, ...meta(req) });
        polls += 1;
        const head = { ok: true, jobId: JOB_ID, total: graded.results.length };
        if (polls === 1) {
          const first = graded.results[0];
          return json(200, { ...head, state: "running", done: 1, pollAfterMs: POLL_AFTER_MS, results: [{ index: 0, final: true, ...first }] });
        }
        return json(200, {
          ...head,
          state: "done",
          done: graded.results.length,
          model: graded.model,
          results: graded.results.map((r, i) => ({ index: i, final: true, ...r })),
          final: graded,
        });
      }
      return route.fallback();
    },
  );
  return { calls, graded: () => graded };
}
