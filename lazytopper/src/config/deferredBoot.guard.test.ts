/**
 * LOW-END-3 PR-2 — guards for the two build-side halves of hydration.
 *
 *   1. D74 deferred boot: the files `applyPrerendered` boots after the first frame are EXACTLY the
 *      files `main.tsx` hydrates. A file that boots late but is then rebuilt by `createRoot` moves
 *      LCP to the re-render (PR-1's C regression); a hydrated file that boots early loses the FCP
 *      gain. Both lists are walked over every advertised path, at both widths.
 *   2. The boot loader itself: nothing starts before the first frame; it starts once; a "narrow"
 *      page on a wide viewport (not hydrated) starts at once.
 *   3. `separateAdjacentText` (the capture): React's text-node boundaries survive serialization,
 *      so the served markup can hydrate.
 */
import { describe, it, expect } from "vitest";
import { BOOT_LOADER, deferredBootFor } from "../../scripts/seo/applyPrerendered";
import { separateAdjacentText, stripAuthChrome } from "../../scripts/seo/captureStaticBodies";
import { hydratableRoutePreload } from "../App";
import { sitemapPaths } from "./sitemapUrls";

describe("D74 — deferred boot on exactly the hydrated files", () => {
  const paths = sitemapPaths();

  it("covers every advertised path at both widths, and the hydrated set is not empty", () => {
    expect(paths.length).toBeGreaterThan(50);
    const hydrated = paths.filter((path) => hydratableRoutePreload(path, false) !== null);
    // Notes + Topic Hub (26 each), Exam Trends, Predicted Questions (2), /check-your-answer.
    expect(hydrated.length).toBeGreaterThanOrEqual(55);
  });

  for (const variant of ["mobile", "desktop"] as const) {
    it(`${variant} files: deferredBootFor(path) is set iff main.tsx hydrates that file`, () => {
      const mismatches: string[] = [];
      for (const path of paths) {
        const boots = deferredBootFor(path, variant) !== null;
        const hydrates = hydratableRoutePreload(path, variant === "desktop") !== null;
        if (boots !== hydrates) mismatches.push(`${path} (${variant}): boot=${boots} hydrate=${hydrates}`);
      }
      expect(mismatches).toEqual([]);
    });
  }

  it('"any" exactly where a desktop viewport hydrates too; "narrow" where only a phone does', () => {
    for (const path of paths) {
      const boot = deferredBootFor(path, "mobile");
      if (boot === null) continue;
      expect(boot, path).toBe(hydratableRoutePreload(path, true) !== null ? "any" : "narrow");
    }
  });
});

/** Run BOOT_LOADER against fakes: `import(` is the only token rewritten, to observe the call. */
function runLoader(boot: "narrow" | "any", wideViewport: boolean, visibility: "visible" | "hidden" = "visible") {
  const imports: string[] = [];
  const links: string[] = [];
  const frames: Array<() => void> = [];
  const visibilityListeners: Array<() => void> = [];
  const timers: Array<{ ms: number; fn: () => void }> = [];
  const script = {
    getAttribute: (name: string) =>
      ({ "data-boot": boot, "data-entry": "/assets/index-EEEEEEEE.js", "data-preload": "/assets/A.js /assets/B.js" })[name] ?? null,
  };
  const fakeWindow = {
    requestAnimationFrame: (fn: () => void) => frames.push(fn),
    matchMedia: (query: string) => ({ matches: wideViewport && query === "(min-width: 1024px)" }),
  };
  const fakeDocument = {
    currentScript: script,
    visibilityState: visibility as string,
    addEventListener: (type: string, fn: () => void) => {
      if (type === "visibilitychange") visibilityListeners.push(fn);
    },
    createElement: () => ({}) as { href?: string; rel?: string },
    head: { appendChild: (link: { href?: string; rel?: string }) => links.push(`${link.rel} ${link.href}`) },
  };
  const source = BOOT_LOADER.replace("import(", "__import(");
  expect(source.split("__import(").length).toBe(2);
  const run = new Function("window", "document", "requestAnimationFrame", "setTimeout", "__import", source);
  run(
    fakeWindow,
    fakeDocument,
    fakeWindow.requestAnimationFrame,
    (fn: () => void, ms: number) => timers.push({ fn, ms }),
    (src: string) => imports.push(src),
  );
  const hide = () => {
    fakeDocument.visibilityState = "hidden";
    visibilityListeners.forEach((fn) => fn());
  };
  return { imports, links, frames, timers, hide };
}

