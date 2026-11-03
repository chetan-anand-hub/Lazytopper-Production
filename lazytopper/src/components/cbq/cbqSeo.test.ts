// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  CBQ_DESCRIPTION_CAP,
  CBQ_HUB_H1,
  CBQ_HUB_HEAD,
  CBQ_HUB_PATH,
  CBQ_SAMPLE_COUNT,
  CBQ_TITLE_CAP,
  cbqChapterH1,
  cbqChapterPath,
  cbqChapterSlugs,
  cbqChapterTopics,
  cbqHeadForPath,
  cbqJsonLd,
  pickCbqSamples,
  showsRupeeSign,
  type CbqSampleRow,
} from "./cbqSeo";
import { applyHead, applyJsonLd, headForPath, pageJsonLd, ROUTE_CHUNK_MODULES, routeChunkModulesFor } from "../../../scripts/seo/writeStaticHeads";
import { canonicalFor, canonicalPathFor } from "../../config/canonicalUrl";
import { sitemapPaths, sitemapUrls } from "../../config/sitemapUrls";
import { cbqPackRows, isCbqPackRow, loadChapter } from "../../lib/packs/packContent";
import { needsMissingFigure } from "../../lib/figureSafe";
import { foldForCompare } from "../../../../scripts/src/syllabusGuard";
import { PACK_CHAPTER_SLUGS } from "../../services/packs";
import { CBQ_PREMIUM_BUTTON, CBQ_PREMIUM_HEADING } from "./CbqCtas";
import { CBQ_HUB_FAQ } from "../seo/faqContent";

const row = (id: string, format: string, marks = 1, steps: string[] | undefined = ["[1 mark] step"]): CbqSampleRow => ({
  id,
  format,
  marks,
  solutionSteps: steps,
});

describe("CBQ-SEO-1 pickCbqSamples — pure, deterministic, bounded", () => {
  const rows = [
    row("Z-9", "Long", 5),
    row("A-2", "MCQ"),
    row("A-1", "MCQ"),
    row("B-1", "Assertion-Reasoning"),
    row("C-2", "VSA", 2),
    row("C-1", "Short", 3),
    row("D-1", "Case-Based", 4),
    row("E-1", "Long", 5),
  ];

  it("takes at most five, one per format first, lowest id in each format, in format order", () => {
    const out = pickCbqSamples(rows);
    expect(out.map((q) => q.id)).toEqual(["A-1", "B-1", "C-1", "D-1", "E-1"]);
    expect(out.length).toBeLessThanOrEqual(CBQ_SAMPLE_COUNT);
  });

  it("is deterministic: any input order gives the same answer, and the input is not mutated", () => {
    const shuffled = [...rows].reverse();
    const before = shuffled.map((q) => q.id).join();
    expect(pickCbqSamples(shuffled).map((q) => q.id)).toEqual(pickCbqSamples(rows).map((q) => q.id));
    expect(shuffled.map((q) => q.id).join()).toBe(before);
    expect(pickCbqSamples(rows)).toEqual(pickCbqSamples(rows));
  });

  it("never returns a row without a stored solution, and never invents one", () => {
    const withGaps = [{ id: "A-1", format: "MCQ", marks: 1 } as CbqSampleRow, row("A-2", "MCQ", 1, []), row("A-3", "MCQ", 1, [""]), row("A-4", "MCQ")];
    expect(pickCbqSamples(withGaps).map((q) => q.id)).toEqual(["A-4"]);
    const out = pickCbqSamples(rows);
    for (const q of out) expect(rows).toContain(q);
  });

  it("skips a row that would print a rupee sign anywhere (the prerender price guard cannot tell it from a price)", () => {
    const money = { id: "A-0", format: "MCQ", marks: 1, questionText: "Cost is \u20B960", solutionSteps: ["[1 mark] ok"] } as CbqSampleRow;
    const inStep = { id: "A-00", format: "MCQ", marks: 1, solutionSteps: ["[1 mark] 3 \u00D7 \u20B940 = \u20B9120"] } as CbqSampleRow;
    expect(showsRupeeSign(money)).toBe(true);
    expect(showsRupeeSign(inStep)).toBe(true);
    expect(pickCbqSamples([money, inStep, row("A-1", "MCQ")]).map((q) => q.id)).toEqual(["A-1"]);
  });

  it("tops up from formats that have more rows when a format is missing", () => {
    const few = [row("A-1", "MCQ"), row("A-2", "MCQ"), row("A-3", "MCQ"), row("L-1", "Long", 5), row("L-2", "Long", 5)];
    const out = pickCbqSamples(few);
    expect(out.map((q) => q.id)).toEqual(["A-1", "A-2", "A-3", "L-1", "L-2"]);
  });

  it("returns fewer than five when the chapter has fewer, and nothing for nothing", () => {
    expect(pickCbqSamples([row("A-1", "MCQ")]).length).toBe(1);
    expect(pickCbqSamples([])).toEqual([]);
  });
});

