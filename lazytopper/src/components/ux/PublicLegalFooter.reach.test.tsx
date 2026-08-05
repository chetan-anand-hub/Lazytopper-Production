import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

/**
 * [FU-LEGAL-FOOTER-LINK] — legal reachability on the SIGNED-OUT public surfaces.
 *
 * Assertion 1: legal is reachable from every surface the audit named as lacking it
 * — asserted against the RENDERED link (role + href), never the route table.
 * Assertion 3: every slug those links point at renders real policy content, not the
 * "Page not found" card. ★ A link to an empty page is worse than no link.
 *
 * ★ CONTROL. An absence claim needs a control, and so does a presence claim made by
 * a query that might simply be wrong. `it("CONTROL: …")` below proves the exact
 * getByRole("link", { name }) query used throughout DOES find the legal links on a
 * surface trunk already ships them on (the sign-in door), so a failure on
 * MobileWelcome/PricingPage is a real absence and not a broken query.
 *
 * ⚠ This file deliberately does NOT touch src/pages/Login.legalLinks.test.tsx, which
 * pins the login footer independently. The control here renders the same component
 * from a separate file so that test stays untouched and passing.
 */

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({
    user: null,
    signInWithGoogle: vi.fn(),
    signInWithEmailPassword: vi.fn(),
    initPhoneRecaptcha: vi.fn(),
    sendPhoneOtp: vi.fn(),
    verifyPhoneOtp: vi.fn(),
  }),
}));
vi.mock("../../services/uxTelemetry", () => ({ trackUxEvent: vi.fn() }));
vi.mock("../../services/referralService", () => ({ creditPendingReferral: vi.fn() }));

import PublicLegalFooter from "./PublicLegalFooter";
import MobileWelcome from "../../pages/MobileWelcome";
import PricingPage from "../../pages/PricingPage";
import LegalPage from "../../pages/LegalPage";
import Login from "../../pages/Login";

afterEach(cleanup);

/** The three policies every legal row offers — label -> href. Mirrors PublicLegalFooter. */
const FOOTER_LINKS: [string, string][] = [
  ["Privacy", "/legal/privacy"],
  ["Terms", "/legal/terms"],
  ["Refunds", "/legal/refund"],
];

describe("CONTROL — the link query used by this file can find a legal link that already exists", () => {
  it("finds the sign-in door's Terms/Privacy links (proves the query works)", () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "Terms of Service" })).toHaveAttribute(
      "href",
      "/legal/terms",
    );
    expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute(
      "href",
      "/legal/privacy",
    );
  });
});

describe("MobileWelcome (mobile public landing) reaches the policies", () => {
  it.each(FOOTER_LINKS)("renders a %s link to %s", (label, href) => {
    render(
      <MemoryRouter>
        <MobileWelcome />
      </MemoryRouter>,
    );
    const foot = screen.getByRole("contentinfo", { name: "Legal" });
    expect(within(foot).getByRole("link", { name: label })).toHaveAttribute("href", href);
  });
});

describe("PricingPage (public /pricing) reaches the policies", () => {
  it.each(FOOTER_LINKS)("renders a %s link to %s", (label, href) => {
    render(
      <MemoryRouter initialEntries={["/pricing"]}>
        <PricingPage />
      </MemoryRouter>,
    );
    const foot = screen.getByRole("contentinfo", { name: "Legal" });
    expect(within(foot).getByRole("link", { name: label })).toHaveAttribute("href", href);
  });
});

/**
 * ★ Harvested from the RENDERED footer, never re-stated. Asserting assertion 3
 * against a hardcoded list would make it a tautology: repointing a real link at an
 * empty slug would leave it green. Mutation M3 (slug "refund" -> "cookies") turns
 * this red precisely because the hrefs come out of the component.
 */
function renderedFooterHrefs(): string[] {
  const { unmount } = render(
    <MemoryRouter>
      <PublicLegalFooter />
    </MemoryRouter>,
  );
  const foot = screen.getByRole("contentinfo", { name: "Legal" });
  const hrefs = within(foot)
    .getAllByRole("link")
    .map((a) => a.getAttribute("href") || "");
  unmount();
  return hrefs;
}

describe("every slug a legal link points at renders real policy content", () => {
  const hrefs = renderedFooterHrefs();

  it("harvested the footer's real hrefs (control: the harvest is not empty)", () => {
    expect(hrefs.length).toBe(FOOTER_LINKS.length);
    expect(hrefs.every((h) => h.startsWith("/legal/"))).toBe(true);
  });

  it.each(hrefs)("%s renders a policy, not the not-found card", (href) => {
    render(
      <MemoryRouter initialEntries={[href]}>
        <Routes>
          <Route path="/legal/:slug" element={<LegalPage />} />
        </Routes>
      </MemoryRouter>,
    );

    // The not-found card is what an unserved slug renders. It must not appear.
    expect(screen.queryByText("Page not found")).toBeNull();

    // ...and "not not-found" is not enough: assert real body content is present.
    // Every served policy renders a dated heading and a Contact us block.
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
    expect(screen.getByText("Contact us")).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 }).length).toBeGreaterThanOrEqual(3);
  });

  it("CONTROL: an unserved slug DOES render the not-found card", () => {
    // Proves the assertion above can fail — queryByText(...) === null passes just as
    // happily when the card was renamed or the page failed to render at all.
    render(
      <MemoryRouter initialEntries={["/legal/cookies"]}>
        <Routes>
          <Route path="/legal/:slug" element={<LegalPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText("Page not found")).toBeInTheDocument();
  });
});
