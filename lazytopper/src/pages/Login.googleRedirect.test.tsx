import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, act, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { AuthUser } from "../context/AuthContext";

/**
 * GOOGLE-REDIRECT-1 — the Login half of Google sign-in by full-page redirect (ships dark).
 *
 *   popup (default)  today's path: signInWithGoogle() with no options, no intent written
 *   redirect-test    popup unless the tab opted in with ?gsignin=redirect (kept in sessionStorage)
 *   redirect         redirect on desktop and Chrome Android; in-app browsers keep the popup path
 *                    (phone first + "Open in Chrome")
 * The return trip restores the intent (no phone number), lands on the same target as the popup
 * path, forces the guest-pay claim, reports login_success once (flow redirect), and handles
 * Back (door, no error) and errors (login_error + phone rescue).
 */
const track = vi.hoisted(() => vi.fn());
vi.mock("../analytics/analytics", async (orig) => ({
  ...(await orig<typeof import("../analytics/analytics")>()),
  trackOnboardingEvent: track,
  trackNamedEvent: vi.fn(),
}));
vi.mock("../components/auth/OfferStrip", () => ({ default: () => null }));
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: vi.fn() }));
const guest = vi.hoisted(() => ({ claimOncePerSession: vi.fn(async () => []) }));
vi.mock("../services/guestPay", () => guest);
const sub = vi.hoisted(() => ({
  hydrated: true,
  status: { tier: "free", trialStartDate: null as string | null },
  startTrial: vi.fn(),
}));
vi.mock("../hooks/useSubscription", () => ({ useSubscription: () => sub }));
const signInWithGoogle = vi.fn(async (_options?: { flow?: "popup" | "redirect" }) => {});
const authState: { user: AuthUser | null } = { user: null };
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: authState.user,
    signInWithGoogle,
    signInWithEmailPassword: vi.fn(),
    signUpWithEmailPassword: vi.fn(),
    sendPasswordReset: vi.fn(),
    initPhoneRecaptcha: vi.fn(async () => {}),
    sendPhoneOtp: vi.fn(),
    verifyPhoneOtp: vi.fn(),
    logout: vi.fn(),
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

import Login, { REDIRECT_RESULT_WAIT_MS, REDIRECT_START_GUARD_MS } from "./Login";
import {
  REDIRECT_OPT_IN_KEY,
  SIGNIN_INTENT_KEY,
  readSigninIntent,
  resetRedirectOutcome,
  saveSigninIntent,
  setRedirectOutcome,
  type SigninIntentInput,
} from "../services/signinIntent";
import { GOOGLE_REDIRECT_NO_RESULT_MESSAGE, POPUP_CLOSED_MESSAGE } from "../utils/authSignal";

const DESKTOP =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36";
const CHROME_ANDROID =
  "Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36";
const YOUTUBE_APP = `${CHROME_ANDROID} com.google.android.youtube/19.02.34`;

type Entry = string | { pathname: string; search?: string; state?: unknown };
const tree = (entry: Entry) => (
  <MemoryRouter initialEntries={[entry as never]}>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<div>LANDED ON HOME</div>} />
      <Route path="/packs" element={<div>LANDED ON PACKS</div>} />
      <Route path="/practice-hub" element={<div>LANDED ON PRACTICE</div>} />
    </Routes>
  </MemoryRouter>
);

function mount(entry: Entry = "/login", ua = DESKTOP) {
  vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(ua);
  const view = render(tree(entry));
  return { ...view, again: () => view.rerender(tree(entry)) };
}
/** A redirect mode with the authDomain switched to this host (the rollout's precondition). */
function stubMode(mode: "redirect" | "redirect-test", authDomain: string = window.location.host) {
  vi.stubEnv("VITE_GOOGLE_SIGNIN_MODE", mode);
  vi.stubEnv("VITE_FIREBASE_AUTH_DOMAIN", authDomain);
}
const google = () => screen.getByRole("button", { name: /Continue with Google/ }) as HTMLButtonElement;
/** SIGNIN-FLASH-1 — the return trip shows "Signing you in…", never the door's form. */
const expectSigningIn = () => {
  expect(screen.getByText("Signing you in…")).toBeTruthy();
  expect(screen.queryByRole("button", { name: /Continue with Google/ })).toBeNull();
  expect(screen.queryByRole("button", { name: /phone/i })).toBeNull();
  expect(document.querySelector("form")).toBeNull();
};
const events = (name: string) => track.mock.calls.filter((c) => c[0] === name);