describe("CBQ-SEO-1 27 URLs: hub + one page per chapter", () => {
  it("the chapter set is the 26 registry chapters, 13 Maths + 13 Science, in the packs' order", () => {
    const topics = cbqChapterTopics();
    expect(topics.length).toBe(26);
    expect(topics.filter((t) => t.subject === "Maths").length).toBe(13);
    expect(topics.filter((t) => t.subject === "Science").length).toBe(13);
    expect(cbqChapterSlugs()).toEqual([...PACK_CHAPTER_SLUGS]);
  });

  it("the sitemap advertises the hub and every chapter page, each self-canonical", () => {
    const paths = sitemapPaths();
    expect(paths).toContain(CBQ_HUB_PATH);
    for (const slug of cbqChapterSlugs()) {
      const path = cbqChapterPath(slug);
      expect(paths, path).toContain(path);
      expect(canonicalPathFor(path), path).toBe(path);
    }
    expect(canonicalPathFor(CBQ_HUB_PATH)).toBe(CBQ_HUB_PATH);
    // A made-up slug or a deeper path is NOT self-canonical.
    expect(canonicalPathFor("/cbq-class-10/not-a-chapter/x")).toBe("/");
    const urls = sitemapUrls("");
    expect(urls.filter((u) => u.includes("/cbq-class-10")).length).toBe(27);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("the checked-in sitemap.xml lists all 27", () => {
    const xml = readFileSync(resolve(__dirname, "../../../public/sitemap.xml"), "utf8");
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    const cbq = locs.filter((u) => u.includes("/cbq-class-10"));
    expect(cbq.length).toBe(27);
    expect(cbq).toContain("https://www.lazytopper.com/cbq-class-10");
    expect(cbq).toContain("https://www.lazytopper.com/cbq-class-10/circles");
  });

  it("every page has a route chunk entry naming a lazy route in App.tsx", () => {
    const app = readFileSync(resolve(__dirname, "../../App.tsx"), "utf8");
    expect(routeChunkModulesFor(CBQ_HUB_PATH)).toEqual(["CbqHubPage"]);
    expect(routeChunkModulesFor(cbqChapterPath("circles"))).toEqual(["CbqChapterPage"]);
    expect(ROUTE_CHUNK_MODULES.some((e) => e.prefix === "/cbq-class-10/" && !e.exact)).toBe(true);
    expect(app).toContain('import("./pages/cbq/CbqHubPage")');
    expect(app).toContain('import("./pages/cbq/CbqChapterPage")');
    expect(app).toContain('path="/cbq-class-10"');
    expect(app).toContain('path="/cbq-class-10/:chapterSlug"');
  });
});

describe("CBQ-SEO-1 heads and JSON-LD", () => {
  const all = [CBQ_HUB_PATH, ...cbqChapterSlugs().map(cbqChapterPath)];

  it("every page has a unique title <= 60 and a unique description <= 155, wired into writeStaticHeads", () => {
    const titles = new Set<string>();
    const descriptions = new Set<string>();
    for (const path of all) {
      const head = headForPath(path);
      expect(head, path).not.toBeNull();
      expect(head).toEqual(cbqHeadForPath(path));
      expect(head!.title.length, `${path} title`).toBeLessThanOrEqual(CBQ_TITLE_CAP);
      expect(head!.description.length, `${path} description`).toBeLessThanOrEqual(CBQ_DESCRIPTION_CAP);
      expect(head!.title).toMatch(/LazyTopper$/);
      titles.add(head!.title);
      descriptions.add(head!.description);
    }
    expect(titles.size).toBe(all.length);
    expect(descriptions.size).toBe(all.length);
  });

  it("a stamped page carries its own canonical, og:url and a JSON-LD block that parses", () => {
    const shell = [
      "<html><head>",
      '<link rel="canonical" href="https://www.lazytopper.com/" />',
      '<meta property="og:url" content="https://www.lazytopper.com/" />',
      "<title>Home</title>",
      '<meta name="description" content="home" />',
      '<meta property="og:title" content="home" />',
      '<meta property="og:description" content="home" />',
      '<meta name="twitter:title" content="home" />',
      '<meta name="twitter:description" content="home" />',
      "</head><body></body></html>",
    ].join("\n");
    for (const path of all) {
      const head = headForPath(path)!;
      const url = canonicalFor(path, "");
      const stamped = applyHead(shell, { path, url, title: head.title, description: head.description });
      const ld = pageJsonLd(path, "", true);
      expect(ld, path).not.toBeNull();
      const html = applyJsonLd(stamped, ld!, path);
      expect(html).toContain(`<link rel="canonical" href="${url}" />`);
      expect(html).toContain(`<meta property="og:url" content="${url}" />`);
      const block = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)![1];
      const parsed = JSON.parse(block);
      const graph = (parsed["@graph"] ?? [parsed]) as Array<Record<string, unknown>>;
      const crumbs = graph.find((n) => n["@type"] === "BreadcrumbList") as { itemListElement: Array<{ item: string; position: number }> };
      expect(crumbs.itemListElement.at(-1)!.item).toBe(url);
      expect(crumbs.itemListElement.map((c) => c.position)).toEqual(crumbs.itemListElement.map((_, i) => i + 1));
    }
    expect(cbqJsonLd("/notes/circles", "")).toBeNull();
  });
});

/**
 * The chapter selection on the REAL bank, all 26 chapters: only rows the CBQ pack sells, only rows with a
 * solution, none that demand a figure, none whose sub-topic is on the syllabus guard's banned list.
 * The banned list is READ FROM scripts/src/syllabusGuard.ts (never typed here) with its own fold function.
 */
function bannedSubtopicsFromGuard(): Set<string> {
  const src = readFileSync(resolve(__dirname, "../../../../scripts/src/syllabusGuard.ts"), "utf8");
  const out = new Set<string>();
  for (const block of src.matchAll(/bannedSubtopics:\s*\[([\s\S]*?)\n\s*\],/g)) {
    for (const s of block[1].matchAll(/^\s*"((?:[^"\\]|\\.)*)",?\s*$/gm)) out.add(foldForCompare(s[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\")));
  }
  return out;
}

