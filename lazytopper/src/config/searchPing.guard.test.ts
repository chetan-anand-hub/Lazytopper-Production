// @vitest-environment node
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";

import {
  INDEXNOW_KEY,
  changedUrls,
  gscSubmitUrl,
  indexNowAccepted,
  indexNowBody,
  parseSitemap,
} from "../../scripts/seo/searchPing";

/**
 * GUARD — SEO-FRESH-1 F4/F5: the post-deploy search ping.
 *
 * ★ WHAT MUST NEVER HAPPEN: a ping from a PREVIEW deployment (a preview URL announced as a
 * page to index), a ping from Railway's backend deploy (its environment name also contains
 * "production"), or a ping that announces unchanged pages. The trigger condition is
 * therefore EVALUATED against the real event shapes this repo receives — quoted from
 * `gh api repos/chetan-anand-hub/Lazytopper-Production/deployments` on 2026-09-27 — not
 * compared as a string, so a rewrite that means the same thing still passes and one that
 * means something different fails.
 */

const REPO_ROOT = resolve(process.cwd(), ".."); // vitest runs with cwd = lazytopper/
const WORKFLOW = resolve(REPO_ROOT, ".github", "workflows", "search-ping.yml");

const SITEMAP_BEFORE = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.lazytopper.com/app/</loc>
    <lastmod>2026-09-01</lastmod>
  </url>
  <url>
    <loc>https://www.lazytopper.com/app/pricing</loc>
    <lastmod>2026-09-01</lastmod>
  </url>
  <url>
    <loc>https://www.lazytopper.com/app/notes/electricity</loc>
    <lastmod>2026-09-01</lastmod>
  </url>
  <url>
    <loc>https://www.lazytopper.com/app/legal/retired</loc>
    <lastmod>2026-09-01</lastmod>
  </url>
</urlset>
`;

// pricing restamped, a new notes page, the root unchanged, legal/retired removed.
const SITEMAP_AFTER = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.lazytopper.com/app/</loc>
    <lastmod>2026-09-01</lastmod>
  </url>
  <url>
    <loc>https://www.lazytopper.com/app/pricing</loc>
    <lastmod>2026-09-27</lastmod>
  </url>
  <url>
    <loc>https://www.lazytopper.com/app/notes/electricity</loc>
    <lastmod>2026-09-01</lastmod>
  </url>
  <url>
    <loc>https://www.lazytopper.com/app/notes/light-reflection-and-refraction</loc>
    <lastmod>2026-09-27</lastmod>
  </url>
</urlset>
`;

describe("search-ping — the changed-URL diff", () => {
  it("parses every <url> of a sitemap", () => {
    expect(parseSitemap(SITEMAP_AFTER).size).toBe(4);
    expect(parseSitemap(SITEMAP_AFTER).get("https://www.lazytopper.com/app/pricing")).toBe("2026-09-27");
  });

  it("announces exactly the new and restamped URLs, in sitemap order", () => {
    expect(changedUrls(SITEMAP_BEFORE, SITEMAP_AFTER)).toEqual([
      "https://www.lazytopper.com/app/pricing",
      "https://www.lazytopper.com/app/notes/light-reflection-and-refraction",
    ]);
  });

  it("CONTROL — an unchanged sitemap announces nothing (so no request is sent)", () => {
    expect(changedUrls(SITEMAP_AFTER, SITEMAP_AFTER)).toEqual([]);
  });

  it("with no sitemap at the parent, every URL is new", () => {
    expect(changedUrls(null, SITEMAP_AFTER)).toHaveLength(4);
  });
});

