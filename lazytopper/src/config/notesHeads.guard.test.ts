// @vitest-environment node
import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  applyJsonLd,
  headForPath,
  ncertFileCode,
  ncertLabel,
  notesJsonLd,
  NOTE_SPECS_DIR,
} from "../../scripts/seo/writeStaticHeads";
import { canonicalFor } from "./canonicalUrl";
import { sitemapPaths } from "./sitemapUrls";
import { desktopTopicBySlug } from "../lib/desktop/topics";

/**
 * SEO-NOTES-LINK-2 — the notes heads: the NCERT file code in the <title>, and one
 * BreadcrumbList + one LearningResource as JSON-LD in each notes page's built head.
 *
 * ★ THE CODE TABLE BELOW IS A SECOND WITNESS, written by hand from the NCERT 2026-27
 * file names (jemh1NN = Class 10 Mathematics, jesc1NN = Class 10 Science). The writer
 * reads the code from the spec; this table does not, so a reader bug cannot pass.
 */
const CODE_PIN: Readonly<Record<string, string>> = {
  "real-numbers": "jemh101",
  polynomials: "jemh102",
  "pair-of-linear-equations": "jemh103",
  "quadratic-equations": "jemh104",
  "arithmetic-progression": "jemh105",
  triangles: "jemh106",
  "coordinate-geometry": "jemh107",
  trigonometry: "jemh108",
  circles: "jemh110",
  "areas-related-to-circles": "jemh111",
  "surface-areas-and-volumes": "jemh112",
  statistics: "jemh113",
  probability: "jemh114",
  "chemical-reactions-and-equations": "jesc101",
  "acids-bases-and-salts": "jesc102",
  "metals-and-non-metals": "jesc103",
  "carbon-and-its-compounds": "jesc104",
  "life-processes": "jesc105",
  "control-and-coordination": "jesc106",
  "how-do-organisms-reproduce": "jesc107",
  heredity: "jesc108",
  "light-reflection-and-refraction": "jesc109",
  "human-eye-and-colourful-world": "jesc110",
  electricity: "jesc111",
  "magnetic-effects-of-electric-current": "jesc112",
  "our-environment": "jesc113",
};

const BASENAME = ""; // ROOT-URL-1: the app is served at the domain root
const ORIGIN = "https://www.lazytopper.com";
const SHELL = "<!doctype html>\n<html><head>\n<title>x</title>\n</head><body></body></html>";
const notes = sitemapPaths().filter((p) => p.startsWith("/notes/"));

/** Every `<script type="application/ld+json">` body in the html. */
function ldBlocks(html: string): string[] {
  return [...html.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
}

/** Every string value anywhere in a parsed JSON value whose key is `url` or `item`. */
function urlsIn(value: unknown, out: string[] = []): string[] {
  if (Array.isArray(value)) value.forEach((v) => urlsIn(v, out));
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if ((k === "url" || k === "item") && typeof v === "string") out.push(v);
      else urlsIn(v, out);
    }
  }
  return out;
}

describe("SEO-NOTES-LINK-2 — notes titles carry the NCERT file code", () => {
  it("names its subject on every run, green included", () => {
    // eslint-disable-next-line no-console
    console.log(`NOTES_HEADS_SCOPE: notes=${notes.length} pinned=${Object.keys(CODE_PIN).length}`);
    expect(notes.length).toBe(26);
    expect(Object.keys(CODE_PIN).sort()).toEqual(notes.map((p) => p.slice(7)).sort());
  });

  it.each(notes.map((p) => [p]))("%s: code resolves, title contains it, description cap unchanged", (path) => {
    const slug = path.slice("/notes/".length);
    expect(ncertFileCode(slug)).toBe(CODE_PIN[slug]);
    const head = headForPath(path)!;
    expect(head).not.toBeNull();
    const label = ncertLabel(slug); // "NCERT Ch. N · <title>" — unchanged
    const withCode = label.replace(/^(NCERT Ch\. \d+) · /, `$1 (${CODE_PIN[slug]}) · `);
    expect(head.title).toBe(`${withCode} — Class 10 Notes & Board Questions | LazyTopper`);
    // The description is untouched by this lane: no code, still ≤ 155.
    expect(head.description.startsWith(`${label} — `)).toBe(true);
    expect(head.description).not.toContain(CODE_PIN[slug]);
    expect(head.description.length).toBeLessThanOrEqual(155);
  });

  it("CONTROL — a spec with no resolvable code THROWS, never guesses", () => {
    const dir = mkdtempSync(join(tmpdir(), "lt-notes-spec-"));
    mkdirSync(dir, { recursive: true });
    const base = JSON.parse(readFileSync(join(NOTE_SPECS_DIR, "electricity.json"), "utf8")) as {
      meta: Record<string, unknown>;
    };
    // No (jXXX.pdf in source_edition and no citation pdf fields at all.
    writeFileSync(join(dir, "electricity.json"), JSON.stringify({ meta: base.meta }));
    expect(() => ncertFileCode("electricity", dir)).toThrow(/file code/);
    // A citation code that disagrees with the spec's own chapter number also throws.
    writeFileSync(
      join(dir, "electricity.json"),
      JSON.stringify({ meta: base.meta, citations: [{ pdf: "jesc112" }] }),
    );
    expect(() => ncertFileCode("electricity", dir)).toThrow(/file code/);
    // Two distinct citation codes are ambiguous: throw.
    writeFileSync(
      join(dir, "electricity.json"),
      JSON.stringify({ meta: base.meta, citations: [{ pdf: "jesc111" }, { pdf: "jesc110" }] }),
    );
    expect(() => ncertFileCode("electricity", dir)).toThrow(/file code/);
    // And the agreeing single code resolves — so the throws above are not the only answer.
    writeFileSync(
      join(dir, "electricity.json"),
      JSON.stringify({ meta: base.meta, citations: [{ pdf: "jesc111" }] }),
    );
    expect(ncertFileCode("electricity", dir)).toBe("jesc111");
  });
});

