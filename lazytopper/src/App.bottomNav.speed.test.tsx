// SPEED-NAV-1 — a BottomNav tap paints its feedback (the pressed tab turns active) in the tap's
// own task and navigates one frame later (afterNextPaint): one push per tab, the last tab tapped wins,
// and the bar can never be left locked (#1634 review B1/B2).
import { describe, it, expect, afterEach, vi } from "vitest";
import { Suspense, lazy, useState } from "react";
import { render, screen, cleanup, fireEvent, waitFor, act } from "@testing-library/react";
import { BrowserRouter, MemoryRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { setMatchMediaMatches } from "./test/setup";
import { BottomNav } from "./App";

const auth = vi.hoisted(() => ({ user: { uid: "u1" } as null | { uid: string } }));
vi.mock("./context/AuthContext", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./context/AuthContext")>();
  return { ...actual, useAuth: () => ({ user: auth.user, loading: false }) as unknown as ReturnType<typeof actual.useAuth> };
});
const track = vi.hoisted(() => vi.fn());
vi.mock("./analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./analytics/analytics")>();
  return { ...actual, trackNavPricingTap: track };
});

const prefetch = vi.hoisted(() => vi.fn());
vi.mock("./lib/nav/bottomNavPrefetch", () => ({ prefetchBottomNavPage: prefetch }));

const ACTIVE_GREEN = "rgb(52, 178, 119)";
const INACTIVE_SLATE = "rgb(91, 102, 123)";

/** Records every location the router commits (one entry per push). */
const seen: string[] = [];
function Probe() {
  const loc = useLocation();
  const navigate = useNavigate();
  if (seen[seen.length - 1] !== loc.key) seen.push(loc.key);
  return (
    <>
      <div data-testid="loc">{loc.pathname + loc.search}</div>
      <button type="button" onClick={() => navigate("/elsewhere")}>
        test-back
      </button>
    </>
  );
}
function renderNav(path: string) {
  seen.length = 0;
  return render(
    <MemoryRouter initialEntries={[path]}>
      <BottomNav />
      <Routes>
        <Route path="*" element={<Probe />} />
      </Routes>
    </MemoryRouter>,
  );
}
const tab = (label: string) => screen.getByText(label).closest("button")!;
const settle = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 150)));

afterEach(() => {
  cleanup();
  auth.user = { uid: "u1" };
  track.mockClear();
  prefetch.mockClear();
});

