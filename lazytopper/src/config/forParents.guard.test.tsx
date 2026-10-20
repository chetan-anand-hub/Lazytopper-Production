import { describe, it, expect, afterEach } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { render, screen, cleanup, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import ForParentsPage, { FREE_CHECK_TO, PARENT_SHARE_HREF } from "../pages/ForParentsPage";
import PublicLegalFooter from "../components/ux/PublicLegalFooter";
import { SELF_CANONICAL_EXACT } from "./canonicalUrl";
import { sitemapPaths } from "./sitemapUrls";
import { STATIC_PAGE_HEADS, ROUTE_CHUNK_MODULES } from "../../scripts/seo/writeStaticHeads";
import { testimonialVideoJsonLdFor } from "../../scripts/seo/testimonialVideoJsonLd";

/**
 * PARENTS-1 — `/for-parents`, the parent landing page.
 *
 *   (a) it is registered everywhere a public page must be: the self-canonical list, the
 *       sitemap, `llms.txt`, the generated Vercel rewrites, the route-module preload map, and
 *       a static head within the length limits;
 *   (b) the page (rendered, and the committed prerender of it) has the H1, BOTH
 *       "Send LazyTopper to my child" buttons as plain links to `https://wa.me/?text=…` whose
 *       message carries `utm_source=parent_share`, the VideoObject, and NO youtube `src`/iframe;
 *   (c) the forbidden copy is absent, and so are `ref=parent`, a price and any sign-up link;
 *   (d) Welcome has the parent line and the public footer has "For parents";
 *   (e) PARENTS-CTA-1 (owner ruling 2026-10-19): EXACTLY two "Check one answer free" links
 *       (hero + closing section) to `/check-improve?from=for_parents&utm_source=for_parents`,
 *       and a "See pricing" link to /pricing in the cost answer — in the rendered page AND
 *       the committed prerender; plus a fifth, UNLINKED tile "A tutor for doubts, explained
 *       step by step". The share buttons, the no-price and no-sign-up rules are unchanged.
 *   (f) MUMMY-1 (owner, 20 Oct 2026): Mummy's journey sits between the hero and the video, and
 *       its beat 4 REUSES the page's two actions with placement "journey" — so the page (and its
 *       prerender) now holds THREE of each, in the order hero → journey → footer, all identical
 *       in href. Nothing else on the page moved.
 *
 * Every detector takes its input as an argument and is run against SYNTHETIC violating input
 * in the CONTROL tests, so a typo'd regex cannot sit green on a correct tree.
 */

const ROOT = process.cwd(); // vitest runs with cwd = lazytopper/
const read = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");

afterEach(() => cleanup());

function renderedPage(): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={["/for-parents"]}>
      <ForParentsPage />
    </MemoryRouter>,
  );
}

/** The share anchors in a piece of HTML: `<a …>Send LazyTopper to my child</a>` → their hrefs. */
function shareHrefs(html: string): string[] {
  return [...html.matchAll(/<a\b[^>]*\bhref="([^"]*)"[^>]*>\s*Send LazyTopper to my child\s*<\/a>/g)].map((m) =>
    m[1].replace(/&amp;/g, "&"),
  );
}

/** The "Check one answer free" anchors in a piece of HTML → their hrefs (`&amp;` decoded). */
function freeCheckHrefs(html: string): string[] {
  return [...html.matchAll(/<a\b[^>]*\bhref="([^"]*)"[^>]*>\s*Check one answer free\s*<\/a>/g)].map((m) =>
    m[1].replace(/&amp;/g, "&"),
  );
}

/** The "See pricing" anchors → their hrefs. */
function pricingHrefs(html: string): string[] {
  return [...html.matchAll(/<a\b[^>]*\bhref="([^"]*)"[^>]*>\s*See pricing\s*<\/a>/g)].map((m) => m[1]);
}

const FREE_CHECK_HREF = "/check-improve?from=for_parents&utm_source=for_parents";

