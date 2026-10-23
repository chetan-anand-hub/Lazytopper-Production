/**
 * PAYWALL-PAY-1 — the three actions reach EVERY lock point, not just the one the request named:
 *
 *   lock screen     RequirePremium (tutor, Chapter Hub, Exam Simulation, Weak Area Practice,
 *                   Check & Improve, Worksheet marking) — expired trial AND never trialled
 *   upgrade popup   UpgradeModal (MockViewGate, PracticeLimitGate, TrialBanner, the lock's
 *                   own "See plans")
 *   upgrade sheet   UpgradeSheet (SolutionChecker, PracticePage, QuickPracticeUploadLater, Me)
 *   limit panel     FairUseLimitPanel, inline AND the trial-day dialog (every paper surface)
 *
 * With payments dark each keeps its own control exactly (the CONTROL half of every case), and
 * "Start trial" stays FIRST for a student who never trialled.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import type { ReactNode } from "react";

vi.mock("../../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../analytics/analytics")>();
  return { ...actual, trackPaywallAction: vi.fn(), trackNamedEvent: vi.fn() };
});
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "uid-surfaces-1" }, loading: false }),
}));
const sub = vi.hoisted(() => ({
  value: {
    tier: "free",
    isPremium: false,
    isTrialActive: false,
    isTrialExpired: true,
    daysLeftInTrial: 0,
    hydrated: true,
    status: { tier: "free", plan: "none", trialStartDate: "2026-10-01T00:00:00.000Z", trialEndDate: null, premiumSince: null },
    startTrial: () => undefined,
  } as Record<string, unknown>,
}));
vi.mock("../../hooks/useSubscription", () => ({ useSubscription: () => sub.value }));

import { RequirePremium } from "../auth/RequireAuth";
import { UpgradeModal } from "../UpgradeModal";
import { UpgradeSheet } from "../subscription/UpgradeSheet";
import FairUseLimitPanel from "../usage/FairUseLimitPanel";
import TrialPaperNote from "../usage/TrialPaperNote";
import TutorErrorView from "../../pages/tutor/TutorErrorView";
import * as analytics from "../../analytics/analytics";
import { FORWARD_LABEL, QR_LABEL } from "./PaywallActions";

const track = analytics.trackPaywallAction as unknown as ReturnType<typeof vi.fn>;

const EXPIRED = { ...sub.value };
const NEVER_TRIALLED = {
  ...sub.value,
  isTrialExpired: false,
  status: { tier: "free", plan: "none", trialStartDate: null, trialEndDate: null, premiumSince: null },
};

function flags(on: boolean) {
  vi.stubEnv("VITE_PAYMENTS_ENABLED", on ? "1" : "");
  vi.stubEnv("VITE_PARENT_PAY_ENABLED", on ? "1" : "");
}

function Where() {
  const l = useLocation();
  return <div data-testid="where">{`${l.pathname}${l.search}`}</div>;
}

function at(node: ReactNode, entry = "/tutor?q=1") {
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="*" element={<>{node}<Where /></>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function expectThree() {
  expect(await screen.findByTestId("paywall-pay")).toHaveTextContent(/^Pay$/);
  expect(screen.getByRole("button", { name: QR_LABEL })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: FORWARD_LABEL })).toBeInTheDocument();
  expect(document.body.textContent || "").not.toMatch(/\bask\b[^.]*parent/i);
}

function expectNone() {
  expect(screen.queryByTestId("paywall-actions")).toBeNull();
  expect(screen.queryByRole("button", { name: QR_LABEL })).toBeNull();
}

const LIMIT_INLINE = { tier: "trial" as const, scope: "checks" as const, resetAt: null, window: null };
const LIMIT_DIALOG = { ...LIMIT_INLINE, resetAt: "2026-10-23T18:30:00.000Z" };

beforeEach(() => {
  track.mockClear();
  sub.value = EXPIRED;
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("lock screen (RequirePremium)", () => {
  const gate = (
    <RequirePremium featureLabel="The AI tutor">
      <div>CHILD</div>
    </RequirePremium>
  );

  it("expired trial, switched on: Pay / Share QR code / Forward link to parents; Pay goes to /pricing", async () => {
    flags(true);
    at(gate);
    await expectThree();
    expect(screen.queryByText("Unlock Full Access")).toBeNull();
    await act(async () => {
      fireEvent.click(screen.getByTestId("paywall-pay"));
    });
    expect(screen.getByTestId("where").textContent).toBe(`/pricing?source=lock&returnTo=${encodeURIComponent("/tutor?q=1")}`);
    expect(track.mock.calls).toEqual([["pay", "lock"]]);
  });

  it("CONTROL — payments dark: the old 'Unlock Full Access', nothing new", () => {
    flags(false);
    at(gate);
    expect(screen.getByText("Unlock Full Access")).toBeInTheDocument();
    expectNone();
  });

  it("never trialled: 'Start my free 7-day trial' stays FIRST, the three follow", async () => {
    flags(true);
    sub.value = NEVER_TRIALLED;
    at(gate);
    await expectThree();
    const trial = screen.getByRole("button", { name: "Start my free 7-day trial" });
    const pay = screen.getByTestId("paywall-pay");
    expect(trial.compareDocumentPosition(pay) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByText("See plans instead")).toBeNull();
  });

  it("CONTROL — never trialled, payments dark: trial + 'See plans instead', as before", () => {
    flags(false);
    sub.value = NEVER_TRIALLED;
    at(gate);
    expect(screen.getByText("See plans instead")).toBeInTheDocument();
    expectNone();
  });
});

describe("upgrade popup (UpgradeModal)", () => {
  it("switched on: the three replace 'Choose Plan'; 'Keep using Basic' stays", async () => {
    flags(true);
    at(<UpgradeModal open onClose={vi.fn()} featureLabel="Full mock" />);
    await expectThree();
    expect(screen.queryByText("Choose Plan")).toBeNull();
    expect(screen.getByTestId("upgrade-modal-keep-basic")).toBeInTheDocument();
  });

  it("CONTROL — payments dark: 'Choose Plan', nothing new", () => {
    flags(false);
    at(<UpgradeModal open onClose={vi.fn()} featureLabel="Full mock" />);
    expect(screen.getByText("Choose Plan")).toBeInTheDocument();
    expectNone();
  });
});

describe("upgrade sheet (UpgradeSheet)", () => {
  it("switched on: the three replace 'See plans'; Pay keeps the sheet's own plans URL", async () => {
    flags(true);
    at(<UpgradeSheet featureLabel="Checking your answer" onClose={vi.fn()} />, "/practice?topic=light");
    await expectThree();
    expect(screen.queryByText("See plans")).toBeNull();
    await act(async () => {
      fireEvent.click(screen.getByTestId("paywall-pay"));
    });
    expect(screen.getByTestId("where").textContent).toBe(
      `/pricing?source=upgrade-sheet&returnTo=${encodeURIComponent("/practice?topic=light")}`,
    );
    expect(track.mock.calls).toEqual([["pay", "upgrade_sheet"]]);
  });

  it("CONTROL — payments dark: 'See plans', nothing new", () => {
    flags(false);
    at(<UpgradeSheet featureLabel="Checking your answer" onClose={vi.fn()} />);
    expect(screen.getByText("See plans")).toBeInTheDocument();
    expectNone();
  });
});

describe("usage / limit panel (FairUseLimitPanel)", () => {
  it.each([
    ["inline", LIMIT_INLINE],
    ["trial-day dialog", LIMIT_DIALOG],
  ])("%s, switched on: the three replace 'See plans'; its own dismiss stays", async (_l, limit) => {
    flags(true);
    at(<FairUseLimitPanel limit={limit} onDismiss={vi.fn()} />);
    await expectThree();
    expect(screen.queryByTestId("fair-use-see-plans")).toBeNull();
    expect(screen.getByRole("button", { name: "OK" })).toBeInTheDocument();
    expect(screen.getByTestId("paywall-pay")).toHaveAttribute("href", "/pricing");
  });

  it.each([
    ["inline", LIMIT_INLINE],
    ["trial-day dialog", LIMIT_DIALOG],
  ])("CONTROL — %s, payments dark: 'See plans', nothing new", (_l, limit) => {
    flags(false);
    at(<FairUseLimitPanel limit={limit} onDismiss={vi.fn()} />);
    expect(screen.getByTestId("fair-use-see-plans")).toBeInTheDocument();
    expectNone();
  });
});

const TUTOR_PREMIUM = { kind: "premium" as const, message: "Your free week has ended." };
const TUTOR_BUSY_PLANS = { kind: "busy" as const, resetAt: null, message: "busy", plans: true };
const PAPER_CUT = { graded: 2, total: 4, notGradedIndices: [2, 3] };
const tutor = (state: typeof TUTOR_PREMIUM | typeof TUTOR_BUSY_PLANS) => (
  <TutorErrorView state={state} onRetry={vi.fn()} selfHref="/tutor?q=1" />
);

describe("tutor (TutorErrorView): the server-side Premium card and the busy-with-plans line", () => {
  it.each([
    ["Premium card", TUTOR_PREMIUM],
    ["busy, server said plans", TUTOR_BUSY_PLANS],
  ])("%s, switched on: the three; Pay keeps the tutor's own plans URL", async (_l, state) => {
    flags(true);
    at(tutor(state));
    await expectThree();
    expect(screen.queryByText("See Premium")).toBeNull();
    expect(screen.queryByText("See plans")).toBeNull();
    expect(screen.getByTestId("paywall-pay")).toHaveAttribute(
      "href",
      `/pricing?source=upgrade-sheet&returnTo=${encodeURIComponent("/tutor?q=1")}`,
    );
    fireEvent.click(screen.getByTestId("paywall-pay"));
    expect(track.mock.calls).toEqual([["pay", "tutor"]]);
  });

  it.each([
    ["Premium card", TUTOR_PREMIUM, "See Premium"],
    ["busy, server said plans", TUTOR_BUSY_PLANS, "See plans"],
  ])("CONTROL — %s, payments dark: '%s', nothing new", (_l, state, label) => {
    flags(false);
    at(tutor(state));
    expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    expectNone();
  });

  it("busy WITHOUT the server's plans cue: no pay action at all (not a pay moment)", () => {
    flags(true);
    at(<TutorErrorView state={{ ...TUTOR_BUSY_PLANS, plans: false }} onRetry={vi.fn()} selfHref="/tutor" />);
    expect(screen.getByTestId("tutor-error-busy")).toBeInTheDocument();
    expectNone();
  });
});

describe("trial-paper note (TrialPaperNote)", () => {
  const note = <TrialPaperNote cut={PAPER_CUT} allowance={2} labels={["Q1", "Q2", "Q3", "Q4"]} />;

  it("switched on: the three replace 'See plans'", async () => {
    flags(true);
    at(note);
    await expectThree();
    expect(screen.queryByTestId("trial-paper-see-plans")).toBeNull();
    fireEvent.click(screen.getByTestId("paywall-pay"));
    expect(track.mock.calls).toEqual([["pay", "trial_paper"]]);
  });

  it("CONTROL — payments dark: 'See plans', nothing new", () => {
    flags(false);
    at(note);
    expect(screen.getByTestId("trial-paper-see-plans")).toHaveTextContent("See plans");
    expectNone();
  });
});
