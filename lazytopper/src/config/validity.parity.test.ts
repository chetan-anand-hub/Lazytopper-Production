// @vitest-environment node
//
// VALIDITY-FEB27 - the SERVER's validity window (server/services/validityWindow.cjs) is a mirror of src/config/validity.ts.
// A duplicated date is only safe while something re-checks it: change one side and this file turns red.

import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

import {
  effectiveBoardPassEndMs,
  OLD_BOARD_PASS_END_MS,
  VALIDITY_END_ISO,
  VALIDITY_END_MS,
  VALIDITY_LABEL,
  VALIDITY_LONG,
  VALIDITY_SHORT,
  validityEndMsFor,
} from "./validity";
import { TEST_SERIES_VALID_TILL, TEST_SERIES_VALIDITY, TEST_SERIES_VALIDITY_LONG } from "../lib/packs/packLabels";
import { boardPassPriceLine, tillBoardsQuote } from "./pricing";

const require = createRequire(import.meta.url);
const server = require("../../server/services/validityWindow.cjs") as {
  VALIDITY_END_ISO: string;
  VALIDITY_END_MS: number;
  VALIDITY_LABEL: string;
  OLD_BOARD_PASS_END_MS: number;
  validityEndMsFor: (n: number) => number;
  effectiveBoardPassEndMs: (t: unknown, ms: number) => number;
};
const packTerms = require("../../server/services/packTerms.cjs") as { TEST_SERIES_ENDS_MS: number; TEST_SERIES_UNTIL: string };

const ist = (iso: string) => Date.parse(`${iso}+05:30`);

describe("VALIDITY-FEB27 client/server parity", () => {
  it("the constants agree and are 28 Feb 2027 23:59:59.999 IST", () => {
    expect(VALIDITY_END_ISO).toBe(server.VALIDITY_END_ISO);
    expect(VALIDITY_END_MS).toBe(server.VALIDITY_END_MS);
    expect(VALIDITY_END_MS).toBe(ist("2027-02-28T23:59:59.999"));
    expect(VALIDITY_LABEL).toBe(server.VALIDITY_LABEL);
    expect(VALIDITY_LABEL).toBe("28 Feb 2027");
    expect(OLD_BOARD_PASS_END_MS).toBe(server.OLD_BOARD_PASS_END_MS);
  });

  it("the Test Series shares the one end on both sides, and every client label is built from it", () => {
    expect(packTerms.TEST_SERIES_ENDS_MS).toBe(VALIDITY_END_MS);
    expect(packTerms.TEST_SERIES_UNTIL).toBe(VALIDITY_LABEL);
    expect(TEST_SERIES_VALID_TILL).toBe(VALIDITY_LABEL);
    expect(TEST_SERIES_VALIDITY).toBe(VALIDITY_SHORT);
    expect(TEST_SERIES_VALIDITY_LONG).toBe(VALIDITY_LONG);
    expect(tillBoardsQuote(new Date(ist("2026-11-20T12:00:00")), "2027-02-17")?.untilLabel).toBe(VALIDITY_SHORT);
    expect(boardPassPriceLine(ist("2026-11-20T12:00:00"))).toContain("valid till 28 Feb 2027");
  });

  it("copy: the long and short forms are exactly the owner's strings", () => {
    expect(VALIDITY_LONG).toBe("One payment, valid till 28 Feb 2027 — covers your Maths (17 Feb) and Science (22 Feb) boards.");
    expect(VALIDITY_SHORT).toBe("valid till 28 Feb 2027");
  });

  it("validityEndMsFor agrees, including the roll after 28 Feb", () => {
    for (const at of ["2026-11-20T12:00:00", "2027-02-28T23:59:59.998", "2027-02-28T23:59:59.999", "2027-03-01T00:00:00", "2028-03-05T12:00:00"]) {
      expect(validityEndMsFor(ist(at))).toBe(server.validityEndMsFor(ist(at)));
    }
    expect(validityEndMsFor(ist("2027-03-01T00:00:00"))).toBe(ist("2028-02-28T23:59:59.999"));
  });

  it("effectiveBoardPassEndMs agrees on a table: 17 Feb -> 28 Feb, later never shortened, earlier unchanged, month untouched", () => {
    const cases: Array<[string, number]> = [
      ["till_boards", ist("2027-02-17T23:59:59.999")],
      ["till_boards", ist("2027-02-22T10:00:00")],
      ["till_boards", ist("2027-02-28T23:59:59.999")],
      ["till_boards", ist("2027-04-30T23:59:59.999")],
      ["till_boards", ist("2027-02-17T23:59:59.998")],
      ["till_boards", ist("2026-11-10T10:00:00")],
      ["month", ist("2027-02-17T23:59:59.999")],
      ["till_boards", Number.NaN],
    ];
    for (const [t, ms] of cases) {
      const a = effectiveBoardPassEndMs(t, ms);
      const b = server.effectiveBoardPassEndMs(t, ms);
      expect(Object.is(a, b)).toBe(true);
    }
    expect(effectiveBoardPassEndMs("till_boards", OLD_BOARD_PASS_END_MS)).toBe(VALIDITY_END_MS);
    expect(effectiveBoardPassEndMs("till_boards", ist("2027-04-30T23:59:59.999"))).toBe(ist("2027-04-30T23:59:59.999"));
    expect(effectiveBoardPassEndMs("month", OLD_BOARD_PASS_END_MS)).toBe(OLD_BOARD_PASS_END_MS);
  });
});
