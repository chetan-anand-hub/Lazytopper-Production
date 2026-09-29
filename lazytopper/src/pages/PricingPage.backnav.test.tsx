import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

/**
 * BACKNAV-1 — "back" returns the student to where they actually came from.
 *
 * The login door's offer block links to `/pricing?source=login`, and this page
 * ignored the parameter entirely: `ReturnContextBar` was passed the literal
 * "/". A student who tapped "See plans" mid-signup — to check what they were
 * joining before handing over an address — was returned to Home instead of the
 * door, losing the form they had already started. The link that sends them is
 * the one this lane added to the offer block, so shipping it without this fix
 * would have made the regression more reachable, not less.
 *
 * ★ BOTH DIRECTIONS ARE TESTED. A test that only proves `source=login` returns
 * to `/login` would pass just as happily against a page that hardcoded
 * `/login` — which would strand every student arriving from anywhere else.
 */
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: vi.fn() }));
// TRIAL-CTA-1: the page reads the session for its state-aware trial button; these
// round trips are the signed-out page's, which is what `user: null` renders.
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: null, loading: false }) }));

import PricingPage from "./PricingPage";
import OfferStrip from "../components/auth/OfferStrip";
import {
  FREE_CHECK_SIGNIN_INTENT_KEY,
  FREE_CHECK_SIGNIN_PATH,
  recordFreeCheckSuccess,
  type PendingSingleFreeCheck,
} from "../services/freeCheckClient";

afterEach(cleanup);

