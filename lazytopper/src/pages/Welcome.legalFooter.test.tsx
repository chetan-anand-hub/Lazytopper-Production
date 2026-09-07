import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

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
 * ★ WHY A PLACEMENT TEST AND NOT ONLY A PRESENCE TEST. At >=1180px this landing is a
 * frozen, non-scrolling screen: html/body/#root and `.lt-frozen-landing` are all
 * `height:100vh; overflow:hidden`, and `.lt-landing-viewport` is a grid whose items are
 * the stage's own children (`.lt-landing-stage` is `display:contents`). Mounted INSIDE
 * the stage the footer fills the fifth, previously unused, grid row. Mounted one level
 * out — as a direct child of `<main>`, which is how the same component is mounted on
 * the two SCROLLING pages COPY-1 covered — it would be clipped away with no scrollbar
 * to reach it: present in the DOM, every presence assertion green, and invisible to
 * every student. That is a silent no-op, so the structure is pinned deliberately.
 * Verified in a real browser at 1024/1280/1440, signed out: the footer hit-tests as
 * the topmost element at its own centre point.
 *
 * A landing-page visitor is signed out; useAuth is the page's only non-router dependency.
 */
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: null }) }));

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

  it("mounts the footer INSIDE .lt-landing-stage, not as a sibling of it", () => {
    // ★ The clipping property described in the file header. Moving the mount out of
    // the stage keeps every presence assertion above green and makes the footer
    // unreachable at >=1180px, so it gets its own assertion.
    const { container } = renderWelcome();
    const stage = container.querySelector(".lt-landing-stage");
    const foot = screen.getByRole("contentinfo", { name: "Legal" });
    expect(stage).not.toBeNull();
    expect(stage!.contains(foot)).toBe(true);
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
    expect(hrefs.length).toBe(allHrefs.length);
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
