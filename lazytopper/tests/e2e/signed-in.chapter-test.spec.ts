/**
 * UI-E2E-4 — a SIGNED-IN trial student sits a Chapter Test and has the written answers graded, end to
 * end in a real browser: Practice hub -> Test Series -> "Start Real Numbers · Paper 1" (the fixed series
 * paper CT-M01, the student's ONE free test with written marking), Start, tap one MCQ, Submit, upload
 * ONE answer photo, grade — and the result shows the total and a row per graded question.
 *
 * No model is called and nothing is charged: `/api/grade-worksheet` (and its job poll) answer with the
 * recorded reply built in support/gradeWorksheet.ts (server shapes; the golden GS-M09-b row). The
 * student's packs (`/api/packs/mine`) are the server's reply for a trial student with no pack, whose
 * free test is not pinned yet — the state in which the page offers written marking on Paper 1.
 *
 * Two tests: the background JOB path the page asks for (202 -> poll running -> poll done) and the
 * synchronous 200 the server sends when jobs are off.
 *
 * Runs ONLY in the `e2e-desktop-signed-in` project (see signed-in.smoke.spec.ts for how to run it).
 */
import { routeGradeWorksheet, trialPacksMine } from "./support/gradeWorksheet";
import { KNOWN_UNRECORDED_API, expectGradeCalls, expectGradedResult, submitPaper, uploadAndGrade } from "./support/paperJourney";
import { expect, routeApi, signInThroughLogin, test } from "./support/signedIn";

/** CT-M01 (Real Numbers · Paper 1): 15 questions, 31 marks; Section A = Q1-6 (objective, scored on submit), Q7-15 written. */
const PAPER_TOTAL = 31;
const WRITTEN_QNUMBERS = [7, 8, 9, 10, 11, 12, 13, 14, 15];

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "e2e-desktop-signed-in", "signed-in spec: e2e-desktop-signed-in project only");
});

for (const mode of ["job", "sync"] as const) {
  test(`signed in: Chapter Test start, submit, upload, grade (${mode}, AI recorded) -> result`, async ({ page, student, net, pageErrors }) => {
    test.setTimeout(90_000);
    await routeApi(page, { "GET /api/packs/mine": { body: trialPacksMine(student) } });
    const rec = await routeGradeWorksheet(page, mode);

    await test.step("sign in", async () => {
      await signInThroughLogin(page, student);
    });

    await test.step("pick Real Numbers · Paper 1 from the Test Series and start it", async () => {
      await page.goto("/practice-hub?ct=1");
      await page.getByRole("dialog", { name: "Test Series" }).getByRole("button", { name: "Start Real Numbers · Paper 1 →" }).click();
      await expect(page).toHaveURL(/\/chapter-test\/10\/Maths\/real-numbers\?series=1/);
      await expect(page.getByText(/This is your 1 free test — written answers marked step by step/)).toBeVisible({ timeout: 15_000 });
      await page.getByRole("button", { name: "Start the test →" }).click();
      await expect(page.getByText(/Section A · Q1 of 15/)).toBeVisible();
    });

    await test.step("answer one MCQ", async () => {
      const pick = page.getByRole("button", { name: /^C a unique way/ });
      await pick.click();
    });

    const objective = await test.step("submit: the objective section is scored", async () => {
      const o = await submitPaper(page);
      expect(o.objectiveTotal).toBe(6);
      return o;
    });

    await test.step("upload one answer photo and grade", async () => {
      await uploadAndGrade(page);
    });

    await test.step("the result: total, a row per question, the golden steps", async () => {
      await expectGradedResult(page, rec, objective, PAPER_TOTAL);
    });

    expectGradeCalls(rec, mode, "chapter-test", WRITTEN_QNUMBERS);
    const unexpected = [...new Set(net.unmockedApi)].filter((call) => !KNOWN_UNRECORDED_API.has(call));
    expect(unexpected, "an /api call this suite has not been told about").toEqual([]);
    expect(pageErrors.errors).toEqual([]);
  });
}
