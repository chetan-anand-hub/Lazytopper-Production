/**
 * SEO-5 PR-2 (D3) — PIN (c): THE FIRST PAINT OF A PRERENDERED ROUTE NEVER SHOWS "Loading...".
 *
 * ★ THE DEFECT. `main.tsx` mounts with `createRoot` (no hydration), so React's first commit
 * replaced the prerendered page with the route's Suspense fallback — a "Loading..." card —
 * until the route's chunk arrived: 3.1 s on Slow 4G, 10.3 s on 3G, on Notes (LOW-END-SCOUT-1).
 *
 * ★ WHAT IS PINNED.
 *   1. First route, prerendered: until the route is ready, the boundary shows THE PRERENDERED
 *      ROUTE MARKUP, in the route's own place — and "Loading..." never enters the DOM at all
 *      (a MutationObserver watches every node from before the first render to the end).
 *   2. Once ready, the real page replaces it, and the markup never returns. A LATER
 *      navigation behaves exactly as today: React Router v7 runs it as a transition, so the
 *      current page stays up while the next chunk loads (measured here — no fallback renders).
 *   3. No prerendered markup (a non-prerendered route): "Loading...", exactly as today.
 *   4. Markup served for a different path (the first route redirected): "Loading...", as today.
 *
 * ★ THE HARNESS IS THE REAL APP under main.tsx's provider stack and its always-present outer
 * router (the #490 lesson). Each route page is mocked behind a GATE — a promise the test
 * resolves — so "the route chunk has not arrived yet" is a state the test holds open, not a
 * race. Each test uses its own page module: `React.lazy` caches a resolved module for the
 * life of the App module, so a page can only suspend once per file.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act, fireEvent } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { setMatchMediaMatches } from "./test/setup";

function deferred() {
  let resolve: () => void = () => {};
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

const gates = vi.hoisted(() => ({}) as Record<string, { promise: Promise<void>; resolve: () => void }>);

function gatedPage(key: string, testId: string) {
  return async () => {
    await gates[key].promise;
    const { createElement } = await import("react");
    return { default: () => createElement("div", { "data-testid": testId }, `real ${key} page`) };
  };
}

vi.mock("./pages/LegalPage", () => gatedPage("legal", "real-legal")());
vi.mock("./pages/PricingPage", () => gatedPage("pricing", "real-pricing")());
vi.mock("./pages/Cbse2027Page", () => gatedPage("cbse", "real-cbse")());
vi.mock("./pages/ExamTrendsRanked", () => gatedPage("trends", "real-trends")());

for (const key of ["legal", "pricing", "cbse", "trends"]) gates[key] = deferred();

/* Imported AFTER the mocks above so App's module graph resolves to them. */
const { default: App, extractPrerenderedRoute } = await import("./App");
const { AuthProvider } = await import("./context/AuthContext");
const { ProfileProvider } = await import("./context/ProfileContext");
const { SmartLearningProvider } = await import("./engine/smartLearningStore");
const { VibeProvider } = await import("./context/vibeModeContext");
const { ThemeProvider } = await import("./context/ThemeContext");

function NavTo({ to }: { to: string }) {
  const navigate = useNavigate();
  return (
    <button type="button" data-testid={`nav-${to}`} onClick={() => navigate(to)}>
      go
    </button>
  );
}

type Prerendered = { path: string; html: string } | null;

