/**
 * WEEKLY INDEX-STATUS REPORT, READ-ONLY (SEO-5 PR-1, M1).
 *
 *   tsx scripts/seo/indexStatusReport.ts                 (inspect every live sitemap URL)
 *   tsx scripts/seo/indexStatusReport.ts --out=<file>    (also write the markdown table there)
 *
 * Driven by `.github/workflows/index-status.yml` (M2): Monday 06:00 IST + manual dispatch.
 *
 * ★ WHAT IT DOES. Reads the LIVE sitemap (`https://www.lazytopper.com/sitemap.xml`, the one
 * Google reads — not the committed copy), then asks the Search Console URL Inspection API
 * (`urlInspection.index.inspect`) about EVERY `<loc>` in it, and writes one table:
 * URL · verdict · coverage state · Google-chosen canonical vs ours · last crawl. Below it, a
 * short "needs a manual request" list: URLs Google has not indexed (verdict ≠ PASS) or
 * indexed under a canonical other than ours. The owner requests indexing for those BY HAND
 * in Search Console.
 *
 * ⛔ READ-ONLY. Google's "Request indexing" cannot be automated legitimately — the Indexing
 * API is only for job-posting and livestream pages. This script makes exactly TWO kinds of
 * Google call: the OAuth token exchange, and `index:inspect` (a read; scope
 * `webmasters.readonly`). `indexStatusReport.guard.test.ts` pins that the source names no
 * other Google endpoint.
 *
 * ★ QUOTA (developers.google.com/webmaster-tools/limits, read 2026-10-04): URL Inspection is
 * 2,000 queries/day and 600 queries/minute PER SITE (10M/day, 15k/min per project). Calls
 * are sequential and spaced INSPECT_INTERVAL_MS apart (≤ 240/min, well under 600); a run
 * refuses a sitemap larger than MAX_URLS_PER_RUN so one weekly run can never spend the
 * day's quota. The sitemap is ~63 URLs.
 *
 * ★ SECRET ABSENT → a `::notice::` and exit 0 (the same convention as searchPing.ts).
 *
 * The service-account token is minted HERE rather than imported: `searchPing.ts`'s
 * `googleAccessToken` is not exported and that file is outside this lane's scope
 * (FU-SEO5-GSC-TOKEN-DEDUP).
 */

