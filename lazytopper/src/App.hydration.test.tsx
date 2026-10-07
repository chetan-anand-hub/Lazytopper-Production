/**
 * LOW-END-3 PR-2 (e) — PINS: A PRERENDERED PAGE IS HYDRATED, NOT REPLACED.
 *
 * ★ THE HARNESS REPRODUCES THE PIPELINE, END TO END, IN ONE PROCESS:
 *   1. CAPTURE — the real App under main.tsx's provider stack is mounted with `createRoot` on an
 *      empty root (what `captureStaticBodies` loads), the route renders, then the capture's own
 *      `stripAuthChrome` + `separateAdjacentText` run and `innerHTML` is taken.
 *   2. SERVE — that HTML becomes the root's markup in a fresh container.
 *   3. BOOT — `mountApp` (what main.tsx calls) with the real `hydratableRoutePreload`.
 * Each named page family is mocked by a small page with the features that broke hydration when
 * this was measured: adjacent text nodes (`Learn the {n} concepts`), and, for Notes, content that
 * exists only once the chapter's spec chunk has loaded.
 *
 * ★ WHAT IS PINNED (each with one red mutation, see the PR):
 *   - hydrateRoot on the prerendered named pages: NO element of the served markup is removed, the
 *     same `<h1>` node is still in the document, React reports no recoverable error, and the
 *     settled DOM equals what `createRoot` renders (D76 DOM equality).
 *   - createRoot is kept where hydration cannot match: the empty shell, a page outside the five
 *     families, and the DesktopShell layout at >= 1024 px.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, cleanup, waitFor } from "@testing-library/react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { setMatchMediaMatches } from "./test/setup";
import { separateAdjacentText, stripAuthChrome } from "../scripts/seo/captureStaticBodies";

vi.mock("./pages/CheckYourAnswerPage", async () => {
  const { createElement: h } = await import("react");
  return {
    default: () =>
      h("main", { "data-testid": "page-cya" }, h("h1", null, "How CBSE examiners mark"), h("p", null, "Learn the ", 5, " marking rules")),
  };
});
vi.mock("./pages/desktop/DesktopTopicHubPage", async () => {
  const { createElement: h } = await import("react");
  return { default: () => h("div", { "data-testid": "page-topichub" }, h("h1", null, "Trigonometry"), h("span", null, "Learn the ", 5, " concepts")) };
});
vi.mock("./pages/ExamTrendsRanked", async () => {
  const { createElement: h } = await import("react");
  return { default: () => h("div", { "data-testid": "page-trends" }, h("h1", null, "Exam Trends"), h("p", null, 26, " chapters ranked")) };
});
vi.mock("./pages/HighlyProbableQuestions", async () => {
  const { createElement: h } = await import("react");
  return { default: () => h("div", { "data-testid": "page-hpq" }, h("h1", null, "Predicted Questions"), h("p", null, "Showing ", 12, " of ", 40)) };
});
// Notes is NOT mocked: the real page renders the chapter only once its spec chunk has loaded
// (useNoteSpec reads a cache), which is exactly what the hydration preload has to cover.

type Prerendered = { path: string; html: string } | null;

/**
 * The real Notes page renders the whole chapter (KaTeX included) twice per test, in two fresh module
 * graphs. On a loaded host that measured 57-65 s, over the 60 s default, so these tests get 3 min.
 */
const HEAVY_TEST_TIMEOUT_MS = 180_000;

/**
 * ★ A FRESH MODULE GRAPH PER PAGE LOAD. The capture and the boot are two different page loads,
 * so each gets its own App, providers and caches (lazy components, the note-spec cache). Reusing
 * one graph would let the boot find the chapter spec the capture already loaded, and a missing
 * preload would go unnoticed. The mocks above survive `vi.resetModules()`.
 */
async function pageLoad() {
  vi.resetModules();
  const app = await import("./App");
  const { AuthProvider } = await import("./context/AuthContext");
  const { ProfileProvider } = await import("./context/ProfileContext");
  const { SmartLearningProvider } = await import("./engine/smartLearningStore");
  const { VibeProvider } = await import("./context/vibeModeContext");
  const { ThemeProvider } = await import("./context/ThemeContext");
  const { mountApp } = await import("./lib/prerenderHydration");
  const App = app.default;
  /** main.tsx's tree, verbatim in shape. */
  const tree = (prerenderedRoute: Prerendered): ReactNode => (
    <BrowserRouter>
      <AuthProvider>
        <ProfileProvider>
          <SmartLearningProvider>
            <VibeProvider>
              <ThemeProvider>
                <App prerenderedRoute={prerenderedRoute} />
              </ThemeProvider>
            </VibeProvider>
          </SmartLearningProvider>
        </ProfileProvider>
      </AuthProvider>
    </BrowserRouter>
  );
  return { tree, mountApp, extractPrerenderedRoute: app.extractPrerenderedRoute, hydratableRoutePreload: app.hydratableRoutePreload };
}

const PAGES: ReadonlyArray<{ path: string; testId: string }> = [
  { path: "/notes/electricity", testId: "" },
  { path: "/topic-hub/trigonometry", testId: "page-topichub" },
  { path: "/exam-trends", testId: "page-trends" },
  { path: "/highly-probable/10/Maths", testId: "page-hpq" },
  { path: "/check-your-answer", testId: "page-cya" },
];

/** Comments out, text nodes merged: two DOMs that render the same page compare equal. */
function normalized(root: Element): string {
  const clone = root.cloneNode(true) as Element;
  const walker = document.createTreeWalker(clone, NodeFilter.SHOW_COMMENT);
  const comments: Node[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) comments.push(node);
  for (const node of comments) node.parentNode?.removeChild(node);
  clone.normalize();
  return clone.innerHTML;
}

