import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * LinkPhoneNudge — the four showing conditions, and the returning-session
 * signal that condition 4 rests on.
 *
 * ★ EVERY "absent" CASE HERE IS PAIRED WITH THE CONTROL. A test that asserts
 * absence proves nothing on its own — `queryBy… → null` passes just as happily
 * when the component is broken, unmounted, or renaming its testid. Each block
 * therefore starts from the state that DOES render the nudge (`returningUser`)
 * and changes exactly one thing.
 */

const sendLinkPhoneOtp = vi.fn(async (_phone: string, _container: string) => {});
const confirmLinkPhoneOtp = vi.fn(async (_code: string) => {});

const H = vi.hoisted(() => ({
  user: null as null | Record<string, unknown>,
}));

// `importOriginal` spread, NOT a bare factory: a vi.mock factory REPLACES the
// module wholesale, so any export it omits THROWS rather than being undefined.
vi.mock("../../context/AuthContext", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../context/AuthContext")>();
  return {
    ...actual,
    useAuth: () => ({
      user: H.user,
      sendLinkPhoneOtp,
      confirmLinkPhoneOtp,
    }),
  };
});

import LinkPhoneNudge, {
  VISIT_COUNT_KEY,
  VISIT_SESSION_KEY,
  NUDGE_DISMISSED_KEY,
  recordHomeVisit,
} from "./LinkPhoneNudge";

/** A real Google account with no phone credential linked. */
const GOOGLE_ONLY = {
  uid: "GOOGLE-UID",
  email: "a@b.com",
  phoneNumber: null,
  displayName: "Ananya",
  providerIds: ["google.com"],
};

/**
 * Put the browser in the state of a student who has been here before: one
 * session already counted in localStorage, and this tab session not yet
 * counted. Mounting then takes the count to 2 = RETURNING.
 */