const TUTOR_TILE = "A tutor for doubts, explained step by step";
/** The tutor tile must be present, exactly once, as unlinked text (`<span>`, never inside `<a>`). */
function tutorTileProblems(html: string): string[] {
  const problems: string[] = [];
  const count = html.split(TUTOR_TILE).length - 1;
  if (count !== 1) problems.push(`tutor tile appears ${count} times`);
  if (!html.includes(`<li><span>${TUTOR_TILE}</span></li>`)) problems.push("tutor tile is not an unlinked <span>");
  if (new RegExp(`<a\\b[^>]*>\\s*${TUTOR_TILE}`).test(html)) problems.push("tutor tile is linked");
  return problems;
}

/** Offending patterns in the page's visible words and links; empty means clean. */
const FORBIDDEN: ReadonlyArray<[string, RegExp]> = [
  ["predicted", /predicted/i],
  ["will come in 2027", /will come in 2027/i],
  ["guaranteed", /guarantee/i],
  ["leaked", /leak/i],
  ["free mocks checked", /free mocks? checked/i],
  ["a price (rupee sign)", /₹/],
  ["a price (Rs / INR)", /\b(?:Rs\.?|INR)\s?\d/i],
  ["ref=parent", /ref=parent/i],
  ["a sign-up or login link", /href="[^"]*\/(?:sign-up|login)\b/i],
  ["a sign-up button", /\b(?:sign up|signup|create (?:an )?account|register)\b/i],
];
function copyProblems(html: string): string[] {
  return FORBIDDEN.filter(([, re]) => re.test(html)).map(([name]) => name);
}

function mediaProblems(html: string): string[] {
  const problems: string[] = [];
  if (/<iframe/i.test(html)) problems.push("an iframe");
  if (/\bsrc="[^"]*(?:youtube|ytimg|google)/i.test(html)) problems.push("a youtube/ytimg/google src");
  return problems;
}

describe("PARENTS-1 (a) — /for-parents is registered everywhere a public page must be", () => {
  it("is self-canonical and advertised in the sitemap set", () => {
    expect(SELF_CANONICAL_EXACT).toContain("/for-parents");
    expect(sitemapPaths()).toContain("/for-parents");
  });

  it("is in llms.txt (same style as the guide line) and in the generated Vercel rewrites", () => {
    expect(read("public/llms.txt")).toContain("- [For parents](https://www.lazytopper.com/for-parents):");
    expect(JSON.parse(readFileSync(resolve(ROOT, "..", "vercel.json"), "utf8")).rewrites.map((r: { source: string }) => r.source)).toContain(
      "/:path(for-parents/?)",
    );
  });

  it("has a route-module preload entry, and a static head within the limits", () => {
    expect(ROUTE_CHUNK_MODULES.some((e) => e.prefix === "/for-parents" && e.exact && e.modules.includes("ForParentsPage"))).toBe(true);
    const head = STATIC_PAGE_HEADS["/for-parents"];
    expect(head, "no static head for /for-parents").toBeDefined();
    expect(head.title.length, head.title).toBeLessThanOrEqual(60);
    expect(head.title).toMatch(/Parents/);
    expect(head.title).toMatch(/CBSE Class 10/);
    expect(head.description.length, head.description).toBeLessThanOrEqual(155);
    expect(copyProblems(head.title + " " + head.description)).toEqual([]);
  });

  it("carries the same VideoObject JSON-LD as the other two video pages", () => {
    const ld = testimonialVideoJsonLdFor("/for-parents", "https://www.lazytopper.com/");
    expect(ld?.["@type"]).toBe("VideoObject");
    expect(ld).toEqual(testimonialVideoJsonLdFor("/check-your-answer", "https://www.lazytopper.com/"));
  });
});

