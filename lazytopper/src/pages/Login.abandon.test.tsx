import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, within, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { AuthUser } from "../context/AuthContext";

/**
 * LOGIN-FIX-2 — login_abandon on the real door: an open attempt is reported when the page goes
 * away (pagehide / freeze) or /login is left inside the app, and NEVER after a success, after an
 * error, or when the student switches to the SMS app and comes back.
 */
const track = vi.hoisted(() => vi.fn());
vi.mock("../analytics/analytics", async (orig) => ({
  ...(await orig<typeof import("../analytics/analytics")>()),
  trackOnboardingEvent: track,
}));
vi.mock("../components/auth/OfferStrip", () => ({ default: () => null }));
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: vi.fn() }));

const signInWithGoogle = vi.fn(async (_options?: { flow?: "popup" | "redirect" }) => {});
const signInWithEmailPassword = vi.fn(async (_email: string, _password: string) => {});
const signUpWithEmailPassword = vi.fn(async (_email: string, _password: string, _displayName?: string) => {});
const initPhoneRecaptcha = vi.fn(async (_containerId: string) => {});
const sendPhoneOtp = vi.fn(async (_phoneE164: string, _containerId: string) => {});
const verifyPhoneOtp = vi.fn(async (_code: string, _displayName?: string) => {});
const authState: { user: AuthUser | null } = { user: null };

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: authState.user,
    signInWithGoogle,
    signInWithEmailPassword,
    signUpWithEmailPassword,
    sendPasswordReset: vi.fn(),
    initPhoneRecaptcha,
    sendPhoneOtp,
    verifyPhoneOtp,
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

const DESKTOP =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36";
const CHROME_ANDROID =
  "Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36";
const YT_ANDROID =
  "Mozilla/5.0 (Linux; Android 13; SM-S901B; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/118.0.0.0 Mobile Safari/537.36 com.google.android.youtube/19.12.35";
const GOOGLE_USER: AuthUser = { uid: "g1", email: "s@x.com", phoneNumber: null, displayName: "S", providerIds: ["google.com"], emailVerified: true };
const PHONE_USER: AuthUser = { uid: "p1", email: null, phoneNumber: "+919876543210", displayName: "R", providerIds: ["phone"], emailVerified: false };

const tree = () => (
  <MemoryRouter initialEntries={["/login"]}>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<div>LANDED ON HOME</div>} />
    </Routes>
  </MemoryRouter>
);
function mount(ua: string) {
  vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(ua);
  const view = render(tree());
  return { ...view, again: () => view.rerender(tree()) };
}
const events = (name: string) => track.mock.calls.filter((c) => c[0] === name);
const pagehide = () => act(() => void window.dispatchEvent(new Event("pagehide")));
function setVisibility(state: "hidden" | "visible") {
  Object.defineProperty(document, "visibilityState", { value: state, configurable: true });
  act(() => void document.dispatchEvent(new Event("visibilitychange")));
}

/** Phone step, returning student (no name field), number sent. */
async function sendOtp() {
  const u = userEvent.setup({ delay: null });
  await u.click(screen.getByRole("button", { name: /Continue with phone/ }));
  await u.click(within(screen.getByTestId("lt-phone-mode")).getByRole("button", { name: /Already have an account/ }));
  await u.type(screen.getByLabelText("Mobile number"), "9876543210");
  await u.click(screen.getByRole("button", { name: /Send OTP/ }));
  return u;
}

beforeEach(() => {
  authState.user = null;
});
afterEach(() => {
  cleanup();
  track.mockClear();
  vi.restoreAllMocks();
  signInWithGoogle.mockReset();
  signInWithGoogle.mockImplementation(async () => {});
  sendPhoneOtp.mockReset();
  sendPhoneOtp.mockImplementation(async () => {});
  verifyPhoneOtp.mockReset();
  verifyPhoneOtp.mockImplementation(async () => {});
  Reflect.deleteProperty(document, "visibilityState");
});

