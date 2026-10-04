// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { generateKeyPairSync } from "node:crypto";
import { parse as parseYaml } from "yaml";

import {
  DEFAULT_TOKEN_URI,
  INSPECT_ENDPOINT,
  INSPECT_INTERVAL_MS,
  READONLY_SCOPE,
  needsManualRequest,
  renderReport,
  rowFromInspection,
  runIndexStatus,
  sitemapLocs,
  type IndexStatusRow,
  type RunDeps,
} from "../../scripts/seo/indexStatusReport";

/**
 * GUARD — SEO-5 PR-1: the weekly, READ-ONLY index-status report (M1) and its workflow (M2).
 *
 * ★ WHAT MUST NEVER HAPPEN: the script calling any Google endpoint other than the OAuth
 * token exchange and URL Inspection (`index:inspect`) — in particular NOT the Indexing API
 * ("request indexing"), which Google permits only for job and livestream pages; the workflow
 * committing, opening issues or commenting; a run failing when the secret is absent.
 */

const REPO_ROOT = resolve(process.cwd(), ".."); // vitest runs with cwd = lazytopper/
const SCRIPT = resolve(process.cwd(), "scripts", "seo", "indexStatusReport.ts");
const WORKFLOW = resolve(REPO_ROOT, ".github", "workflows", "index-status.yml");

const SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://www.lazytopper.com/</loc><lastmod>2026-10-04</lastmod></url>
  <url><loc>https://www.lazytopper.com/pricing</loc><lastmod>2026-10-04</lastmod></url>
  <url><loc>https://www.lazytopper.com/notes/electricity</loc><lastmod>2026-10-04</lastmod></url>
</urlset>
`;

const inspection = (verdict: string, coverageState: string, googleCanonical: string) => ({
  inspectionResult: {
    indexStatusResult: { verdict, coverageState, googleCanonical, lastCrawlTime: "2026-10-01T10:00:00Z" },
  },
});

describe("index-status — the script calls no Google endpoint but token + index:inspect", () => {
  it("every Google host/URL in the source is one of the two allowed", () => {
    const source = readFileSync(SCRIPT, "utf8");
    const found = new Set(source.match(/[a-z0-9.-]*google(?:apis)?\.com[^\s"'`),]*/gi) ?? []);
    const allowed = new Set([
      "searchconsole.googleapis.com/v1/urlInspection/index:inspect",
      "oauth2.googleapis.com/token",
      "www.googleapis.com/auth/webmasters.readonly", // the OAuth SCOPE identifier, not an endpoint
      "developers.google.com/webmaster-tools/limits", // the quota citation in a comment; never fetched
    ]);
    expect([...found].filter((hit) => !allowed.has(hit))).toEqual([]);
    expect(found.size).toBeGreaterThan(0);
    expect(source, "the Indexing API is not permitted for these pages").not.toMatch(/indexing\.googleapis|urlNotifications/i);
  });

  it("the constants name exactly the read endpoint, the token endpoint and the read-only scope", () => {
    expect(INSPECT_ENDPOINT).toBe("https://searchconsole.googleapis.com/v1/urlInspection/index:inspect");
    expect(DEFAULT_TOKEN_URI).toBe("https://oauth2.googleapis.com/token");
    expect(READONLY_SCOPE).toBe("https://www.googleapis.com/auth/webmasters.readonly");
  });
});

describe("index-status — table and the 'needs a manual request' filter", () => {
  it("reads every <loc>, in order, once", () => {
    expect(sitemapLocs(SITEMAP + SITEMAP)).toEqual([
      "https://www.lazytopper.com/",
      "https://www.lazytopper.com/pricing",
      "https://www.lazytopper.com/notes/electricity",
    ]);
  });

  it("flags not-indexed and canonical-mismatch URLs, and nothing else", () => {
    const ok = rowFromInspection("https://www.lazytopper.com/", inspection("PASS", "Submitted and indexed", "https://www.lazytopper.com/"));
    const slash = rowFromInspection("https://www.lazytopper.com/pricing", inspection("PASS", "Submitted and indexed", "https://www.lazytopper.com/pricing/"));
    const notIndexed = rowFromInspection("https://www.lazytopper.com/a", inspection("NEUTRAL", "Discovered - currently not indexed", ""));
    const mismatch = rowFromInspection("https://www.lazytopper.com/b", inspection("PASS", "Submitted and indexed", "https://www.lazytopper.com/c"));
    const failed: IndexStatusRow = { ...ok, url: "https://www.lazytopper.com/d", error: "HTTP 500" };
    expect(needsManualRequest(ok)).toBe(false);
    expect(needsManualRequest(slash)).toBe(false);
    expect(needsManualRequest(notIndexed)).toBe(true);
    expect(needsManualRequest(mismatch)).toBe(true);
    expect(needsManualRequest(failed)).toBe(true);
    expect(rowFromInspection("x", {}).verdict).toBe("UNKNOWN");

    const report = renderReport([ok, notIndexed, mismatch], "https://www.lazytopper.com/", "T");
    expect(report).toContain("| URL | Verdict | Coverage state | Google canonical vs ours | Last crawl |");
    expect(report).toContain("3 sitemap URLs inspected · 2 indexed (PASS) · 2 need a manual request");
    expect(report).toContain("MISMATCH: Google https://www.lazytopper.com/c");
    expect(report).toContain("### Needs a manual request (2)");
    expect(report).toContain("- https://www.lazytopper.com/a — not indexed — Discovered - currently not indexed");
  });
});

