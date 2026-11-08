/**
 * SPEED-CI-2 (owner ruling 8 Nov 2026 12:10 IST: a fixed first demo question for first-time visitors, random after
 * that) — the first-visit starter, CiDemoCard's eager preview of it, and the early tap.
 *
 *   - a first visit opens on the fixed top-weightage starter; the same load keeps it; a later load picks per visit;
 *   - the preview IS the ladder's first frame (the Answer Checker's static paint is captured from it, and the lazy
 *     card replaces it): same markup, attributes that render nothing aside;
 *   - the preview shows only when the card will open on that starter (first visit, the ladder leads, no challenge);
 *   - a tap made before the ladder could answer (static paint or preview) is answered by the ladder with its own
 *     unchanged 0-or-full verdict: right option = 1/1, any other = 0/1.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { setMatchMediaMatches } from "../../test/setup";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const H = vi.hoisted(() => ({ one: vi.fn() }));
vi.mock("../../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../analytics/analytics")>();
  return { ...actual, trackNamedEvent: () => {}, trackOneMinute: (...a: unknown[]) => H.one(...a) };
});

import CiDemoChunk from "./ciDemoChunk";
import CiDemoCard from "./CiDemoCard";
import LadderPreview, { previewStarter } from "./LadderPreview";
import { LADDER_SEEN_KEY, __resetLadderVisitForTests, holdLadderTap, isFirstLadderVisit, takeLadderTap } from "./ladderVisit";
import { fixedStarter, pickStarter, visitSeed } from "./oneMinuteStarters";
import { STARTER_ROWS } from "./oneMinuteStarterRows";
import { __resetMascotBudgetForTests } from "../guide/mascotBudget";
import { __resetMascotsForTests, hideMascots } from "../guide/mascotsMute";

const noop = () => {};
const LIGHT = "PYQ-S-2024-LIGHT-003";
const arrive = (rec: Record<string, string>) => window.sessionStorage.setItem("lazytopper.guideIntent", JSON.stringify(rec));
type W = Window & { __ltStaticTap?: unknown };

beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
  __resetLadderVisitForTests();
  __resetMascotsForTests();
  __resetMascotBudgetForTests();
  H.one.mockReset();
  setMatchMediaMatches(false);
  arrive({ landing: "/check-improve" });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  __resetLadderVisitForTests();
  __resetMascotBudgetForTests();
  __resetMascotsForTests();
  window.history.replaceState(null, "", "/");
});

/** The two cards' markup with what renders nothing (test ids, the preview's own marks, aria-disabled) removed. */
function visible(html: string): string {
  return html
    .replace(/ data-testid="ci-demo(?:-preview)?"/g, "")
    .replace(/ data-ci-first=""/g, "")
    .replace(/ data-ci-bank="[^"]*"/g, "")
    .replace(/ aria-disabled="true"/g, "")
    // Byte's drawing is a lazy chunk of its own: an empty avatar box in the first frame, drawn later in BOTH.
    .replace(/<span class="ci-demo__avatar">[\s\S]*?<\/svg><\/span><\/span>/, '<span class="ci-demo__avatar"></span>');
}

function chunkFirstFrame(): string {
  const { container } = render(<CiDemoChunk onClose={noop} onCheckOwn={noop} onJumpToOwn={noop} signedOut />);
  return (container.querySelector("section") as HTMLElement).outerHTML;
}

describe("the first-visit starter", () => {
  it("a first visit opens on the fixed starter, the same load keeps it, and the question shown is marked seen", () => {
    expect(isFirstLadderVisit()).toBe(true);
    render(<CiDemoChunk onClose={noop} onCheckOwn={noop} onJumpToOwn={noop} signedOut />);
    expect(screen.getByTestId("one-min-question").textContent).toBe(STARTER_ROWS[LIGHT].question);
    expect(window.localStorage.getItem(LADDER_SEEN_KEY)).toBe("1");
    cleanup();
    // Re-opened in the same load: still the first visit's question (never swapped under the student).
    render(<CiDemoChunk onClose={noop} onCheckOwn={noop} onJumpToOwn={noop} signedOut />);
    expect(screen.getByTestId("one-min-question").textContent).toBe(STARTER_ROWS[LIGHT].question);
  });

  it("a later load (key present) picks per visit, exactly as before", () => {
    window.localStorage.setItem(LADDER_SEEN_KEY, "1");
    render(<CiDemoChunk onClose={noop} onCheckOwn={noop} onJumpToOwn={noop} signedOut />);
    expect(screen.getByTestId("one-min-question").textContent).toBe(STARTER_ROWS[pickStarter(null, visitSeed()).bankId].question);
  });

  it("unreadable storage counts as NOT first (today's per-visit pick, no preview)", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(isFirstLadderVisit()).toBe(false);
    expect(previewStarter(null, false)).toBeNull();
  });

  it("a Maths hint (only reachable through Byte's forced ladder) opens on Quadratic Equations", () => {
    window.sessionStorage.setItem("lazytopper.startHereSubject", "Maths");
    render(<CiDemoChunk onClose={noop} onCheckOwn={noop} onJumpToOwn={noop} signedOut ladderForced />);
    expect(screen.getByTestId("one-min-question").textContent).toBe(STARTER_ROWS[fixedStarter("Maths").bankId].question);
  });
});

