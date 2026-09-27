/**
 * TELL SEARCH ENGINES WHAT CHANGED, AFTER EVERY PRODUCTION DEPLOY (SEO-FRESH-1, F4 + F5).
 *
 *   tsx scripts/seo/searchPing.ts --sha=<deployed sha>          (run by .github/workflows/search-ping.yml)
 *   tsx scripts/seo/searchPing.ts --sha=<sha> --dry-run         (print, send nothing)
 *
 * ★ WHAT "CHANGED" MEANS IS DECIDED BY THE SITEMAP, NOT BY THIS SCRIPT. `gen:sitemap`
 * restamps a URL's `<lastmod>` only when that page's committed prerendered body changed
 * (F1). So the set of URLs worth announcing is exactly the set whose `<lastmod>` moved —
 * or that appeared — between the deployed commit and its parent. Diffing the sitemap
 * reuses that one honest decision instead of inventing a second one here.
 *
 * ★ INDEXNOW (Bing, Yandex, Seznam, Naver …). One POST of the changed URLs to
 * `https://api.indexnow.org/indexnow` with the site's key and the URL of the key file
 * (`public/<key>.txt`, served at the root by a `vercel.json` rewrite). No changed URLs →
 * NO request at all. Any status other than 200/202 FAILS the run, visibly.
 *
 * ★ GOOGLE (F5). Google does not take IndexNow. If the `GSC_SERVICE_ACCOUNT` secret is
 * configured, the sitemap is resubmitted through the Search Console API
 * (`sitemaps.submit`); if it is absent, the run logs a notice and succeeds. ⛔ No other
 * Google call — in particular NOT the Indexing API, which Google permits only for job
 * postings and livestream pages.
 */

import { execFileSync } from "node:child_process";
import { createSign } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const LAZYTOPPER_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/** The committed sitemap, as a repo-relative path for `git show`. */
export const SITEMAP_REPO_PATH = "lazytopper/public/sitemap.xml";

/** The site's IndexNow key. Its proof file is `public/<key>.txt`, containing the key. */
export const INDEXNOW_KEY = "a6c1861da61f4d36898e5e27a71c36d6";
export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
/** The sitemap URL Google is asked to re-read (root rewrite → /app/sitemap.xml). */
export const SITEMAP_PUBLIC_URL = "https://www.lazytopper.com/sitemap.xml";

/** `<loc>` → `<lastmod>` for every `<url>` in a sitemap. */
export function parseSitemap(xml: string): Map<string, string> {
  const entries = new Map<string, string>();
  for (const block of xml.match(/<url>[\s\S]*?<\/url>/g) ?? []) {
    const loc = /<loc>\s*([^<\s]+)\s*<\/loc>/.exec(block)?.[1];
    const lastmod = /<lastmod>\s*([^<\s]+)\s*<\/lastmod>/.exec(block)?.[1] ?? "";
    if (loc) entries.set(loc, lastmod);
  }
  return entries;
}

/**
 * The URLs worth announcing: present in `after` and either absent from `before` or
 * carrying a different `<lastmod>`. Removed URLs are NOT announced (IndexNow is told
 * about pages that exist). Order follows `after`, so the request is deterministic.
 */
export function changedUrls(beforeXml: string | null, afterXml: string): string[] {
  const before = beforeXml === null ? new Map<string, string>() : parseSitemap(beforeXml);
  const changed: string[] = [];
  for (const [loc, lastmod] of parseSitemap(afterXml)) {
    if (before.get(loc) !== lastmod) changed.push(loc);
  }
  return changed;
}

export interface IndexNowBody {
  host: string;
  key: string;
  keyLocation: string;
  urlList: string[];
}

/**
 * The IndexNow request body. Every URL must share ONE host — IndexNow rejects a
 * submission that mixes hosts, and a mixed list here would mean the sitemap advertises
 * a foreign URL, which is a defect to surface rather than to split around.
 */
export function indexNowBody(urls: readonly string[], key: string = INDEXNOW_KEY): IndexNowBody {
  if (urls.length === 0) throw new Error("searchPing: indexNowBody called with no URLs");
  const hosts = new Set(urls.map((url) => new URL(url).host));
  if (hosts.size !== 1) {
    throw new Error(`searchPing: changed URLs span ${hosts.size} hosts (${[...hosts].join(", ")})`);
  }
  const [host] = hosts;
  return {
    host,
    key,
    keyLocation: `https://${host}/${key}.txt`,
    urlList: [...urls],
  };
}

/** IndexNow answers 200 (OK) or 202 (Accepted, key validation pending). Nothing else is success. */
export function indexNowAccepted(status: number): boolean {
  return status === 200 || status === 202;
}

