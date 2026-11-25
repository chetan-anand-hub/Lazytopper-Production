/**
 * FM-RECHECK-NOTE-1 (live, 25 Nov 2026) - on a Full Mock the server HAD given the free re-check (`/api/packs/mine` later read
 * `freeRecheck: {"TS-FM-M1": true}`, `used: {}`), yet the result screen showed "Checks left on this paper: 2 of 2" with NO
 * "This check wasn't counted" note. ROOT CAUSE: the server marks the grading job done and THEN settles the check's hold
 * (grading/jobs.cjs -> commitDeferred -> testSeriesChecks.settleDeferred), so the result screen's one read can land before the
 * settle. These pin: a checks-left reader re-reads shortly after (SETTLE_REREAD_MS), the note then appears, a reader with no
 * `refreshKey` never re-reads, and the kill switch restores the single read.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const sub = vi.hoisted(() => ({ paid: false }));
vi.mock("../../hooks/useSubscription", () => ({ useSubscription: () => ({ status: { tier: sub.paid ? "premium" : "free" }, isPremium: sub.paid }) }));
vi.mock("../../services/subscriptionService", async (orig) => ({
  ...(await orig<typeof import("../../services/subscriptionService")>()),
  isPaidPremium: () => sub.paid,
}));
const mine = vi.hoisted(() => ({ fn: vi.fn() }));
vi.mock("../../services/packs", async (orig) => ({ ...(await orig<typeof import("../../services/packs")>()), fetchMyPacks: (...a: unknown[]) => mine.fn(...a) }));

import { CHECK_NOT_COUNTED_NEUTRAL_LINE } from "../../services/packs";
import { seriesMockWorksheetId, seriesPaperKeyOfWorksheetId } from "../../lib/testSeries/testSeries";
import { resetOwnedPacksCache } from "../packs/useOwnedPacks";
import { SETTLE_REREAD_MS, resetTestSeriesOwnershipForTests, useTestSeriesOwnership } from "./testSeriesOwnership";
import { SeriesChecksLeftLine } from "./WrittenCheckGate";

const FM_ID = seriesMockWorksheetId("fm-recheck-note-1", "Maths", 1);
const FM_KEY = seriesPaperKeyOfWorksheetId(FM_ID) as string;
const owner = (extra: Record<string, unknown> = {}) => ({
  packs: [],
  licensee: { name: "", email: "" },
  boardPassCredit: null,
  ownsTestSeries: true,
  testSeries: { validUntilMs: Date.now() + 86_400_000, checksPerPaper: 2, used: {}, ...extra },
});
const note = () => screen.queryByTestId("series-recheck-note");

beforeEach(() => {
  sub.paid = false;
  mine.fn.mockReset();
  resetOwnedPacksCache();
  resetTestSeriesOwnershipForTests();
  vi.useFakeTimers({ shouldAdvanceTime: true });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("FM-RECHECK-NOTE-1 - the checks-left line catches the server's settle after the grade", () => {
  it("pins the re-read schedule (two re-reads, the first soon, the last within 10 s)", () => {
    expect(SETTLE_REREAD_MS.length).toBe(2);
    expect(SETTLE_REREAD_MS[0]).toBeGreaterThan(1000);
    expect(SETTLE_REREAD_MS[0]).toBeLessThan(SETTLE_REREAD_MS[1]);
    expect(SETTLE_REREAD_MS[1]).toBeLessThanOrEqual(10_000);
  });

  it("a read that lands BEFORE the settle shows no note; the re-read after the settle shows it", async () => {
    // The first read beats the settle: no freeRecheck yet. Every later read sees the settled state.
    mine.fn.mockResolvedValueOnce(owner()).mockResolvedValue(owner({ freeRecheck: { [FM_KEY]: true } }));
    render(<MemoryRouter><SeriesChecksLeftLine uid="u1" worksheetId={FM_ID} refreshKey="full:false" notCountedReason={null} /></MemoryRouter>);
    await waitFor(() => expect(screen.getByTestId("series-checks-left").textContent).toBe("Checks left on this paper: 2 of 2"));
    expect(note()).toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(SETTLE_REREAD_MS[0]);
    });
    await waitFor(() => expect(note()?.textContent).toBe(CHECK_NOT_COUNTED_NEUTRAL_LINE));
    expect(screen.getByTestId("series-checks-left").textContent).toBe("Checks left on this paper: 2 of 2");
  });

  it("a counted check moves 2 of 2 -> 1 of 2 on the re-read (the same race on the count)", async () => {
    mine.fn.mockResolvedValueOnce(owner()).mockResolvedValue(owner({ used: { [FM_KEY]: 1 } }));
    render(<MemoryRouter><SeriesChecksLeftLine uid="u1" worksheetId={FM_ID} refreshKey="full:false" /></MemoryRouter>);
    await waitFor(() => expect(screen.getByTestId("series-checks-left").textContent).toContain("2 of 2"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SETTLE_REREAD_MS[1]);
    });
    await waitFor(() => expect(screen.getByTestId("series-checks-left").textContent).toBe("Checks left on this paper: 1 of 2"));
  });

  it("reads exactly 1 + SETTLE_REREAD_MS.length times per refreshKey, and a reader with no refreshKey never re-reads", async () => {
    mine.fn.mockResolvedValue(owner());
    function NoKey() {
      useTestSeriesOwnership("u1");
      return null;
    }
    render(<NoKey />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });
    expect(mine.fn).toHaveBeenCalledTimes(1);

    render(<MemoryRouter><SeriesChecksLeftLine uid="u1" worksheetId={FM_ID} refreshKey="full:false" /></MemoryRouter>);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });
    expect(mine.fn).toHaveBeenCalledTimes(2 + SETTLE_REREAD_MS.length);
  });

  it("unmounting cancels the pending re-reads", async () => {
    mine.fn.mockResolvedValue(owner());
    const r = render(<MemoryRouter><SeriesChecksLeftLine uid="u1" worksheetId={FM_ID} refreshKey="full:false" /></MemoryRouter>);
    await waitFor(() => expect(mine.fn).toHaveBeenCalledTimes(1));
    r.unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });
    expect(mine.fn).toHaveBeenCalledTimes(1);
  });

  it("kill switch VITE_TS_SETTLE_REREAD_DISABLED=1 restores the single read", async () => {
    vi.stubEnv("VITE_TS_SETTLE_REREAD_DISABLED", "1");
    mine.fn.mockResolvedValueOnce(owner()).mockResolvedValue(owner({ freeRecheck: { [FM_KEY]: true } }));
    render(<MemoryRouter><SeriesChecksLeftLine uid="u1" worksheetId={FM_ID} refreshKey="full:false" /></MemoryRouter>);
    await waitFor(() => expect(mine.fn).toHaveBeenCalledTimes(1));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });
    expect(mine.fn).toHaveBeenCalledTimes(1);
    expect(note()).toBeNull();
  });
});
