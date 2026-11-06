import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

/**
 * AUTH-SIGNAL-1 — a Google popup that never reports back must not leave the buttons disabled
 * for ever: after ~45 s they come back with a message that offers phone / email. Also the
 * kind, specific messages for popup-closed / popup-blocked / unsupported-environment, and the
 * login_* events (method + ua_class + error_code only).
 */
const track = vi.hoisted(() => vi.fn());
vi.mock("../analytics/analytics", async (orig) => ({
  ...(await orig<typeof import("../analytics/analytics")>()),
  trackOnboardingEvent: track,
}));
vi.mock("../components/auth/OfferStrip", () => ({ default: () => null }));
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: vi.fn() }));
const signInWithGoogle = vi.fn(async () => {});
const landed = vi.hoisted(() => vi.fn());
function LandedProbe() {
  landed();
  return <div>LANDED</div>;
}
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

import Login from "./Login";
import type { AuthUser } from "../context/AuthContext";
import {
  GOOGLE_POPUP_TIMEOUT_MS,
  GOOGLE_TIMEOUT_MESSAGE,
  POPUP_BLOCKED_MESSAGE,
  POPUP_CLOSED_MESSAGE,
  UNSUPPORTED_ENVIRONMENT_MESSAGE,
} from "../utils/authSignal";

const CHROME =
  "Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36";

// LOGIN-FIX-1 — the YouTube app on iOS: an in-app browser that still uses the Google popup. (On
// Android the in-app Google door is now "Open in Chrome to continue with Google", no popup at all;
// see Login.inAppBanner.test.tsx.)
const YOUTUBE_APP =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 com.google.ios.youtube/19.02.3";
const DESKTOP =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36";

// A function, not a constant element: re-rendering the SAME element object is a React no-op.
const tree = () => (
  <MemoryRouter initialEntries={["/login"]}>
    <Login />
  </MemoryRouter>
);

function mount(ua: string = CHROME) {
  vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(ua);
  const view = render(tree());
  mount.rerender = () => view.rerender(tree());
  return screen.getByRole("button", { name: /Continue with Google/ }) as HTMLButtonElement;
}
mount.rerender = () => {};

afterEach(() => {
  authState.user = null;
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  track.mockClear();
  signInWithGoogle.mockReset();
  signInWithGoogle.mockImplementation(async () => {});
});

describe("Google popup that never reports back", () => {
  it("re-enables the buttons after 45 s with a message offering phone / email", async () => {
    vi.useFakeTimers();
    signInWithGoogle.mockImplementation(() => new Promise<void>(() => {}));
    const google = mount(YOUTUBE_APP);
    fireEvent.click(google);
    expect(google.disabled).toBe(true);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(GOOGLE_POPUP_TIMEOUT_MS - 1000);
    });
    expect(google.disabled).toBe(true);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    // The phone step has taken over the door (SIGNIN-RESCUE-1); the way back has live buttons.
    expect(document.body.textContent).toContain(GOOGLE_TIMEOUT_MESSAGE);
    expect(screen.getByRole("heading", { name: /Continue with phone/ })).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /All sign-in options/ }));
    });
    expect((screen.getByRole("button", { name: /Continue with Google/ }) as HTMLButtonElement).disabled).toBe(false);
    expect(track).toHaveBeenCalledWith("login_attempt", { method: "google", ua_class: "inapp_youtube", flow: "popup" });
    expect(track).toHaveBeenCalledWith("login_error", {
      method: "google",
      ua_class: "inapp_youtube",
      error_code: "popup-timeout",
      flow: "popup", // GOOGLE-REDIRECT-1
    });
  });
  it.each([["desktop", DESKTOP], ["normal mobile Chrome", CHROME]])(
    "SIGNIN-RESCUE-1: %s arms NO timeout (no error even long past 45 s)",
    async (_n, ua) => {
      vi.useFakeTimers();
      signInWithGoogle.mockImplementation(() => new Promise<void>(() => {}));
      const google = mount(ua);
      fireEvent.click(google);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(GOOGLE_POPUP_TIMEOUT_MS * 4);
      });
      expect(google.disabled).toBe(true);
      expect(document.body.textContent).not.toContain(GOOGLE_TIMEOUT_MESSAGE);
      expect(track.mock.calls.filter((c) => c[0] === "login_error")).toHaveLength(0);
    },
  );
});

