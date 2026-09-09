// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import DesktopTopicHubPage from "../pages/desktop/DesktopTopicHubPage";
import { sitemapPaths } from "./sitemapUrls";
import { canonicalPathFor } from "./canonicalUrl";
import { allDesktopTopics } from "../lib/desktop/topics";

/**
 * GUARD — EVERY TOPIC URL THE SITEMAP ADVERTISES RENDERS A REAL PAGE.
 *
 * ★ THE RULE THIS ENFORCES: A SITEMAP ENTRY THAT 404s IS WORSE THAN AN ABSENT
 * ONE. It spends crawl budget, and Google demotes a property that keeps sending
 * it to nothing. On a SPA the ordinary defences do not exist — every path under
 * `/app/` returns HTTP 200 because the server hands back the same `index.html`,
 * so a status check can never find a dead sitemap URL. The failure is a SOFT
 * 404: a 200 whose body says "Topic not found".
 *
 * ⚠ AND THE REGISTRY'S OWN EXISTENCE IS NOT THE PROOF. `sitemapUrls.ts` derives
 * these slugs from `allDesktopTopics()`, but `DesktopTopicHubPage` renders
 * content only when BOTH `desktopTopicBySlug` resolves the slug AND
 * `buildActionableDesktopTopicHubContent` returns content for it; either one
 * returning undefined yields `TopicNotFound`. "It is in the array" is therefore
 * a different claim from "it resolves". This file RENDERS every advertised topic
 * URL through the REAL route table and reads what comes out.
 *
 * ★ WITH A CONTROL, because a not-found detector that never fires proves
 * nothing: a slug that is NOT in the registry must produce exactly the
 * not-found body this suite is looking for the absence of. Without it, a typo in
 * the matcher would report all 26 pages healthy — including, silently, a page
 * that had stopped resolving.
 *
 * ⚠ THIS FILE IS THE JSDOM HALF OF A PAIR. Its sibling
 * `sitemapUrls.guard.test.ts` is pinned to the NODE environment because it
 * imports `vite.config.ts`, which cannot be imported under jsdom. The
 * environment is per-FILE, so the derivation checks and these rendering checks
 * cannot share one.
 */

// TopicProgressTrend reads AuthContext + the cloud progress store. It is
// honest-or-silent (renders nothing without real graded work) and is not what
// this suite is about, so it is replaced wholesale. vi.mock is a COMPLETE
// replacement: the module has BOTH a named and a default export and both must
// be supplied or the import throws.
vi.mock("../components/progress/TopicProgressTrend", () => {
  const Stub = () => null;
  return { TopicProgressTrend: Stub, default: Stub };
});

