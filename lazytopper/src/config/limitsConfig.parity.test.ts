import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { LIMITS_CONFIG as client } from "./limitsConfig";

const require = createRequire(import.meta.url);
const { LIMITS_CONFIG: server } = require("../../server/services/limitsConfig.cjs") as { LIMITS_CONFIG: unknown };
const limits = require("../../server/services/limits.cjs") as { TRIAL_COHORT_START_MS: number; DEFAULTS: Record<string, number> };

describe("LIMITS-1 config parity", () => {
  it("client and server config objects are identical", () => {
    expect(JSON.parse(JSON.stringify(client))).toEqual(JSON.parse(JSON.stringify(server)));
  });
  it("owner ruling 25 Oct 07:58 IST numbers", () => {
    expect(client.trial).toEqual({
      downloadsPerWeek: 2, checkImprovePerWeek: 5, quickPracticeGradedPerDay: 3,
      worksheetGradedPerWeek: 1, chapterTestGradedPerWeek: 1, fullMockGradedPerWeek: 1,
    });
    expect(client.basic.downloadsPerWeek).toBe(1);
    expect(client.basic.quickPracticeGradedPerDay).toBe(1);
  });
  it("the server module reads its numbers from the config, not literals", () => {
    expect(limits.TRIAL_COHORT_START_MS).toBe(client.trialCohortStartMs);
    expect(limits.DEFAULTS.basicDownloadsPerWeek).toBe(client.basic.downloadsPerWeek);
    expect(limits.DEFAULTS.trialDownloadsPerWeek).toBe(client.trial.downloadsPerWeek);
  });
});
