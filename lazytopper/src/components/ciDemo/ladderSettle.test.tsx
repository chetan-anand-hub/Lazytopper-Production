/**
 * SPEED-CI-3 (review of #1641) — an early tap's verdict lands with NO reserved height; what lies below it is hidden in
 * place (`data-settling`) until the buying block's pack rows are in, the block has none, or the student's next tap / key.
 * The mark line is the bring-into-view target (useClearBottomNav `keep`).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useEffect, useState } from "react";
import { setMatchMediaMatches } from "../../test/setup";

const B = vi.hoisted(() => ({ block: true, rowsLater: true }));
vi.mock("../../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../analytics/analytics")>();
  return { ...actual, trackNamedEvent: () => {}, trackOneMinute: () => {} };
});
// The buying block: present or not; its rows land a moment later (as OffersBlock's lazy OfferRows does).
vi.mock("../packs/LadderOffers", () => ({
  default: function LadderOffers() {
    const [rows, setRows] = useState(!B.rowsLater);
    useEffect(() => {
      (window as unknown as { __rows?: () => void }).__rows = () => setRows(true);
    }, []);
    if (!B.block) return null;
    return <div data-testid="offers-block">{rows ? <section data-testid="offers-packs" /> : null}</div>;
  },
}));
// The rows chunk the ladder waits on: never resolves in these tests (the DOM decides).
vi.mock("../packs/OfferRows", () => new Promise(() => undefined));

import CiDemoChunk from "./ciDemoChunk";
import { __resetLadderVisitForTests } from "./ladderVisit";
import { __resetMascotBudgetForTests } from "../guide/mascotBudget";
import { __resetMascotsForTests } from "../guide/mascotsMute";

const noop = () => {};
const LIGHT = "PYQ-S-2024-LIGHT-003";
type W = Window & { __ltStaticTap?: unknown; __rows?: () => void };
const ladder = () => screen.getByTestId("one-min-ladder");

beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
  __resetLadderVisitForTests();
  __resetMascotsForTests();
  __resetMascotBudgetForTests();
  setMatchMediaMatches(false);
  window.sessionStorage.setItem("lazytopper.guideIntent", JSON.stringify({ landing: "/check-improve" }));
  B.block = true;
  B.rowsLater = true;
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  (window as W).__ltStaticTap = null;
  __resetLadderVisitForTests();
  window.history.replaceState(null, "", "/");
});

describe("an early tap's verdict settles without a reserved height", () => {
  it("rows already there at landing (cached chunk): still settling in the landing frame, released after it", async () => {
    B.rowsLater = false;
    (window as W).__ltStaticTap = { id: "one-min-opt-2", bank: LIGHT };
    render(<CiDemoChunk onClose={noop} onCheckOwn={noop} onJumpToOwn={noop} signedOut />);
    expect(screen.getByTestId("offers-packs")).toBeTruthy();
    expect(ladder().hasAttribute("data-settling")).toBe(true);
    await act(() => new Promise((r) => setTimeout(r, 80)));
    expect(ladder().hasAttribute("data-settling")).toBe(false);
  });

  it("lands settling, with the verdict and mark in the same first frame; settles when the pack rows arrive", async () => {
    B.rowsLater = true;
    (window as W).__ltStaticTap = { id: "one-min-opt-2", bank: LIGHT };
    render(<CiDemoChunk onClose={noop} onCheckOwn={noop} onJumpToOwn={noop} signedOut />);
    expect(screen.getByTestId("one-min-verdict").textContent).toContain("✗ 0/1");
    expect(ladder().hasAttribute("data-settling")).toBe(true);
    await act(async () => {
      (window as W).__rows?.();
      await Promise.resolve();
    });
    expect(screen.getByTestId("offers-packs")).toBeTruthy();
    await act(() => new Promise((r) => setTimeout(r, 80)));
    expect(ladder().hasAttribute("data-settling")).toBe(false);
  });

  it("no buying block (packs off / a paid student): settled right after the landing frame has painted, never in it", async () => {
    B.block = false;
    (window as W).__ltStaticTap = { id: "one-min-opt-0", bank: LIGHT };
    render(<CiDemoChunk onClose={noop} onCheckOwn={noop} onJumpToOwn={noop} signedOut />);
    expect(screen.getByTestId("one-min-verdict").textContent).toContain("✓ 1/1");
    expect(ladder().hasAttribute("data-settling")).toBe(true);
    await act(() => new Promise((r) => setTimeout(r, 80)));
    expect(ladder().hasAttribute("data-settling")).toBe(false);
  });

  it("the student's own input (key, touch, pointer, wheel) releases it AT ONCE, even if the rows never come", () => {
    for (const fire of [
      () => fireEvent.keyDown(document.body, { key: "Tab" }),
      () => fireEvent.touchStart(document.body),
      () => fireEvent.pointerDown(document.body),
      () => fireEvent.wheel(document.body),
    ]) {
      window.localStorage.clear(); // a first visit each time (the fixed starter the static tap was made on)
      __resetLadderVisitForTests();
      (window as W).__ltStaticTap = { id: "one-min-opt-0", bank: LIGHT };
      const { unmount } = render(<CiDemoChunk onClose={noop} onCheckOwn={noop} onJumpToOwn={noop} signedOut />);
      expect(ladder().hasAttribute("data-settling")).toBe(true);
      act(() => {
        fire();
      });
      // Synchronous: no frame wait, so a scroll never uncovers a hole and the releasing tap lands on a shown control.
      expect(ladder().hasAttribute("data-settling")).toBe(false);
      unmount();
    }
  });

  it("rows that never come: released 1.5 s after the landing, never left hidden", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame"] });
    try {
      (window as W).__ltStaticTap = { id: "one-min-opt-0", bank: LIGHT };
      render(<CiDemoChunk onClose={noop} onCheckOwn={noop} onJumpToOwn={noop} signedOut />);
      act(() => {
        vi.advanceTimersByTime(1400);
      });
      expect(ladder().hasAttribute("data-settling")).toBe(true);
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(ladder().hasAttribute("data-settling")).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("a tap on the ready ladder never settles (nothing was hidden)", () => {
    render(<CiDemoChunk onClose={noop} onCheckOwn={noop} onJumpToOwn={noop} signedOut />);
    expect(ladder().hasAttribute("data-settling")).toBe(false);
    fireEvent.click(screen.getByTestId("one-min-opt-0"));
    expect(ladder().hasAttribute("data-settling")).toBe(false);
  });

  it("the bring-into-view keeps the MARK on screen: it scrolls by the page, never aligning the tall box's top", () => {
    const scrollBy = vi.fn();
    const into = vi.fn();
    vi.stubGlobal("scrollBy", scrollBy);
    const orig = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = into;
    try {
      (window as W).__ltStaticTap = { id: "one-min-opt-2", bank: LIGHT };
      render(<CiDemoChunk onClose={noop} onCheckOwn={noop} onJumpToOwn={noop} signedOut />);
      expect(into).not.toHaveBeenCalled();
    } finally {
      Element.prototype.scrollIntoView = orig;
      vi.unstubAllGlobals();
    }
  });
});