describe("SIGNIN-RESCUE-1 door order", () => {
  const order = () => {
    const btns = Array.from(document.querySelectorAll("button.lt-google, button.lt-method"));
    return btns.map((b) => (/Google/.test(b.textContent || "") ? "google" : /phone/.test(b.textContent || "") ? "phone" : "email"));
  };
  it("phone UA: phone number button first and primary, Google second, email last", () => {
    mount(CHROME);
    expect(order()).toEqual(["phone", "google", "email"]);
    const phone = screen.getByRole("button", { name: "Continue with phone number" });
    expect(phone.className).toContain("lt-method--primary");
    expect(screen.getByRole("button", { name: /Continue with Google/ }).className).toContain("lt-google--secondary");
  });
  it("desktop: Google first (unchanged), phone second, email last", () => {
    mount(DESKTOP);
    expect(order()).toEqual(["google", "phone", "email"]);
    expect(screen.getByRole("button", { name: "Continue with phone" })).toBeTruthy();
  });
});

describe("LOGIN-FIX-1 · popup-closed-by-user is a cancel", () => {
  it.each([["desktop", DESKTOP], ["normal mobile Chrome", CHROME]])(
    "%s: no message, no phone step, the Google button is ready again; login_error still counts it",
    async (_n, ua) => {
      signInWithGoogle.mockImplementation(async () => {
        throw Object.assign(new Error("x"), { code: "auth/popup-closed-by-user" });
      });
      const google = mount(ua);
      await act(async () => {
        fireEvent.click(google);
      });
      expect(document.body.textContent).not.toContain(POPUP_CLOSED_MESSAGE);
      expect(document.body.textContent).not.toContain("Sign-in failed");
      expect(screen.queryByRole("heading", { name: /Continue with phone/ })).toBeNull();
      expect((screen.getByRole("button", { name: /Continue with Google/ }) as HTMLButtonElement).disabled).toBe(false);
      expect(document.querySelector('[role="alert"]')).toBeNull();
      expect(track.mock.calls.filter((c) => c[0] === "login_error")).toEqual([
        ["login_error", expect.objectContaining({ method: "google", error_code: "popup-closed-by-user", flow: "popup" })],
      ]);
    },
  );
});

describe("cancelled-popup-request", () => {
  it("stays silent (a double-tap superseding the first popup)", async () => {
    signInWithGoogle.mockImplementation(async () => {
      throw Object.assign(new Error("x"), { code: "auth/cancelled-popup-request" });
    });
    const google = mount();
    await act(async () => {
      fireEvent.click(google);
    });
    expect(document.body.textContent).not.toContain(POPUP_CLOSED_MESSAGE);
    expect(document.body.textContent).not.toContain("Sign-in failed");
  });
});

describe("Google failure messages", () => {
  const cases: Array<[string, string, string]> = [
    ["auth/popup-blocked", POPUP_BLOCKED_MESSAGE, "popup-blocked"],
    [
      "auth/operation-not-supported-in-this-environment",
      UNSUPPORTED_ENVIRONMENT_MESSAGE,
      "operation-not-supported-in-this-environment",
    ],
  ];
  it.each(cases)("%s", async (code, message, telemetry) => {
    signInWithGoogle.mockImplementation(async () => {
      throw Object.assign(new Error("x"), { code });
    });
    const google = mount();
    await act(async () => {
      fireEvent.click(google);
    });
    expect(document.body.textContent).toContain(message);
    // The door is gone (SIGNIN-RESCUE-1 opened the phone step); the way back restores enabled buttons.
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /All sign-in options/ }));
    });
    expect((screen.getByRole("button", { name: /Continue with Google/ }) as HTMLButtonElement).disabled).toBe(false);
    expect(track).toHaveBeenCalledWith("login_error", {
      method: "google",
      ua_class: "chrome_android",
      error_code: telemetry,
      flow: "popup", // GOOGLE-REDIRECT-1
    });
  });
});

describe("SIGNIN-RESCUE-1 phone rescue after a failed Google attempt", () => {
  const fail = (code: string) =>
    signInWithGoogle.mockImplementation(async () => {
      throw Object.assign(new Error("x"), { code });
    });
  it.each([
    ["auth/popup-blocked", POPUP_BLOCKED_MESSAGE],
    ["auth/operation-not-supported-in-this-environment", UNSUPPORTED_ENVIRONMENT_MESSAGE],
  ])("%s opens the phone step with the message kept", async (code, message) => {
    fail(code);
    const google = mount(DESKTOP);
    await act(async () => {
      fireEvent.click(google);
    });
    expect(screen.getByRole("heading", { name: /Continue with phone/ })).toBeTruthy();
    expect(document.body.textContent).toContain(message);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /All sign-in options/ }));
    });
    expect(screen.getByRole("button", { name: /Continue with Google/ })).toBeTruthy();
  });
  it("cancelled-popup-request does NOT switch to the phone step", async () => {
    fail("auth/cancelled-popup-request");
    const google = mount(DESKTOP);
    await act(async () => {
      fireEvent.click(google);
    });
    expect(screen.queryByRole("heading", { name: /Continue with phone/ })).toBeNull();
    expect(screen.getByRole("button", { name: /Continue with Google/ })).toBeTruthy();
  });
  it("an unrelated error does not switch either", async () => {
    fail("auth/network-request-failed");
    const google = mount(DESKTOP);
    await act(async () => {
      fireEvent.click(google);
    });
    expect(screen.queryByRole("heading", { name: /Continue with phone/ })).toBeNull();
  });
});

