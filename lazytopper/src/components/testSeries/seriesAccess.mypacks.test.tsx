/**
 * MYPACKS-TS-1 (client P0/P1 from the 18 Nov student review): downloads restored for covering PDF packs, a neutral "Checking your
 * access" and an honest retry instead of a paywall, 0-checks and non-series states for a Test Series owner, Board Pass-only tutor wall,
 * and the one-free-test rule counted only from the release.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const sub = vi.hoisted(() => ({ paid: false }));
vi.mock("../../hooks/useSubscription", () => ({ useSubscription: () => ({ status: { tier: sub.paid ? "premium" : "free" }, isPremium: sub.paid }) }));
vi.mock("../../services/subscriptionService", async (orig) => ({
  ...(await orig<typeof import("../../services/subscriptionService")>()),
  isPaidPremium: () => sub.paid,
}));
const mine = vi.hoisted(() => ({ fn: vi.fn() }));
vi.mock("../../services/packs", async (orig) => ({ ...(await orig<typeof import("../../services/packs")>()), fetchMyPacks: (...a: unknown[]) => mine.fn(...a) }));

import {
  SERIES_RULES_START_MS,
  canCheckSeriesPapers,
  canDownloadPaper,
  countTestsTaken,
  isBeforeSeriesRules,
  seriesStartDecision,
} from "../../lib/testSeries/seriesAccess";
import { seriesChapterWorksheetId, seriesMockWorksheetId, seriesPaperKeyOfWorksheetId } from "../../lib/testSeries/testSeries";
import { resetOwnedPacksCache } from "../packs/useOwnedPacks";
import { resetTestSeriesOwnershipForTests } from "./testSeriesOwnership";
import {
  ACCESS_CHECKING_LINE,
  ACCESS_FAILED_LINE,
  ResultAccessSlot,
  SeriesOwnerNotice,
  TutorBoardPassWall,
  useSeriesAccess,
  type SeriesAccess,
  type SeriesAccessPaper,
} from "./WrittenCheckGate";

const pdf = (sku: string, target: string) => ({ packId: `${sku}:${target}`, sku, target, pricePaidInr: 49, paidAt: 1 });
const ts = { packId: "test_series:all", sku: "test_series", target: "all", pricePaidInr: 999, paidAt: 2 };
const mineOf = (packs: unknown[], extra: Record<string, unknown> = {}) => ({ packs, licensee: { name: "", email: "" }, boardPassCredit: null, ...extra });

let seen: SeriesAccess | null = null;
function Probe({ paper }: { paper: SeriesAccessPaper }) {
  seen = useSeriesAccess("u1", paper);
  return null;
}
const mount = (paper: SeriesAccessPaper) => render(<MemoryRouter><Probe paper={paper} /></MemoryRouter>);

beforeEach(() => {
  sub.paid = false;
  seen = null;
  mine.fn.mockReset();
  resetOwnedPacksCache();
  resetTestSeriesOwnershipForTests();
});
afterEach(cleanup);

describe("P0-3 · PDF-pack owners keep their downloads (pure)", () => {
  it("a covering pack opens the download but NOT written checking; a stranger gets neither", () => {
    expect(canDownloadPaper({ paidPremium: false, ownsCoveringPack: true })).toBe(true);
    expect(canCheckSeriesPapers({ paidPremium: false, ownsCoveringPack: true } as never)).toBe(false);
    expect(canDownloadPaper({ paidPremium: false })).toBe(false);
    expect(canDownloadPaper({ paidPremium: true })).toBe(true);
    expect(canDownloadPaper({ paidPremium: false, ownsTestSeries: true })).toBe(true);
  });
});

describe("P0-3 · useSeriesAccess with the real pack-cover rules", () => {
  it("Chapter Pack owner: downloads on THAT chapter only, never written checking", async () => {
    mine.fn.mockResolvedValue(mineOf([pdf("pack_chapter", "real-numbers")]));
    mount({ kind: "chapter-test", chapterSlug: "real-numbers" });
    await waitFor(() => expect(seen?.checking).toBe(false));
    expect(seen).toMatchObject({ canDownload: true, canCheck: false });
    cleanup();
    resetOwnedPacksCache();
    resetTestSeriesOwnershipForTests();
    mount({ kind: "chapter-test", chapterSlug: "polynomials" });
    await waitFor(() => expect(seen?.checking).toBe(false));
    expect(seen).toMatchObject({ canDownload: false, canCheck: false });
  });
  it("Mock Pack / Bundle owner: downloads full mocks of the subject; PDF-less student cannot", async () => {
    mine.fn.mockResolvedValue(mineOf([pdf("pack_mock", "maths")]));
    mount({ kind: "full-mock", subject: "maths" });
    await waitFor(() => expect(seen?.checking).toBe(false));
    expect(seen?.canDownload).toBe(true);
    cleanup();
    resetOwnedPacksCache();
    resetTestSeriesOwnershipForTests();
    mine.fn.mockResolvedValue(mineOf([pdf("pack_mock", "maths")]));
    mount({ kind: "full-mock", subject: "science" });
    await waitFor(() => expect(seen?.checking).toBe(false));
    expect(seen?.canDownload).toBe(false);
  });
  it("Test Series owner: checks and downloads; Board Pass holder: both, with no ownership read", async () => {
    mine.fn.mockResolvedValue(mineOf([ts], { ownsTestSeries: true }));
    mount({ kind: "full-mock", subject: "maths" });
    await waitFor(() => expect(seen?.canCheck).toBe(true));
    expect(seen).toMatchObject({ canDownload: true, ownsSeries: true });
    cleanup();
    sub.paid = true;
    mine.fn.mockClear();
    mount({ kind: "full-mock", subject: "maths" });
    expect(seen).toMatchObject({ canCheck: true, canDownload: true, checking: false });
    expect(mine.fn).not.toHaveBeenCalled();
  });
});

describe("P0-2 · checking and failed are never a paywall", () => {
  it("while ownership loads: checking=true and not entitled; the slot says 'Checking your access…', not the upgrade card", async () => {
    mine.fn.mockReturnValue(new Promise(() => undefined));
    mount({ kind: "full-mock", subject: "maths" });
    expect(seen).toMatchObject({ checking: true, canCheck: false, failed: false });
    render(<ResultAccessSlot access={seen as SeriesAccess} uploadAllowed={false} worksheetId="w" upgrade={<div data-testid="upgrade" />} upload={<div data-testid="upload" />} />);
    expect(screen.getByTestId("series-access-checking").textContent).toBe(ACCESS_CHECKING_LINE);
    expect(screen.queryByTestId("upgrade")).toBeNull();
  });
  it("a failed read is retried once, then 'Couldn't confirm your purchase' + Retry (never the upgrade card); Retry reads again", async () => {
    vi.useFakeTimers();
    try {
      mine.fn.mockRejectedValue(new Error("net"));
      mount({ kind: "full-mock", subject: "maths" });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });
      expect(mine.fn.mock.calls.length).toBeGreaterThanOrEqual(2); // ownership read + one retry (the owned-packs list asks too)
      expect(seen).toMatchObject({ failed: true, checking: false, canCheck: false });
      render(<ResultAccessSlot access={seen as SeriesAccess} uploadAllowed={false} worksheetId="w" upgrade={<div data-testid="upgrade" />} upload={<div />} />);
      expect(screen.getByTestId("series-access-failed").textContent).toContain(ACCESS_FAILED_LINE);
      expect(screen.queryByTestId("upgrade")).toBeNull();
      mine.fn.mockResolvedValue(mineOf([ts], { ownsTestSeries: true }));
      fireEvent.click(screen.getByRole("button", { name: "Retry" }));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(50);
      });
      expect(seen).toMatchObject({ canCheck: true, failed: false });
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("P0-2 · a Test Series owner's upload states", () => {
  const wid = seriesChapterWorksheetId("ct-1-1", "real-numbers");
  const key = seriesPaperKeyOfWorksheetId(wid) as string;
  const owner = (used: number): SeriesAccess => ({ canCheck: true, canDownload: true, checking: false, failed: false, ownsSeries: true, status: { checksPerPaper: 2, used: { [key]: used } } as never, retry: () => undefined });
  it("0 checks left on a series paper: 'No checks left on this paper' + the Board Pass ONLY, no upload; 1 left keeps the upload", () => {
    expect(key).toMatch(/^TS-CT-/);
    render(<MemoryRouter><ResultAccessSlot access={owner(2)} uploadAllowed worksheetId={wid} upgrade={null} upload={<div data-testid="upload" />} /></MemoryRouter>);
    expect(screen.getByTestId("series-zero-checks-line").textContent).toBe("0 of 2 checks left on this paper");
    expect(screen.getByTestId("series-no-checks-left").textContent).toContain("You've used both checks on this paper");
    expect(screen.getByTestId("series-no-checks-left").textContent).toContain("Your other papers have their own 2 checks each.");
    expect(screen.getByTestId("no-checks-bp")).toBeTruthy();
    expect(screen.queryByTestId("no-checks-ts")).toBeNull();
    expect(screen.queryByTestId("upload")).toBeNull();
    cleanup();
    render(<MemoryRouter><ResultAccessSlot access={owner(1)} uploadAllowed worksheetId={wid} upgrade={null} upload={<div data-testid="upload" />} /></MemoryRouter>);
    expect(screen.getByTestId("upload")).toBeTruthy();
    expect(screen.queryByTestId("series-no-checks-left")).toBeNull();
  });
  it("a refused 3rd upload on a SERIES paper says both checks are used (with the paper code), then the Board Pass - no PDF 'Prefer practising on paper?' upsell", () => {
    render(<MemoryRouter><SeriesOwnerNotice onClose={() => undefined} worksheetId={wid} status={{ checksPerPaper: 2, used: { [key]: 2 } } as never} /></MemoryRouter>);
    const t = screen.getByTestId("series-owner-notice").textContent ?? "";
    expect(t).toContain(`(${key.replace(/^TS-/, "")})`);
    expect(t).toContain("Your other papers have their own 2 checks each.");
    expect(t).toContain("no per-paper limit");
    expect(screen.getByTestId("series-owner-bp")).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/Prefer practising on paper|Get it marked like the board would|Chapter Pack/);
  });
  it("a refused upload on a non-series paper shows the Test Series note with the Board Pass only - no Chapter Pack sheet", () => {
    render(<MemoryRouter><SeriesOwnerNotice onClose={() => undefined} /></MemoryRouter>);
    expect(screen.getByTestId("series-owner-notice").textContent).toContain("Your Test Series checks the numbered series papers");
    expect(screen.getByTestId("series-owner-bp")).toBeTruthy();
    expect(screen.queryByTestId("series-owner-ts")).toBeNull();
    expect(document.body.textContent).not.toMatch(/Chapter Pack/);
  });
});

describe("P1-4 · the tutor wall offers ONLY the Board Pass", () => {
  it("no Test Series button", () => {
    render(<MemoryRouter><TutorBoardPassWall onClose={() => undefined} /></MemoryRouter>);
    expect(screen.getByTestId("tutor-wall-bp")).toBeTruthy();
    expect(screen.queryByTestId("tutor-wall-ts")).toBeNull();
  });
});

describe("P1-7/8 · the one free test counts only from the release; older papers are grandfathered", () => {
  const before = SERIES_RULES_START_MS - 86_400_000;
  const after = SERIES_RULES_START_MS + 60_000;
  it("a chapter test sat before the release does not use the free test; one after does", () => {
    expect(countTestsTaken([{ surface: "chapter-test", gradedAt: before }])).toBe(0);
    expect(countTestsTaken([{ surface: "full-mock", gradedAt: after, worksheetId: seriesMockWorksheetId("fm-x", "Maths", 3) }])).toBe(1);
    expect(countTestsTaken([{ surface: "worksheet", gradedAt: after }])).toBe(0);
    expect(seriesStartDecision({ entitled: false, signedIn: true, testsTaken: countTestsTaken([{ surface: "chapter-test", gradedAt: before }]) })).toBe("start");
    expect(seriesStartDecision({ entitled: false, signedIn: true, testsTaken: 1 })).toBe("upgrade");
  });
  it("isBeforeSeriesRules: only a known earlier time is grandfathered", () => {
    expect(isBeforeSeriesRules(before)).toBe(true);
    expect(isBeforeSeriesRules(after)).toBe(false);
    expect(isBeforeSeriesRules(null)).toBe(false);
    expect(isBeforeSeriesRules(Date.parse("garbage"))).toBe(false);
  });
  it("a grandfathered paper keeps the upload for a non-entitled account", () => {
    const none: SeriesAccess = { canCheck: false, canDownload: false, checking: false, failed: false, ownsSeries: false, status: null, retry: () => undefined };
    render(<MemoryRouter><ResultAccessSlot access={none} uploadAllowed={isBeforeSeriesRules(before)} worksheetId="w" upgrade={<div data-testid="upgrade" />} upload={<div data-testid="upload" />} /></MemoryRouter>);
    expect(screen.getByTestId("upload")).toBeTruthy();
    expect(screen.queryByTestId("upgrade")).toBeNull();
  });
});

describe("live finding 3 · the checks-left line refreshes when the grade finishes", () => {
  it("a changed refreshKey re-reads the server count: 2 of 2 -> 1 of 2 without a reload", async () => {
    const { SeriesChecksLeftLine } = await import("./WrittenCheckGate");
    const wid = seriesChapterWorksheetId("ct-1-1", "real-numbers");
    const key = seriesPaperKeyOfWorksheetId(wid) as string;
    mine.fn.mockResolvedValueOnce(mineOf([ts], { ownsTestSeries: true, testSeries: { checksPerPaper: 2, used: {}, validUntilMs: 1 } }));
    mine.fn.mockResolvedValue(mineOf([ts], { ownsTestSeries: true, testSeries: { checksPerPaper: 2, used: { [key]: 1 }, validUntilMs: 1 } }));
    const view = render(<MemoryRouter><SeriesChecksLeftLine uid="u1" worksheetId={wid} refreshKey="partial:true" /></MemoryRouter>);
    await waitFor(() => expect(screen.getByTestId("series-checks-left").textContent).toBe("Checks left on this paper: 2 of 2"));
    view.rerender(<MemoryRouter><SeriesChecksLeftLine uid="u1" worksheetId={wid} refreshKey="full:false" /></MemoryRouter>);
    await waitFor(() => expect(screen.getByTestId("series-checks-left").textContent).toBe("Checks left on this paper: 1 of 2"));
  });
});
