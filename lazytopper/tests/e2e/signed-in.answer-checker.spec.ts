/**
 * UI-E2E-3 — a SIGNED-IN trial student checks one answer in the Answer Checker, end to end in a
 * real browser: sign in through /login, type the question, "Read the question", type the answer,
 * grade, and the scorecard shows the recorded marks, every annotated step and the mistake type.
 * No model is called and nothing is charged: the two AI calls are answered with the repo's own
 * recorded grader output (the same golden item UI-E2E-1's signed-out test uses):
 *   detect  — server/eval/golden/fixtures/ci_detect.audit-S3.json (GS-M09: Maths · Trigonometry)
 *   grade   — server/eval/golden/responses/v2/GS-M09-b.single.json (2.5/3, one calculation slip)
 * Signed in, the calls go out WITHOUT the free-check header (the student's own trial checks).
 *
 * Runs ONLY in the `e2e-desktop-signed-in` project (see signed-in.smoke.spec.ts for how to run it).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { expect, routeApi, signInThroughLogin, test } from "./support/signedIn";

const HERE = dirname(fileURLToPath(import.meta.url));
const GOLDEN = join(HERE, "..", "..", "server", "eval", "golden");
const readJson = <T>(rel: string): T => JSON.parse(readFileSync(join(GOLDEN, rel), "utf8")) as T;

interface GoldenItem {
  id: string;
  question: { text: string; marks: number };
  cases: Array<{ caseId: string; text?: string }>;
}
interface RecordedDetect {
  topicSlug: string;
  subjectDetected: string;
  objective: boolean;
  marksSource: string;
  detectedAnswer: string | null;
}
interface RecordedGrade {
  totalMarks: number;
  marksAwarded: number;
  annotatedSteps: Array<{ stepNumber: number; description: string }>;
}

const ITEM_ID = "GS-M09";
const CASE_ID = "GS-M09-b";
const items = readJson<{ items?: GoldenItem[] } | GoldenItem[]>("data/verify/items.verified.json");
const item = (Array.isArray(items) ? items : (items.items ?? [])).find((i) => i.id === ITEM_ID);
const answerCase = item?.cases.find((c) => c.caseId === CASE_ID);
const detect = readJson<{ items: Record<string, RecordedDetect> }>("fixtures/ci_detect.audit-S3.json").items[ITEM_ID];
const graded = readJson<RecordedGrade>(`responses/v2/${CASE_ID}.single.json`);

/**
 * `/api` calls with no recorded reply, answered 404 by support/network.ts; the page takes its own failure path.
 *   GET  /api/user/progress, POST /api/pay/guest/claim, GET /api/packs/mine — sign-in and Home (see signed-in.smoke.spec.ts)
 *   GET  /api/usage/me — components/usage/useFairUse.ts on the Answer Checker. A failed read leaves the fair-use UI DARK
 *        (null snapshot), the same as the server's own 503 `usage_unavailable`; the check itself is not blocked.
 * A call NOT listed fails the test by name: a new server call on this journey is a change this suite must be told about.
 */
const KNOWN_UNRECORDED_API = new Set([
  "GET /api/user/progress",
  "POST /api/pay/guest/claim",
  "GET /api/packs/mine",
  "GET /api/usage/me",
]);

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "e2e-desktop-signed-in", "signed-in spec: e2e-desktop-signed-in project only");
});

test("signed in: Answer Checker type, read, grade (AI recorded) -> scorecard", async ({ page, student, net, pageErrors }) => {
  expect(item && answerCase?.text && detect, "golden item GS-M09 / case GS-M09-b / its detect record").toBeTruthy();
  const question = item!.question.text;
  const marks = item!.question.marks;
  const detectBody = {
    ok: true,
    detectedMarks: marks,
    detectedSubject: detect.subjectDetected,
    detectedTopic: detect.topicSlug,
    marksSource: detect.marksSource,
    detectedObjective: detect.objective,
    detectedAnswer: detect.detectedAnswer,
    questions: [
      { questionNumber: 1, questionText: question, marks, marksSource: detect.marksSource, objective: detect.objective, answer: detect.detectedAnswer },
    ],
  };

  const aiCalls: Array<{ path: string; freeCheck: string | undefined; auth: boolean }> = [];
  page.on("request", (req) => {
    const path = new URL(req.url()).pathname;
    if (path === "/api/detect-question" || path === "/api/check-solution") {
      const h = req.headers();
      aiCalls.push({ path, freeCheck: h["x-lazytopper-free-check"], auth: /^Bearer\s+\S+/.test(h["authorization"] ?? "") });
    }
  });
  await routeApi(page, {
    "POST /api/detect-question": { body: detectBody },
    "POST /api/check-solution": { body: graded },
  });

  await test.step("sign in", async () => {
    await signInThroughLogin(page, student);
  });

  await test.step("type the question and read it", async () => {
    await page.goto("/check-improve");
    await page.getByRole("textbox", { name: "Type the question" }).fill(question);
    await page.getByRole("button", { name: /Read the question/ }).click();
    await expect(page.getByText(/Detected:\s*Maths · Trigonometry · 3 marks/)).toBeVisible();
  });

  await test.step("type the answer and grade", async () => {
    await page.getByRole("tab", { name: "Type answer" }).click();
    await page.getByRole("textbox", { name: "Type your answer" }).fill(answerCase!.text!);
    const grade = page.getByRole("button", { name: /Grade my answer/ });
    await expect(grade).toBeEnabled();
    await grade.click();
  });

  await test.step("the scorecard shows the recorded marks, steps and mistake type", async () => {
    await expect(page.getByText(`${graded.marksAwarded}/${graded.totalMarks}`, { exact: true }).first()).toBeVisible({ timeout: 20_000 });
    for (const step of graded.annotatedSteps) {
      await expect(page.getByText(step.description, { exact: true }).first(), `step ${step.stepNumber}`).toBeVisible();
    }
    await expect(page.getByText("Calculation slip").first()).toBeVisible();
  });

  // Signed in: both AI calls carry the student's ID token and are NOT free checks.
  expect(aiCalls.map((c) => c.path)).toEqual(["/api/detect-question", "/api/check-solution"]);
  for (const c of aiCalls) {
    expect(c.auth, `${c.path} carries the student's Authorization: Bearer token`).toBe(true);
    expect(c.freeCheck, `${c.path} is not a free check`).toBeUndefined();
  }
  const unexpected = [...new Set(net.unmockedApi)].filter((call) => !KNOWN_UNRECORDED_API.has(call));
  expect(unexpected, "an /api call this suite has not been told about").toEqual([]);
  expect(pageErrors.errors).toEqual([]);
});
