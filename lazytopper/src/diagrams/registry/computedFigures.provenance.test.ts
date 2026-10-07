/**
 * DIAGRAMS-1 PR-2a — every computed figure is still backed by the SERVED row.
 *
 * For every binding in the registry:
 *   1. the row is still served (bank minus withheld, or HPQ);
 *   2. every provenance quote is still an exact substring of the named field, and
 *      every number the figure is drawn from appears in its quote;
 *   3. every numeric param has a provenance quote (no number from nowhere);
 *   4. the figure still builds, and its solved scene gives the row's OWN answer.
 *
 * Cross-lane coupling is intended: a content edit to a bound row turns this red, and
 * the binding must be re-read and re-quoted (or dropped) — a wrong figure is worse
 * than none.
 */
import { describe, expect, it } from "vitest";
import { canonicalQuestionBank } from "../../data/canonicalQuestionBank";
import { highlyProbableQuestions } from "../../data/highlyProbableQuestions";
import { ALL_COMPUTED_FIGURE_BINDINGS, buildComputedFigure } from "./index";
import type { ProvenanceField } from "./computedFigureTypes";

type Row = Record<string, unknown>;

const served = new Map<string, Row>();
for (const q of canonicalQuestionBank as unknown as Row[]) served.set(String(q.id), q);
for (const b of highlyProbableQuestions) for (const q of b.questions as unknown as Row[]) if (!served.has(String(q.id))) served.set(String(q.id), q);

function fieldText(r: Row, f: ProvenanceField): string {
  if (f === "questionText") return String(r.questionText ?? r.question ?? "");
  if (f === "solutionSteps") return Array.isArray(r.solutionSteps) ? (r.solutionSteps as string[]).join("\n") : "";
  if (f === "finalAnswer") return String(r.finalAnswer ?? "");
  return String(r.answer ?? "");
}
const FIELDS: ProvenanceField[] = ["questionText", "solutionSteps", "finalAnswer", "answer"];

/** "10sqrt(3) m" ~ "10√3 m", "60 deg" ~ "60°", "30º" ~ "30°", whitespace ignored. */
function norm(s: string): string {
  return s
    .replace(/sqrt\s*\(\s*(\d+(?:\.\d+)?)\s*\)/gi, "√$1")
    .replace(/\s*deg\b/g, "°")
    .replace(/º/g, "°")
    .replace(/\s+/g, "");
}

const NON_NUMERIC = new Set(["template", "view", "unit", "scaleFree", "showL", "object", "subject", "style", "topView"]);

describe("computed figures — provenance against the served rows", () => {
  it("the registry is not empty", () => {
    expect(ALL_COMPUTED_FIGURE_BINDINGS.length).toBeGreaterThan(0);
  });

  it("no (question, slot, part) is bound twice", () => {
    const keys = ALL_COMPUTED_FIGURE_BINDINGS.map((b) => `${b.questionId}|${b.slot}|${b.part ?? ""}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  for (const b of ALL_COMPUTED_FIGURE_BINDINGS) {
    describe(b.questionId, () => {
      const row = served.get(b.questionId);

      it("is a SERVED row", () => {
        expect(row, `${b.questionId} is not served`).toBeDefined();
      });

      it("every number is quoted from the row, and every quote is still in the row", () => {
        if (!row) return expect(row).toBeDefined();
        const params = b.params as unknown as Record<string, unknown>;
        for (const p of b.provenance) {
          expect(fieldText(row, p.field), `${p.param}: quote gone from ${p.field}`).toContain(p.quote);
          if (p.derived) continue;
          const v = params[p.param];
          expect(v, `provenance names a param the binding does not have: ${p.param}`).toBeDefined();
          const token = typeof v === "number" ? `${v}°` : norm(String(v));
          expect(norm(p.quote), `${p.param}=${String(v)} not in its quote`).toContain(token);
        }
        for (const [k, v] of Object.entries(params)) {
          if (NON_NUMERIC.has(k) || v === undefined) continue;
          expect(b.provenance.some((p) => p.param === k), `param ${k} has no provenance`).toBe(true);
        }
      });

      it("builds, and its solved scene gives the row's own answer", () => {
        if (!row) return expect(row).toBeDefined();
        const res = buildComputedFigure(b);
        expect(res, "builder refused a registered binding").not.toBeNull();
        expect(b.expect.length).toBeGreaterThan(0);
        for (const e of b.expect) {
          expect(FIELDS.some((f) => fieldText(row, f).includes(e.quote)), `answer quote gone: ${e.quote}`).toBe(true);
          const m = res!.model[e.quantity];
          expect(m, `model has no ${e.quantity}`).toBeTypeOf("number");
          const got = m * (e.factor ?? 1);
          const offPct = (Math.abs(got - e.value) / Math.abs(e.value)) * 100;
          expect(offPct, `${e.quantity}: model ${got} vs row ${e.value}`).toBeLessThanOrEqual(e.tolPct);
        }
      });
    });
  }
});
