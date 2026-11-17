/**
 * GUARD - SEO-MCQ-1: the registry behind /free-mcq-class-10 is pinned to the content file and to the chapter registry.
 *   - 27 banks, unique slugs (one URL segment), every parent chapter is in the chapter registry, every non-Heights slug IS its parent chapter's slug;
 *   - every row's manifest id, subject, chapter name and question count equal src/content/freeMcq/freeMcqPreview.json, which holds 173 questions;
 *   - every question has four non-empty options a-d, an answer in a-d, a unique positive n; no banned word, no rupee sign, balanced `$` maths;
 *   - the registry module imports no JSON (it feeds the entry chunk's sitemap/rewrite helpers);
 *   - heads fit the SEO caps, the sitemap / canonical family / Vercel closed-set rewrite / llms.txt list exactly the registry's pages;
 *   - the hub is reachable only from /cbse/class-10 and the question-bank table (no nav, home or practice hub), behind the kill switch.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  FREE_MCQ_CHAPTERS,
  FREE_MCQ_DESCRIPTION_CAP,
  FREE_MCQ_HUB_HEAD,
  FREE_MCQ_HUB_PATH,
  FREE_MCQ_TITLE_CAP,
  freeMcqForParent,
  freeMcqHeadForPath,
  freeMcqJsonLd,
  freeMcqNeighbours,
  freeMcqPath,
  freeMcqSlugs,
  freeMcqTotalQuestions,
} from "./freeMcqPages";
import { cbqTopicBySlug } from "../cbq/cbqSeo";
import { sitemapPaths } from "../../config/sitemapUrls";
import { canonicalPathFor } from "../../config/canonicalUrl";
import { PARAM_CONSTRAINTS } from "../../config/routeRewrites";
import { headForPath, routeChunkModulesFor, pageJsonLd } from "../../../scripts/seo/writeStaticHeads";
import { chapterLinks } from "../seoPages/seoPages";
import data from "../../content/freeMcq/freeMcqPreview.json";

const ROOT = process.cwd();
const BANNED = /\bAI\b|answer key|\boptional\b|refund|money.back|guarantee|Check\s*(?:&|and)\s*Improve/i;
const banks = (data as { chapters: Array<{ manifestId: string; subject: string; chapter: string; pdfFile: string; questions: Array<{ n: number; question: string; options: Record<string, string>; answer: string; explanation: string }> }> }).chapters;

describe("SEO-MCQ-1 registry", () => {
  it("27 banks: a unique, one-segment closed set whose parent chapters are all in the chapter registry", () => {
    expect(FREE_MCQ_CHAPTERS).toHaveLength(27);
    expect(new Set(freeMcqSlugs()).size).toBe(27);
    expect(new Set(FREE_MCQ_CHAPTERS.map((c) => c.manifestId)).size).toBe(27);
    for (const c of FREE_MCQ_CHAPTERS) {
      expect(c.slug, c.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(cbqTopicBySlug(c.parentSlug), `${c.slug}: parent ${c.parentSlug} is in the chapter registry`).toBeTruthy();
      if (c.slug !== "heights-and-distances") expect(c.slug, "a bank's slug is its chapter's registry slug").toBe(c.parentSlug);
    }
    // Trigonometry is the one chapter with two banks (Introduction to Trigonometry, Heights and Distances).
    expect(freeMcqForParent("trigonometry").map((c) => c.slug)).toEqual(["trigonometry", "heights-and-distances"]);
    expect(freeMcqForParent("heredity")).toHaveLength(1);
  });

  it("★ every row equals the content file (manifest id, subject, chapter, count), in the same order; 173 questions in all", () => {
    expect(banks.map((b) => b.manifestId)).toEqual(FREE_MCQ_CHAPTERS.map((c) => c.manifestId));
    for (const [i, c] of FREE_MCQ_CHAPTERS.entries()) {
      const b = banks[i];
      expect(b.subject, c.slug).toBe(c.subject);
      expect(b.chapter, c.slug).toBe(c.chapter);
      expect(b.questions.length, c.slug).toBe(c.count);
    }
    expect(freeMcqTotalQuestions()).toBe(173);
    expect((data as { totalKept: number }).totalKept).toBe(173);
  });

  it("every question: unique positive n, four non-empty options a-d, an answer in a-d; no banned word, no rupee sign, balanced maths", () => {
    for (const b of banks) {
      const ns = b.questions.map((q) => q.n);
      expect(new Set(ns).size, b.chapter).toBe(ns.length);
      for (const q of b.questions) {
        const id = `${b.chapter} Q${q.n}`;
        expect(q.n, id).toBeGreaterThan(0);
        expect(Object.keys(q.options).sort(), id).toEqual(["a", "b", "c", "d"]);
        for (const t of Object.values(q.options)) expect(t.trim().length, id).toBeGreaterThan(0);
        expect(["a", "b", "c", "d"], id).toContain(q.answer);
        for (const t of [q.question, q.explanation, ...Object.values(q.options)]) {
          expect(t, id).not.toMatch(BANNED);
          expect(t, id).not.toContain("₹");
          expect((t.match(/\$/g) ?? []).length % 2, `${id}: unbalanced $`).toBe(0);
        }
      }
    }
  });

  it("the registry module reads no JSON and no bank (it feeds the entry chunk's helpers)", () => {
    const src = readFileSync(resolve(ROOT, "src/components/freeMcq/freeMcqPages.ts"), "utf8");
    const imports = src.split("\n").filter((l) => l.startsWith("import "));
    expect(imports.join("\n")).not.toMatch(/\.json|packContent|lib\/packs|react/);
  });

  it("neighbours follow registry order", () => {
    expect(freeMcqNeighbours(FREE_MCQ_CHAPTERS[0].slug).prev).toBeNull();
    expect(freeMcqNeighbours(FREE_MCQ_CHAPTERS[26].slug).next).toBeNull();
    expect(freeMcqNeighbours(FREE_MCQ_CHAPTERS[1].slug).prev?.slug).toBe(FREE_MCQ_CHAPTERS[0].slug);
  });
});

describe("SEO-MCQ-1 heads, chunks, JSON-LD", () => {
  it("heads fit the caps, name Class 10 and 2027, carry no banned word, and map to their lazy chunk", () => {
    expect(FREE_MCQ_HUB_HEAD.title.length).toBeLessThanOrEqual(FREE_MCQ_TITLE_CAP);
    expect(FREE_MCQ_HUB_HEAD.description.length).toBeLessThanOrEqual(FREE_MCQ_DESCRIPTION_CAP);
    for (const path of [FREE_MCQ_HUB_PATH, ...freeMcqSlugs().map(freeMcqPath)]) {
      const head = headForPath(path);
      expect(head, path).toBeTruthy();
      expect(head!.title.length, path).toBeLessThanOrEqual(FREE_MCQ_TITLE_CAP);
      expect(head!.title, path).toMatch(/Class 10/);
      expect(head!.title, path).toMatch(/2027/);
      expect(head!.description.length, path).toBeLessThanOrEqual(FREE_MCQ_DESCRIPTION_CAP);
      expect(`${head!.title} ${head!.description}`, path).not.toMatch(BANNED);
      expect(freeMcqHeadForPath(path)).toEqual(head);
      expect(routeChunkModulesFor(path)).toEqual([path === FREE_MCQ_HUB_PATH ? "FreeMcqHubPage" : "FreeMcqChapterPage"]);
    }
    expect(freeMcqHeadForPath("/free-mcq-class-10/not-a-chapter")).toBeNull();
    expect(new Set(freeMcqSlugs().map((s) => headForPath(freeMcqPath(s))!.title)).size, "titles are unique").toBe(27);
  });

  it("JSON-LD is a BreadcrumbList (+ a LearningResource named like the H1 on a chapter), built for the stamped pages", () => {
    expect((freeMcqJsonLd(FREE_MCQ_HUB_PATH, "") as { "@type": string })["@type"]).toBe("BreadcrumbList");
    for (const c of FREE_MCQ_CHAPTERS) {
      const ld = freeMcqJsonLd(freeMcqPath(c.slug), "") as { "@graph": Array<{ "@type": string; url?: string; name?: string }> };
      expect(ld["@graph"].map((n) => n["@type"])).toEqual(["BreadcrumbList", "LearningResource"]);
      expect(ld["@graph"][1].url).toBe(`https://www.lazytopper.com${freeMcqPath(c.slug)}`);
      expect(ld["@graph"][1].name).toBe(`${c.chapter} MCQs Class 10 with Answers (CBSE 2026-27)`);
      expect(pageJsonLd(freeMcqPath(c.slug), "", true)).toEqual(ld);
    }
    expect(freeMcqJsonLd("/free-mcq-class-10/nope", "")).toBeNull();
  });
});

describe("SEO-MCQ-1 advertised, canonical, rewritten, listed", () => {
  it("the sitemap lists the hub and exactly the registry's pages; each is self-canonical", () => {
    const paths = sitemapPaths().filter((p) => p === FREE_MCQ_HUB_PATH || p.startsWith(`${FREE_MCQ_HUB_PATH}/`));
    expect(paths).toEqual([FREE_MCQ_HUB_PATH, ...freeMcqSlugs().map(freeMcqPath)]);
    for (const p of paths) expect(canonicalPathFor(p), p).toBe(p);
  });

  const vercel = JSON.parse(readFileSync(resolve(ROOT, "../vercel.json"), "utf8")) as { rewrites: Array<{ source: string; destination: string }> };
  const rules = vercel.rewrites.filter((r) => r.source.startsWith("/:path(free-mcq-class-10/") && r.source !== "/:path(free-mcq-class-10/?)");

  it("vercel.json: one closed-set rule whose slugs equal the registry, both directions; unknown slugs match nothing", () => {
    expect(rules).toHaveLength(1);
    expect(rules[0].source).not.toContain("[^/]+");
    expect(rules[0].destination).toBe("/__shell.html");
    const m = /^\/:path\(free-mcq-class-10\/\(\?:([^)]*)\)\/\?\)$/.exec(rules[0].source);
    const rule = m ? m[1].split("|") : [];
    expect(rule.slice().sort()).toEqual(freeMcqSlugs().slice().sort());
    expect(PARAM_CONSTRAINTS["/free-mcq-class-10/:slug"]).toEqual(freeMcqSlugs());
    const re = new RegExp(`^/${/^\/:path\((.*)\)$/s.exec(rules[0].source)![1]}$`);
    for (const s of freeMcqSlugs()) expect(re.test(`${FREE_MCQ_HUB_PATH}/${s}`), s).toBe(true);
    for (const bad of [`${FREE_MCQ_HUB_PATH}/not-a-chapter`, `${FREE_MCQ_HUB_PATH}/trigonometry-x`, `${FREE_MCQ_HUB_PATH}/real`]) expect(re.test(bad), bad).toBe(false);
    expect(vercel.rewrites.some((r) => r.source === "/:path(free-mcq-class-10/?)" && r.destination === "/__shell.html")).toBe(true);
  });

  it("llms.txt lists the hub and every chapter page", () => {
    const llms = readFileSync(resolve(ROOT, "public/llms.txt"), "utf8");
    for (const p of [FREE_MCQ_HUB_PATH, ...freeMcqSlugs().map(freeMcqPath)]) expect(llms, p).toContain(`https://www.lazytopper.com${p})`);
    const section = llms.slice(llms.indexOf("## Free MCQs"), llms.indexOf("## Optional"));
    expect(section).not.toMatch(BANNED);
  });

  it("the question-bank chapter rows carry the MCQ links (Trigonometry two, every other chapter one), each an advertised page", () => {
    const advertised = new Set(sitemapPaths());
    const rows = chapterLinks();
    for (const row of rows) {
      expect(row.mcq.length, row.topic.slug).toBe(row.topic.slug === "trigonometry" ? 2 : 1);
      for (const l of row.mcq) expect(advertised.has(l.href), l.href).toBe(true);
    }
    expect(rows.flatMap((r) => r.mcq)).toHaveLength(27);
  });

  it("the hub is linked only from /cbse/class-10 and the question-bank table (no nav, home or practice hub), behind the kill switch", () => {
    const read = (f: string) => readFileSync(resolve(ROOT, f), "utf8");
    expect(read("src/pages/Cbse2027Page.tsx")).toContain("<FreeMcqLink />");
    expect(read("src/pages/QuestionBankClass10Page.tsx")).toContain("isFreeMcqPagesKilled");
    for (const f of ["src/App.tsx", "src/pages/Welcome.tsx", "src/pages/desktop/DesktopPracticePage.tsx", "src/components/ux/PublicLegalFooter.tsx"]) {
      expect(read(f), f).not.toMatch(/FreeMcqLink|FREE_MCQ_HUB_PATH/);
    }
    expect(read("src/components/freeMcq/FreeMcqLink.tsx")).toContain("VITE_FREE_MCQ_PAGES_DISABLED");
  });
});
