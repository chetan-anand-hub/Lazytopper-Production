// TEST-SERIES-1 — the gate pieces: who may check / download (Board Pass or Test Series), who opens the tutor (Board Pass only),
// and the walls (both offers, equal weight).
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const sub = vi.hoisted(() => ({ tier: "free" }));
vi.mock("../../hooks/useSubscription", () => ({ useSubscription: () => ({ status: { tier: sub.tier } }) }));

import { SeriesStartWall, TutorBoardPassWall, useBoardPassHolder, useSeriesPaperAccess } from "./WrittenCheckGate";

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
