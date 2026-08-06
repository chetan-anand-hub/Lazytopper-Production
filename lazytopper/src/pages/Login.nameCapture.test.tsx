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
 * references in `src/` are App.tsx's two `<Route>` lines. Every real student
 * therefore entered through `intent="signin"`, whose create call passed no
 * third argument. Since that call is the ONLY `updateProfile` in product
 * code, every account in the product was created with a null `displayName`,
 * and each shell surface fell back to rendering the student's raw email
 * address as their name.
 *
 * Mount ≠ live, one layer up: the component was reachable, the page was not.
 *
 * ── HOW v2 CHANGED THE MECHANISM ──────────────────────────────────────────
 * v1 asked for the name AFTER a sign-in attempt failed ambiguously, because
 * the page had to infer who was new and Enumeration Protection refuses to
 * say. It worked, but a returning student who mistyped a password paid an
 * extra submit before the page could tell them anything useful.
 *
 * ★★ v2 removes the inference: THE STUDENT DECLARES IT. That is not an
 * enumeration disclosure — no branch depends on a server answer, and nothing
 * on screen asserts that an address does or does not exist. Each branch then
 * makes exactly ONE call and reports its own outcome on the FIRST submit.
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

/** Open the email step. "I'm new here" is pre-selected on arrival. */
async function openEmailStep() {
  const u = userEvent.setup({ delay: null });
  await u.click(screen.getByRole("button", { name: /Continue with email/ }));
  return u;
}

/** Fill and submit the CREATE branch — one submit, no probe. */
async function createAccount(
  u: ReturnType<typeof userEvent.setup>,
  opts: { name?: string; email?: string; password?: string } = {},
) {
  if (opts.name) await u.type(screen.getByLabelText("Your name"), opts.name);
  await u.type(screen.getByLabelText("Email address"), opts.email ?? NEW_EMAIL);
  await u.type(screen.getByLabelText("Password"), opts.password ?? PASSWORD);
  await u.click(screen.getByRole("button", { name: /Create my account/ }));
}