describe("search-ping — the IndexNow request body", () => {
  it("carries host, key, keyLocation and urlList", () => {
    const urls = changedUrls(SITEMAP_BEFORE, SITEMAP_AFTER);
    expect(indexNowBody(urls)).toEqual({
      host: "www.lazytopper.com",
      key: "a6c1861da61f4d36898e5e27a71c36d6",
      keyLocation: "https://www.lazytopper.com/a6c1861da61f4d36898e5e27a71c36d6.txt",
      urlList: urls,
    });
  });

  it("the key's proof file ships in public/ and contains exactly the key (P7)", () => {
    const keyFile = resolve(process.cwd(), "public", `${INDEXNOW_KEY}.txt`);
    expect(existsSync(keyFile)).toBe(true);
    expect(readFileSync(keyFile, "utf8").trim()).toBe(INDEXNOW_KEY);
  });

  it("refuses a URL list that spans hosts, and an empty one", () => {
    expect(() =>
      indexNowBody(["https://www.lazytopper.com/app/", "https://evil.example/app/"]),
    ).toThrow(/2 hosts/);
    expect(() => indexNowBody([])).toThrow(/no URLs/);
  });

  it("only 200 and 202 count as accepted", () => {
    expect(indexNowAccepted(200)).toBe(true);
    expect(indexNowAccepted(202)).toBe(true);
    for (const status of [204, 400, 403, 422, 429, 500]) expect(indexNowAccepted(status)).toBe(false);
  });

  it("Search Console: sitemaps.submit on the public sitemap, nothing else", () => {
    expect(gscSubmitUrl("https://www.lazytopper.com/")).toBe(
      "https://www.googleapis.com/webmasters/v3/sites/https%3A%2F%2Fwww.lazytopper.com%2F" +
        "/sitemaps/https%3A%2F%2Fwww.lazytopper.com%2Fsitemap.xml",
    );
    const source = readFileSync(resolve(process.cwd(), "scripts", "seo", "searchPing.ts"), "utf8");
    expect(source, "the Indexing API is not permitted for these pages").not.toContain("indexing.googleapis.com");
  });
});

// ── The workflow's trigger filter ──────────────────────────────────────────────────────

interface DeploymentEvent {
  deployment_status: { state: string };
  deployment: { environment: string };
}

/**
 * Evaluate the job's `if:` against an event. Supports exactly the grammar the condition
 * needs — `a == 'b'` clauses joined by `&&` over `github.event.*` — and THROWS on anything
 * else, so a condition this cannot read fails loudly instead of being judged permissive.
 */
function evaluateCondition(condition: string, event: DeploymentEvent): boolean {
  const clauses = condition.replace(/^\s*\$\{\{\s*|\s*\}\}\s*$/g, "").split("&&");
  return clauses.every((clause) => {
    const match = /^\s*github\.event\.([\w.]+)\s*==\s*'([^']*)'\s*$/.exec(clause);
    if (!match) throw new Error(`unsupported clause in search-ping's if: "${clause.trim()}"`);
    const value = match[1].split(".").reduce<unknown>(
      (node, key) => (node && typeof node === "object" ? (node as Record<string, unknown>)[key] : undefined),
      event,
    );
    return value === match[2];
  });
}

const event = (environment: string, state: string): DeploymentEvent => ({
  deployment: { environment },
  deployment_status: { state },
});

describe("search-ping.yml — the trigger filter", () => {
  const workflow = parseYaml(readFileSync(WORKFLOW, "utf8")) as {
    on: Record<string, unknown>;
    jobs: Record<string, { if?: string }>;
  };
  const jobs = Object.values(workflow.jobs);

  it("is triggered by deployment_status ONLY — never a pull request or a push", () => {
    expect(Object.keys(workflow.on)).toEqual(["deployment_status"]);
  });

  it("every job is gated (an ungated job would run on every deployment event)", () => {
    expect(jobs.length).toBeGreaterThan(0);
    for (const job of jobs) expect(typeof job.if, "a job in search-ping.yml has no if:").toBe("string");
  });

  it("fires on a SUCCESSFUL PRODUCTION Vercel deployment", () => {
    for (const job of jobs) expect(evaluateCondition(job.if as string, event("Production", "success"))).toBe(true);
  });

  it("★ does NOT fire on a preview deployment, a failed/pending one, or Railway's backend", () => {
    const refused = [
      event("Preview", "success"),
      event("Production", "failure"),
      event("Production", "pending"),
      event("Production", "in_progress"),
      event("lazytopper-backend / production", "success"),
      event("production", "success"),
    ];
    for (const job of jobs) {
      for (const candidate of refused) {
        expect(
          evaluateCondition(job.if as string, candidate),
          `search-ping would fire on ${JSON.stringify(candidate)}`,
        ).toBe(false);
      }
    }
  });
});