describe("PARENTS-1 (b) — the page has the H1, both share buttons, the video and no youtube src", () => {
  const html = renderedPage();

  it("the H1 and the sub-line are the spec's words", () => {
    expect(html).toContain("<h1>See exactly where your child loses marks in CBSE Class 10.</h1>");
    expect(html).toContain("marks it step by step, the way a CBSE examiner does, and shows what to fix.");
  });

  it("ALL 'Send LazyTopper to my child' buttons (hero, Mummy's journey, footer) are links to wa.me carrying the parent_share tags", () => {
    const hrefs = shareHrefs(html);
    expect(hrefs.length).toBe(3);
    for (const href of hrefs) {
      expect(href.startsWith("https://wa.me/?text=")).toBe(true);
      expect(href).toContain("utm_source%3Dparent_share");
      expect(href).toContain("utm_medium%3Dwhatsapp");
      expect(href).toContain(encodeURIComponent("https://www.lazytopper.com/check-improve?"));
    }
    expect(hrefs).toEqual([PARENT_SHARE_HREF, PARENT_SHARE_HREF, PARENT_SHARE_HREF]);
    expect(html).toContain('data-testid="fp-share-hero"');
    expect(html).toContain('data-testid="fp-share-journey"');
    expect(html).toContain('data-testid="fp-share-footer"');
  });

  it("the share message is exactly the spec's, and the cost / progress / routine copy is verbatim", () => {
    const message = decodeURIComponent(shareHrefs(html)[0].slice("https://wa.me/?text=".length));
    expect(message).toBe(
      "Try this for your Class 10 board prep: photograph a written answer and see the marks for every step, " +
        "the way a CBSE examiner marks it. " +
        "https://www.lazytopper.com/check-improve?utm_source=parent_share&utm_medium=whatsapp",
    );
    expect(html).toContain("The first answer check is free, without an account. A new account gets a 7-day Premium trial.");
    expect(html).toContain("Not yet. A weekly parent summary is planned.");
    expect(html).toContain("15–20 minutes a day, on the phone or the laptop, up to the February 2027 boards.");
    expect((html.match(/<details>/g) ?? []).length).toBe(5);
  });

  it("the video facade is present and nothing loads from youtube before a click", () => {
    expect(html).toContain("See it on a real answer sheet");
    expect(mediaProblems(html)).toEqual([]);
  });

  it("the five tiles link only to existing public pages (the fourth and the tutor tile have no link)", () => {
    for (const to of ["/check-your-answer", "/practice-hub", "/highly-probable/10/Maths"]) {
      expect(html).toContain(`href="${to}"`);
    }
    expect(html).toContain("<span>Practice on weak topics</span>");
    // PARENTS-CTA-1 (owner, 2026-10-19): the tutor tile is plain text — the tutor needs an account.
    expect(tutorTileProblems(html)).toEqual([]);
    const tiles = html.slice(html.indexOf('<ul class="lt-fp__tiles">'));
    expect((tiles.slice(0, tiles.indexOf("</ul>")).match(/<li>/g) ?? []).length).toBe(5);
  });

  it("the committed prerender of the page (mobile and desktop) has the same, plus no youtube src", () => {
    for (const rel of ["prerendered/for-parents.html", "prerendered/__desktop/for-parents.html"]) {
      expect(existsSync(resolve(ROOT, rel)), `${rel} is missing: take the artifact from this PR's capture run`).toBe(true);
      const pre = read(rel);
      expect(pre).toContain("See exactly where your child loses marks in CBSE Class 10.");
      const hrefs = shareHrefs(pre);
      expect(hrefs.length, rel).toBe(3);
      expect(hrefs.every((h) => h.startsWith("https://wa.me/?text=") && h.includes("utm_source%3Dparent_share")), rel).toBe(true);
      expect(mediaProblems(pre), rel).toEqual([]);
      expect(copyProblems(pre), rel).toEqual([]);
      // PARENTS-CTA-1 — the free-check links and the pricing link are in the frozen HTML too.
      expect(freeCheckHrefs(pre), rel).toEqual([FREE_CHECK_HREF, FREE_CHECK_HREF, FREE_CHECK_HREF]);
      expect(pricingHrefs(pre), rel).toEqual(["/pricing"]);
      expect(pre, rel).toContain('data-testid="fp-free-check-hero"');
      expect(pre, rel).toContain('data-testid="fp-free-check-footer"');
      expect(tutorTileProblems(pre), rel).toEqual([]);
      // MUMMY-1 — the journey's words are in the frozen HTML; Mummy herself (an SVG) is not.
      expect(pre, rel).toContain('data-testid="mummy-journey"');
      expect(pre, rel).toContain("Marks cut, but where?");
      expect(pre, rel).toContain("Hand it to your child");
      expect(pre, rel).toContain('data-testid="fp-share-journey"');
      expect(pre, rel).toContain('data-testid="fp-free-check-journey"');
      expect(pre, rel).toContain('<div class="lt-mj__fig" data-testid="mummy-slot" aria-hidden="true"></div>');
    }
  });

  it("CONTROL — the share-link extractor and the media detector fire on violating input", () => {
    const good = '<a class="x" href="https://wa.me/?text=a" target="_blank">Send LazyTopper to my child</a>';
    expect(shareHrefs(good + good)).toEqual(["https://wa.me/?text=a", "https://wa.me/?text=a"]);
    expect(shareHrefs('<a href="/sign-up">Send LazyTopper to my child</a>')).toEqual(["/sign-up"]); // the caller's wa.me check is what rejects it
    expect(shareHrefs("<p>no link</p>")).toEqual([]);
    expect(mediaProblems('<iframe src="https://www.youtube-nocookie.com/embed/x"></iframe>').length).toBeGreaterThan(0);
    expect(mediaProblems('<img src="https://i.ytimg.com/vi/x/hq.jpg">')).toContain("a youtube/ytimg/google src");
    expect(mediaProblems('<img src="/media/swajeet-testimonial-1280x720.jpg">')).toEqual([]);
  });
});

