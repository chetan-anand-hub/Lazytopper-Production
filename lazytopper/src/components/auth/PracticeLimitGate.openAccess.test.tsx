import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

/**
 * AUTH-GATE-MOVE-1 — `PracticeLimitGate` no longer walls a signed-out visitor.
 *
 * ★ WHAT THIS FILE EXISTS TO CATCH. The gate used to answer `!user` with
 * `<Navigate to="/login">`, so every signed-out visitor — and every crawler — was bounced
 * off quick practice before a single question rendered. That put a login wall in front of
 * content that costs nothing to serve. The wall now lives where the money is spent (AI
 * grading, inside `SolutionChecker`); serving a question is free.
 *
 * ★★ THE HARNESS CONTROL IS THE POINT OF THIS FILE. Asserting "no redirect happened" is
 * the easiest assertion in the world to fake: a harness that cannot observe a redirect AT
 * ALL passes it forever. So this file renders a real `/login` route carrying a marker,
 * and proves with `RequirePremium` — a component that still redirects on `!user` — that
 * the marker DOES appear when a redirect really happens. Only then does its absence under
 * `PracticeLimitGate` mean anything.
 */

type TestUser = { uid: string; isLocalSession?: boolean } | null;
let currentUser: TestUser = null;
let premium = false;

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: currentUser, loading: false }),
}));

// The real hook fires `hydrateSubscriptionFromCloud` against Firestore inside jsdom for
// any truthy uid — the same reason the other gate suites in this directory mock it.
vi.mock("../../hooks/useSubscription", () => ({
  useSubscription: () => ({
    tier: premium ? "premium" : "free",
    isPremium: premium,
    isTrialActive: false,
    isTrialExpired: false,
    daysLeftInTrial: 0,
    status: { tier: premium ? "premium" : "free" },
    startTrial: () => {},
    upgradeToPremium: () => {},
  }),
}));

import { PracticeLimitGate } from "./PracticeLimitGate";
import { RequirePremium } from "./RequireAuth";

const QUESTION = "a real practice question";
const LOGIN_MARKER = "login-door";

function mount(gate: "practice-limit" | "require-premium") {
  const inner = <div>{QUESTION}</div>;
  return render(
    <MemoryRouter initialEntries={["/practice/10/Maths?topic=trigonometry"]}>
      <Routes>
        <Route
          path="/practice/:grade/:subject"
          element={
            gate === "practice-limit"
              ? <PracticeLimitGate>{inner}</PracticeLimitGate>
              : <RequirePremium featureLabel="control">{inner}</RequirePremium>
          }
        />
        <Route path="/login" element={<div>{LOGIN_MARKER}</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  currentUser = null;
  premium = false;
});
afterEach(cleanup);

describe("PracticeLimitGate — a signed-out visitor is not walled", () => {
  it("★ CONTROL: the harness CAN see a redirect — RequirePremium bounces to /login", () => {
    // Without this, every assertion below would pass on a harness that renders the
    // /login route nowhere and can never observe a bounce.
    currentUser = null;
    mount("require-premium");
    expect(screen.getByText(LOGIN_MARKER)).toBeInTheDocument();
    expect(screen.queryByText(QUESTION)).toBeNull();
  });

  it("SIGNED OUT: the questions render, and there is NO redirect to /login", () => {
    currentUser = null;
    mount("practice-limit");
    expect(screen.getByText(QUESTION)).toBeInTheDocument();
    expect(screen.queryByText(LOGIN_MARKER)).toBeNull();
  });

  it("SIGNED IN free: unchanged — the questions still render", () => {
    currentUser = { uid: "u-1", isLocalSession: false };
    mount("practice-limit");
    expect(screen.getByText(QUESTION)).toBeInTheDocument();
    expect(screen.queryByText(LOGIN_MARKER)).toBeNull();
  });

  it("PREMIUM: unchanged — the questions still render", () => {
    currentUser = { uid: "u-1", isLocalSession: false };
    premium = true;
    mount("practice-limit");
    expect(screen.getByText(QUESTION)).toBeInTheDocument();
  });

  it("the redirect is gone from the SOURCE, not merely unreachable in this harness", () => {
    // ★ A behavioural test alone would stay green if the redirect were still present but
    // shadowed by some earlier branch. This pins its absence directly.
    const fs = require("node:fs") as typeof import("node:fs");
    const path = require("node:path") as typeof import("node:path");
    const src = fs.readFileSync(path.join(__dirname, "PracticeLimitGate.tsx"), "utf8");
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    expect(code).not.toMatch(/<Navigate/);
    expect(code).not.toMatch(/"\/login"/);
    // ★ CONTROL for the comment-stripper: it must not have emptied the file, or the two
    // assertions above would pass against nothing at all.
    expect(code).toMatch(/export function PracticeLimitGate/);
  });
});
