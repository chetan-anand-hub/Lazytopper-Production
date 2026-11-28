/**
 * LIMITS-1 PR-2 — the plan copy states the REAL limits, from limitsConfig, and is correct with the
 * limits flag on AND off.
 *
 * MUTATIONS: type a number into limitsPlanCopy.ts -> "no typed literal" RED; change a number in
 * limitsConfig.ts -> the llms.txt test RED (the static file must be edited with it); show a limits
 * line with the flag off -> "flag off" RED.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LIMITS_CONFIG as C } from "./limitsConfig";
import * as planCopy from "./limitsPlanCopy";
import { BASIC_RESULT_LINE, basicQuickPracticeLine, limitsCopyOn, trialLimitsSentence } from "./limitsPlanCopy";
import { BASIC_PAPERS_ROW, FIRST_TEST_FREE_LINE } from "./mockViewLimits";
import { basicIncludes, basicLimits, compareSections, fairUseCopy } from "./pricingCompare";

const here = path.dirname(fileURLToPath(import.meta.url));
afterEach(() => vi.unstubAllEnvs());

describe("the lines are built from limitsConfig", () => {
  it("Basic and trial numbers", () => {
    // GUEST-WALL (owner ruling 26 Nov 2026, 22:43 IST): no Basic download line or cell is exported any more.
    for (const k of ["basicDownloadLine", "basicDownloadCell", "basicPapersRow", "basicQuickPracticeCell"]) expect(k in planCopy).toBe(false);
    // GATE-QP-1 (19 Nov 2026): Basic's graded (written) Quick Practice allowance is 0 -> no number, a plain Board Pass line.
    expect(C.basic.quickPracticeWrittenGradedPerDay).toBe(0);
    expect(basicQuickPracticeLine()).toBe("Quick Practice questions are scored as you tap; marking your written practice answers comes with the Board Pass");
    const t = trialLimitsSentence();
    for (const v of [C.trial.checkImprovePerWeek, C.trial.quickPracticeGradedPerDay, C.trial.downloadsPerWeek, C.trial.worksheetGradedPerWeek, C.trial.chapterTestGradedPerWeek, C.trial.fullMockGradedPerWeek]) {
      expect(t).toContain(String(v));
    }
    expect(t).toContain(`${C.trial.checkImprovePerWeek} answer checks a week`);
  });
  it("no typed literal: limitsPlanCopy.ts has no digit in a string except through config", () => {
    const src = readFileSync(path.join(here, "limitsPlanCopy.ts"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\$\{[^}]*\}/g, "");
    expect(src.match(/["'`][^"'`\n]*\d[^"'`\n]*["'`]/g) || []).toEqual([]);
  });
  it("no rupee, countdown or seat count", () => {
    const all = [basicQuickPracticeLine(), BASIC_RESULT_LINE, trialLimitsSentence()].join(" ");
    expect(all).not.toMatch(/₹|seat|hurry|expires|Gemini|Google/i);
  });
});

describe("flag ON: /pricing says the real limits and drops the claim that is no longer true", () => {
  it("includes, not-on-Basic and compare rows", () => {
    const labels = basicIncludes(true).map((i) => i.label).join(" | ");
    // GUEST-WALL: opens only - no Basic download - and the one free test.
    expect(labels).toContain(BASIC_PAPERS_ROW);
    expect(labels).toContain(FIRST_TEST_FREE_LINE);
    expect(labels).not.toMatch(/download/i);
    expect(labels).toContain(basicQuickPracticeLine());
    expect(labels).not.toMatch(/first (graded|of each)/i);
    expect(labels).toContain(BASIC_RESULT_LINE);
    expect(labels).not.toMatch(/Open or download/);
    const lim = basicLimits({ freeCheck: false, limitsOn: true }).map((i) => i.label).join(" | ");
    expect(lim).not.toContain("No Mistake Intelligence — why you lose marks");
    expect(lim).not.toBe(basicLimits({ freeCheck: false, limitsOn: false }).map((i) => i.label).join(" | "));
    const rows = compareSections({ freeCheck: false, limitsOn: true }).flatMap((s) => s.rows);
    // GUEST-WALL: Basic's download and written-answer cells are "not included" (a dash).
    const dl = rows.find((r) => r.label === "Download papers");
    expect(dl?.basic).toEqual({ kind: "no" });
    expect(rows.find((r) => r.label === "Written practice answers marked (Quick Practice)")?.basic).toEqual({ kind: "no" });
    expect(rows.find((r) => r.label === "Open or download chapter tests and full mocks")).toBeUndefined();
    expect(rows.find((r) => r.label === "Chapter tests, mocks and worksheets graded")?.basic).toEqual({ kind: "no" });
  });
  it("the fair-use box carries the trial's real numbers", () => {
    const on = fairUseCopy(undefined, true);
    expect(on).toContain(trialLimitsSentence());
    expect(on).not.toMatch(/₹|\bINR\b|rupee/i);
  });
});

describe("flag OFF: /pricing is exactly what it was (the limits are not enforced, so no new claim)", () => {
  it("wording unchanged", () => {
    const labels = basicIncludes(false).map((i) => i.label).join(" | ");
    // GUEST-WALL: the papers row is the same with the flag off - opens only.
    expect(labels).toContain(BASIC_PAPERS_ROW);
    expect(labels).not.toMatch(/Open or download/);
    // GUEST-WALL: "Download papers" shows in both states, a dash on Basic (owner: downloads are not a Basic allowance).
    expect(compareSections({ freeCheck: false, limitsOn: false }).flatMap((s) => s.rows).find((r) => r.label === "Download papers")?.basic).toEqual({ kind: "no" });
    expect(compareSections({ freeCheck: false, limitsOn: false }).flatMap((s) => s.rows).some((r) => r.label === "Written practice answers marked (Quick Practice)")).toBe(false);
    expect(fairUseCopy(undefined, false)).not.toContain(trialLimitsSentence());
    expect(limitsCopyOn()).toBe(false);
  });
  it("the build-time flag turns the module-level defaults on", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_LIMITS_ENABLED", "1");
    const mod = await import("./pricingCompare");
    expect(mod.BASIC_INCLUDES.some((i) => i.id === "qp-graded")).toBe(true);
    expect(mod.compareSections({ freeCheck: false }).flatMap((s) => s.rows).some((r) => r.label === "Written practice answers marked (Quick Practice)")).toBe(true);
    vi.resetModules();
    vi.stubEnv("VITE_LIMITS_ENABLED", "");
    const off = await import("./pricingCompare");
    expect(off.BASIC_INCLUDES.some((i) => i.id === "qp-graded")).toBe(false);
  });
});

describe("public/llms.txt states the same limits (a static file, kept in step by this test)", () => {
  const llms = readFileSync(path.join(here, "..", "..", "public", "llms.txt"), "utf8");
  it("every line is the config-built one", () => {
    // GUEST-WALL: the Basic block states opens and the first free test, never a Basic download.
    expect(llms).toContain(`  - ${BASIC_PAPERS_ROW}\n  - ${FIRST_TEST_FREE_LINE}`);
    expect(llms).not.toMatch(/Download \d+ papers? a week/);
    expect(llms).toContain(basicQuickPracticeLine());
    expect(llms).not.toMatch(/first graded|first of each kind/i);
    // GST-EXCL-1 review G6: llms.txt never says "Premium" - it carries the line exactly as /pricing renders it
    // (pricingPlansCopy.asBoardPass: Premium -> Board Pass; mirrored here so this test reads no clock).
    // GST-EXCL-1 refresh (review, 6 Nov): llms.txt reads the line grammatically - "... comes with the Board Pass".
    expect(llms).toContain(BASIC_RESULT_LINE.replace(/\bis Premium\b/, "comes with the Board Pass"));
    expect(llms).not.toMatch(/breakdown is Board Pass/);
    expect(llms).toContain(`The 3-day trial includes ${trialLimitsSentence()}.`);
  });
});

describe("BASIC-COPY-1: 'first of each graded kind free' is a TRIAL rule, never a Basic promise", () => {
  const FIRST = /first (graded|of each)/i;
  it("CONTROL: the regex fires on the old Basic sentences", () => {
    expect(FIRST.test("Your first graded worksheet, chapter test, full mock and answer check are free")).toBe(true);
    expect(FIRST.test("the answer-by-answer breakdown is Premium after your first of each kind")).toBe(true);
    expect(FIRST.test("First of each free")).toBe(true);
  });
  it("no Basic-facing string in limitsPlanCopy / pricingCompare matches it (limits on and off)", () => {
    for (const on of [true, false]) {
      const strings = [
        ...basicIncludes(on).map((i) => i.label),
        ...basicLimits({ freeCheck: true, limitsOn: on }).map((i) => i.label),
        ...compareSections({ freeCheck: true, limitsOn: on }).flatMap((s) => s.rows.map((r) => JSON.stringify(r.basic))),
        basicQuickPracticeLine(), BASIC_RESULT_LINE,
      ];
      for (const t of strings) expect(t).not.toMatch(FIRST);
    }
  });
  it("the trial sentence keeps its true 'the first of each is free'", () => {
    expect(trialLimitsSentence()).toContain("the first of each is free");
  });
});
