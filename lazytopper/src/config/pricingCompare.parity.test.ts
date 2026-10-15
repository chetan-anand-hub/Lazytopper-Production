// @vitest-environment node
//
// PRICING-LIGHT-1 · L7 — the pricing page's numbers are MIRRORS; this file proves each
// mirror agrees with what is actually enforced.
//
//  1. The trial's fair-use allowances shown on /pricing ("The 7-day trial includes, each
//     day: …") are copies of the SERVER defaults in `server/services/fairUse.cjs`
//     (DEFAULT_LIMITS, AI_DEFAULT_LIMITS). The client bundle must not import server code,
//     so the copy lives in `pricingCompare.ts` and this file re-reads the server module
//     (read-only `require`) and turns red when the two disagree. CONTROL: a deliberately
//     wrong fixture is caught.
//  2. Basic's daily paper-open numbers are NOT copies: `pricingCompare.ts` imports them
//     from `mockViewLimits.ts`, the constants MockViewGate enforces. Pinned by source.
//
// ⚠ An env override on the server (FAIR_USE_TRIAL_*) would make the enforced numbers
// differ from these defaults; the live-verify checklist asks the owner to confirm none
// is set on Railway.

import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { BASIC_INCLUDES, TRIAL_FAIR_USE, compareSections, fairUseCopy, type TrialFairUse } from "./pricingCompare";
import { ANON_DAILY_MOCK_LIMIT, SIGNED_IN_DAILY_MOCK_LIMIT } from "./mockViewLimits";

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const server = require("../../server/services/fairUse.cjs") as {
  DEFAULT_LIMITS: Readonly<Record<string, number | null>>;
  AI_DEFAULT_LIMITS: Readonly<Record<string, number>>;
};

/** Each page number, and the server default it mirrors. */
const MIRROR: ReadonlyArray<[keyof TrialFairUse, () => number | null | undefined, string]> = [
  ["checksPerDay", () => server.DEFAULT_LIMITS.trialChecksPerDay, "DEFAULT_LIMITS.trialChecksPerDay"],
  ["chapterTestsPerDay", () => server.DEFAULT_LIMITS.trialChapterTestsPerDay, "DEFAULT_LIMITS.trialChapterTestsPerDay"],
  ["tutorMessagesPerDay", () => server.AI_DEFAULT_LIMITS.trialTutorPerDay, "AI_DEFAULT_LIMITS.trialTutorPerDay"],
  ["mocksPerWeek", () => server.DEFAULT_LIMITS.trialMocksPerWeek, "DEFAULT_LIMITS.trialMocksPerWeek"],
  ["worksheetGradingsPerWeek", () => server.DEFAULT_LIMITS.trialWorksheetsPerWeek, "DEFAULT_LIMITS.trialWorksheetsPerWeek"],
];

/** Every page number that disagrees with its server default, as "key: page vs server (name)". */
function parityFailures(page: TrialFairUse): string[] {
  return MIRROR.filter(([key, srv]) => page[key] !== srv()).map(
    ([key, srv, name]) => `${key}: page ${page[key]} vs server ${String(srv())} (${name})`,
  );
}

describe("L7 · the trial's fair-use numbers equal the server's enforced defaults", () => {
  it("the server module really exposes every mirrored default as a positive integer", () => {
    for (const [, srv, name] of MIRROR) {
      const v = srv();
      expect(Number.isInteger(v) && (v as number) > 0, name).toBe(true);
    }
  });

  it("every number in pricingCompare.ts equals its server default", () => {
    expect(parityFailures(TRIAL_FAIR_USE)).toEqual([]);
  });

  it("CONTROL — a deliberately wrong fixture value is caught", () => {
    const wrong = { ...TRIAL_FAIR_USE, checksPerDay: TRIAL_FAIR_USE.checksPerDay + 1 };
    expect(parityFailures(wrong)).toEqual([
      `checksPerDay: page ${TRIAL_FAIR_USE.checksPerDay + 1} vs server ${TRIAL_FAIR_USE.checksPerDay} (DEFAULT_LIMITS.trialChecksPerDay)`,
    ]);
    const wrongTutor = { ...TRIAL_FAIR_USE, tutorMessagesPerDay: 99 };
    expect(parityFailures(wrongTutor)).toHaveLength(1);
  });

  it("the sentence the page shows is built from those numbers (and changes when they do)", () => {
    const shown = fairUseCopy();
    expect(shown).toContain(`each day: ${server.DEFAULT_LIMITS.trialChecksPerDay} answer checks`);
    expect(shown).toContain(`${server.AI_DEFAULT_LIMITS.trialTutorPerDay} tutor messages`);
    // CONTROL — a different fixture produces a different sentence, with plurals right.
    const other = fairUseCopy({ ...TRIAL_FAIR_USE, chapterTestsPerDay: 2, mocksPerWeek: 3 });
    expect(other).toContain("2 chapter tests");
    expect(other).toContain("3 full mocks");
    expect(other).not.toBe(shown);
  });

  it("no rupee figure, ever, in the fair-use copy", () => {
    expect(fairUseCopy()).not.toMatch(/₹|\bINR\b|rupee/i);
  });
});

describe("L7 · Basic's paper-open numbers come from mockViewLimits.ts by import, never retyped", () => {
  const source = readFileSync(resolve(process.cwd(), "src/config/pricingCompare.ts"), "utf8");

  it("pricingCompare.ts imports both limits from ./mockViewLimits", () => {
    expect(source).toMatch(
      /import \{ ANON_DAILY_MOCK_LIMIT, SIGNED_IN_DAILY_MOCK_LIMIT \} from "\.\/mockViewLimits";/,
    );
  });

  it("every 'a day' string interpolates the constants — no digit is typed beside it", () => {
    const lines = source.split(/\r?\n/).filter((l) => /a day/.test(l) && !/^\s*(\/\/|\*)/.test(l));
    expect(lines.length).toBeGreaterThanOrEqual(2);
    for (const line of lines) {
      expect(line).toContain("${SIGNED_IN_DAILY_MOCK_LIMIT}");
      expect(line).toContain("${ANON_DAILY_MOCK_LIMIT}");
      expect(line.replace(/\$\{[A-Z_]+\}/g, "")).not.toMatch(/\d/);
    }
  });

  it("and the rendered values are the enforced ones", () => {
    expect(BASIC_INCLUDES.find((i) => i.id === "papers")?.label).toBe(
      `Open or download ${SIGNED_IN_DAILY_MOCK_LIMIT} chapter tests or mocks a day (${ANON_DAILY_MOCK_LIMIT} when signed out)`,
    );
    const row = compareSections({ freeCheck: false })
      .flatMap((s) => s.rows)
      .find((r) => r.label === "Open or download chapter tests and full mocks");
    expect(row?.basic).toEqual({
      kind: "text",
      text: `${SIGNED_IN_DAILY_MOCK_LIMIT} a day (${ANON_DAILY_MOCK_LIMIT} signed out)`,
    });
  });
});
