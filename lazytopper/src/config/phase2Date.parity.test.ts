// @vitest-environment node
//
// PHASE2-DATE-1 (owner ruling 2026-09-28) — the phase-2 date is 15 May of the PREDICTED
// BOARD YEAR, i.e. the year of `predictCbseExamDate()` at the same instant. Before this
// lane it was the literal "2026-05-15", so after May 2026 every phase-2 row showed a past
// date. Put a literal year back in `src/services/cbseExamDate.ts` and this file turns red.
//
// ★ Every `now` is NOON IST (06:30Z) on the named calendar date, so the device-local date
// the client predictor reads is the same calendar date on CI (UTC) and a dev box (IST).

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
 * Dated instants: the board day and the days either side of it, the 31 Aug / 1 Sep
 * academic-year switch, mid-May (the phase-2 window itself), month and year ends.
 */
const DATES = [
  "2026-02-16",
  "2026-02-17",
  "2026-02-18",
  "2026-05-15",
  "2026-05-16",
  "2026-08-31",
  "2026-09-01",
  "2026-09-28",
  "2026-12-31",
  "2027-02-16",
  "2027-02-17",
  "2027-02-18",
  "2027-05-14",
  "2027-05-15",
  "2027-08-31",
  "2027-09-01",
  "2028-02-17",
  "2028-02-18",
];

afterEach(() => {
  vi.useRealTimers();
});

describe("PHASE2-DATE-1 — phase 2 is 15 May of the predicted board year", () => {
  it(`covers at least 12 dated instants (has ${DATES.length})`, () => {
    expect(DATES.length).toBeGreaterThanOrEqual(12);
    for (const required of ["2026-02-16", "2026-02-17", "2026-02-18", "2026-08-31", "2026-09-01", "2027-05-14"]) {
      expect(DATES).toContain(required);
    }
  });

  it.each(DATES)("%s — phase-2 ISO date == <board year>-05-15, both classes", (date) => {
    const now = istNoon(date);
    for (const cls of ["10", "12"] as const) {
      const board = at(now, () => predictCbseExamDate(cls));
      const boardYear = board.slice(0, 4);
      const phase2 = at(now, () => predictCbsePhase2Date(cls));
      expect(phase2).toBe(`${boardYear}-05-15`);
      expect(phase2.slice(0, 4)).toBe(boardYear);
      expect(at(now, () => predictCbsePhase2End(cls))).toBe(`${boardYear}-06-01`);
    }
    // the no-argument form (the module-load CBSE_PHASE2_DATE uses it) is class 10
    expect(at(now, () => predictCbsePhase2Date())).toBe(at(now, () => predictCbsePhase2Date("10")));
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

  it("CONTROL — the comparison can fail: the day after the board day moves the phase-2 year", () => {
    expect(at(istNoon("2027-02-17"), () => predictCbsePhase2Date())).toBe("2027-05-15");
    expect(at(istNoon("2027-02-18"), () => predictCbsePhase2Date())).toBe("2028-05-15");
  });
});
