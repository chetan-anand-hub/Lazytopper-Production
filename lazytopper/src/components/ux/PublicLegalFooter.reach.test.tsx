import { describe, it, expect, vi, afterEach } from "vitest";
import type { ReactElement } from "react";
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

/**
 * SEO-NOTES-AND-LINKS-1 — the footer is the only crawl path on this site Google has
 * demonstrably followed (Live Test, 2026-09-13), so it carries a "Chapters" link to
 * Exam Trends, the page that lists every chapter. Asserted by role + href on every
 * surface that renders the footer, and the legal links must stay first-class and in
 * their original order AFTER it.
 */
describe("the footer links to Exam Trends (the chapter index) on every public surface", () => {
  // The third element is the path each surface renders at — the footer reads it with
  // useLocation() to build its return ticket, so the expectation is surface-specific
  // rather than one hardcoded string that would hide a footer sending everyone home.
  const surfaces: [string, () => ReactElement, string][] = [
    ["MobileWelcome", () => <MemoryRouter><MobileWelcome /></MemoryRouter>, "/"],
    ["PricingPage", () => <MemoryRouter initialEntries={["/pricing"]}><PricingPage /></MemoryRouter>, "/pricing"],
    ["PublicLegalFooter", () => <MemoryRouter><PublicLegalFooter /></MemoryRouter>, "/"],
  ];

  it.each(surfaces)("%s: Chapters → /exam-trends, CBSE 2027 → /cbse/class-10 carrying this surface's returnTo, then Privacy, Terms, Refunds unchanged", (_name, ui, origin) => {
    render(ui());
    const foot = screen.getByRole("contentinfo", { name: "Legal" });
    expect(within(foot).getByRole("link", { name: "Chapters" })).toHaveAttribute(
      "href",
      "/exam-trends",
    );
    // CBSE-PAGE-1 — the second crawl-path link, added for the same reason as the first,
    // and carrying a return ticket so the destination is not a dead end.
    const cbse = within(foot).getByRole("link", { name: "CBSE 2027" });
    const href = cbse.getAttribute("href") || "";
    expect(href.split("?")[0]).toBe("/cbse/class-10");
    // ★ THE TICKET NAMES THIS SURFACE, not a constant. A footer that hardcoded one
    // origin would satisfy a bare "has a returnTo" assertion on every surface.
    expect(new URLSearchParams(href.split("?")[1] || "").get("returnTo")).toBe(origin);
    expect(within(foot).getAllByRole("link").map((a) => a.textContent)).toEqual([
      "Chapters",
      "CBSE 2027",
      ...FOOTER_LINKS.map(([label]) => label),
    ]);
  });

  it("a click on Chapters routes client-side to Exam Trends", () => {
    function Probe() {
      return <output data-testid="loc">{useLocation().pathname}</output>;
    }
    render(
      <MemoryRouter initialEntries={["/welcome"]}>
        <Routes>
          <Route path="/welcome" element={<PublicLegalFooter />} />
          <Route path="/exam-trends" element={<Probe />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("link", { name: "Chapters" }));
    expect(screen.getByTestId("loc")).toHaveTextContent("/exam-trends");
  });
});

describe("every slug a legal link points at renders real policy content", () => {
  const allHrefs = renderedFooterHrefs();
  // ★ THE FILTER IS RETAINED THOUGH THE FOOTER NOW RENDERS ONLY LEGAL LINKS. [LINK-1]
  // added a plain anchor into the static /questions namespace here; RETIRE-1 removed it
  // with its target. Keeping the filter means a future non-legal anchor cannot silently
  // break the count below, and it does NOT weaken mutation M3 (slug "refund" ->
  // "cookies"): the repointed href still starts with "/legal/", so it is still
  // harvested and still turns this red.
  const hrefs = allHrefs.filter((h) => h.startsWith("/legal/"));

  it("harvested the footer's real hrefs (control: the harvest is not empty)", () => {
    // Still exactly three: a legal link DELETED or repointed off /legal/ turns this red,
    // so the filter above cannot quietly swallow one.
    expect(hrefs.length).toBe(FOOTER_LINKS.length);
    expect(hrefs.every((h) => h.startsWith("/legal/"))).toBe(true);
    // ★ AND THE FILTER HID NOTHING: every rendered href survived it. This replaces the
    // [LINK-1] questions assertion and keeps the filter from concealing a stray link.
    // SEO-NOTES-AND-LINKS-1 added the first non-legal link (Chapters → /exam-trends);
    // CBSE-PAGE-1 added the second (CBSE 2027 → /cbse/class-10). The rendered set is the
    // legal hrefs plus exactly those two, in that order, and nothing else — a THIRD
    // one appearing turns this red, which is the property being defended.
    // Query strings are stripped for this comparison — the CBSE link carries a return
    // ticket (asserted above, per surface) and the property defended here is that NO
    // THIRD non-legal link has appeared, which a query would otherwise obscure.
    expect(allHrefs.map((h) => h.split("?")[0])).toEqual([
      "/exam-trends",
      "/cbse/class-10",
      ...hrefs,
    ]);
    // ...and the ticket really is on it, so stripping the query cannot hide its loss.
    expect(allHrefs.find((h) => h.startsWith("/cbse/class-10"))).toContain("returnTo=");
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
