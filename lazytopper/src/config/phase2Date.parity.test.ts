// @vitest-environment node
//
// PHASE2-DATE-1 (owner ruling 2026-09-28 + controller OR-AUTO on FU-PHASE2-AFTER-BOARD-DAY) —
// the phase-2 date is 15 May of the BOARD CYCLE it follows: from the board day up to and
// including 15 May it stays 15 May of the CURRENT year; it rolls to next year only AFTER
// 15 May (IST). Before this lane it was the literal "2026-05-15" (a past date after May
// 2026). Put a literal year back in `src/services/cbseExamDate.ts`, or roll over at the
// board day instead of after 15 May, and this file turns red.
//
// ★ Every dated `now` is NOON IST (06:30Z) on the named calendar date, so the device-local
// date the board predictor reads is the same calendar date on CI (UTC) and a dev box (IST).
// The IST-edge instants check the 15 May / 16 May switch is on the INDIAN calendar date.

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  fetchCbsePhase2Date,
  getPhaseDeadline,
  predictCbseExamDate,
  predictCbsePhase2Date,
  predictCbsePhase2End,
} from "../services/cbseExamDate";
import { cbseDates } from "./cbseDates";

/** Noon IST on the given calendar date. */
function istNoon(isoDate: string): Date {
  return new Date(`${isoDate}T12:00:00+05:30`);
}

function at<T>(now: Date, read: () => T): T {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(now);
  try {
    return read();
  } finally {
    vi.useRealTimers();
  }
}

/**
 * Dated instants -> the expected phase-2 date: the board day and the days either side of
 * it, 1 Mar (inside the board-to-phase-2 window), 14/15/16 May (the rollover), the
 * 31 Aug / 1 Sep academic-year switch, month and year ends.
 */
const EXPECTED: Record<string, string> = {
  "2026-02-16": "2026-05-15",
  "2026-02-17": "2026-05-15",
  "2026-02-18": "2026-05-15",
  "2026-03-01": "2026-05-15",
  "2026-05-15": "2026-05-15",
  "2026-05-16": "2027-05-15",
  "2026-08-31": "2027-05-15",
  "2026-09-01": "2027-05-15",
  "2026-09-28": "2027-05-15",
  "2026-12-31": "2027-05-15",
  "2027-02-16": "2027-05-15",
  "2027-02-17": "2027-05-15",
  "2027-02-18": "2027-05-15",
  "2027-03-01": "2027-05-15",
  "2027-05-14": "2027-05-15",
  "2027-05-15": "2027-05-15",
  "2027-05-16": "2028-05-15",
  "2027-08-31": "2028-05-15",
  "2027-09-01": "2028-05-15",
  "2028-02-17": "2028-05-15",
  "2028-02-18": "2028-05-15",
};
const DATES = Object.keys(EXPECTED);

/** Either side of IST midnight on 15/16 May (UTC is still 15 May for the second one). */
const IST_EDGE: Array<[string, string]> = [
  ["2027-05-15T23:59:00+05:30", "2027-05-15"],
  ["2027-05-16T00:01:00+05:30", "2028-05-15"],
];

afterEach(() => {
  vi.useRealTimers();
});

