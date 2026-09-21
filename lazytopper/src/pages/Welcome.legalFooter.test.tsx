import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, within, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

/**
 * [FU-LEGAL-FOOTER-LINK] — the SIGNED-OUT DESKTOP FRONT DOOR reaches the policies.
 *
 * COPY-1 closed `/welcome` (mobile), `/pricing`, `/login`, `/sign-up` and `/browse`.
 * `Welcome.tsx` was the one uncovered surface, and it is the front door: it serves
 * `/` for a signed-out desktop visitor and `/welcome` at >=1024px. `isPublicLandingRoute`
 * in App.tsx suppresses the global navbar on both, and the page imports no shared
 * chrome — so a visitor who never reached the sign-in door had NO route to the privacy
 * policy at all. LazyTopper collects data from 14-16 year olds and India's DPDP Act
 * treats under-18s as children; a policy a minor cannot reach is not a policy.
 *
 * ★★ WHY A PLACEMENT TEST AND NOT ONLY A PRESENCE TEST — AND WHY THE PLACEMENT IT
 * PINS CHANGED IN LANDING-MERGE-1. This file used to assert the footer was mounted
 * INSIDE `.lt-landing-stage`. That was correct and load-bearing for the page it was
 * written against: at >=1180px the old landing was a frozen, non-scrolling screen
 * (`height:100vh; overflow:hidden` on html/body/#root/.lt-frozen-landing, with
 * `.lt-landing-viewport` a five-row grid), so a footer mounted one level out was
 * clipped away with no scrollbar to reach it — present in the DOM, every presence
 * assertion green, and invisible to every student.
 *
 * ⚠ THE FROZEN LAYOUT IS GONE, DELIBERATELY (owner ruling, LANDING-MERGE-1 §2.2).
 * The page scrolls at every width, so "last child of the scrolling flow" is now
 * reachable and `.lt-landing-stage` no longer exists. THE OLD ASSERTION WAS THEREFORE
 * REMOVED BY REASONING, NOT BECAUSE IT WENT RED — re-pointing it at whatever selector
 * happened to replace the stage would have pinned a property that protects nothing.
 *
 * ★ WHAT REPLACES IT IS A REAL HAZARD, NOT A FORMALITY. `stripAuthChrome()`
 * (scripts/seo/captureStaticBodies.ts) removes `a[href*="/login"]` TOGETHER WITH ITS
 * ENCLOSING <section>. This page has a Log in link in its top bar. If the footer ever
 * came to share a <section> ancestor with a login link, a future capture would
 * silently delete the legal row from the static HTML — the one crawl path Google has
 * actually followed on this site, removed with every gate green. So the structural
 * property now pinned is: THE FOOTER IS INSIDE NO <section>.
 *
 * A landing-page visitor is signed out. The page no longer reads auth at all, so the
 * useAuth mock this file used to need is gone with it.
 */

import Welcome from "./Welcome";
import LegalPage from "./LegalPage";

afterEach(() => cleanup());

function renderWelcome() {
  return render(
    <MemoryRouter>
      <Welcome />
    </MemoryRouter>,
  );
}

/** Mirrors the labels PublicLegalFooter renders. Hrefs are NOT re-stated here — see below. */
const EXPECTED_LABELS = ["Privacy", "Terms", "Refunds"];

