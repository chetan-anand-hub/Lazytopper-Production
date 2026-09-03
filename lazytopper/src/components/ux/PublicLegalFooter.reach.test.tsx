import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, within, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

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

/** [LINK-1] The chapter page that actually exists. `/questions/class-10/` is still the SPA shell. */
const QUESTIONS_HREF = "/questions/class-10/science/light-reflection-and-refraction/";

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
  const allHrefs = renderedFooterHrefs();
  // ★ The footer also carries the [LINK-1] questions anchor, which is a plain link into
  // the STATIC namespace and has no /legal/:slug route to render. Narrow to the legal
  // links only. This does NOT weaken mutation M3 (slug "refund" -> "cookies"): the
  // repointed href still starts with "/legal/", so it is still harvested and still red.
  const hrefs = allHrefs.filter((h) => h.startsWith("/legal/"));

  it("harvested the footer's real hrefs (control: the harvest is not empty)", () => {
    // Still exactly three: a legal link DELETED or repointed off /legal/ turns this red,
    // so the filter above cannot quietly swallow one.
    expect(hrefs.length).toBe(FOOTER_LINKS.length);
    expect(hrefs.every((h) => h.startsWith("/legal/"))).toBe(true);
    // ...and the filter must not be able to HIDE the questions link either.
    expect(allHrefs).toContain(QUESTIONS_HREF);
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

/* ===================================================================== *
 * [LINK-1] The questions namespace must have a real inbound link.
 * ===================================================================== */

/** Reports the router's CURRENT location, so a click can be shown to navigate — or not. */
function LocationProbe() {
  const { pathname } = useLocation();
  return <span data-testid="probe-location">{pathname}</span>;
}

function renderFooterWithProbe() {
  render(
    <MemoryRouter initialEntries={["/pricing"]}>
      <PublicLegalFooter />
      <LocationProbe />
    </MemoryRouter>,
  );
  return {
    footer: screen.getByRole("contentinfo", { name: "Legal" }),
    location: () => screen.getByTestId("probe-location").textContent,
  };
}

describe("[LINK-1] the public footer links into the static /questions namespace", () => {
  it("renders a 'Practice questions' link with the exact href", () => {
    const { footer } = renderFooterWithProbe();
    expect(within(footer).getByRole("link", { name: "Practice questions" })).toHaveAttribute(
      "href",
      QUESTIONS_HREF,
    );
  });

  it("carries no rel=nofollow and no target=_blank (a nofollow passes no signal)", () => {
    const { footer } = renderFooterWithProbe();
    const link = within(footer).getByRole("link", { name: "Practice questions" });
    expect(link.getAttribute("rel") || "").not.toMatch(/nofollow/i);
    expect(link.getAttribute("target")).toBeNull();
  });

  /**
   * ★★ THE ASSERTION THIS LANE EXISTS FOR.
   *
   * A react-router <Link> ALSO renders an <a href>, so every assertion above passes
   * just as happily on a <Link> — and a <Link> is broken here: App.tsx has no
   * `/questions` route and its catch-all is <Route path="*" element={<HomeRedirect />} />,
   * so the router would swallow the click and bounce the visitor HOME, never requesting
   * the static page. The href is therefore NOT the property under test; the CLICK is.
   *
   * A plain <a> is not intercepted: the router does not navigate and the event is not
   * defaultPrevented. The CONTROL below runs the identical probe against a known
   * <Link> ("Privacy") and shows the opposite outcome — without it, a probe that
   * silently failed to fire would report a <Link> as a plain anchor and pass.
   */
  it("★ the questions link is a PLAIN ANCHOR: clicking it does not navigate the router", () => {
    const { footer, location } = renderFooterWithProbe();
    expect(location()).toBe("/pricing");

    const link = within(footer).getByRole("link", { name: "Practice questions" });
    const notPrevented = fireEvent.click(link);

    // A <Link> would preventDefault() and hand the click to the router instead.
    expect(notPrevented).toBe(true);
    expect(location()).toBe("/pricing");
  });

  it("CONTROL: the same probe on a real router <Link> DOES navigate (proves it can detect one)", () => {
    const { footer, location } = renderFooterWithProbe();
    expect(location()).toBe("/pricing");

    const link = within(footer).getByRole("link", { name: "Privacy" });
    const notPrevented = fireEvent.click(link);

    expect(notPrevented).toBe(false);
    expect(location()).toBe("/legal/privacy");
  });
});
