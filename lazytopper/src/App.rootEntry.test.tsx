/**
 * RootEntry ("/") — ROOTENTRY-1.
 *
 * ★ THE DEFECT. `RootEntry` returned `null` while `useAuth().loading`. The HTML served at /app/ is
 * the prerendered landing, so the first React commit REPLACED that landing with nothing (measured
 * on production at 390px / 4x CPU / 1.6 Mbps: the landing was absent from #root for ~1.2–1.8 s),
 * and then mobile was sent to /welcome, which rendered the landing again on a second route.
 *
 * ★ WHAT IS PINNED (owner rulings):
 *   1. While auth is loading, "/" renders the landing — never nothing — at every width.
 *   2. A signed-in student is still sent home once auth resolves: mobile → /browse, desktop →
 *      DesktopHome on "/".
 *   3. A signed-out visitor on mobile STAYS on "/" with the landing; /welcome still routes.
 *   4. Loading → signed-out keeps the SAME landing DOM (no remount), which is what removes the flash.
 *
 * ★ THE HARNESS MOUNTS THE APP'S ALWAYS-PRESENT OUTER ROUTER and the full main.tsx provider stack
 * (the #490 lesson — see App.routing.contract.test.tsx), with a CONTROL that must throw: a second
 * Router in the same tree. Only `useAuth` is replaced, with a switchable state, so the loading /
 * signed-out / signed-in transitions can be driven. DesktopHome and MobileHome are probes; Welcome
 * is the REAL page, identified by its own landmark.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { setMatchMediaMatches } from "./test/setup";

const auth = vi.hoisted(() => ({
  state: { user: null as null | Record<string, unknown>, loading: true },
}));

vi.mock("./context/AuthContext", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./context/AuthContext")>();
  return {
    ...actual,
    useAuth: () => ({ ...auth.state }) as unknown as ReturnType<typeof actual.useAuth>,
  };
});

vi.mock("./pages/desktop/DesktopHome", async () => {
  const { createElement } = await import("react");
  return { default: () => createElement("div", { "data-testid": "probe-desktop-home" }) };
});

vi.mock("./pages/app/MobileHome", async () => {
  const { createElement } = await import("react");
  return { default: () => createElement("div", { "data-testid": "probe-mobile-home" }) };
});

/* Imported AFTER the mocks above so App's module graph resolves to them. */
const { default: App } = await import("./App");
const { AuthProvider } = await import("./context/AuthContext");
const { ProfileProvider } = await import("./context/ProfileContext");
const { SmartLearningProvider } = await import("./engine/smartLearningStore");
const { VibeProvider } = await import("./context/vibeModeContext");
const { ThemeProvider } = await import("./context/ThemeContext");

const STUDENT = {
  uid: "rootentry-1-test-uid",
  email: "rootentry@example.test",
  phoneNumber: null,
  displayName: "Root Entry",
  providerIds: ["password"],
};

function LocationProbe() {
  return <div data-testid="loc">{useLocation().pathname}</div>;
}

/** main.tsx's provider stack, <BrowserRouter> swapped for <MemoryRouter> so a path can be seeded. */
function tree(path: string, extraRouter = false) {
  const app = extraRouter ? <MemoryRouter initialEntries={[path]}><App /></MemoryRouter> : <App />;
  return (
    <MemoryRouter initialEntries={[path]}>
      <LocationProbe />
      <AuthProvider>
        <ProfileProvider>
          <SmartLearningProvider>
            <VibeProvider>
              <ThemeProvider>{app as ReactNode}</ThemeProvider>
            </VibeProvider>
          </SmartLearningProvider>
        </ProfileProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

const landing = () => screen.queryByRole("main", { name: "LazyTopper public landing" });
const loc = () => screen.getByTestId("loc").textContent;

beforeEach(() => {
  auth.state = { user: null, loading: true };
  setMatchMediaMatches(false);
});
afterEach(cleanup);

describe("RootEntry — while auth is loading, '/' renders the landing (never null)", () => {
  for (const [width, desktop] of [["mobile", false], ["desktop", true]] as const) {
    it(`${width}: the landing is on screen and the URL stays '/'`, () => {
      setMatchMediaMatches(desktop);
      render(tree("/"));
      expect(landing()).toBeInTheDocument();
      expect(loc()).toBe("/");
      expect(screen.queryByTestId("probe-desktop-home")).toBeNull();
      expect(screen.queryByTestId("probe-mobile-home")).toBeNull();
    });
  }
});

describe("RootEntry — signed-in routing is unchanged", () => {
  it("mobile: a signed-in student is sent to /browse (MobileHome)", async () => {
    auth.state = { user: STUDENT, loading: false };
    render(tree("/"));
    expect(await screen.findByTestId("probe-mobile-home")).toBeInTheDocument();
    expect(loc()).toBe("/browse");
    expect(landing()).toBeNull();
  });

  it("desktop: a signed-in student gets DesktopHome on '/'", async () => {
    setMatchMediaMatches(true);
    auth.state = { user: STUDENT, loading: false };
    render(tree("/"));
    expect(await screen.findByTestId("probe-desktop-home")).toBeInTheDocument();
    expect(loc()).toBe("/");
    expect(landing()).toBeNull();
  });

  it("mobile: the landing shown while loading gives way to /browse once auth resolves signed-in", async () => {
    const view = render(tree("/"));
    expect(landing()).toBeInTheDocument();
    auth.state = { user: STUDENT, loading: false };
    view.rerender(tree("/"));
    expect(await screen.findByTestId("probe-mobile-home")).toBeInTheDocument();
    expect(loc()).toBe("/browse");
  });
});

describe("RootEntry — a signed-out visitor stays on '/' with the landing", () => {
  it("mobile: no redirect to /welcome", () => {
    auth.state = { user: null, loading: false };
    render(tree("/"));
    expect(landing()).toBeInTheDocument();
    expect(loc()).toBe("/");
  });

  it("desktop: the landing on '/'", () => {
    setMatchMediaMatches(true);
    auth.state = { user: null, loading: false };
    render(tree("/"));
    expect(landing()).toBeInTheDocument();
    expect(loc()).toBe("/");
  });

  it("/welcome still routes to the landing", () => {
    auth.state = { user: null, loading: false };
    render(tree("/welcome"));
    expect(landing()).toBeInTheDocument();
    expect(loc()).toBe("/welcome");
  });

  for (const [width, desktop] of [["mobile", false], ["desktop", true]] as const) {
    it(`${width}: loading → signed-out keeps the SAME landing element (no remount, no flash)`, () => {
      setMatchMediaMatches(desktop);
      const view = render(tree("/"));
      const before = landing();
      expect(before).toBeInTheDocument();
      auth.state = { user: null, loading: false };
      act(() => view.rerender(tree("/")));
      expect(landing()).toBe(before);
      expect(loc()).toBe("/");
    });
  }
});

describe("RootEntry — harness control", () => {
  it("★ CONTROL: a SECOND Router in the same tree throws — the outer router is real", () => {
    expect(() => render(tree("/", true))).toThrow(/cannot render a <Router> inside another <Router>/i);
  });
});
