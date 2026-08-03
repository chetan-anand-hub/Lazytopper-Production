import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

/**
 * SignUpPage — phone sign-up is REACHABLE from /sign-up (PR-B3).
 *
 * Phone OTP was already LIVE, but only on /login. Firebase creates the account
 * on first phone sign-in, so a phone-only student COULD register — but only by
 * finding the Sign IN page, which no new user would think to do. Technically
 * met, practically broken. These tests pin the entry point and the round trip.
 *
 * The reCAPTCHA container id must be DISTINCT from Login's, and that is asserted
 * here rather than assumed: the two pages both render a verifier container, and
 * AuthContext keys its reuse decision on which container the live verifier was
 * rendered into.
 */

const initPhoneRecaptcha = vi.fn(async (_containerId: string) => {});
const sendPhoneOtp = vi.fn(async (_phoneE164: string, _containerId: string) => {});
const verifyPhoneOtp = vi.fn(async (_code: string) => {});
const signUpWithEmailPassword =
  vi.fn(async (_email: string, _password: string, _displayName?: string) => {});
const signInWithGoogle = vi.fn(async () => {});

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: null,
    signInWithGoogle,
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
  initPhoneRecaptcha.mockReset();
  sendPhoneOtp.mockReset();
  verifyPhoneOtp.mockReset();
  signUpWithEmailPassword.mockReset();
});

function renderSignUp() {
  return render(
    <MemoryRouter initialEntries={["/sign-up"]}>
      <SignUpPage />
    </MemoryRouter>,
  );
}

/**
 * ONE DOOR (AUTH-3): the Email/Phone TABS are gone. The method is a step on the
 * shared door now, so this clicks through it. Everything the suite actually
 * pins — the E.164 shape, the digit stripping, this page's OWN reCAPTCHA
 * container, and the fact that phone never touches the email path — is
 * unchanged, which is why only the navigation moved.
 */
async function openPhoneTab() {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: /Continue with phone/ }));
  return user;
}

describe("SignUpPage — the phone pane exists and is reachable", () => {
  it("offers Phone as an EQUAL method beside Google and Email — and no tabs", () => {
    renderSignUp();
    expect(screen.getByRole("button", { name: /Continue with phone/ })).toBeDefined();
    expect(screen.getByRole("button", { name: /Continue with email/ })).toBeDefined();
    expect(screen.getByRole("button", { name: /Continue with Google/ })).toBeDefined();
    // The sign-in/sign-up classification is what this redesign removes. If a
    // tab ever comes back, this fails.
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
  });

  it("swaps the form when Phone is chosen", async () => {
    renderSignUp();
    // CONTROL — neither method form is mounted on the door itself, so the
    // absence asserted after the swap means something.
    expect(screen.queryByLabelText("Mobile number")).toBeNull();
    expect(screen.queryByLabelText("Email address")).toBeNull();

    await openPhoneTab();

    expect(screen.getByLabelText("Mobile number")).toBeDefined();
    // The email form is gone, not merely hidden — one submit handler at a time.
    expect(screen.queryByLabelText("Email address")).toBeNull();
  });

  it("renders a reCAPTCHA container with an id DISTINCT from Login's", () => {
    const { container } = renderSignUp();
    expect(container.querySelector("#lt-signup-recaptcha")).not.toBeNull();
    expect(container.querySelector("#lt-login-recaptcha")).toBeNull();
  });

  it("warms the reCAPTCHA into its OWN container when the phone step opens", async () => {
    renderSignUp();
    expect(initPhoneRecaptcha).not.toHaveBeenCalled();

    await openPhoneTab();

    await waitFor(() => expect(initPhoneRecaptcha).toHaveBeenCalled());
    expect(initPhoneRecaptcha).toHaveBeenCalledWith("lt-signup-recaptcha");
  });
});

describe("SignUpPage — the OTP round trip", () => {
  it("sends the OTP to the E.164 number, then verifies the code", async () => {
    renderSignUp();
    const user = await openPhoneTab();

    await user.type(screen.getByLabelText("Mobile number"), "9876543210");
    await user.click(screen.getByRole("button", { name: /send otp/i }));

    await waitFor(() => expect(sendPhoneOtp).toHaveBeenCalled());
    // +91 is fixed in the UI; the number must reach Firebase in E.164 form and
    // through THIS page's container, not Login's.
    expect(sendPhoneOtp).toHaveBeenCalledWith("+919876543210", "lt-signup-recaptcha");

    // Step 2 — the code.
    await user.type(await screen.findByLabelText("Enter the 6-digit code"), "123456");
    await user.click(screen.getByRole("button", { name: /verify & continue/i }));

    await waitFor(() => expect(verifyPhoneOtp).toHaveBeenCalledWith("123456"));
  });

  it("rejects a short number before calling Firebase", async () => {
    renderSignUp();
    const user = await openPhoneTab();

    await user.type(screen.getByLabelText("Mobile number"), "98765");
    await user.click(screen.getByRole("button", { name: /send otp/i }));

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "Enter your 10-digit mobile number.",
    );
    // An SMS costs money and a malformed number burns the daily quota.
    expect(sendPhoneOtp).not.toHaveBeenCalled();
  });

  it("strips non-digits so a pasted number cannot reach Firebase malformed", async () => {
    renderSignUp();
    const user = await openPhoneTab();

    await user.type(screen.getByLabelText("Mobile number"), "98-765 432(10)");
    await user.click(screen.getByRole("button", { name: /send otp/i }));

    await waitFor(() => expect(sendPhoneOtp).toHaveBeenCalled());
    expect(sendPhoneOtp).toHaveBeenCalledWith("+919876543210", "lt-signup-recaptcha");
  });
});

describe("SignUpPage — phone sign-up never branches on email", () => {
  it("completes the phone flow without an email or password being supplied", async () => {
    // Phone-only students have NO email and NO password. Nothing in this flow
    // may require either, and the email/password signup path must not be
    // invoked as a side effect.
    renderSignUp();
    const user = await openPhoneTab();

    await user.type(screen.getByLabelText("Mobile number"), "9876543210");
    await user.click(screen.getByRole("button", { name: /send otp/i }));
    await user.type(await screen.findByLabelText("Enter the 6-digit code"), "123456");
    await user.click(screen.getByRole("button", { name: /verify & continue/i }));

    await waitFor(() => expect(verifyPhoneOtp).toHaveBeenCalled());
    expect(signUpWithEmailPassword).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Email address")).toBeNull();
    expect(screen.queryByLabelText("Password")).toBeNull();
  });
});