function tree(path: string, prerenderedRoute: Prerendered, navTo?: string) {
  return (
    <MemoryRouter initialEntries={[path]}>
      {navTo ? <NavTo to={navTo} /> : null}
      <AuthProvider>
        <ProfileProvider>
          <SmartLearningProvider>
            <VibeProvider>
              <ThemeProvider>{(<App prerenderedRoute={prerenderedRoute} />) as ReactNode}</ThemeProvider>
            </VibeProvider>
          </SmartLearningProvider>
        </ProfileProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

/** Records whether "Loading..." EVER entered the document — not just whether it is there now. */
function watchForLoading(): { seen: () => boolean; stop: () => void } {
  let seen = document.body.textContent?.includes("Loading...") ?? false;
  const observer = new MutationObserver(() => {
    if (document.body.textContent?.includes("Loading...")) seen = true;
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  return { seen: () => seen, stop: () => observer.disconnect() };
}

const PRERENDERED_PRIVACY =
  '<main data-testid="prerendered-privacy"><h1>Privacy policy</h1><p>What we collect, prerendered.</p></main>';

beforeEach(() => {
  setMatchMediaMatches(false);
});
afterEach(cleanup);

describe("D3 — the first prerendered route keeps its markup until it is ready", () => {
  it("★ pin (c): first paint shows the prerendered route, 'Loading...' NEVER enters the DOM; then the real page", async () => {
    const watch = watchForLoading();
    try {
      render(tree("/legal/privacy", { path: "/legal/privacy", html: PRERENDERED_PRIVACY }, "/pricing"));

      // FIRST PAINT — React has committed, the route chunk has NOT arrived.
      expect(screen.getByTestId("prerendered-privacy")).toBeInTheDocument();
      expect(screen.getByText("What we collect, prerendered.")).toBeInTheDocument();
      expect(screen.queryByText("Loading...")).toBeNull();
      expect(screen.queryByTestId("real-legal")).toBeNull();
      // In the route's own place: right after the boundary's anchor, not wrapped in an element.
      const anchor = document.querySelector('template[data-lt-route="prerendered"]');
      expect(anchor?.nextElementSibling?.getAttribute("data-testid")).toBe("prerendered-privacy");

      // The chunk arrives: the real page replaces the markup.
      await act(async () => {
        gates.legal.resolve();
      });
      expect(await screen.findByTestId("real-legal")).toBeInTheDocument();
      expect(screen.queryByTestId("prerendered-privacy")).toBeNull();
      expect(document.querySelector('template[data-lt-route="prerendered"]')).toBeNull();
      expect(watch.seen(), "'Loading...' entered the DOM during the first route").toBe(false);

      // ★ A LATER navigation behaves exactly as today. React Router v7 runs a navigation as a
      // transition, so React keeps the current page up while the next chunk loads — and the
      // first route's markup must NEVER come back.
      fireEvent.click(screen.getByTestId("nav-/pricing"));
      await act(async () => {
        await new Promise((done) => setTimeout(done, 50));
      });
      expect(screen.getByTestId("real-legal")).toBeInTheDocument();
      expect(screen.queryByTestId("prerendered-privacy")).toBeNull();
      // (Today's RouteFallback for a suspension that is not a transition — a first load with no
      // prerendered markup — is pinned by the next test.)
      await act(async () => {
        gates.pricing.resolve();
      });
      expect(await screen.findByTestId("real-pricing")).toBeInTheDocument();
    } finally {
      watch.stop();
    }
  });

  it("no prerendered markup (a non-prerendered route): 'Loading...' exactly as today", async () => {
    render(tree("/cbse/class-10", null));
    expect(screen.getByText("Loading...")).toBeInTheDocument();
    await act(async () => {
      gates.cbse.resolve();
    });
    expect(await screen.findByTestId("real-cbse")).toBeInTheDocument();
  });

  it("markup served for ANOTHER path (the first route redirected): 'Loading...', never the wrong page", async () => {
    render(tree("/exam-trends", { path: "/somewhere-else", html: '<main data-testid="wrong-page">x</main>' }));
    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.queryByTestId("wrong-page")).toBeNull();
    await act(async () => {
      gates.trends.resolve();
    });
    expect(await screen.findByTestId("real-trends")).toBeInTheDocument();
  });
});

describe("extractPrerenderedRoute — what main.tsx keeps from the served HTML", () => {
  function root(inner: string): HTMLElement {
    const el = document.createElement("div");
    el.id = "root";
    el.innerHTML = inner;
    return el;
  }
  const PAGE =
    '<header>chrome</header><div class="shell"><template data-lt-route="start"></template>' +
    '<section class="page">Page body</section>\n<p>more</p><template data-lt-route="end"></template></div>' +
    "<nav>bottom nav</nav>";

  it("returns exactly the route region — never the chrome around it", () => {
    expect(extractPrerenderedRoute(root(PAGE), "/notes/x")).toEqual({
      path: "/notes/x",
      html: '<section class="page">Page body</section>\n<p>more</p>',
    });
  });

  it("returns null when there is nothing prerendered (the clean shell)", () => {
    expect(extractPrerenderedRoute(root(""), "/me")).toBeNull();
    expect(extractPrerenderedRoute(null, "/me")).toBeNull();
  });

  it("returns null when the marks do not pair up, or the region is empty", () => {
    expect(extractPrerenderedRoute(root('<template data-lt-route="start"></template><p>x</p>'), "/x")).toBeNull();
    expect(
      extractPrerenderedRoute(root('<template data-lt-route="start"></template> <template data-lt-route="end"></template>'), "/x"),
    ).toBeNull();
  });
});
