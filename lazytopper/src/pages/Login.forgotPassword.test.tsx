import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

/**
 * Login — "Forgot password?" recovery (Lane H-3).
 *
 * A student who forgot their email/password had NO way back into their account: the
 * only recovery was a new account, which discards their progress and Mistake
 * Intelligence evidence. This suite pins the recovery flow and, above all, the
 * ACCOUNT-ENUMERATION guarantee.
 *
 * These tests drive the REAL AuthProvider and the REAL Login page — the only thing
 * mocked is the Firebase SDK boundary itself. That matters: the anti-enumeration
 * branch lives in Login's catch, and mocking `useAuth` would let the test pass while
 * the production wiring was broken.
 */

// `vi.mock` factories are hoisted above the module body, so anything they close over
// must be created with `vi.hoisted` or it is still in the TDZ when the factory runs.
const H = vi.hoisted(() => ({
  AUTH_CLIENT: { __brand: "auth-client" } as Record<string, unknown>,
  sendPasswordResetEmail: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
}));

const { AUTH_CLIENT, sendPasswordResetEmail, signInWithEmailAndPassword } = H;

vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: class {
    setCustomParameters() {}
  },
  signInWithPopup: vi.fn(),
  signInWithEmailAndPassword: H.signInWithEmailAndPassword,
  createUserWithEmailAndPassword: vi.fn(),
  sendPasswordResetEmail: H.sendPasswordResetEmail,
  updateProfile: vi.fn(),
  signOut: vi.fn(async () => {}),
  RecaptchaVerifier: class {
    clear() {}
    async render() {}
  },
  signInWithPhoneNumber: vi.fn(),
  linkWithPhoneNumber: vi.fn(async () => ({ confirm: vi.fn() })),
  // AUTH-3: Login now renders VerifyEmailGate, which imports these. This
  // factory is a FULL replacement — vitest throws on any export it omits the
  // moment the importing module touches it — so they belong here even though
  // this suite never reaches the gate.
  sendEmailVerification: vi.fn(async () => {}),
  reload: vi.fn(async () => {}),
  verifyBeforeUpdateEmail: vi.fn(async () => {}),
  reauthenticateWithCredential: vi.fn(async () => {}),
  EmailAuthProvider: { credential: vi.fn(() => ({})) },
  // No signed-in user: Login must stay on the page rather than redirect away.
  onAuthStateChanged: (_client: unknown, cb: (u: unknown) => void) => {
    cb(null);
    return () => {};
  },
}));
vi.mock("../services/firebaseClient", () => ({
  authClient: H.AUTH_CLIENT,
  firebaseConfigured: true,
}));

// Post-login cloud hydration is irrelevant here and must not reach real Firestore.
vi.mock("../services/dbSyncService", () => ({ restoreFromDB: vi.fn(async () => {}) }));
vi.mock("../services/learnerAccountService", () => ({
  ensureLearnerAccountMetadata: vi.fn(async () => {}),
}));
vi.mock("../services/studentCloudStore", () => ({
  ensureLearnerCloudBaseline: vi.fn(async () => {}),
}));
vi.mock("../services/studentProgressStore", () => ({
  hydrateLocalProgressFromCloud: vi.fn(async () => {}),
  ensureLearnerProgressBaseline: vi.fn(async () => {}),
  setActiveProgressUser: vi.fn(),
}));
vi.mock("../services/mistakeLogService", () => ({
  hydrateMistakeLogsFromCloud: vi.fn(async () => {}),
}));
vi.mock("../services/subscriptionService", () => ({
  hydrateSubscriptionFromCloud: vi.fn(async () => ({})),
  activateTrial: vi.fn(),
}));
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: vi.fn() }));
vi.mock("../services/referralService", () => ({ creditPendingReferral: vi.fn() }));

import { AuthProvider } from "../context/AuthContext";
import Login from "./Login";

/**
 * The neutral confirmation, spelled out here rather than imported, so that changing
 * the copy in Login.tsx is a deliberate act that turns this suite red.
 */
