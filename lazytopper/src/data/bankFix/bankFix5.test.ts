// @vitest-environment node
/**
 * BANK-FIX-5 PR-1 — one table-driven pin over the ledger (`BANK_FIX_5`), read through the app's own assembled data
 * (served bank, predicted maps, HPQ buckets), never a source text-scan. Per ledger entry:
 *   - the id still resolves on its surface (ids are never changed);
 *   - fixed: the SERVED row carries the key (answer / finalAnswer) and none of the removed text; an MCQ key resolves to
 *     an option through resolveCorrectOptionIndex;
 *   - withheld: in WITHHELD_QUESTION_IDS and not served;
 *   - stemChanged only on 2026-AP-SA-02 and 2026-AB-SA-06.
 * Ruling 2 (Others rows carry no year / set / isPYQ) is enforced bank-wide by bankFix1.pr2.test.ts.
 * This file never reads the clock.
 */
import { describe, expect, it } from "vitest";
import { RAW_CANONICAL_QUESTION_BANK, WITHHELD_QUESTION_IDS, canonicalQuestionBank } from "../canonicalQuestionBank";
import { predictedQuestionsById } from "../predictedQuestions";
import { predictedQuestionsScience } from "../predictedQuestionsScience";
import { highlyProbableQuestions } from "../highlyProbableQuestions";
import { resolveCorrectOptionIndex } from "../../lib/objectiveScoring";
import { BANK_FIX_5 } from "./bankFix5Ledger";

type Row = Record<string, unknown> & { id: string };
const rawIds = new Set((RAW_CANONICAL_QUESTION_BANK as unknown as Row[]).map((q) => q.id));
const servedById = new Map((canonicalQuestionBank as unknown as Row[]).map((q) => [q.id, q]));
const predictedById = new Map<string, Row>([
  ...Object.values(predictedQuestionsById as unknown as Record<string, Row>).map((q) => [q.id, q] as const),
  ...(predictedQuestionsScience as unknown as Row[]).map((q) => [q.id, q] as const),
]);
const hpqById = new Map(
  highlyProbableQuestions.flatMap((b) => b.questions).map((q) => [(q as unknown as Row).id, q as unknown as Row] as const),
);
const servedRow = (e: (typeof BANK_FIX_5)[number]) =>
  e.surface === "bank" ? servedById.get(e.id) : e.surface === "predicted" ? predictedById.get(e.id) : hpqById.get(e.id);
const text = (q: Row, fields: readonly string[]) =>
  fields.flatMap((f) => (Array.isArray(q[f]) ? (q[f] as unknown[]).map(String) : q[f] == null ? [] : [String(q[f])])).join("\n");
const STEM_RULINGS = ["2026-AP-SA-02", "2026-AB-SA-06"];

describe("BANK-FIX-5 · ledger pins", () => {
  it("36 unique entries; APQ-S-EYE-002 excluded; stemChanged only on the two ruled rows", () => {
    expect(BANK_FIX_5.length).toBe(36);
    expect(new Set(BANK_FIX_5.map((e) => e.id)).size).toBe(36);
    expect(BANK_FIX_5.some((e) => e.id === "APQ-S-EYE-002")).toBe(false);
    expect(BANK_FIX_5.filter((e) => e.stemChanged).map((e) => e.id).sort()).toEqual([...STEM_RULINGS].sort());
  });

  it.each(BANK_FIX_5.map((e) => [e.id, e] as const))("%s", (id, e) => {
    if (e.surface === "bank") expect(rawIds.has(id), "id unchanged in the raw bank").toBe(true);
    // BANK-UNWITHHOLD-1 (2026-10-10): PYQ-S-2025-MAG-006 was withheld here for a wrong key + unbound figures; BANK-FIX-6 re-keyed
    // it, its figure is bound, and a blind re-solve agreed, so it is served again (the ledger stays the record of the withhold).
    if (id === "PYQ-S-2025-MAG-006") {
      expect(WITHHELD_QUESTION_IDS.has(id), "served again").toBe(false);
      expect(servedById.has(id), "served").toBe(true);
      return;
    }
    if (e.verdict === "withheld") {
      expect(WITHHELD_QUESTION_IDS.has(id), "withheld").toBe(true);
      expect(servedById.has(id), "not served").toBe(false);
      return;
    }
    const q = servedRow(e);
    expect(q, "served on its surface").toBeDefined();
    expect(e.surface !== "bank" || !WITHHELD_QUESTION_IDS.has(id), "not withheld").toBe(true);
    // the key a student is shown: finalAnswer when present, else answer
    const key = text(q!, [q!.finalAnswer != null ? "finalAnswer" : "answer"]);
    for (const k of e.keyMustContain ?? []) expect(key, `key carries ${k}`).toContain(k);
    const all = text(q!, ["questionText", "question", "answer", "finalAnswer", "explanation", "solutionSteps"]);
    for (const k of e.mustNotContain ?? []) expect(all, `removed: ${k}`).not.toContain(k);
    const options = (q!.options as string[] | undefined) ?? [];
    if (options.length) expect(resolveCorrectOptionIndex(undefined, String(q!.answer ?? ""), options)).toBeGreaterThanOrEqual(0);
  });
});
