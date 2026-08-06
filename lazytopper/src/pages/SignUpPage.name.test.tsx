import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

/**
 * SignUpPage — the student's NAME is collected and reaches signup.
 *
 * WHY THIS IS PINNED HARD
 * `SignUpPage` collected email and password only. Google sign-in supplies
 * `displayName`; email/password sign-up did not — so `displayName` fell back to
 * the RAW EMAIL ADDRESS across App.tsx, DesktopShell, MobileAccountMenu,
 * DashboardHeader and ShareProgressPrompt. A fifteen-year-old's email was
 * rendered as their name throughout the shell.
 *
 * It is also a ONE-WAY DOOR: an account created without a name cannot be
 * backfilled without asking the student again. So this file asserts the WIRING
 * (the value actually reaches `signUpWithEmailPassword`), not merely that a
 * field exists — a rendered input that never gets passed through would satisfy
 * a presence check while leaving the defect exactly where it was.
 *
 * The AuthContext is mocked rather than mounted: this is a call-site test, and
 * the third argument arriving is the whole claim.
 */

// Typed to the REAL signature. An untyped `vi.fn(async () => {})` gives
// `mock.calls[0]` the empty-tuple type, so indexing the third argument is a
// compile error under tsconfig.test.json — which CI typechecks separately from
// the app config. Declaring the parameters is also what makes the arity part of
// the assertion rather than an accident.
const signUpWithEmailPassword =
  vi.fn(async (_email: string, _password: string, _displayName?: string) => {});
const signInWithGoogle = vi.fn(async () => {});
// NAME-1 v2: the shared door now has a RETURNING branch that calls this. Same
// reasoning as the phone members below — AuthDoor destructures it, so an absent
// one reads undefined at the call site and the component throws on submit.
const signInWithEmailPassword = vi.fn(async (_email: string, _password: string) => {});
// Phone members: SignUpPage destructures these, so an absent one reads
// undefined at the call site and the component throws. Kept in step with
// SignUpPage.redirect.test.tsx, which has the same requirement.
const initPhoneRecaptcha = vi.fn(async (_containerId: string) => {});
const sendPhoneOtp = vi.fn(async (_phoneE164: string, _containerId: string) => {});
const verifyPhoneOtp = vi.fn(async (_code: string) => {});

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    // Signed OUT — the form must be interactive, and SignUpPage's post-auth
    // effect must not fire and navigate away mid-test.
    user: null,
    signInWithGoogle,
    signInWithEmailPassword,
    signUpWithEmailPassword,
    initPhoneRecaptcha,
    sendPhoneOtp,
    verifyPhoneOtp,
  }),
}));
vi.mock("../services/referralService", () => ({ creditPendingReferral: vi.fn() }));

import SignUpPage from "./SignUpPage";

afterEach(() => {
  cleanup();
  signUpWithEmailPassword.mockReset();
  signInWithEmailPassword.mockReset();
  signInWithGoogle.mockReset();
});

function renderSignUp() {
  return render(
    <MemoryRouter initialEntries={["/sign-up"]}>
      <SignUpPage />
    </MemoryRouter>,
  );
}

/**
 * ONE DOOR (AUTH-3): `/sign-up` now renders the same door as `/login`, so the
 * email form sits one step in behind "Continue with email".
 *
 * ⚠ THE NAME CONTRACT BELOW IS UNCHANGED, and that is the point of this edit
 * being a re-route rather than a rewrite. The field is still present, still
 * first, still required, and still passed as the third argument to
 * `signUpWithEmailPassword` — which holds the ONLY `updateProfile` call in
 * product code, making this form the sole place a `displayName` is ever
 * captured. `FirstSession` deliberately does not ask. See [FU-AUTH-NAME-PROMPT].
 */
async function openEmailStep() {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: /Continue with email/ }));
  return user;
}

/** Fill the form. `name` omitted entirely means "leave the field untouched". */
async function fillAndSubmit(opts: { name?: string; email: string; password: string }) {
  const user = await openEmailStep();
  if (opts.name !== undefined && opts.name !== "") {
    await user.type(screen.getByLabelText("Your name"), opts.name);
  }
  await user.type(screen.getByLabelText("Email address"), opts.email);
  // NAME-1 v2: the create branch's label is now "Create a password". It could
  // split from the returning branch's plain "Password" only once reset was
  // confined to the returning branch — Login.forgotPassword.test.tsx resolves
  // that field by its accessible name.
  await user.type(screen.getByLabelText("Create a password"), opts.password);
  await user.click(screen.getByRole("button", { name: /create my account/i }));
}

