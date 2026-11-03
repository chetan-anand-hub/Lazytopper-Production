import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { AuthUser } from "../context/AuthContext";

/**
 * PAY-PHONE-1 — after paying with a phone number, "Sign in with this number" opens the EXISTING phone sign-in with the
 * number already typed. The number arrives in router state only (never the URL). The receipt email's link opens the
 * phone step with `?method=phone` (no number in it). After that sign-in the purchase is claimed.
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
vi.mock("firebase/auth", () => ({
  sendEmailVerification: vi.fn(async () => {}),
  reload: vi.fn(async () => {}),
  verifyBeforeUpdateEmail: vi.fn(async () => {}),
  reauthenticateWithCredential: vi.fn(async () => {}),
  EmailAuthProvider: { credential: vi.fn(() => ({})) },
}));

import Login, { guestPayDigitsFrom } from "./Login";

function renderDoor(entry: string | { pathname: string; search?: string; state?: unknown }) {
  return render(
    <MemoryRouter initialEntries={[entry as never]}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<div>LANDED ON HOME</div>} />
        <Route path="/packs" element={<div>LANDED ON PACKS</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  authState.user = null;
  guest.claimOncePerSession.mockClear();
});
afterEach(() => cleanup());

describe("PAY-PHONE-1 · the sign-in after paying", () => {
  it("guestPayDigitsFrom accepts only a valid 10-digit Indian mobile from router state", () => {
    expect(guestPayDigitsFrom({ guestPayPhone: "9876543948" })).toBe("9876543948");
    expect(guestPayDigitsFrom({ guestPayPhone: "+919876543948" })).toBe("");
    expect(guestPayDigitsFrom({ guestPayPhone: "5876543948" })).toBe("");
    expect(guestPayDigitsFrom(null)).toBe("");
    expect(guestPayDigitsFrom("9876543948")).toBe("");
  });

  it("opens straight on the phone step with the number typed in", () => {
    renderDoor({ pathname: "/login", search: "?redirect=%2Fpacks%23my-packs", state: { guestPayPhone: "9876543948" } });
    expect((screen.getByLabelText("Mobile number") as HTMLInputElement).value).toBe("9876543948");
  });

  it("GUEST-SIGNIN-RETURNING-1: 'this number has an account' opens 'Already have an account', number prefilled, no name field", () => {
    renderDoor({ pathname: "/login", state: { guestPayPhone: "9876543948", guestPayExisting: true } });
    expect((screen.getByLabelText("Mobile number") as HTMLInputElement).value).toBe("9876543948");
    expect(screen.getByRole("button", { name: "Already have an account" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "I'm new here" }).getAttribute("aria-pressed")).toBe("false");
    expect(screen.queryByLabelText(/Your name/)).toBeNull();
    expect(screen.queryByText("We'll create your account")).toBeNull();
  });

  it("GUEST-SIGNIN-RETURNING-1: 'Bought before?' (no number) also opens 'Already have an account'", () => {
    renderDoor({ pathname: "/login", state: { phoneFirst: true, guestPayExisting: true } });
    expect((screen.getByLabelText("Mobile number") as HTMLInputElement).value).toBe("");
    expect(screen.getByRole("button", { name: "Already have an account" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("GUEST-SIGNIN-RETURNING-1: the post-payment sign-in (no flag) keeps today's 'I'm new here' default with the name field", () => {
    renderDoor({ pathname: "/login", state: { guestPayPhone: "9876543948" } });
    expect(screen.getByRole("button", { name: "I'm new here" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Already have an account" }).getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByLabelText(/Your name/)).toBeTruthy();
  });

  it("the receipt email link ?method=phone opens the phone step with NO number", () => {
    renderDoor("/login?method=phone");
    expect((screen.getByLabelText("Mobile number") as HTMLInputElement).value).toBe("");
  });

  it("a plain /login still opens on the method choice", () => {
    renderDoor("/login");
    expect(screen.queryByLabelText("Mobile number")).toBeNull();
    expect(screen.getByRole("button", { name: /Continue with phone/ })).toBeTruthy();
  });

  it("once the phone account is signed in, the purchase is claimed and the student lands on My packs", async () => {
    authState.user = { uid: "u-phone", phoneNumber: "+919876543948", email: null, displayName: "Asha" } as unknown as AuthUser;
    renderDoor({ pathname: "/login", search: "?redirect=%2Fpacks%23my-packs", state: { guestPayPhone: "9876543948" } });
    await waitFor(() => expect(screen.getByText("LANDED ON PACKS")).toBeTruthy());
    expect(guest.claimOncePerSession).toHaveBeenCalledWith("u-phone", { force: true });
  });
});