function renderPricing(search: string) {
  return render(
    <MemoryRouter initialEntries={[`/pricing${search}`]}>
      <Routes>
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/login" element={<div>LANDED ON THE SIGN-IN DOOR</div>} />
        <Route path="/" element={<div>LANDED ON HOME</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

/**
 * ⚠ ReturnContextBar renders a BUTTON, not a link — verified, not assumed. It
 * calls `navigate(backTo)`, except for the literal "/" where it does a hard
 * `window.location.href = "/"` (a full reload jsdom will not perform).
 *
 * So the two directions are asserted differently and deliberately:
 *  · the /login target is proven by ACTUALLY NAVIGATING and landing on the door;
 *  · the "/" target is proven by its label plus the control that it did NOT
 *    navigate the router anywhere.
 * An href assertion would have been a fiction — there is no href.
 */
function backButton() {
  return screen.getByRole("button", { name: /Back to/i });
}

describe("BACKNAV-1 — the return target follows the source", () => {
  it("★ source=login NAVIGATES the student back to the sign-in door", async () => {
    const u = userEvent.setup({ delay: null });
    renderPricing("?source=login");

    expect(backButton().textContent).toMatch(/Back to sign in/i);
    await u.click(backButton());

    // POSITIVE — they are actually on the door, not merely "not on pricing".
    expect(await screen.findByText("LANDED ON THE SIGN-IN DOOR")).toBeTruthy();
  });

  it("★ THE OTHER DIRECTION — no source still means Home, exactly as before", async () => {
    // Without this, a page that hardcoded "/login" would pass the test above and
    // strand every student who arrived from anywhere else.
    const u = userEvent.setup({ delay: null });
    renderPricing("");

    expect(backButton().textContent).toMatch(/Back to home/i);
    await u.click(backButton());

    // CONTROL — the router did NOT go to the door. ("/" is a hard reload, which
    // jsdom does not perform, so the pricing page stays mounted.)
    expect(screen.queryByText("LANDED ON THE SIGN-IN DOOR")).toBeNull();
  });

  it("an UNRECOGNISED source falls back to Home rather than guessing", () => {
    renderPricing("?source=somewhere-else");
    expect(backButton().textContent).toMatch(/Back to home/i);
  });

  it("★★ the parameter is an ALLOWLIST KEY, never the destination itself", () => {
    // ⚠ /pricing is a public page anyone can link to. If `source` were passed
    // through to `backTo`, this would be an open redirect — the exact class of
    // hole Login.tsx's isSafeInternalPath exists to close. It is matched against
    // known keys and mapped to a hardcoded path instead.
    for (const hostile of ["https://evil.example.com/steal", "//evil.example.com", "/admin"]) {
      renderPricing(`?source=${encodeURIComponent(hostile)}`);
      expect(backButton().textContent, `hostile source leaked: ${hostile}`).toMatch(
        /Back to home/i,
      );
      cleanup();
    }
  });

  it("matching is case- and whitespace-tolerant, so a real link is not missed", () => {
    renderPricing("?source=%20LOGIN%20");
    expect(backButton().textContent).toMatch(/Back to sign in/i);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   FREECHECK-2 · F3 — the door's ?redirect= survives a detour to /pricing
   (FU-SIGNIN-REDIRECT-EXITS). Mutation M2 (drop the redirect on the pricing link) → RED.
   ══════════════════════════════════════════════════════════════════════════ */

/** The sign-in door, reduced to what F3 touches: its offer block + where it was sent. */
function LoginDoor() {
  const loc = useLocation();
  const redirect = new URLSearchParams(loc.search).get("redirect");
  return (
    <div>
      <div data-testid="login-door">{`LOGIN redirect=${String(redirect)} search=${loc.search}`}</div>
      <OfferStrip />
    </div>
  );
}

function renderRoundTrip(start: string) {
  return render(
    <MemoryRouter initialEntries={[start]}>
      <Routes>
        <Route path="/login" element={<LoginDoor />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/" element={<div>LANDED ON HOME</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function freeResultProducedInThisTab(): PendingSingleFreeCheck {
  const pending: PendingSingleFreeCheck = {
    v: 1,
    kind: "single",
    gradedAt: Date.now() - 60 * 1000,
    subject: "Maths",
    topicName: "Real Numbers",
    topicSlug: "real-numbers",
    topicTouched: false,
    question: "Q",
    marksSource: null,
    detectionOverride: null,
    graded: {
      ok: true,
      totalMarks: 3,
      marksAwarded: 1,
      percentage: 33,
      annotatedSteps: [],
      mistakeSummary: { conceptual: 1, calculation: 0, silly: 0, presentation: 0 },
      teacherNote: "",
    },
  };
  recordFreeCheckSuccess(pending);
  return pending;
}

describe("F3 — login → pricing → login keeps the redirect", () => {
  afterEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("★ ROUND TRIP: the free-check door → 'See plans' → 'Back to sign in' lands on the door WITH its redirect, and the marker is written", async () => {
    const pending = freeResultProducedInThisTab();
    expect(window.sessionStorage.getItem(FREE_CHECK_SIGNIN_INTENT_KEY)).toBeNull(); // PRECONDITION
    const u = userEvent.setup({ delay: null });
    renderRoundTrip(FREE_CHECK_SIGNIN_PATH);
    expect(screen.getByTestId("login-door").textContent).toContain("redirect=/check-improve");

    // 1 · login → pricing: the offer link carries it.
    const seePlans = screen.getByRole("link", { name: /See plans/ });
    expect(seePlans.getAttribute("href")).toBe("/pricing?source=login&redirect=%2Fcheck-improve");
    await u.click(seePlans);
    expect(backButton().textContent).toMatch(/Back to sign in/i);

    // 2 · pricing → login: the back control passes it on, and writes the marker.
    await u.click(backButton());
    const door = await screen.findByTestId("login-door");
    expect(door.textContent).toContain("redirect=/check-improve");
    expect(window.sessionStorage.getItem(FREE_CHECK_SIGNIN_INTENT_KEY)).toBe(String(pending.gradedAt));
  });

  it("'Start free' and 'Start 7-day trial' pass it on too (the trial link's own /pricing is replaced)", async () => {
    const pending = freeResultProducedInThisTab();
    const u = userEvent.setup({ delay: null });
    renderRoundTrip("/pricing?source=login&redirect=%2Fcheck-improve");
    await u.click(screen.getByRole("button", { name: "Start free" }));
    expect((await screen.findByTestId("login-door")).textContent).toContain("search=?redirect=%2Fcheck-improve");
    expect(window.sessionStorage.getItem(FREE_CHECK_SIGNIN_INTENT_KEY)).toBe(String(pending.gradedAt));
    cleanup();
    window.sessionStorage.removeItem(FREE_CHECK_SIGNIN_INTENT_KEY);

    renderRoundTrip("/pricing?source=login&redirect=%2Fcheck-improve");
    await u.click(screen.getByRole("button", { name: "Start 7-day trial" }));
    const door = await screen.findByTestId("login-door");
    expect(door.textContent).toContain("redirect=/check-improve");
    expect(door.textContent).toContain("reason=start-trial");
    expect(window.sessionStorage.getItem(FREE_CHECK_SIGNIN_INTENT_KEY)).toBe(String(pending.gradedAt));
  });

  it("CONTROL — no redirect at the door: the links are exactly as before and NO marker is written", async () => {
    freeResultProducedInThisTab();
    const u = userEvent.setup({ delay: null });
    renderRoundTrip("/login");
    const seePlans = screen.getByRole("link", { name: /See plans/ });
    expect(seePlans.getAttribute("href")).toBe("/pricing?source=login");
    await u.click(seePlans);
    await u.click(backButton());
    expect((await screen.findByTestId("login-door")).textContent).toContain("redirect=null");
    expect(window.sessionStorage.getItem(FREE_CHECK_SIGNIN_INTENT_KEY)).toBeNull();

    // And the trial button keeps its own /pricing return.
    cleanup();
    renderRoundTrip("/pricing?source=login");
    await u.click(screen.getByRole("button", { name: "Start 7-day trial" }));
    expect((await screen.findByTestId("login-door")).textContent).toContain("redirect=/pricing");
  });

  it("★★ a HOSTILE redirect is dropped at both hops — /pricing never carries an external target", async () => {
    const u = userEvent.setup({ delay: null });
    for (const hostile of ["https://evil.example.com", "//evil.example.com", "/x?u=javascript:alert(1)"]) {
      renderRoundTrip(`/login?redirect=${encodeURIComponent(hostile)}`);
      expect(screen.getByRole("link", { name: /See plans/ }).getAttribute("href")).toBe("/pricing?source=login");
      cleanup();
      renderRoundTrip(`/pricing?source=login&redirect=${encodeURIComponent(hostile)}`);
      await u.click(backButton());
      expect((await screen.findByTestId("login-door")).textContent, hostile).toContain("redirect=null");
      cleanup();
    }
  });
});
