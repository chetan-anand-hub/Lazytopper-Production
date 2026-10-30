// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cbqChapterSlugs } from "../components/cbq/cbqSeo";

/**
 * CBQ-SEO-FIX-1 — an unknown `/cbq-class-10/<slug>` is HTTP 404, not the shell with 200.
 * The vercel.json rule for the chapter route must list EXACTLY the registry slugs: a slug the
 * registry has but the rule lacks would 404 a real page; a slug in the rule but not the registry
 * would serve the shell for a page that redirects. Both directions are pinned.
 */
const VERCEL_JSON = resolve(__dirname, "../../../vercel.json");
const vercel = JSON.parse(readFileSync(VERCEL_JSON, "utf8")) as { rewrites: Array<{ source: string; destination: string }> };
const chapterRules = vercel.rewrites.filter((r) => r.source.startsWith("/:path(cbq-class-10/") && r.source !== "/:path(cbq-class-10/?)");

function ruleSlugs(): string[] {
  const m = /^\/:path\(cbq-class-10\/\(\?:([^)]*)\)\/\?\)$/.exec(chapterRules[0]?.source ?? "");
  return m ? m[1].split("|") : [];
}

describe("CBQ-SEO-FIX-1 — the chapter rewrite is a closed set equal to the registry", () => {
  it("there is exactly one chapter rule and it is an alternation, not [^/]+", () => {
    expect(chapterRules).toHaveLength(1);
    expect(chapterRules[0].source).not.toContain("[^/]+");
    expect(chapterRules[0].destination).toBe("/__shell.html");
  });

  it("the rule's slugs equal the registry slugs, both directions", () => {
    const rule = ruleSlugs();
    const registry = cbqChapterSlugs();
    expect(registry).toHaveLength(26);
    expect(registry.filter((s) => !rule.includes(s)), "registry slug missing from vercel.json").toEqual([]);
    expect(rule.filter((s) => !registry.includes(s)), "vercel.json slug not in registry").toEqual([]);
  });

  it("every real slug matches the rule and an unknown slug matches nothing", () => {
    const re = new RegExp(`^/${/^\/:path\((.*)\)$/s.exec(chapterRules[0].source)![1]}$`);
    for (const s of cbqChapterSlugs()) expect(re.test(`/cbq-class-10/${s}`)).toBe(true);
    for (const bad of ["/cbq-class-10/not-a-chapter", "/cbq-class-10/real", "/cbq-class-10/real-numbers-x", "/cbq-class-10/Real-Numbers"]) {
      expect(re.test(bad), bad).toBe(false);
    }
  });

  it("no later catch-all rewrite can serve an unknown slug", () => {
    const shell = vercel.rewrites.filter((r) => r.destination === "/__shell.html");
    const last = shell[shell.length - 1].source;
    expect(last).not.toMatch(/\(\.\*\)\)$|^\/:path\*$|^\/\(\.\*\)$/);
  });
});
