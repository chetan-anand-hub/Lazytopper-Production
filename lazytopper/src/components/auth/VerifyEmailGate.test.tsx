import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * VerifyEmailGate — the blocking check that protects a mistyped address.
 *
 * ── WHAT MUST HOLD ────────────────────────────────────────────────────────
 * The one-door flow CREATES an account when sign-in fails ambiguously, so a
 * typo produces a real, unrecoverable account on an inbox the student does not
 * own. This gate is the only thing standing between that typo and a week of
 * lost work, which makes three properties load-bearing:
 *
 *   1. The app must actually LEARN that verification happened. Firebase's
 *      handler runs in another tab, `reload()` re-emits nothing, so the app has
 *      to ask — and it must ask on more than one trigger.
 *   2. It must never claim success it has not observed (test: reload reports
 *      false ⇒ no advance), which is why the negative case has a positive
 *      CONTROL beside it.
 *   3. "Wrong address? Change it" must survive `auth/requires-recent-login`,
 *      or the student who typo'd — the exact student this exists for — is
 *      dead-ended.
 */

const H = vi.hoisted(() => ({
  currentUser: null as null | Record<string, unknown>,
  sendEmailVerification: vi.fn(async (_user: unknown) => {}),
  reload: vi.fn(async (_user: unknown) => {}),
  verifyBeforeUpdateEmail: vi.fn(async (_user: unknown, _newEmail: string) => {}),
  reauthenticateWithCredential: vi.fn(async (_user: unknown, _cred: unknown) => {}),
  credential: vi.fn((_email: string, _password: string) => ({ __brand: "cred" })),
}));

vi.mock("firebase/auth", () => ({
  sendEmailVerification: H.sendEmailVerification,
  reload: H.reload,
  verifyBeforeUpdateEmail: H.verifyBeforeUpdateEmail,
  reauthenticateWithCredential: H.reauthenticateWithCredential,
  EmailAuthProvider: { credential: H.credential },
}));

vi.mock("../../services/firebaseClient", () => ({
  get authClient() {
    return { currentUser: H.currentUser };
  },
  firebaseConfigured: true,
}));

import VerifyEmailGate, { SPAM_FOLDER_PROMPT } from "./VerifyEmailGate";

/** One tick past the component's 60s cooldown. */
const RESEND_COOLDOWN_MS = 61_000;

function authError(code: string) {
  return Object.assign(new Error(code), { code });
}

const onVerified = vi.fn();
const onStartOver = vi.fn();

function renderGate(props: Partial<React.ComponentProps<typeof VerifyEmailGate>> = {}) {
  return render(
    <VerifyEmailGate
      email="typo@gmial.com"
      onVerified={onVerified}
      onStartOver={onStartOver}
      {...props}
    />,
  );
}