describe("Welcome — the signed-out desktop landing reaches the policies", () => {
  it.each(EXPECTED_LABELS)("renders a %s link inside a labelled legal footer", (label) => {
    renderWelcome();
    const foot = screen.getByRole("contentinfo", { name: "Legal" });
    const link = within(foot).getByRole("link", { name: label });
    // Assert the RENDERED affordance: a real anchor with a real href, not an import.
    expect(link).toHaveAttribute("href", expect.stringMatching(/^\/legal\/[a-z]+$/));
  });

  it("CONTROL: the same query returns nothing on a surface with no legal footer", () => {
    // Without this, every assertion above could be passing against a query that
    // matches anything, or against a footer left over from a previous render.
    render(
      <MemoryRouter initialEntries={["/legal/cookies"]}>
        <Routes>
          <Route path="/legal/:slug" element={<LegalPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.queryByRole("contentinfo", { name: "Legal" })).toBeNull();
  });

  it("mounts the footer inside NO <section>, so a future auth-chrome strip cannot take it", () => {
    // ★ The strip hazard described in the file header. `stripAuthChrome` deletes the
    // <section> ENCLOSING any /login anchor; the footer must never be in one.
    renderWelcome();
    const foot = screen.getByRole("contentinfo", { name: "Legal" });
    expect(foot.closest("section")).toBeNull();
  });

  it("★ CONTROL — this page really does contain the login link that makes that hazard real", () => {
    // Without this, the assertion above passes just as happily on a page with no
    // login link anywhere, where "the footer is not in a section with one" is true
    // but proves nothing. The hazard has to exist for the defence to mean something.
    const { container } = renderWelcome();
    const login = container.querySelector('a[href*="/login"]');
    expect(login).not.toBeNull();
    // ...and it is genuinely inside a strippable ancestor chain that excludes the
    // footer: the two must not share a <section>.
    const foot = screen.getByRole("contentinfo", { name: "Legal" });
    const loginSection = login!.closest("section");
    expect(loginSection === null || !loginSection.contains(foot)).toBe(true);
  });
});

/**
 * SEO-NOTES-AND-LINKS-1 — the hero's outbound link is a crawlable anchor that still
 * navigates in-app. ★ An href alone cannot tell an <a onClick> from a router <Link>;
 * the click can. A plain click must be defaultPrevented AND route; a modifier click
 * must be left to the browser.
 *
 * ⚠ THE SUBJECT CHANGED IN LANDING-MERGE-1, THE PROPERTY DID NOT. This block used to
 * test the "Explore" control, which pointed at /browse. The owner replaced that line
 * with a link to a real board question — a prerendered, indexed notes page — because
 * the page argues that marks are lost step by step and the notes pages SHOW that
 * rather than restating it. "Explore the product" pointed at /app/, which is not
 * prerendered and so was never a crawl path at all. The link is a different link; the
 * thing worth defending about it is identical, so the assertions moved rather than died.
 */
describe("Welcome — the hero's board-question link is a real link", () => {
  function Probe() {
    return <output data-testid="loc">{useLocation().pathname}</output>;
  }
  function renderRouted() {
    return render(
      <MemoryRouter initialEntries={["/welcome"]}>
        <Routes>
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/notes/:topicSlug" element={<Probe />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it("exposes a crawlable href at the prerendered notes page", () => {
    renderRouted();
    // LANDING-FOLLOWUP-1: the href now opens the questions tab and carries the same
    // return ticket as the CBSE link. The PATH is still the prerendered notes page.
    expect(screen.getByRole("link", { name: /marked step by step/i })).toHaveAttribute(
      "href",
      "/notes/trigonometry?tab=questions&returnTo=%2Fwelcome&backLabel=Back+to+LazyTopper",
    );
  });

  it("a plain click is prevented and routes client-side", () => {
    renderRouted();
    const link = screen.getByRole("link", { name: /marked step by step/i });
    expect(fireEvent.click(link, { button: 0 })).toBe(false);
    expect(screen.getByTestId("loc")).toHaveTextContent("/notes/trigonometry");
  });

  it("CONTROL: a modifier click is NOT prevented and does not route in-app", () => {
    renderRouted();
    const link = screen.getByRole("link", { name: /marked step by step/i });
    expect(fireEvent.click(link, { button: 0, metaKey: true })).toBe(true);
    expect(fireEvent.click(link, { button: 0, ctrlKey: true })).toBe(true);
    expect(screen.queryByTestId("loc")).toBeNull();
  });
});

/**
 * ★ THE CBSE RETURN TICKET — §2.5, and it is a defect this product already shipped
 * once. Both landings this page replaces passed the visited pathname AND a backLabel
 * so /cbse/class-10 could offer a back-link naming where the reader came from. The
 * footer's own CBSE link deliberately carries NO backLabel — a site-wide row cannot
 * honestly name its origin — so losing the page-level link would silently downgrade
 * that back-link to a generic "Back" with every other gate green.
 */
describe("Welcome — the page-level CBSE link carries a named return ticket", () => {
  function cbseLink() {
    renderWelcome();
    return screen.getByRole("link", { name: /dates, rules and official papers/i });
  }

  it("carries BOTH returnTo and a backLabel that names this page", () => {
    const href = cbseLink().getAttribute("href") || "";
    expect(href.split("?")[0]).toBe("/cbse/class-10");
    const params = new URLSearchParams(href.split("?")[1] || "");
    expect(params.get("returnTo")).toBe("/");
    expect(params.get("backLabel")).toBe("Back to LazyTopper");
  });

  it("★ CONTROL — the footer's own CBSE link carries returnTo but NO backLabel", () => {
    // Proves the assertion above is about the PAGE-LEVEL link and not satisfied by
    // any CBSE link on the page. If the two were interchangeable, adding a backLabel
    // to the shared footer would pass the test above while weakening the honesty
    // rule PublicLegalFooter states in its own comment.
    renderWelcome();
    const foot = screen.getByRole("contentinfo", { name: "Legal" });
    const footHref = within(foot).getByRole("link", { name: /CBSE 2027/i }).getAttribute("href")
      || "";
    const footParams = new URLSearchParams(footHref.split("?")[1] || "");
    expect(footParams.get("returnTo")).toBe("/");
    expect(footParams.get("backLabel")).toBeNull();
  });
});

/**
 * ★ Harvested from the RENDERED footer, never re-stated. Asserting against a hardcoded
 * slug list would make this a tautology: repointing a real link at an empty slug would
 * leave it green. Mutation M2 (a link repointed at an unserved slug) turns this red
 * precisely because the hrefs come out of the rendered page.
 */
function renderedFooterHrefs(): string[] {
  const { unmount } = renderWelcome();
  const foot = screen.getByRole("contentinfo", { name: "Legal" });
  const hrefs = within(foot)
    .getAllByRole("link")
    .map((a) => a.getAttribute("href") || "");
  unmount();
  return hrefs;
}

describe("every slug the landing's legal links point at renders real policy content", () => {
  const allHrefs = renderedFooterHrefs();
  // ★ THE FILTER IS RETAINED THOUGH THE FOOTER NOW RENDERS ONLY LEGAL LINKS. [LINK-1]
  // added a plain anchor into the static /questions namespace here; RETIRE-1 removed it
  // with its target. Keeping the filter means a future non-legal anchor cannot silently
  // break the count below, and it does NOT weaken mutation M2: a link repointed at an
  // unserved slug still starts with "/legal/", so it is still harvested and still red.
  const hrefs = allHrefs.filter((h) => h.startsWith("/legal/"));

  it("harvested the landing's real hrefs (control: the harvest is not empty)", () => {
    // Still exactly three: a legal link deleted or repointed off /legal/ turns this red,
    // so the filter above cannot quietly swallow one.
    expect(hrefs.length).toBe(EXPECTED_LABELS.length);
    expect(hrefs.every((h) => h.startsWith("/legal/"))).toBe(true);
    // ★ AND THE FILTER HID NOTHING: every rendered href survived it. This replaces the
    // [LINK-1] questions assertion and keeps the filter from concealing a stray link.
    // SEO-NOTES-AND-LINKS-1 added the first non-legal link, Chapters → /exam-trends;
    // CBSE-PAGE-1 added the second, CBSE 2027 → /cbse/class-10. The harvest is scoped to
    // the legal footer, so the landing's own hero link to the same page is correctly
    // not counted here — this list is the FOOTER's links and nothing else.
    // Query stripped: the CBSE link carries a return ticket. The property defended
    // here is that no THIRD non-legal link appeared; the ticket gets its own assertion
    // below so stripping cannot conceal its removal.
    expect(allHrefs.map((h) => h.split("?")[0])).toEqual([
      "/exam-trends",
      "/cbse/class-10",
      ...hrefs,
    ]);
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

    // The not-found card is what an unserved slug renders. It must not appear...
    expect(screen.queryByText("Page not found")).toBeNull();
    // ...and "not not-found" is not enough: assert real body content is present.
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
    expect(screen.getByText("Contact us")).toBeInTheDocument();
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

/**
 * ★★ LANDING-FOLLOWUP-1 §4.5 — THE ROUND TRIP, asserted by LANDED PATH.
 * Follow the landing's questions link into the REAL notes page, confirm it opened on
 * the questions tab, follow the back-link, and confirm the reader is on the landing
 * again. ⚠ A check that counts links on a page it never verified it reached passes on
 * a redirect — so every hop asserts the pathname a probe actually observed.
 */
describe("Welcome — the questions link round-trips through the notes page", () => {
  function Where() {
    const { pathname, search } = useLocation();
    return <output data-testid="where">{pathname + search}</output>;
  }

  it("landing → questions tab → back-link → landing", async () => {
    const { default: DesktopNotesPage } = await import("./desktop/DesktopNotesPage");
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Where />
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/notes/:topicSlug" element={<DesktopNotesPage />} />
        </Routes>
      </MemoryRouter>,
    );
    // Hop 1 — start on the landing, and prove it.
    expect(screen.getByTestId("where")).toHaveTextContent(/^\/$/);
    fireEvent.click(screen.getByRole("link", { name: /competency-based questions, marked step by step/i }));

    // Hop 2 — on the notes page, on the questions tab.
    expect(screen.getByTestId("where").textContent).toBe(
      "/notes/trigonometry?tab=questions&returnTo=%2F&backLabel=Back+to+LazyTopper",
    );
    const selected = screen.getAllByRole("tab").find((t) => t.getAttribute("aria-selected") === "true");
    expect(selected).toHaveTextContent("Competency-based questions");

    // Hop 3 — the back-link is named for the landing and lands there.
    fireEvent.click(screen.getByRole("link", { name: /Back to LazyTopper/ }));
    expect(screen.getByTestId("where").textContent).toBe("/");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/Full marks/);
  });

  it("★ CONTROL — the notes page's default back-link does NOT go to the landing", async () => {
    // Without the ticket the same click lands on the Topic Hub, so hop 3 above is
    // proving the ticket, not a back-link that happened to point at "/" anyway.
    const { default: DesktopNotesPage } = await import("./desktop/DesktopNotesPage");
    render(
      <MemoryRouter initialEntries={["/notes/trigonometry?tab=questions"]}>
        <Where />
        <Routes>
          <Route path="/notes/:topicSlug" element={<DesktopNotesPage />} />
          <Route path="*" element={<p>elsewhere</p>} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("link", { name: /Trigonometry Topic Hub/ }));
    expect(screen.getByTestId("where").textContent).toBe("/topic-hub/trigonometry");
  });
});
