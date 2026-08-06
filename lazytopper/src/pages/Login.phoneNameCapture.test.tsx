import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { AuthUser } from "../context/AuthContext";

/**
 * NAME-2 — THE PHONE DOOR CAPTURES A NAME.
 *
 * ── THE DEFECT THIS CLOSES ────────────────────────────────────────────────
 * `mapFirebaseUser` only ever READS `displayName`. Google supplies one, and
 * NAME-1 (#616) made the EMAIL path set one via `signUpWithEmailPassword` —
 * which was, and until this lane remained, the ONLY `updateProfile` call in
 * product code.
 *
 * ★ PHONE SUPPLIES NOTHING. Firebase attaches no display name to a phone
 * credential, so every phone-first student was created nameless and their raw
 * number rendered wherever their name belonged, for the life of the account.
 * [FU-AUTH-PHONE-DISPLAYNAME-NEVER-SET]
 *
 * ── WHY THE STUDENT IS ASKED, AND ONLY SOME OF THEM ───────────────────────
 * The name can only be asked of somebody NEW, and phone — like email — has no
 * way to learn who is new. So the phone number step gets the SAME self-declared
 * segmented control the email step got, for a different underlying reason:
 * email needed it because Enumeration Protection hides whether an account
 * exists; phone needs it because there is nowhere else to put the question.
 *
 * ⚠ Still not tabs AT THE DOOR — AUTH-3's ruling is untouched. This lives one
 * level in, on the phone sub-screen, exactly as the email control does.
 *
 * ⚠ NO ENUMERATION DISCLOSURE. Neither branch's copy asserts that an account
 * does or does not exist, and no branch depends on a server answer.
 */

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
vi.mock("firebase/auth", () => ({
  sendEmailVerification: vi.fn(async () => {}),
  reload: vi.fn(async () => {}),
  verifyBeforeUpdateEmail: vi.fn(async () => {}),
  reauthenticateWithCredential: vi.fn(async () => {}),
  EmailAuthProvider: { credential: vi.fn(() => ({})) },
}));

import Login from "./Login";

const REAL_NAME = "Ritika Kapoor";
const NUMBER = "9876543210";
const CODE = "123456";

