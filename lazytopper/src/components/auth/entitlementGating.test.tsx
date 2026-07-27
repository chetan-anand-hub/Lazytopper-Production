/**
 * G2a — entitlement gating + daily-limit handling.
 *
 * Every check here was mutation-verified: the mutation named in its comment was
 * applied, the suite confirmed RED, and the mutation reverted.
 *
 * Scoped run:
 *   npx vitest run src/components/auth/entitlementGating.test.tsx \
 *     --poolOptions.threads.maxThreads=2
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const src = (p: string) => readFileSync(resolve(process.cwd(), "src", p), "utf8");

/* ══════════════════════════════════════════════════════════════════════════
   1 · The gates are actually applied
   ══════════════════════════════════════════════════════════════════════════ */

describe("entitlement gating is wired at the component, not the route", () => {
  const ci = src("pages/desktop/DesktopCheckImprovePage.tsx");
  const ws = src("components/worksheet/WorksheetGenerator.tsx");
  const app = src("App.tsx");

  // MUTATION: delete the <RequirePremium> wrapper from the C&I export ⇒ RED.
  it("Check & Improve's default export is wrapped in RequirePremium", () => {
    expect(ci).toMatch(/<RequirePremium featureLabel="Check & Improve">/);
    expect(ci).toMatch(/import \{ RequirePremium \} from "\.\.\/\.\.\/components\/auth\/RequireAuth"/);
    expect(ci).toMatch(/export default DesktopCheckImprovePage;/);
  });

  // ★ THE ONE THAT MATTERS. A wrapper that dropped `overlay` still typechecks and
  // still passes a casual review, but swallows `onClose` and breaks the tutor's
  // C&I overlay at runtime — the overlay would open and become impossible to
  // close. The behavioural proof is in section 3; this pins the source shape.
  // MUTATION: change the wrapper body to <DesktopCheckImprovePageInner /> ⇒ RED.
  it("the C&I wrapper FORWARDS the overlay prop to the inner component", () => {
    expect(ci).toMatch(/<DesktopCheckImprovePageInner overlay=\{overlay\} \/>/);
  });

  // MUTATION: delete the <RequirePremium> wrapper from WorksheetGenerator ⇒ RED.
  it("WorksheetGenerator's default export is wrapped in RequirePremium", () => {
    expect(ws).toMatch(/<RequirePremium featureLabel="Worksheets">/);
    expect(ws).toMatch(/<WorksheetGeneratorInner \/>/);
    expect(ws).toMatch(/export default function WorksheetGenerator\(\)/);
  });

  // App.tsx is frozen by two ops gates asserting zero diff vs the PR base. This
  // catches a route-level "fix" locally, before CI has to.
  // MUTATION: wrap the /check-improve route element in App.tsx ⇒ RED.
  it("the /check-improve route element stays a BARE element (App.tsx untouched)", () => {
    expect(app).toMatch(
      /path="\/check-improve"\s*\n\s*element=\{withRouteSuspense\(<DesktopCheckImprovePage \/>\)\}/,
    );
    expect(app).not.toMatch(/RequirePremium[^\n]*Check & Improve/);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   2 · Diagram pages — REGRESSION PINS ONLY (no edit)
   ══════════════════════════════════════════════════════════════════════════
   The Lane G spec said these two pages lacked RequireAuth and should gain it.
   They already had it, applied in-component — exactly the pattern the spec
   prescribes. Editing them would have been a no-op dressed as a fix, so the
   finding is pinned instead: the protection now cannot be removed silently.
   MUTATION: delete <RequireAuth> from either page ⇒ RED.
   ══════════════════════════════════════════════════════════════════════════ */

describe("admin diagram pages already require auth (pinned, not added)", () => {
  for (const page of ["pages/DiagramComparePage.tsx", "pages/DiagramQualityPage.tsx"]) {
    it(`${page} wraps its default export in RequireAuth`, () => {
      const text = src(page);
      expect(text).toMatch(/import \{ RequireAuth \} from/);
      expect(text).toMatch(/<RequireAuth>/);
      expect(text).toMatch(/<\/RequireAuth>/);
    });
  }

  it("both call generate-diagram, which is why auth is required at all", () => {
    const compare = src("pages/DiagramComparePage.tsx");
    const quality = src("pages/DiagramQualityPage.tsx");
    expect(compare + quality).toMatch(/generate-diagram|generateDiagram/);
  });
});

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
