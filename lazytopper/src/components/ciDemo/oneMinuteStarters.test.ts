/**
 * ONE-MINUTE-1 R3 — the guard that keeps the ladder's six MCQs real: each id is loaded from the ASSEMBLED bank and must
 * still be a served CBSE board row, Section A, 1 mark, four options with exactly one matching the answer, no figure,
 * inside the 2026-27 syllabus (the notes' own recogniser = syllabusGuard's banned sub-topics), with an explanatory first solution step.
 */
import { describe, expect, it } from "vitest";
import { ensureBankChapters, bankChaptersFor, getBankRows, isAiGeneratedBankId } from "../../data/bankChapters/loader";
import { isGeneratedOrAuthoredRow, syllabusExclusion } from "../../lib/boardQuestions/selectionRule";
import { needsFigureOrTable } from "../checkimprove/boardQuestionPick";
import { desktopTopicBySlug } from "../../lib/desktop/topics";
import { class10TopicRegistry } from "../../data/class10TopicRegistry";
import { class10ScienceTopicTrendList } from "../../data/class10ScienceTopicTrends";
import { CI_DEMO_SAMPLES } from "./ciDemoSamples";
import { STARTER_ROWS } from "./oneMinuteStarterRows";
import { ONE_MINUTE_STARTERS, STARTER_WEIGHTAGE, correctIndex, pickStarter, visitSeed, whyLine } from "./oneMinuteStarters";

type Row = Record<string, unknown>;

