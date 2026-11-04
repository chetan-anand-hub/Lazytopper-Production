import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { AuthUser } from "../context/AuthContext";

/**
 * EMAIL-CODE-1 — /login "Sign in with email code" (behind VITE_EMAIL_CODE_SIGNIN_ENABLED): type the email, get a 6-digit
 * code, type it, signed in -> Login's existing safe redirect. Flag off: the door exactly as before (no such button).
 * (Harness copied from PAY-ACCOUNT-1's Login.emailLinkFinish.test.tsx:) the passwordless email link ("Your LazyTopper account is ready" → Open LazyTopper, and the thank-you
 * screen's "Send me the sign-in link") returns to `/login?finish=link&redirect=…` with Firebase's one-time code. Signed
 * out: "Confirm the email you opened the link from" → signInWithEmailLink → the safe redirect (My packs / Home). No email
 * is read from the URL or storage. Flag off, a non-link visit, or a signed-in visitor: the door exactly as today.
 */
const guest = vi.hoisted(() => ({ claimOncePerSession: vi.fn(async () => []) }));
vi.mock("../services/guestPay", () => guest);

const signInWithEmailPassword = vi.fn(async (_email: string, _password: string) => {});
const signUpWithEmailPassword =
  vi.fn(async (_email: string, _password: string, _displayName?: string) => {});
const signInWithGoogle = vi.fn(async () => {});
const sendPasswordReset = vi.fn(async (_email: string) => {});
const initPhoneRecaptcha = vi.fn(async (_containerId: string) => {});
const sendPhoneOtp = vi.fn(async (_phoneE164: string, _containerId: string) => {});
// ★ Typed to the REAL signature. A `vi.fn()` accepts arguments its type omits,
// but `mock.calls[0][1]` against a one-arg type is a TS2493 empty-tuple error
// under `tsconfig.test.json` — green in the app config, RED in CI.
const verifyPhoneOtp = vi.fn(async (_code: string, _displayName?: string) => {});
const logout = vi.fn(async () => {});

const authState: { user: AuthUser | null } = { user: null };

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: authState.user,
    signInWithGoogle,
    signInWithEmailPassword,
    signUpWithEmailPassword,
    sendPasswordReset,
    initPhoneRecaptcha,
    sendPhoneOtp,
    verifyPhoneOtp,
    logout,
  }),
}));
vi.mock("../services/referralService", () => ({ creditPendingReferral: vi.fn() }));
// The door's offer strip reads the clock (founding label); this suite is about the link step, not the offer, so it is
// stubbed and the suite stays clock-free (not a date-sensitive test).
vi.mock("../components/auth/OfferStrip", () => ({ default: () => null }));
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: vi.fn() }));
vi.mock("firebase/auth", () => ({
  sendEmailVerification: vi.fn(async () => {}),
  reload: vi.fn(async () => {}),
  verifyBeforeUpdateEmail: vi.fn(async () => {}),
  reauthenticateWithCredential: vi.fn(async () => {}),
  EmailAuthProvider: { credential: vi.fn(() => ({})) },
}));

const codes = vi.hoisted(() => ({
  sendEmailCode: vi.fn(async (_e: string) => undefined),
  signInWithEmailCode: vi.fn(async (_e: string, _c: string) => undefined),
  describeEmailCodeError: vi.fn(() => "That code didn't match — 4 tries left."),
}));
vi.mock("../services/emailCode", () => codes);

import Login from "./Login";

function door(entry: string) {
  return (
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<div>LANDED ON HOME</div>} />
        <Route path="/packs" element={<div>LANDED ON PACKS</div>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  authState.user = null;
  vi.clearAllMocks();
  vi.stubEnv("VITE_EMAIL_CODE_SIGNIN_ENABLED", "1");
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("EMAIL-CODE-1 · /login 'Sign in with email code'", () => {
  it("the door offers it beside the other methods; email -> code -> signed in -> the safe redirect", async () => {
    const view = render(door("/login?redirect=%2Fpacks"));
    expect(screen.getByRole("button", { name: /Continue with phone/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Continue with email/ })).toBeTruthy();
    fireEvent.click(await screen.findByTestId("lt-email-code-door"));
    expect(await screen.findByRole("dialog", { name: "Sign in with email code" })).toBeTruthy();
    fireEvent.change(await screen.findByTestId("email-code-email"), { target: { value: "asha@gmail.com" } });
    fireEvent.click(screen.getByTestId("email-code-send"));
    await screen.findByTestId("email-code-sent");
    expect(codes.sendEmailCode).toHaveBeenCalledWith("asha@gmail.com");
    fireEvent.change(screen.getByTestId("email-code-input"), { target: { value: "123456" } });
    await waitFor(() => expect(codes.signInWithEmailCode).toHaveBeenCalledWith("asha@gmail.com", "123456"));
    authState.user = { uid: "uidAsha", email: "asha@gmail.com", emailVerified: true, phoneNumber: null, displayName: "Asha" } as unknown as AuthUser;
    view.rerender(door("/login?redirect=%2Fpacks"));
    await waitFor(() => expect(screen.getByText("LANDED ON PACKS")).toBeTruthy());
  });

  it("'Sign in another way' gives the door back", async () => {
    render(door("/login"));
    fireEvent.click(await screen.findByTestId("lt-email-code-door"));
    fireEvent.click(await screen.findByTestId("email-code-other"));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: /Continue with phone/ })).toBeTruthy();
  });

  it("flag off: no email-code button, the door exactly as before", async () => {
    vi.stubEnv("VITE_EMAIL_CODE_SIGNIN_ENABLED", "");
    render(door("/login"));
    // Let the lazy door resolve: it renders nothing while off.
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByTestId("lt-email-code-door")).toBeNull();
    expect(screen.queryByText(/email code/i)).toBeNull();
  });
});
