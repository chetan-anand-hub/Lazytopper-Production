import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { setMatchMediaMatches } from "../test/setup";

/**
 * Login footer — Terms of Service / Privacy Policy are reachable links (Lane C).
 *
 * [FU-LEGAL-FOOTER-LINK]: the signed-out entry point to the legal pages is the
 * login footer. The sentence used to assert agreement to terms with no way to
 * open them. Test 1 pins the rendered links; Test 5 pins that this lane did NOT
 * disturb the login's own (CSS-only) responsive behaviour.
 */
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: null,
    signInWithGoogle: vi.fn(),
    signInWithEmailPassword: vi.fn(),
    initPhoneRecaptcha: vi.fn(),
    sendPhoneOtp: vi.fn(),
    verifyPhoneOtp: vi.fn(),
  }),
}));
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: vi.fn() }));
vi.mock("../services/referralService", () => ({ creditPendingReferral: vi.fn() }));

import Login from "./Login";

afterEach(cleanup);

describe("Login footer — legal links (Lane C, test 1)", () => {
  it("renders reachable links to /legal/terms and /legal/privacy", () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    const terms = screen.getByRole("link", { name: "Terms of Service" });
    const privacy = screen.getByRole("link", { name: "Privacy Policy" });
    expect(terms).toHaveAttribute("href", "/legal/terms");
    expect(privacy).toHaveAttribute("href", "/legal/privacy");
  });
});

/**
 * ★★ EXTENSION — NAME-1 v2 dual-mounts the consent line.
 *
 * The line moved into the dark brand panel on desktop, replacing the
 * product-loop strip. But that panel is `display: none` below 1024px, so a
 * naive move would leave every phone student consenting with no reachable
 * policy link — with a minors audience that is a launch blocker, not a layout
 * bug. It is therefore mounted in BOTH places, one at a time.
 *
 * ⚠ A CONDITIONAL RENDER, NOT CSS, and these tests are what prove it. jsdom
 * ignores media queries, so a CSS-hidden duplicate would still be in the DOM —
 * and `getByRole("link", { name: "Terms of Service" })` above THROWS on two
 * matches. Every existing consumer of that query would then have to be weakened
 * to `getAllBy[0]`, which is precisely how a real duplicate ships unnoticed.
 *
 * ★ ASSERTED WITH `getAllByRole(...).toHaveLength(1)`, not `getByRole`. The
 * throw is how the bug SURFACES, but a lane debugging that throw can "fix" it by
 * switching to `getAllBy[0]`. `toHaveLength(1)` names the real failure.
 *
 * ⚠ `setMatchMediaMatches` must be called BEFORE `render`: `useIsDesktop`'s
 * `useState` initializer reads `matchMedia` at mount, and the effect only
 * re-syncs. Setting it afterwards tests the wrong branch.
 */
describe("Login legal consent — dual-mounted, exactly one at a time (NAME-1 v2)", () => {
  function renderLogin() {
    return render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );
  }

  it("DESKTOP (>=1024px): exactly one Terms and one Privacy link, in the BRAND PANEL", () => {
    setMatchMediaMatches(true);
    const { container } = renderLogin();

    expect(screen.getAllByRole("link", { name: "Terms of Service" })).toHaveLength(1);
    expect(screen.getAllByRole("link", { name: "Privacy Policy" })).toHaveLength(1);

    // CONTROL — it is in the brand column, and NOT in the auth-panel footer.
    const panel = screen.getByTestId("lt-legal-panel");
    expect(panel.closest(".lt-login-brand-panel")).not.toBeNull();
    expect(screen.queryByTestId("lt-legal-footer")).toBeNull();
    // ...and the brand panel really is rendered, so that closest() means something.
    expect(container.querySelector(".lt-login-brand-panel")).not.toBeNull();
  });

  it("MOBILE (<1024px): exactly one of each, in the auth-panel FOOTER", () => {
    setMatchMediaMatches(false);
    renderLogin();

    expect(screen.getAllByRole("link", { name: "Terms of Service" })).toHaveLength(1);
    expect(screen.getAllByRole("link", { name: "Privacy Policy" })).toHaveLength(1);

    // CONTROL — it is in the footer, and the desktop mount is absent. This is
    // the reachability that matters: below 1024px the brand panel is gone, so
    // this is the ONLY route a student has to the policies they are agreeing to.
    const footer = screen.getByTestId("lt-legal-footer");
    expect(footer.closest(".lt-login-foot")).not.toBeNull();
    expect(screen.queryByTestId("lt-legal-panel")).toBeNull();
  });

  it("the hrefs are right at BOTH widths — a reachable mount with a dead href is not reachable", () => {
    for (const isDesktop of [true, false]) {
      setMatchMediaMatches(isDesktop);
      renderLogin();
      expect(screen.getAllByRole("link", { name: "Terms of Service" })[0]).toHaveAttribute(
        "href",
        "/legal/terms",
      );
      expect(screen.getAllByRole("link", { name: "Privacy Policy" })[0]).toHaveAttribute(
        "href",
        "/legal/privacy",
      );
      cleanup();
    }
  });
});

describe("Login responsive behaviour — unregressed by Lane C (test 5)", () => {
  const src = readFileSync(resolve(process.cwd(), "src/pages/Login.tsx"), "utf8");

  /** Slice from a `@media (…)` header to the next `@media` (or end of string). */
  function mediaBlock(header: string): string {
    const start = src.indexOf(header);
    expect(start).toBeGreaterThan(-1);
    const rest = src.slice(start + header.length);
    const next = rest.indexOf("@media");
    return next === -1 ? rest : rest.slice(0, next);
  }

  it("still removes the brand panel entirely at <=1023px", () => {
    const block = mediaBlock("@media (max-width: 1023px)");
    expect(block).toMatch(/\.lt-login-brand-panel\s*\{[^}]*display:\s*none/);
  });

  it("keeps the footer column-stacked and centred at <=520px", () => {
    const block = mediaBlock("@media (max-width: 520px)");
    expect(block).toMatch(/\.lt-login-foot\s*\{[^}]*flex-direction:\s*column/);
    expect(block).toMatch(/\.lt-login-foot\s*\{[^}]*align-items:\s*center/);
    expect(block).toMatch(/\.lt-login-terms\s*\{[^}]*text-align:\s*center/);
  });
});
