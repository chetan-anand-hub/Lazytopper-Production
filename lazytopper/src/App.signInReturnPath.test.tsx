// ACTIVATION-1 · L3 — the mobile header "Sign in" carries the page the student is on, so the
// round trip returns them there instead of /browse. An unsafe current path falls back to "/".
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { setMatchMediaMatches } from "./test/setup";

vi.mock("./context/AuthContext", () => ({ useAuth: () => ({ user: null, loading: false }) }));
vi.mock("./hooks/useSubscription", () => ({
  useSubscription: () => ({
    isPremium: false,
    isTrialActive: false,
    isTrialExpired: false,
    daysLeftInTrial: 0,
    status: { tier: "free" },
  }),
}));
vi.mock("./context/vibeModeContext", () => ({
  useVibeMode: () => ({ mode: "calm", setMode: () => {} }),
}));
vi.mock("./pages/Welcome", () => ({ default: () => <div>landing</div> }));
vi.mock("./pages/desktop/DesktopHome", () => ({ default: () => <div>home</div> }));
vi.mock("./pages/app/MobileHome", () => ({ default: () => <div>home</div> }));
vi.mock("./pages/Login", () => ({ default: () => <div data-testid="stub-login">login</div> }));

import App from "./App";

function Probe() {
  const loc = useLocation();
  return <div data-testid="where">{`${loc.pathname}${loc.search}`}</div>;
}
function mountAt(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <App />
      <Probe />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 200 })));
  setMatchMediaMatches(false); // mobile: the header Log in at App.tsx:934
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("mobile header Log in carries a return path", () => {
  it("from /check-your-answer?src=ad it goes to /login?redirect=<that page>", async () => {
    mountAt("/check-your-answer?src=ad");
    fireEvent.click(await screen.findByRole("button", { name: /^Log in$/i }));
    expect(await screen.findByTestId("stub-login")).toBeInTheDocument();
    const where = screen.getByTestId("where").textContent!;
    expect(where.startsWith("/login?redirect=")).toBe(true);
    expect(new URLSearchParams(where.split("?").slice(1).join("?")).get("redirect")).toBe(
      "/check-your-answer?src=ad",
    );
  });

  it("an unsafe current path (a backslash a browser would normalise into //host) falls back to /", async () => {
    mountAt("/check-your-answer?next=\\evil.example.com");
    fireEvent.click(await screen.findByRole("button", { name: /^Log in$/i }));
    expect(screen.getByTestId("where").textContent).toBe("/login?redirect=%2F");
  });
});
