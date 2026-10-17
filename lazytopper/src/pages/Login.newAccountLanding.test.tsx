/**
 * ACTIVATION-2 C — a NEW account with no explicit redirect lands on /check-improve (the ads
 * promise "check your answer"); a returning login still lands on "/", and an explicit
 * `?redirect=` / `state.from` always wins. The "new" signal is the one the sign_up event uses
 * (AuthContext: trackSignUpIfNew's isNewUser gate, and the email create call).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import type { AuthUser } from "../context/AuthContext";

const authState: { user: AuthUser | null } = { user: null };

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: authState.user,
    signInWithGoogle: vi.fn(async () => {}),
    signInWithEmailPassword: vi.fn(async () => {}),
    signUpWithEmailPassword: vi.fn(async () => {}),
    sendPasswordReset: vi.fn(async () => {}),
    initPhoneRecaptcha: vi.fn(async () => {}),
    sendPhoneOtp: vi.fn(async () => {}),
    verifyPhoneOtp: vi.fn(async () => {}),
    logout: vi.fn(async () => {}),
  }),
}));
vi.mock("../services/referralService", () => ({ creditPendingReferral: vi.fn() }));
// The door's UX telemetry stamps the wall clock; it is not what this file pins.
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: vi.fn() }));
vi.mock("firebase/auth", () => ({
  sendEmailVerification: vi.fn(async () => {}),
  reload: vi.fn(async () => {}),
  verifyBeforeUpdateEmail: vi.fn(async () => {}),
  reauthenticateWithCredential: vi.fn(async () => {}),
  EmailAuthProvider: { credential: vi.fn(() => ({})) },
  getAdditionalUserInfo: (c: { isNew?: boolean }) => ({ isNewUser: !!c?.isNew }),
}));

import Login from "./Login";
import {
  NEW_ACCOUNT_LANDING_PATH,
  NEW_ACCOUNT_LANDING_TTL_MS,
  markNewAccountLanding,
  markNewAccountLandingIfNew,
  takeNewAccountLanding,
} from "../services/newAccountLanding";

const GOOGLE_USER = {
  uid: "uid-new",
  email: "new@example.com",
  phoneNumber: null,
  displayName: "Ananya",
  providerIds: ["google.com"],
  emailVerified: true,
} as AuthUser;

function renderDoorAt(entry: string | { pathname: string; state: unknown }) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/check-improve" element={<div>LANDED ON CHECK AND IMPROVE</div>} />
        <Route path="/practice-hub" element={<div>LANDED ON PRACTICE HUB</div>} />
        <Route path="/" element={<div>LANDED ON HOME</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  authState.user = null;
  localStorage.clear();
  takeNewAccountLanding(); // no mark carried between tests
});
afterEach(cleanup);

describe("ACTIVATION-2 C · where a sign-in lands", () => {
  it("★★ a NEW account with no redirect lands on Check & Improve", async () => {
    markNewAccountLandingIfNew({ isNew: true } as never);
    authState.user = GOOGLE_USER;
    renderDoorAt("/login");
    expect(await screen.findByText("LANDED ON CHECK AND IMPROVE")).toBeTruthy();
    expect(NEW_ACCOUNT_LANDING_PATH).toBe("/check-improve");
  });

  it("★★ a RETURNING login (isNewUser false) with no redirect still lands on home", async () => {
    markNewAccountLandingIfNew({ isNew: false } as never);
    authState.user = GOOGLE_USER;
    renderDoorAt("/login");
    expect(await screen.findByText("LANDED ON HOME")).toBeTruthy();
  });

  it("★★ an explicit ?redirect= wins over the new-account landing", async () => {
    markNewAccountLanding();
    authState.user = GOOGLE_USER;
    renderDoorAt("/login?redirect=%2Fpractice-hub");
    expect(await screen.findByText("LANDED ON PRACTICE HUB")).toBeTruthy();
  });

  it("★★ a NEW account whose ?redirect= is only the default Home (%2F, as Welcome / the shell pass it) lands on Check & Improve", async () => {
    markNewAccountLanding();
    authState.user = GOOGLE_USER;
    renderDoorAt("/login?reason=login&redirect=%2F");
    expect(await screen.findByText("LANDED ON CHECK AND IMPROVE")).toBeTruthy();
  });

  it("★ a NEW account from the mobile Home (/browse) lands on Check & Improve too", async () => {
    markNewAccountLanding();
    authState.user = GOOGLE_USER;
    renderDoorAt("/login?redirect=%2Fbrowse");
    expect(await screen.findByText("LANDED ON CHECK AND IMPROVE")).toBeTruthy();
  });

  it("★★ CONTROL: a RETURNING login with redirect=%2F still lands on home", async () => {
    authState.user = GOOGLE_USER;
    renderDoorAt("/login?reason=login&redirect=%2F");
    expect(await screen.findByText("LANDED ON HOME")).toBeTruthy();
  });

  it("★ state.from wins too", async () => {
    markNewAccountLanding();
    authState.user = GOOGLE_USER;
    renderDoorAt({ pathname: "/login", state: { from: "/practice-hub" } });
    expect(await screen.findByText("LANDED ON PRACTICE HUB")).toBeTruthy();
  });
});

describe("ACTIVATION-2 C · the new-account mark", () => {
  it("is taken once", () => {
    markNewAccountLanding();
    expect(takeNewAccountLanding()).toBe(true);
    expect(takeNewAccountLanding()).toBe(false);
  });

  it("expires, so a stale mark never redirects a later login", () => {
    const t0 = 1_000_000;
    markNewAccountLanding(t0);
    expect(takeNewAccountLanding(t0 + NEW_ACCOUNT_LANDING_TTL_MS + 1)).toBe(false);
  });

  it("a credential the SDK cannot read never marks (and never throws)", () => {
    expect(() => markNewAccountLandingIfNew(null as never)).not.toThrow();
    expect(takeNewAccountLanding()).toBe(false);
  });
});
