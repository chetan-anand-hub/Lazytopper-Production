import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import Welcome from "./Welcome";

/**
 * LANDING-FOLLOWUP-1 ADDENDUM-A — the owner's rulings after the layout review, pinned.
 * The layout itself (A1/A2: single column, the right-half fingerprint) is CSS at
 * breakpoints jsdom does not evaluate, so it is proven by screenshot and measurement
 * in the lane report. What the DOM can prove is proven here.
 */

afterEach(() => cleanup());

function renderWelcome() {
  return render(
    <MemoryRouter>
      <Welcome />
    </MemoryRouter>,
  );
}

describe("A3 — header", () => {
  it("the BOARDS: FEBRUARY 2027 pill is gone", () => {
    const { container } = renderWelcome();
    expect(container.querySelector(".lt-landing-urg")).toBeNull();
    expect(container.textContent).not.toMatch(/BOARDS:\s*FEBRUARY/i);
  });

  it("★ Log in is a solid green button — the computed style, not the class name", () => {
    renderWelcome();
    const login = getComputedStyle(screen.getByRole("link", { name: "Log in" }));
    expect(login.color).toBe("rgb(255, 255, 255)");
    expect(login.backgroundColor).not.toBe("");
    expect(login.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
  });

  it("★ CONTROL — the other links keep the page's link colour, so the rule is scoped", () => {
    renderWelcome();
    const cbse = getComputedStyle(screen.getByRole("link", { name: /dates, rules and official papers/i }));
    expect(cbse.color).not.toBe("rgb(255, 255, 255)");
  });
});

describe("A2 — the fingerprint is decorative", () => {
  it("every fingerprint image is alt=\"\" AND aria-hidden", () => {
    const { container } = renderWelcome();
    const marks = container.querySelectorAll("img.lt-landing-bgmark, img.fp");
    expect(marks.length).toBe(2);
    for (const img of Array.from(marks)) {
      expect(img.getAttribute("alt")).toBe("");
      expect(img.getAttribute("aria-hidden")).toBe("true");
    }
  });

  it("★ CONTROL — the wordmark is NOT hidden: it names the product", () => {
    renderWelcome();
    expect(screen.getByRole("img", { name: "LazyTopper" })).toBeInTheDocument();
  });
});

describe("A6 — the second 'Free to start' matches the first", () => {
  it("★ same computed size and colour in the hero and in the close section", () => {
    // ⚠ The same trap as the countdown figure: `.lt-landing-close p` (0,1,1) set the
    // second copy to 15px/ink2 while the hero's read 13px/ink3.
    renderWelcome();
    const [hero, close] = screen.getAllByText("Free to start. One-tap sign-up, no card.");
    const a = getComputedStyle(hero);
    const b = getComputedStyle(close);
    expect(b.fontSize).toBe(a.fontSize);
    expect(b.color).toBe(a.color);
    expect(a.fontSize).toBe("13px");
  });
});

/**
 * ★ The phone never downloads the large mark. The <picture> offers the 555px file
 * ONLY to (min-width: 1000px); the <img> fallback — what every narrower viewport
 * loads — is the small file the lockup already uses. (Actual bytes per viewport are
 * measured in a real browser in the lane report; this pins the markup that decides.)
 */
describe("the mark's source selection", () => {
  it("the large file is offered only at >= 1000px; the fallback is the lockup's file", () => {
    const { container } = renderWelcome();
    const picture = container.querySelector("picture");
    const sources = picture?.querySelectorAll("source") ?? [];
    expect(sources.length).toBe(1);
    expect(sources[0].getAttribute("media")).toBe("(min-width: 1000px)");
    expect(sources[0].getAttribute("srcset")).toMatch(/lazytopper-fingerprint-mark\.png$/);
    const img = picture?.querySelector("img.lt-landing-bgmark");
    const lockup = container.querySelector("img.fp");
    expect(img?.getAttribute("src")).toBe(lockup?.getAttribute("src"));
    expect(img?.getAttribute("src")).toMatch(/lazytopper-fingerprint\.png$/);
  });
});

/**
 * ★★ The fixed mark goes quiet once the hero leaves — and NOTHING scroll-derived
 * exists at scroll 0. IntersectionObserver is stubbed so the test drives the entry.
 */
describe("the fixed mark quiets when the hero scrolls out", () => {
  type Cb = (entries: Array<{ intersectionRatio: number }>) => void;
  let fire: Cb | null = null;
  let constructed = 0;
  class FakeIO {
    constructor(cb: Cb) {
      fire = cb;
      constructed++;
    }
    observe() {}
    disconnect() {}
  }
  function setup(reducedMotion = false) {
    fire = null;
    constructed = 0;
    vi.stubGlobal("IntersectionObserver", FakeIO);
    vi.stubGlobal(
      "matchMedia",
      (q: string) => ({ matches: reducedMotion && q.includes("reduce"), media: q }) as MediaQueryList,
    );
    Object.defineProperty(window, "scrollY", { value: 0, configurable: true, writable: true });
    return renderWelcome().container.querySelector("img.lt-landing-bgmark") as HTMLImageElement;
  }
  afterEach(() => {
    vi.unstubAllGlobals();
    Object.defineProperty(window, "scrollY", { value: 0, configurable: true, writable: true });
  });

  it("★ at scroll 0 the mark's markup is exactly the static markup", () => {
    const mark = setup();
    expect(mark.getAttribute("class")).toBe("lt-landing-bgmark");
    expect(mark.hasAttribute("style")).toBe(false);
  });

  it("★★ CONTROL — at scroll 0 even a hero reported off-screen changes nothing", () => {
    // A short viewport can report the hero < 50% visible before any scroll. The
    // scrollY guard is what keeps that out of the markup.
    const mark = setup();
    act(() => fire?.([{ intersectionRatio: 0.1 }]));
    expect(mark.getAttribute("class")).toBe("lt-landing-bgmark");
  });

  it("scrolled, with the hero under half visible → is-quiet; back over half → loud", () => {
    const mark = setup();
    window.scrollY = 600;
    act(() => fire?.([{ intersectionRatio: 0.2 }]));
    expect(mark).toHaveClass("is-quiet");
    act(() => fire?.([{ intersectionRatio: 0.9 }]));
    expect(mark).not.toHaveClass("is-quiet");
  });

  it("★ prefers-reduced-motion: no observer at all — no scroll-driven change", () => {
    setup(true);
    expect(constructed).toBe(0);
  });

  it("CONTROL — without reduced motion the observer IS constructed", () => {
    setup(false);
    expect(constructed).toBe(1);
  });

  it("★ the CSS pins reduced-motion users to the faint level at desktop width", () => {
    const { container } = renderWelcome();
    const css = container.querySelector("style")?.textContent ?? "";
    expect(css).toMatch(
      /@media\(min-width:1000px\) and \(prefers-reduced-motion:reduce\)\{\s*\.lt-landing-bgmark\{opacity:\.075;transition:none\}/,
    );
  });
});
