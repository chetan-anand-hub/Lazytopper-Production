/**
 * G2a — the three checks that genuinely need a DOM. Kept apart from the
 * source-assertion suite so only ONE file in this lane pays for a jsdom
 * environment; see entitlementGating.test.ts for why that matters.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

/* ══════════════════════════════════════════════════════════════════════════
   3 · The overlay still renders for a premium user
   ══════════════════════════════════════════════════════════════════════════ */

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "u1", email: null, phoneNumber: "+919000000000" }, loading: false }),
}));

const subscriptionState = { isPremium: true, isTrialExpired: false, startTrial: vi.fn() };
vi.mock("../../hooks/useSubscription", () => ({
  useSubscription: () => subscriptionState,
}));

describe("RequirePremium — provider-agnostic, and the overlay survives the wrap", () => {
  beforeEach(() => {
    subscriptionState.isPremium = true;
    subscriptionState.isTrialExpired = false;
  });

  /**
   * Assertions are scoped to THIS render's own container, never the global
   * `screen`. `screen` queries the whole document, and without cleanup between
   * tests it finds nodes left behind by earlier renders — which is exactly how
   * the first draft of this file reported the gate as broken when it was not:
   * the premium test's "gated content" was still mounted when the free-user test
   * asked whether any existed.
   */
  async function renderGate() {
    const { render } = await import("@testing-library/react");
    const { MemoryRouter } = await import("react-router-dom");
    const { RequirePremium } = await import("./RequireAuth");

    const { container } = render(
      <MemoryRouter>
        <RequirePremium featureLabel="Check & Improve">
          <div>gated content</div>
        </RequirePremium>
      </MemoryRouter>,
    );
    return (container.textContent || "");
  }

  // §1.2: a phone-only student (email: null, above) must be gated identically to
  // an email student. MUTATION: branch RequirePremium on user.email ⇒ RED.
  it("a premium PHONE-ONLY user passes the gate", async () => {
    const text = await renderGate();
    expect(text).toContain("gated content");
  });

  it("a free, never-trialled user sees the lock and the trial CTA, not the content", async () => {
    subscriptionState.isPremium = false;
    subscriptionState.isTrialExpired = false;

    const text = await renderGate();
    expect(text).not.toContain("gated content");
    expect(text).toMatch(/Start my free 7-day trial/i);
  });

  // An EXPIRED-trial user must NOT be offered the trial again, or they restart it
  // forever. Pins #535's discriminator, which this lane now depends on.
  it("an EXPIRED-trial user is not offered the trial again", async () => {
    subscriptionState.isPremium = false;
    subscriptionState.isTrialExpired = true;

    const text = await renderGate();
    expect(text).not.toContain("gated content");
    expect(text).not.toMatch(/Start my free 7-day trial/i);
  });
});
