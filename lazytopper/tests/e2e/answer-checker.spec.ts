/**
 * UI-E2E-1 (f) — the signed-out FREE Answer Checker, end to end in a real browser, with the
 * two AI calls MOCKED. No model is called and nothing is charged.
 *
 * The responses are the repo's own recorded grader output, not shapes invented here:
 *   detect  — built from server/eval/golden/fixtures/ci_detect.audit-S3.json (item GS-M09,
 *             the audit's recorded detect-question read: Maths · Trigonometry, not objective)
 *   grade   — server/eval/golden/responses/v2/GS-M09-b.single.json (the stored live grader
 *             response for golden case GS-M09-b: 2.5/3, one calculation slip in step 2)
 * The question and the typed answer are that golden item's own (data/verify/items.verified.json:
 * GS-M09's question text and case GS-M09-b's answer transcript).
 *
 * The free check also needs a limited-use App Check token; support/network.ts stubs
 * reCAPTCHA Enterprise and the token exchange, so the request carries the real header shape.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "./support/fixtures";

const HERE = dirname(fileURLToPath(import.meta.url));
const GOLDEN = join(HERE, "..", "..", "server", "eval", "golden");
const readJson = <T>(rel: string): T => JSON.parse(readFileSync(join(GOLDEN, rel), "utf8")) as T;

interface GoldenItem {
  id: string;
  subject: string;
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
interface GradeStep {
  stepNumber: number;
  description: string;
  status: string;
  marksAwarded: number;
}
interface RecordedGrade {
  ok: boolean;
  totalMarks: number;
  marksAwarded: number;
  annotatedSteps: GradeStep[];
}

const ITEM_ID = "GS-M09";
const CASE_ID = "GS-M09-b";

const items = readJson<{ items?: GoldenItem[] } | GoldenItem[]>("data/verify/items.verified.json");
const item = (Array.isArray(items) ? items : (items.items ?? [])).find((i) => i.id === ITEM_ID);
const answerCase = item?.cases.find((c) => c.caseId === CASE_ID);
const detect = readJson<{ items: Record<string, RecordedDetect> }>("fixtures/ci_detect.audit-S3.json").items[ITEM_ID];
const graded = readJson<RecordedGrade>(`responses/v2/${CASE_ID}.single.json`);

test("signed-out free Answer Checker: type, read, grade (AI mocked) -> scorecard with marks and annotated steps", async ({
  page,
  pageErrors,
  net,
}) => {
  expect(item, `${ITEM_ID} in data/verify/items.verified.json`).toBeTruthy();
  expect(answerCase?.text, `${CASE_ID} has a typed answer`).toBeTruthy();
  expect(detect, `${ITEM_ID} in ci_detect.audit-S3.json`).toBeTruthy();
  const question = item!.question.text;
  const marks = item!.question.marks;

  // The detect-question response, in the server's success shape (golden/shapes/snapshot.json).
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

  const calls: Array<{ path: string; freeCheck: string | undefined; appCheck: boolean }> = [];
  const record = (path: string, headers: Record<string, string>) =>
    calls.push({ path, freeCheck: headers["x-lazytopper-free-check"], appCheck: Boolean(headers["x-firebase-appcheck"]) });
  await page.route("**/api/detect-question", (route) => {
    record("/api/detect-question", route.request().headers());
    return route.fulfill({ json: detectBody });
  });
  await page.route("**/api/check-solution", (route) => {
    record("/api/check-solution", route.request().headers());
    return route.fulfill({ json: graded });
  });

  await page.goto("/check-improve");
  // Signed out, the page opens on the one-tap board question; close it to reach the checker.
  await page.getByTestId("ci-demo-close").click();

  await page.getByRole("textbox", { name: "Type the question" }).fill(question);
  await page.getByRole("button", { name: /Read the question/ }).click();
  await expect(page.getByText(/Detected:\s*Maths · Trigonometry · 3 marks/)).toBeVisible();

  await page.getByRole("tab", { name: "Type answer" }).click();
  await page.getByRole("textbox", { name: "Type your answer" }).fill(answerCase!.text!);
  const grade = page.getByRole("button", { name: /Grade my answer/ });
  await expect(grade).toBeEnabled();
  await grade.click();

  // The scorecard: the recorded marks, and every annotated step's description and status.
  await expect(page.getByText(`${graded.marksAwarded}/${graded.totalMarks}`, { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/annotated steps/i).first()).toBeVisible();
  for (const step of graded.annotatedSteps) {
    await expect(page.getByText(step.description, { exact: true }).first(), `step ${step.stepNumber}`).toBeVisible();
  }
  await expect(page.getByText("Partial", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Calculation slip").first()).toBeVisible();

  // Both AI calls went out as FREE checks carrying an App Check token — the real wire shape.
  expect(calls.map((c) => c.path)).toEqual(["/api/detect-question", "/api/check-solution"]);
  for (const c of calls) {
    expect(c.freeCheck, `${c.path} carries X-Lazytopper-Free-Check`).toBe("1");
    expect(c.appCheck, `${c.path} carries X-Firebase-AppCheck`).toBe(true);
  }
  expect(pageErrors.errors, "uncaught page errors / console errors").toEqual([]);
  expect(net.unmockedApi, "API calls with no fixture").toEqual([]);
});
