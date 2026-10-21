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

function expectThree() {
  expect(screen.getByTestId("paywall-pay")).toHaveTextContent(/^Pay$/);
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
    expectThree();
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

  it("never trialled: 'Start my free 7-day trial' stays FIRST, the three follow", () => {
    flags(true);
    sub.value = NEVER_TRIALLED;
    at(gate);
    expectThree();
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
  it("switched on: the three replace 'Choose Plan'; 'Keep using Basic' stays", () => {
    flags(true);
    at(<UpgradeModal open onClose={vi.fn()} featureLabel="Full mock" />);
    expectThree();
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
    expectThree();
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
  ])("%s, switched on: the three replace 'See plans'; its own dismiss stays", (_l, limit) => {
    flags(true);
    at(<FairUseLimitPanel limit={limit} onDismiss={vi.fn()} />);
    expectThree();
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
