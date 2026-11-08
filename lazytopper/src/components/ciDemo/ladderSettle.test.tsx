/**
 * SPEED-CI-3 (review of #1641) — an early tap's verdict lands with NO reserved height; what lies below it is hidden in
 * place (`data-settling`) until the buying block's pack rows are in, the block has none, or the student's next tap / key.
 * The mark line is the bring-into-view target (useClearBottomNav `keep`).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useEffect, useState } from "react";
import { setMatchMediaMatches } from "../../test/setup";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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
const P = vi.hoisted(() => ({ prefetch: vi.fn() }));
vi.mock("./offerRowsPrefetch", () => ({ prefetchOfferRows: P.prefetch }));
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
  P.prefetch.mockReset();
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

  it("a scroll shows the held landing line again (no blank hole); a plain pointer tap does not (B3 keeps its target still)", () => {
    (window as W).__ltStaticTap = { id: "one-min-opt-0", bank: LIGHT };
    render(<CiDemoChunk onClose={noop} onCheckOwn={noop} onJumpToOwn={noop} signedOut />);
    expect(ladder().hasAttribute("data-lo-shown")).toBe(false);
    act(() => {
      fireEvent.pointerDown(document.body);
    });
    expect(ladder().hasAttribute("data-lo-shown")).toBe(false);
    act(() => {
      fireEvent.wheel(document.body);
    });
    expect(ladder().hasAttribute("data-lo-shown")).toBe(true);
    const css = readFileSync(resolve(__dirname, "ciDemo.css"), "utf8");
    expect(css).toMatch(/\.ci-demo:has\(\.ci-demo__verdict--reserve\):not\(:has\(\.ci-demo__ladder\[data-lo-shown\]\)\) \+ \.lt-lo,/);
  });

  it("the page under the card is aria-hidden exactly while it is see-through (and the watch link too)", async () => {
    B.rowsLater = true;
    (window as W).__ltStaticTap = { id: "one-min-opt-2", bank: LIGHT };
    render(
      <>
        <CiDemoChunk onClose={noop} onCheckOwn={noop} onJumpToOwn={noop} signedOut />
        <div data-testid="below">page</div>
        <div data-testid="own" aria-hidden="false">kept</div>
      </>,
    );
    expect(screen.getByTestId("below").getAttribute("aria-hidden")).toBe("true");
    expect(screen.getByTestId("own").getAttribute("aria-hidden")).toBe("false");
    expect(screen.getByTestId("one-min-watch").getAttribute("aria-hidden")).toBe("true");
    act(() => {
      fireEvent.pointerDown(document.body);
    });
    expect(screen.getByTestId("below").hasAttribute("aria-hidden")).toBe(false);
    expect(screen.getByTestId("own").getAttribute("aria-hidden")).toBe("false");
    expect(screen.getByTestId("one-min-watch").hasAttribute("aria-hidden")).toBe(false);
  });

  it("the rows start loading at the tap: an early tap's ladder at once, a ready ladder on its first pointerdown", () => {
    (window as W).__ltStaticTap = { id: "one-min-opt-2", bank: LIGHT };
    const first = render(<CiDemoChunk onClose={noop} onCheckOwn={noop} onJumpToOwn={noop} signedOut />);
    expect(P.prefetch).toHaveBeenCalled();
    first.unmount();
    P.prefetch.mockReset();
    window.localStorage.clear();
    __resetLadderVisitForTests();
    render(<CiDemoChunk onClose={noop} onCheckOwn={noop} onJumpToOwn={noop} signedOut />);
    expect(P.prefetch).not.toHaveBeenCalled();
    fireEvent.pointerDown(screen.getByTestId("one-min-opt-0"));
    expect(P.prefetch).toHaveBeenCalledTimes(1);
  });

  it("the student's tap released the hide before the rows came: the rows wait too, then show after a later tap", () => {
    (window as W).__ltStaticTap = { id: "one-min-opt-2", bank: LIGHT };
    render(<CiDemoChunk onClose={noop} onCheckOwn={noop} onJumpToOwn={noop} signedOut />);
    act(() => {
      fireEvent.pointerDown(document.body);
    });
    expect(ladder().hasAttribute("data-settling")).toBe(false);
    expect(ladder().hasAttribute("data-rows-wait")).toBe(true);
  });

  it("rows later than the hide wait out of the layout while their place is ON screen; shown once it is below the screen", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame"] });
    let end = 400; // the buying block's end, in view
    const orig = Element.prototype.getBoundingClientRect;
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
      if ((this as HTMLElement).dataset?.testid === "offers-block") return { top: end - 300, bottom: end, left: 0, right: 0, width: 0, height: 300, x: 0, y: end - 300, toJSON: () => ({}) } as DOMRect;
      return orig.call(this);
    });
    try {
      (window as W).__ltStaticTap = { id: "one-min-opt-0", bank: LIGHT };
      render(<CiDemoChunk onClose={noop} onCheckOwn={noop} onJumpToOwn={noop} signedOut />);
      act(() => {
        vi.advanceTimersByTime(1600);
      });
      expect(ladder().hasAttribute("data-settling")).toBe(false);
      expect(ladder().hasAttribute("data-rows-wait")).toBe(true);
      await act(async () => {
        (window as W).__rows?.();
        await Promise.resolve();
      });
      expect(ladder().hasAttribute("data-rows-wait")).toBe(true); // their place is on screen: they would push the view
      act(() => {
        fireEvent.click(document.body);
        vi.advanceTimersByTime(5);
      });
      expect(ladder().hasAttribute("data-rows-wait")).toBe(true); // a tap alone never makes the page jump under it
      end = window.innerHeight + 20;
      act(() => {
        window.dispatchEvent(new Event("scroll"));
      });
      expect(ladder().hasAttribute("data-rows-wait")).toBe(false);
    } finally {
      vi.useRealTimers();
    }
    const css = readFileSync(resolve(__dirname, "ciDemo.css"), "utf8");
    expect(css).toMatch(/\.ci-demo__ladder\[data-rows-wait\] \[data-testid="offers-packs"\] \{\s*display: none;\s*\}/);
  });

  it("rows whose place is ABOVE the screen keep waiting (no jump under a scrolling student)", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame"] });
    const orig = Element.prototype.getBoundingClientRect;
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
      if ((this as HTMLElement).dataset?.testid === "offers-block") return { top: -350, bottom: -50, left: 0, right: 0, width: 0, height: 300, x: 0, y: -350, toJSON: () => ({}) } as DOMRect;
      return orig.call(this);
    });
    try {
      (window as W).__ltStaticTap = { id: "one-min-opt-0", bank: LIGHT };
      render(<CiDemoChunk onClose={noop} onCheckOwn={noop} onJumpToOwn={noop} signedOut />);
      act(() => {
        vi.advanceTimersByTime(1600);
      });
      await act(async () => {
        (window as W).__rows?.();
        await Promise.resolve();
      });
      act(() => {
        window.dispatchEvent(new Event("scroll"));
      });
      expect(ladder().hasAttribute("data-rows-wait")).toBe(true);
    } finally {
      vi.useRealTimers();
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
