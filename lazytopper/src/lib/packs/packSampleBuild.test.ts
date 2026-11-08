/**
 * Review 1643 FU-1 - every free sample resolves to a REAL file of its pack. UNMOCKED: the real chapterFiles / mockFiles / cbqFiles
 * over the real bank (packSamples.test.tsx mocks buildPackFiles, so a stale `fileSuffix` - e.g. the old CBQ "cbq-1-questions" after
 * the CBQ sets change - stayed green there while the sample generator threw). Only the PDF exporter is a stub.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PACK_SAMPLES } from "./packSamples";
import { pickSampleFile } from "./packSampleBuild";

describe("free samples point at real pack files", () => {
  // build() stamps "Generated <date>": pin the clock (CLOCK_GUARD leaves a pinned Date alone).
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-08T10:00:00.000Z"));
  });
  afterEach(() => vi.useRealTimers());
  for (const spec of PACK_SAMPLES) {
    it(`${spec.id}: ${spec.fileSuffix} exists and builds`, async () => {
      const exportPdf = vi.fn(async () => "x.pdf");
      const file = await pickSampleFile(spec, exportPdf as never);
      expect(file.id.endsWith(`|${spec.fileSuffix}`)).toBe(true);
      await file.build();
      expect(exportPdf).toHaveBeenCalledTimes(1);
      const ws = (exportPdf.mock.calls[0] as unknown as [{ questions: unknown[] }])[0];
      expect(ws.questions.length).toBeGreaterThan(0);
      if (spec.sku === "pack_cbq") expect((exportPdf.mock.calls[0] as unknown as [unknown, string, string])[2]).toMatch(/^PK-[MS]-[A-Z0-9]+-CBQ1$/);
    }, 300000);
  }
});