describe("the preview is the ladder's first frame", () => {
  it("same markup as the lazy card's first frame (mascots on)", () => {
    const preview = render(<LadderPreview starter={fixedStarter(null)} />).container.querySelector("section") as HTMLElement;
    const previewHtml = preview.outerHTML;
    cleanup();
    __resetMascotBudgetForTests();
    expect(previewHtml).toContain(`data-ci-bank="${LIGHT}"`);
    expect(visible(previewHtml)).toBe(visible(chunkFirstFrame()));
  });

  it("same markup with mascots hidden (no avatar on either)", () => {
    hideMascots();
    const previewHtml = (render(<LadderPreview starter={fixedStarter(null)} />).container.querySelector("section") as HTMLElement).outerHTML;
    cleanup();
    expect(previewHtml).not.toContain("ci-demo__avatar");
    expect(visible(previewHtml)).toBe(visible(chunkFirstFrame()));
  });

  it("CiDemoCard shows the preview on a first visit and today's placeholder otherwise", () => {
    const { unmount } = render(<CiDemoCard onClose={noop} onCheckOwn={noop} onJumpToOwn={noop} signedOut />);
    expect(screen.getByTestId("ci-demo-preview")).toBeTruthy();
    expect(screen.queryByTestId("ci-demo-placeholder")).toBeNull();
    unmount();
    window.localStorage.setItem(LADDER_SEEN_KEY, "1");
    __resetLadderVisitForTests();
    render(<CiDemoCard onClose={noop} onCheckOwn={noop} onJumpToOwn={noop} signedOut />);
    expect(screen.getByTestId("ci-demo-placeholder")).toBeTruthy();
    expect(screen.queryByTestId("ci-demo-preview")).toBeNull();
  });

  it("previewStarter: only when the card will open on the fixed starter", () => {
    expect(previewStarter(null, false)?.bankId).toBe(LIGHT);
    window.sessionStorage.setItem("lazytopper.startHereSubject", "Science");
    expect(previewStarter(null, false)?.bankId).toBe(LIGHT);
    // A CBQ ad: the card leads with the sample picker, so no preview.
    arrive({ landing: "/check-improve", utm_content: "cbq_short" });
    expect(previewStarter(null, false)).toBeNull();
    // Byte's forced ladder leads whatever the arrival.
    window.sessionStorage.setItem("lazytopper.startHereSubject", "Maths");
    expect(previewStarter(null, true)?.bankId).toBe(fixedStarter("Maths").bankId);
    // A friend's challenge loads THAT question.
    arrive({ landing: "/check-improve" });
    window.history.replaceState(null, "", `/check-improve?challenge=${LIGHT}`);
    expect(previewStarter(null, false)).toBeNull();
  });
});

