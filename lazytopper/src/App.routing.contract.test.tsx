/**
 * App ROUTING CONTRACT TESTS — the replacement for the blanket FORBIDDEN ban on App.tsx.
 *
 * ★ WHY THIS FILE EXISTS.
 * `lazytopper/src/App.tsx` was a blanket zero-diff FORBIDDEN path in TWO acceptance gates:
 *   · scripts/ops/check_improve_overlay_additive_acceptance.mjs   (CI-OVL) — "routing (:320 stays green)"
 *   · scripts/ops/quick_practice_overlay_additive_acceptance.mjs  (QP-OVL) — "routing (the /practice
 *     route element is untouched)"
 * Both bans were LIFTED 2026-08-04 (owner decision, Wave 5C lane FORBID-4) so the ME-PROGRESS lane
 * can repoint the `/me` route to a single responsive MeProgressPage — the Option-B convergence
 * already shipped for Exam Trends, Topic Hub, Worksheets and Check & Improve. Same precedent as
 * #519 (DesktopShell.tsx), PR-C1 (checkSolution.cjs) and #581 (SolutionChecker.tsx):
 * THE PROTECTION CHANGES FORM, IT DOES NOT DISAPPEAR.
 *
 * ★ WHAT THE TWO BANS WERE ACTUALLY BUYING, made explicit — because a blanket zero-diff ban says
 * "something in this file must not change" and never says what. Read end-to-end, both gates wanted
 * exactly three properties of App.tsx, and nothing else:
 *
 *   (1) EXACTLY ONE ROUTER. Both overlay hosts are built on the premise, stated in QP-OVL's own
 *       header, of "the app's always-present <BrowserRouter>" — ONE router, owned by main.tsx.
 *       TutorQuickPracticeOverlay seeds its route with <Routes location> plus an UNSAFE_RouteContext
 *       reset and contains navigation with an UNSAFE_NavigationContext override; all three read the
 *       SINGLE surrounding router. A second Router constructed anywhere in the app tree is the #490
 *       defect verbatim — react-router throws "You cannot render a <Router> inside another
 *       <Router>" and every student met an error page. QP-OVL guards the HOST against that
 *       (its "NO-NESTED-ROUTER (#490 regression guard)" check) but nothing guarded App.tsx itself
 *       except the blanket ban.
 *
 *   (2) THE /practice/:grade/:subject ROUTE ELEMENT MOUNTS <PracticePage /> WITH NO PROPS.
 *       This is QP-OVL's Option-A invariant: the Quick-Practice overlay is mounted INSIDE THE TUTOR,
 *       never via the route. If the route element ever passed `overlay={...}`, a plain hub or
 *       direct visit would silently render in overlay mode — breadcrumb suppressed, "Ask tutor"
 *       suppressed, scorecard app-nav items omitted. QP-OVL's GUARD 3 was a COMMENT ONLY; it
 *       delegated the whole assertion to the forbidden zero-diff, so this property had NO
 *       executable coverage anywhere in the repo before this file.
 *
 *   (3) THE /check-improve ROUTE ELEMENT MOUNTS <DesktopCheckImprovePage /> WITH NO PROPS.
 *       CI-OVL's twin invariant, for the same reason (the C&I overlay is mounted inside the tutor
 *       by TutorCheckImproveOverlay, never via the route). Unlike (2) this one is ALSO asserted as
 *       a source regex by CI-OVL's own "GUARD 5" — so the behavioural form here is deliberately
 *       ADDED BESIDE it, not a duplicate: GUARD 5 pins the SOURCE SHAPE, these tests pin what
 *       actually MOUNTS.
 *
 * ★ WHAT THESE TESTS DELIBERATELY DO **NOT** PIN.
 * They assert nothing whatsoever about `/me`, about the route COUNT, or about any route the two
 * gates never depended on. A guard replacing a blanket ban must pin WHAT THE BAN PROTECTED, not
 * WHAT THE FILE HAPPENED TO DO THAT DAY — the FORBID-1 lesson, where an assertion that a CTA was
 * "enabled" was true on the day, unrelated to the ban, and blocked another lane four days later.
 * [FU-CONTRACT-TESTS-OVERPIN-CURRENT-BEHAVIOUR]
 *
 * ★ THE HARNESS REPRODUCES PRODUCTION, and carries a CONTROL that must throw.
 * #490 shipped because its test rendered the overlay IN ISOLATION: the nested router was the only
 * router, so it was legal in the test and illegal in production. The assertion was fine; the
 * HARNESS was the defect. So this file mounts App inside the app's ALWAYS-PRESENT outer router and
 * the FULL main.tsx provider stack, and the ONE-ROUTER test is paired with a control that nests a
 * second Router and asserts it THROWS. If the control cannot fail, the harness is not proven to
 * reproduce production and the test above it proves nothing.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { setMatchMediaMatches } from "./test/setup";

/* ────────────────────────────────────────────────────────────────────────────
   PROBES. `vi.mock` factories are hoisted above the imports, so the recorders
   have to be created with `vi.hoisted` and the factories must pull `createElement`
   in themselves rather than rely on JSX/React being initialised yet.
   ──────────────────────────────────────────────────────────────────────────── */