describe("PARENTS-1 (c) — the forbidden copy, ref=parent, a price and a sign-up link are absent", () => {
  it("the rendered page is clean", () => {
    expect(copyProblems(renderedPage())).toEqual([]);
  });

  it("the page source never builds a ref=parent link or a price", () => {
    const src = read("src/pages/ForParentsPage.tsx").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(src).not.toMatch(/ref=parent/i);
    expect(src).not.toMatch(/₹/);
  });

  it("CONTROL — each forbidden pattern fires on a synthetic violation", () => {
    const violations: Record<string, string> = {
      predicted: "<p>Predicted questions</p>",
      "will come in 2027": "<p>This will come in 2027</p>",
      guaranteed: "<p>Guaranteed marks</p>",
      leaked: "<p>leaked paper</p>",
      "free mocks checked": "<p>free mocks checked</p>",
      "a price (rupee sign)": "<p>₹499</p>",
      "a price (Rs / INR)": "<p>Rs. 499</p>",
      "ref=parent": '<a href="/check-improve?ref=parent">x</a>',
      "a sign-up or login link": '<a href="/sign-up">x</a>',
      "a sign-up button": "<button>Sign up</button>",
    };
    for (const [name, html] of Object.entries(violations)) {
      expect(copyProblems(html), name).toContain(name);
    }
    expect(copyProblems("<p>Your child photographs a written answer.</p>")).toEqual([]);
  });
});

describe("PARENTS-CTA-1 (e) — 'Check one answer free' (hero + footer) and a /pricing link", () => {
  const html = renderedPage();

  it("EXACTLY three 'Check one answer free' links (hero, Mummy's journey, footer), all to the tagged free-check URL (entity-encoded &amp; in HTML)", () => {
    expect(FREE_CHECK_TO).toBe(FREE_CHECK_HREF);
    expect(freeCheckHrefs(html)).toEqual([FREE_CHECK_HREF, FREE_CHECK_HREF, FREE_CHECK_HREF]);
    expect(html).toContain('href="/check-improve?from=for_parents&amp;utm_source=for_parents"');
    expect(html).toContain('data-testid="fp-free-check-hero"');
    expect(html).toContain('data-testid="fp-free-check-footer"');
    // Hero pair: share first, then free check; same in the closing section.
    expect(html.indexOf('data-testid="fp-share-hero"')).toBeLessThan(html.indexOf('data-testid="fp-free-check-hero"'));
    expect(html.indexOf('data-testid="fp-free-check-hero"')).toBeLessThan(html.indexOf('data-testid="fp-share-journey"'));
    expect(html.indexOf('data-testid="fp-share-journey"')).toBeLessThan(html.indexOf('data-testid="fp-free-check-journey"'));
    expect(html.indexOf('data-testid="fp-free-check-journey"')).toBeLessThan(html.indexOf('data-testid="fp-share-footer"'));
    expect(html.indexOf('data-testid="fp-share-footer"')).toBeLessThan(html.indexOf('data-testid="fp-free-check-footer"'));
    // Secondary styling by class, never an inline style object.
    const anchors = html.match(/<a\b[^>]*>\s*Check one answer free\s*<\/a>/g) ?? [];
    expect(anchors.length).toBe(3);
    for (const anchor of anchors) {
      expect(anchor).toContain('class="lt-fp__cta2"');
      expect(anchor).not.toMatch(/\bstyle=/);
    }
  });

  it("the cost answer keeps its true copy and links 'See pricing' to /pricing — still with no price figure", () => {
    expect(pricingHrefs(html)).toEqual(["/pricing"]);
    const cost = html.slice(html.indexOf("<summary>What does it cost?</summary>"));
    const answer = cost.slice(0, cost.indexOf("</details>"));
    expect(answer).toContain("The first answer check is free, without an account. A new account gets a 7-day Premium trial.");
    expect(pricingHrefs(answer)).toEqual(["/pricing"]);
    expect(copyProblems(html)).toEqual([]);
  });

  it("CONTROL — the extractors fire on input with the links and stay empty without", () => {
    const a = '<a class="lt-fp__cta2" href="/check-improve?from=for_parents&amp;utm_source=for_parents">Check one answer free</a>';
    expect(freeCheckHrefs(a + a)).toEqual([FREE_CHECK_HREF, FREE_CHECK_HREF]);
    expect(freeCheckHrefs("<p>Check one answer free</p>")).toEqual([]);
    expect(pricingHrefs('<a href="/pricing">See pricing</a>')).toEqual(["/pricing"]);
    expect(pricingHrefs("<p>See pricing</p>")).toEqual([]);
    expect(tutorTileProblems(`<li><span>${TUTOR_TILE}</span></li>`)).toEqual([]);
    expect(tutorTileProblems(`<li><a href="/tutor">${TUTOR_TILE}</a></li>`)).toContain("tutor tile is linked");
    expect(tutorTileProblems("<li><span>Practice on weak topics</span></li>")).toContain("tutor tile appears 0 times");
  });
});

