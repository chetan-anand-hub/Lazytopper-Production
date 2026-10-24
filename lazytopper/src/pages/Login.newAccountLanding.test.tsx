/**
 * LOGIN-HOME-1 (owner, 24 Oct 2026; supersedes ACTIVATION-2 C) — a NEW account whose target is the
 * default Home or the Me page lands on HOME (Byte offers "Check one answer" there); any other
 * target wins; a returning login goes back where it came from, /me included. The "new" signal is the one the sign_up event uses
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
  isMeTarget,
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
        <Route path="/pricing" element={<div>LANDED ON PRICING</div>} />
        <Route path="/mex" element={<div>LANDED ON MEX</div>} />
        <Route path="/me" element={<div>LANDED ON ME</div>} />
        <Route path="/profile" element={<div>LANDED ON PROFILE</div>} />
        <Route path="/practice/:grade/:subject" element={<div>LANDED ON PRACTICE SET</div>} />
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

describe("LOGIN-HOME-1 · where a sign-in lands", () => {
  it("the new-account landing is Home", () => {
    expect(NEW_ACCOUNT_LANDING_PATH).toBe("/");
  });

  it.each([
    ["no target", "/login"],
    ["redirect=/", "/login?reason=login&redirect=%2F"],
    ["redirect=/browse", "/login?redirect=%2Fbrowse"],
    ["redirect=/me", "/login?redirect=%2Fme"],
    ["redirect=/me?x=1", "/login?redirect=%2Fme%3Fx%3D1"],
    ["redirect=/profile", "/login?redirect=%2Fprofile"],
  ])("★★ a NEW account with %s lands on Home", async (_n, entry) => {
    markNewAccountLandingIfNew({ isNew: true } as never);
    authState.user = GOOGLE_USER;
    renderDoorAt(entry);
    expect(await screen.findByText("LANDED ON HOME")).toBeTruthy();
  });

  it("★★ a NEW account whose state.from is /me?x=1 (RequireAuth keeps the query) lands on Home", async () => {
    markNewAccountLanding();
    authState.user = GOOGLE_USER;
    renderDoorAt({ pathname: "/login", state: { from: "/me?x=1" } });
    expect(await screen.findByText("LANDED ON HOME")).toBeTruthy();
  });

  it("★★ a NEW account with a practice-set target lands THERE (no work lost)", async () => {
    markNewAccountLanding();
    authState.user = GOOGLE_USER;
    renderDoorAt("/login?redirect=%2Fpractice%2F10%2FMaths%3Ftopic%3Dx");
    expect(await screen.findByText("LANDED ON PRACTICE SET")).toBeTruthy();
  });

  it("★★ an explicit ?redirect= to another page wins over the new-account landing", async () => {
    markNewAccountLanding();
    authState.user = GOOGLE_USER;
    renderDoorAt("/login?redirect=%2Fpractice-hub");
    expect(await screen.findByText("LANDED ON PRACTICE HUB")).toBeTruthy();
  });

  it("★★ a NEW account with /pricing keeps /pricing; a literal /mex keeps /mex (not read as /me)", async () => {
    markNewAccountLanding();
    authState.user = GOOGLE_USER;
    renderDoorAt("/login?redirect=%2Fpricing");
    expect(await screen.findByText("LANDED ON PRICING")).toBeTruthy();
    cleanup();
    markNewAccountLanding();
    authState.user = GOOGLE_USER;
    renderDoorAt("/login?redirect=%2Fmex");
    expect(await screen.findByText("LANDED ON MEX")).toBeTruthy();
  });

  it("★ a NEW account coming from the free check (/check-improve) goes back to it", async () => {
    markNewAccountLanding();
    authState.user = GOOGLE_USER;
    renderDoorAt("/login?redirect=%2Fcheck-improve");
    expect(await screen.findByText("LANDED ON CHECK AND IMPROVE")).toBeTruthy();
  });

  it("★ state.from wins too", async () => {
    markNewAccountLanding();
    authState.user = GOOGLE_USER;
    renderDoorAt({ pathname: "/login", state: { from: "/practice-hub" } });
    expect(await screen.findByText("LANDED ON PRACTICE HUB")).toBeTruthy();
  });

  it("★★ a RETURNING login with /me returns to /me", async () => {
    markNewAccountLandingIfNew({ isNew: false } as never);
    authState.user = GOOGLE_USER;
    renderDoorAt("/login?redirect=%2Fme");
    expect(await screen.findByText("LANDED ON ME")).toBeTruthy();
  });

  it("★★ a RETURNING login with state.from /me?x=1 returns to /me", async () => {
    authState.user = GOOGLE_USER;
    renderDoorAt({ pathname: "/login", state: { from: "/me?x=1" } });
    expect(await screen.findByText("LANDED ON ME")).toBeTruthy();
  });

  it("★★ a RETURNING login with no target lands on home; so does redirect=%2F", async () => {
    markNewAccountLandingIfNew({ isNew: false } as never);
    authState.user = GOOGLE_USER;
    renderDoorAt("/login");
    expect(await screen.findByText("LANDED ON HOME")).toBeTruthy();
    cleanup();
    authState.user = GOOGLE_USER;
    renderDoorAt("/login?reason=login&redirect=%2F");
    expect(await screen.findByText("LANDED ON HOME")).toBeTruthy();
  });

  it("★★ an external ?redirect= is still rejected (a new account lands on Home, a returning one too)", async () => {
    markNewAccountLanding();
    authState.user = GOOGLE_USER;
    renderDoorAt("/login?redirect=https%3A%2F%2Fevil.example%2Fme");
    expect(await screen.findByText("LANDED ON HOME")).toBeTruthy();
    cleanup();
    takeNewAccountLanding();
    authState.user = GOOGLE_USER;
    renderDoorAt("/login?redirect=%2F%2Fevil.example");
    expect(await screen.findByText("LANDED ON HOME")).toBeTruthy();
  });
});

describe("LOGIN-HOME-1 · the Me-target matcher", () => {
  it("matches /me and /profile with or without query / hash / trailing slash, and nothing else", () => {
    for (const t of ["/me", "/me?x=1", "/me#a", "/me/", "/ME", "/Me?x=1", "/profile", "/Profile", "/profile?tab=2"]) expect(isMeTarget(t), t).toBe(true);
    for (const t of ["/menu", "/mex", "/me/settings", "/profile-x", "/practice/me", "", null, undefined]) expect(isMeTarget(t), String(t)).toBe(false);
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