import { createSign } from "node:crypto";
import { appendFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/** The sitemap Google reads — fetched live, not from the repo. */
export const LIVE_SITEMAP_URL = "https://www.lazytopper.com/sitemap.xml";
/** The ONLY Google API this script calls besides the token exchange. A read. */
export const INSPECT_ENDPOINT = "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect";
/** The default OAuth token endpoint (a service-account key's `token_uri` overrides it). */
export const DEFAULT_TOKEN_URI = "https://oauth2.googleapis.com/token";
/** Read-only Search Console scope — `index:inspect` accepts it. */
export const READONLY_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
/** Property used when `GSC_SITE_URL` is unset (same default as searchPing.ts). */
export const DEFAULT_SITE_URL = "https://www.lazytopper.com/";

/** Per-site quota: 600/min, 2000/day. 250 ms spacing = at most 240/min. */
export const INSPECT_INTERVAL_MS = 250;
export const MAX_URLS_PER_RUN = 500;
/** One back-off and retry on HTTP 429 (rate limited), then the URL is recorded as an error. */
export const RATE_LIMIT_BACKOFF_MS = 65_000;

export interface IndexStatusRow {
  url: string;
  verdict: string;
  coverageState: string;
  googleCanonical: string;
  userCanonical: string;
  lastCrawlTime: string;
  /** Set when the inspection call itself failed for this URL. */
  error?: string;
}

/** Every `<loc>` in a sitemap, in document order, de-duplicated. */
export function sitemapLocs(xml: string): string[] {
  const locs: string[] = [];
  for (const match of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) {
    if (!locs.includes(match[1])) locs.push(match[1]);
  }
  return locs;
}

/** Trailing-slash-insensitive URL equality for canonical comparison. */
export function sameUrl(a: string, b: string): boolean {
  const norm = (u: string): string => u.trim().replace(/\/+$/, "");
  return norm(a) === norm(b);
}

/** Ours = the sitemap URL itself (every advertised page is self-canonical). */
export function canonicalMismatch(row: IndexStatusRow): boolean {
  return row.googleCanonical !== "" && !sameUrl(row.googleCanonical, row.url);
}

/** Not indexed, Google picked a different canonical, or the inspection failed. */
export function needsManualRequest(row: IndexStatusRow): boolean {
  return row.error !== undefined || row.verdict !== "PASS" || canonicalMismatch(row);
}

/** Map one `index:inspect` JSON response to a table row. */
export function rowFromInspection(url: string, body: unknown): IndexStatusRow {
  const status =
    ((body as { inspectionResult?: { indexStatusResult?: Record<string, unknown> } })?.inspectionResult
      ?.indexStatusResult ?? {}) as Record<string, unknown>;
  const text = (key: string): string => (typeof status[key] === "string" ? (status[key] as string) : "");
  return {
    url,
    verdict: text("verdict") || "UNKNOWN",
    coverageState: text("coverageState"),
    googleCanonical: text("googleCanonical"),
    userCanonical: text("userCanonical"),
    lastCrawlTime: text("lastCrawlTime"),
  };
}

function cell(value: string): string {
  return (value || "—").replace(/\|/g, "\\|");
}

/** The markdown report: summary line, table, "needs a manual request" list. */
export function renderReport(rows: readonly IndexStatusRow[], siteUrl: string, when: string): string {
  const needs = rows.filter(needsManualRequest);
  const indexed = rows.filter((row) => row.verdict === "PASS").length;
  const lines = [
    `## Index status — ${when}`,
    "",
    `Property \`${siteUrl}\` · ${rows.length} sitemap URLs inspected · ${indexed} indexed (PASS) · ` +
      `${needs.length} need a manual request`,
    "",
    "| URL | Verdict | Coverage state | Google canonical vs ours | Last crawl |",
    "|---|---|---|---|---|",
  ];
  for (const row of rows) {
    const canonical = row.error
      ? "—"
      : row.googleCanonical === ""
        ? "— (none reported)"
        : canonicalMismatch(row)
          ? `MISMATCH: Google ${row.googleCanonical}`
          : "same";
    lines.push(
      `| ${cell(row.url)} | ${cell(row.error ? `ERROR ${row.error}` : row.verdict)} | ${cell(row.coverageState)} | ` +
        `${cell(canonical)} | ${cell(row.lastCrawlTime)} |`,
    );
  }
  lines.push("", `### Needs a manual request (${needs.length})`, "");
  if (needs.length === 0) lines.push("None — every URL is indexed under our canonical.");
  for (const row of needs) {
    const why = row.error
      ? `inspection failed (${row.error})`
      : row.verdict !== "PASS"
        ? `not indexed — ${row.coverageState || row.verdict}`
        : `Google canonical ${row.googleCanonical}`;
    lines.push(`- ${row.url} — ${why}`);
  }
  return `${lines.join("\n")}\n`;
}

// ── Google auth (service-account JWT → access token) ─────────────────────────────

export interface ServiceAccount {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function googleAccessToken(account: ServiceAccount, fetchImpl: typeof fetch): Promise<string> {
  const tokenUri = account.token_uri ?? DEFAULT_TOKEN_URI;
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({ iss: account.client_email, scope: READONLY_SCOPE, aud: tokenUri, iat: now, exp: now + 600 }),
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const assertion = `${header}.${claims}.${base64url(signer.sign(account.private_key))}`;
  const response = await fetchImpl(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }).toString(),
  });
  if (!response.ok) {
    // The body of a failed exchange names the problem and carries no secret.
    throw new Error(`indexStatusReport: Google token exchange failed — HTTP ${response.status} ${await response.text()}`);
  }
  const token = ((await response.json()) as { access_token?: string }).access_token;
  if (!token) throw new Error("indexStatusReport: Google token response carried no access_token");
  return token;
}

// ── The run ──────────────────────────────────────────────────────────────────────

export interface RunDeps {
  env: Record<string, string | undefined>;
  fetch: typeof fetch;
  sleep: (ms: number) => Promise<void>;
  log: (line: string) => void;
  /** Writes the report somewhere durable (job summary, artifact file). */
  emit: (markdown: string) => void;
  now: () => Date;
}

export type RunResult =
  | { status: "skipped" }
  | { status: "done"; rows: IndexStatusRow[]; needs: IndexStatusRow[]; errors: number };