const NEUTRAL_NOTICE =
  "If an account exists for that email, we've sent a reset link. Check your inbox and spam.";

// Each case mounts the real AuthProvider + the real Login page in jsdom, which is slow
// enough on a cold Windows runner to brush vitest's 5s default.
vi.setConfig({ testTimeout: 30000 });

function renderLogin() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </MemoryRouter>,
  );
}

/**
 * Open the inline reset pane and return a handle scoped to IT.
 *
 * Scoping matters: the sign-in form and the reset form both label their field "Email
 * address", so an un-scoped `getByLabelText` would happily match the sign-in field and
 * let a test pass while the reset pane never opened. `findByRole("form", ...)` both
 * disambiguates and asserts the pane is actually open.
 */
async function openResetPane() {
  // `delay: null` types the whole string without a per-keystroke timer. Left at the
  // default, a 20-character address alone can outrun vitest's 5s budget on a slow box.
  const user = userEvent.setup({ delay: null });
  renderLogin();
  // ONE DOOR (AUTH-3): the page now opens on the method choice, so the email
  // form — and with it "Forgot password?" — is one step in. The reset flow
  // itself is unchanged, and everything below this line still pins it.
  await user.click(screen.getByRole("button", { name: /Continue with email/ }));
  await user.click(screen.getByRole("button", { name: "Forgot password?" }));
  const form = await screen.findByRole("form", { name: "Reset your password" });
  return { user, form };
}

/** Open the reset pane, type an address, submit; return the rendered notice text. */
async function submitReset(address: string): Promise<string | null> {
  const { user, form } = await openResetPane();
  await user.type(within(form).getByLabelText("Email address"), address);
  await user.click(within(form).getByRole("button", { name: /Send reset link/ }));
  await waitFor(() => {
    const notice = screen.queryByTestId("lt-reset-notice");
    const alert = screen.queryByRole("alert");
    expect(notice || alert).toBeTruthy();
  });
  const notice = screen.queryByTestId("lt-reset-notice");
  return notice ? notice.textContent : null;
}

beforeEach(() => {
  localStorage.clear();
  sendPasswordResetEmail.mockReset();
  sendPasswordResetEmail.mockResolvedValue(undefined);
  signInWithEmailAndPassword.mockReset();
  signInWithEmailAndPassword.mockResolvedValue({});
});
afterEach(cleanup);

describe("Login — forgot password (test 1: the reset email is actually requested)", () => {
  it("submitting a registered email calls sendPasswordResetEmail with the trimmed address", async () => {
    await submitReset("  student@example.com  ");

    expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);
    expect(sendPasswordResetEmail).toHaveBeenCalledWith(AUTH_CLIENT, "student@example.com");
    expect(screen.getByTestId("lt-reset-notice")).toHaveTextContent(NEUTRAL_NOTICE);
  });
});