describe("ONE-MINUTE-1 starters — six real board MCQs", () => {
  it("is exactly 3 Maths + 3 Science, unique ids", () => {
    expect(ONE_MINUTE_STARTERS).toHaveLength(6);
    expect(ONE_MINUTE_STARTERS.filter((s) => s.subject === "Maths")).toHaveLength(3);
    expect(ONE_MINUTE_STARTERS.filter((s) => s.subject === "Science")).toHaveLength(3);
    expect(new Set(ONE_MINUTE_STARTERS.map((s) => s.bankId)).size).toBe(6);
  });

  for (const st of ONE_MINUTE_STARTERS) {
    it(`${st.bankId} is still a usable board MCQ in the assembled bank`, async () => {
      await ensureBankChapters(bankChaptersFor([st.topicKey]));
      const row = (getBankRows(bankChaptersFor([st.topicKey])) as unknown as Row[]).find((r) => r.id === st.bankId);
      expect(row, "row missing from the served bank").toBeTruthy();
      const r = row as Row;
      expect(r.subject).toBe(st.subject);
      expect(r.topicKey).toBe(st.topicKey);
      expect(desktopTopicBySlug(st.topicKey)).toBeTruthy();
      // CBSE-origin, served, not generated / authored / other-sourced.
      expect(isAiGeneratedBankId(st.bankId)).toBe(false);
      expect(isGeneratedOrAuthoredRow(r)).toBe(false);
      expect(r.sourceOverride).not.toBe("others");
      expect(String(r.pyqYear ?? "").trim()).not.toBe("");
      expect(String(r.ncertRef ?? "")).toMatch(/^PYQ\b/);
      // Objective, 1 mark, Section A, four options, the answer is exactly one of them.
      expect(Number(r.marks)).toBe(1);
      expect(r.section).toBe("A");
      expect(String(r.format)).toMatch(/^MCQ$/i);
      const options = (r.options as unknown[]).map(String);
      expect(options).toHaveLength(4);
      expect(correctIndex(options, String(r.answer))).toBeGreaterThanOrEqual(0);
      // No figure / table needed; plain, clean text.
      expect(r.requiresDiagram || r.image || r.imageUrl || r.diagram || r.figure).toBeFalsy();
      const text = String(r.questionText);
      expect(needsFigureOrTable(text)).toBe(false);
      expect(text).not.toContain(String.fromCharCode(0xfffd));
      // Inside the 2026-27 syllabus.
      expect(
        syllabusExclusion({ topicKey: st.topicKey, subtopic: typeof r.subtopic === "string" ? r.subtopic : undefined, questionText: text }),
      ).toBeNull();
      // A stored solution that says WHY, from the row itself.
      const why = whyLine(r.solutionSteps as unknown[]);
      expect(why.length).toBeGreaterThan(20);
      expect(why).not.toMatch(/^\[|\[1 mark\]/);
    });

    // SPEED-SITE-1a — the copied row the ladder paints from must equal what the bank would give, field by field.
    it(`${st.bankId}: STARTER_ROWS equals the served bank row`, async () => {
      await ensureBankChapters(bankChaptersFor([st.topicKey]));
      const r = (getBankRows(bankChaptersFor([st.topicKey])) as unknown as Row[]).find((x) => x.id === st.bankId) as Row;
      const options = (r.options as unknown[]).map(String);
      const topicKey = String(r.topicKey ?? "");
      expect(STARTER_ROWS[st.bankId]).toEqual({
        question: String(r.questionText ?? ""),
        options,
        right: correctIndex(options, String(r.answer ?? "")),
        why: whyLine(r.solutionSteps as unknown[]),
        topicKey,
        topicName: desktopTopicBySlug(topicKey)?.name ?? st.chapter,
      });
    });

    it(`${st.bankId} hands on to a real 2-mark CI-SOFT-1 sample of the same subject`, () => {
      const smp = CI_DEMO_SAMPLES[st.nextKey];
      expect(smp.subject).toBe(st.subject);
      expect(smp.marks).toBe(2);
    });
  }
});

describe("SPEED-SITE-1a STARTER_ROWS", () => {
  it("holds exactly the six starters, nothing else", () => {
    expect(Object.keys(STARTER_ROWS).sort()).toEqual(ONE_MINUTE_STARTERS.map((s) => s.bankId).sort());
  });
});

describe("ONE-MINUTE-1 pure rules", () => {
  it("pickStarter is stable, honours the subject hint and never reads Math.random", () => {
    expect(pickStarter("Maths", 7)).toBe(pickStarter("Maths", 7));
    for (let i = 0; i < 12; i += 1) {
      expect(pickStarter("Maths", i).subject).toBe("Maths");
      expect(pickStarter("Science", i).subject).toBe("Science");
    }
    // FIVE-MORE-1: the single lowest-weightage starter (Areas Related to Circles, 4%) is never offered.
    const offered = new Set(Array.from({ length: 12 }, (_, i) => pickStarter(null, i).bankId));
    expect(offered.size).toBe(5);
    expect(offered.has("PYQ-M-2024-ARC-001")).toBe(false);
    expect(Number.isInteger(visitSeed())).toBe(true);
  });
  it("correctIndex needs exactly one match", () => {
    expect(correctIndex(["a", "b", "c", "d"], "c")).toBe(2);
    expect(correctIndex(["a", "b", "b", "d"], "b")).toBe(-1);
    expect(correctIndex(["a", "b"], "z")).toBe(-1);
  });
  it("whyLine strips the mark prefix and the option bookkeeping, keeps the row's own words", () => {
    expect(whyLine(["[1 mark] Correct option: (a) Cuscuta."])).toBe("");
    expect(whyLine(["[1 mark] Correct option is (c). Quicklime reacts with water."])).toBe("Quicklime reacts with water.");
    expect(whyLine(["[1 mark] Correct option: 7 — sodium chloride is neutral."])).toBe("Sodium chloride is neutral.");
    expect(whyLine(["[1 mark] θ/360° = 1/12 ⇒ θ = 30°. Correct option: (b) 30°."])).toBe("θ/360° = 1/12 ⇒ θ = 30°.");
    expect(whyLine(undefined)).toBe("");
    // SPEED-SITE-1a-fu: a leading maths variable is never capitalised; a leading word still is.
    expect(whyLine(["[1 mark] x² + 3x − 10 = (x + 5)(x − 2) = 0 ⟹ x = 2 or x = −5."])).toBe("x² + 3x − 10 = (x + 5)(x − 2) = 0 ⟹ x = 2 or x = −5.");
    expect(whyLine(["[1 mark] x = 2 satisfies the equation."])).toBe("x = 2 satisfies the equation.");
    expect(whyLine(["[1 mark] a salt of a strong acid is neutral."])).toBe("A salt of a strong acid is neutral.");
    expect(whyLine(["[1 mark] red light deviates least."])).toBe("Red light deviates least.");
    // SPEED-SITE-1-fu2: function names, angle names and genotypes are maths, never capitalised.
    for (const maths of ["tan θ = 1, so θ = 45°.", "sin A = 3/5 gives cos A = 4/5.", "cos A = 4/5.", "sec²θ − tan²θ = 1.", "px(x − 1) = 0 gives x = 0.", "yyrr is the recessive genotype."]) {
      expect(whyLine([`[1 mark] ${maths}`])).toBe(maths);
    }
    expect(whyLine(["[1 mark] the ratio is 1:2."])).toBe("The ratio is 1:2.");
  });
});

describe("FIVE-MORE-1 starter weightage", () => {
  it("every STARTER_WEIGHTAGE value equals its data source", () => {
    const maths: Record<string, number> = {
      "quadratic-equations": class10TopicRegistry.find((t) => t.topicKey === "Quadratic Equations")!.approxWeightagePercent,
      probability: class10TopicRegistry.find((t) => t.topicKey === "Probability")!.approxWeightagePercent,
      "areas-related-to-circles": class10TopicRegistry.find((t) => t.topicKey === "Areas Related to Circles")!.approxWeightagePercent,
    };
    const sci = (k: string) => class10ScienceTopicTrendList.find((t) => t.topicKey === k)!.weightagePercent;
    const expected = {
      ...maths,
      "chemical-reactions-and-equations": sci("ChemicalReactions"),
      "acids-bases-and-salts": sci("AcidsBasesSalts"),
      "light-reflection-and-refraction": sci("Light"),
    };
    expect(STARTER_WEIGHTAGE).toEqual(expected);
    for (const s of ONE_MINUTE_STARTERS) expect(STARTER_WEIGHTAGE[s.topicKey]).toBeGreaterThan(0);
  });
});
