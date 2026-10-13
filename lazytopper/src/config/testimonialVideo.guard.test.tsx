// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import CheckYourAnswerPage from "../pages/CheckYourAnswerPage";
import Cbse2027Page from "../pages/Cbse2027Page";
import TestimonialVideo from "../components/marketing/TestimonialVideo";
import { applyJsonLd, pageJsonLd } from "../../scripts/seo/writeStaticHeads";

/**
 * GUARD — VIDEO-EMBED-1: the student testimonial on `/check-your-answer` and `/cbse/class-10`.
 *
 * ★ WHAT THIS PINS, AND WHY NOTHING ELSE CATCHES IT.
 *   (a) THE SERVED HTML carries exactly one `VideoObject` (embed id, duration) and the transcript
 *       sentence — head from the SAME composition `writeStaticHeads` runs (`pageJsonLd` ->
 *       `applyJsonLd`), body from the real page. A page that renders the video but loses its
 *       structured data, or the reverse, is green everywhere else.
 *   (b) BEFORE THE CLICK nothing is fetched from YouTube or Google: no `src` (iframe, script, img)
 *       names it. Third-party embeds are the classic silent regression.
 *   (c) CONSENT: "our student" appears nowhere in pages or components, and the first name appears
 *       only in the TestimonialVideo module(s) and the JSON-LD builder.
 *
 * ⚠ EVERY DETECTOR HAS A CONTROL: `youtubeInSrc` is fed an eager-iframe page and must fire,
 * otherwise a typo'd regex would sit green on a broken page.
 */

const LAZYTOPPER = process.cwd(); // vitest runs with cwd = lazytopper/
const PAGES = ["/check-your-answer", "/cbse/class-10"] as const;
const HOME = "https://www.lazytopper.com/";
const INDEX_HTML = readFileSync(resolve(LAZYTOPPER, "index.html"), "utf8");

/** Every `src="…"` value that names YouTube, in any tag. */
export function youtubeInSrc(html: string): string[] {
  return [...html.matchAll(/\ssrc\s*=\s*"([^"]*)"/gi)].map((m) => m[1]).filter((v) => /youtube|ytimg|google/i.test(v));
}

function ldBlocks(html: string): string[] {
  return [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
}

function body(path: string): string {
  const page = path === "/check-your-answer" ? <CheckYourAnswerPage /> : <Cbse2027Page />;
  return renderToStaticMarkup(<MemoryRouter initialEntries={[path]}>{page}</MemoryRouter>);
}

/** The served document: the stamped head (real composition) + the page body. */
function served(path: string): string {
  const ld = pageJsonLd(path, "", true);
  expect(ld, `${path}: no JSON-LD composed`).not.toBeNull();
  return applyJsonLd(INDEX_HTML, ld as object, path).replace('<div id="root"></div>', `<div id="root">${body(path)}</div>`);
}

describe("VIDEO-EMBED-1 (a) — the served HTML carries the VideoObject and the transcript", () => {
  for (const path of PAGES) {
    it(`${path}: exactly one VideoObject, the embed id, PT38S, and the transcript sentence`, () => {
      const html = served(path);
      const videoBlocks = ldBlocks(html).filter((b) => JSON.parse(b)["@type"] === "VideoObject");
      expect(videoBlocks.length, `${path}: VideoObject blocks`).toBe(1);
      const video = JSON.parse(videoBlocks[0]) as Record<string, unknown>;
      expect(String(video.embedUrl)).toMatch(/\/embed\/LN5CqyYDpGQ$/);
      expect(video.duration).toBe("PT38S");
      expect(video.uploadDate).toBe("2026-10-12T20:00:00+05:30");
      expect(video.inLanguage).toBe("en-IN");
      expect((video.publisher as Record<string, unknown>)["@type"]).toBe("Organization");
      const clips = video.hasPart as Array<Record<string, unknown>>;
      expect(clips.map((c) => [c["@type"], c.startOffset, c.endOffset, c.url])).toEqual([
        ["Clip", 0, 10, "https://www.youtube.com/watch?v=LN5CqyYDpGQ&t=0"],
        ["Clip", 10, 20, "https://www.youtube.com/watch?v=LN5CqyYDpGQ&t=10"],
        ["Clip", 20, 38, "https://www.youtube.com/watch?v=LN5CqyYDpGQ&t=20"],
      ]);
      expect(String(video.transcript)).toContain("I solved a problem without writing the formula");
      expect((video.thumbnailUrl as string[])[0]).toBe("https://www.lazytopper.com/media/swajeet-testimonial-1280x720.jpg");
      // the visible transcript is in the page BODY, inside a <details>
      expect(html).toMatch(/<details[^>]*>\s*<summary>Read the transcript<\/summary>/);
      expect(body(path)).toContain("I solved a problem without writing the formula");
    });
  }

  it("CONTROL — no other advertised page gets a VideoObject, and the two pages emit the SAME object", () => {
    expect(pageJsonLd("/pricing", "", true)).toBeNull();
    expect(pageJsonLd("/", "", true)).toBeNull();
    expect(pageJsonLd(PAGES[0], "", true)).toEqual(pageJsonLd(PAGES[1], "", true));
  });
});

describe("VIDEO-EMBED-1 (b) — nothing from YouTube or Google before the click", () => {
  for (const path of PAGES) {
    it(`${path}: the facade is a thumbnail + a button, with no youtube/ytimg/google src and no iframe or script`, () => {
      const html = body(path);
      expect(html, "precondition: the facade is on the page").toContain('class="lt-tv__play"');
      expect(html).toContain('src="/media/swajeet-testimonial-1280x720.jpg"');
      expect(youtubeInSrc(html)).toEqual([]);
      expect(html).not.toMatch(/<iframe/i);
      expect(html).not.toMatch(/<script/i);
    });
  }

  it("CONTROL — the detector fires on an eager iframe", () => {
    const eager = '<div><iframe src="https://www.youtube-nocookie.com/embed/LN5CqyYDpGQ"></iframe></div>';
    expect(youtubeInSrc(eager)).toHaveLength(1);
    expect(youtubeInSrc('<img src="https://i.ytimg.com/vi/x/maxresdefault.jpg">')).toHaveLength(1);
    expect(youtubeInSrc('<img src="/media/a.jpg">')).toEqual([]);
  });

  it("the component alone, pre-click, is clean", () => {
    const html = renderToStaticMarkup(<TestimonialVideo heading="h" lede="l" />);
    expect(youtubeInSrc(html)).toEqual([]);
  });
});

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|css|md)$/.test(name)) out.push(p);
  }
  return out;
}

