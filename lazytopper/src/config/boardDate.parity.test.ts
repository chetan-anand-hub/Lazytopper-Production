// @vitest-environment node
//
// BOARD-DATE-1 (D3) — ONE board date everywhere. Three predictors compute the tentative
// CBSE board start date, and before this lane they disagreed (17 / 17 / 15-or-16 Feb):
//
//   client  `src/services/cbseExamDate.ts`      predictCbseExamDate(cls)   — landing countdown,
//                                                                            pricing page
//   server  `server/services/cbseExamDate.cjs`  predictCbseExamDate(cls, now) — `/api/cbse-exam-date`
//                                                                            fallback
//   pricing `server/services/passPricing.cjs`   predictBoardDateIso(now)    — pass grant (class 10)
//
// This suite asserts all three return the SAME ISO date at every dated instant, for class 10
// and class 12. (CLEANUP-2: the `cbseDates` case left with `src/config/cbseDates.ts`, deleted
// with its only consumer, the retired Onboarding page.)
// Move the server fallback day off 17 and this file turns red.
//
// ★ Every client-comparable `now` is NOON IST (06:30Z) on the named calendar date, so the
// device-local date the client predictor uses and the IST date both server copies use are
// the same date on any machine between UTC-06:30 and UTC+11:30 — CI (UTC) and a dev box
// (IST) alike. The near-midnight IST instants compare only the two SERVER copies, which both
// use the Asia/Kolkata calendar date whatever the host timezone.

import { createRequire } from "node:module";
import { afterEach, describe, expect, it, vi } from "vitest";

import { predictCbseExamDate } from "../services/cbseExamDate";

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const serverRoute = require("../../server/services/cbseExamDate.cjs") as {
  predictCbseExamDate: (studentClass: "10" | "12", now?: Date | number) => string;
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const passPricing = require("../../server/services/passPricing.cjs") as {
  predictBoardDateIso: (now: Date | number) => string | null;
};

/** Noon IST on the given calendar date. */
function istNoon(isoDate: string): Date {
  return new Date(`${isoDate}T12:00:00+05:30`);
}

/** The client predictor at `now` (it reads the clock itself). */
function clientAt(now: Date, studentClass: "10" | "12"): string {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(now);
  try {
    return predictCbseExamDate(studentClass);
  } finally {
    vi.useRealTimers();
  }
}

/**
 * Dated instants: the board day and the days either side of it (2026 official, 2027 and
 * 2028 predicted), the 31 Aug / 1 Sep academic-year switch, month and year ends, a leap day.
 */
const DATES = [
  "2026-01-31",
  "2026-02-16",
  "2026-02-17",
  "2026-02-18",
  "2026-03-31",
  "2026-07-31",
  "2026-08-31",
  "2026-09-01",
  "2026-09-28",
  "2026-12-31",
  "2027-01-31",
  "2027-02-16",
  "2027-02-17",
  "2027-02-18",
  "2027-08-31",
  "2027-09-01",
  "2028-02-16",
  "2028-02-17",
  "2028-02-18",
  "2028-02-29",
];

/** Instants just either side of IST midnight — server copies only (both use IST). */
const IST_EDGE_INSTANTS = [
  "2026-02-16T23:59:00+05:30",
  "2026-02-17T00:01:00+05:30",
  "2026-02-17T23:59:00+05:30",
  "2026-02-18T00:01:00+05:30",
  "2026-08-31T23:59:00+05:30",
  "2026-09-01T00:01:00+05:30",
  "2027-02-17T23:59:00+05:30",
  "2027-02-18T00:01:00+05:30",
];

afterEach(() => {
  vi.useRealTimers();
});

describe("BOARD-DATE-1 D3 — client, /api/cbse-exam-date fallback and pass pricing agree", () => {
  it(`covers at least 12 dated instants (has ${DATES.length})`, () => {
    expect(DATES.length).toBeGreaterThanOrEqual(12);
    for (const required of ["2026-02-16", "2026-02-17", "2026-02-18", "2026-08-31", "2026-09-01"]) {
      expect(DATES).toContain(required);
    }
  });

  it.each(DATES)("D3 parity %s — class 10: client = server fallback = passPricing", (date) => {
    const now = istNoon(date);
    const client = clientAt(now, "10");
    expect(serverRoute.predictCbseExamDate("10", now)).toBe(client);
    expect(passPricing.predictBoardDateIso(now)).toBe(client);
  });

  it.each(DATES)("D3 parity %s — class 12: client = server fallback", (date) => {
    const now = istNoon(date);
    expect(serverRoute.predictCbseExamDate("12", now)).toBe(clientAt(now, "12"));
  });

  it.each(IST_EDGE_INSTANTS)("D3 IST edge %s — server fallback = passPricing", (instant) => {
    const now = new Date(instant);
    expect(serverRoute.predictCbseExamDate("10", now)).toBe(passPricing.predictBoardDateIso(now));
  });

  it("anchor — on 2026-09-28 IST every predictor says 2027-02-17 (17 February, both classes)", () => {
    const now = istNoon("2026-09-28");
    expect(clientAt(now, "10")).toBe("2027-02-17");
    expect(clientAt(now, "12")).toBe("2027-02-17");
    expect(serverRoute.predictCbseExamDate("10", now)).toBe("2027-02-17");
    expect(serverRoute.predictCbseExamDate("12", now)).toBe("2027-02-17");
    expect(passPricing.predictBoardDateIso(now)).toBe("2027-02-17");
  });

  it("CONTROL — the comparison can fail: the board day and the day after predict different dates", () => {
    expect(serverRoute.predictCbseExamDate("10", istNoon("2027-02-17"))).not.toBe(
      serverRoute.predictCbseExamDate("10", istNoon("2027-02-18")),
    );
  });
});