export async function runIndexStatus(deps: RunDeps): Promise<RunResult> {
  const rawAccount = deps.env.GSC_SERVICE_ACCOUNT ?? "";
  if (rawAccount.trim() === "") {
    deps.log(
      "::notice::INDEX_STATUS: GSC_SERVICE_ACCOUNT is not configured — index-status report skipped.",
    );
    return { status: "skipped" };
  }
  const siteUrl = (deps.env.GSC_SITE_URL ?? "").trim() || DEFAULT_SITE_URL;

  const sitemapResponse = await deps.fetch(`${LIVE_SITEMAP_URL}?t=${deps.now().getTime()}`, {
    headers: { "Cache-Control": "no-cache" },
  });
  if (!sitemapResponse.ok) {
    throw new Error(`indexStatusReport: live sitemap fetch failed — HTTP ${sitemapResponse.status}`);
  }
  const urls = sitemapLocs(await sitemapResponse.text());
  if (urls.length === 0) throw new Error("indexStatusReport: the live sitemap lists no URLs");
  if (urls.length > MAX_URLS_PER_RUN) {
    throw new Error(
      `indexStatusReport: ${urls.length} URLs exceeds MAX_URLS_PER_RUN=${MAX_URLS_PER_RUN} ` +
        "(per-site quota is 2,000 inspections/day)",
    );
  }
  deps.log(`INDEX_STATUS: property=${siteUrl} sitemap_urls=${urls.length}`);

  const token = await googleAccessToken(JSON.parse(rawAccount) as ServiceAccount, deps.fetch);

  const rows: IndexStatusRow[] = [];
  for (const [index, url] of urls.entries()) {
    if (index > 0) await deps.sleep(INSPECT_INTERVAL_MS);
    const inspect = () =>
      deps.fetch(INSPECT_ENDPOINT, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ inspectionUrl: url, siteUrl, languageCode: "en-US" }),
      });
    let response = await inspect();
    if (response.status === 429) {
      deps.log(`INDEX_STATUS: HTTP 429 on ${url} — backing off ${RATE_LIMIT_BACKOFF_MS} ms, one retry`);
      await deps.sleep(RATE_LIMIT_BACKOFF_MS);
      response = await inspect();
    }
    if (response.status === 403) {
      // A permission problem is the same for every URL — stop, say so, spend no more quota.
      throw new Error(
        `indexStatusReport: HTTP 403 inspecting ${url} on property ${siteUrl} — the service account ` +
          `lacks Search Console permission for this property: ${await response.text()}`,
      );
    }
    if (!response.ok) {
      rows.push({
        url,
        verdict: "ERROR",
        coverageState: "",
        googleCanonical: "",
        userCanonical: "",
        lastCrawlTime: "",
        error: `HTTP ${response.status}`,
      });
      deps.log(`INDEX_STATUS: ${url} → HTTP ${response.status}`);
      continue;
    }
    const row = rowFromInspection(url, await response.json());
    rows.push(row);
    deps.log(`INDEX_STATUS: ${url} → ${row.verdict} (${row.coverageState || "—"})`);
  }

  const markdown = renderReport(rows, siteUrl, deps.now().toISOString());
  deps.emit(markdown);
  const needs = rows.filter(needsManualRequest);
  deps.log(`INDEX_STATUS: needs a manual request (${needs.length}):`);
  for (const row of needs) deps.log(`  ${row.url}`);
  return { status: "done", rows, needs, errors: rows.filter((row) => row.error !== undefined).length };
}

function arg(name: string): string | undefined {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const out = arg("out");
  runIndexStatus({
    env: process.env,
    fetch: globalThis.fetch,
    sleep: (ms) => new Promise((done) => setTimeout(done, ms)),
    // eslint-disable-next-line no-console
    log: (line) => console.log(line),
    emit: (markdown) => {
      if (out) writeFileSync(out, markdown);
      if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
    },
    now: () => new Date(),
  })
    .then((result) => {
      if (result.status === "done" && result.errors > 0) {
        // eslint-disable-next-line no-console
        console.error(`indexStatusReport: ${result.errors} inspection(s) failed — see the table.`);
        process.exitCode = 1;
      }
    })
    .catch((error: unknown) => {
      // eslint-disable-next-line no-console
      console.error(error);
      process.exitCode = 1;
    });
}