describe("login_success", () => {
  it("fires once, for the method that was attempted, when the user appears", async () => {
    const google = mount();
    await act(async () => {
      fireEvent.click(google);
    });
    expect(track).not.toHaveBeenCalledWith("login_success", expect.anything());
    authState.user = {
      uid: "u1",
      email: "a@b.com",
      displayName: "A",
      phoneNumber: null,
      emailVerified: true,
    } as unknown as AuthUser;
    await act(async () => {
      mount.rerender();
    });
    const successes = track.mock.calls.filter((c) => c[0] === "login_success");
    expect(successes).toEqual([["login_success", { method: "google", ua_class: "chrome_android", flow: "popup" }]]);
    expect(JSON.stringify(track.mock.calls)).not.toMatch(/a@b\.com|u1/);
  });
  it("an already signed-in visitor passing through /login reports nothing", async () => {
    authState.user = { uid: "u2", email: "x@y.com", displayName: "X", phoneNumber: null, emailVerified: true } as unknown as AuthUser;
    vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(CHROME);
    await act(async () => {
      render(tree());
    });
    expect(track).not.toHaveBeenCalledWith("login_success", expect.anything());
  });
});

describe("late Google success after the 45 s timeout", () => {
  const routed = () => (
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<LandedProbe />} />
      </Routes>
    </MemoryRouter>
  );
  it("navigates exactly once and reports exactly one login_success (google)", async () => {
    vi.useFakeTimers();
    vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(YOUTUBE_APP);
    let finish: () => void = () => {};
    signInWithGoogle.mockImplementation(
      () =>
        new Promise<void>((res) => {
          finish = res;
        }),
    );
    landed.mockClear();
    const view = render(routed());
    fireEvent.click(screen.getByRole("button", { name: /Continue with Google/ }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(GOOGLE_POPUP_TIMEOUT_MS);
    });
    expect(document.body.textContent).toContain(GOOGLE_TIMEOUT_MESSAGE);
    // The student switches nothing; the popup finally completes.
    authState.user = { uid: "u3", email: "c@d.com", displayName: "C", phoneNumber: null, emailVerified: true } as unknown as AuthUser;
    await act(async () => {
      finish();
      view.rerender(routed());
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(landed).toHaveBeenCalledTimes(1);
    expect(track.mock.calls.filter((c) => c[0] === "login_success")).toEqual([
      ["login_success", { method: "google", ua_class: "inapp_youtube", flow: "popup" }],
    ]);
    // No second error and no timeout event after success.
    expect(track.mock.calls.filter((c) => c[0] === "login_error")).toHaveLength(1);
  });
  it("a timeout that fires after a successful sign-in reports nothing", async () => {
    vi.useFakeTimers();
    vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(YOUTUBE_APP);
    signInWithGoogle.mockImplementation(() => new Promise<void>(() => {}));
    const view = render(routed());
    fireEvent.click(screen.getByRole("button", { name: /Continue with Google/ }));
    authState.user = { uid: "u4", email: "e@f.com", displayName: "E", phoneNumber: null, emailVerified: true } as unknown as AuthUser;
    await act(async () => {
      view.rerender(routed());
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(GOOGLE_POPUP_TIMEOUT_MS + 1000);
    });
    expect(track.mock.calls.filter((c) => c[0] === "login_error")).toHaveLength(0);
    expect(track.mock.calls.filter((c) => c[0] === "login_success")).toHaveLength(1);
  });
  it("unmounting before the timeout reports nothing", async () => {
    vi.useFakeTimers();
    vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(YOUTUBE_APP);
    signInWithGoogle.mockImplementation(() => new Promise<void>(() => {}));
    render(routed());
    fireEvent.click(screen.getByRole("button", { name: /Continue with Google/ }));
    cleanup();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(GOOGLE_POPUP_TIMEOUT_MS + 1000);
    });
    expect(track.mock.calls.filter((c) => c[0] === "login_error")).toHaveLength(0);
  });
});