function fakeDeps(env: Record<string, string | undefined>, respond: (url: string, init?: RequestInit) => Response) {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const logs: string[] = [];
  const sleeps: number[] = [];
  const emitted: string[] = [];
  const deps: RunDeps = {
    env,
    fetch: (async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, init });
      return respond(url, init);
    }) as typeof fetch,
    sleep: async (ms) => {
      sleeps.push(ms);
    },
    log: (line) => logs.push(line),
    emit: (markdown) => emitted.push(markdown),
    now: () => new Date("2026-10-05T00:30:00Z"),
  };
  return { deps, calls, logs, sleeps, emitted };
}

const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const ACCOUNT = JSON.stringify({
  client_email: "monitor@example.iam.gserviceaccount.com",
  private_key: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
});

describe("index-status — the run", () => {
  it("secret absent → a ::notice::, no network call at all, status skipped", async () => {
    for (const env of [{}, { GSC_SERVICE_ACCOUNT: "" }, { GSC_SERVICE_ACCOUNT: "  " }]) {
      const fake = fakeDeps(env, () => {
        throw new Error("no call expected");
      });
      await expect(runIndexStatus(fake.deps)).resolves.toEqual({ status: "skipped" });
      expect(fake.calls).toEqual([]);
      expect(fake.logs.join("\n")).toMatch(/^::notice::INDEX_STATUS: GSC_SERVICE_ACCOUNT is not configured/);
    }
  });

  it("inspects EVERY sitemap URL with a POST to index:inspect, spaced within quota", async () => {
    const fake = fakeDeps({ GSC_SERVICE_ACCOUNT: ACCOUNT, GSC_SITE_URL: "sc-domain:lazytopper.com" }, (url, init) => {
      if (url.startsWith("https://www.lazytopper.com/sitemap.xml")) return new Response(SITEMAP);
      if (url === DEFAULT_TOKEN_URI) return Response.json({ access_token: "tok" });
      if (url === INSPECT_ENDPOINT) {
        const body = JSON.parse(String(init?.body)) as { inspectionUrl: string };
        return Response.json(
          body.inspectionUrl.endsWith("/pricing")
            ? inspection("NEUTRAL", "Crawled - currently not indexed", "")
            : inspection("PASS", "Submitted and indexed", body.inspectionUrl),
        );
      }
      throw new Error(`unexpected call ${url}`);
    });
    const result = await runIndexStatus(fake.deps);
    expect(result.status).toBe("done");
    const inspects = fake.calls.filter((call) => call.url === INSPECT_ENDPOINT);
    expect(inspects).toHaveLength(3);
    for (const call of inspects) {
      expect(call.init?.method).toBe("POST");
      expect(JSON.parse(String(call.init?.body)).siteUrl).toBe("sc-domain:lazytopper.com");
    }
    // Every call goes to the sitemap, the token endpoint, or index:inspect — nothing else.
    expect(new Set(fake.calls.map((call) => call.url.split("?")[0]))).toEqual(
      new Set(["https://www.lazytopper.com/sitemap.xml", DEFAULT_TOKEN_URI, INSPECT_ENDPOINT]),
    );
    expect(fake.sleeps).toEqual([INSPECT_INTERVAL_MS, INSPECT_INTERVAL_MS]);
    expect(60_000 / INSPECT_INTERVAL_MS).toBeLessThan(600); // per-site 600 queries/minute
    if (result.status === "done") expect(result.needs.map((row) => row.url)).toEqual(["https://www.lazytopper.com/pricing"]);
    expect(fake.emitted).toHaveLength(1);
    expect(fake.emitted[0]).toContain("### Needs a manual request (1)");
  });

  it("a 403 stops the run with a permission message (no more quota spent)", async () => {
    const fake = fakeDeps({ GSC_SERVICE_ACCOUNT: ACCOUNT }, (url) => {
      if (url.startsWith("https://www.lazytopper.com/sitemap.xml")) return new Response(SITEMAP);
      if (url === DEFAULT_TOKEN_URI) return Response.json({ access_token: "tok" });
      return new Response("User does not have sufficient permission", { status: 403 });
    });
    await expect(runIndexStatus(fake.deps)).rejects.toThrow(/HTTP 403.*lacks Search Console permission/);
    expect(fake.calls.filter((call) => call.url === INSPECT_ENDPOINT)).toHaveLength(1);
  });
});

describe("index-status.yml — M2", () => {
  const workflow = parseYaml(readFileSync(WORKFLOW, "utf8")) as {
    on: Record<string, unknown>;
    permissions: Record<string, string>;
    jobs: Record<string, { steps: Array<{ run?: string; uses?: string; env?: Record<string, string> }> }>;
  };
  const steps = Object.values(workflow.jobs).flatMap((job) => job.steps);

  it("Monday 06:00 IST (00:30 UTC) + manual dispatch, and no other trigger", () => {
    expect(Object.keys(workflow.on).sort()).toEqual(["schedule", "workflow_dispatch"]);
    expect(workflow.on.schedule).toEqual([{ cron: "30 0 * * 1" }]);
  });

  it("permissions are contents: read only", () => {
    expect(workflow.permissions).toEqual({ contents: "read" });
  });

  it("runs the script with the secret, uploads an artifact, and never commits / opens issues / comments", () => {
    const runs = steps.map((step) => step.run ?? "").join("\n");
    expect(runs).toContain("seo:index-status");
    expect(steps.some((step) => step.env?.GSC_SERVICE_ACCOUNT === "${{ secrets.GSC_SERVICE_ACCOUNT }}")).toBe(true);
    expect(steps.some((step) => step.uses?.startsWith("actions/upload-artifact@"))).toBe(true);
    expect(runs).not.toMatch(/git (commit|push)|gh (issue|pr)|github-script/);
    expect(steps.some((step) => step.uses?.includes("github-script"))).toBe(false);
  });

  it("package.json wires seo:index-status to the script", () => {
    const pkg = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts["seo:index-status"]).toBe("tsx scripts/seo/indexStatusReport.ts");
  });
});
