import { describe, expect, it } from "vitest";
import {
  PACK_TERMS_CUTOFF_MS,
  REDOWNLOAD_COPY,
  REDOWNLOAD_SHORT,
  REDOWNLOAD_UNTIL,
  REDOWNLOAD_UNTIL_LEGACY,
  redownloadCopyFor,
  redownloadUntilFor,
} from "./packLabels";

describe("PACK-TERMS-1 - the re-download date", () => {
  it("new buyers: 31 March 2027; packs bought before the cut-off keep the 31 May 2027 already printed on their covers", () => {
    expect(REDOWNLOAD_UNTIL).toBe("31 March 2027");
    expect(REDOWNLOAD_UNTIL_LEGACY).toBe("31 May 2027");
    expect(REDOWNLOAD_COPY).toBe("Download again any time until 31 March 2027");
    expect(REDOWNLOAD_SHORT).toBe("download again till 31 March 2027");
  });

  it("the cut-off is 5 Nov 2026 00:00 IST, the same instant as the server's credit cut-off", () => {
    expect(PACK_TERMS_CUTOFF_MS).toBe(1793817000000 /* 2026-11-05T00:00:00+05:30 */);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const server = require("../../../server/services/packCredit.cjs") as { PACK_CREDIT_CUTOFF_MS: number };
    expect(server.PACK_CREDIT_CUTOFF_MS).toBe(PACK_TERMS_CUTOFF_MS);
  });

  it("picks by paid time: 1 ms before -> May; at the cut-off and after -> March", () => {
    expect(redownloadUntilFor(PACK_TERMS_CUTOFF_MS - 1)).toBe("31 May 2027");
    expect(redownloadUntilFor(PACK_TERMS_CUTOFF_MS)).toBe("31 March 2027");
    expect(redownloadUntilFor(PACK_TERMS_CUTOFF_MS + 1)).toBe("31 March 2027");
    expect(redownloadCopyFor(PACK_TERMS_CUTOFF_MS - 1)).toBe("Download again any time until 31 May 2027");
  });

  it("unknown / unusable paid time -> the LATER date, never an earlier one than a buyer may have been promised", () => {
    for (const bad of [undefined, null, 0, -1, Number.NaN, Number.POSITIVE_INFINITY]) expect(redownloadUntilFor(bad)).toBe("31 May 2027");
  });
});
