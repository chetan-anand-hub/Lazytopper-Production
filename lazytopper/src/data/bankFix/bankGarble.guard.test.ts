// @vitest-environment node
/**
 * GARBLE-1 (D152/D154/D159) - a bank-wide guard so PDF-extraction garble cannot come back.
 *
 * A SERVED row (canonicalQuestionBank) must not match a garble pattern in its stem, options or worked steps:
 *   - an exam-paper footer ("P.T.O.", a paper code such as 1430/4/1);
 *   - a "SECTION X This section comprises" spill from the next page;
 *   - legacy-font Hindi read as Latin ("_mZ kmV H$s{OE");
 *   - mathematical-italic Unicode (the extractor's output for a symbol font);
 *   - theta read as "q" ("q q = q + q");
 *   - an impossible flattened-fraction operator order ("θ θ –", "+ =", "A tan – 1 A cot").
 * Nothing is allowlisted silently: a legitimate match goes in GARBLE_REVIEWED_EXCEPTIONS with a reason.
 *
 * Controls (a guard that cannot fail is not a guard): the same detector MUST fire on rows that were garbled and are withheld,
 * and the mutation "re-serve PYQ-M-2024-TRIG-013" is RED (it was TRIG-014 until REWRITE-4 repaired that row).
 *
 * Single-step ratchet (D159): a served row worth >= 3 marks with ONE solution step has no step marking on the structured
 * grading path. Those rows are ledgered `found / SINGLE-STEP` (BANK_STEPS_1); the count may only fall, and no NEW one may appear.
 */
import "../../test/preloadBankChapters";
import { describe, expect, it } from "vitest";
import { RAW_CANONICAL_QUESTION_BANK, WITHHELD_QUESTION_IDS, canonicalQuestionBank } from "../canonicalQuestionBank";
import { BANK_STEPS_1 } from "./bankSteps1Ledger";

type Row = { id: string; marks?: number; questionText?: unknown; options?: unknown; solutionSteps?: unknown };

