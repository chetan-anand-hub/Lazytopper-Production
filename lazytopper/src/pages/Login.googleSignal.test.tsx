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
    initPhoneRecaptcha: vi.fn(),
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

// A function, not a constant element: re-rendering the SAME element object is a React no-op.
const tree = () => (
  <MemoryRouter initialEntries={["/login"]}>
    <Login />
  </MemoryRouter>
);

function mount() {
  vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(CHROME);
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
    const google = mount();
    fireEvent.click(google);
    expect(google.disabled).toBe(true);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(GOOGLE_POPUP_TIMEOUT_MS - 1000);
    });
    expect(google.disabled).toBe(true);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(google.disabled).toBe(false);
    expect(document.body.textContent).toContain(GOOGLE_TIMEOUT_MESSAGE);
    expect(track).toHaveBeenCalledWith("login_attempt", { method: "google", ua_class: "chrome_android" });
    expect(track).toHaveBeenCalledWith("login_error", {
      method: "google",
      ua_class: "chrome_android",
      error_code: "popup-timeout",
    });
  });
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
    ["auth/popup-closed-by-user", POPUP_CLOSED_MESSAGE, "popup-closed-by-user"],
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
    expect(google.disabled).toBe(false);
    expect(track).toHaveBeenCalledWith("login_error", {
      method: "google",
      ua_class: "chrome_android",
      error_code: telemetry,
    });
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
    expect(successes).toEqual([["login_success", { method: "google", ua_class: "chrome_android" }]]);
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
    vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(CHROME);
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
      ["login_success", { method: "google", ua_class: "chrome_android" }],
    ]);
    // No second error and no timeout event after success.
    expect(track.mock.calls.filter((c) => c[0] === "login_error")).toHaveLength(1);
  });
  it("a timeout that fires after a successful sign-in reports nothing", async () => {
    vi.useFakeTimers();
    vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(CHROME);
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
    vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(CHROME);
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
