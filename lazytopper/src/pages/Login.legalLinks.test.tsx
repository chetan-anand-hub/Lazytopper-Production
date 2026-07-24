import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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
