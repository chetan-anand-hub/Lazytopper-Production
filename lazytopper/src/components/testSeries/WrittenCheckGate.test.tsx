// TEST-SERIES-1 — the gate pieces: who may check / download (Board Pass or Test Series), who opens the tutor (Board Pass only),
// and the walls (both offers, equal weight).
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const sub = vi.hoisted(() => ({ tier: "free" }));
vi.mock("../../hooks/useSubscription", () => ({ useSubscription: () => ({ status: { tier: sub.tier } }) }));

import { SeriesChecksLeftLine, SeriesStartWall, TutorBoardPassWall, useBoardPassHolder, useSeriesPaperAccess } from "./WrittenCheckGate";
import { packPriceLabel } from "../../services/packs";

afterEach(() => cleanup());

describe("access hooks", () => {
  it.each([
    ["free", false, false],
    ["trial", false, false],
    ["premium", true, true],
  ])("%s: check/download %s, tutor %s", (tier, check, tutor) => {
    sub.tier = tier;
    expect(renderHook(() => useSeriesPaperAccess()).result.current).toBe(check);
    expect(renderHook(() => useBoardPassHolder()).result.current).toBe(tutor);
  });
});

describe("walls", () => {
  it("the tutor wall: the Board Pass line, both offers, and Not now closes it", () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <TutorBoardPassWall onClose={onClose} />
      </MemoryRouter>,
    );
    const wall = screen.getByTestId("tutor-board-pass-wall");
    expect(wall.textContent).toContain("Tutor support comes with the Board Pass — it explains exactly why you lost this mark");
    expect(screen.getByTestId("tutor-wall-bp").getAttribute("href")).toBe("/board-pass");
    // MYPACKS-TS-1: the Test Series has no tutor - the tutor wall offers the Board Pass ONLY.
    expect(screen.queryByTestId("tutor-wall-ts")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    expect(onClose).toHaveBeenCalled();
  });
  it("the start wall names both products and the count from code", () => {
    render(
      <MemoryRouter>
        <SeriesStartWall />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("series-start-wall").textContent).toContain(`Upgrade to the Test Series (${packPriceLabel("test_series")}) or the Board Pass to take all 180 tests`); // TS-PRICE-2 (edited expectation): the TS price is date-driven (999 founding, 1,499 from 1 Dec), never a literal
    expect(screen.getByTestId("series-start-wall-ts")).toBeTruthy();
    expect(screen.getByTestId("series-start-wall-bp")).toBeTruthy();
  });
});

/* ── TS-PACK-1 · a Test Series Pack owner (ownsTestSeries from /api/packs/mine) ──────────────────────────────── */
const mine = vi.hoisted(() => ({ value: { packs: [], licensee: { name: "A", email: "a@b.in" } } as Record<string, unknown>, calls: 0 }));
vi.mock("../../services/packs", async (orig) => {
  const actual = await orig<typeof import("../../services/packs")>();
  return { ...actual, fetchMyPacks: async () => { mine.calls += 1; return mine.value; } };
});