beforeEach(() => {
  H.currentUser = { email: "typo@gmial.com", emailVerified: false };
  H.sendEmailVerification.mockReset();
  H.sendEmailVerification.mockResolvedValue(undefined);
  H.reload.mockReset();
  H.reload.mockResolvedValue(undefined);
  H.verifyBeforeUpdateEmail.mockReset();
  H.verifyBeforeUpdateEmail.mockResolvedValue(undefined);
  H.reauthenticateWithCredential.mockReset();
  H.reauthenticateWithCredential.mockResolvedValue(undefined);
  H.credential.mockClear();
  onVerified.mockReset();
  onStartOver.mockReset();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// 1 · The screen itself
// ---------------------------------------------------------------------------

describe("the gate screen", () => {
  it("sends the verification email once on mount and shows the address it went to", async () => {
    renderGate();

    await waitFor(() => expect(H.sendEmailVerification).toHaveBeenCalledTimes(1));
    expect(H.sendEmailVerification).toHaveBeenCalledWith(H.currentUser);
    expect(screen.getByTestId("lt-verify-address")).toHaveTextContent("typo@gmial.com");
  });

  it("prompts for the SPAM FOLDER — the sender domain is unfamiliar, so this is likely", () => {
    renderGate();
    expect(screen.getByTestId("lt-verify-spam")).toHaveTextContent(SPAM_FOLDER_PROMPT);
  });

  it("offers a way out to a student who signed in as the wrong person", async () => {
    renderGate();
    await userEvent.setup({ delay: null }).click(
      screen.getByRole("button", { name: "Use a different account" }),
    );
    expect(onStartOver).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 2 · Learning that verification happened
// ---------------------------------------------------------------------------

describe("how the app learns verification succeeded", () => {
  it("reloads the Firebase user and advances once it reports verified", async () => {
    renderGate();
    const u = userEvent.setup({ delay: null });

    // Firebase's hosted handler flipped the flag out of band; reload() is the
    // only way this tab can see it.
    H.reload.mockImplementation(async () => {
      if (H.currentUser) H.currentUser.emailVerified = true;
    });

    await u.click(screen.getByRole("button", { name: /I've verified/ }));

    await waitFor(() => expect(onVerified).toHaveBeenCalledTimes(1));
    expect(H.reload).toHaveBeenCalledWith(H.currentUser);
  });

  it("does NOT advance when reload still reports unverified, and says so honestly", async () => {
    renderGate();
    const u = userEvent.setup({ delay: null });

    // reload() resolves but the flag stays false — the student clicked before
    // opening the link. Advancing here would let an unverified address through,
    // which is the entire defect this gate exists to prevent.
    await u.click(screen.getByRole("button", { name: /I've verified/ }));

    await waitFor(() => expect(H.reload).toHaveBeenCalled());
    expect(onVerified).not.toHaveBeenCalled();
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Not verified yet. Open the link in the email, then try again.",
    );
  });

  it("re-checks when the student tabs back from their mail client", async () => {
    renderGate();
    await waitFor(() => expect(H.sendEmailVerification).toHaveBeenCalled());
    H.reload.mockImplementation(async () => {
      if (H.currentUser) H.currentUser.emailVerified = true;
    });

    // The highest-signal trigger: verification finishes in another tab, and
    // returning to this one is the moment the student expects it to have
    // noticed. No auth-state event fires for it.
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });

    await waitFor(() => expect(onVerified).toHaveBeenCalled());
  });

  it("advances only ONCE even if several triggers resolve", async () => {
    renderGate();
    H.reload.mockImplementation(async () => {
      if (H.currentUser) H.currentUser.emailVerified = true;
    });

    await act(async () => {
      window.dispatchEvent(new Event("focus"));
      window.dispatchEvent(new Event("focus"));
    });

    await waitFor(() => expect(onVerified).toHaveBeenCalled());
    expect(onVerified).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// 3 · Resend
// ---------------------------------------------------------------------------

describe("resend", () => {
  /**
   * ⚠ TIMER DISCIPLINE. `await act(async () => ...)` under fake timers hangs —
   * React's async act schedules a real macrotask that the fake clock never
   * fires, and a test that times out mid-`await` never reaches a `finally`, so
   * the fake clock leaks and every later real-timer test hangs too. That is
   * what a first pass at this file did: one broken test took eight healthy ones
   * with it. So the clock is advanced inside a SYNCHRONOUS `act`, handed back
   * before any user interaction, and restored in an `afterEach` that runs
   * whatever happens.
   */
  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts on cooldown and re-sends once it expires", async () => {
    vi.useFakeTimers();
    renderGate();

    // Cooling down: a student who mashes this burns the Firebase rate limit and
    // gets locked out of the only path forward.
    expect(screen.getByRole("button", { name: /Resend in \d+s/ })).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(RESEND_COOLDOWN_MS);
    });

    const ready = screen.getByRole("button", { name: "Resend the email" });
    expect(ready).not.toBeDisabled();

    vi.useRealTimers();
    H.sendEmailVerification.mockClear();
    await userEvent.setup({ delay: null }).click(ready);

    await waitFor(() => expect(H.sendEmailVerification).toHaveBeenCalledTimes(1));
    // ...and it goes back on cooldown rather than staying hot.
    expect(screen.getByRole("button", { name: /Resend in \d+s/ })).toBeDisabled();
  });

  it("reports a rate limit rather than pretending the mail was sent", async () => {
    vi.useFakeTimers();
    renderGate();
    act(() => {
      vi.advanceTimersByTime(RESEND_COOLDOWN_MS);
    });
    vi.useRealTimers();

    H.sendEmailVerification.mockRejectedValue(authError("auth/too-many-requests"));
    await userEvent.setup({ delay: null }).click(
      screen.getByRole("button", { name: "Resend the email" }),
    );

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Too many requests. Please wait a few minutes before trying again.",
      ),
    );
  });
});

// ---------------------------------------------------------------------------
// 4 · Changing a mistyped address — the flow the gate exists for
// ---------------------------------------------------------------------------

describe("wrong address? change it", () => {
  async function openChange() {
    const u = userEvent.setup({ delay: null });
    renderGate({ knownPassword: "hunter2secret" });
    await u.click(screen.getByRole("button", { name: "Wrong address? Change it" }));
    return u;
  }

  it("sends the confirmation to the NEW address via verifyBeforeUpdateEmail", async () => {
    const u = await openChange();

    await u.type(screen.getByLabelText("New email address"), "ananya@gmail.com");
    await u.click(screen.getByRole("button", { name: /Send link to the new address/ }));

    await waitFor(() =>
      expect(H.verifyBeforeUpdateEmail).toHaveBeenCalledWith(H.currentUser, "ananya@gmail.com"),
    );
    // The account only switches over once the NEW inbox is proven, so a second
    // typo cannot strand the student again.
    await waitFor(() =>
      expect(screen.getByTestId("lt-verify-address")).toHaveTextContent("ananya@gmail.com"),
    );
  });

  it("⚠ recovers from auth/requires-recent-login by re-authenticating, then retries ONCE", async () => {
    const u = await openChange();

    // The documented failure for a session that is not fresh — a student who
    // signed up yesterday, closed the tab and came back. They just re-entered
    // their password on the door, so we can prove possession without asking
    // twice. Without this the student this gate exists for is dead-ended.
    H.verifyBeforeUpdateEmail
      .mockRejectedValueOnce(authError("auth/requires-recent-login"))
      .mockResolvedValueOnce(undefined);

    await u.type(screen.getByLabelText("New email address"), "ananya@gmail.com");
    await u.click(screen.getByRole("button", { name: /Send link to the new address/ }));

    await waitFor(() => expect(H.reauthenticateWithCredential).toHaveBeenCalledTimes(1));
    expect(H.credential).toHaveBeenCalledWith("typo@gmial.com", "hunter2secret");
    expect(H.verifyBeforeUpdateEmail).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("does not retry forever — a SECOND failure is reported, not re-attempted", async () => {
    const u = await openChange();
    H.verifyBeforeUpdateEmail.mockRejectedValue(authError("auth/requires-recent-login"));

    await u.type(screen.getByLabelText("New email address"), "ananya@gmail.com");
    await u.click(screen.getByRole("button", { name: /Send link to the new address/ }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(H.verifyBeforeUpdateEmail).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "For your security, sign in again before changing your address.",
    );
  });

  it("without a known password it asks the student to sign in again rather than looping", async () => {
    const u = userEvent.setup({ delay: null });
    renderGate(); // no knownPassword — a restored session
    await u.click(screen.getByRole("button", { name: "Wrong address? Change it" }));
    H.verifyBeforeUpdateEmail.mockRejectedValue(authError("auth/requires-recent-login"));

    await u.type(screen.getByLabelText("New email address"), "ananya@gmail.com");
    await u.click(screen.getByRole("button", { name: /Send link to the new address/ }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    // One attempt, no re-auth, an honest message.
    expect(H.reauthenticateWithCredential).not.toHaveBeenCalled();
    expect(H.verifyBeforeUpdateEmail).toHaveBeenCalledTimes(1);
  });

  it("refuses an address already used by another account, with its own message", async () => {
    const u = await openChange();
    H.verifyBeforeUpdateEmail.mockRejectedValue(authError("auth/email-already-in-use"));

    await u.type(screen.getByLabelText("New email address"), "taken@gmail.com");
    await u.click(screen.getByRole("button", { name: /Send link to the new address/ }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "That address is already used by another account. Try a different one.",
      ),
    );
  });

  it("does not call Firebase for a blank address", async () => {
    const u = await openChange();
    await u.click(screen.getByRole("button", { name: /Send link to the new address/ }));

    expect(H.verifyBeforeUpdateEmail).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Enter your email address.");
  });
});
