/**
 * TS-THEMES-1 - every focus set BUILDS from its pins exactly as the Full Mock page builds it (buildFocusSet, the real lazy entry):
 * every pinned id resolves (nothing left out), the paper is written-only (Sections B-E, no objective), its marks are the pinned
 * marks, its time limit the pinned minutes, and its worksheet id carries the focus prefix the server admits.
 */
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { ensureBankSubject } from "../../data/bankChapters/loader";
import { fullMockObjectiveQuestions, fullMockSubjectiveQuestions } from "../../components/fullmock/fullMockBlueprint";
import { focusSetCodeOfWorksheetId, focusSetWorksheetId, focusSets } from "./focusSets";
import { allFocusSetSpecs, buildFocusSet, focusSetSpecOf } from "./pinnedFocusSet";

const server = createRequire(import.meta.url)("../../../server/services/testSeriesChecks.cjs") as {
  loadManifest: (f: unknown, l: { error: (m: string) => void }) => unknown;
  MANIFEST_FILES: string[];
  seriesPaperOf: (body: unknown, m: unknown, opts?: unknown) => { key: string } | null;
  verifySubmission: (body: unknown, paper: unknown) => { ok: boolean; reason?: string };
};

describe("TS-THEMES-1 pinned focus sets build whole", () => {
  it("all 30 sets: no missing id, written-only, marks + minutes as pinned, focus worksheet id", async () => {
    await ensureBankSubject("Maths");
    await ensureBankSubject("Science");
    expect(Object.keys(allFocusSetSpecs())).toHaveLength(30);
    const manifest = server.loadManifest(server.MANIFEST_FILES, { error: () => {} });
    for (const f of focusSets()) {
      const spec = focusSetSpecOf(f.code);
      expect(spec, f.code).not.toBeNull();
      const built = await buildFocusSet(f, { worksheetId: focusSetWorksheetId("fm-test-1", f), code: "FM-M-#01", name: "Maths · Mock #01", createdAt: "2026-01-01T00:00:00.000Z" });
      expect(built, f.code).not.toBeNull();
      const paper = built!.drawn.paper;
      expect(built!.missingIds, f.code).toEqual([]);
      expect(paper.questions.map((q) => String(q.id)), f.code).toEqual(spec!.ids);
      expect(paper.questions.map((q) => q.section).join(""), f.code).toBe(spec!.sections);
      expect(paper.questions.map((q) => q.qNumber), f.code).toEqual(spec!.ids.map((_, i) => i + 1));
      expect(fullMockObjectiveQuestions(paper), f.code).toHaveLength(0);
      expect(fullMockSubjectiveQuestions(paper).map((q) => String(q.id)), f.code).toEqual(spec!.ids);
      expect(built!.drawn.totalMarks, f.code).toBe(spec!.marks);
      expect(built!.durationMs, f.code).toBe(spec!.minutes * 60_000);
      expect(built!.drawn.enoughQuestions, f.code).toBe(true);
      expect(paper.subject, f.code).toBe(f.subject);
      expect(focusSetCodeOfWorksheetId(paper.worksheetId), f.code).toBe(f.code);
      for (const q of paper.questions) expect((q.solutionSteps ?? []).length, `${f.code} ${q.id} has its marking scheme`).toBeGreaterThan(0);
      // The SERVER admits the grading request this paper produces (the request body shape chapterTestGradeService sends): the
      // worksheet id names THIS set, and every written question's id + exact text match the manifest - so the check is counted on it.
      const body = {
        worksheetId: paper.worksheetId,
        questions: fullMockSubjectiveQuestions(paper).map((q) => ({ qNumber: q.qNumber, questionId: String(q.id), questionText: q.questionText })),
      };
      const sp = server.seriesPaperOf(body, manifest);
      expect(sp?.key, f.code).toBe(`TS-${f.code}`);
      expect(server.verifySubmission(body, sp), f.code).toEqual({ ok: true });
      expect(server.seriesPaperOf(body, manifest, { focusDisabled: true }), `${f.code} under TS_FOCUS_SETS_DISABLED`).toBeNull();
    }
  }, 300_000);
});
