import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// CALL-SITE test for [FU-SIGNUP-UNSAFE-REDIRECT]. safeInternalPath.test.ts proves the
// util in isolation; THIS file proves SignUpPage actually applies it — the wiring, not
// the structure. Reverting SignUpPage's guard to `st.from || "/"` must turn these red
// (mutation-verified), which a util-only test cannot catch.
//
// Spy on useNavigate while keeping MemoryRouter (and its real useLocation) so
// location.state flows through the component exactly as in production. SignUpPage
// navigates from a post-auth effect that only fires when `user` is present, so we
// force a signed-in user.
const navSpy = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => navSpy };
});
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: { uid: "test-uid" },
    signInWithGoogle: vi.fn(),
    signUpWithEmailPassword: vi.fn(),
    initPhoneRecaptcha: vi.fn(async () => {}),
    sendPhoneOtp: vi.fn(async () => {}),
    verifyPhoneOtp: vi.fn(async () => {}),
  }),
}));
vi.mock("../services/referralService", () => ({ creditPendingReferral: vi.fn() }));

import SignUpPage from "./SignUpPage";

afterEach(() => {
  cleanup();
  navSpy.mockReset();
});

// ★ Mount through ONE MemoryRouter at the real production nesting depth — the app is
// always inside a single BrowserRouter. `initialEntries` carries location.state, the
// only input to the redirect. NEVER nest a router inside another (that throws in prod
// even when an isolated test passes — the #490 trap).
function renderSignUp(from: string) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: "/sign-up", state: { from } }]}>
      <SignUpPage />
    </MemoryRouter>,
  );
}

describe("SignUpPage — post-auth redirect is guarded at the call site", () => {
  it("an off-site state.from redirects to '/' (never the off-site URL)", async () => {
    renderSignUp("https://evil.com");
    await waitFor(() => expect(navSpy).toHaveBeenCalled());
    expect(navSpy).toHaveBeenCalledWith("/", { replace: true });
    expect(navSpy).not.toHaveBeenCalledWith("https://evil.com", { replace: true });
  });

  it("a protocol-relative state.from redirects to '/'", async () => {
    renderSignUp("//evil.com");
    await waitFor(() => expect(navSpy).toHaveBeenCalled());
    expect(navSpy).toHaveBeenCalledWith("/", { replace: true });
  });

  it("a legitimate internal state.from passes through to navigate unchanged", async () => {
    renderSignUp("/practice");
    await waitFor(() => expect(navSpy).toHaveBeenCalled());
    expect(navSpy).toHaveBeenCalledWith("/practice", { replace: true });
  });
});
