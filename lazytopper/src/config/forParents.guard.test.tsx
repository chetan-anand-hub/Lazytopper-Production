import { describe, it, expect, afterEach, vi } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { render, screen, cleanup, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: null, loading: false }) }));
vi.mock("../services/activityClient", () => ({ recordActivity: vi.fn() }));

import ForParentsPage, { CBSE_PAGE_TO, FREE_CHECK_TO, PARENT_SHARE_HREF } from "../pages/ForParentsPage";
import PublicLegalFooter from "../components/ux/PublicLegalFooter";
import { SELF_CANONICAL_EXACT } from "./canonicalUrl";
import { sitemapPaths } from "./sitemapUrls";
import { STATIC_PAGE_HEADS, ROUTE_CHUNK_MODULES } from "../../scripts/seo/writeStaticHeads";
import { testimonialVideoJsonLdFor } from "../../scripts/seo/testimonialVideoJsonLd";
import { FP_PILLS, FP_LEAD, GOOGLE_RATING } from "./forParentsPage";
import { ISLAND_PATH_PREFIXES, IDLE_UPGRADE_PATHS } from "../islands/islandConfig";

/**
 * /for-parents - registration (PARENTS-1 a), the Welcome / footer links (d), and the PARENTS-V2-1 rebuild: every spec block in order, none
 * of the removed ones, the island path, the Google line from ONE constant, poster-only videos, lazy sized images, the copy rules.
 * Rendered page AND the committed prerender (mobile + desktop).
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

/** Offending patterns in the page's visible words; empty means clean. */
const FORBIDDEN: ReadonlyArray<[string, RegExp]> = [
  ["predicted", /predicted/i],
  ["guaranteed", /guarantee/i],
  ["ref=parent", /ref=parent/i],
  ["a sign-up or login link", /href="[^"]*\/(?:sign-up|login)\b/i],
  ["a sign-up button", /\b(?:sign up|signup|create (?:an )?account|register)\b/i],
  ["AI", /\bAI\b/],
  ["answer key", /answer key/i],
  ["optional", /\boptional\b/i],
  ["refund", /refund/i],
  ["a tuition / school comparison", /tuition|coaching class/i],
  ["a crossed-out price", /<(?:s|del|strike)\b/i],
];
function copyProblems(full: string): string[] {
  // The shared public footer (its own legal links, e.g. /legal/refund) is not this page's copy.
  const cut = full.indexOf("<footer");
  const html = cut > 0 ? full.slice(0, cut) : full;
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


const ORDER = [
  'class="lt-fp__hero"',
  'data-testid="fp-price"',
  'data-testid="fp-proof"',
  'data-testid="fp-founder"',
  'data-testid="fp-students"',
  'data-testid="fp-osfo"',
  'data-testid="fp-helps"',
  'data-testid="fp-pills"',
  'data-testid="fp-cbq"',
  'data-testid="fp-faq"',
  'data-testid="fp-foot"',
];
const REMOVED = [
  "fp-pay-price", "fp-packs", "fp-share-hero", "mummy-journey", "mummy-check-nudge", "From worry to pride", "A routine that fits", "Hand it to your child",
  "Can I see my child", "What does it cost?", "fp-packs-hero", "fp-packs-band",
];

describe("PARENTS-V2-1 - the page renders every spec block in order, and none of the removed ones", () => {
  const html = renderedPage();
  const pages: Array<[string, string]> = [["rendered", html]];
  for (const rel of ["prerendered/for-parents.html", "prerendered/__desktop/for-parents.html"]) {
    it(`${rel} exists (take the artifact from this PR's capture run)`, () => expect(existsSync(resolve(ROOT, rel))).toBe(true));
    pages.push([rel, existsSync(resolve(ROOT, rel)) ? read(rel) : ""]);
  }

  for (const [name, h] of pages) {
    it(`${name}: blocks in the ruled order`, () => {
      const at = ORDER.map((m) => h.indexOf(m));
      expect(at.every((n) => n >= 0), `${name}: ${ORDER.filter((_, i) => at[i] < 0).join(", ")} missing`).toBe(true);
      expect([...at].sort((x, y) => x - y)).toEqual(at);
    });
    it(`${name}: the removed blocks are gone`, () => {
      for (const r of REMOVED) expect(h, `${name}: ${r}`).not.toContain(r);
      expect(h.match(/<details>/g)?.length).toBe(4);
    });
    it(`${name}: the owner's words (H1, lead, chips, pills, tagline, quote, panel)`, () => {
      expect(h).toContain("Your child’s answers, marked the way a CBSE examiner marks them.");
      expect(FP_LEAD).toBe("LazyTopper is a Class 10 exam-preparation platform. Your child writes an answer on paper, takes a photo, and sees exactly where marks were lost, and how to win them back.");
      expect(h).toContain("LazyTopper is a Class 10 exam-preparation platform. Your child writes an answer on paper, takes a photo, and sees exactly where marks were lost, and how to win them back.");
      expect(h).not.toMatch(/on the phone/);
      for (const c of ["Built by a teacher", "IIT Kanpur graduate", "Tested with 1,500 students"]) expect(h).toContain(c);
      expect(FP_PILLS).toEqual(["Pay once, no auto-debit", "GST invoice by email", "Works on phone or laptop", "Pre-boards start in December"]);
      expect(h).toContain("Works on phone or laptop");
      expect(h).not.toContain("Works on any phone");
      expect(h).toContain("One Size Fits One");
      expect(h).toContain("Shaped by 1,500 students");
      expect(h).toContain("English, Hindi, Hinglish or 7 more Indian languages.");
      expect(h).toContain("10,000+ questions with worked solutions, about half competency-based.");
      expect(h).toContain("See it work: check one answer free");
      expect(h).toContain("How does my child sign in after I pay?");
      expect(h).toContain("Chetan Anand teaching Class 10 science at a whiteboard");
      expect(h).toContain("Not only were my objectives corrected instantly, but even my subjective answers were graded.");
    });
    it(`${name}: the copy rules and the media rules hold`, () => {
      expect(copyProblems(h)).toEqual([]);
      expect(mediaProblems(h)).toEqual([]);
    });
    it(`${name}: the Google line reads the ONE constant (exactly what the profile shows)`, () => {
      expect(GOOGLE_RATING).toEqual({ stars: "5.0", reviews: 3, url: "https://share.google/pHP4n3fUwZumI5ZlD" });
      expect(h).toContain("5.0 on Google");
      expect(h).toContain("3 reviews");
      const a = /<a\b[^>]*href="https:\/\/share\.google\/pHP4n3fUwZumI5ZlD"[^>]*>/.exec(h)?.[0] ?? "";
      expect(a).toContain('target="_blank"');
      expect(a).toContain('rel="noopener noreferrer"');
    });
    it(`${name}: speed - no hero image; every image lazy with width and height; the videos are poster-only`, () => {
      const heroPart = h.slice(h.indexOf('class="lt-fp__hero"'), h.indexOf('data-testid="fp-proof"'));
      expect(heroPart).not.toMatch(/<img|<picture|<video/);
      const imgs = [...h.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]).filter((t) => /\/media\//.test(t) && !/brand\//.test(t));
      expect(imgs.length).toBeGreaterThanOrEqual(5);
      for (const t of imgs) {
        expect(t, t).toMatch(/loading="lazy"/);
        expect(t, t).toMatch(/\bwidth="\d+"/);
        expect(t, t).toMatch(/\bheight="\d+"/);
        expect(t, t).toMatch(/\balt="[^"]+"/);
      }
      expect((h.match(/<picture>/g) ?? []).length).toBeGreaterThanOrEqual(5);
      const videos = [...h.matchAll(/<video\b[^>]*>/g)].map((m) => m[0]);
      expect(videos.length).toBe(1);
      for (const v of videos) {
        expect(v).toContain('preload="none"');
        expect(v).toContain("poster=");
        expect(v).toContain("controls");
        expect(v).not.toMatch(/autoplay/i);
      }
      expect(h).toContain("tutor-demo-960.mp4");
    });
  }

  it("the Pay buttons: hero + second, both 'Pay for my child' (the total comes from config, see forParents.price.test)", () => {
    expect(html).toContain('data-testid="fp-pay-hero"');
    expect(html).toContain('data-testid="fp-pay-second"');
    expect(html.indexOf('data-testid="fp-pay-hero"')).toBeLessThan(html.indexOf('data-testid="fp-proof"'));
    expect(html.indexOf('data-testid="fp-pay-second"')).toBeLessThan(html.indexOf('data-testid="fp-pills"'));
  });

  it("the free-check link and the CBQ link keep their destinations; the share is a small footer link", () => {
    expect(html).toContain('href="/check-improve?from=for_parents&amp;utm_source=for_parents"');
    expect(FREE_CHECK_TO).toBe("/check-improve?from=for_parents&utm_source=for_parents");
    expect(html).toMatch(/<a href="\/cbq-packs"[^>]*>See it/);
    expect(html).toContain(`href="${PARENT_SHARE_HREF.replace(/&/g, "&amp;")}"`);
    expect(CBSE_PAGE_TO).toContain("from=for_parents");
  });

  it("the page source never prints a rupee figure or builds a ref=parent link", () => {
    const src = read("src/pages/ForParentsPage.tsx").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    expect(src).not.toMatch(/₹/);
    expect(src).not.toMatch(/ref=parent/i);
    expect(read("src/config/forParentsPage.ts").replace(/^\s*(?:\/\/|\*|\/\*).*$/gm, "")).not.toMatch(/₹/);
  });

  it("the video tag is poster-only in the source too, and the testimonial component is reused unchanged", () => {
    const src = read("src/pages/ForParentsPage.tsx");
    expect(src).toContain('preload="none"');
    expect(src).toContain("<TestimonialVideo");
  });

  it("CONTROL - the copy detector fires on synthetic violations", () => {
    expect(copyProblems("<p>AI marks it</p>")).toContain("AI");
    expect(copyProblems("<p>optional</p>")).toContain("optional");
    expect(copyProblems("<p>better than tuition</p>")).toContain("a tuition / school comparison");
    expect(copyProblems("<s>₹2,499</s>")).toContain("a crossed-out price");
    expect(copyProblems("<p>Your child photographs a written answer.</p>")).toEqual([]);
  });
});

describe("PARENTS-V2-1 - /for-parents is an island exactly like /board-pass", () => {
  it("is on the island path list and the idle-upgrade list", () => {
    expect(ISLAND_PATH_PREFIXES).toContain("/for-parents");
    expect(IDLE_UPGRADE_PATHS).toContain("/for-parents");
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