const GOOGLE_USER: AuthUser = { uid: "g1", email: "s@x.com", phoneNumber: null, displayName: "S", providerIds: ["google.com"], emailVerified: true };

const INTENT: SigninIntentInput = {
  target: "/packs",
  explicitTarget: "/packs",
  from: null,
  startTrial: false,
  guestPayClaim: false,
  guestPayExisting: false,
};

beforeEach(() => {
  sessionStorage.clear();
  resetRedirectOutcome();
  sub.hydrated = true;
  sub.status = { tier: "free", trialStartDate: null };
});
afterEach(() => {
  authState.user = null;
  cleanup();
  vi.unstubAllEnvs();
  vi.useRealTimers();
  vi.restoreAllMocks();
  track.mockClear();
  guest.claimOncePerSession.mockClear();
  sub.startTrial.mockClear();
  signInWithGoogle.mockReset();
  signInWithGoogle.mockImplementation(async () => {});
});

describe("choosing the flow", () => {
  it("popup mode (flag unset): today's call, no intent, flow popup on the event", async () => {
    mount("/login?gsignin=redirect");
    await act(async () => fireEvent.click(google()));
    expect(signInWithGoogle).toHaveBeenCalledTimes(1);
    expect(signInWithGoogle.mock.calls[0]).toEqual([]);
    expect(sessionStorage.getItem(SIGNIN_INTENT_KEY)).toBeNull();
    expect(events("login_attempt")).toEqual([["login_attempt", { method: "google", ua_class: "desktop", flow: "popup" }]]);
  });

  it("redirect-test without the opt-in is the popup", async () => {
    stubMode("redirect-test");
    mount("/login");
    await act(async () => fireEvent.click(google()));
    expect(signInWithGoogle.mock.calls).toEqual([[]]);
    expect(sessionStorage.getItem(SIGNIN_INTENT_KEY)).toBeNull();
  });

  it("redirect-test with ?gsignin=redirect redirects, and the opt-in is kept for the tab", async () => {
    stubMode("redirect-test");
    mount("/login?gsignin=redirect&redirect=%2Fpacks");
    expect(sessionStorage.getItem(REDIRECT_OPT_IN_KEY)).toBe("1");
    await act(async () => fireEvent.click(google()));
    expect(signInWithGoogle.mock.calls).toEqual([[{ flow: "redirect" }]]);
    expect(readSigninIntent()).toMatchObject({ target: "/packs", explicitTarget: "/packs" });
    expect(events("login_attempt")).toEqual([["login_attempt", { method: "google", ua_class: "desktop", flow: "redirect" }]]);
    // The page is leaving: the buttons stay disabled.
    expect(google().disabled).toBe(true);
  });

  it("redirect-test: the opt-in survives a later /login without the parameter (the return trip)", async () => {
    stubMode("redirect-test");
    sessionStorage.setItem(REDIRECT_OPT_IN_KEY, "1");
    mount("/login");
    await act(async () => fireEvent.click(google()));
    expect(signInWithGoogle.mock.calls).toEqual([[{ flow: "redirect" }]]);
  });

  it.each([
    ["desktop", DESKTOP],
    ["Chrome Android", CHROME_ANDROID],
  ])("redirect mode, %s: redirect", async (_n, ua) => {
    stubMode("redirect");
    mount("/login", ua);
    await act(async () => fireEvent.click(google()));
    expect(signInWithGoogle.mock.calls).toEqual([[{ flow: "redirect" }]]);
  });

  it("review of #1505: redirect mode but the authDomain is still another host -> the popup, no intent", async () => {
    stubMode("redirect", "lazzyy-topper.firebaseapp.com");
    mount("/login?gsignin=redirect");
    await act(async () => fireEvent.click(google()));
    expect(signInWithGoogle.mock.calls).toEqual([[]]);
    expect(sessionStorage.getItem(SIGNIN_INTENT_KEY)).toBeNull();
  });

  it("the buttons come back if the page is somehow still here after the redirect started (intent kept)", async () => {
    vi.useFakeTimers();
    stubMode("redirect");
    signInWithGoogle.mockImplementation(() => new Promise<void>(() => {}));
    mount("/login");
    await act(async () => {
      fireEvent.click(google());
    });
    expect(google().disabled).toBe(true);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(REDIRECT_START_GUARD_MS);
    });
    expect(google().disabled).toBe(false);
    expect(sessionStorage.getItem(SIGNIN_INTENT_KEY)).not.toBeNull();
  });

  it("bfcache Back from Google (pageshow persisted): buttons back, stale intent cleared, no error", async () => {
    stubMode("redirect");
    signInWithGoogle.mockImplementation(() => new Promise<void>(() => {}));
    mount("/login");
    await act(async () => {
      fireEvent.click(google());
    });
    expect(google().disabled).toBe(true);
    // An ordinary pageshow (not from the cache) changes nothing.
    act(() => {
      window.dispatchEvent(Object.assign(new Event("pageshow"), { persisted: false }));
    });
    expect(google().disabled).toBe(true);
    act(() => {
      window.dispatchEvent(Object.assign(new Event("pageshow"), { persisted: true }));
    });
    expect(google().disabled).toBe(false);
    expect(sessionStorage.getItem(SIGNIN_INTENT_KEY)).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(events("login_error")).toHaveLength(0);
  });

  it("redirect mode, YouTube in-app browser: no redirect — phone first, Open in Chrome, popup path", async () => {
    stubMode("redirect");
    mount("/login", YOUTUBE_APP);
    const banner = await screen.findByTestId("inapp-signin-banner");
    expect(banner.textContent).toContain("Google sign-in doesn't work inside the YouTube app. Use your phone number below, or open in Chrome.");
    expect(screen.getByRole("link", { name: "Open in Chrome" })).toBeTruthy();
    const order = Array.from(document.querySelectorAll("button.lt-google, button.lt-method")).map((b) => b.textContent);
    expect(order[0]).toMatch(/phone/);
    await act(async () => fireEvent.click(google()));
    expect(signInWithGoogle.mock.calls).toEqual([[]]);
    expect(sessionStorage.getItem(SIGNIN_INTENT_KEY)).toBeNull();
  });

  it("signInWithRedirect throwing before it navigates: the popup, once, and the intent is gone", async () => {
    stubMode("redirect");
    signInWithGoogle.mockImplementationOnce(async () => {
      throw Object.assign(new Error("no storage"), { code: "auth/web-storage-unsupported" });
    });
    mount("/login");
    await act(async () => fireEvent.click(google()));
    expect(signInWithGoogle.mock.calls).toEqual([[{ flow: "redirect" }], []]);
    expect(sessionStorage.getItem(SIGNIN_INTENT_KEY)).toBeNull();
    expect(events("login_attempt").map((c) => c[1].flow)).toEqual(["redirect", "popup"]);
  });

  it("guest-pay: the intent records only a claim FLAG and the returning-account flag, never the number", async () => {
    stubMode("redirect");
    mount({ pathname: "/login", state: { guestPayPhone: "9714568948", guestPayExisting: true, from: "/packs" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /All sign-in options/ })));
    await act(async () => fireEvent.click(google()));
    const raw = sessionStorage.getItem(SIGNIN_INTENT_KEY) ?? "";
    expect(raw).not.toContain("9714568948");
    expect(readSigninIntent()).toMatchObject({ target: "/packs", from: "/packs", guestPayClaim: true, guestPayExisting: true });
  });
});

