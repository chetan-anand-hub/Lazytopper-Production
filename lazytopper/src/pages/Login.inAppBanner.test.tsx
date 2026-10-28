import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

/**
 * INAPP-SIGNIN-1 — Login inside an app's embedded browser: a calm note above the Google
 * button, phone and email first, an "Open in Chrome" intent on Android, an event with
 * `app` only. Outside an app the page is exactly as before.
 */
const track = vi.hoisted(() => vi.fn());
vi.mock("../analytics/analytics", async (orig) => ({
  ...(await orig<typeof import("../analytics/analytics")>()),
  trackOnboardingEvent: track,
}));
// OfferStrip reads the clock (founding offer window); irrelevant here.
vi.mock("../components/auth/OfferStrip", () => ({ default: () => null }));
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: vi.fn() }));
const signInWithEmailPassword = vi.fn(async (_email: string, _password: string) => {});
const signUpWithEmailPassword =
  vi.fn(async (_email: string, _password: string, _displayName?: string) => {});
const signInWithGoogle = vi.fn(async () => {});
const sendPasswordReset = vi.fn(async (_email: string) => {});
const initPhoneRecaptcha = vi.fn(async (_containerId: string) => {});
const sendPhoneOtp = vi.fn(async (_phoneE164: string, _containerId: string) => {});
// NAME-2 — typed to the real `(code, displayName?)` signature; the one-arg type
// makes `mock.calls[0][1]` a TS2493 error under `tsconfig.test.json`.
const verifyPhoneOtp = vi.fn(async (_code: string, _displayName?: string) => {});
const logout = vi.fn(async () => {});

/** Mutable so a test can mount the door already signed in. */
const authState = { user: null };

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
// The gate's own behaviour is covered by VerifyEmailGate.test.tsx. Here we only
// need to know WHETHER the door routed to it, so the real Firebase calls it
// makes on mount are stubbed out.
vi.mock("firebase/auth", () => ({
  sendEmailVerification: vi.fn(async () => {}),
  reload: vi.fn(async () => {}),
  verifyBeforeUpdateEmail: vi.fn(async () => {}),
  reauthenticateWithCredential: vi.fn(async () => {}),
  EmailAuthProvider: { credential: vi.fn(() => ({})) },
}));


import Login from "./Login";

const IG_ANDROID =
  "Mozilla/5.0 (Linux; Android 13; SM-S911B Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/118.0.0.0 Mobile Safari/537.36 Instagram 309.1.0.41.113 Android (33/13; 480dpi; 1080x2340; samsung; SM-S911B; dm1q; qcom; en_IN; 541635897)";
const IG_IOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21A329 Instagram 309.0.0.28.114 (iPhone14,5; iOS 17_0; en_IN; en; scale=3.00; 1170x2532; 541635897)";
const CHROME =
  "Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36";

function mount(ua: string) {
  vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(ua);
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <Login />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  track.mockClear();
  vi.restoreAllMocks();
});

describe("Login in an in-app browser", () => {
  it("Android Instagram: banner, Open in Chrome, phone first, event with app only", async () => {
    mount(IG_ANDROID);
    await screen.findByTestId("inapp-signin-banner");
    expect(screen.getByTestId("inapp-signin-banner").textContent).toContain("doesn't work inside Instagram");
    const chrome = screen.getByRole("link", { name: "Open in Chrome" });
    expect(chrome.getAttribute("href")).toMatch(/^intent:\/\/.+#Intent;scheme=http/);
    expect(screen.getByRole("button", { name: /Continue with Google/ })).toBeTruthy();
    expect(screen.getByTestId("inapp-signin-banner").parentElement?.className).toContain("lt-doors--inapp");
    await waitFor(() => expect(track).toHaveBeenCalledWith("inapp_signin_banner_shown", { app: "instagram" }));
    // the reorder class is toggled in Login itself, before the lazy chunk loads
    expect(document.querySelector(".lt-doors--inapp")).not.toBeNull();
  });

  it("iOS Instagram: Safari instruction, no Chrome button", async () => {
    mount(IG_IOS);
    await screen.findByTestId("inapp-signin-banner");
    expect(screen.getByTestId("inapp-signin-banner").textContent).toContain("Open in Safari");
    expect(screen.queryByRole("link", { name: "Open in Chrome" })).toBeNull();
  });

  it("a normal browser sees no banner and sends no event", () => {
    mount(CHROME);
    expect(screen.queryByTestId("inapp-signin-banner")).toBeNull();
    expect(track).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /Continue with Google/ })).toBeTruthy();
  });
});