const PATTERNS: ReadonlyArray<readonly [string, RegExp]> = [
  ["footer", /P\.T\.O\.|\b\d{3,4}\/\d{1,2}\/\d{1,2}\b/],
  ["section-spill", /SECTION\s+[A-E]\s+This section comprises/i],
  ["legacy-font-hindi", /\b_mZ\b|\bkmV\b|H\$s|\{OE|\bAWdm\b|h¡|\bVmo\b|`\{X|\{gÕ/],
  ["math-italic-unicode", /[\u{1D400}-\u{1D7FF}]/u],
  ["theta-as-q", /(?:^|\s)q q(?:\s|$)|\bq\s+[=+]\s+q\b/],
  ["flattened-operator-order", /θ θ\s+[–-]|\+\s+=|\bA tan\s+[–-]|\b(?:tan|cot|sin|cos|sec|cosec)\s+[–-]\s+\d\s+[A-Za-zθ]\b/],
];

/** Every id here is a reviewed, deliberate match. Add `{ id, reason }` only after reading the row. PYQ-M-CG-003 left this list when GARBLE-1 withheld it (its stem lost a minus). */
const GARBLE_REVIEWED_EXCEPTIONS: ReadonlyArray<{ id: string; reason: string }> = [
  // PYQ-M-RN-003 (clean stem, flattened worked step) left this list when its steps were rewritten into two [1 mark] steps (MATHS-SINGLE-STEP-1).
];

/** Mathematical-italic Unicode is how the extractor writes a symbol font: legible in a worked step (`𝑥+ 2𝑦= 4`), unreadable only when it replaces a stem. */
const ITALIC = "math-italic-unicode";
const garbleHits = (q: Row): string[] => {
  const steps = Array.isArray(q.solutionSteps) ? q.solutionSteps.map((s) => (typeof s === "string" ? s : JSON.stringify(s))) : [];
  const opts = Array.isArray(q.options) ? q.options.map(String) : [];
  const head = [String(q.questionText ?? ""), ...opts].join("\n");
  const body = steps.join("\n");
  return PATTERNS.filter(([name, re]) => re.test(head) || (name !== ITALIC && re.test(body))).map(([name]) => name);
};

const raw = RAW_CANONICAL_QUESTION_BANK as unknown as Row[];
const served = canonicalQuestionBank as unknown as Row[];
const excepted = new Set(GARBLE_REVIEWED_EXCEPTIONS.map((e) => e.id));
const byId = new Map(raw.map((q) => [q.id, q]));

describe("GARBLE-1 · no served row matches a garble pattern", () => {
  it("reads the whole served bank (not an empty list)", () => {
    expect(served.length).toBeGreaterThan(9000);
  });
  it("no served row matches (reviewed exceptions excepted)", () => {
    const bad = served.filter((q) => !excepted.has(q.id)).map((q) => ({ id: q.id, hits: garbleHits(q) })).filter((x) => x.hits.length);
    expect(bad).toEqual([]);
  });
  it("every reviewed exception names a served row and a reason", () => {
    for (const e of GARBLE_REVIEWED_EXCEPTIONS) {
      expect(e.reason.trim().length).toBeGreaterThan(10);
      expect(served.some((q) => q.id === e.id)).toBe(true);
    }
  });
});

describe("GARBLE-1 · controls (each pattern can fail)", () => {
  // Rows that were garbled and are WITHHELD: the detector must fire on every one of them, or it is a decoration.
  // PYQ-M-2024-TRIG-019 left at PYQ-RESTORE-B PR-1 (2026-10-23): re-extracted in English from the official paper and served.
  const KNOWN_GARBLED = ["PYQ-M-2024-TRIG-013"];
  it.each(KNOWN_GARBLED)("%s is withheld and the detector fires on it", (id) => {
    expect(WITHHELD_QUESTION_IDS.has(id)).toBe(true);
    const q = byId.get(id);
    expect(q).toBeDefined();
    expect(garbleHits(q as Row).length).toBeGreaterThan(0);
  });
  it("each pattern fires on a synthetic row (so none is dead)", () => {
    const sample: Record<string, string> = {
      "footer": "Evaluate it. 1530/5/3 P.T.O.",
      "section-spill": "Find x. SECTION C This section comprises 6 questions",
      "legacy-font-hindi": "_mZ kmV H$s{OE : 2",
      "math-italic-unicode": "Find \u{1D45E} if \u{1D465} = 2",
      "theta-as-q": "Prove that q q = q + q",
      "flattened-operator-order": "Prove that : θ θ – tan 1 cot + θ θ – cot 1 tan",
    };
    for (const [name] of PATTERNS) expect(garbleHits({ id: "x", questionText: sample[name] })).toContain(name);
  });
  it("mutation: re-serving PYQ-M-2024-TRIG-013 would be RED", () => {
    const q = byId.get("PYQ-M-2024-TRIG-013") as Row;
    const mutated = [...served, q].filter((r) => !excepted.has(r.id)).map((r) => ({ id: r.id, hits: garbleHits(r) })).filter((x) => x.hits.length);
    expect(mutated.map((x) => x.id)).toEqual(["PYQ-M-2024-TRIG-013"]);
  });
  it("legitimate maths does not trip the detector (no false positive on a clean stem)", () => {
    expect(garbleHits({ id: "x", questionText: "If sin (A − B) = 1/2 and cos (A + B) = 1/2, find ∠A and ∠B. Assertion (A): ... Reason (R): ..." })).toEqual([]);
  });
});

describe("GARBLE-1 · single-step ratchet (D159)", () => {
  const SINGLE_STEP_PIN = 9; // 14 Oct B SINGLE-STEP repair: 36 Science rows split into 3 steps (45 served on trunk 2b2d89e9 -> 9, measured)
  const singleStep = served.filter((q) => (q.marks ?? 0) >= 3 && Array.isArray(q.solutionSteps) && q.solutionSteps.length === 1);
  const ledgered = new Set(BANK_STEPS_1.filter((e) => e.verdict === "SINGLE-STEP").map((e) => e.id));
  it("the count of served >=3-mark one-step rows may only fall (pin 9)", () => {
    expect(singleStep.length).toBeLessThanOrEqual(SINGLE_STEP_PIN);
  });
  it("every such row is ledgered found/SINGLE-STEP: no NEW one may appear", () => {
    expect(singleStep.filter((q) => !ledgered.has(q.id)).map((q) => q.id)).toEqual([]);
  });
  it("the ledger entries are served, still found, and still one-step (a repaired row must flip state to repaired)", () => {
    const servedIds = new Set(served.map((q) => q.id));
    const stale = BANK_STEPS_1.filter((e) => e.verdict === "SINGLE-STEP" && e.state === "found")
      .filter((e) => !servedIds.has(e.id) || !singleStep.some((q) => q.id === e.id)).map((e) => e.id);
    expect(stale).toEqual([]);
  });
  it("mutation: a served 3-mark row cut to one step is RED", () => {
    const victim = served.find((q) => (q.marks ?? 0) >= 3 && Array.isArray(q.solutionSteps) && q.solutionSteps.length >= 3) as Row;
    const cut = { ...victim, solutionSteps: [(victim.solutionSteps as unknown[])[0]] };
    const now = [...singleStep, cut].filter((q) => !ledgered.has(q.id));
    expect(now.map((q) => q.id)).toEqual([victim.id]);
  });
});
