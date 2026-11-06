import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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
const YT_ANDROID =
  "Mozilla/5.0 (Linux; Android 13; SM-S901B; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/118.0.0.0 Mobile Safari/537.36 com.google.android.youtube/19.12.35";
const IOS_WEBVIEW =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148";
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
  it("Android Instagram: banner, ONE Chrome action (the Google door), phone first, event with app only", async () => {
    mount(IG_ANDROID);
    await screen.findByTestId("inapp-signin-banner");
    expect(screen.getByTestId("inapp-signin-banner").textContent).toContain("doesn't work inside the Instagram app");
    // LOGIN-FIX-1 — the Google door IS the Chrome hand-off; the banner no longer has its own button.
    const chrome = screen.getByRole("link", { name: /Open in Chrome to continue with Google/ });
    expect(chrome.getAttribute("href")).toMatch(/^intent:\/\/.+#Intent;scheme=http/);
    expect(screen.getAllByRole("link", { name: /Open in Chrome/ })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /Continue with Google/ })).toBeNull();
    await waitFor(() => expect(track).toHaveBeenCalledWith("inapp_signin_banner_shown", { app: "instagram" }));
    expect(document.querySelector(".lt-doors .lt-inapp-banner")).not.toBeNull();
  });

  it("iOS Instagram: Safari instruction, no Chrome button", async () => {
    mount(IG_IOS);
    await screen.findByTestId("inapp-signin-banner");
    expect(screen.getByTestId("inapp-signin-banner").textContent).toContain("Open in Safari");
    expect(screen.queryByRole("link", { name: /Open in Chrome/ })).toBeNull();
    expect(screen.getByRole("button", { name: /Continue with Google/ })).toBeTruthy();
  });

  it("AUTH-SIGNAL-1 · YouTube app (Android): banner names YouTube, Open in Chrome, event app=youtube", async () => {
    mount(YT_ANDROID);
    await screen.findByTestId("inapp-signin-banner");
    expect(screen.getByTestId("inapp-signin-banner").textContent).toContain("doesn't work inside the YouTube app");
    expect(screen.getByRole("link", { name: /Open in Chrome to continue with Google/ })).toBeTruthy();
    await waitFor(() => expect(track).toHaveBeenCalledWith("inapp_signin_banner_shown", { app: "youtube" }));
  });

  it("AUTH-SIGNAL-1 · a bare iOS web view gets the Safari instruction", async () => {
    mount(IOS_WEBVIEW);
    await screen.findByTestId("inapp-signin-banner");
    expect(screen.getByTestId("inapp-signin-banner").textContent).toContain("Open in Safari");
    expect(screen.queryByRole("link", { name: /Open in Chrome/ })).toBeNull();
    expect(screen.getByRole("button", { name: /Continue with Google/ })).toBeTruthy();
  });

  it("AUTH-SIGNAL-1 · a home-screen web app (navigator.standalone) gets no banner", () => {
    Object.defineProperty(window.navigator, "standalone", { value: true, configurable: true });
    try {
      mount(IOS_WEBVIEW);
    } finally {
      Reflect.deleteProperty(window.navigator, "standalone");
    }
    expect(screen.queryByTestId("inapp-signin-banner")).toBeNull();
    expect(track).not.toHaveBeenCalled();
  });

  it("a normal browser sees no banner and sends no event", () => {
    mount(CHROME);
    expect(screen.queryByTestId("inapp-signin-banner")).toBeNull();
    expect(track).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /Continue with Google/ })).toBeTruthy();
  });
});

describe("LOGIN-FIX-1 · the Android in-app Google door", () => {
  function mountAt(ua: string, entry: string | { pathname: string; search?: string; state?: unknown }) {
    vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(ua);
    return render(
      <MemoryRouter initialEntries={[entry as never]}>
        <Login />
      </MemoryRouter>,
    );
  }
  const decodeTarget = () => {
    const href = screen.getByTestId("google-open-in-chrome").getAttribute("href") ?? "";
    return /^intent:\/\/([^#]+)#/.exec(href)?.[1] ?? "";
  };

  it("never calls Google sign-in from inside the webview (it can only fail there)", () => {
    mount(YT_ANDROID);
    const link = screen.getByTestId("google-open-in-chrome");
    expect(link.tagName).toBe("A");
    expect(link.textContent).toContain("Open in Chrome to continue with Google");
    expect(signInWithGoogle).not.toHaveBeenCalled();
  });

  // The hand-off reads the real address bar (window.location), as BrowserRouter keeps it in step.
  function atAddress(pathAndQuery: string) {
    const before = window.location.pathname + window.location.search;
    window.history.replaceState({}, "", pathAndQuery);
    return () => window.history.replaceState({}, "", before);
  }

  it("carries the page's own safe destination to Chrome (router state does not survive the hop)", () => {
    const restore = atAddress("/login");
    try {
      mountAt(YT_ANDROID, { pathname: "/login", state: { from: "/check-improve" } });
      expect(decodeTarget()).toBe(`${window.location.host}/login?redirect=%2Fcheck-improve`);
    } finally {
      restore();
    }
  });

  it("an external ?redirect= is dropped, never handed to Chrome", () => {
    const restore = atAddress("/login?redirect=https%3A%2F%2Fevil.example&reason=start-trial");
    try {
      mountAt(YT_ANDROID, "/login?redirect=https%3A%2F%2Fevil.example&reason=start-trial");
      expect(decodeTarget()).toBe(`${window.location.host}/login?reason=start-trial`);
    } finally {
      restore();
    }
  });

  it("desktop and normal Android Chrome keep the Google button exactly as before", () => {
    mount(CHROME);
    expect(screen.queryByTestId("google-open-in-chrome")).toBeNull();
    expect(screen.getByRole("button", { name: /Continue with Google/ })).toBeTruthy();
  });
});

it("the in-app reorder rule is keyed on the banner (:has)", () => {
  const css = readFileSync(resolve(process.cwd(), "src/components/auth/inAppSigninBanner.css"), "utf8");
  expect(css).toContain(".lt-doors:has(.lt-inapp-banner) .lt-method");
  expect(css).toContain(".lt-doors:has(.lt-inapp-banner) .lt-google");
});