function renderDoor(pathname = "/login") {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<div>LANDED ON HOME</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

/** Open the phone step. Returns the user-event instance. */
async function openPhoneStep() {
  const u = userEvent.setup({ delay: null });
  await u.click(screen.getByRole("button", { name: /Continue with phone/ }));
  return u;
}

/**
 * Click a branch inside the PHONE control specifically. Scoped with `within`
 * because the email control carries the identical two labels — an unscoped
 * query would be ambiguous the moment both are reachable in one test.
 */
async function choose(u: ReturnType<typeof userEvent.setup>, label: RegExp) {
  const control = screen.getByTestId("lt-phone-mode");
  await u.click(within(control).getByRole("button", { name: label }));
}

beforeEach(() => {
  authState.user = null;
});

afterEach(() => {
  cleanup();
  verifyPhoneOtp.mockReset();
  sendPhoneOtp.mockReset();
  initPhoneRecaptcha.mockReset();
  signUpWithEmailPassword.mockReset();
  signInWithEmailPassword.mockReset();
});

// ---------------------------------------------------------------------------
// 1 · The name reaches the confirm call, positionally
// ---------------------------------------------------------------------------

describe("a new phone account is created WITH a name", () => {
  it("★ passes the typed name as verifyPhoneOtp's SECOND argument", async () => {
    renderDoor();
    const u = await openPhoneStep();

    await u.type(screen.getByLabelText("Your name"), REAL_NAME);
    await u.type(screen.getByLabelText("Mobile number"), NUMBER);
    await u.click(screen.getByRole("button", { name: /Send OTP/ }));

    await u.type(await screen.findByLabelText("Enter the 6-digit code"), CODE);
    await u.click(screen.getByRole("button", { name: /Verify & continue/ }));

    await waitFor(() => expect(verifyPhoneOtp).toHaveBeenCalled());

    // ★ POSITIONAL, not "a name appeared somewhere in the arguments". Only the
    // second slot is read by `updateProfile` in the context.
    const call = verifyPhoneOtp.mock.calls[0];
    expect(call[0]).toBe(CODE);
    expect(call[1]).toBe(REAL_NAME);
    expect(verifyPhoneOtp).toHaveBeenCalledTimes(1);
  });

  it("sends a NON-EMPTY name — never a blank second argument", async () => {
    renderDoor();
    const u = await openPhoneStep();

    await u.type(screen.getByLabelText("Your name"), `  ${REAL_NAME}  `);
    await u.type(screen.getByLabelText("Mobile number"), NUMBER);
    await u.click(screen.getByRole("button", { name: /Send OTP/ }));
    await u.type(await screen.findByLabelText("Enter the 6-digit code"), CODE);
    await u.click(screen.getByRole("button", { name: /Verify & continue/ }));

    await waitFor(() => expect(verifyPhoneOtp).toHaveBeenCalled());
    const passed = verifyPhoneOtp.mock.calls[0][1];
    expect(passed).toBeTruthy();
    expect((passed ?? "").trim()).not.toBe("");
    // Trimmed at the boundary, so the context never has to.
    expect(passed).toBe(REAL_NAME);
  });

  it("REQUIRES the name before spending an SMS — the create branch blocks", async () => {
    renderDoor();
    const u = await openPhoneStep();

    // Number is valid; only the name is missing.
    await u.type(screen.getByLabelText("Mobile number"), NUMBER);
    await u.click(screen.getByRole("button", { name: /Send OTP/ }));

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "Enter your name.",
    );
    // An account created nameless CANNOT be backfilled, and an SMS costs money.
    expect(sendPhoneOtp).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 2 · The returning branch renders NO name field — with a control
// ---------------------------------------------------------------------------

describe("the RETURNING phone branch asks for nothing extra", () => {
  it("★★ renders no name field — CONTROL: the number field and submit DO render", async () => {
    renderDoor();
    const u = await openPhoneStep();

    // CONTROL A — the field exists on the branch that is supposed to have it,
    // so its later absence means the branch changed and not that a label was
    // renamed or the component broke.
    expect(screen.getByLabelText("Your name")).toBeDefined();

    await choose(u, /Already have an account/);

    expect(screen.queryByLabelText("Your name")).toBeNull();

    // CONTROL B — the rest of the step is still on screen and usable.
    expect(screen.getByLabelText("Mobile number")).toBeDefined();
    expect(screen.getByRole("button", { name: /Send OTP/ })).toBeDefined();
  });

  it("★ sends NO second argument on the returning branch", async () => {
    renderDoor();
    const u = await openPhoneStep();

    await choose(u, /Already have an account/);
    await u.type(screen.getByLabelText("Mobile number"), NUMBER);
    await u.click(screen.getByRole("button", { name: /Send OTP/ }));
    await u.type(await screen.findByLabelText("Enter the 6-digit code"), CODE);
    await u.click(screen.getByRole("button", { name: /Verify & continue/ }));

    await waitFor(() => expect(verifyPhoneOtp).toHaveBeenCalled());
    // ⚠ Nothing to overwrite an existing name WITH. The context also guards,
    // but the surface must not send one in the first place.
    expect(verifyPhoneOtp.mock.calls[0][1]).toBeUndefined();
  });

  it("does not block a returning student on a name they were never asked for", async () => {
    renderDoor();
    const u = await openPhoneStep();

    await choose(u, /Already have an account/);
    await u.type(screen.getByLabelText("Mobile number"), NUMBER);
    await u.click(screen.getByRole("button", { name: /Send OTP/ }));

    await waitFor(() =>
      expect(sendPhoneOtp).toHaveBeenCalledWith(`+91${NUMBER}`, "lt-login-recaptcha"),
    );
  });
});

// ---------------------------------------------------------------------------
// 3 · The name survives number -> otp
// ---------------------------------------------------------------------------

describe("the typed name survives the step transition", () => {
  it("★ reaches the CONFIRM call after the number -> otp transition", async () => {
    renderDoor();
    const u = await openPhoneStep();

    await u.type(screen.getByLabelText("Your name"), REAL_NAME);
    await u.type(screen.getByLabelText("Mobile number"), NUMBER);
    await u.click(screen.getByRole("button", { name: /Send OTP/ }));

    // The transition actually happened — the name field is GONE from the DOM
    // at this point, so the value cannot be re-read from the input. If it
    // survives at all it survives in state.
    await screen.findByLabelText("Enter the 6-digit code");
    expect(screen.queryByLabelText("Your name")).toBeNull();

    await u.type(screen.getByLabelText("Enter the 6-digit code"), CODE);
    await u.click(screen.getByRole("button", { name: /Verify & continue/ }));

    await waitFor(() => expect(verifyPhoneOtp).toHaveBeenCalled());
    expect(verifyPhoneOtp.mock.calls[0][1]).toBe(REAL_NAME);
  });

  it("survives a Change number round trip back to the number step", async () => {
    renderDoor();
    const u = await openPhoneStep();

    await u.type(screen.getByLabelText("Your name"), REAL_NAME);
    await u.type(screen.getByLabelText("Mobile number"), NUMBER);
    await u.click(screen.getByRole("button", { name: /Send OTP/ }));

    await u.click(await screen.findByRole("button", { name: /Change number/ }));

    // Back on the number step, and the student is not made to retype it.
    expect(screen.getByLabelText("Your name")).toHaveProperty("value", REAL_NAME);
  });
});

// ---------------------------------------------------------------------------
// 4 · role="group", not role="tab" — with BOTH controls rendered
// ---------------------------------------------------------------------------

describe("the segmented controls are GROUPS, never tabs", () => {
  it("★★ zero role=tab with BOTH the phone and the email control rendered", async () => {
    renderDoor();
    const u = await openPhoneStep();

    // CONTROL — the phone control is genuinely on screen, so a zero tab count
    // is not the trivially-true count of an empty page.
    expect(screen.getByTestId("lt-phone-mode")).toBeDefined();
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
    expect(screen.queryAllByRole("tablist")).toHaveLength(0);

    // ...and the EMAIL control, reached through the same door in the same test.
    await u.click(screen.getByRole("button", { name: /All sign-in options/ }));
    await u.click(screen.getByRole("button", { name: /Continue with email/ }));

    expect(screen.getByTestId("lt-email-mode")).toBeDefined();
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
    expect(screen.queryAllByRole("tablist")).toHaveLength(0);
  });

  it("exposes the choice as pressed state on a group, and defaults to NEW", async () => {
    renderDoor();
    await openPhoneStep();

    const control = screen.getByTestId("lt-phone-mode");
    expect(control.getAttribute("role")).toBe("group");

    const buttons = Array.from(control.querySelectorAll("button"));
    expect(buttons).toHaveLength(2);
    // ⚠ "new" PRE-SELECTS, matching the email step.
    expect(buttons[0].getAttribute("aria-pressed")).toBe("true");
    expect(buttons[1].getAttribute("aria-pressed")).toBe("false");
  });

  it("reuses the email step's .lt-login-seg treatment rather than a second one", async () => {
    renderDoor();
    await openPhoneStep();
    // One set of rules, one dark-theme pair. A second class here would drift.
    expect(screen.getByTestId("lt-phone-mode").className).toContain("lt-login-seg");
  });
});

// ---------------------------------------------------------------------------
// 5 · No enumeration disclosure on the phone path
// ---------------------------------------------------------------------------

describe("the phone path discloses nothing about who exists", () => {
  const FORBIDDEN =
    /no account found|isn'?t registered|not registered|already registered|no such account|create one\?|account not found/i;

  it("★ neither branch's copy asserts whether an account exists", async () => {
    renderDoor();
    const u = await openPhoneStep();

    // CONTROL — the step really rendered, so scanning it means something.
    expect(screen.getByRole("heading", { name: /Continue with phone/ })).toBeDefined();
    expect(document.body.textContent || "").not.toMatch(FORBIDDEN);

    await choose(u, /Already have an account/);
    expect(screen.getByLabelText("Mobile number")).toBeDefined();
    expect(document.body.textContent || "").not.toMatch(FORBIDDEN);
  });

  it("★ the copy describes what THIS submit does — and the old claim is gone", async () => {
    renderDoor();
    const u = await openPhoneStep();

    // The retired line promised the branches were identical. They no longer
    // are, so it must not survive anywhere on the step.
    expect(document.body.textContent || "").not.toMatch(
      /phone works the same either way/i,
    );

    expect(
      screen.getByText(
        "We'll create your account and start your 7-day trial. No password to remember.",
      ),
    ).toBeDefined();

    await choose(u, /Already have an account/);
    expect(
      screen.getByText("Welcome back — we'll text you a code. No password to remember."),
    ).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 6 · #616's email behaviour is untouched
// ---------------------------------------------------------------------------

describe("NAME-1 (#616) email behaviour is unchanged by this lane", () => {
  async function openEmailStep() {
    const u = userEvent.setup({ delay: null });
    await u.click(screen.getByRole("button", { name: /Continue with email/ }));
    return u;
  }

  it("★ 'new' is still pre-selected on the email step", async () => {
    renderDoor();
    await openEmailStep();

    const control = screen.getByTestId("lt-email-mode");
    const buttons = Array.from(control.querySelectorAll("button"));
    expect(buttons[0].getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByLabelText("Your name")).toBeDefined();
  });

  it("★ forgot-password is ABSENT on create and PRESENT on returning", async () => {
    renderDoor();
    const u = await openEmailStep();

    // Create branch — no recovery affordance.
    expect(screen.queryByRole("button", { name: /Forgot password/i })).toBeNull();

    const control = screen.getByTestId("lt-email-mode");
    const returning = Array.from(control.querySelectorAll("button")).find(
      (b) => /Already have an account/.test(b.textContent || ""),
    );
    await u.click(returning as HTMLElement);

    // CONTROL — the branch really switched, and recovery is back.
    expect(screen.queryByLabelText("Your name")).toBeNull();
    expect(screen.getByRole("button", { name: /Forgot password/i })).toBeDefined();
  });
});