describe("SEO-NOTES-LINK-2 — JSON-LD in every notes page's built head", () => {
  it.each(notes.map((p) => [p]))("%s: valid JSON with BreadcrumbList + LearningResource, canonical URLs", (path) => {
    const slug = path.slice("/notes/".length);
    const topic = desktopTopicBySlug(slug)!;
    const canonical = canonicalFor(path, BASENAME);
    const data = notesJsonLd(path, BASENAME);
    expect(data, `${path}: no JSON-LD`).not.toBeNull();
    const html = applyJsonLd(SHELL, data as object, path);
    const blocks = ldBlocks(html);
    expect(blocks.length, path).toBe(1);
    expect(html.indexOf(blocks[0]) < html.indexOf("</head>"), `${path}: JSON-LD not in the head`).toBe(true);
    const parsed = JSON.parse(blocks[0]) as { "@context": string; "@graph": Array<Record<string, unknown>> };
    expect(parsed["@context"]).toBe("https://schema.org");
    const types = parsed["@graph"].map((n) => n["@type"]);
    expect(types.filter((t) => t === "BreadcrumbList").length, path).toBe(1);
    expect(types.filter((t) => t === "LearningResource").length, path).toBe(1);

    const crumbs = parsed["@graph"].find((n) => n["@type"] === "BreadcrumbList")!
      .itemListElement as Array<{ "@type": string; position: number; name: string; item: string }>;
    expect(crumbs.map((c) => c.position)).toEqual([1, 2, 3, 4]);
    expect(crumbs.map((c) => c.name)).toEqual(["Home", "Class 10", topic.subject, topic.name]);
    expect(crumbs.every((c) => c["@type"] === "ListItem")).toBe(true);
    expect(crumbs[0].item).toBe(canonicalFor("/", BASENAME));
    expect(crumbs[3].item).toBe(canonical);

    const lr = parsed["@graph"].find((n) => n["@type"] === "LearningResource")!;
    expect(lr.url).toBe(canonical);
    expect(lr.educationalLevel).toBe("Class 10");
    expect(lr.inLanguage).toBe("en");
    expect(typeof lr.name).toBe("string");

    // Canonical URLs only: absolute, on the canonical origin, no query, no hash.
    const urls = urlsIn(parsed);
    expect(urls.length).toBeGreaterThanOrEqual(5);
    for (const u of urls) {
      expect(u.startsWith(ORIGIN), `${path}: ${u}`).toBe(true);
      expect(u, path).not.toMatch(/[?#]/);
      expect(canonicalFor(u.slice(ORIGIN.length) || "/", BASENAME), `${path}: ${u} is not canonical`).toBe(u);
    }
  });

  it("CONTROL — non-notes and unknown paths get no JSON-LD; a head-less shell throws", () => {
    expect(notesJsonLd("/topic-hub/polynomials", BASENAME)).toBeNull();
    expect(notesJsonLd("/notes/does-not-exist", BASENAME)).toBeNull();
    expect(() => applyJsonLd("<html><body></body></html>", { a: 1 }, "/notes/x")).toThrow(/<\/head>/);
    // A `<` in a value can never close the script element early.
    const out = applyJsonLd(SHELL, { name: "</script><b>" }, "/notes/x");
    expect(ldBlocks(out).length).toBe(1);
    expect(JSON.parse(ldBlocks(out)[0]).name).toBe("</script><b>");
  });
});
