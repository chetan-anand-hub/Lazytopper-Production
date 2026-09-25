/**
 * FREE-CHECK-1b — the auth door, as the free check uses it.
 *
 *   N17  a `?redirect=` ROUND-TRIP: the exact sign-in link every free-check prompt uses
 *        (FREE_CHECK_SIGNIN_PATH, OR-8) lands a signed-in student back on
 *        /check-improve, where the waiting result is saved (R8). Only `state.from` was
 *        tested before (Login.oneDoor / SignUpPage.redirect).
 *   OR-9 the door no longer claims it starts a trial: "We'll create your account."
 *        The trial is offered afterwards, by R9, and only on a tap.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
vi.mock("firebase/auth", () => ({
  sendEmailVerification: vi.fn(async () => {}),
  reload: vi.fn(async () => {}),
  verifyBeforeUpdateEmail: vi.fn(async () => {}),
  reauthenticateWithCredential: vi.fn(async () => {}),
  EmailAuthProvider: { credential: vi.fn(() => ({})) },
}));

import Login from "./Login";
import { FREE_CHECK_SIGNIN_PATH } from "../services/freeCheckClient";

const VERIFIED: AuthUser = {
  uid: "uid-1",
  email: "ananya@example.com",
  phoneNumber: null,
  displayName: null,
  providerIds: ["password"],
  emailVerified: true,
} as AuthUser;

function renderDoorAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/check-improve" element={<div>LANDED ON CHECK AND IMPROVE</div>} />
        <Route path="/" element={<div>LANDED ON HOME</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  authState.user = null;
  localStorage.clear();
});
afterEach(cleanup);

describe("N17 — the free check's ?redirect= round-trip", () => {
  it("the free-check sign-in link lands a signed-in student back on Check & Improve", async () => {
    authState.user = VERIFIED;
    renderDoorAt(FREE_CHECK_SIGNIN_PATH);
    expect(await screen.findByText("LANDED ON CHECK AND IMPROVE")).toBeTruthy();
  });

  it("CONTROL — an off-site ?redirect= is refused and lands on home", async () => {
    authState.user = VERIFIED;
    renderDoorAt("/login?redirect=https%3A%2F%2Fevil.example.com%2Fsteal");
    expect(await screen.findByText("LANDED ON HOME")).toBeTruthy();
    expect(screen.queryByText("LANDED ON CHECK AND IMPROVE")).toBeNull();
  });

  it("CONTROL — a letter-led `x:` token in the redirect is refused (why our value carries none)", async () => {
    authState.user = VERIFIED;
    renderDoorAt("/login?redirect=%2Fcheck-improve%3Ft%3Da%3Ab");
    expect(await screen.findByText("LANDED ON HOME")).toBeTruthy();
  });
});

describe("OR-9 — the door does not promise a trial it does not start", () => {
  it("the email create step says only \"We'll create your account.\"", async () => {
    renderDoorAt("/login");
    const u = userEvent.setup({ delay: null });
    await u.click(screen.getByRole("button", { name: /Continue with email/ }));
    expect(screen.getByText("We'll create your account.")).toBeTruthy();
    expect(document.body.textContent ?? "").not.toMatch(/start your 7-day trial/i);
  });
});