describe("TS-PACK-1 · ownsTestSeries unlocks the series papers; the checks-left line", () => {
  it("free owner with a uid -> access once the server says so; no uid -> no request, no access; Board Pass -> no request", async () => {
    const { resetTestSeriesOwnershipForTests } = await import("./testSeriesOwnership");
    resetTestSeriesOwnershipForTests();
    mine.calls = 0;
    sub.tier = "free";
    mine.value = { packs: [], licensee: { name: "A", email: "a@b.in" }, ownsTestSeries: true, testSeries: { validUntilMs: 1, checksPerPaper: 2, used: { "TS-CT-M01": 1 } } };
    expect(renderHook(() => useSeriesPaperAccess()).result.current).toBe(false);
    expect(mine.calls).toBe(0);
    const h = renderHook(() => useSeriesPaperAccess("u1"));
    await waitFor(() => expect(h.result.current).toBe(true));
    expect(mine.calls).toBe(1);
    resetTestSeriesOwnershipForTests();
    mine.calls = 0;
    sub.tier = "premium";
    expect(renderHook(() => useSeriesPaperAccess("u1")).result.current).toBe(true);
    expect(mine.calls).toBe(0);
  });

  it("not an owner (or a failed read) -> still gated", async () => {
    const { resetTestSeriesOwnershipForTests } = await import("./testSeriesOwnership");
    resetTestSeriesOwnershipForTests();
    sub.tier = "free";
    mine.value = { packs: [], licensee: { name: "A", email: "a@b.in" } };
    const h = renderHook(() => useSeriesPaperAccess("u2"));
    await waitFor(() => expect(mine.calls).toBeGreaterThan(0));
    expect(h.result.current).toBe(false);
  });

  it("'Checks left on this paper: N of 2' for an owner on a series paper only", async () => {
    const { resetTestSeriesOwnershipForTests } = await import("./testSeriesOwnership");
    resetTestSeriesOwnershipForTests();
    sub.tier = "free";
    mine.value = { packs: [], licensee: { name: "A", email: "a@b.in" }, ownsTestSeries: true, testSeries: { validUntilMs: 1, checksPerPaper: 2, used: { "TS-CT-M01": 1 } } };
    render(<SeriesChecksLeftLine uid="u3" worksheetId="ct-ts1-real-numbers--abc" />);
    expect((await screen.findByTestId("series-checks-left")).textContent).toBe("Checks left on this paper: 1 of 2");
    cleanup();
    render(<SeriesChecksLeftLine uid="u3" worksheetId="fm-ts1-s4--abc" />);
    expect((await screen.findByTestId("series-checks-left")).textContent).toBe("Checks left on this paper: 2 of 2");
    cleanup();
    render(<SeriesChecksLeftLine uid="u3" worksheetId="ct-abc" />);
    expect(screen.queryByTestId("series-checks-left")).toBeNull(); // not a series paper
    cleanup();
    sub.tier = "premium";
    render(<SeriesChecksLeftLine uid="u3" worksheetId="ct-ts1-real-numbers--abc" />);
    expect(screen.queryByTestId("series-checks-left")).toBeNull(); // the Board Pass checks every paper, every time
  });

  it("TS-RECHECK-1: a not-counted check says so plainly, with the count still truthful; nothing otherwise", async () => {
    const { resetTestSeriesOwnershipForTests } = await import("./testSeriesOwnership");
    resetTestSeriesOwnershipForTests();
    sub.tier = "free";
    mine.value = { packs: [], licensee: { name: "A", email: "a@b.in" }, ownsTestSeries: true, testSeries: { validUntilMs: 1, checksPerPaper: 2, used: {}, freeRecheck: { "TS-CT-M01": true } } };
    // LIVE-FIX-1 (edited expectation): the unreadable wording now shows when the page KNOWS the check's pages were unreadable;
    // without a reason the neutral line fits both causes of the free re-check (an unreadable page, an answer not on the pages).
    render(<SeriesChecksLeftLine uid="u4" worksheetId="ct-ts1-real-numbers--abc" notCountedReason="unreadable" />);
    expect((await screen.findByTestId("series-recheck-note")).textContent).toBe(
      "We couldn't read most of your sheet, so this check wasn't counted. Retake the photo in good light and upload again. This free re-check is given once per paper.",
    );
    cleanup();
    render(<SeriesChecksLeftLine uid="u4" worksheetId="ct-ts1-real-numbers--abc" notCountedReason="not-found" />);
    expect((await screen.findByTestId("series-recheck-note")).textContent).toBe(
      "This check wasn't counted — half or more of the answers couldn't be found or read on the pages. Add all your pages and check again. This free re-check is given once per paper.",
    );
    cleanup();
    render(<SeriesChecksLeftLine uid="u4" worksheetId="ct-ts1-real-numbers--abc" />);
    expect((await screen.findByTestId("series-recheck-note")).textContent).toBe(
      "This check wasn't counted — add any missing or unclear pages and check again. This free re-check is given once per paper.",
    );
    expect(screen.getByTestId("series-checks-left").textContent).toBe("Checks left on this paper: 2 of 2");
    expect(screen.getByTestId("series-recheck-note").textContent).not.toMatch(/\bAI\b/);
    cleanup();
    render(<SeriesChecksLeftLine uid="u4" worksheetId="fm-ts1-s4--abc" />);
    await screen.findByTestId("series-checks-left");
    expect(screen.queryByTestId("series-recheck-note")).toBeNull(); // another paper: no note
  });
});

describe("TS-NAV-1 offer links carry the way back to the series paper", () => {
  const withRoute = (entry: string) =>
    render(
      <MemoryRouter initialEntries={[entry]}>
        <SeriesStartWall />
      </MemoryRouter>,
    );
  it("on a series paper the two buy links carry from=test-series and returnTo=<paper>", () => {
    withRoute("/chapter-test/10/Maths/real-numbers?series=1&review=R1");
    const ts = new URL(screen.getByTestId("series-start-wall-ts").getAttribute("href")!, "https://x.test");
    expect(ts.pathname).toBe("/packs");
    expect(ts.searchParams.get("buy")).toBe("test_series");
    expect(ts.searchParams.get("from")).toBe("test-series");
    expect(ts.searchParams.get("returnTo")).toBe("/chapter-test/10/Maths/real-numbers?series=1");
    const bp = new URL(screen.getByTestId("series-start-wall-bp").getAttribute("href")!, "https://x.test");
    expect(bp.pathname).toBe("/board-pass");
    expect(bp.searchParams.get("from")).toBe("test-series");
  });
  it("off a series paper the links are exactly as before", () => {
    withRoute("/chapter-test/10/Maths/real-numbers");
    expect(screen.getByTestId("series-start-wall-ts").getAttribute("href")).toBe("/packs?buy=test_series");
    expect(screen.getByTestId("series-start-wall-bp").getAttribute("href")).toBe("/board-pass");
  });
});

describe("TS-UX-SCORE-1 - checks-used line", () => {
  it("says each paper has its own checks (not 'every other paper still has')", async () => {
    const { checksUsedLine } = await import("./WrittenCheckGate");
    expect(checksUsedLine("CT-M01", 2)).toBe("You've used both checks on this paper (CT-M01). Your other papers have their own 2 checks each.");
    expect(checksUsedLine(null, 3)).toBe("You've used all 3 checks on this paper. Your other papers have their own 3 checks each.");
    expect(checksUsedLine("CT-M01", 2)).not.toMatch(/Every other paper/);
  });
});
