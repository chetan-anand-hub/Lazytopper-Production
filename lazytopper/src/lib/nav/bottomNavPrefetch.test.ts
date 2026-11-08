// SPEED-NAV-1 — the BottomNav prefetch map must load the SAME modules the routes lazy-load
// (so it never creates a second chunk or warms the wrong page), and must be safe to call.
import { describe, it, expect, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const anp = vi.hoisted(() => vi.fn());
// The scheduled loader is never run here: these tests must not import whole pages.
vi.mock("../afterNextPaint", () => ({ afterNextPaint: anp }));

import { BOTTOM_NAV_PAGE_LOADERS, prefetchBottomNavPage, resetBottomNavPrefetchForTests } from "./bottomNavPrefetch";

const app = readFileSync(resolve(process.cwd(), "src/App.tsx"), "utf8");
const helper = readFileSync(resolve(process.cwd(), "src/lib/nav/bottomNavPrefetch.ts"), "utf8");

/** The import specifier App.tsx's lazy() uses for `component`, as a path relative to src/. */
function routeSpecifier(component: string): string {
  const m = new RegExp(`const ${component}\\s*=\\s*lazy\\(\\(\\) => import\\("\\./([^"]+)"\\)\\)`).exec(app);
  if (!m) throw new Error(`no lazy import for ${component} in App.tsx`);
  return m[1];
}
/** The component App.tsx renders on `path` (first `withRouteSuspense(<X />)` in that Route). */
function routeComponent(path: string): string {
  const at = app.indexOf(`path="${path}"`);
  if (at < 0) throw new Error(`no route ${path}`);
  const block = app.slice(at, app.indexOf("/>\n", app.indexOf("withRouteSuspense(", at)) + 2);
  const all = [...block.matchAll(/withRouteSuspense\(<(\w+) \/>\)/g)].map((m) => m[1]);
  // /browse renders DesktopHome at desktop width and MobileHome at phone width; the bar is phone-only.
  return all.includes("MobileHome") ? "MobileHome" : all[0];
}
/** The specifier the helper uses for `path`, relative to src/. */
function helperSpecifier(path: string): string {
  const m = new RegExp(`"${path.replace(/\//g, "\\/")}": \\(\\) => import\\("\\.\\./\\.\\./([^"]+)"\\)`).exec(helper);
  if (!m) throw new Error(`no helper loader for ${path}`);
  return m[1];
}

afterEach(() => {
  resetBottomNavPrefetchForTests();
  anp.mockClear();
});

describe("bottomNavPrefetch", () => {
  it("covers every BottomNav destination", () => {
    expect(Object.keys(BOTTOM_NAV_PAGE_LOADERS).sort()).toEqual(
      ["/browse", "/check-improve", "/exam-trends", "/me", "/practice-hub", "/pricing"],
    );
  });

  it.each(["/browse", "/exam-trends", "/practice-hub", "/check-improve", "/pricing", "/me"])(
    "%s prefetches exactly the module its route lazy-loads",
    (path) => {
      expect(helperSpecifier(path)).toBe(routeSpecifier(routeComponent(path)));
    },
  );

  it("ignores unknown paths and never throws", () => {
    expect(() => prefetchBottomNavPage("/nowhere")).not.toThrow();
    expect(anp).not.toHaveBeenCalled();
  });

  it("never imports inside the tap: the load is scheduled after the next paint, once per path", () => {
    prefetchBottomNavPage("/pricing?source=bottom-nav");
    expect(anp).toHaveBeenCalledTimes(1);
    prefetchBottomNavPage("/pricing"); // same page (query ignored): not scheduled twice
    expect(anp).toHaveBeenCalledTimes(1);
    prefetchBottomNavPage("/exam-trends");
    expect(anp).toHaveBeenCalledTimes(2);
  });
});
