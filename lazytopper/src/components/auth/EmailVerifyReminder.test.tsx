// ACTIVATION-1 · L1 — the non-blocking "verify your email" strip shows for unverified EMAIL
// accounts only, can be dismissed for the session, and resends from the strip.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AuthUser } from "../../context/AuthContext";

const auth = vi.hoisted(() => ({ user: null as AuthUser | null }));
const sendEmailVerification = vi.hoisted(() => vi.fn(async (_u: unknown) => {}));
const fbUser = vi.hoisted(() => ({
  current: { uid: "u1", emailVerified: false } as { uid: string; emailVerified: boolean } | null,
}));

vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: auth.user }) }));
vi.mock("firebase/auth", () => ({
  sendEmailVerification,
  reload: vi.fn(async () => {}),
}));
vi.mock("../../services/firebaseClient", () => ({
  get authClient() {
    return { currentUser: fbUser.current };
  },
}));

import EmailVerifyReminder, {
  VERIFY_REMINDER_COPY,
  VERIFY_REMINDER_DISMISS_KEY,
} from "./EmailVerifyReminder";

function user(partial: Partial<AuthUser>): AuthUser {
  return {
    uid: "u1",
    email: null,
    phoneNumber: null,
    displayName: null,
    providerIds: [],
    ...partial,
  };
}

beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
  sendEmailVerification.mockClear();
  fbUser.current = { uid: "u1", emailVerified: false };
});
afterEach(cleanup);

describe("EmailVerifyReminder — who sees it", () => {
  it("SHOWS for a signed-in email account whose address is unverified", () => {
    auth.user = user({ email: "new@example.com", providerIds: ["password"], emailVerified: false });
    render(<EmailVerifyReminder />);
    expect(screen.getByTestId("email-verify-reminder")).toHaveTextContent(
      VERIFY_REMINDER_COPY.text,
    );
  });

  it.each([
    ["signed out", null],
    [
      "a verified email account",
      user({ email: "a@example.com", providerIds: ["password"], emailVerified: true }),
    ],
    [
      "a Google account",
      user({ email: "a@gmail.com", providerIds: ["google.com"], emailVerified: true }),
    ],
    [
      "a phone account (no email, flag false)",
      user({ phoneNumber: "+919876543210", providerIds: ["phone"], emailVerified: false }),
    ],
    [
      "an unknown flag (older stored session)",
      user({ email: "o@example.com", providerIds: ["password"] }),
    ],
    [
      "a local session",
      user({ email: "l@example.com", emailVerified: false, isLocalSession: true }),
    ],
  ] as const)("does NOT show for %s", (_label, u) => {
    auth.user = u;
    render(<EmailVerifyReminder />);
    expect(screen.queryByTestId("email-verify-reminder")).toBeNull();
  });
});

describe("EmailVerifyReminder — actions", () => {
  beforeEach(() => {
    auth.user = user({ email: "new@example.com", providerIds: ["password"], emailVerified: false });
  });

  it("Resend link sends the verification email and says so", async () => {
    render(<EmailVerifyReminder />);
    await userEvent
      .setup({ delay: null })
      .click(screen.getByRole("button", { name: VERIFY_REMINDER_COPY.resend }));
    expect(sendEmailVerification).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(VERIFY_REMINDER_COPY.sent)).toBeTruthy();
  });

  it("dismissal hides it and is remembered for this session only (sessionStorage, not localStorage)", async () => {
    const { unmount } = render(<EmailVerifyReminder />);
    await userEvent
      .setup({ delay: null })
      .click(screen.getByRole("button", { name: VERIFY_REMINDER_COPY.dismiss }));
    expect(screen.queryByTestId("email-verify-reminder")).toBeNull();
    expect(window.sessionStorage.getItem(VERIFY_REMINDER_DISMISS_KEY)).toBe("1");
    expect(window.localStorage.length).toBe(0);

    unmount();
    render(<EmailVerifyReminder />); // the next page in the same tab
    expect(screen.queryByTestId("email-verify-reminder")).toBeNull();
  });
});
