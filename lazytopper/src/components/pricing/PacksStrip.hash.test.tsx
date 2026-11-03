// PACK-BASIC-ONLY-1 - /pricing#packs must land on the packs strip (it mounts lazily, after the browser's hash scroll).
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: null, loading: false }) }));
const paid = vi.hoisted(() => ({ value: false }));
vi.mock("../../lib/packs/usePaidPremium", () => ({ usePaidPremium: () => paid.value }));

import PacksStrip, { cbqTarget } from "./PacksStrip";

const scrollIntoView = vi.fn();
const mount = (entry: string) => {
  render(
    <MemoryRouter initialEntries={[entry]}>
      <PacksStrip />
    </MemoryRouter>,
  );
};

afterEach(() => {
  cleanup();
  scrollIntoView.mockClear();
  paid.value = false;
});
Element.prototype.scrollIntoView = scrollIntoView;

describe("PacksStrip anchor", () => {
  it('carries id="packs"', () => {
    mount("/pricing");
    expect(screen.getByTestId("pricing-packs-strip")).toHaveAttribute("id", "packs");
  });
  it("scrolls the strip's TOP to the viewport top on mount, then re-asserts after layout settles", () => {
    vi.useFakeTimers();
    try {
      mount("/pricing#packs");
      expect(scrollIntoView).toHaveBeenCalledWith({ block: "start" });
      const afterMount = scrollIntoView.mock.calls.length;
      vi.advanceTimersByTime(50);
      expect(scrollIntoView.mock.calls.length).toBeGreaterThan(afterMount);
      const afterFrames = scrollIntoView.mock.calls.length;
      vi.advanceTimersByTime(300);
      expect(scrollIntoView.mock.calls.length).toBeGreaterThan(afterFrames);
      const after300 = scrollIntoView.mock.calls.length;
      vi.advanceTimersByTime(700);
      expect(scrollIntoView.mock.calls.length).toBeGreaterThan(after300);
      const done = scrollIntoView.mock.calls.length;
      vi.advanceTimersByTime(5000);
      expect(scrollIntoView.mock.calls.length).toBe(done);
    } finally {
      vi.useRealTimers();
    }
  });
  it.each(["wheel", "touchstart", "keydown"])("stops re-asserting as soon as the student sends %s", (type) => {
    vi.useFakeTimers();
    try {
      mount("/pricing#packs");
      vi.advanceTimersByTime(50);
      const before = scrollIntoView.mock.calls.length;
      window.dispatchEvent(new Event(type));
      vi.advanceTimersByTime(5000);
      expect(scrollIntoView.mock.calls.length).toBe(before);
    } finally {
      vi.useRealTimers();
    }
  });
  it("CONTROL: does not scroll without the hash; scrolls for paid Premium too (uniform page); #cbq scrolls the CBQ band itself (BUY-PATH-1)", async () => {
    mount("/pricing");
    await new Promise((r) => setTimeout(r, 1000));
    expect(scrollIntoView).not.toHaveBeenCalled();
    cleanup();
    paid.value = true;
    mount("/pricing#packs");
    await new Promise((r) => setTimeout(r, 1000));
    expect(scrollIntoView).toHaveBeenCalled();
    cleanup();
    scrollIntoView.mockClear();
    mount("/pricing#cbq");
    await new Promise((r) => setTimeout(r, 1000));
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "start" });
    // BUY-PATH-1: the wrapper above the band is EMPTY here (no parents' link), so it is `display: none` - never the target.
    expect(scrollIntoView.mock.contexts.length).toBeGreaterThan(0);
    expect(scrollIntoView.mock.contexts.every((el) => (el as HTMLElement).id === "cbq")).toBe(true);
  });

  it("BUY-PATH-1: cbqTarget picks the wrapper only when it holds the parents' link, else the CBQ band; never a hidden element", () => {
    document.body.innerHTML = `<div id="w"></div><section id="cbq"></section>`;
    const w = document.getElementById("w") as HTMLElement;
    expect(cbqTarget(w)?.id).toBe("cbq");
    w.innerHTML = `<a href="/for-parents">Back to parents page</a>`;
    expect(cbqTarget(w)).toBe(w);
    expect(cbqTarget(null)).toBeNull();
    document.body.innerHTML = "";
  });
});