const probes = vi.hoisted(() => ({
  practice: [] as Record<string, unknown>[],
  checkImprove: [] as Record<string, unknown>[],
}));

vi.mock("./pages/PracticePage", async () => {
  const { createElement } = await import("react");
  return {
    default: (props: Record<string, unknown>) => {
      probes.practice.push(props);
      return createElement("div", { "data-testid": "probe-practice-page" });
    },
  };
});

vi.mock("./pages/desktop/DesktopCheckImprovePage", async () => {
  const { createElement } = await import("react");
  return {
    default: (props: Record<string, unknown>) => {
      probes.checkImprove.push(props);
      return createElement("div", { "data-testid": "probe-check-improve-page" });
    },
  };
});

/* Signed-in auth. `/practice/:grade/:subject` sits behind <PracticeLimitGate>, which redirects a
   signed-out visitor to /login, so without this the route element never mounts and the assertions
   below would pass vacuously on an empty probe array. Only `useAuth` is replaced — the real
   AuthProvider is kept, so the provider stack still matches main.tsx. */
vi.mock("./context/AuthContext", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./context/AuthContext")>();
  return {
    ...actual,
    useAuth: () =>
      ({
        user: {
          uid: "forbid4-routing-contract-uid",
          email: "routing-contract@example.test",
          phoneNumber: null,
          displayName: "Routing Contract",
          providerIds: ["password"],
        },
        loading: false,
      }) as unknown as ReturnType<typeof actual.useAuth>,
  };
});

/* Imported AFTER the mocks above so App's module graph resolves to them. */
const { default: App } = await import("./App");
const { AuthProvider } = await import("./context/AuthContext");
const { ProfileProvider } = await import("./context/ProfileContext");
const { SmartLearningProvider } = await import("./engine/smartLearningStore");
const { VibeProvider } = await import("./context/vibeModeContext");
const { ThemeProvider } = await import("./context/ThemeContext");

/**
 * The production provider stack, in main.tsx's exact order, with <BrowserRouter> swapped for
 * <MemoryRouter> so a path can be seeded. THIS IS THE POINT: the app is ALWAYS inside a router,
 * so any Router constructed inside `children` is illegal exactly as it is in production.
 */
function mountAppAt(path: string, extraRouter = false) {
  const app = extraRouter ? <MemoryRouter initialEntries={[path]}><App /></MemoryRouter> : <App />;
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <ProfileProvider>
          <SmartLearningProvider>
            <VibeProvider>
              <ThemeProvider>{app as ReactNode}</ThemeProvider>
            </VibeProvider>
          </SmartLearningProvider>
        </ProfileProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  probes.practice.length = 0;
  probes.checkImprove.length = 0;
  setMatchMediaMatches(false); // mobile — width-independent for every assertion here
});
afterEach(cleanup);

/* ══════════════════════════════════════════════════════════════════════════
   1 · EXACTLY ONE ROUTER — the #490 defect class. (Property 1 above.)
   ══════════════════════════════════════════════════════════════════════════ */