describe("SPEED-NAV-1 — BottomNav tap feedback and deferred navigation", () => {
  it("the tapped tab turns active in the tap itself; the route changes only after the frame", async () => {
    setMatchMediaMatches(false);
    renderNav("/practice-hub");
    expect(tab("Practice").style.color).toBe(ACTIVE_GREEN);
    fireEvent.click(tab("Check"));
    // Same task as the tap: feedback painted, navigation not yet run.
    expect(tab("Check").style.color).toBe(ACTIVE_GREEN);
    expect(tab("Practice").style.color).toBe(INACTIVE_SLATE);
    expect(screen.getByTestId("loc")).toHaveTextContent("/practice-hub");
    await waitFor(() => expect(screen.getByTestId("loc")).toHaveTextContent("/check-improve"));
    // After the route change, the active state comes from the route again.
    expect(tab("Check").style.color).toBe(ACTIVE_GREEN);
    expect(tab("Practice").style.color).toBe(INACTIVE_SLATE);
  });

  it("a double tap on the SAME tab pushes the route once", async () => {
    setMatchMediaMatches(false);
    renderNav("/browse");
    fireEvent.click(tab("Exam Trends"));
    fireEvent.click(tab("Exam Trends"));
    await waitFor(() => expect(screen.getByTestId("loc")).toHaveTextContent("/exam-trends"));
    await settle();
    expect(screen.getByTestId("loc")).toHaveTextContent("/exam-trends");
    expect(seen).toHaveLength(2); // the start entry + exactly one push
  });

  it("★ B1: a quick tap on a DIFFERENT tab takes over — the bar ends on the second tab", async () => {
    setMatchMediaMatches(false);
    renderNav("/practice-hub");
    fireEvent.click(tab("Check"));
    fireEvent.click(tab("Exam Trends")); // before the first push has even run
    expect(tab("Exam Trends").style.color).toBe(ACTIVE_GREEN);
    expect(tab("Check").style.color).toBe(INACTIVE_SLATE);
    await waitFor(() => expect(screen.getByTestId("loc")).toHaveTextContent("/exam-trends"));
    await settle();
    expect(screen.getByTestId("loc")).toHaveTextContent("/exam-trends");
    expect(seen).toHaveLength(2); // the cancelled Check push never happened
  });

  it("a tap whose route was overtaken (Back / another link) before the frame is dropped", async () => {
    setMatchMediaMatches(false);
    renderNav("/browse");
    fireEvent.click(tab("Check"));
    fireEvent.click(screen.getByText("test-back"));
    await waitFor(() => expect(screen.getByTestId("loc")).toHaveTextContent("/elsewhere"));
    await settle();
    expect(screen.getByTestId("loc")).toHaveTextContent("/elsewhere");
    // The pressed state is cleared by the route change, so no tab is falsely active.
    expect(tab("Check").style.color).toBe(INACTIVE_SLATE);
  });

  it("a tab tap still pending when the bar unmounts never navigates", async () => {
    setMatchMediaMatches(false);
    seen.length = 0;
    function Harness() {
      const [bar, setBar] = useState(true);
      return (
        <>
          {bar ? <BottomNav /> : null}
          <button type="button" onClick={() => setBar(false)}>
            hide-bar
          </button>
          <Routes>
            <Route path="*" element={<Probe />} />
          </Routes>
        </>
      );
    }
    render(
      <MemoryRouter initialEntries={["/browse"]}>
        <Harness />
      </MemoryRouter>,
    );
    fireEvent.click(tab("Check"));
    fireEvent.click(screen.getByText("hide-bar"));
    await settle();
    expect(screen.getByTestId("loc")).toHaveTextContent("/browse");
    expect(seen).toHaveLength(1);
  });

  it("Pricing: the analytics event fires once (even on a double tap), in the tap, before the navigation", async () => {
    setMatchMediaMatches(false);
    auth.user = null;
    renderNav("/browse");
    fireEvent.click(tab("Pricing"));
    fireEvent.click(tab("Pricing")); // double tap: one navigation, so one event
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith("bottom_nav");
    expect(screen.getByTestId("loc")).toHaveTextContent("/browse");
    await waitFor(() => expect(screen.getByTestId("loc")).toHaveTextContent("/pricing?source=bottom-nav"));
    expect(track).toHaveBeenCalledTimes(1);
  });

  it("tapping the current tab still navigates (same push as before) and keeps it active", async () => {
    setMatchMediaMatches(false);
    renderNav("/browse");
    fireEvent.click(tab("Home"));
    expect(tab("Home").style.color).toBe(ACTIVE_GREEN);
    await waitFor(() => expect(seen).toHaveLength(2));
    expect(screen.getByTestId("loc")).toHaveTextContent("/browse");
    expect(tab("Home").style.color).toBe(ACTIVE_GREEN);
  });

  it("the finger landing (pointerdown) starts the target page's chunk, before any click", () => {
    setMatchMediaMatches(false);
    auth.user = null;
    renderNav("/browse");
    const cases: Array<[string, string]> = [
      ["Exam Trends", "/exam-trends"],
      ["Practice", "/practice-hub"],
      ["Check", "/check-improve"],
      ["Pricing", "/pricing?source=bottom-nav"],
      ["Home", "/browse"],
    ];
    for (const [label, to] of cases) {
      prefetch.mockClear();
      fireEvent.pointerDown(tab(label));
      expect(prefetch).toHaveBeenCalledWith(to);
    }
    expect(screen.getByTestId("loc")).toHaveTextContent("/browse"); // pointerdown alone never navigates
  });

  it("a keyboard / no-pointer activation still starts the chunk (from the click)", () => {
    setMatchMediaMatches(false);
    renderNav("/browse");
    fireEvent.click(tab("Check"));
    expect(prefetch).toHaveBeenCalledWith("/check-improve");
  });

  it("desktop: still renders nothing", () => {
    setMatchMediaMatches(true);
    const { container } = renderNav("/practice-hub");
    expect(container.querySelector("[data-lt-bottomnav]")).toBeNull();
  });
});