describe("Login — forgot password (test 2: ACCOUNT ENUMERATION — load-bearing)", () => {
  it("shows the IDENTICAL message for an unregistered email as for a registered one", async () => {
    // Registered: Firebase resolves.
    const registered = await submitReset("known@example.com");
    cleanup();

    // Unregistered: Firebase rejects with auth/user-not-found. Surfacing that would
    // turn this form into a "does this student have an account?" oracle.
    sendPasswordResetEmail.mockRejectedValue(
      Object.assign(new Error("no user"), { code: "auth/user-not-found" }),
    );
    const unregistered = await submitReset("nobody@example.com");

    expect(registered).toBe(NEUTRAL_NOTICE);
    expect(unregistered).toBe(registered);
  });

  it("renders no error alert for an unregistered email", async () => {
    sendPasswordResetEmail.mockRejectedValue(
      Object.assign(new Error("no user"), { code: "auth/user-not-found" }),
    );
    await submitReset("nobody@example.com");

    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByTestId("lt-reset-notice")).toHaveTextContent(NEUTRAL_NOTICE);
  });

  it.each([
    // Firebase projects with "Email enumeration protection" enabled return this instead.
    "auth/invalid-credential",
    // Reveals that the account exists, just barred — equally an enumeration leak.
    "auth/user-disabled",
    // An unrecognised / future code must fall to the SAFE side, never become an oracle.
    "auth/some-code-firebase-adds-later",
  ])("collapses %s into the same neutral notice", async (code) => {
    sendPasswordResetEmail.mockRejectedValue(Object.assign(new Error(code), { code }));
    const text = await submitReset("someone@example.com");

    expect(text).toBe(NEUTRAL_NOTICE);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("still surfaces request-shaped failures, which reveal nothing about the account", async () => {
    sendPasswordResetEmail.mockRejectedValue(
      Object.assign(new Error("bad"), { code: "auth/invalid-email" }),
    );
    const text = await submitReset("not-an-email");

    // No neutral notice — the request itself was malformed for ANY address.
    expect(text).toBeNull();
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid email address.");
  });

  it("surfaces a rate limit with human copy", async () => {
    sendPasswordResetEmail.mockRejectedValue(
      Object.assign(new Error("slow down"), { code: "auth/too-many-requests" }),
    );
    await submitReset("someone@example.com");

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Too many requests. Please try again in a few minutes.",
    );
  });
});

describe("Login — forgot password (test 3: the link belongs to the EMAIL pane only)", () => {
  it("renders in the email step and NOT in the phone step", async () => {
    const user = userEvent.setup({ delay: null });
    renderLogin();

    // ONE DOOR (AUTH-3): the tabs are gone. The method is a STEP now, so this
    // walks the door instead of flipping a tab — but the property under test is
    // unchanged: the reset link belongs to email and must never appear on phone.
    //
    // CONTROL — the link is genuinely absent on the DOOR too, not merely
    // un-found because the page failed to render.
    expect(screen.queryByRole("button", { name: "Forgot password?" })).toBeNull();
    expect(screen.getByRole("button", { name: /Continue with email/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Continue with email/ }));
    expect(screen.getByRole("button", { name: "Forgot password?" })).toBeInTheDocument();

    // Phone accounts have no password — the link must not appear there.
    await user.click(screen.getByRole("button", { name: "<- All sign-in options" }));
    await user.click(screen.getByRole("button", { name: /Continue with phone/ }));
    expect(screen.queryByRole("button", { name: "Forgot password?" })).toBeNull();

    // ...and the phone step still works.
    expect(screen.getByLabelText("Mobile number")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Send OTP/ })).toBeInTheDocument();

    // Back to email restores it.
    await user.click(screen.getByRole("button", { name: "<- All sign-in options" }));
    await user.click(screen.getByRole("button", { name: /Continue with email/ }));
    expect(screen.getByRole("button", { name: "Forgot password?" })).toBeInTheDocument();
  });

  it("leaving the email step closes an open reset state", async () => {
    const user = userEvent.setup({ delay: null });
    renderLogin();

    await user.click(screen.getByRole("button", { name: /Continue with email/ }));
    await user.click(screen.getByRole("button", { name: "Forgot password?" }));
    expect(screen.getByRole("button", { name: /Send reset link/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "<- All sign-in options" }));
    expect(screen.queryByRole("button", { name: /Send reset link/ })).toBeNull();

    await user.click(screen.getByRole("button", { name: /Continue with email/ }));
    // Back on the sign-in form, not stranded in the reset pane.
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Send reset link/ })).toBeNull();
  });

  it("does not call Firebase when the address is blank", async () => {
    const { user, form } = await openResetPane();

    await user.click(within(form).getByRole("button", { name: /Send reset link/ }));

    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Enter your email address.");
  });

  it("<- Back to sign in returns to the password form", async () => {
    const { user, form } = await openResetPane();
    expect(screen.queryByLabelText("Password")).toBeNull();

    await user.click(within(form).getByRole("button", { name: "<- Back to sign in" }));
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });
});