describe("SignUpPage — the name field exists and is labelled", () => {
  it("renders a labelled name input with a name autocomplete hint", async () => {
    renderSignUp();
    // CONTROL — the field is genuinely behind the email step, not simply
    // missing. Without this the assertions below would pass just as happily
    // against a page that had lost the create form entirely.
    expect(screen.queryByLabelText("Your name")).toBeNull();
    await openEmailStep();

    const field = screen.getByLabelText("Your name");

    expect(field).toBeDefined();
    expect(field.getAttribute("type")).toBe("text");
    // Lets the browser/password manager offer the student's real name.
    expect(field.getAttribute("autocomplete")).toBe("name");
  });

  it("puts the name FIRST, before email and password", async () => {
    const { container } = renderSignUp();
    await openEmailStep();
    const ids = Array.from(container.querySelectorAll("input")).map(i => i.id);

    // The ids are the shared door's now that /login and /sign-up render the
    // same component. What this pins is the ORDER, which is the actual
    // contract: the name is asked for FIRST, so it never reads as an
    // afterthought a student can scroll past.
    expect(ids).toEqual(["lt-login-name", "lt-login-email", "lt-login-password"]);
  });

  it("never asks a returning student for a name — they declare, then type two things", async () => {
    /**
     * ★★ THIS REPLACES A GUARD; IT DOES NOT DELETE ONE.
     *
     * The predecessor asserted that the sign-IN door renders no name field at
     * all, immediately on reaching the email step. NAME-1 v2 gives the student a
     * self-declared choice with "I'm new here" pre-selected, so a name field IS
     * on screen at that moment — and the old assertion failed a sound page.
     *
     * What it PROTECTED is untouched and is what is pinned here: A RETURNING
     * STUDENT NEVER TYPES A NAME. It now costs one declaration first, and the
     * proof is stronger than before — the old test stopped at "no field on
     * screen", this one carries through to the call and shows the returning path
     * reaches sign-in and never reaches create.
     *
     * Deleting it instead would have been the FORBID-1 failure: a rule removed
     * because the layout moved, taking its protection with it.
     */
    const { default: Login } = await import("./Login");
    cleanup();
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Login />
      </MemoryRouter>,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Continue with email/ }));
    await user.click(screen.getByRole("button", { name: /Already have an account/ }));

    expect(screen.queryByLabelText("Your name")).toBeNull();
    // CONTROL — the returning form really did render; the absence above is a
    // decision, not a failed render.
    expect(screen.getByLabelText("Email address")).toBeDefined();
    expect(screen.getByLabelText("Password")).toBeDefined();

    // ...and it carries through to the CALL, which the predecessor never did.
    await user.type(screen.getByLabelText("Email address"), "known@example.com");
    await user.type(screen.getByLabelText("Password"), "hunter2secret");
    await user.click(screen.getByRole("button", { name: /^Sign in/ }));

    await waitFor(() => expect(signInWithEmailPassword).toHaveBeenCalledTimes(1));
    expect(signUpWithEmailPassword).not.toHaveBeenCalled();
  });
});

describe("SignUpPage — the name actually reaches signup (the wiring)", () => {
  it("passes the typed name as the THIRD argument to signUpWithEmailPassword", async () => {
    renderSignUp();
    await fillAndSubmit({
      name: "Ananya Sharma",
      email: "ananya@example.com",
      password: "hunter2secret",
    });

    await waitFor(() => expect(signUpWithEmailPassword).toHaveBeenCalled());
    expect(signUpWithEmailPassword).toHaveBeenCalledWith(
      "ananya@example.com",
      "hunter2secret",
      "Ananya Sharma",
    );
  });

  it("trims surrounding whitespace off the name before passing it", async () => {
    renderSignUp();
    await fillAndSubmit({
      name: "   Rohan Kapoor   ",
      email: "rohan@example.com",
      password: "hunter2secret",
    });

    await waitFor(() => expect(signUpWithEmailPassword).toHaveBeenCalled());
    // A stored name with padding renders as padding everywhere it is shown.
    expect(signUpWithEmailPassword.mock.calls[0][2]).toBe("Rohan Kapoor");
  });
});

describe("SignUpPage — the name is REQUIRED (owner-stated choice)", () => {
  /**
   * Required, not optional, because of the one-way door: an optional field
   * closes the defect only for students who fill it in and permanently
   * re-creates it for everyone who skips. These tests pin that DECISION — if
   * the field is ever made optional, they go red and say so.
   */
  it("blocks submission when the name is left empty, and does not call signup", async () => {
    renderSignUp();
    await fillAndSubmit({ email: "nameless@example.com", password: "hunter2secret" });

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "Enter your name.",
    );
    // The account must NOT have been created — otherwise the "required" field is
    // decorative and the one-way door has already closed.
    expect(signUpWithEmailPassword).not.toHaveBeenCalled();
  });

  it("treats a whitespace-only name as empty", async () => {
    renderSignUp();
    await fillAndSubmit({
      name: "   ",
      email: "spaces@example.com",
      password: "hunter2secret",
    });

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "Enter your name.",
    );
    expect(signUpWithEmailPassword).not.toHaveBeenCalled();
  });

  it("still reports the missing name before complaining about a short password", async () => {
    // Ordering matters for the student: fix the first problem they can see.
    renderSignUp();
    await fillAndSubmit({ email: "short@example.com", password: "abc" });

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "Enter your name.",
    );
  });
});

describe("SignUpPage — the Google path is unchanged", () => {
  it("does not require a name to continue with Google", async () => {
    // Google supplies displayName itself, so gating its button on this field
    // would add friction for no benefit — and would regress a working path.
    renderSignUp();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /continue with google/i }));

    await waitFor(() => expect(signInWithGoogle).toHaveBeenCalled());
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
