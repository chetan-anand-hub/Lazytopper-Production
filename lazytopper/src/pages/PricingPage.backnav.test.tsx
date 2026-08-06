import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

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

import PricingPage from "./PricingPage";

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