/** The REAL route table App.tsx registers for this page, plus the redirect target. */
function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/topic-hub/:grade/:subject/:topicKey" element={<DesktopTopicHubPage />} />
        <Route path="/topic-hub/:topicName" element={<DesktopTopicHubPage />} />
        <Route path="/topic-hub" element={<DesktopTopicHubPage />} />
        <Route path="/exam-trends" element={<div data-testid="exam-trends" />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** The honest not-found body `DesktopTopicHubPage` renders for an unknown topic. */
const notFoundHeading = () => screen.queryByRole("heading", { name: /topic not found/i });

afterEach(cleanup);

describe("every topic URL in sitemap.xml resolves to a real page", () => {
  const advertised = sitemapPaths().filter((p) => p.startsWith("/topic-hub/"));

  it("★ the control fires — an unadvertised slug DOES render the not-found body", () => {
    // If this ever goes quiet, every "resolves" assertion below becomes vacuous.
    const bogus = "not-a-real-cbse-topic-xyz";
    expect(
      allDesktopTopics().some((t) => t.slug === bogus),
      "the control slug is in the registry — pick one that is not",
    ).toBe(false);

    renderAt(`/topic-hub/${bogus}`);
    expect(notFoundHeading(), "the not-found detector did not fire on a bogus slug").not.toBeNull();
  });

  it("★★ THE POINT — all advertised topic URLs render content, none renders a soft 404", () => {
    // Non-vacuous: an empty list would pass the loop below without rendering once.
    expect(advertised.length, "the sitemap advertises no topic URLs").toBeGreaterThan(0);
    expect(advertised.length).toBe(allDesktopTopics().length);

    const dead: string[] = [];
    const alive: string[] = [];
    for (const path of advertised) {
      const slug = path.slice("/topic-hub/".length);
      renderAt(path);
      if (notFoundHeading()) {
        dead.push(slug);
      } else {
        // Not merely "no not-found" — the page must actually name THIS topic.
        // A blank render would otherwise count as alive.
        const name = allDesktopTopics().find((t) => t.slug === slug)?.name ?? slug;
        const named = screen.queryAllByText(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
        if (named.length === 0) dead.push(`${slug} (rendered, but never names "${name}")`);
        else alive.push(slug);
      }
      cleanup();
    }

    // eslint-disable-next-line no-console
    console.log(
      `SITEMAP_TOPIC_RESOLUTION: advertised=${advertised.length} ` +
        `alive=${alive.length} dead=${dead.length} dead_slugs=${JSON.stringify(dead)}`,
    );

    expect(
      dead,
      `${dead.length} advertised topic URL(s) render a soft 404. Every one still ` +
        `returns HTTP 200 (the SPA shell), so no status check will ever find them.`,
    ).toEqual([]);
    expect(alive.length, "no advertised topic URL was proven alive").toBe(advertised.length);
  });

  /**
   * ★★ OWNER RULING, 2026-09-09 (FOLLOWON-1) — CLOSES
   * `[FU-SITEMAP-TOPIC-HUB-BARE-REDIRECTS]`. This test previously read
   * *"the bare /topic-hub entry REDIRECTS; it is advertised anyway, by ruling"*
   * and pinned the URL INTO the sitemap. The owner reversed it: *"With no
   * `:topicName` it is a signpost, not a destination, and a sitemap should
   * advertise pages rather than redirects."*
   *
   * ★ THE REDIRECT ASSERTION IS KEPT, NOT DELETED, AND THAT IS THE WHOLE VALUE OF
   * THIS TEST. "Not in the sitemap" alone would stay green if `/topic-hub` grew
   * real content tomorrow — the omission would silently become wrong. Asserting
   * WHY it is omitted means the day the route stops redirecting, this goes red and
   * someone re-rules, instead of a real page staying unadvertised forever.
   */
  it("★★ the bare /topic-hub REDIRECTS, and is therefore NOT advertised — by ruling", () => {
    // WHY it is excluded: with no topic named it renders <Navigate to="/exam-trends" replace/>.
    renderAt("/topic-hub");
    expect(
      screen.queryByTestId("exam-trends"),
      "/topic-hub no longer redirects to /exam-trends — it may now be a real " +
        "destination. Re-rule whether it should be advertised, and update this guard.",
    ).not.toBeNull();
    // It is a redirect, NOT a soft 404. The distinction is why its canonical names
    // /exam-trends rather than falling to the root.
    expect(notFoundHeading()).toBeNull();

    // THAT it is excluded — from the sitemap AND from the self-canonical set.
    expect(
      sitemapPaths(),
      "the ruling keeps the redirecting /topic-hub OUT of the sitemap",
    ).not.toContain("/topic-hub");
    expect(canonicalPathFor("/topic-hub")).toBe("/exam-trends");

    // CONTROL — the exclusion is SURGICAL. The 26 topic pages live under the same
    // prefix and are unaffected; an over-broad fix that dropped the whole family
    // would pass the assertion above while emptying the sitemap of its content.
    const topicPages = sitemapPaths().filter((p) => p.startsWith("/topic-hub/"));
    expect(topicPages.length, "the 26 topic pages were swept out with the parent").toBe(26);
  });
});
