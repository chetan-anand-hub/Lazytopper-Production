import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { AuthUser } from "../context/AuthContext";

/**
 * THE ONE DOOR — `/login` with no sign-in/sign-up tabs (AUTH-3).
 *
 * ── WHAT THIS FILE IS REALLY GUARDING ─────────────────────────────────────
 * The email flow is INVERTED because Firebase Email Enumeration Protection is
 * enabled: `signInWithEmailAndPassword` cannot distinguish a wrong password
 * from a missing account, but `createUserWithEmailAndPassword` still returns
 * `auth/email-already-in-use`. So the page tries sign-in and, on an AMBIGUOUS
 * failure only, tries create.
 *
 * That makes the create call a COMMITMENT, not a probe — it really creates the
 * account. Two properties therefore matter more than anything else here and
 * each has its own test:
 *
 *   • a SUCCESSFUL sign-in must never reach the create call (test 3), and
 *   • a NON-AMBIGUOUS sign-in failure must never reach it either (test 5) —
 *     answering a rate limit with a second write call would be actively
 *     harmful, and replacing an accurate error with a confusing one is a
 *     regression even when it is harmless.
 */

// Typed to the real signatures. An untyped `vi.fn(async () => {})` gives
// `mock.calls[0]` the empty-tuple type, so indexing an argument is a compile
// error under tsconfig.test.json — which CI typechecks separately.
const signInWithEmailPassword = vi.fn(async (_email: string, _password: string) => {});
const signUpWithEmailPassword =
  vi.fn(async (_email: string, _password: string, _displayName?: string) => {});
const signInWithGoogle = vi.fn(async () => {});
const sendPasswordReset = vi.fn(async (_email: string) => {});
const initPhoneRecaptcha = vi.fn(async (_containerId: string) => {});
const sendPhoneOtp = vi.fn(async (_phoneE164: string, _containerId: string) => {});
const verifyPhoneOtp = vi.fn(async (_code: string) => {});
const logout = vi.fn(async () => {});

/** Mutable so a test can mount the door already signed in. */
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

function authError(code: string) {
  return Object.assign(new Error(code), { code });
}

function user(partial: Partial<AuthUser>): AuthUser {
  return {
    uid: "uid-1",
    email: null,
    phoneNumber: null,
    displayName: null,
    providerIds: [],
    ...partial,
  };
}

function renderDoor(entry: { pathname: string; state?: unknown } = { pathname: "/login" }) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/check-improve" element={<div>LANDED ON CHECK AND IMPROVE</div>} />
        <Route path="/" element={<div>LANDED ON HOME</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

/** Walk the door to the email form and fill it. */
async function submitEmail(email: string, password: string) {
  const u = userEvent.setup({ delay: null });
  await u.click(screen.getByRole("button", { name: /Continue with email/ }));
  await u.type(screen.getByLabelText("Email address"), email);
  await u.type(screen.getByLabelText("Password"), password);
  await u.click(screen.getByRole("button", { name: /^Continue as/ }));
  return u;
}

beforeEach(() => {
  authState.user = null;
  localStorage.clear();
  for (const m of [
    signInWithEmailPassword,
    signUpWithEmailPassword,
    signInWithGoogle,
    sendPasswordReset,
    initPhoneRecaptcha,
    sendPhoneOtp,
    verifyPhoneOtp,
    logout,
  ]) {
    m.mockReset();
  }
  signInWithEmailPassword.mockResolvedValue(undefined);
  signUpWithEmailPassword.mockResolvedValue(undefined);
});
afterEach(cleanup);

// ---------------------------------------------------------------------------
// 1 · The door itself
// ---------------------------------------------------------------------------

describe("the door — three equal methods, no tabs", () => {
  it("offers Google, phone and email, and renders NO tab control at all", () => {
    renderDoor();

    expect(screen.getByRole("button", { name: /Continue with Google/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Continue with phone/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Continue with email/ })).toBeTruthy();

    // The tabs are the thing this redesign removes: they made every student
    // classify themselves to solve a problem that affects one method in three.
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
  });

  it("never asks the student whether they already have an account", async () => {
    renderDoor();
    const u = userEvent.setup({ delay: null });
    await u.click(screen.getByRole("button", { name: /Continue with email/ }));

    // ⚠ The superseded prototype had a "No account found — create one?" step.
    // It must NOT ship: disclosing non-existence re-opens by hand the exact leak
    // Email Enumeration Protection was enabled to close.
    expect(screen.queryByText(/no account found/i)).toBeNull();
    expect(screen.queryByText(/create one\?/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /Create my account/ })).toBeNull();

    // CONTROL — the email form really is on screen, so those absences mean
    // something. `queryBy -> null` passes just as happily on a broken render.
    expect(screen.getByLabelText("Email address")).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Continue as|^Continue$/ })).toBeTruthy();
  });

  it("echoes the typed address in the CTA, which is the free half of the typo defence", async () => {
    renderDoor();
    const u = userEvent.setup({ delay: null });
    await u.click(screen.getByRole("button", { name: /Continue with email/ }));

    // Before anything is typed there is nothing to echo.
    expect(screen.getByRole("button", { name: "Continue" })).toBeTruthy();

    await u.type(screen.getByLabelText("Email address"), "ananya@example.com");
    expect(
      screen.getByRole("button", { name: "Continue as ananya@example.com" }),
    ).toBeTruthy();
  });

  it("warns that email and phone are separate WITHOUT promising a link that does not exist", () => {
    renderDoor();
    const warning = screen.getByTestId("lt-link-warning").textContent ?? "";

    expect(warning).toContain("Use the same method each time.");
    expect(warning).toContain("Email and phone are separate accounts until you link them");

    // ⚠ AuthContext exposes sendLinkPhoneOtp / confirmLinkPhoneOtp and imports
    // linkWithPhoneNumber — and nothing else. The link runs in ONE direction:
    // an email or Google student can ADD a phone; a phone-first student can
    // never add an email. This page makes phone prominent, so promising them
    // that capability would be a lie told to the students most affected.
    expect(warning).not.toMatch(/account menu/i);
    expect(warning).not.toMatch(/link both/i);
  });
});

