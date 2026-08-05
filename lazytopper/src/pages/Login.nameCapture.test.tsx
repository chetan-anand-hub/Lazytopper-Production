import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { AuthUser } from "../context/AuthContext";

/**
 * NAME-1 — THE ONE DOOR CAPTURES A NAME.
 *
 * ── THE DEFECT THIS CLOSES ────────────────────────────────────────────────
 * `AuthDoor` collects a name when `intent="create"`, and `/sign-up` passes
 * that intent. But NOTHING IN THE PRODUCT LINKS TO `/sign-up` — its only
 * references in `src/` are App.tsx's two `<Route>` lines, against nine
 * navigational links to `/login`. Every real student therefore entered
 * through `intent="signin"`, whose try-then-create called
 * `signUpWithEmailPassword(email, password)` with no third argument. Since
 * that call is the ONLY `updateProfile` in product code, every account in
 * the product was created with a null `displayName`, and each shell surface
 * fell back to rendering the student's raw email address as their name.
 *
 * Mount ≠ live, one layer up: the component was reachable, the page was not.
 *
 * ── WHY THE PROMPT SITS WHERE IT DOES ─────────────────────────────────────
 * The name must be in hand BEFORE `signUpWithEmailPassword` runs, because
 * once it returns there is no second writer to backfill with. So the prompt
 * lands on the AMBIGUOUS branch — after sign-in has failed with a code that
 * cannot separate "wrong password" from "no such account", and before the
 * create call commits.
 *
 * That placement is what makes it enumeration-safe, and §3 below proves it
 * by CONSTRUCTION rather than by inspecting copy: at the moment the prompt
 * appears the create call has not run, so the UI cannot yet depend on
 * whether the address is registered.
 */

const signInWithEmailPassword = vi.fn(async (_email: string, _password: string) => {});
const signUpWithEmailPassword =
  vi.fn(async (_email: string, _password: string, _displayName?: string) => {});
const signInWithGoogle = vi.fn(async () => {});
const sendPasswordReset = vi.fn(async (_email: string) => {});
const initPhoneRecaptcha = vi.fn(async (_containerId: string) => {});
const sendPhoneOtp = vi.fn(async (_phoneE164: string, _containerId: string) => {});
const verifyPhoneOtp = vi.fn(async (_code: string) => {});
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

import Login, { AuthDoor } from "./Login";

/** A distinctive local part, so "is the name derived from the email?" is decidable. */
const NEW_EMAIL = "rk9982@example.com";
const NEW_LOCAL_PART = "rk9982";
const PASSWORD = "hunter2secret";
const REAL_NAME = "Ritika Kapoor";

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

/** Walk the door to the email form and submit it once. */
async function submitEmail(email: string, password: string) {
  const u = userEvent.setup({ delay: null });
  await u.click(screen.getByRole("button", { name: /Continue with email/ }));
  await u.type(screen.getByLabelText("Email address"), email);
  await u.type(screen.getByLabelText("Password"), password);
  await u.click(screen.getByRole("button", { name: /^Continue as/ }));
  return u;
}