describe("the return trip", () => {
  it("success: the popup path's target (?redirect=), login_success once with flow redirect, intent cleared", async () => {
    saveSigninIntent(INTENT);
    const view = mount("/login?redirect=%2Fpacks");
    expectSigningIn();
    act(() => setRedirectOutcome({ kind: "pending" }));
    authState.user = GOOGLE_USER;
    act(() => setRedirectOutcome({ kind: "success" }));
    view.again();
    await screen.findByText("LANDED ON PACKS");
    expect(events("login_success")).toEqual([["login_success", { method: "google", ua_class: "desktop", flow: "redirect" }]]);
    expect(sessionStorage.getItem(SIGNIN_INTENT_KEY)).toBeNull();
    expect(sub.startTrial).not.toHaveBeenCalled();
  });

  it("success restores a state.from target the redirect threw away", async () => {
    saveSigninIntent({ ...INTENT, target: "/practice-hub", explicitTarget: "/practice-hub", from: "/practice-hub" });
    authState.user = GOOGLE_USER;
    mount("/login");
    await screen.findByText("LANDED ON PRACTICE");
  });

  it("guest-pay: the claim is forced after the redirect sign-in, as on the popup path", async () => {
    saveSigninIntent({ ...INTENT, guestPayClaim: true, guestPayExisting: true });
    authState.user = { ...GOOGLE_USER, phoneNumber: "+919714568948" };
    mount("/login");
    await screen.findByText("LANDED ON PACKS");
    await waitFor(() => expect(guest.claimOncePerSession).toHaveBeenCalledWith("g1", { force: true }));
  });

  it("a reload after success reports nothing twice", async () => {
    saveSigninIntent(INTENT);
    authState.user = GOOGLE_USER;
    const first = mount("/login");
    await screen.findByText("LANDED ON PACKS");
    first.unmount();
    mount("/login");
    await screen.findByText("LANDED ON HOME");
    expect(events("login_success")).toHaveLength(1);
  });

  it("no trial for a returning student; reason=start-trial honours the explicit-tap rule only once", async () => {
    saveSigninIntent({ ...INTENT, startTrial: true });
    sub.status = { tier: "free", trialStartDate: "2026-10-01" };
    authState.user = GOOGLE_USER;
    const first = mount("/login?reason=start-trial");
    await screen.findByText("LANDED ON PACKS");
    expect(sub.startTrial).not.toHaveBeenCalled();
    first.unmount();
    // Eligible account, intent replayed: started once, and a reload (intent cleared) does not start it again.
    sub.status = { tier: "free", trialStartDate: null };
    saveSigninIntent({ ...INTENT, startTrial: true });
    const second = mount("/login");
    await screen.findByText("LANDED ON PACKS");
    expect(sub.startTrial).toHaveBeenCalledTimes(1);
    second.unmount();
    mount("/login");
    await screen.findByText("LANDED ON HOME");
    expect(sub.startTrial).toHaveBeenCalledTimes(1);
  });

  it("an error: login_error with the code (flow redirect), the message, and the phone step", async () => {
    saveSigninIntent(INTENT);
    mount("/login");
    act(() =>
      setRedirectOutcome({ kind: "error", error: Object.assign(new Error("x"), { code: "auth/popup-closed-by-user" }) }),
    );
    expect(events("login_error")).toEqual([
      ["login_error", { method: "google", ua_class: "desktop", error_code: "popup-closed-by-user", flow: "redirect" }],
    ]);
    expect(document.body.textContent).toContain(POPUP_CLOSED_MESSAGE);
    expect(screen.getByRole("heading", { name: /Continue with phone/ })).toBeTruthy();
    expect(sessionStorage.getItem(SIGNIN_INTENT_KEY)).toBeNull();
  });

  it("review of #1505: a fresh intent but NO result (Back without bfcache, or a partitioned result): login_error redirect-no-result once + phone rescue", async () => {
    saveSigninIntent(INTENT);
    const view = mount("/login");
    expectSigningIn();
    act(() => setRedirectOutcome({ kind: "none" }));
    expect(events("login_error")).toEqual([
      ["login_error", { method: "google", ua_class: "desktop", error_code: "redirect-no-result", flow: "redirect" }],
    ]);
    expect(document.body.textContent).toContain(GOOGLE_REDIRECT_NO_RESULT_MESSAGE);
    expect(screen.getByRole("heading", { name: /Continue with phone/ })).toBeTruthy();
    expect(events("login_success")).toHaveLength(0);
    expect(sessionStorage.getItem(SIGNIN_INTENT_KEY)).toBeNull();
    // Once: a reload (no intent any more) reports nothing.
    view.unmount();
    resetRedirectOutcome();
    mount("/login");
    act(() => setRedirectOutcome({ kind: "none" }));
    expect(events("login_error")).toHaveLength(1);
  });

  it("a result that never arrives gives the buttons back", async () => {
    vi.useFakeTimers();
    saveSigninIntent(INTENT);
    mount("/login");
    expectSigningIn();
    // Still the calm state just before the existing bound…
    await act(async () => {
      await vi.advanceTimersByTimeAsync(REDIRECT_RESULT_WAIT_MS - 1);
    });
    expectSigningIn();
    // …and the door, buttons enabled, once it passes.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(screen.queryByText("Signing you in…")).toBeNull();
    expect(google().disabled).toBe(false);
  });

  it("an intent within 30 minutes is still honoured; past 30 it is an ordinary door — and Login's read never deletes it", () => {
    saveSigninIntent(INTENT, Date.now() - 25 * 60 * 1000);
    const first = mount("/login");
    expectSigningIn();
    first.unmount();
    saveSigninIntent(INTENT, Date.now() - 31 * 60 * 1000);
    mount("/login");
    expect(screen.queryByText("Signing you in…")).toBeNull();
    expect(google().disabled).toBe(false);
    // Left for AuthContext, which decides on the raw record (review of #1505).
    expect(sessionStorage.getItem(SIGNIN_INTENT_KEY)).not.toBeNull();
  });
});