/** Step 1: what the capture job commits for `path` (and what createRoot shows once settled). */
async function capture(path: string): Promise<{ served: string; settled: string }> {
  const { tree } = await pageLoad();
  window.history.replaceState(null, "", path);
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(tree(null));
  });
  const testId = PAGES.find((page) => page.path === path)?.testId ?? "";
  const ready = testId ? `[data-testid="${testId}"]` : ".lt-note";
  await waitFor(() => expect(host.querySelector(ready)).not.toBeNull(), { timeout: 60000 });
  const settled = normalized(host);
  stripAuthChrome(host);
  separateAdjacentText(host);
  const served = host.innerHTML;
  act(() => root.unmount());
  host.remove();
  return { served, settled };
}

/** Steps 2 + 3: serve that markup, boot exactly as main.tsx does, watch every original element. */
async function boot(path: string, served: string, desktop: boolean) {
  const { tree, mountApp, extractPrerenderedRoute, hydratableRoutePreload } = await pageLoad();
  window.history.replaceState(null, "", path);
  const host = document.createElement("div");
  host.id = "root";
  host.innerHTML = served;
  document.body.appendChild(host);
  const original = new Set(Array.from(host.querySelectorAll("*")));
  const firstHeading = host.querySelector("h1");
  const removed: string[] = [];
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of Array.from(record.removedNodes)) {
        if (node instanceof Element && original.has(node)) removed.push(`<${node.tagName.toLowerCase()}>`);
      }
    }
  });
  observer.observe(host, { childList: true, subtree: true });
  const errors: string[] = [];
  let mode: "hydrated" | "created" | null = null;
  await act(async () => {
    mode = await mountApp(host, {
      path,
      isDesktopViewport: desktop,
      preloadFor: hydratableRoutePreload,
      hydrate: () => tree(null),
      create: () => tree(extractPrerenderedRoute(host, path)),
      onRecoverableError: (error) => errors.push(String((error as Error)?.message ?? error).slice(0, 200)),
    });
  });
  await act(async () => {
    await new Promise((done) => setTimeout(done, 30));
  });
  observer.disconnect();
  return { host, mode, removed, errors, headingKept: !!firstHeading && firstHeading.isConnected };
}

beforeEach(() => {
  localStorage.clear();
  setMatchMediaMatches(false);
});
afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

describe("LOW-END-3 PR-2 (e) — the five named pages hydrate the served markup (390 px)", () => {
  for (const page of PAGES) {
    it(`${page.path}: hydrateRoot adopts the DOM — nothing removed, no mismatch, same settled DOM as createRoot`, async () => {
      const { served, settled } = await capture(page.path);
      expect(served).toContain('data-lt-route="start"');
      const result = await boot(page.path, served, false);
      expect(result.mode).toBe("hydrated");
      expect(result.errors).toEqual([]);
      expect(result.removed).toEqual([]);
      expect(result.headingKept).toBe(true);
      // D76: the hydrated page settles to exactly what the createRoot path shows (including the
      // signed-out "Log in" button the capture stripped, which appears right after hydration).
      expect(normalized(result.host)).toBe(settled);
    }, HEAVY_TEST_TIMEOUT_MS);
  }
});

describe("LOW-END-3 PR-2 (e) — /check-your-answer hydrates at desktop width too (no DesktopShell)", () => {
  it("hydrateRoot at 1440 px: nothing removed, no mismatch", async () => {
    setMatchMediaMatches(true);
    const { served, settled } = await capture("/check-your-answer");
    const result = await boot("/check-your-answer", served, true);
    expect(result.mode).toBe("hydrated");
    expect(result.errors).toEqual([]);
    expect(result.removed).toEqual([]);
    expect(normalized(result.host)).toBe(settled);
  });
});

describe("LOW-END-3 PR-2 (e) — createRoot is kept where hydration cannot match", () => {
  it("the empty shell (a page that was not prerendered): createRoot, synchronously", async () => {
    const { tree, mountApp, hydratableRoutePreload } = await pageLoad();
    window.history.replaceState(null, "", "/check-your-answer");
    const host = document.createElement("div");
    document.body.appendChild(host);
    let mode: string | null = null;
    await act(async () => {
      mode = await mountApp(host, {
        path: "/check-your-answer",
        isDesktopViewport: false,
        preloadFor: hydratableRoutePreload,
        hydrate: () => tree(null),
        create: () => tree(null),
      });
    });
    expect(mode).toBe("created");
  });

  it("a prerendered page outside the five families (/pricing): createRoot", async () => {
    const { hydratableRoutePreload } = await pageLoad();
    expect(hydratableRoutePreload("/pricing", false)).toBeNull();
    expect(hydratableRoutePreload("/", false)).toBeNull();
    expect(hydratableRoutePreload("/practice-hub", false)).toBeNull();
  });

  it("the DesktopShell layout at >= 1024 px (Notes): createRoot, and it replaces the markup as before", async () => {
    setMatchMediaMatches(true);
    const { served } = await capture("/notes/electricity");
    const result = await boot("/notes/electricity", served, true);
    expect(result.mode).toBe("created");
    // The control for the hydrated cases: on the createRoot path the served nodes ARE removed,
    // so an empty `removed` list above is a measurement, not an instrument that cannot fire.
    expect(result.removed.length).toBeGreaterThan(0);
  }, HEAVY_TEST_TIMEOUT_MS);
});