/** Submit again after the name field has appeared. */
async function submitAgain(u: ReturnType<typeof userEvent.setup>) {
  await u.click(screen.getByRole("button", { name: /^Continue as/ }));
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
// 1 · The account is created WITH a name — tests 1, 2 and 7
// ---------------------------------------------------------------------------

describe("a new account is created with a real name", () => {
  it("passes the typed name as the THIRD argument to signUpWithEmailPassword", async () => {
    renderDoor();
    signInWithEmailPassword.mockRejectedValue(authError("auth/invalid-credential"));

    const u = await submitEmail(NEW_EMAIL, PASSWORD);
    await u.type(await screen.findByLabelText("Your name"), REAL_NAME);
    await submitAgain(u);

    await waitFor(() => expect(signUpWithEmailPassword).toHaveBeenCalled());

    // ★ POSITIONAL, not just "was called with a name somewhere". The context
    // signature is (email, password, displayName?) and only the third slot is
    // read by `updateProfile`.
    const call = signUpWithEmailPassword.mock.calls[0];
    expect(call[0]).toBe(NEW_EMAIL);
    expect(call[1]).toBe(PASSWORD);
    expect(call[2]).toBe(REAL_NAME);
    expect(call).toHaveLength(3);
  });

  it("creates with a NON-EMPTY displayName — never a blank third argument", async () => {
    renderDoor();
    signInWithEmailPassword.mockRejectedValue(authError("auth/invalid-credential"));

    const u = await submitEmail(NEW_EMAIL, PASSWORD);
    await u.type(await screen.findByLabelText("Your name"), REAL_NAME);
    await submitAgain(u);

    await waitFor(() => expect(signUpWithEmailPassword).toHaveBeenCalled());
    const passedName = signUpWithEmailPassword.mock.calls[0][2];
    expect(passedName).toBeTruthy();
    expect((passedName ?? "").trim()).not.toBe("");
  });

  it("REFUSES to create while the name is blank — the field is required, not optional", async () => {
    // The create door already records why: an account created without a name
    // cannot be backfilled without asking again, so an OPTIONAL field would
    // close the defect only for students who happened to fill it in and
    // permanently re-create it for everyone who skipped.
    renderDoor();
    signInWithEmailPassword.mockRejectedValue(authError("auth/invalid-credential"));

    const u = await submitEmail(NEW_EMAIL, PASSWORD);
    expect(await screen.findByLabelText("Your name")).toBeTruthy();
    expect(signUpWithEmailPassword).not.toHaveBeenCalled();

    // Submitting again with the field still blank must not commit either.
    await submitAgain(u);
    await waitFor(() => expect(signInWithEmailPassword).toHaveBeenCalledTimes(2));
    expect(signUpWithEmailPassword).not.toHaveBeenCalled();
  });

  it("whitespace alone is not a name", async () => {
    renderDoor();
    signInWithEmailPassword.mockRejectedValue(authError("auth/invalid-credential"));

    const u = await submitEmail(NEW_EMAIL, PASSWORD);
    await u.type(await screen.findByLabelText("Your name"), "   ");
    await submitAgain(u);

    await waitFor(() => expect(signInWithEmailPassword).toHaveBeenCalledTimes(2));
    expect(signUpWithEmailPassword).not.toHaveBeenCalled();
  });

  it("★ the name is NOT the raw email and NOT a fragment of it", async () => {
    // The defect being closed is the shell rendering "rk9982@example.com" where
    // a name belongs. Deriving a name from the local part would render
    // "rk9982" instead — a different presentation of the same defect, not a fix.
    renderDoor();
    signInWithEmailPassword.mockRejectedValue(authError("auth/invalid-credential"));

    const u = await submitEmail(NEW_EMAIL, PASSWORD);
    await u.type(await screen.findByLabelText("Your name"), REAL_NAME);
    await submitAgain(u);

    await waitFor(() => expect(signUpWithEmailPassword).toHaveBeenCalled());
    const passedName = signUpWithEmailPassword.mock.calls[0][2] ?? "";

    expect(passedName).toBe(REAL_NAME);
    expect(passedName).not.toBe(NEW_EMAIL);
    expect(passedName).not.toContain("@");
    expect(passedName).not.toContain(NEW_LOCAL_PART);
    expect(passedName).not.toContain("example.com");
  });

  it("trims the name before sending it", async () => {
    renderDoor();
    signInWithEmailPassword.mockRejectedValue(authError("auth/invalid-credential"));

    const u = await submitEmail(NEW_EMAIL, PASSWORD);
    await u.type(await screen.findByLabelText("Your name"), "  Ritika Kapoor  ");
    await submitAgain(u);

    await waitFor(() => expect(signUpWithEmailPassword).toHaveBeenCalled());
    expect(signUpWithEmailPassword.mock.calls[0][2]).toBe(REAL_NAME);
  });
});

// ---------------------------------------------------------------------------
// 2 · A returning student is never asked — test 3
// ---------------------------------------------------------------------------

describe("a returning student is NOT asked for a name", () => {
  it("★ signing in successfully never renders a name field at all", async () => {
    renderDoor();
    signInWithEmailPassword.mockResolvedValue(undefined);

    await submitEmail("known@example.com", PASSWORD);

    await waitFor(() => expect(signInWithEmailPassword).toHaveBeenCalled());
    expect(screen.queryByLabelText("Your name")).toBeNull();
    expect(screen.queryByTestId("lt-name-request")).toBeNull();
    // Reaching create at all would attempt to re-create a live account.
    expect(signUpWithEmailPassword).not.toHaveBeenCalled();
  });

  it("★ CONTROL — the very same selectors DO find the field once the flow needs it", async () => {
    // Without this, the absences above would pass just as happily if the label
    // had been renamed or the form had failed to render entirely.
    renderDoor();
    signInWithEmailPassword.mockRejectedValue(authError("auth/invalid-credential"));

    await submitEmail(NEW_EMAIL, PASSWORD);

    expect(await screen.findByLabelText("Your name")).toBeTruthy();
    expect(screen.getByTestId("lt-name-request")).toBeTruthy();
  });

  it("a returning student's name is never sent even if the field was shown first", async () => {
    // They mistyped the password, saw the prompt, then corrected the password.
    // Sign-in now succeeds and the create call — the only thing that consumes a
    // name — is never reached.
    renderDoor();
    signInWithEmailPassword.mockRejectedValueOnce(authError("auth/invalid-credential"));

    const u = await submitEmail("known@example.com", "wrongpassword");
    expect(await screen.findByLabelText("Your name")).toBeTruthy();

    signInWithEmailPassword.mockResolvedValue(undefined);
    await submitAgain(u);

    await waitFor(() => expect(signInWithEmailPassword).toHaveBeenCalledTimes(2));
    expect(signUpWithEmailPassword).not.toHaveBeenCalled();
  });

  it("a NON-AMBIGUOUS failure never asks for a name — it keeps its accurate message", async () => {
    renderDoor();
    signInWithEmailPassword.mockRejectedValue(authError("auth/too-many-requests"));

    await submitEmail("known@example.com", PASSWORD);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Too many attempts. Please try again in a few minutes.",
    );
    expect(screen.queryByLabelText("Your name")).toBeNull();
    expect(signUpWithEmailPassword).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 3 · No enumeration disclosure — test 4
// ---------------------------------------------------------------------------

describe("★★ the name prompt discloses nothing about the address", () => {
  it("renders no 'no account found' wording at the moment the prompt appears", async () => {
    renderDoor();
    signInWithEmailPassword.mockRejectedValue(authError("auth/invalid-credential"));

    await submitEmail(NEW_EMAIL, PASSWORD);

    // CONTROL FIRST — the prompt really is on screen, so these absences mean
    // something.
    expect(await screen.findByTestId("lt-name-request")).toBeTruthy();
    expect(screen.getByLabelText("Your name")).toBeTruthy();

    expect(screen.queryByText(/no account found/i)).toBeNull();
    expect(screen.queryByText(/don't have an account yet\?/i)).toBeNull();
    expect(screen.queryByText(/create one\?/i)).toBeNull();
    expect(screen.queryByText(/not registered/i)).toBeNull();
    expect(screen.queryByText(/isn't registered/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /Create my account/ })).toBeNull();
  });

  it("★★ the prompt is byte-identical whether or not the account exists", async () => {
    // THE PROOF, and it is structural rather than a reading of the copy: at the
    // moment the prompt appears the create call HAS NOT RUN, and the create
    // call is the only thing on this page that can tell the two worlds apart
    // (`auth/email-already-in-use`). So the rendered form cannot depend on the
    // address's existence — there is no branch for it to depend on.

    // WORLD A — the address is unregistered. Create would succeed.
    signInWithEmailPassword.mockRejectedValue(authError("auth/invalid-credential"));
    signUpWithEmailPassword.mockResolvedValue(undefined);
    renderDoor();
    await submitEmail(NEW_EMAIL, PASSWORD);
    await screen.findByTestId("lt-name-request");
    const worldA = (screen.getByTestId("lt-name-request").closest("form") as HTMLFormElement)
      .textContent;
    const createCallsA = signUpWithEmailPassword.mock.calls.length;
    cleanup();

    // WORLD B — the address IS registered and the password was wrong. Create
    // would reject with email-already-in-use.
    signUpWithEmailPassword.mockRejectedValue(authError("auth/email-already-in-use"));
    renderDoor();
    await submitEmail(NEW_EMAIL, PASSWORD);
    await screen.findByTestId("lt-name-request");
    const worldB = (screen.getByTestId("lt-name-request").closest("form") as HTMLFormElement)
      .textContent;
    const createCallsB = signUpWithEmailPassword.mock.calls.length;

    expect(worldA).toBe(worldB);
    // ...and the reason it is identical: neither world has probed yet.
    expect(createCallsA).toBe(0);
    expect(createCallsB).toBe(0);
  });

  it("the notice states the ambiguity as a CONDITION, never as a finding", async () => {
    renderDoor();
    signInWithEmailPassword.mockRejectedValue(authError("auth/invalid-credential"));

    await submitEmail(NEW_EMAIL, PASSWORD);
    const notice = (await screen.findByTestId("lt-name-request")).textContent ?? "";

    // Conditional framing, and an action for the student who is NOT new.
    expect(notice).toMatch(/if you're new/i);
    expect(notice).toMatch(/correct your password/i);
    // Never an assertion about this particular address.
    expect(notice).not.toMatch(/no account/i);
    expect(notice).not.toMatch(/doesn't exist/i);
    expect(notice).not.toMatch(/isn't registered/i);
  });

  it("the prompt is role=status, not role=alert — a new student is not shown an error", async () => {
    renderDoor();
    signInWithEmailPassword.mockRejectedValue(authError("auth/invalid-credential"));

    await submitEmail(NEW_EMAIL, PASSWORD);

    expect(await screen.findByTestId("lt-name-request")).toBeTruthy();
    // AUTH-3's property: the path to being created carries no error.
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("the email step still asks nothing about having an account BEFORE any submit", async () => {
    renderDoor();
    const u = userEvent.setup({ delay: null });
    await u.click(screen.getByRole("button", { name: /Continue with email/ }));

    expect(screen.queryByLabelText("Your name")).toBeNull();
    expect(screen.queryByTestId("lt-name-request")).toBeNull();
    expect(screen.queryByText(/no account found/i)).toBeNull();

    // CONTROL — the form is genuinely rendered.
    expect(screen.getByLabelText("Email address")).toBeTruthy();
    expect(screen.getByLabelText("Password")).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 4 · Nothing downstream regressed — tests 5 and 6
// ---------------------------------------------------------------------------

describe("the surrounding contracts survive", () => {
  it("the verification gate still fires for the account this flow creates", async () => {
    signInWithEmailPassword.mockRejectedValue(authError("auth/invalid-credential"));
    const view = renderDoor();

    const u = await submitEmail(NEW_EMAIL, PASSWORD);
    await u.type(await screen.findByLabelText("Your name"), REAL_NAME);
    await submitAgain(u);
    await waitFor(() => expect(signUpWithEmailPassword).toHaveBeenCalled());

    // Firebase has now created and signed in the account; the auth-state event
    // that follows carries emailVerified: false.
    authState.user = user({
      email: NEW_EMAIL,
      displayName: REAL_NAME,
      providerIds: ["password"],
      emailVerified: false,
    });
    view.rerender(
      <MemoryRouter initialEntries={[{ pathname: "/login" }]}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<div>LANDED ON HOME</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByTestId("lt-verify-gate")).toBeTruthy();
    expect(screen.queryByText("LANDED ON HOME")).toBeNull();
  });

  it("the `from` round-trip still lands a signed-in student back where they were gated", async () => {
    authState.user = user({
      email: "ananya@example.com",
      displayName: "Ananya Sharma",
      providerIds: ["password"],
      emailVerified: true,
    });
    renderDoor({ pathname: "/login", state: { from: "/check-improve" } });

    expect(await screen.findByText("LANDED ON CHECK AND IMPROVE")).toBeTruthy();
  });

  it("the signin door asks nothing up front, and still warns that creation may happen", async () => {
    renderDoor();
    const u = userEvent.setup({ delay: null });
    await u.click(screen.getByRole("button", { name: /Continue with email/ }));

    expect(screen.queryByLabelText("Your name")).toBeNull();
    expect(
      screen.getByText(/If you don't have an account yet, we'll create one\./),
    ).toBeTruthy();
  });

  it("★ the CREATE door still asks up front AND still sends the name as the third argument", async () => {
    // ⚠ THIS TEST EXISTS BECAUSE A MUTATION CAUGHT ITS ABSENCE. Dropping the
    // third argument from the `isCreate` call site was SILENT — every suite
    // stayed green — because nothing mounted `AuthDoor` with intent="create".
    // `/sign-up` is unreachable from the product, so no test had ever gone
    // through it, which is how the create door came to be the only named
    // capture path while being the one nobody could reach.
    //
    // NAME-1 adds a second capture point; it does not remove the first. If
    // `/sign-up` is ever linked, this is what proves it still works.
    render(
      <MemoryRouter initialEntries={[{ pathname: "/sign-up" }]}>
        <Routes>
          <Route
            path="/sign-up"
            element={<AuthDoor intent="create" recaptchaContainerId="lt-signup-recaptcha" />}
          />
          <Route path="/" element={<div>LANDED ON HOME</div>} />
        </Routes>
      </MemoryRouter>,
    );

    const u = userEvent.setup({ delay: null });
    await u.click(screen.getByRole("button", { name: /Continue with email/ }));

    // Asked UP FRONT here — before anything is submitted — which is the
    // difference between the two doors.
    const nameField = screen.getByLabelText("Your name");
    expect(nameField).toBeTruthy();

    await u.type(nameField, REAL_NAME);
    await u.type(screen.getByLabelText("Email address"), NEW_EMAIL);
    await u.type(screen.getByLabelText("Password"), PASSWORD);
    await u.click(screen.getByRole("button", { name: /Create my account/ }));

    await waitFor(() => expect(signUpWithEmailPassword).toHaveBeenCalled());
    const call = signUpWithEmailPassword.mock.calls[0];
    expect(call[2]).toBe(REAL_NAME);
    expect(call).toHaveLength(3);
    // The create door never probes with sign-in — it knows the intent.
    expect(signInWithEmailPassword).not.toHaveBeenCalled();
  });

  it("the create door REFUSES to create without a name", async () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: "/sign-up" }]}>
        <Routes>
          <Route
            path="/sign-up"
            element={<AuthDoor intent="create" recaptchaContainerId="lt-signup-recaptcha" />}
          />
        </Routes>
      </MemoryRouter>,
    );

    const u = userEvent.setup({ delay: null });
    await u.click(screen.getByRole("button", { name: /Continue with email/ }));
    await u.type(screen.getByLabelText("Email address"), NEW_EMAIL);
    await u.type(screen.getByLabelText("Password"), PASSWORD);
    await u.click(screen.getByRole("button", { name: /Create my account/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Enter your name.");
    expect(signUpWithEmailPassword).not.toHaveBeenCalled();
  });

  it("the forgot-password link is available throughout, including at the name prompt", async () => {
    // The returning student who mistyped their password reaches the prompt one
    // submit before the "that password doesn't match" message. Their route out
    // must be on screen the whole time.
    renderDoor();
    signInWithEmailPassword.mockRejectedValue(authError("auth/invalid-credential"));

    await submitEmail("known@example.com", "wrongpassword");

    expect(await screen.findByTestId("lt-name-request")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Forgot password?" })).toBeTruthy();
  });
});