describe.each([
  ["phone (360-class UA)", CHROME_ANDROID],
  ["desktop", DESKTOP],
])("LOGIN-FIX-2 · phone OTP — %s", (_n, ua) => {
  it("the SMS-app switch and return emits nothing; closing the tab while waiting for the code emits one abandon", async () => {
    mount(ua);
    await sendOtp();
    expect(events("login_step")).toEqual([["login_step", expect.objectContaining({ method: "phone", step: "phone_otp_sent" })]]);
    setVisibility("hidden"); // to the SMS app
    setVisibility("visible"); // back
    expect(events("login_abandon")).toHaveLength(0);
    pagehide(); // the tab is closed
    pagehide();
    expect(events("login_abandon")).toEqual([
      [
        "login_abandon",
        expect.objectContaining({ method: "phone", step: "phone_otp_sent", ms_since_attempt: "lt10s", leave: "abandon", trigger: "pagehide" }),
      ],
    ]);
  });

  it("a successful phone sign-in emits no abandon (funnel: otp_sent -> otp_entered -> success)", async () => {
    const view = mount(ua);
    const u = await sendOtp();
    setVisibility("hidden");
    setVisibility("visible");
    await u.type(screen.getByLabelText(/code/i), "123456");
    await u.click(screen.getByRole("button", { name: /Verify & continue/ }));
    authState.user = PHONE_USER;
    act(() => view.again());
    pagehide();
    view.unmount();
    expect(events("login_step").map((c) => c[1].step)).toEqual(["phone_otp_sent", "phone_otp_entered"]);
    expect(events("login_success")).toHaveLength(1);
    expect(events("login_abandon")).toHaveLength(0);
  });

  it("an error ends the attempt: a wrong code then a closed tab emits no abandon", async () => {
    verifyPhoneOtp.mockImplementation(async () => {
      throw Object.assign(new Error("x"), { code: "auth/invalid-verification-code" });
    });
    mount(ua);
    const u = await sendOtp();
    await u.type(screen.getByLabelText(/code/i), "000000");
    await u.click(screen.getByRole("button", { name: /Verify & continue/ }));
    expect(events("login_error")).toHaveLength(1);
    pagehide();
    expect(events("login_abandon")).toHaveLength(0);
  });
});

describe("LOGIN-FIX-2 · Google and email", () => {
  it("desktop: closing the tab while the Google popup is open -> abandon at google_popup_open", async () => {
    signInWithGoogle.mockImplementation(() => new Promise<void>(() => {}));
    mount(DESKTOP);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /Continue with Google/ })));
    setVisibility("hidden"); // a popup or another tab in front is not leaving
    setVisibility("visible");
    expect(events("login_abandon")).toHaveLength(0);
    pagehide();
    expect(events("login_abandon")).toEqual([
      ["login_abandon", expect.objectContaining({ method: "google", step: "google_popup_open", leave: "abandon", trigger: "pagehide", ua_class: "desktop" })],
    ]);
  });

  it("a successful Google sign-in emits no abandon, even on the unload that follows", async () => {
    const view = mount(DESKTOP);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /Continue with Google/ })));
    authState.user = GOOGLE_USER;
    act(() => view.again());
    pagehide();
    view.unmount();
    expect(events("login_success")).toHaveLength(1);
    expect(events("login_abandon")).toHaveLength(0);
  });

  it("a Google error emits no abandon", async () => {
    signInWithGoogle.mockImplementation(async () => {
      throw Object.assign(new Error("x"), { code: "auth/popup-blocked" });
    });
    mount(DESKTOP);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /Continue with Google/ })));
    pagehide();
    expect(events("login_error")).toHaveLength(1);
    expect(events("login_abandon")).toHaveLength(0);
  });

  it("leaving /login inside the app with an email sign-in still open -> trigger route", async () => {
    signInWithEmailPassword.mockImplementation(() => new Promise<void>(() => {}));
    const view = mount(DESKTOP);
    const u = userEvent.setup({ delay: null });
    await u.click(screen.getByRole("button", { name: /Continue with email/ }));
    const mode = screen.queryByRole("button", { name: /Already have an account/ });
    if (mode) await u.click(mode);
    await u.type(screen.getByLabelText(/Email/i), "a@b.com");
    await u.type(screen.getByLabelText(/Password/i), "secret12");
    await u.click(screen.getByRole("button", { name: /^(Sign in|Continue)/ }));
    view.unmount();
    expect(events("login_abandon")).toEqual([
      ["login_abandon", expect.objectContaining({ method: "email", step: "email_entered", leave: "abandon", trigger: "route" })],
    ]);
  });

  it("Android in-app: the Chrome hand-off is recorded as leave=expected (not abandonment)", () => {
    mount(YT_ANDROID);
    const link = screen.getByTestId("google-open-in-chrome");
    link.addEventListener("click", (e) => e.preventDefault());
    fireEvent.click(link);
    act(() => void document.dispatchEvent(new Event("freeze")));
    expect(events("login_abandon")).toEqual([
      [
        "login_abandon",
        expect.objectContaining({ method: "chrome_handoff", step: "chrome_handoff_tapped", leave: "expected", trigger: "freeze", ua_class: "inapp_youtube" }),
      ],
    ]);
  });

  it("no attempt, no abandon: opening /login and closing it reports nothing", () => {
    const view = mount(DESKTOP);
    pagehide();
    view.unmount();
    expect(events("login_abandon")).toHaveLength(0);
  });
});