describe("PHASE2-DATE-1 — phase 2 is 15 May of the board cycle; rolls over after 15 May IST", () => {
  it(`covers at least 12 dated instants (has ${DATES.length})`, () => {
    expect(DATES.length).toBeGreaterThanOrEqual(12);
    for (const required of [
      "2026-02-16", "2026-02-17", "2026-02-18", "2026-03-01", "2026-05-15", "2026-05-16",
      "2026-08-31", "2026-09-01", "2027-03-01",
    ]) {
      expect(DATES).toContain(required);
    }
  });

  it.each(DATES)("%s — phase-2 date and end, both classes", (date) => {
    const now = istNoon(date);
    const expected = EXPECTED[date];
    const year = expected.slice(0, 4);
    for (const cls of ["10", "12"] as const) {
      expect(at(now, () => predictCbsePhase2Date(cls))).toBe(expected);
      expect(at(now, () => predictCbsePhase2End(cls))).toBe(`${year}-06-01`);
    }
    // the no-argument form (the module-load CBSE_PHASE2_DATE uses it)
    expect(at(now, () => predictCbsePhase2Date())).toBe(expected);
  });

  it.each(DATES)("%s — never past; the board cycle it follows", (date) => {
    const now = istNoon(date);
    const phase2 = at(now, () => predictCbsePhase2Date());
    const boardYear = Number(at(now, () => predictCbseExamDate("10")).slice(0, 4));
    // the first 15 May on or after today
    expect(phase2 >= date).toBe(true);
    expect(`${Number(phase2.slice(0, 4)) - 1}-05-15` < date).toBe(true);
    // after 15 May it is the predicted board year; between the board day and 15 May it is
    // the year of the boards just sat (one before the next predicted board)
    const afterBoardDay = date.slice(5) > "02-17" && date.slice(5) <= "05-15";
    expect(Number(phase2.slice(0, 4))).toBe(afterBoardDay ? boardYear - 1 : boardYear);
  });

  it.each(IST_EDGE)("IST edge %s -> %s (the Indian calendar date decides)", (instant, expected) => {
    expect(at(new Date(instant), () => predictCbsePhase2Date())).toBe(expected);
  });

  it.each(DATES)("%s — cbseDates.*.phase2 (SprintDashboard / Onboarding) == predictCbsePhase2Date()", (date) => {
    const now = istNoon(date);
    at(now, () => {
      expect(cbseDates.class10.phase2).toBe(predictCbsePhase2Date("10"));
      expect(cbseDates.class12.phase2).toBe(predictCbsePhase2Date("12"));
      expect(cbseDates.class10.phase2).toBe(predictCbsePhase2Date());
    });
  });

  it.each(DATES)("%s — fetchCbsePhase2Date / getPhaseDeadline follow the predictor", (date) => {
    const now = istNoon(date);
    at(now, () => {
      expect(fetchCbsePhase2Date("10").examDate).toBe(predictCbsePhase2Date("10"));
      expect(getPhaseDeadline("phase2", "12")).toBe(predictCbsePhase2Date("12"));
    });
  });

  it("anchor — on 2026-09-28 IST phase 2 is 2027-05-15 (board 2027-02-17)", () => {
    const now = istNoon("2026-09-28");
    expect(at(now, () => predictCbseExamDate("10"))).toBe("2027-02-17");
    expect(at(now, () => predictCbsePhase2Date())).toBe("2027-05-15");
    expect(at(now, () => cbseDates.class10.phase2)).toBe("2027-05-15");
    expect(at(now, () => predictCbsePhase2End())).toBe("2027-06-01");
  });

  it("CBSE_PHASE2_DATE / CBSE_PHASE2_END — module-load values follow the predictor at load time", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(istNoon("2026-09-28"));
    try {
      vi.resetModules();
      const fresh = await import("../services/cbseExamDate");
      expect(fresh.CBSE_PHASE2_DATE).toBe("2027-05-15");
      expect(fresh.CBSE_PHASE2_END).toBe("2027-06-01");
    } finally {
      vi.useRealTimers();
    }
  });

  it("rollover — 18 Feb and 1 Mar keep this year's 15 May (was next year's under a board-day rollover)", () => {
    expect(at(istNoon("2027-02-18"), () => predictCbsePhase2Date())).toBe("2027-05-15");
    expect(at(istNoon("2027-03-01"), () => predictCbsePhase2Date())).toBe("2027-05-15");
    expect(at(istNoon("2027-03-01"), () => cbseDates.class10.phase2)).toBe("2027-05-15");
  });

  it("CONTROL — the comparison can fail: 15 May and 16 May predict different years", () => {
    expect(at(istNoon("2027-05-15"), () => predictCbsePhase2Date())).toBe("2027-05-15");
    expect(at(istNoon("2027-05-16"), () => predictCbsePhase2Date())).toBe("2028-05-15");
  });
});
