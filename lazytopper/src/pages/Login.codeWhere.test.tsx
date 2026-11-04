/**
 * CODE-WHERE-1 — Login's phone OTP says where the SMS went ("We've sent a code by SMS to +91 98•••••210.") with "Wrong
 * number? Change it", which returns to the number box with the digits kept and focused. The full number is no longer
 * printed on the code step (it used to read "Code sent to +91 9876543210"), and no analytics payload, storage entry or
 * URL carries it.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { AuthUser } from "../context/AuthContext";

const seen = vi.hoisted(() => ({ calls: [] as unknown[] }));
vi.mock("../analytics/analytics", async (orig) => {
  const actual = await orig<Record<string, unknown>>();
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(actual)) {
    out[k] =
      typeof v === "function"
        ? (...a: unknown[]) => {
            seen.calls.push([k, a]);
            return (v as (...x: unknown[]) => unknown)(...a);
          }
        : v;
  }
  return out;
});
vi.mock("../services/uxTelemetry", () => ({
  trackUxEvent: (...a: unknown[]) => {
    seen.calls.push(["trackUxEvent", a]);
  },
}));

const sendPhoneOtp = vi.fn(async (_phoneE164: string, _containerId: string) => {});
const verifyPhoneOtp = vi.fn(async (_code: string, _displayName?: string) => {});
const authState: { user: AuthUser | null } = { user: null };
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: authState.user,
    signInWithGoogle: vi.fn(async () => {}),
    signInWithEmailPassword: vi.fn(async () => {}),
    signUpWithEmailPassword: vi.fn(async () => {}),
    sendPasswordReset: vi.fn(async () => {}),
    initPhoneRecaptcha: vi.fn(async () => {}),
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
  getAdditionalUserInfo: vi.fn(() => null),
}));

import Login from "./Login";

const NUMBER = "9876543210";

beforeEach(() => {
  authState.user = null;
  seen.calls.length = 0;
  window.localStorage.clear();
  window.sessionStorage.clear();
});
afterEach(() => {
  cleanup();
  sendPhoneOtp.mockReset();
  verifyPhoneOtp.mockReset();
});

describe("Login phone OTP — where the code went", () => {
  it("shows the masked number, and 'Change it' returns to the number box with the digits kept and focused", async () => {
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>,
    );
    const u = userEvent.setup({ delay: null });
    await u.click(screen.getByRole("button", { name: /Continue with phone/ }));
    const nameBox = screen.queryByLabelText("Your name");
    if (nameBox) await u.type(nameBox, "Ritika");
    await u.type(screen.getByLabelText("Mobile number"), NUMBER);
    await u.click(screen.getByRole("button", { name: /Send OTP/ }));

    const sent = await screen.findByTestId("code-sent-to");
    expect(sent.textContent).toContain("We've sent a code by SMS to +91 98•••••210.");
    expect(sendPhoneOtp).toHaveBeenCalledWith(`+91${NUMBER}`, expect.any(String));
    // The full number is not rendered anywhere on the code step.
    expect(document.body.textContent).not.toContain(NUMBER);

    await u.click(screen.getByRole("button", { name: "Wrong number? Change it" }));
    const box = (await screen.findByLabelText("Mobile number")) as HTMLInputElement;
    expect(box.value).toBe(NUMBER);
    await waitFor(() => expect(document.activeElement).toBe(box));
    expect(sendPhoneOtp).toHaveBeenCalledTimes(1);

    // No analytics payload, storage entry or URL carries the number.
    const payload = JSON.stringify(seen.calls);
    expect(payload).not.toContain(NUMBER);
    expect(payload).not.toContain("98765");
    for (const s of [window.localStorage, window.sessionStorage]) {
      for (let i = 0; i < s.length; i++) expect(`${s.key(i)}=${s.getItem(s.key(i) || "")}`).not.toContain(NUMBER);
    }
    expect(window.location.href).not.toContain(NUMBER);
  });
});
