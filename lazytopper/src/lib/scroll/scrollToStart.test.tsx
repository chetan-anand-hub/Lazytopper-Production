// SCROLL-TOP-1 — scroll helpers + route-change hook.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { findScrollContainer, scrollStartIntoView, resetAppScroll } from "./scrollToStart";
import { useScrollTopOnRouteChange, useScrollTopOnChange } from "../../hooks/useScrollTopOnRouteChange";

function shell(): { main: HTMLElement; target: HTMLElement } {
  document.body.innerHTML = `<div><main id="m" style="overflow-y:auto"><div id="t"></div></main></div>`;
  const main = document.getElementById("m") as HTMLElement;
  const target = document.getElementById("t") as HTMLElement;
  // jsdom has no layout: fake the numbers the helper reads.
  Object.defineProperty(main, "scrollHeight", { value: 2368, configurable: true });
  Object.defineProperty(main, "clientHeight", { value: 400, configurable: true });
  main.getBoundingClientRect = () => ({ top: 100 } as DOMRect);
  return { main, target };
}

beforeEach(() => {
  document.body.innerHTML = "";
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
});

describe("findScrollContainer", () => {
  it("picks the shell <main> when it scrolls (desktop)", () => {
    const { main, target } = shell();
    expect(findScrollContainer(target)).toBe(main);
  });
  it("returns null when only the window scrolls (mobile)", () => {
    document.body.innerHTML = `<main><div id="t"></div></main>`;
    expect(findScrollContainer(document.getElementById("t"))).toBeNull();
  });
});

describe("scrollStartIntoView", () => {
  it("scrolls <main>, not the window, to the target's start", () => {
    const { main, target } = shell();
    main.scrollTop = 2317;
    target.getBoundingClientRect = () => ({ top: -1805 } as DOMRect); // 100 (main top) - 1905
    main.scrollTo = vi.fn(({ top }: ScrollToOptions) => { main.scrollTop = top as number; }) as never;
    expect(scrollStartIntoView(target)).toBe(true);
    expect(main.scrollTop).toBe(2317 + (-1805 - 100));
    expect(window.scrollTo).not.toHaveBeenCalled();
  });
  it("scrolls the window when no inner container scrolls", () => {
    document.body.innerHTML = `<main><div id="t"></div></main>`;
    const t = document.getElementById("t") as HTMLElement;
    t.getBoundingClientRect = () => ({ top: -500 } as DOMRect);
    Object.defineProperty(window, "scrollY", { value: 900, configurable: true });
    scrollStartIntoView(t, { topOffset: 10 });
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 390, behavior: "auto" });
  });
  it("is a no-op for a missing element", () => {
    expect(scrollStartIntoView(null)).toBe(false);
  });
  it("never smooth-scrolls under prefers-reduced-motion", () => {
    window.matchMedia = ((q: string) => ({ matches: q.includes("reduce") })) as never;
    document.body.innerHTML = `<main><div id="t"></div></main>`;
    const t = document.getElementById("t") as HTMLElement;
    t.getBoundingClientRect = () => ({ top: 50 } as DOMRect);
    scrollStartIntoView(t, { behavior: "smooth" });
    expect((window.scrollTo as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0].behavior).toBe("auto");
  });
});

describe("route-change hook", () => {
  function Nav({ to, state }: { to: string; state?: unknown }) {
    const nav = useNavigate();
    useEffect(() => { nav(to, { state }); }, [nav, to, state]);
    return null;
  }
  function Probe() { useScrollTopOnRouteChange(); return null; }
  function run(to: string, state?: unknown) {
    document.body.innerHTML = `<main id="m"></main>`;
    const main = document.getElementById("m") as HTMLElement;
    main.scrollTop = 2000;
    render(<MemoryRouter initialEntries={["/a"]}><Probe />{to ? <Nav to={to} state={state} /> : null}</MemoryRouter>);
    return main;
  }
  it("resets <main> on a pathname change", () => {
    expect(run("/b").scrollTop).toBe(0);
  });
  it("CONTROL: leaves scroll alone on a query-only change", () => {
    expect(run("/a?topic=x").scrollTop).toBe(2000);
  });
  it("skips a hash route (/pricing#packs keeps its own anchor scroll)", () => {
    expect(run("/b#packs").scrollTop).toBe(2000);
  });
  it("skips when navigation state asks to preserve scroll", () => {
    expect(run("/b", { preserveScroll: true }).scrollTop).toBe(2000);
  });
  it("PUSH resets; POP (Back) does not", () => {
    function BackThenProbe() {
      const nav = useNavigate();
      useEffect(() => { nav("/b"); }, [nav]);
      return null;
    }
    function Back({ go }: { go: boolean }) {
      const nav = useNavigate();
      useEffect(() => { if (go) nav(-1); }, [go, nav]);
      return null;
    }
    document.body.innerHTML = `<main id="m"></main>`;
    const main = document.getElementById("m") as HTMLElement;
    const { rerender } = render(<MemoryRouter initialEntries={["/a"]}><Probe /><BackThenProbe /><Back go={false} /></MemoryRouter>);
    expect(main.scrollTop).toBe(0); // PUSH /a -> /b reset (CONTROL: PUSH still resets)
    main.scrollTop = 1500;
    rerender(<MemoryRouter initialEntries={["/a"]}><Probe /><BackThenProbe /><Back go={true} /></MemoryRouter>);
    expect(main.scrollTop).toBe(1500); // POP /b -> /a leaves it
  });
  it("CONTROL: does nothing on first render", () => {
    expect(run("").scrollTop).toBe(2000);
  });
});

describe("useScrollTopOnChange + resetAppScroll", () => {
  function K({ k }: { k: string }) { useScrollTopOnChange(k); return null; }
  it("fires on a key change only", () => {
    document.body.innerHTML = `<main id="m"></main>`;
    const main = document.getElementById("m") as HTMLElement;
    main.scrollTop = 800;
    const { rerender } = render(<K k="setup" />);
    expect(main.scrollTop).toBe(800);
    rerender(<K k="setup" />);
    expect(main.scrollTop).toBe(800);
    rerender(<K k="results" />);
    expect(main.scrollTop).toBe(0);
  });
  it("resetAppScroll zeroes every <main>", () => {
    document.body.innerHTML = `<main id="m"></main>`;
    const m = document.getElementById("m") as HTMLElement;
    m.scrollTop = 5;
    resetAppScroll();
    expect(m.scrollTop).toBe(0);
  });
});