describe("App routing contract — exactly one Router (#490 regression guard)", () => {
  /**
   * ★ WHY THIS IS NOT WRITTEN AS `expect(...).not.toThrow()`.
   * The first draft was, and it was a SILENT NO-OP — proven by mutation, not by reading. App.tsx
   * wraps its <Routes> in an <ErrorBoundary>, so when a second <MemoryRouter> was spliced into the
   * app tree, react-router threw exactly as production does, the boundary CAUGHT it, rendered its
   * "Something went wrong" page, and `not.toThrow()` passed green while the app was completely
   * broken. That is the #490 shape all over again: the app does not crash, it error-pages, and an
   * assertion about throwing cannot see the difference.
   *
   * So the property is asserted POSITIVELY instead: the routed content must actually MOUNT, and
   * the error-boundary fallback must NOT be on screen. Both halves are needed — the second is what
   * names the failure mode that masked this the first time.
   */
  const BOUNDARY_FALLBACKS = ["Something went wrong", "This section ran into an issue"];

  it("mounts its routed content inside the app's always-present outer router", async () => {
    mountAppAt("/check-improve");
    expect(await screen.findByTestId("probe-check-improve-page")).toBeInTheDocument();
  });

  it("does NOT fall through to the error boundary (a nested Router error-pages, it does not crash)", async () => {
    mountAppAt("/check-improve");
    await screen.findByTestId("probe-check-improve-page");
    for (const fallback of BOUNDARY_FALLBACKS) {
      expect(screen.queryByText(fallback)).toBeNull();
    }
  });

  it("★ CONTROL: a SECOND Router in the same tree DOES throw — the harness reproduces production", () => {
    // Proves the harness's outer router is real and that Router-in-Router is illegal here exactly
    // as it is in production. If this control ever stops throwing, the tests above are not
    // measuring what they claim to measure.
    expect(() => mountAppAt("/browse", true)).toThrow(
      /cannot render a <Router> inside another <Router>/i,
    );
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   2 · THE GUARDED ROUTE ELEMENTS MOUNT THEIR PAGE, PROPLESS. (Properties 2 + 3.)
   ══════════════════════════════════════════════════════════════════════════ */
describe("App routing contract — /practice/:grade/:subject (QP-OVL's Option-A invariant)", () => {
  it("resolves to a mounted PracticePage", async () => {
    mountAppAt("/practice/10/Maths");
    expect(await screen.findByTestId("probe-practice-page")).toBeInTheDocument();
    expect(probes.practice.length).toBeGreaterThan(0);
  });

  it("mounts PracticePage with NO overlay prop — the overlay lives in the tutor, never the route", async () => {
    mountAppAt("/practice/10/Maths");
    await screen.findByTestId("probe-practice-page");
    for (const props of probes.practice) {
      expect(props.overlay).toBeUndefined();
      expect(Object.prototype.hasOwnProperty.call(props, "overlay")).toBe(false);
    }
  });

  it("mounts PracticePage with NO props at all (the propless <PracticePage /> form)", async () => {
    mountAppAt("/practice/10/Maths");
    await screen.findByTestId("probe-practice-page");
    for (const props of probes.practice) {
      expect(Object.keys(props)).toEqual([]);
    }
  });
});

describe("App routing contract — /check-improve (CI-OVL's :320 invariant)", () => {
  it("resolves to a mounted DesktopCheckImprovePage", async () => {
    mountAppAt("/check-improve");
    expect(await screen.findByTestId("probe-check-improve-page")).toBeInTheDocument();
    expect(probes.checkImprove.length).toBeGreaterThan(0);
  });

  it("mounts DesktopCheckImprovePage with NO overlay prop", async () => {
    mountAppAt("/check-improve");
    await screen.findByTestId("probe-check-improve-page");
    for (const props of probes.checkImprove) {
      expect(props.overlay).toBeUndefined();
      expect(Object.prototype.hasOwnProperty.call(props, "overlay")).toBe(false);
    }
  });

  it("mounts DesktopCheckImprovePage with NO props at all (convergence :320 / GUARD 5, behaviourally)", async () => {
    mountAppAt("/check-improve");
    await screen.findByTestId("probe-check-improve-page");
    for (const props of probes.checkImprove) {
      expect(Object.keys(props)).toEqual([]);
    }
  });
});