describe("CBQ-SEO-1 chapter selection on the real bank (all 26 chapters)", () => {
  const banned = bannedSubtopicsFromGuard();

  it("reads a non-trivial banned list from the guard file (cannot pass vacuously)", () => {
    expect(banned.size).toBeGreaterThan(40);
    expect(banned.has(foldForCompare("Euclid's Division Lemma"))).toBe(true);
  });

  it("each chapter yields up to 5 distinct, pack-eligible, solved, figure-free, in-syllabus CBQs", async () => {
    let total = 0;
    for (const slug of cbqChapterSlugs()) {
      await loadChapter(slug);
      const safe = cbqPackRows(slug).filter((q) => !needsMissingFigure(q, () => false));
      const picked = pickCbqSamples(safe);
      expect(picked.length, slug).toBeGreaterThan(0);
      expect(picked.length, slug).toBeLessThanOrEqual(CBQ_SAMPLE_COUNT);
      expect(new Set(picked.map((q) => q.id)).size, slug).toBe(picked.length);
      expect(pickCbqSamples(safe).map((q) => q.id), `${slug} deterministic`).toEqual(picked.map((q) => q.id));
      for (const q of picked) {
        expect(isCbqPackRow(q), q.id).toBe(true);
        expect(q.topicKey, q.id).toBe(slug);
        expect((q.solutionSteps ?? []).filter(Boolean).length, q.id).toBeGreaterThan(0);
        expect(needsMissingFigure(q, () => false), `${q.id} demands a figure`).toBe(false);
        expect(showsRupeeSign(q), `${q.id} prints a rupee sign`).toBe(false);
        expect(banned.has(foldForCompare(q.subtopic)), `${q.id} sub-topic "${q.subtopic}" is banned`).toBe(false);
      }
      total += picked.length;
    }
    expect(total).toBeGreaterThan(100);
  }, 120_000);
});

// CBQ-PAGE-WORDING-1 — Google Ads flagged ads landing here as "Enabling dishonest behavior" (read
// "2027 + answers/solutions" as selling exam answers). Titles, headings, meta and CTAs on the CBQ
// pages must never carry these words (owner ruling 3 Nov 2026). Body text is out of this guard.
describe("CBQ-PAGE-WORDING-1 · ad-landing wording guard", () => {
  const BANNED = /\b(answers?|answer key|solutions?|hacks?|tricks?|crack(?:s|ed|ing)?|leak(?:s|ed|ing)?)\b/i;
  const strings: Record<string, string> = {
    "hub title": CBQ_HUB_HEAD.title,
    "hub meta description": CBQ_HUB_HEAD.description,
    "hub H1": CBQ_HUB_H1,
    "premium CTA heading": CBQ_PREMIUM_HEADING,
    "premium CTA button": CBQ_PREMIUM_BUTTON,
    "hub FAQ questions": CBQ_HUB_FAQ.map((f) => f.question).join(" | "),
  };
  for (const [label, text] of Object.entries(strings)) {
    it(`${label} has no answer/solution/hack/trick/crack/leak wording`, () => {
      expect(text).not.toMatch(BANNED);
    });
  }
  it("every chapter page title, meta description, H1 and JSON-LD name is clean", () => {
    for (const topic of cbqChapterTopics()) {
      const path = cbqChapterPath(topic.slug);
      const head = cbqHeadForPath(path)!;
      expect(head.title, path).not.toMatch(BANNED);
      expect(head.description, path).not.toMatch(BANNED);
      expect(cbqChapterH1(topic.name), path).not.toMatch(BANNED);
      expect(JSON.stringify(cbqJsonLd(path, "")), path).not.toMatch(BANNED);
    }
  });
});
