import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { EMAIL_CODE_SLOT_HTML, BACK_HOME_TEXT, BACK_LANDING_TEXT } from "../../scripts/seo/loginPaint";

/**
 * SPEED-LOGIN-1 — the /login paint page carries React's FIRST COMMIT of the door. The CI capture build
 * does not set VITE_EMAIL_CODE_SIGNIN_ENABLED (production does), so the build inserts the email-code
 * door's slot itself (`withEmailCodeSlot`). This pins that inserted string to the slot Login really
 * renders on its first commit with the flag on — byte for byte — and the back-link words the paint
 * script patches to the ones Login renders.
 */
vi.mock("../services/guestPay", () => ({ claimOncePerSession: vi.fn(async () => []) }));
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: null,
    signInWithGoogle: vi.fn(),
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
// The offer strip reads the clock; this suite is about the slot and the back link, not the offer.
vi.mock("../components/auth/OfferStrip", () => ({ default: () => null }));
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: vi.fn() }));
// Never resolves: the first commit's Suspense fallback (the slot) is what stays on screen.
vi.mock("../components/auth/EmailCodeDoor", () => ({ default: () => { throw new Promise(() => {}); } }));

import Login from "./Login";

function door(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/login" element={<Login />} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("SPEED-LOGIN-1 — the paint page's inserted pieces equal Login's own first commit", () => {
  it("flag ON: Login's email-code slot is byte-identical to EMAIL_CODE_SLOT_HTML, right after the email door", () => {
    vi.stubEnv("VITE_EMAIL_CODE_SIGNIN_ENABLED", "1");
    const { container } = door("/login");
    const slot = container.querySelector('[data-testid="lt-email-code-door-slot"]');
    expect(slot).not.toBeNull();
    expect(slot!.outerHTML).toBe(EMAIL_CODE_SLOT_HTML);
    expect(slot!.previousElementSibling?.textContent).toBe("Continue with email");
  });

  it("flag OFF: no slot (the artifact form)", () => {
    vi.stubEnv("VITE_EMAIL_CODE_SIGNIN_ENABLED", "");
    const { container } = door("/login");
    expect(container.querySelector('[data-testid="lt-email-code-door-slot"]')).toBeNull();
  });

  it("the back link reads BACK_HOME_TEXT, and BACK_LANDING_TEXT for ?reason=start-trial", () => {
    expect(door("/login").container.querySelector("a.lt-login-back-link")?.textContent).toBe(BACK_HOME_TEXT);
    cleanup();
    expect(door("/login?reason=start-trial").container.querySelector("a.lt-login-back-link")?.textContent).toBe(BACK_LANDING_TEXT);
  });
});