function asReturningBrowser() {
  localStorage.setItem(VISIT_COUNT_KEY, "1");
  sessionStorage.removeItem(VISIT_SESSION_KEY);
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  H.user = { ...GOOGLE_ONLY };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("LinkPhoneNudge — the CONTROL", () => {
  it("SHOWS for a returning, signed-in, unlinked, undismissed student", () => {
    asReturningBrowser();
    render(<LinkPhoneNudge />);
    expect(screen.getByTestId("link-phone-nudge")).toBeTruthy();
  });

  it("carries the owner-approved ACCESS copy, not progress framing", () => {
    asReturningBrowser();
    render(<LinkPhoneNudge />);
    const el = screen.getByTestId("link-phone-nudge");
    expect(el.textContent).toContain("Studying on your phone too?");
    expect(el.textContent).toContain(
      "Add your number so you can sign in either way.",
    );
    expect(screen.getByTestId("link-phone-nudge-cta").textContent).toBe(
      "Add my number",
    );
    expect(screen.getByTestId("link-phone-nudge-dismiss").textContent).toBe(
      "Not now",
    );
    // "progress follows you" is FALSE at low activity — it must not appear.
    expect(el.textContent).not.toMatch(/progress/i);
  });
});

describe("LinkPhoneNudge — condition 2: no phone credential linked", () => {
  it("is ABSENT for a student who already linked a phone", () => {
    asReturningBrowser();
    H.user = { ...GOOGLE_ONLY, providerIds: ["google.com", "phone"] };
    render(<LinkPhoneNudge />);
    expect(screen.queryByTestId("link-phone-nudge")).toBeNull();
  });

  /**
   * ★ Reads the CREDENTIAL, never the profile field. A Google account can carry
   * a phoneNumber with no phone credential linked — that student still needs
   * the nudge, and inferring from `phoneNumber` would silently deny it.
   */
  it("SHOWS when phoneNumber is set but no phone credential is linked", () => {
    asReturningBrowser();
    H.user = { ...GOOGLE_ONLY, phoneNumber: "+919000000000" };
    render(<LinkPhoneNudge />);
    expect(screen.getByTestId("link-phone-nudge")).toBeTruthy();
  });
});

describe("LinkPhoneNudge — condition 3: not previously dismissed", () => {
  it("is ABSENT for a student who dismissed it", () => {
    asReturningBrowser();
    localStorage.setItem(NUDGE_DISMISSED_KEY, "1");
    render(<LinkPhoneNudge />);
    expect(screen.queryByTestId("link-phone-nudge")).toBeNull();
  });

  it("dismissal PERSISTS across a remount", async () => {
    asReturningBrowser();
    const { unmount } = render(<LinkPhoneNudge />);
    await userEvent.click(screen.getByTestId("link-phone-nudge-dismiss"));
    expect(screen.queryByTestId("link-phone-nudge")).toBeNull();

    unmount();
    cleanup();
    render(<LinkPhoneNudge />);
    expect(screen.queryByTestId("link-phone-nudge")).toBeNull();
  });
});

describe("LinkPhoneNudge — condition 4: has RETURNED at least once", () => {
  it("is ABSENT in the student's FIRST session", () => {
    // Pristine browser: nothing counted yet. Mounting takes the count to 1.
    render(<LinkPhoneNudge />);
    expect(screen.queryByTestId("link-phone-nudge")).toBeNull();
    expect(localStorage.getItem(VISIT_COUNT_KEY)).toBe("1");
  });

  /**
   * ★★ THE MUTATION TARGET. Remove the sessionStorage guard in
   * `recordHomeVisit` and this goes red: the count reaches 2 within the FIRST
   * session, and a student who merely navigated Home → Practice → Home gets
   * nudged in the session they signed up.
   */
  it("does NOT count twice within one browser session", () => {
    const { unmount } = render(<LinkPhoneNudge />);
    expect(localStorage.getItem(VISIT_COUNT_KEY)).toBe("1");
    unmount();
    cleanup();

    // Same tab session (sessionStorage untouched) — a second Home mount.
    render(<LinkPhoneNudge />);
    expect(localStorage.getItem(VISIT_COUNT_KEY)).toBe("1");
    expect(screen.queryByTestId("link-phone-nudge")).toBeNull();
  });

  it("counts a NEW browser session, and then shows", () => {
    render(<LinkPhoneNudge />);
    expect(localStorage.getItem(VISIT_COUNT_KEY)).toBe("1");
    cleanup();

    // The browser closed the tab: sessionStorage is gone, localStorage is not.
    sessionStorage.clear();
    render(<LinkPhoneNudge />);
    expect(localStorage.getItem(VISIT_COUNT_KEY)).toBe("2");
    expect(screen.getByTestId("link-phone-nudge")).toBeTruthy();
  });

  it("recordHomeVisit is idempotent within a session and returns the count", () => {
    expect(recordHomeVisit()).toBe(1);
    expect(recordHomeVisit()).toBe(1);
    sessionStorage.clear();
    expect(recordHomeVisit()).toBe(2);
  });
});

describe("LinkPhoneNudge — condition 1: a real signed-in account", () => {
  it("is ABSENT when signed out", () => {
    asReturningBrowser();
    H.user = null;
    render(<LinkPhoneNudge />);
    expect(screen.queryByTestId("link-phone-nudge")).toBeNull();
  });

  it("is ABSENT for a local dev session", () => {
    asReturningBrowser();
    H.user = { ...GOOGLE_ONLY, isLocalSession: true };
    render(<LinkPhoneNudge />);
    expect(screen.queryByTestId("link-phone-nudge")).toBeNull();
  });

  it("does not count a visit at all when signed out", () => {
    H.user = null;
    render(<LinkPhoneNudge />);
    expect(localStorage.getItem(VISIT_COUNT_KEY)).toBeNull();
  });
});

describe("LinkPhoneNudge — the CTA", () => {
  it("opens the link modal", async () => {
    asReturningBrowser();
    render(<LinkPhoneNudge />);
    // The modal renders null while closed.
    expect(screen.queryByText(/Add a phone number|Add your number to sign in/i)).toBeNull();

    await userEvent.click(screen.getByTestId("link-phone-nudge-cta"));

    // The modal is a dialog; its presence is the assertion, not its copy.
    expect(screen.getByRole("dialog")).toBeTruthy();
  });
});