describe("SIGNIN-FLASH-1 — no login-form flash on the return from Google", () => {
  it("no intent: the ordinary door renders immediately, never the signing-in state", () => {
    mount("/login");
    expect(screen.queryByText("Signing you in…")).toBeNull();
    expect(google().disabled).toBe(false);
  });

  it("a return from Google renders the signing-in state (status role, no form, no offer) until navigation", async () => {
    saveSigninIntent(INTENT);
    const view = mount("/login");
    expectSigningIn();
    expect(screen.getByRole("status").textContent).toContain("Signing you in…");
    expect(document.body.textContent).not.toMatch(/trial/i);
    act(() => setRedirectOutcome({ kind: "pending" }));
    expectSigningIn();
    authState.user = GOOGLE_USER;
    act(() => setRedirectOutcome({ kind: "success" }));
    view.again();
    await screen.findByText("LANDED ON PACKS");
    expect(screen.queryByText("Signing you in…")).toBeNull();
  });

  it("a returning user already resolved goes straight on: the door's form is never rendered", async () => {
    saveSigninIntent(INTENT);
    authState.user = GOOGLE_USER;
    mount("/login");
    expect(screen.queryByRole("button", { name: /Continue with Google/ })).toBeNull();
    await screen.findByText("LANDED ON PACKS");
  });

  it("redirect-no-result falls back to the existing behaviour: the door on the phone step with the message", () => {
    saveSigninIntent(INTENT);
    mount("/login");
    expectSigningIn();
    act(() => setRedirectOutcome({ kind: "none" }));
    expect(screen.queryByText("Signing you in…")).toBeNull();
    expect(document.body.textContent).toContain(GOOGLE_REDIRECT_NO_RESULT_MESSAGE);
    expect(screen.getByRole("heading", { name: /Continue with phone/ })).toBeTruthy();
  });

  it("a redirect error gives the door back with the error, as before", () => {
    saveSigninIntent(INTENT);
    mount("/login");
    act(() =>
      setRedirectOutcome({ kind: "error", error: Object.assign(new Error("x"), { code: "auth/popup-closed-by-user" }) }),
    );
    expect(screen.queryByText("Signing you in…")).toBeNull();
    expect(document.body.textContent).toContain(POPUP_CLOSED_MESSAGE);
  });
});