// ---------------------------------------------------------------------------
// 2 · Try-then-create
// ---------------------------------------------------------------------------

describe("the email flow — try, then create", () => {
  it("a NEW student is created and never shown an error", async () => {
    renderDoor();
    signInWithEmailPassword.mockRejectedValue(authError("auth/invalid-credential"));

    await submitEmail("new@example.com", "hunter2secret");

    await waitFor(() => expect(signUpWithEmailPassword).toHaveBeenCalled());
    expect(signUpWithEmailPassword).toHaveBeenCalledWith("new@example.com", "hunter2secret");
    // The whole point: no "we couldn't sign you in" on the way to being created.
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("a RETURNING student with the right password signs in and is NEVER passed to create", async () => {
    renderDoor();
    signInWithEmailPassword.mockResolvedValue(undefined);

    await submitEmail("known@example.com", "hunter2secret");

    await waitFor(() => expect(signInWithEmailPassword).toHaveBeenCalled());
    expect(signInWithEmailPassword).toHaveBeenCalledWith("known@example.com", "hunter2secret");
    // Reaching create here would attempt to re-create a live account.
    expect(signUpWithEmailPassword).not.toHaveBeenCalled();
  });

  it("a WRONG password says so and offers a reset — it does not claim an account was created", async () => {
    renderDoor();
    signInWithEmailPassword.mockRejectedValue(authError("auth/invalid-credential"));
    signUpWithEmailPassword.mockRejectedValue(authError("auth/email-already-in-use"));

    await submitEmail("known@example.com", "wrongpassword");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("That password doesn't match. Try again, or reset it.");
    expect(screen.getByRole("button", { name: "Reset my password" })).toBeTruthy();
    // The raw Firebase wording would be actively misleading here: the student
    // is signing IN, and "email already in use" reads as "you already have an
    // account" — which they know.
    expect(alert.textContent).not.toMatch(/already in use/i);
  });

  it("⚠ a NON-AMBIGUOUS sign-in failure is reported and NEVER falls through to create", async () => {
    renderDoor();
    // A rate limit is not "these credentials did not match". Falling through
    // would answer a throttle with a second write call.
    signInWithEmailPassword.mockRejectedValue(authError("auth/too-many-requests"));

    await submitEmail("known@example.com", "hunter2secret");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Too many attempts. Please try again in a few minutes.");
    expect(signUpWithEmailPassword).not.toHaveBeenCalled();
  });

  it("a disabled account keeps its own accurate message rather than being re-created", async () => {
    renderDoor();
    signInWithEmailPassword.mockRejectedValue(authError("auth/user-disabled"));

    await submitEmail("banned@example.com", "hunter2secret");

    expect(await screen.findByRole("alert")).toHaveTextContent("This account has been disabled.");
    expect(signUpWithEmailPassword).not.toHaveBeenCalled();
  });

  it("rejects a short password before ANY network call", async () => {
    renderDoor();

    await submitEmail("new@example.com", "abc");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Choose a password with at least 6 characters.",
    );
    expect(signInWithEmailPassword).not.toHaveBeenCalled();
    expect(signUpWithEmailPassword).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 3 · The verification block — scope is narrow and each boundary is checked
// ---------------------------------------------------------------------------

describe("blocking verification — only a new email/password account", () => {
  it("BLOCKS an unverified password account instead of letting it into the product", async () => {
    authState.user = user({
      email: "typo@gmial.com",
      providerIds: ["password"],
      emailVerified: false,
    });
    renderDoor();

    expect(await screen.findByTestId("lt-verify-gate")).toBeTruthy();
    expect(screen.getByTestId("lt-verify-address")).toHaveTextContent("typo@gmial.com");
    expect(screen.queryByText("LANDED ON HOME")).toBeNull();
  });

  it("lets a GOOGLE account straight through — Google has already proven the address", async () => {
    authState.user = user({
      email: "ananya@gmail.com",
      providerIds: ["google.com"],
      emailVerified: true,
    });
    renderDoor();

    expect(await screen.findByText("LANDED ON HOME")).toBeTruthy();
    expect(screen.queryByTestId("lt-verify-gate")).toBeNull();
  });

  it("lets a PHONE account straight through even though emailVerified is false", async () => {
    // A phone account has no email at all, so the flag is meaningless for it.
    // This is exactly why the gate requires an ADDRESS as well as the flag —
    // keying on `emailVerified` alone would strand every phone student on a
    // screen asking them to check an inbox they never gave us.
    authState.user = user({
      phoneNumber: "+919876543210",
      providerIds: ["phone"],
      emailVerified: false,
    });
    renderDoor();

    expect(await screen.findByText("LANDED ON HOME")).toBeTruthy();
    expect(screen.queryByTestId("lt-verify-gate")).toBeNull();
  });

  it("lets a RETURNING, already-verified email student straight through", async () => {
    authState.user = user({
      email: "ananya@example.com",
      providerIds: ["password"],
      emailVerified: true,
    });
    renderDoor();

    expect(await screen.findByText("LANDED ON HOME")).toBeTruthy();
    expect(screen.queryByTestId("lt-verify-gate")).toBeNull();
  });

  it("does NOT block when emailVerified is UNKNOWN (an older stored session)", async () => {
    // `emailVerified` is optional; undefined means "we do not know", and an
    // unknown value must never strand a student.
    authState.user = user({ email: "old@example.com", providerIds: ["password"] });
    renderDoor();

    expect(await screen.findByText("LANDED ON HOME")).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 4 · The `from` round-trip — gated out of Check & Improve, land back in it
// ---------------------------------------------------------------------------

describe("the `from` round-trip survives the redesign", () => {
  it("a student gated out of Check & Improve lands back in Check & Improve", async () => {
    authState.user = user({
      email: "ananya@example.com",
      providerIds: ["password"],
      emailVerified: true,
    });
    renderDoor({ pathname: "/login", state: { from: "/check-improve" } });

    expect(await screen.findByText("LANDED ON CHECK AND IMPROVE")).toBeTruthy();
  });

  it("an off-site `from` is refused and the student lands on home", async () => {
    authState.user = user({
      email: "ananya@example.com",
      providerIds: ["password"],
      emailVerified: true,
    });
    renderDoor({ pathname: "/login", state: { from: "https://evil.example.com/steal" } });

    expect(await screen.findByText("LANDED ON HOME")).toBeTruthy();
  });

  it("an UNVERIFIED student is held at the gate even when a `from` is waiting", async () => {
    // The redirect must not outrank the block, or the gate is decorative.
    authState.user = user({
      email: "typo@gmial.com",
      providerIds: ["password"],
      emailVerified: false,
    });
    renderDoor({ pathname: "/login", state: { from: "/check-improve" } });

    expect(await screen.findByTestId("lt-verify-gate")).toBeTruthy();
    expect(screen.queryByText("LANDED ON CHECK AND IMPROVE")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 5 · Phone stays whole on the shared page
// ---------------------------------------------------------------------------

describe("phone OTP still works from the one door", () => {
  it("warms and sends through LOGIN's own reCAPTCHA container", async () => {
    const { container } = renderDoor();
    const u = userEvent.setup({ delay: null });

    // Always mounted — never inside the conditional form, or toggling steps
    // would unmount the container out from under a live verifier.
    expect(container.querySelector("#lt-login-recaptcha")).not.toBeNull();
    expect(container.querySelector("#lt-signup-recaptcha")).toBeNull();

    await u.click(screen.getByRole("button", { name: /Continue with phone/ }));
    await waitFor(() => expect(initPhoneRecaptcha).toHaveBeenCalledWith("lt-login-recaptcha"));

    await u.type(screen.getByLabelText("Mobile number"), "9876543210");
    await u.click(screen.getByRole("button", { name: /Send OTP/ }));

    await waitFor(() =>
      expect(sendPhoneOtp).toHaveBeenCalledWith("+919876543210", "lt-login-recaptcha"),
    );

    await u.type(await screen.findByLabelText("Enter the 6-digit code"), "123456");
    await u.click(screen.getByRole("button", { name: /Verify & continue/ }));
    await waitFor(() => expect(verifyPhoneOtp).toHaveBeenCalledWith("123456"));
  });

  it("keeps the reCAPTCHA host mounted while the student moves between steps", async () => {
    const { container } = renderDoor();
    const u = userEvent.setup({ delay: null });

    await u.click(screen.getByRole("button", { name: /Continue with phone/ }));
    expect(container.querySelector("#lt-login-recaptcha")).not.toBeNull();

    await u.click(screen.getByRole("button", { name: "<- All sign-in options" }));
    expect(container.querySelector("#lt-login-recaptcha")).not.toBeNull();

    await u.click(screen.getByRole("button", { name: /Continue with email/ }));
    expect(container.querySelector("#lt-login-recaptcha")).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 6 · Dark-theme legibility — a defect only a screenshot could find
// ---------------------------------------------------------------------------

describe("dark theme — the student can see what they type", () => {
  /**
   * These are SOURCE assertions, matching the pattern Login.legalLinks.test.tsx
   * already uses, because jsdom does not apply the cascade from an injected
   * <style> tag — `getComputedStyle` there reports the declared value, not the
   * resolved one, so a DOM assertion would pass whether or not the rule
   * existed.
   *
   * The defect these pin was PRE-EXISTING and invisible to every gate: the dark
   * block redefines `--lt-ink` to near-white (#f8fafc), while `.lt-field` and
   * `.lt-google` both hardcode `background: #ffffff`. Their text inherits
   * `var(--lt-ink)`, so a real browser measured rgb(248,250,252) on
   * rgb(255,255,255) — about 1.04:1. Nothing in the test suite could see it and
   * nothing in the diff looked wrong; it took rendering the page at 390px.
   */
  const src = readFileSync(resolve(process.cwd(), "src/pages/Login.tsx"), "utf8");

  function ruleBody(selector: string): string {
    const at = src.indexOf(selector);
    expect(at, `selector not found: ${selector}`).toBeGreaterThan(-1);
    const open = src.indexOf("{", at);
    return src.slice(open, src.indexOf("}", open));
  }

  it("gives the input fields a dark-theme background so light text is legible", () => {
    const body = ruleBody('.lt-login-page[data-login-theme="dark"] .lt-field');
    expect(body).toMatch(/background:\s*rgba\(255,\s*255,\s*255/);
  });

  it("pins DARK ink on the white Google button rather than letting it inherit", () => {
    // The background stays white by design (Google's brand guidance), so the
    // label is what has to stop inheriting --lt-ink.
    const body = ruleBody('.lt-login-page[data-login-theme="dark"] .lt-google');
    expect(body).toMatch(/color:\s*#071a3d/);
  });

  it("keeps the +91 prefix readable against the dark field", () => {
    const body = ruleBody('.lt-login-page[data-login-theme="dark"] .lt-prefix');
    expect(body).toMatch(/color:\s*rgba\(248,\s*250,\s*252/);
  });
});
