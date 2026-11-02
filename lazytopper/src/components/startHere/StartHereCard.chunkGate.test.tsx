/**
 * ACT-FIRST-1 — the focused Byte must not exist before its chunk (and guide.css) can paint: no overlay, no
 * page scroll lock, no focus trap while the chunk loads; a chunk that fails (or is too slow) shows the plain
 * first-action card, which is styled by its own CSS and has a visible Close.
 */
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup, screen, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { setMatchMediaMatches } from "../../test/setup";

const { cloudHas, localRows, onboarding, auth, chunk } = vi.hoisted(() => ({
  auth: { currentUser: null as null | { uid: string; metadata: { creationTime?: string } } },
  cloudHas: vi.fn(),
  localRows: vi.fn(),
  onboarding: vi.fn(),
  chunk: { load: null as null | (() => Promise<boolean>) },
}));
vi.mock("../../services/sessionRecords", () => ({ cloudHasAnySessionRecord: cloudHas, loadLocalSessionRecords: localRows }));
vi.mock("../../analytics/analytics", () => ({ trackOnboardingEvent: onboarding, trackGuideVariantAssigned: vi.fn() }));
vi.mock("../../services/firebaseClient", () => ({ authClient: auth }));
vi.mock("../guide/lazyGuide", async (orig) => ({
  ...(await orig<typeof import("../guide/lazyGuide")>()),
  preloadGuideChunk: () => (chunk.load ? chunk.load() : Promise.resolve(true)),
}));

import { StartHereFocusView, useStartHere, GUIDE_CHUNK_WAIT_MS } from "./StartHereCard";
import { resetZeroGradedCacheForTests } from "./zeroGraded";
import { __resetGuideVariantSentForTests, __setGuideAbForTests } from "../guide/guideVariant";
import { __resetMascotBudgetForTests } from "../guide/mascotBudget";

function Harness() {
  const s = useStartHere("u1");
  return <StartHereFocusView uid="u1" surface="home" returnTo="/" state={s} />;
}
const mount = () => render(<MemoryRouter><Harness /></MemoryRouter>);
const locked = () => document.documentElement.classList.contains("lt-shcf-lock");

beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
  resetZeroGradedCacheForTests();
  __resetGuideVariantSentForTests();
  __resetMascotBudgetForTests();
  cloudHas.mockReset().mockResolvedValue(false);
  localRows.mockReset().mockReturnValue([]);
  onboarding.mockReset();
  auth.currentUser = null;
  setMatchMediaMatches(false);
  __setGuideAbForTests(true, "guide");
});
afterEach(() => {
  cleanup();
  chunk.load = null;
  __setGuideAbForTests(null);
  vi.useRealTimers();
});

describe("ACT-FIRST-1 · the focused Byte waits for its chunk", () => {
  it("★★ chunk pending: NO overlay, NO scroll lock, NO shown event; chunk ready: the guide shell opens", async () => {
    let done: (ok: boolean) => void = () => {};
    chunk.load = () => new Promise<boolean>((r) => (done = r));
    mount();
    await act(async () => {});
    expect(screen.queryByTestId("start-here-focus")).toBeNull();
    expect(locked()).toBe(false);
    expect(onboarding.mock.calls.filter((c) => String(c[0]).includes("shown"))).toHaveLength(0);
    await act(async () => done(true));
    const shell = await screen.findByTestId("start-here-focus");
    expect(shell.getAttribute("data-arm")).toBe("guide");
    expect(locked()).toBe(true);
  });

  it("★★ chunk FAILED: the plain first-action card (with a visible Close), not an empty layer", async () => {
    chunk.load = () => Promise.resolve(false);
    mount();
    const shell = await screen.findByTestId("start-here-focus");
    expect(shell.getAttribute("data-arm")).toBeNull();
    expect(screen.getByTestId("start-here-focus-close")).toBeTruthy();
  });

  it("a chunk slower than GUIDE_CHUNK_WAIT_MS also gets the plain card, and a late chunk does not swap it", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let done: (ok: boolean) => void = () => {};
    chunk.load = () => new Promise<boolean>((r) => (done = r));
    mount();
    await act(async () => {});
    expect(screen.queryByTestId("start-here-focus")).toBeNull();
    await act(async () => {
      vi.advanceTimersByTime(GUIDE_CHUNK_WAIT_MS + 50);
    });
    const shell = await screen.findByTestId("start-here-focus");
    expect(shell.getAttribute("data-arm")).toBeNull();
    await act(async () => done(true));
    expect(screen.getByTestId("start-here-focus").getAttribute("data-arm")).toBeNull();
  });
});
