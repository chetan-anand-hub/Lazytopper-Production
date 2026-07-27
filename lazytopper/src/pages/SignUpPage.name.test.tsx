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

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    // Signed OUT — the form must be interactive, and SignUpPage's post-auth
    // effect must not fire and navigate away mid-test.
    user: null,
    signInWithGoogle,
    signUpWithEmailPassword,
  }),
}));
vi.mock("../services/referralService", () => ({ creditPendingReferral: vi.fn() }));

import SignUpPage from "./SignUpPage";

afterEach(() => {
  cleanup();
  signUpWithEmailPassword.mockReset();
  signInWithGoogle.mockReset();
});

function renderSignUp() {
  return render(
    <MemoryRouter initialEntries={["/sign-up"]}>
      <SignUpPage />
    </MemoryRouter>,
  );
}

/** Fill the form. `name` omitted entirely means "leave the field untouched". */
async function fillAndSubmit(opts: { name?: string; email: string; password: string }) {
  const user = userEvent.setup();
  if (opts.name !== undefined && opts.name !== "") {
    await user.type(screen.getByLabelText("Your name"), opts.name);
  }
  await user.type(screen.getByLabelText("Email address"), opts.email);
  await user.type(screen.getByLabelText("Password"), opts.password);
  await user.click(screen.getByRole("button", { name: /create account/i }));
}

describe("SignUpPage — the name field exists and is labelled", () => {
  it("renders a labelled name input with a name autocomplete hint", () => {
    renderSignUp();
    const field = screen.getByLabelText("Your name");

    expect(field).toBeDefined();
    expect(field.getAttribute("type")).toBe("text");
    // Lets the browser/password manager offer the student's real name.
    expect(field.getAttribute("autocomplete")).toBe("name");
  });

  it("puts the name FIRST, before email and password", () => {
    const { container } = renderSignUp();
    const ids = Array.from(container.querySelectorAll("input")).map(i => i.id);

    expect(ids).toEqual(["lt-su-name", "lt-su-email", "lt-su-password"]);
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
