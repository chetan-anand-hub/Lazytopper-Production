// TEST-SERIES-1 — the gate pieces: who may check / download (Board Pass or Test Series), who opens the tutor (Board Pass only),
// and the walls (both offers, equal weight).
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const sub = vi.hoisted(() => ({ tier: "free" }));
vi.mock("../../hooks/useSubscription", () => ({ useSubscription: () => ({ status: { tier: sub.tier } }) }));

import { SeriesChecksLeftLine, SeriesStartWall, TutorBoardPassWall, useBoardPassHolder, useSeriesPaperAccess } from "./WrittenCheckGate";

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
    expect(screen.getByTestId("tutor-wall-ts").getAttribute("href")).toBe("/packs?buy=test_series");
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    expect(onClose).toHaveBeenCalled();
  });
  it("the start wall names both products and the count from code", () => {
    render(
      <MemoryRouter>
        <SeriesStartWall />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("series-start-wall").textContent).toContain("Upgrade to the Test Series (₹999 + GST) or the Board Pass to take all 66 tests");
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
});
