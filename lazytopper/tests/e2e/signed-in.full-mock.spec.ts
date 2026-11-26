/**
 * UI-E2E-4 — a SIGNED-IN trial student sits a Full Mock (a full-length board paper) and has the written
 * answers graded, end to end in a real browser: Practice hub -> Test Series -> Full-length tests ->
 * "Start Maths · Full-Length Test 1" (the fixed series paper, the student's ONE free test with written
 * marking), Start, Submit, upload ONE answer photo, grade — and the result shows the total and a row per
 * graded question.
 *
 * No model is called and nothing is charged: `/api/grade-worksheet` is answered on the background JOB
 * path the page asks for (202 -> poll running -> poll done) with the recorded reply built in
 * support/gradeWorksheet.ts (server shapes; the golden GS-M09-b row). The synchronous 200 is covered
 * by signed-in.chapter-test.spec.ts: both pages send the grade through the same client call
 * (ai/aiClient.ts gradeWorksheet), only the surface header differs, and this spec asserts it.
 *
 * Runs ONLY in the `e2e-desktop-signed-in` project (see signed-in.smoke.spec.ts for how to run it).
 */
import { routeGradeWorksheet, trialPacksMine } from "./support/gradeWorksheet";
import { KNOWN_UNRECORDED_API, expectGradeCalls, expectGradedResult, submitPaper, uploadAndGrade } from "./support/paperJourney";
import { expect, routeApi, signInThroughLogin, test } from "./support/signedIn";

/** Maths Full-Length Test 1: 38 questions, 80 marks; Section A = Q1-20 (objective, scored on submit), Q21-38 written. */
const PAPER_TOTAL = 80;
const WRITTEN_QNUMBERS = Array.from({ length: 18 }, (_, i) => 21 + i);

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "e2e-desktop-signed-in", "signed-in spec: e2e-desktop-signed-in project only");
});

test("signed in: Full Mock start, submit, upload, grade (job, AI recorded) -> result", async ({ page, student, net, pageErrors }) => {
  test.setTimeout(90_000);
  await routeApi(page, { "GET /api/packs/mine": { body: trialPacksMine(student) } });
  const rec = await routeGradeWorksheet(page, "job");

  await test.step("sign in", async () => {
    await signInThroughLogin(page, student);
  });

  await test.step("pick Maths · Full-Length Test 1 from the Test Series and start it", async () => {
    await page.goto("/practice-hub?ct=1");
    const series = page.getByRole("dialog", { name: "Test Series" });
    await series.getByRole("button", { name: "Full-length tests" }).click();
    await series.getByRole("button", { name: "Start Maths · Full-Length Test 1 →" }).click();
    await expect(page).toHaveURL(/\/full-mock\/10\/Maths\?paper=1/);
    await expect(page.getByRole("heading", { name: "Maths · Full-Length Test 1", level: 1 })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/This is your 1 free test — written answers marked step by step/)).toBeVisible();
    await page.getByRole("button", { name: "Start the mock →" }).click();
    await expect(page.getByRole("button", { name: "Submit & exit →" })).toBeVisible({ timeout: 15_000 });
  });

  const objective = await test.step("submit: the objective section is scored", async () => {
    const o = await submitPaper(page);
    expect(o.objectiveTotal).toBe(20);
    return o;
  });

  await test.step("upload one answer photo and grade", async () => {
    await uploadAndGrade(page);
  });

  await test.step("the result: total, a row per question, the golden steps", async () => {
    await expectGradedResult(page, rec, objective, PAPER_TOTAL);
  });

  expectGradeCalls(rec, "job", "full-mock", WRITTEN_QNUMBERS);
  const unexpected = [...new Set(net.unmockedApi)].filter((call) => !KNOWN_UNRECORDED_API.has(call));
  expect(unexpected, "an /api call this suite has not been told about").toEqual([]);
  expect(pageErrors.errors).toEqual([]);
});