describe("the early tap is answered by the ladder, 0 or full as today", () => {
  const right = STARTER_ROWS[LIGHT].right;
  const wrong = (right + 2) % 4;

  function ladder() {
    const answered = vi.fn();
    render(<CiDemoChunk onClose={noop} onCheckOwn={noop} onJumpToOwn={noop} signedOut onLadderAnswered={answered} />);
    return answered;
  }

  it("FU1: an early tap is the ladder's FIRST frame (no later update) and is RECORDED at once; only the layout waits", () => {
    (window as W).__ltStaticTap = { id: `one-min-opt-${right}`, bank: LIGHT };
    const answered = vi.fn();
    const settled = vi.fn();
    const { container } = render(<CiDemoChunk onClose={noop} onCheckOwn={noop} onJumpToOwn={noop} signedOut onLadderAnswered={answered} onLadderSettled={settled} />);
    // Synchronous: the verdict is there in the render that replaced the preview, inside the reserved box.
    expect(screen.getByTestId("one-min-verdict").textContent).toContain("✓ 1/1");
    expect((container.querySelector(".ci-demo__verdict") as HTMLElement).className).toContain("ci-demo__verdict--reserve");
    // (a) the attempt is handed to the page at once (marked early: the page keeps its layout), and counted once.
    expect(answered).toHaveBeenCalledTimes(1);
    expect(answered.mock.calls[0][0]).toMatchObject({ bankId: LIGHT, correct: true });
    expect(answered.mock.calls[0][1]).toEqual({ early: true });
    expect(H.one.mock.calls.filter((c) => c[0] === "one_min_tap_answered")).toHaveLength(1);
    expect(settled).not.toHaveBeenCalled();
  });

  it("B3: the layout waits until the next tap / key has COMPLETED — never on pointerdown or a scroll — then gives the space back once", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      (window as W).__ltStaticTap = { id: `one-min-opt-${wrong}`, bank: LIGHT };
      const answered = vi.fn();
      const settled = vi.fn();
      const { container } = render(<CiDemoChunk onClose={noop} onCheckOwn={noop} onJumpToOwn={noop} signedOut onLadderAnswered={answered} onLadderSettled={settled} />);
      const reserved = () => (container.querySelector(".ci-demo__verdict") as HTMLElement).className.includes("ci-demo__verdict--reserve");
      fireEvent.pointerDown(document.body);
      fireEvent.touchStart(document.body);
      fireEvent.scroll(window);
      fireEvent.keyDown(document.body, { key: "Tab" });
      act(() => {
        vi.runOnlyPendingTimers();
      });
      expect(reserved()).toBe(true);
      expect(settled).not.toHaveBeenCalled();
      // The click's own handlers run first (the target is where it was); the layout changes in the next task.
      fireEvent.click(document.body);
      expect(reserved()).toBe(true);
      expect(settled).not.toHaveBeenCalled();
      act(() => {
        vi.runOnlyPendingTimers();
      });
      expect(reserved()).toBe(false);
      expect(settled).toHaveBeenCalledTimes(1);
      fireEvent.click(document.body);
      fireEvent.keyUp(document.body, { key: "a" });
      act(() => {
        vi.runOnlyPendingTimers();
      });
      expect(settled).toHaveBeenCalledTimes(1);
      expect(answered).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("B3: a key that completes (keyup) settles too; leaving the card settles; a tap made on the ready ladder never waits", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      (window as W).__ltStaticTap = { id: `one-min-opt-${right}`, bank: LIGHT };
      const settled = vi.fn();
      const first = render(<CiDemoChunk onClose={noop} onCheckOwn={noop} onJumpToOwn={noop} signedOut onLadderSettled={settled} />);
      fireEvent.keyUp(document.body, { key: "Enter" });
      act(() => {
        vi.runOnlyPendingTimers();
      });
      expect(settled).toHaveBeenCalledTimes(1);
      first.unmount();
      (window as W).__ltStaticTap = { id: `one-min-opt-${right}`, bank: LIGHT };
      const left = vi.fn();
      render(<CiDemoChunk onClose={noop} onCheckOwn={noop} onJumpToOwn={noop} signedOut onLadderSettled={left} />).unmount();
      expect(left).toHaveBeenCalledTimes(1);
      const normal = vi.fn();
      const answered = vi.fn();
      const { container } = render(<CiDemoChunk onClose={noop} onCheckOwn={noop} onJumpToOwn={noop} signedOut onLadderAnswered={answered} onLadderSettled={normal} />);
      fireEvent.click(screen.getByTestId(`one-min-opt-${wrong}`));
      expect(answered.mock.calls[0][1]).toBeUndefined();
      expect((container.querySelector(".ci-demo__verdict") as HTMLElement).className).not.toContain("ci-demo__verdict--reserve");
      act(() => {
        vi.runOnlyPendingTimers();
      });
      expect(normal).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("(b) the page's landing line is hidden IN PLACE while the verdict box is held (no second offer line, no shift)", () => {
    const css = readFileSync(resolve(__dirname, "ciDemo.css"), "utf8");
    expect(css).toMatch(/\.ci-demo:has\(\.ci-demo__verdict--reserve\) \+ \.lt-lo,\s*\.ci-demo:has\(\.ci-demo__verdict--reserve\) \+ \.lt-lo-slot \{\s*visibility: hidden;/);
    const page = readFileSync(resolve(__dirname, "../../pages/desktop/DesktopCheckImprovePage.tsx"), "utf8");
    // The landing line is the card's NEXT sibling (what the CSS relies on), and an early tap defers only its removal.
    expect(page).toMatch(/<CiDemoCard[\s\S]*?\/>\s*\)\}\s*\{\/\*[^]*?\*\/\}\s*\{!overlay && ciDemo\.show && !ciMomentUid && !ladderAnsweredHere \? <LandingOffer variant="check" \/> : null\}/);
    expect(page).toContain("if (!meta?.early) setLadderAnsweredHere(true);");
    expect(page).toContain("onLadderSettled={ciLadderSettled}");
  });

  it("FU1: the preview holding a tap shows the same reserved boxes (the static guard inserts them too); FU2: × and watch look inert", () => {
    (window as W).__ltStaticTap = { id: `one-min-opt-${wrong}`, bank: LIGHT };
    const { container } = render(<LadderPreview starter={fixedStarter(null)} />);
    const ul = container.querySelector("ul") as HTMLElement;
    expect((ul.previousElementSibling as HTMLElement).className).toBe("ci-demo__verdict-mark ci-demo__verdict-mark--held");
    expect((ul.previousElementSibling as HTMLElement).textContent).toBe("Checking your answer…");
    expect((ul.nextElementSibling as HTMLElement).className).toBe("ci-demo__verdict ci-demo__verdict--reserve");
    const css = readFileSync(resolve(__dirname, "ciDemo.css"), "utf8");
    expect(css).toMatch(/\.ci-demo\[data-ci-first\] \.ci-demo__close,\s*\.ci-demo\[data-ci-first\] \.ci-demo__link \{\s*opacity: 0\.45;/);
    // SPEED-CI-3 (review of #1641): no derived height is reserved for the verdict at any width — only the mark line
    // (the held line above) — and what lies below the landing verdict is hidden in place while it settles.
    expect([...css.matchAll(/\.ci-demo__verdict--reserve\s*\{([^}]*)\}/g)].map((m) => m[1].replace(/\s+/g, ""))).toEqual(["min-height:0;"]);
    // Two separate rules (an engine without :has drops only the second) and opacity, so the hidden nodes stay tappable.
    expect(css).toMatch(/\.ci-demo__ladder\[data-settling\] > \.ci-demo__link \{\s*opacity: 0;\s*\}/);
    expect(css).toMatch(/\.ci-demo:has\(\.ci-demo__ladder\[data-settling\]\) ~ \* \{\s*opacity: 0;\s*\}/);
  });

  it("SPEED-CI-3: the watch link's inert and active looks are the same box (only opacity / cursor differ)", () => {
    const css = readFileSync(resolve(__dirname, "ciDemo.css"), "utf8");
    const inert = css.match(/\.ci-demo\[data-ci-first\] \.ci-demo__link \{([^}]*)\}/)?.[1] ?? "";
    expect(inert.split(";").map((d) => d.split(":")[0].trim()).filter(Boolean).sort()).toEqual(["cursor", "opacity"]);
    // ...and nothing hides it: it stays visible and tappable once the card is in.
    expect(css).not.toMatch(/\.ci-demo__link\s*\{[^}]*(visibility|display)\s*:/);
  });

  it("a tap on the STATIC paint's right option: 1/1", () => {
    (window as W).__ltStaticTap = { id: `one-min-opt-${right}`, bank: LIGHT };
    const answered = ladder();
    expect(screen.getByTestId("one-min-verdict").textContent).toContain("✓ 1/1");
    fireEvent.pointerDown(document.body);
    expect(answered).toHaveBeenCalledTimes(1);
    expect(answered.mock.calls[0][0]).toMatchObject({ bankId: LIGHT, correct: true });
    expect((window as W).__ltStaticTap).toBeNull();
  });

  it("a tap on the STATIC paint's wrong option: 0/1 with the right answer", () => {
    (window as W).__ltStaticTap = { id: `one-min-opt-${wrong}`, bank: LIGHT };
    const answered = ladder();
    expect(screen.getByTestId("one-min-verdict").textContent).toContain("✗ 0/1");
    expect(answered.mock.calls[0][0]).toMatchObject({ bankId: LIGHT, correct: false });
  });

  it("a tap held by the PREVIEW is answered once; a tap for another question, or not an option, is ignored", () => {
    render(<LadderPreview starter={fixedStarter(null)} />);
    fireEvent.click(screen.getByTestId(`one-min-opt-${right}`));
    expect(screen.getByTestId(`one-min-opt-${right}`).className).toContain("ci-demo__opt--held");
    expect(screen.getByTestId(`one-min-opt-${right}`).getAttribute("aria-busy")).toBe("true");
    cleanup();
    ladder();
    expect(screen.getByTestId("one-min-verdict").textContent).toContain("✓ 1/1");
    expect(takeLadderTap(LIGHT)).toBeNull();
    cleanup();
    __resetLadderVisitForTests();
    window.localStorage.clear();
    holdLadderTap("PYQ-M-QE-002", right);
    (window as W).__ltStaticTap = { id: "ci-demo-close", bank: LIGHT };
    ladder();
    expect(screen.queryByTestId("one-min-verdict")).toBeNull();
  });

  it("the preview carries a static tap as held (pressed), and marks nothing itself", async () => {
    (window as W).__ltStaticTap = { id: `one-min-opt-${wrong}`, bank: LIGHT };
    render(<LadderPreview starter={fixedStarter(null)} />);
    await act(async () => {});
    expect(screen.getByTestId(`one-min-opt-${wrong}`).className).toContain("ci-demo__opt--held");
    expect(screen.queryByTestId("one-min-verdict")).toBeNull();
    expect(H.one).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(LADDER_SEEN_KEY)).toBeNull();
  });
});