/** Switch to the returning branch, fill and submit. */
async function signIn(
  u: ReturnType<typeof userEvent.setup>,
  opts: { email?: string; password?: string } = {},
) {
  await u.click(screen.getByRole("button", { name: "Already have an account" }));
  await u.type(screen.getByLabelText("Email address"), opts.email ?? NEW_EMAIL);
  await u.type(screen.getByLabelText("Password"), opts.password ?? PASSWORD);
  await u.click(screen.getByRole("button", { name: /^Sign in/ }));
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
// 1 · The account is created WITH a name — tests 1, 2 and the third argument
// ---------------------------------------------------------------------------

describe("a new account is created with a real name", () => {
  it("★ passes the typed name as the THIRD argument, in ONE submit", async () => {
    renderDoor();
    const u = await openEmailStep();
    await createAccount(u, { name: REAL_NAME });

    await waitFor(() => expect(signUpWithEmailPassword).toHaveBeenCalled());

    // ★ POSITIONAL, not just "was called with a name somewhere". The context
    // signature is (email, password, displayName?) and only the third slot is
    // read by `updateProfile`.
    const call = signUpWithEmailPassword.mock.calls[0];
    expect(call[0]).toBe(NEW_EMAIL);
    expect(call[1]).toBe(PASSWORD);
    expect(call[2]).toBe(REAL_NAME);
    expect(call).toHaveLength(3);

    // ★★ ONE submit, ONE call — and no probe. v1 called sign-in first.
    expect(signUpWithEmailPassword).toHaveBeenCalledTimes(1);
    expect(signInWithEmailPassword).not.toHaveBeenCalled();
  });

  it("creates with a NON-EMPTY displayName — never a blank third argument", async () => {
    renderDoor();
    const u = await openEmailStep();
    await createAccount(u, { name: REAL_NAME });

    await waitFor(() => expect(signUpWithEmailPassword).toHaveBeenCalled());
    const passedName = signUpWithEmailPassword.mock.calls[0][2];
    expect(passedName).toBeTruthy();
    expect((passedName ?? "").trim()).not.toBe("");
  });

  it("REFUSES to create while the name is blank — the field is required, not optional", async () => {
    // An account created without a name cannot be backfilled from this page, so
    // an OPTIONAL field would close the defect only for students who happened to
    // fill it in and permanently re-create it for everyone who skipped.
    renderDoor();
    const u = await openEmailStep();
    await createAccount(u); // no name

    expect(await screen.findByRole("alert")).toHaveTextContent("Enter your name.");
    expect(signUpWithEmailPassword).not.toHaveBeenCalled();
  });

  it("whitespace alone is not a name", async () => {
    renderDoor();
    const u = await openEmailStep();
    await createAccount(u, { name: "   " });

    expect(await screen.findByRole("alert")).toHaveTextContent("Enter your name.");
    expect(signUpWithEmailPassword).not.toHaveBeenCalled();
  });

  it("★ the name is NOT the raw email and NOT a fragment of it", async () => {
    // The defect being closed is the shell rendering "rk9982@example.com" where
    // a name belongs. Deriving a name from the local part would render "rk9982"
    // instead — a different presentation of the same defect, not a fix.
    renderDoor();
    const u = await openEmailStep();
    await createAccount(u, { name: REAL_NAME });

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
    const u = await openEmailStep();
    await createAccount(u, { name: "  Ritika Kapoor  " });

    await waitFor(() => expect(signUpWithEmailPassword).toHaveBeenCalled());
    expect(signUpWithEmailPassword.mock.calls[0][2]).toBe(REAL_NAME);
  });
});

// ---------------------------------------------------------------------------
// 2 · The returning branch — never asked, and answered on the first submit
// ---------------------------------------------------------------------------

describe("a returning student is NOT asked for a name", () => {
  it("★★ the returning branch never renders a name field at all", async () => {
    renderDoor();
    const u = await openEmailStep();
    await u.click(screen.getByRole("button", { name: "Already have an account" }));

    expect(screen.queryByLabelText("Your name")).toBeNull();

    // CONTROL — the same selector DOES find it on the other branch, so the
    // absence is a fact about this branch and not a renamed label.
    await u.click(screen.getByRole("button", { name: "I'm new here" }));
    expect(screen.getByLabelText("Your name")).toBeTruthy();
  });

  it("★★ a failed sign-in is reported on the FIRST submit — no create attempt", async () => {
    // This is what the self-declaration bought. v1 had to attempt a create
    // before it could learn anything, so this message cost an extra round trip.
    renderDoor();
    signInWithEmailPassword.mockRejectedValue(authError("auth/invalid-credential"));

    const u = await openEmailStep();
    await signIn(u, { password: "wrongpassword" });

    await screen.findByRole("alert");
    expect(signInWithEmailPassword).toHaveBeenCalledTimes(1);
    expect(signUpWithEmailPassword).not.toHaveBeenCalled();
  });

  it("★ the failure copy does NOT assert the account exists", async () => {
    renderDoor();
    signInWithEmailPassword.mockRejectedValue(authError("auth/invalid-credential"));

    const u = await openEmailStep();
    await signIn(u, { password: "wrongpassword" });

    const text = (await screen.findByRole("alert")).textContent ?? "";
    // ⚠ The same code comes back for an address with NO account, so naming the
    // password as the fault would be an existence oracle written by hand.
    expect(text).toContain("That email and password didn't match");
    expect(text).not.toMatch(/that password (is|doesn't|did not)/i);
    expect(text).not.toMatch(/your account/i);
    // ...and it hands over every route out, including the honest resolution of
    // the ambiguity: they may simply be new.
    expect(text).toMatch(/reset your password/i);
    expect(text).toMatch(/new here/i);
  });

  it("a returning student's name is never sent, even after switching modes", async () => {
    renderDoor();
    signInWithEmailPassword.mockResolvedValue(undefined);

    const u = await openEmailStep();
    // Typed a name on the create branch, then realised they are returning.
    await u.type(screen.getByLabelText("Your name"), REAL_NAME);
    await signIn(u);

    await waitFor(() => expect(signInWithEmailPassword).toHaveBeenCalled());
    // `signInWithEmailPassword` takes no name, and create — the only thing that
    // consumes one — is never reached.
    expect(signInWithEmailPassword).toHaveBeenCalledWith(NEW_EMAIL, PASSWORD);
    expect(signUpWithEmailPassword).not.toHaveBeenCalled();
  });

  it("★ 'I'm new here' is pre-selected on entry to the email step", async () => {
    renderDoor();
    await openEmailStep();

    const group = screen.getByRole("group", { name: /already have an account/i });
    expect(group).toBeTruthy();
    expect(screen.getByRole("button", { name: "I'm new here" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(
      screen.getByRole("button", { name: "Already have an account" }).getAttribute("aria-pressed"),
    ).toBe("false");
  });

  it("switching modes clears an error that described the OTHER branch's attempt", async () => {
    renderDoor();
    signInWithEmailPassword.mockRejectedValue(authError("auth/invalid-credential"));

    const u = await openEmailStep();
    await signIn(u, { password: "wrongpassword" });
    expect(await screen.findByRole("alert")).toBeTruthy();

    await u.click(screen.getByRole("button", { name: "I'm new here" }));
    // Leaving a failure on screen after the student has already acted on it
    // would be reporting the wrong branch.
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 3 · No enumeration disclosure — on EITHER branch
// ---------------------------------------------------------------------------

describe("★★ neither branch discloses whether an address is registered", () => {
  it("renders no 'no account found' wording on the CREATE branch", async () => {
    renderDoor();
    const u = await openEmailStep();
    await createAccount(u, { name: REAL_NAME });

    // CONTROL FIRST — the branch really ran.
    await waitFor(() => expect(signUpWithEmailPassword).toHaveBeenCalled());

    expect(screen.queryByText(/no account found/i)).toBeNull();
    expect(screen.queryByText(/create one\?/i)).toBeNull();
    expect(screen.queryByText(/not registered/i)).toBeNull();
    expect(screen.queryByText(/isn't registered/i)).toBeNull();
    expect(screen.queryByText(/doesn't exist/i)).toBeNull();
  });

  it("renders no 'no account found' wording on the RETURNING branch", async () => {
    renderDoor();
    signInWithEmailPassword.mockRejectedValue(authError("auth/invalid-credential"));

    const u = await openEmailStep();
    await signIn(u, { password: "wrongpassword" });

    // CONTROL FIRST — an alert really is on screen, so the absences below are
    // facts about its content and not about a failed render.
    expect(await screen.findByRole("alert")).toBeTruthy();

    expect(screen.queryByText(/no account found/i)).toBeNull();
    expect(screen.queryByText(/create one\?/i)).toBeNull();
    expect(screen.queryByText(/not registered/i)).toBeNull();
    expect(screen.queryByText(/isn't registered/i)).toBeNull();
    expect(screen.queryByText(/doesn't exist/i)).toBeNull();
  });

  it("★ the already-registered message invites a SWITCH, not a finding", async () => {
    // ⚠ Firebase returns `email-already-in-use` from create whatever the UI
    // does — Enumeration Protection covers sign-in only. This disclosure is
    // therefore INHERENT to any create path, including the try-then-create v1
    // shipped. It is not introduced by the redesign.
    renderDoor();
    signUpWithEmailPassword.mockRejectedValue(authError("auth/email-already-in-use"));

    const u = await openEmailStep();
    await createAccount(u, { name: REAL_NAME });

    const text = (await screen.findByRole("alert")).textContent ?? "";
    expect(text).toContain("already registered here");
    expect(text).toMatch(/Already have an account/);
    expect(text).toMatch(/reset your password/i);
    // Never phrased as an answer to "does this address have an account?".
    expect(text).not.toMatch(/no account/i);
    expect(text).not.toMatch(/already in use/i);
  });
});

// ---------------------------------------------------------------------------
// 4 · Surrounding contracts, and the create door — test 13, kept from v1
// ---------------------------------------------------------------------------

describe("the surrounding contracts survive", () => {
  it("the verification gate still fires for the account this flow creates", async () => {
    const view = renderDoor();
    const u = await openEmailStep();
    await createAccount(u, { name: REAL_NAME });
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

  it("forgot-password is reachable on BOTH branches", async () => {
    // A student who declared themselves new but is actually returning still
    // needs the route out; hiding it would push them into an
    // already-registered message with nothing to do about it.
    renderDoor();
    const u = await openEmailStep();
    expect(screen.getByRole("button", { name: "Forgot password?" })).toBeTruthy();

    await u.click(screen.getByRole("button", { name: "Already have an account" }));
    expect(screen.getByRole("button", { name: "Forgot password?" })).toBeTruthy();
  });

  it("★ the CREATE door still asks up front AND still sends the name as the third argument", async () => {
    // ⚠ THIS TEST EXISTS BECAUSE A MUTATION CAUGHT ITS ABSENCE. Dropping the
    // third argument from the `isCreate` call site was SILENT — every suite
    // stayed green — because nothing mounted `AuthDoor` with intent="create".
    // `/sign-up` is unreachable from the product, so no test had ever gone
    // through it, which is how the create door came to be the only named
    // capture path while being the one nobody could reach.
    //
    // ★ KEPT THROUGH THE v2 REWORK. The coverage hole exists whatever flow
    // ships, so this test outlives the mechanism that first exposed it.
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

    // The create door has no declaration control — its intent is already known.
    expect(screen.queryByTestId("lt-email-mode")).toBeNull();
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
});