describe("D74 — the boot loader", () => {
  it("starts nothing before the first frame, then preloads + imports the entry ONCE", () => {
    const state = runLoader("any", false);
    expect(state.imports).toEqual([]);
    expect(state.links).toEqual([]);
    // First frame, then a task.
    state.frames.splice(0).forEach((fn) => fn());
    expect(state.imports).toEqual([]);
    const afterFrame = state.timers.find((timer) => timer.ms === 0);
    afterFrame?.fn();
    expect(state.imports).toEqual(["/assets/index-EEEEEEEE.js"]);
    expect(state.links).toEqual(["modulepreload /assets/A.js", "modulepreload /assets/B.js"]);
    // The safety-net timer (or the tab being hidden) later does not start the app twice.
    state.timers.find((timer) => timer.ms === 3000)?.fn();
    state.hide();
    expect(state.imports).toHaveLength(1);
  });

  it("no early timer: nothing starts before the first frame, however long it takes (PR-1 had 200 ms)", () => {
    const state = runLoader("any", false);
    expect(state.timers.map((timer) => timer.ms)).toEqual([3000]);
    expect(state.imports).toEqual([]);
  });

  it("a hidden page (no frames ever) starts at once; a page hidden before its first frame starts then", () => {
    expect(runLoader("any", false, "hidden").imports).toEqual(["/assets/index-EEEEEEEE.js"]);
    const state = runLoader("any", false);
    expect(state.imports).toEqual([]);
    state.hide();
    expect(state.imports).toEqual(["/assets/index-EEEEEEEE.js"]);
  });

  it('a "narrow" page on a viewport >= 1024 px (createRoot there) starts at once, as before', () => {
    const wide = runLoader("narrow", true);
    expect(wide.imports).toEqual(["/assets/index-EEEEEEEE.js"]);
    const phone = runLoader("narrow", false);
    expect(phone.imports).toEqual([]);
    const anyWide = runLoader("any", true);
    expect(anyWide.imports).toEqual([]);
  });
});

describe("separateAdjacentText — the capture keeps React's text-node boundaries", () => {
  function reparsed(el: Element): Element {
    const copy = document.createElement("div");
    copy.innerHTML = el.innerHTML;
    return copy;
  }

  it("adjacent text nodes come back as separate nodes after innerHTML round-trip; text is unchanged", () => {
    const el = document.createElement("div");
    const span = document.createElement("span");
    span.append("Learn the ", "5", " concepts");
    el.append(span);
    expect(separateAdjacentText(el)).toBe(2);
    const back = reparsed(el).querySelector("span") as Element;
    const texts = Array.from(back.childNodes).filter((node) => node.nodeType === 3).map((node) => node.nodeValue);
    expect(texts).toEqual(["Learn the ", "5", " concepts"]);
    expect(back.textContent).toBe("Learn the 5 concepts");
  });

  it("CONTROL: without it, the same markup re-parses as ONE text node (the hydration mismatch)", () => {
    const el = document.createElement("div");
    const span = document.createElement("span");
    span.append("Learn the ", "5", " concepts");
    el.append(span);
    const back = reparsed(el).querySelector("span") as Element;
    expect(back.childNodes.length).toBe(1);
  });

  it("runs after the strip: two texts made neighbours by a stripped button are kept apart", () => {
    const el = document.createElement("div");
    const p = document.createElement("p");
    const button = document.createElement("button");
    button.textContent = "Log in";
    p.append("before ", button, "after");
    el.append(p);
    expect(stripAuthChrome(el)).toBe(1);
    separateAdjacentText(el);
    const texts = Array.from((reparsed(el).querySelector("p") as Element).childNodes)
      .filter((node) => node.nodeType === 3)
      .map((node) => node.nodeValue);
    expect(texts).toEqual(["before ", "after"]);
  });
});
