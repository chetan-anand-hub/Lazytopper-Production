import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { setMatchMediaMatches } from "./test/setup";
import { BottomNav } from "./App";

/**
 * NAV-PRICING-1 — the phone bar's 5th tab is "Pricing" (-> /pricing?source=bottom-nav) for a signed-out visitor,
 * Basic and trial students; a Board Pass holder keeps "Me".
 * /browse (where visitors actually land) is the primary case.
 */
const auth = vi.hoisted(() => ({ user: null as null | { uid: string }, loading: false }));
vi.mock("./context/AuthContext", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./context/AuthContext")>();
  return {
    ...actual,
    useAuth: () => ({ user: auth.user, loading: auth.loading }) as unknown as ReturnType<typeof actual.useAuth>,
  };
});
const listeners = vi.hoisted(() => new Set<(uid: string, s: unknown) => void>());
const emitHydrated = (uid: string, s: unknown) => listeners.forEach((l) => l(uid, s));
const sub = vi.hoisted(() => ({ value: { tier: "free", plan: "none" } as { tier: string; plan: string } }));
vi.mock("./services/subscriptionService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./services/subscriptionService")>();
  return {
    ...actual,
    loadSubscription: () => sub.value as unknown as ReturnType<typeof actual.loadSubscription>,
    onSubscriptionHydrated: (l: (uid: string, s: unknown) => void) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
});
const track = vi.hoisted(() => vi.fn());
vi.mock("./analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./analytics/analytics")>();
  return { ...actual, trackNavPricingTap: track };
});

afterEach(() => {
  cleanup();
  auth.user = null;
  auth.loading = false;
  sub.value = { tier: "free", plan: "none" };
  track.mockClear();
});

function Probe() {
  const loc = useLocation();
  return <div data-testid="loc">{loc.pathname + loc.search}</div>;
}
function renderNav(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <BottomNav />
      <Routes>
        <Route path="*" element={<Probe />} />
      </Routes>
    </MemoryRouter>,
  );
}
const LABELS = ["Home", "Exam Trends", "Practice", "Check"];

describe("BottomNav 5th tab — Pricing / Me", () => {
  it("★ signed out on /browse (mobile): the bar shows, with Pricing and no Me", () => {
    setMatchMediaMatches(false);
    renderNav("/browse");
    for (const l of [...LABELS, "Pricing"]) expect(screen.getByText(l)).toBeInTheDocument();
    expect(screen.queryByText("Me")).toBeNull();
  });

  it("Pricing goes to /pricing?source=bottom-nav and fires nav_pricing_tap", () => {
    setMatchMediaMatches(false);
    renderNav("/browse");
    fireEvent.click(screen.getByText("Pricing"));
    expect(screen.getByTestId("loc")).toHaveTextContent("/pricing?source=bottom-nav");
    expect(track).toHaveBeenCalledWith("bottom_nav");
  });

  it("Pricing is never the active tab", () => {
    setMatchMediaMatches(false);
    renderNav("/browse");
    expect(screen.getByText("Pricing").closest("button")!.style.color).toBe("rgb(91, 102, 123)");
  });

  it("Basic and trial students see Pricing, not Me", () => {
    setMatchMediaMatches(false);
    for (const v of [{ tier: "free", plan: "none" }, { tier: "trial", plan: "trial_7day" }]) {
      cleanup();
      auth.user = { uid: "u1" };
      sub.value = v;
      renderNav("/browse");
      expect(screen.getByText("Pricing")).toBeInTheDocument();
      expect(screen.queryByText("Me")).toBeNull();
    }
  });

  it("a month-pass student is not a holder: Pricing", () => {
    setMatchMediaMatches(false);
    auth.user = { uid: "u1" };
    sub.value = { tier: "premium", plan: "pass_month" };
    renderNav("/browse");
    expect(screen.getByText("Pricing")).toBeInTheDocument();
  });

  it("★ a Board Pass holder keeps Me (no Pricing), and Me keeps its active state", () => {
    setMatchMediaMatches(false);
    auth.user = { uid: "u1" };
    sub.value = { tier: "premium", plan: "pass_till_boards" };
    renderNav("/me");
    expect(screen.queryByText("Pricing")).toBeNull();
    expect(screen.getByText("Me").closest("button")!.style.color).toBe("rgb(52, 178, 119)");
    fireEvent.click(screen.getByText("Me"));
    expect(screen.getByTestId("loc")).toHaveTextContent("/me");
  });

  it("a holder's 5th tab flips Pricing -> Me when the subscription hydrates", () => {
    setMatchMediaMatches(false);
    auth.user = { uid: "u1" };
    renderNav("/browse"); // cache is the Basic default
    expect(screen.getByText("Pricing")).toBeInTheDocument();
    expect(screen.queryByText("Me")).toBeNull();
    act(() => {
      emitHydrated("u1", { tier: "premium", plan: "pass_till_boards" });
    });
    expect(screen.getByText("Me")).toBeInTheDocument();
    expect(screen.queryByText("Pricing")).toBeNull();
  });

  it("still hidden on /pricing and on desktop", () => {
    setMatchMediaMatches(false);
    renderNav("/pricing");
    expect(screen.queryByText("Pricing")).toBeNull();
    cleanup();
    setMatchMediaMatches(true);
    renderNav("/browse");
    expect(screen.queryByText("Pricing")).toBeNull();
  });
});