describe("MUMMY-1 (f) — Mummy's journey sits between the hero and the video, and nothing else moved", () => {
  const html = renderedPage();

  it("is after the hero's actions and before the video, with all four beats' words in the HTML", () => {
    const at = html.indexOf('data-testid="mummy-journey"');
    expect(at).toBeGreaterThan(html.indexOf('data-testid="fp-free-check-hero"'));
    expect(at).toBeLessThan(html.indexOf('data-testid="testimonial-video"'));
    for (const s of ["Marks cut, but where?", "Step by step, like CBSE", "Clear next steps", "Hand it to your child"]) {
      expect(html).toContain(s);
    }
    expect(html.match(/data-testid="mummy-journey"/g)?.length).toBe(1);
  });

  it("the hero is unchanged (its own two actions, no Mummy)", () => {
    const hero = html.slice(html.indexOf('<header class="lt-fp__hero">'), html.indexOf("</header>") + "</header>".length);
    expect(hero).toContain('data-testid="fp-share-hero"');
    expect(hero).toContain('data-testid="fp-free-check-hero"');
    expect(hero).not.toContain("mummy");
  });
});

describe("PARENTS-1 (d) — Welcome has the parent line and the public footer has 'For parents'", () => {
  it("Welcome.tsx carries ONE parent line, right after the guide link (the rendered check is in Welcome.legalFooter.test.tsx, which may read the clock)", () => {
    const src = read("src/pages/Welcome.tsx");
    const guide = '<Link to="/check-your-answer">How do examiners mark answers? &rarr; Read the guide</Link>';
    const parent = '<Link to="/for-parents">Are you a parent? See how LazyTopper helps your child &rarr;</Link>';
    expect(src.split(parent).length - 1).toBe(1);
    expect(src.indexOf(parent)).toBeGreaterThan(src.indexOf(guide));
    expect(src.indexOf(parent) - (src.indexOf(guide) + guide.length)).toBeLessThan(40); // next line, nothing between
  });

  it("the public footer links 'For parents' to /for-parents, among the page links and before the social row", () => {
    render(
      <MemoryRouter>
        <PublicLegalFooter />
      </MemoryRouter>,
    );
    const foot = screen.getByRole("contentinfo", { name: "Legal" });
    const links = within(foot).getAllByRole("link");
    const parents = links.find((a) => a.textContent === "For parents");
    expect(parents?.getAttribute("href")).toBe("/for-parents");
    const firstExternal = links.findIndex((a) => /^https:\/\//.test(a.getAttribute("href") || ""));
    expect(links.indexOf(parents!)).toBeLessThan(firstExternal);
  });
});
