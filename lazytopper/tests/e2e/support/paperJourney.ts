/**
 * UI-E2E-4 — the shared steps of a SIGNED-IN paper (Chapter Test / Full Mock) journey after the paper
 * is started: submit, upload ONE answer photo, grade (recorded reply, support/gradeWorksheet.ts), and
 * the result: the total, every per-question row the reply graded, and the golden row's steps.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Page } from "@playwright/test";

import { GOLDEN_ROW, type GradeRecorder } from "./gradeWorksheet";
import { expect, test } from "./signedIn";

const HERE = dirname(fileURLToPath(import.meta.url));
/** A SYNTHETIC answer photo already in the repo (server/eval/golden/images, manifest `synthetic: true`), 264 KB JPEG. */
export const ANSWER_PHOTO = join(HERE, "..", "..", "..", "server", "eval", "golden", "images", "GS-M09-b.compressed.jpg");

/**
 * `/api` calls with no recorded reply on this journey, answered 404 by support/network.ts; the page takes its own path.
 *   GET  /api/user/progress, POST /api/pay/guest/claim — sign-in (see signed-in.smoke.spec.ts)
 *   GET  /api/usage/me    — components/usage/useFairUse.ts: a failed read leaves the fair-use UI dark (as the server's 503).
 *   POST /api/usage/paper — ai/aiClient.ts paperPassFor: no pass is NOT an error; the grade is sent without one.
 * A call NOT listed fails the test by name.
 */
export const KNOWN_UNRECORDED_API = new Set([
  "GET /api/user/progress",
  "POST /api/pay/guest/claim",
  "GET /api/usage/me",
  "POST /api/usage/paper",
]);

const fmt = (n: number) => String(Math.round(n * 2) / 2);

/** Submit the (started) paper, confirm, and read the objective score the upload step shows. */
export async function submitPaper(page: Page): Promise<{ objectiveAwarded: number; objectiveTotal: number }> {
  await page.getByRole("button", { name: "Submit & exit →" }).click();
  await page.getByRole("dialog", { name: "Confirm submit" }).getByRole("button", { name: "Submit now →" }).click();
  // The partial scorecard opens over the page; its "Upload" leads to the upload step.
  const card = page.getByRole("dialog", { name: "Session scorecard" });
  await expect(card).toBeVisible({ timeout: 15_000 });
  await card.getByRole("button", { name: /^Upload / }).click();
  const line = page.getByText(/objective scored \d+(?:\.\d+)?\/\d+/).first();
  await expect(line).toBeVisible();
  const m = /objective scored (\d+(?:\.\d+)?)\/(\d+)/.exec(await line.innerText());
  expect(m, "the upload step names the objective score").toBeTruthy();
  return { objectiveAwarded: Number(m![1]), objectiveTotal: Number(m![2]) };
}

/** Pick ONE photo through the desktop file chooser, send the whole photo, and grade. */
export async function uploadAndGrade(page: Page): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: /^Upload your written answers/ }).click();
  await (await chooser).setFiles(ANSWER_PHOTO);
  await page.getByRole("dialog", { name: "Crop your photo" }).getByRole("button", { name: "Use whole photo" }).click();
  const grade = page.getByRole("button", { name: /Grade my written answers/ });
  await expect(grade).toBeEnabled();
  await grade.click();
}

/**
 * The result: the paper's total (objective + the reply's graded marks) on the page and on the scorecard,
 * one row per graded question with its marks, and the golden row's steps and mistake type.
 */
export async function expectGradedResult(
  page: Page,
  rec: GradeRecorder,
  objective: { objectiveAwarded: number },
  paperTotal: number,
): Promise<void> {
  await expect.poll(() => rec.graded() !== null, { message: "the grade request reached the recorded stub", timeout: 15_000 }).toBe(true);
  const graded = rec.graded();
  const total = `${fmt(objective.objectiveAwarded + graded!.gradedMarksAwarded)} / ${paperTotal}`;
  await expect(page.getByText(new RegExp(`fully graded — ${total.replace(/\./g, "\\.")}`)).first()).toBeVisible({ timeout: 30_000 });
  const card = page.getByRole("dialog", { name: "Session scorecard" });
  await expect(card).toBeVisible();
  await expect(card.getByText(new RegExp(`^${total.replace(/\./g, "\\.")}$`)).first()).toBeVisible();
  // One graded-answer card per question (ResultsScorecard GradedAnswerCard: `.lt-sc__ga`, its head `.lt-sc__ga-top`).
  const row = (qNumber: number) => card.locator(".lt-sc__ga").filter({ has: page.locator(".lt-sc__ga-top", { hasText: new RegExp(`^Question ${qNumber} · `) }) });
  await test.step("a row per graded question, with the reply's marks", async () => {
    for (const r of graded!.results) {
      const head = row(r.qNumber).locator(".lt-sc__ga-top");
      await expect(head, `row Q${r.qNumber}`).toHaveCount(1);
      await expect(head).toHaveText(`Question ${r.qNumber} · ${r.totalMarks} marks${fmt(r.marksAwarded)} / ${r.totalMarks}`);
    }
  });
  await test.step("the golden row: its steps and its calculation slip", async () => {
    const slip = graded!.results.find((r) => r.marksAwarded < r.totalMarks);
    expect(slip, "the reply carries the golden 2.5/3 row").toBeTruthy();
    const slipRow = row(slip!.qNumber);
    for (const step of GOLDEN_ROW.annotatedSteps) {
      await expect(slipRow.getByText(step.description, { exact: false }).first(), `step ${step.stepNumber}`).toBeVisible();
    }
    await expect(slipRow.getByText("Calculation slip", { exact: true }).first()).toBeVisible();
  });
}

/** The grade went out as the signed-in student's paper grade, and the job (if any) was polled to the end. */
export function expectGradeCalls(
  rec: GradeRecorder,
  mode: "job" | "sync",
  surface: "chapter-test" | "full-mock",
  writtenQNumbers: number[],
): void {
  const posts = rec.calls.filter((c) => c.call.startsWith("POST "));
  expect(posts, "ONE grade request").toHaveLength(1);
  const post = posts[0];
  expect(post.auth, "the grade carries the student's Bearer token").toBe(true);
  expect(post.preferAsync, "the page asks for a background job (Prefer: respond-async)").toBe(true);
  expect(post.surface).toBe(surface);
  expect(post.body?.imageMimeType).toBe("image/jpeg");
  expect((post.body?.imageBase64 ?? "").length, "the photo is sent").toBeGreaterThan(1000);
  expect(post.body?.questions.map((q) => q.qNumber)).toEqual(writtenQNumbers);
  const polls = rec.calls.filter((c) => c.call.startsWith("GET "));
  if (mode === "sync") {
    expect(polls, "a synchronous 200 is never polled").toHaveLength(0);
  } else {
    expect(polls.length, "the job is polled until it is done").toBe(2);
    for (const p of polls) expect(p.auth, "each poll carries the Bearer token").toBe(true);
  }
}
