/**
 * GUARD - SEO-DAILY-1: the registry behind /important-question-of-the-day is a set of POINTERS into the real question bank.
 *   - every row's bankId is a real row of its chapter's pack rows (so syllabus-deleted rows can never be a page), and its marks, subject
 *     and chapter equal the bank's; the page's question is never typed anywhere in the registry;
 *   - n and slug are unique, the slug is one URL segment ending in -mark / -marks that names the marks;
 *   - every head fits the SEO caps (title <= 60 with "Class 10" and "2027", description <= 155), no banned word;
 *   - the sitemap, the self-canonical family, the Vercel closed-set rewrite and llms.txt list exactly the registry's pages;
 *   - the page text never carries a rupee sign (showsRupeeSign rule) and the hub is reachable from only the two named public pages.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  DAILY_DESCRIPTION_CAP,
  DAILY_HUB_HEAD,
  DAILY_HUB_PATH,
  DAILY_QUESTIONS,
  DAILY_TITLE_CAP,
  dailyChapterName,
  dailyHeadForPath,
  dailyJsonLd,
  dailyNeighbours,
  dailyQuestionPath,
  dailyQuestionSlugs,
  dailyQuestionsNewestFirst,
} from "./dailyQuestions";
import { sitemapPaths } from "../../config/sitemapUrls";
import { canonicalPathFor } from "../../config/canonicalUrl";
import { PARAM_CONSTRAINTS } from "../../config/routeRewrites";
import { headForPath, routeChunkModulesFor, pageJsonLd } from "../../../scripts/seo/writeStaticHeads";
import { showsRupeeSign } from "../cbq/cbqSeo";

const ROOT = process.cwd();
const BANNED = /\bAI\b|answer key|\boptional\b|refund|money.back|guarantee|Check\s*(?:&|and)\s*Improve/i;

describe("SEO-DAILY-1 registry", () => {
  it("is a non-empty, unique, one-segment closed set", () => {
    expect(DAILY_QUESTIONS.length).toBeGreaterThan(0);
    expect(new Set(DAILY_QUESTIONS.map((q) => q.n)).size).toBe(DAILY_QUESTIONS.length);
    expect(new Set(dailyQuestionSlugs()).size).toBe(DAILY_QUESTIONS.length);
    for (const q of DAILY_QUESTIONS) {
      expect(q.slug, q.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*-[0-9]+-marks?$/);
      expect(q.slug.endsWith(`-${q.marks}-${q.marks === 1 ? "mark" : "marks"}`), q.slug).toBe(true);
      expect(q.date, q.slug).toMatch(/^2026-\d\d-\d\d$/);
      expect(() => dailyChapterName(q)).not.toThrow();
    }
  });

  it("★ every row points at a REAL bank row, and marks / subject match it (the registry holds no question text)", async () => {
    const content = await import("../../lib/packs/packContent");
    for (const q of DAILY_QUESTIONS) {
      await content.loadChapter(q.chapterSlug);
      const row = content.chapterPackRows(q.chapterSlug).find((r) => r.id === q.bankId);
      expect(row, `${q.bankId} is not a pack row of ${q.chapterSlug}`).toBeTruthy();
      expect(Number(row?.marks), q.bankId).toBe(q.marks);
      expect(content.bankSubjectOf(q.chapterSlug), q.bankId).toBe(q.subject);
      expect((row?.solutionSteps ?? []).filter(Boolean).length, `${q.bankId} has a stored step-wise solution`).toBeGreaterThan(0);
      expect(showsRupeeSign(row!), `${q.bankId} prints a rupee sign`).toBe(false);
    }
    const src = readFileSync(resolve(ROOT, "src/components/dailyQuestion/dailyQuestions.ts"), "utf8");
    expect(src).not.toMatch(/questionText|solutionSteps|finalAnswer/);
  });

  it("heads fit the caps, name Class 10 and 2027, and carry no banned word", () => {
    expect(DAILY_HUB_HEAD.title.length).toBeLessThanOrEqual(DAILY_TITLE_CAP);
    expect(DAILY_HUB_HEAD.description.length).toBeLessThanOrEqual(DAILY_DESCRIPTION_CAP);
    for (const path of [DAILY_HUB_PATH, ...dailyQuestionSlugs().map(dailyQuestionPath)]) {
      const head = headForPath(path);
      expect(head, path).toBeTruthy();
      expect(head!.title.length, path).toBeLessThanOrEqual(DAILY_TITLE_CAP);
      expect(head!.title, path).toMatch(/Class 10/);
      expect(head!.title, path).toMatch(/2027/);
      expect(head!.description.length, path).toBeLessThanOrEqual(DAILY_DESCRIPTION_CAP);
      expect(`${head!.title} ${head!.description}`, path).not.toMatch(BANNED);
      expect(dailyHeadForPath(path)).toEqual(head);
      expect(routeChunkModulesFor(path)).toEqual([path === DAILY_HUB_PATH ? "DailyQuestionHubPage" : "DailyQuestionPage"]);
    }
    expect(dailyHeadForPath("/important-question-of-the-day/not-a-question")).toBeNull();
  });

  it("JSON-LD is a BreadcrumbList (+ LearningResource on a question), built for the stamped pages", () => {
    const hub = dailyJsonLd(DAILY_HUB_PATH, "") as { "@type": string };
    expect(hub["@type"]).toBe("BreadcrumbList");
    for (const q of DAILY_QUESTIONS) {
      const ld = dailyJsonLd(dailyQuestionPath(q.slug), "") as { "@graph": Array<{ "@type": string; url?: string }> };
      expect(ld["@graph"].map((n) => n["@type"])).toEqual(["BreadcrumbList", "LearningResource"]);
      expect(ld["@graph"][1].url).toBe(`https://www.lazytopper.com${dailyQuestionPath(q.slug)}`);
      expect(pageJsonLd(dailyQuestionPath(q.slug), "", true)).toEqual(ld);
    }
    expect(dailyJsonLd("/important-question-of-the-day/nope", "")).toBeNull();
  });

  it("hub order is newest first; prev / next follow posting order", () => {
    const ns = dailyQuestionsNewestFirst().map((q) => q.n);
    expect(ns).toEqual([...ns].sort((a, b) => b - a));
    const first = DAILY_QUESTIONS.reduce((a, b) => (a.n < b.n ? a : b));
    const last = DAILY_QUESTIONS.reduce((a, b) => (a.n > b.n ? a : b));
    expect(dailyNeighbours(first.slug).prev).toBeNull();
    expect(dailyNeighbours(last.slug).next).toBeNull();
    expect(dailyNeighbours(last.slug).prev).not.toBeNull();
  });
});

describe("SEO-DAILY-1 advertised, canonical, rewritten, listed", () => {
  it("the sitemap lists the hub and exactly the registry's pages; each is self-canonical", () => {
    const paths = sitemapPaths().filter((p) => p === DAILY_HUB_PATH || p.startsWith(`${DAILY_HUB_PATH}/`));
    expect(paths).toEqual([DAILY_HUB_PATH, ...dailyQuestionSlugs().map(dailyQuestionPath)]);
    for (const p of paths) expect(canonicalPathFor(p), p).toBe(p);
  });

  const vercel = JSON.parse(readFileSync(resolve(ROOT, "../vercel.json"), "utf8")) as { rewrites: Array<{ source: string; destination: string }> };
  const rules = vercel.rewrites.filter((r) => r.source.startsWith("/:path(important-question-of-the-day/") && r.source !== "/:path(important-question-of-the-day/?)");

  it("vercel.json: one closed-set rule whose slugs equal the registry, both directions; unknown slugs match nothing", () => {
    expect(rules).toHaveLength(1);
    expect(rules[0].source).not.toContain("[^/]+");
    expect(rules[0].destination).toBe("/__shell.html");
    const m = /^\/:path\(important-question-of-the-day\/\(\?:([^)]*)\)\/\?\)$/.exec(rules[0].source);
    const rule = m ? m[1].split("|") : [];
    expect(rule.slice().sort()).toEqual(dailyQuestionSlugs().slice().sort());
    expect(PARAM_CONSTRAINTS["/important-question-of-the-day/:slug"]).toEqual(dailyQuestionSlugs());
    const re = new RegExp(`^/${/^\/:path\((.*)\)$/s.exec(rules[0].source)![1]}$`);
    for (const s of dailyQuestionSlugs()) expect(re.test(`${DAILY_HUB_PATH}/${s}`), s).toBe(true);
    for (const bad of [`${DAILY_HUB_PATH}/not-a-question`, `${DAILY_HUB_PATH}/probability`, `${DAILY_HUB_PATH}/${dailyQuestionSlugs()[0]}-x`]) {
      expect(re.test(bad), bad).toBe(false);
    }
    expect(vercel.rewrites.some((r) => r.source === "/:path(important-question-of-the-day/?)" && r.destination === "/__shell.html")).toBe(true);
  });

  it("llms.txt lists the hub and every question page", () => {
    const llms = readFileSync(resolve(ROOT, "public/llms.txt"), "utf8");
    for (const p of [DAILY_HUB_PATH, ...dailyQuestionSlugs().map(dailyQuestionPath)]) expect(llms, p).toContain(`https://www.lazytopper.com${p})`);
  });

  it("the hub is linked only from /cbse/class-10 and /question-bank-class-10 (no nav, home or practice hub), behind the kill switch", () => {
    const read = (f: string) => readFileSync(resolve(ROOT, f), "utf8");
    expect(read("src/pages/Cbse2027Page.tsx")).toContain("<DailyQuestionLink />");
    expect(read("src/pages/QuestionBankClass10Page.tsx")).toContain("<DailyQuestionLink />");
    for (const f of ["src/App.tsx", "src/pages/Welcome.tsx", "src/pages/desktop/DesktopPracticePage.tsx", "src/components/ux/PublicLegalFooter.tsx"]) {
      expect(read(f), f).not.toMatch(/DailyQuestionLink|DAILY_HUB_PATH/);
    }
    expect(read("src/components/dailyQuestion/DailyQuestionLink.tsx")).toContain("VITE_DAILY_QUESTION_DISABLED");
  });
});
