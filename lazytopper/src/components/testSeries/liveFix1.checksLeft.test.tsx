/**
 * LIVE-FIX-1 #2 (live run 23 Nov 2026, ~23:05 IST) - after a free-test written check completed, the result screen still read
 * "Your free test · Checks left on this paper: 2 of 2". ROOT CAUSE (client): the upload screen's line unmounts with the upload
 * screen; the result screen's line MOUNTS fresh after the grade and its hook skipped the first refresh, so it showed the count
 * cached before the check (or read at grading start, before the server's hold/settle). These pin: a reader with a `refreshKey`
 * re-reads the SERVER on mount, and an older slow read can never overwrite a newer one.
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

import { seriesMockWorksheetId, seriesPaperKeyOfWorksheetId } from "../../lib/testSeries/testSeries";
import { resetOwnedPacksCache } from "../packs/useOwnedPacks";
import { resetTestSeriesOwnershipForTests } from "./testSeriesOwnership";
import { SeriesChecksLeftLine } from "./WrittenCheckGate";

const FM_ID = seriesMockWorksheetId("fm-live-fix-1", "Maths", 1);
const FM_KEY = seriesPaperKeyOfWorksheetId(FM_ID) as string;
const mineOf = (freeTest: Record<string, unknown>) => ({ packs: [], licensee: { name: "", email: "" }, boardPassCredit: null, freeTest });
const line = () => screen.getByTestId("series-checks-left").textContent;

beforeEach(() => {
  sub.paid = false;
  mine.fn.mockReset();
  resetOwnedPacksCache();
  resetTestSeriesOwnershipForTests();
});
afterEach(() => cleanup());

describe("LIVE-FIX-1 - the free test's checks-left line after a check", () => {
  it("the result screen's line (mounted after the grade) shows the server's NEW count, not the cached pre-check one", async () => {
    // Upload screen, before the check: nothing pinned yet.
    mine.fn.mockResolvedValue(mineOf({ paperKey: null, checksPerPaper: 2, used: 0 }));
    const upload = render(<MemoryRouter><SeriesChecksLeftLine uid="u1" worksheetId={FM_ID} refreshKey="partial:false" freeTest /></MemoryRouter>);
    await waitFor(() => expect(line()).toBe("Your free test · Checks left on this paper: 2 of 2"));
    upload.unmount();

    // The check landed: the server pinned this paper and counted one check. The result screen mounts its own line.
    mine.fn.mockResolvedValue(mineOf({ paperKey: FM_KEY, checksPerPaper: 2, used: 1 }));
    render(<MemoryRouter><SeriesChecksLeftLine uid="u1" worksheetId={FM_ID} refreshKey="full:false" freeTest /></MemoryRouter>);
    await waitFor(() => expect(line()).toBe("Your free test · Checks left on this paper: 1 of 2"));
  });

  it("a check the server did NOT count (TS-RECHECK-1: most of the sheet not readable / not on the pages) shows the note beside 2 of 2", async () => {
    mine.fn.mockResolvedValue(mineOf({ paperKey: null, checksPerPaper: 2, used: 0 }));
    const upload = render(<MemoryRouter><SeriesChecksLeftLine uid="u1" worksheetId={FM_ID} refreshKey="partial:false" freeTest /></MemoryRouter>);
    await waitFor(() => expect(line()).toContain("2 of 2"));
    upload.unmount();

    mine.fn.mockResolvedValue(mineOf({ paperKey: FM_KEY, checksPerPaper: 2, used: 0, freeRecheck: true }));
    // The live run's sheet: answers missing from the pages (not unreadable) -> the not-found wording (coordinator ruling 24 Nov).
    render(<MemoryRouter><SeriesChecksLeftLine uid="u1" worksheetId={FM_ID} refreshKey="full:false" freeTest notCountedReason="not-found" /></MemoryRouter>);
    await waitFor(() => expect(screen.getByTestId("series-recheck-note").textContent).toBe(
      "This check wasn't counted — some answers weren't on the pages you uploaded. Add those pages and check again free.",
    ));
    expect(line()).toBe("Your free test · Checks left on this paper: 2 of 2");
  });

  it("an older slow read (started before the check) never overwrites the newer read", async () => {
    let releaseOld: (v: unknown) => void = () => undefined;
    mine.fn.mockImplementationOnce(() => new Promise((res) => { releaseOld = res; }));
    mine.fn.mockResolvedValue(mineOf({ paperKey: FM_KEY, checksPerPaper: 2, used: 1 }));
    const { rerender } = render(<MemoryRouter><SeriesChecksLeftLine uid="u1" worksheetId={FM_ID} refreshKey="partial:true" freeTest /></MemoryRouter>);
    rerender(<MemoryRouter><SeriesChecksLeftLine uid="u1" worksheetId={FM_ID} refreshKey="full:false" freeTest /></MemoryRouter>);
    await waitFor(() => expect(line()).toBe("Your free test · Checks left on this paper: 1 of 2"));
    await act(async () => {
      releaseOld(mineOf({ paperKey: null, checksPerPaper: 2, used: 0 }));
      await new Promise((r) => setTimeout(r, 10));
    });
    expect(line()).toBe("Your free test · Checks left on this paper: 1 of 2");
  });
});
