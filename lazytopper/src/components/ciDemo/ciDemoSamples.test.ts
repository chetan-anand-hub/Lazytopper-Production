/**
 * CI-SOFT-1 — the six sample answers: integrity, copy lint, and the bank-free rule.
 * The questions are read from the bank files AS TEXT (like pages/CheckYourAnswerPage.test.tsx) so a
 * bank edit fails here, never in front of a student; the samples module itself imports no bank.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { STORED_MISTAKE_TYPES, MISTAKE_GROUPS } from "../../lib/mistakeDisplay";
import {
  CI_DEMO_COPY,
  CI_DEMO_ORDER,
  CI_DEMO_SAMPLES,
  CI_DEMO_STEP_MS,
  formatMarks,
  sampleMarksLost,
  sampleTotal,
} from "./ciDemoSamples";

const LAZYTOPPER = resolve(__dirname, "../../..");
/** The personality guide's hard rules (the full lint, with Hinglish / selling words, runs in guide/copyLint.test.ts). */
function lineProblems(line: string, limit = 22): string[] {
  const out: string[] = [];
  const n = line.trim().split(/\s+/).filter(Boolean).length;
  if (n > limit) out.push(`${n} words (max ${limit})`);
  if ((line.match(/!/g) ?? []).length > 1) out.push("more than one !");
  if (line.includes("½")) out.push("½ glyph");
  return out;
}

const all = CI_DEMO_ORDER.map((k) => CI_DEMO_SAMPLES[k]);

describe("CI-SOFT-1 samples — the six", () => {
  it("there are exactly six, in the walking order", () => {
    expect(all).toHaveLength(6);
    expect(new Set(CI_DEMO_ORDER).size).toBe(6);
    for (const k of CI_DEMO_ORDER) expect(CI_DEMO_SAMPLES[k].key).toBe(k);
  });

  for (const s of all) {
    describe(s.key, () => {
      it("questionText equals the bank row's text, read as file text", () => {
        const source = readFileSync(resolve(LAZYTOPPER, "src/data/questionBanks/class10", s.bankFile), "utf8");
        const start = source.indexOf(`id: "${s.bankId}"`);
        expect(start, `${s.bankId} not found in ${s.bankFile}`).toBeGreaterThanOrEqual(0);
        const row = source.slice(start, source.indexOf("pyqYear", start));
        const match = row.match(/questionText: "((?:[^"\\]|\\.)*)"/);
        expect(match).not.toBeNull();
        expect(JSON.parse(`"${(match as RegExpMatchArray)[1]}"`)).toBe(s.questionText);
        expect(row).toContain(`marks: ${s.marks}`);
      });

      it("marks add up: Σmax = marks, 0 ≤ awarded ≤ max, total = Σawarded", () => {
        expect(s.steps.reduce((n, st) => n + st.max, 0)).toBe(s.marks);
        for (const st of s.steps) {
          expect(st.awarded).toBeGreaterThanOrEqual(0);
          expect(st.awarded).toBeLessThanOrEqual(st.max);
          expect(st.line).toBeGreaterThanOrEqual(0);
          expect(st.line).toBeLessThan(s.lines.length);
        }
        expect(sampleTotal(s)).toBe(s.steps.reduce((n, st) => n + st.awarded, 0));
      });

      it("types are stored types or null; every lost mark has a note", () => {
        for (const st of s.steps) {
          expect(st.type === null || (STORED_MISTAKE_TYPES as readonly string[]).includes(st.type)).toBe(true);
          if (st.awarded < st.max) expect(st.note, `${s.key}: "${st.point}"`).toBeTruthy();
        }
      });

      it("the product block's parts sum to the marks lost (G3)", () => {
        const m = sampleMarksLost(s);
        const sum = m.conceptual + m.calculation + m.silly + m.presentation + m.unattempted + m.untyped;
        expect(sum).toBe(s.marks - sampleTotal(s));
        expect(m.untyped).toBe(0);
        expect(m.unattempted).toBe(0);
      });

      it("every say / summary is within the personality guide (≤ 22 words, no ½, ≤ 1 !)", () => {
        for (const line of [...s.steps.map((st) => st.say), s.summary, s.takeaway]) {
          expect(lineProblems(line), line).toEqual([]);
        }
      });
    });
  }

  it("every stored mistake type appears across the six", () => {
    const seen = new Set(all.flatMap((s) => s.steps.map((st) => st.type)).filter(Boolean));
    for (const t of STORED_MISTAKE_TYPES) expect(seen.has(t), t).toBe(true);
  });

  it("sample 2: the carried-over line is charged once, to the same bucket, with no second chip", () => {
    const s = CI_DEMO_SAMPLES.polyConcept;
    expect(s.steps[3]).toMatchObject({ type: null, followsFrom: 2, awarded: 0 });
    expect(sampleMarksLost(s)).toMatchObject({ conceptual: 1, untyped: 0 });
  });

  it("marks land in the three product groups only (no fourth cell is invented)", () => {
    expect(MISTAKE_GROUPS).toHaveLength(3);
    const m = sampleMarksLost(CI_DEMO_SAMPLES.circ);
    expect(m.presentation).toBe(0.5);
    expect(m.calculation).toBe(0.5);
  });

  it("the card's own lines obey the lint", () => {
    for (const line of [CI_DEMO_COPY.l1, CI_DEMO_COPY.l2, CI_DEMO_COPY.l3, CI_DEMO_COPY.l4, CI_DEMO_COPY.l9]) {
      expect(lineProblems(line), line).toEqual([]);
    }
  });

  it("the red pen reveals one step every 1.8 s", () => {
    expect(CI_DEMO_STEP_MS).toBe(1800);
  });

  it("formatMarks writes ½ for marks only", () => {
    expect([0, 0.5, 1, 1.5, 2].map(formatMarks)).toEqual(["0", "½", "1", "1½", "2"]);
  });

  it("★ the samples module imports no bank module (/check-improve stays bank-free statically)", () => {
    const src = readFileSync(resolve(LAZYTOPPER, "src/components/ciDemo/ciDemoSamples.ts"), "utf8");
    const imports = [...src.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]);
    for (const i of imports) expect(i).not.toMatch(/data\/|questionBank|bankFix/);
  });
});
