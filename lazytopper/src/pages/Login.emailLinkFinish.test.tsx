import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { AuthUser } from "../context/AuthContext";

/**
 * PAY-ACCOUNT-1 — the passwordless email link ("Your LazyTopper account is ready" → Open LazyTopper, and the thank-you
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

const links = vi.hoisted(() => ({ completeSignInWithEmailLink: vi.fn(async (_email: string) => {}) }));
vi.mock("../services/linkSignInEmail", () => links);

import Login, { isEmailLinkFinish } from "./Login";

function renderDoor(entry: string | { pathname: string; search?: string; state?: unknown }) {
  return render(
    <MemoryRouter initialEntries={[entry as never]}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<div>LANDED ON HOME</div>} />
        <Route path="/packs" element={<div>LANDED ON PACKS</div>} />
        <Route path="/evil" element={<div>LANDED ON EVIL</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

const LINK = "?finish=link&redirect=%2Fpacks%23my-packs&apiKey=k&oobCode=CODE&mode=signIn&lang=en";

beforeEach(() => {
  authState.user = null;
  links.completeSignInWithEmailLink.mockClear();
  vi.stubEnv("VITE_CHECKOUT_WHO_ENABLED", "1");
  vi.stubEnv("VITE_PAY_AUTO_ACCOUNT_ENABLED", "1");
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("PAY-ACCOUNT-1 · finishing an email sign-in link on /login", () => {
  it("only markers count: finish=link + mode=signIn + a one-time code, flag on", () => {
    expect(isEmailLinkFinish(new URLSearchParams(LINK))).toBe(true);
    expect(isEmailLinkFinish(new URLSearchParams("?finish=link&redirect=%2F"))).toBe(false);
    expect(isEmailLinkFinish(new URLSearchParams("?oobCode=X&mode=signIn"))).toBe(false);
    vi.stubEnv("VITE_PAY_AUTO_ACCOUNT_ENABLED", "");
    expect(isEmailLinkFinish(new URLSearchParams(LINK))).toBe(false);
  });

  it("signed out: confirm the email (another device, nothing stored) -> signInWithEmailLink -> lands on My packs", async () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem");
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const view = renderDoor(`/login${LINK}`);
    expect(await screen.findByText("Confirm the email you opened the link from")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Continue with phone/ })).toBeNull();
    fireEvent.change(screen.getByTestId("email-link-finish-input"), { target: { value: "anaya.k@gmail.com" } });
    fireEvent.click(screen.getByTestId("email-link-finish-submit"));
    await waitFor(() => expect(links.completeSignInWithEmailLink).toHaveBeenCalledWith("anaya.k@gmail.com"));
    // Firebase signs the student in; the existing signed-in exit takes the safe redirect.
    authState.user = { uid: "pay-0123456789abcdef01234567", email: "anaya.k@gmail.com", emailVerified: true, phoneNumber: null, displayName: null } as unknown as AuthUser;
    view.rerender(
      <MemoryRouter initialEntries={[`/login${LINK}`]}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/packs" element={<div>LANDED ON PACKS</div>} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText("LANDED ON PACKS")).toBeTruthy());
    expect(JSON.stringify(setItem.mock.calls)).not.toContain("anaya");
    expect(JSON.stringify(getItem.mock.calls)).not.toMatch(/emailForSignIn/);
    getItem.mockRestore();
    setItem.mockRestore();
  });

  it("a wrong / expired link says so and 'Sign in another way' gives the normal door back", async () => {
    links.completeSignInWithEmailLink.mockRejectedValueOnce(Object.assign(new Error("x"), { code: "auth/expired-action-code" }));
    renderDoor(`/login${LINK}`);
    fireEvent.change(await screen.findByTestId("email-link-finish-input"), { target: { value: "anaya.k@gmail.com" } });
    fireEvent.click(screen.getByTestId("email-link-finish-submit"));
    expect((await screen.findByTestId("email-link-finish-error")).textContent).toBe("That link has expired or was already used. Sign in another way below.");
    fireEvent.click(screen.getByTestId("email-link-finish-other"));
    expect(screen.getByRole("button", { name: /Continue with phone/ })).toBeTruthy();
  });

  it("an unsafe redirect never wins: signed in from a link whose redirect is external -> Home", async () => {
    authState.user = { uid: "u1", email: "a@b.in", emailVerified: true, phoneNumber: null, displayName: "A" } as unknown as AuthUser;
    renderDoor("/login?finish=link&redirect=https%3A%2F%2Fevil.example&oobCode=C&mode=signIn");
    await waitFor(() => expect(screen.getByText("LANDED ON HOME")).toBeTruthy());
    expect(links.completeSignInWithEmailLink).not.toHaveBeenCalled();
  });

  it("flag off: the same URL is the normal door (no finish step)", () => {
    vi.stubEnv("VITE_PAY_AUTO_ACCOUNT_ENABLED", "");
    renderDoor(`/login${LINK}`);
    expect(screen.queryByTestId("email-link-finish")).toBeNull();
    expect(screen.getByRole("button", { name: /Continue with phone/ })).toBeTruthy();
  });

  it("already signed in: no finish step, straight to the target (the signed-in add-email flow lives on Home, untouched)", async () => {
    authState.user = { uid: "u2", email: null, phoneNumber: "+919876543948", displayName: "A" } as unknown as AuthUser;
    renderDoor(`/login${LINK}`);
    await waitFor(() => expect(screen.getByText("LANDED ON PACKS")).toBeTruthy());
    expect(links.completeSignInWithEmailLink).not.toHaveBeenCalled();
  });
});