// ★ #1634 review B1/B2 — the PRODUCTION router. BrowserRouter commits location changes in a
// transition, so while a tab's route is still loading the URL has moved but the bar still sees the
// OLD location. Check never loads here, which holds that state open.
const NeverLoads = lazy(() => new Promise<{ default: () => null }>(() => {}));
function renderBrowser() {
  return render(
    <BrowserRouter>
      <BottomNav />
      <Suspense fallback={<p>loading</p>}>
        <Routes>
          <Route path="/practice-hub" element={<p>hub</p>} />
          <Route path="/check-improve" element={<NeverLoads />} />
          <Route path="/exam-trends" element={<p>trends</p>} />
          <Route path="/pricing" element={<NeverLoads />} />
        </Routes>
      </Suspense>
    </BrowserRouter>,
  );
}
const wait = (ms: number) => act(() => new Promise<void>((resolve) => setTimeout(resolve, ms)));

describe("SPEED-NAV-1 — BrowserRouter, the first tab's page still loading", () => {
  it("★ B1: Check, then Exam Trends while Check is still loading — ends on Exam Trends", async () => {
    setMatchMediaMatches(false);
    window.history.replaceState(null, "", "/practice-hub");
    renderBrowser();
    fireEvent.click(tab("Check"));
    await wait(250); // Check's push has run; its page never arrives
    expect(window.location.pathname).toBe("/check-improve");
    fireEvent.click(tab("Exam Trends"));
    await wait(250);
    expect(window.location.pathname).toBe("/exam-trends");
    expect(screen.getByText("trends")).toBeInTheDocument();
  });

  it("★ B1: Pricing, then Exam Trends while Pricing is still loading — ends on Exam Trends, one event", async () => {
    setMatchMediaMatches(false);
    auth.user = null;
    window.history.replaceState(null, "", "/practice-hub");
    renderBrowser();
    fireEvent.click(tab("Pricing"));
    await wait(250);
    fireEvent.click(tab("Exam Trends"));
    await wait(250);
    expect(window.location.pathname).toBe("/exam-trends");
    expect(track).toHaveBeenCalledTimes(1);
  });

  it("a repeat tap on Check while its page is loading adds no second history entry", async () => {
    setMatchMediaMatches(false);
    window.history.replaceState(null, "", "/practice-hub");
    renderBrowser();
    fireEvent.click(tab("Check"));
    await wait(250);
    const entries = window.history.length;
    fireEvent.click(tab("Check"));
    await wait(250);
    expect(window.history.length).toBe(entries);
    expect(window.location.pathname).toBe("/check-improve");
  });

  it("a repeat tap on the same tab while its page is loading adds no second push or event", async () => {
    setMatchMediaMatches(false);
    auth.user = null;
    window.history.replaceState(null, "", "/practice-hub");
    renderBrowser();
    fireEvent.click(tab("Pricing"));
    await wait(250);
    const entries = window.history.length;
    fireEvent.click(tab("Pricing"));
    await wait(250);
    expect(window.history.length).toBe(entries);
    expect(window.location.pathname).toBe("/pricing");
    expect(track).toHaveBeenCalledTimes(1);
  });

  it("★ B2: tap Check, Back before it loads — the right tab is active and the bar still works", async () => {
    setMatchMediaMatches(false);
    window.history.replaceState(null, "", "/practice-hub");
    renderBrowser();
    fireEvent.click(tab("Check"));
    await wait(250);
    expect(window.location.pathname).toBe("/check-improve");
    await act(async () => {
      window.history.back();
      await new Promise<void>((resolve) => setTimeout(resolve, 250));
    });
    expect(window.location.pathname).toBe("/practice-hub");
    // Back returned to the location the bar already saw: the pressed Check must not linger.
    expect(tab("Practice").style.color).toBe(ACTIVE_GREEN);
    expect(tab("Check").style.color).toBe(INACTIVE_SLATE);
    // ...and the bar is not dead: the next tap navigates, including Check itself again.
    fireEvent.click(tab("Exam Trends"));
    await wait(250);
    expect(window.location.pathname).toBe("/exam-trends");
    expect(screen.getByText("trends")).toBeInTheDocument();
  });
});