describe("VIDEO-EMBED-1 (c) — consent and naming", () => {
  const files = [...walk(resolve(LAZYTOPPER, "src/pages")), ...walk(resolve(LAZYTOPPER, "src/components"))];

  it("precondition: the scan sees the pages and the component", () => {
    const rel = files.map((f) => relative(LAZYTOPPER, f).replace(/\\/g, "/"));
    expect(rel).toContain("src/pages/CheckYourAnswerPage.tsx");
    expect(rel).toContain("src/components/marketing/TestimonialVideo.tsx");
  });

  it('"our student" appears nowhere under src/pages or src/components', () => {
    const hits = files.filter((f) => /\bour student/i.test(readFileSync(f, "utf8")));
    expect(hits.map((f) => relative(LAZYTOPPER, f))).toEqual([]);
  });

  it('"Swajeet" appears only in the TestimonialVideo module(s) and the JSON-LD builder', () => {
    const builder = resolve(LAZYTOPPER, "scripts/seo/testimonialVideoJsonLd.ts");
    const scanned = [...files, ...walk(resolve(LAZYTOPPER, "scripts/seo"))];
    const hits = scanned
      .filter((f) => /swajeet/i.test(readFileSync(f, "utf8")))
      .filter((f) => f !== builder && !/[\\/]TestimonialVideo[^\\/]*$/.test(f))
      .map((f) => relative(LAZYTOPPER, f).replace(/\\/g, "/"));
    expect(hits).toEqual([]);
    // precondition: the allowed home really holds it (a scan that finds nothing anywhere would pass)
    expect(/swajeet/i.test(readFileSync(resolve(LAZYTOPPER, "src/components/marketing/TestimonialVideoData.ts"), "utf8"))).toBe(true);
  });

  it("the rendered pages and the JSON-LD name only the first name: no capitalised word follows it, and no 'our student'", () => {
    const SURNAME = /Swajeet\s+(?!and\b)[A-Z]/;
    // CONTROL: the detector fires on a surname and stays quiet on the real transcript wording.
    expect(SURNAME.test("Swajeet Kumar")).toBe(true);
    expect(SURNAME.test("My name is Swajeet and I'm studying in Class 10.")).toBe(false);
    for (const path of PAGES) {
      const html = served(path);
      expect(html, `${path}: precondition — the first name is on the page`).toContain("Swajeet");
      expect(html).not.toMatch(SURNAME);
      expect(html).not.toMatch(/\bour student/i);
    }
  });
});