function gitShow(sha: string, path: string): string | null {
  try {
    return execFileSync("git", ["show", `${sha}:${path}`], {
      cwd: LAZYTOPPER_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    return null;
  }
}

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

interface ServiceAccount {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

/** Service-account JWT → OAuth access token, scope `webmasters` (Search Console). */
async function googleAccessToken(account: ServiceAccount): Promise<string> {
  const tokenUri = account.token_uri ?? "https://oauth2.googleapis.com/token";
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: account.client_email,
      scope: "https://www.googleapis.com/auth/webmasters",
      aud: tokenUri,
      iat: now,
      exp: now + 600,
    }),
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const assertion = `${header}.${claims}.${base64url(signer.sign(account.private_key))}`;
  const response = await fetch(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }).toString(),
  });
  if (!response.ok) {
    throw new Error(`searchPing: Google token exchange failed — HTTP ${response.status} ${await response.text()}`);
  }
  const token = ((await response.json()) as { access_token?: string }).access_token;
  if (!token) throw new Error("searchPing: Google token response carried no access_token");
  return token;
}

/** The Search Console `sitemaps.submit` endpoint for a property + sitemap. */
export function gscSubmitUrl(siteUrl: string, feedpath: string = SITEMAP_PUBLIC_URL): string {
  return (
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}` +
    `/sitemaps/${encodeURIComponent(feedpath)}`
  );
}

function arg(name: string): string | undefined {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
}

async function main(): Promise<void> {
  const sha = arg("sha") ?? process.env.DEPLOY_SHA;
  if (!sha || !/^[0-9a-f]{7,40}$/i.test(sha)) {
    throw new Error(`searchPing: --sha=<deployed commit> is required (got "${sha ?? ""}")`);
  }
  const dryRun = process.argv.includes("--dry-run");

  const keyFile = resolve(LAZYTOPPER_ROOT, "public", `${INDEXNOW_KEY}.txt`);
  if (!existsSync(keyFile) || readFileSync(keyFile, "utf8").trim() !== INDEXNOW_KEY) {
    throw new Error(`searchPing: the IndexNow key file public/${INDEXNOW_KEY}.txt is missing or wrong`);
  }

  const after = gitShow(sha, SITEMAP_REPO_PATH);
  if (after === null) throw new Error(`searchPing: ${SITEMAP_REPO_PATH} does not exist at ${sha}`);
  const before = gitShow(`${sha}^`, SITEMAP_REPO_PATH);
  const urls = changedUrls(before, after);

  // eslint-disable-next-line no-console
  console.log(
    `SEARCH_PING: sha=${sha} parent=${sha}^ sitemap_urls=${parseSitemap(after).size} ` +
      `changed=${urls.length}${before === null ? " (no sitemap at parent)" : ""}`,
  );
  for (const url of urls) {
    // eslint-disable-next-line no-console
    console.log(`  ${url}`);
  }

  // ── IndexNow ─────────────────────────────────────────────────────────────────
  if (urls.length === 0) {
    // eslint-disable-next-line no-console
    console.log("SEARCH_PING: IndexNow — no new or restamped URLs, no request sent.");
  } else if (dryRun) {
    // eslint-disable-next-line no-console
    console.log(`SEARCH_PING: IndexNow — DRY RUN, body: ${JSON.stringify(indexNowBody(urls))}`);
  } else {
    const response = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(indexNowBody(urls)),
    });
    const text = await response.text();
    // eslint-disable-next-line no-console
    console.log(`SEARCH_PING: IndexNow — POST ${INDEXNOW_ENDPOINT} → HTTP ${response.status} ${text}`);
    if (!indexNowAccepted(response.status)) {
      throw new Error(`searchPing: IndexNow refused the submission — HTTP ${response.status}`);
    }
  }

  // ── Google Search Console (F5) ─────────────────────────────────────────────────
  const rawAccount = process.env.GSC_SERVICE_ACCOUNT ?? "";
  if (rawAccount.trim() === "") {
    // eslint-disable-next-line no-console
    console.log(
      "::notice::SEARCH_PING: GSC_SERVICE_ACCOUNT is not configured — Search Console " +
        "sitemap resubmission skipped.",
    );
    return;
  }
  const siteUrl = (process.env.GSC_SITE_URL ?? "").trim() || "https://www.lazytopper.com/";
  const endpoint = gscSubmitUrl(siteUrl);
  if (dryRun) {
    // eslint-disable-next-line no-console
    console.log(`SEARCH_PING: Search Console — DRY RUN, would PUT ${endpoint}`);
    return;
  }
  const token = await googleAccessToken(JSON.parse(rawAccount) as ServiceAccount);
  const response = await fetch(endpoint, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
  });
  // eslint-disable-next-line no-console
  console.log(`SEARCH_PING: Search Console — PUT sitemaps.submit(${siteUrl}) → HTTP ${response.status}`);
  if (!response.ok) {
    throw new Error(`searchPing: Search Console sitemaps.submit failed — HTTP ${response.status} ${await response.text()}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exitCode = 1;
  });
}
