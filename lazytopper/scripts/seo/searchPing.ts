/**
 * TELL SEARCH ENGINES WHAT CHANGED, AFTER EVERY PRODUCTION DEPLOY (SEO-FRESH-1, F4 + F5).
 *
 *   tsx scripts/seo/searchPing.ts --sha=<deployed sha> --wait   (step 1 of .github/workflows/search-ping.yml)
 *   tsx scripts/seo/searchPing.ts --sha=<deployed sha>          (step 2 — runs only if step 1 said live)
 *   tsx scripts/seo/searchPing.ts --sha=<sha> --dry-run         (print, send nothing)
 *
 * ★ WAIT FOR THE RELEASE TO BE LIVE (SEARCHPING-2, S2). Vercel Rolling Releases moves traffic
 * 10% → 50% → 100% over ~15 minutes AFTER the deployment is "ready" — the moment the
 * `deployment_status` event fires. Pinging then sends crawlers to pages most of them still
 * get the old release of. So `--wait` polls `https://www.lazytopper.com/app/version.json`
 * (written by `writeVersion.ts` in every build; cache-busted) until FIVE CONSECUTIVE reads
 * return this commit, for at most 30 minutes:
 *   · 5 in a row → `live=true`; the ping step runs.
 *   · www serves a DIFFERENT commit that DESCENDS from this one → `live=false`, clean exit:
 *     a newer release superseded this one, and that release's run will ping.
 *   · 30 minutes without 5 in a row → the job FAILS, visibly, and nothing is pinged.
 *
 * ★ "BEFORE" IS THE LAST RELEASE ANYONE PINGED (S3), not the commit's parent. The sitemap is
 * diffed against the head commit of the newest `search-ping` run that concluded success AND
 * whose ping step actually ran (a superseded run succeeds without pinging, so it must not
 * count) AND that this release descends from. A superseded deploy's pages are therefore
 * announced when the next release lands. Only when no such run exists does the diff fall
 * back to the parent.
 *
 * ★ WHAT "CHANGED" MEANS IS DECIDED BY THE SITEMAP, NOT BY THIS SCRIPT. `gen:sitemap`
 * restamps a URL's `<lastmod>` only when that page's committed prerendered body changed
 * (F1). So the set of URLs worth announcing is exactly the set whose `<lastmod>` moved —
 * or that appeared — between the last pinged release and the deployed commit. Diffing the sitemap
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
import { appendFileSync, existsSync, readFileSync } from "node:fs";
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

/** The release marker `writeVersion.ts` publishes in every build (S1). */
export const VERSION_URL = "https://www.lazytopper.com/app/version.json";
/** S2 — consecutive reads of this commit that make the release count as live. */
export const REQUIRED_CONSECUTIVE_READS = 5;
/** S2 — how long to wait for them before failing, visibly. */
export const ROLLOUT_TIMEOUT_MS = 30 * 60 * 1000;
/** S2 — pause between reads. */
export const READ_INTERVAL_MS = 15 * 1000;
/**
 * The workflow step that sends the ping. A past run counts as "pinged" (S3) only if THIS
 * step concluded success in it — the guard test holds the workflow to this exact name.
 */
export const PING_STEP_NAME = "Ping IndexNow (and Search Console when configured)";

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

// ── S2: wait for the rollout ──────────────────────────────────────────────────────

export type RolloutOutcome =
  | { outcome: "live"; reads: number }
  | { outcome: "superseded"; servedSha: string; reads: number };

export interface RolloutDeps {
  /** One cache-busted read of the served marker: its SHA, or null (missing, not JSON, error). */
  readServedSha: () => Promise<string | null>;
  /** True when `served` is a DIFFERENT commit that descends from the one being waited for. */
  isDescendant: (served: string) => boolean;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
  log: (line: string) => void;
}

export interface RolloutOptions {
  required?: number;
  timeoutMs?: number;
  intervalMs?: number;
}

function sameCommit(served: string, sha: string): boolean {
  return served.toLowerCase().startsWith(sha.toLowerCase());
}

/**
 * Poll www until `required` CONSECUTIVE reads serve `sha` (→ live), or www serves a
 * descendant of it (→ superseded, a clean exit). Any other read — the old release, a
 * missing or unreadable marker — resets the streak. Throws once `timeoutMs` has passed.
 */
export async function waitForRollout(
  sha: string,
  deps: RolloutDeps,
  {
    required = REQUIRED_CONSECUTIVE_READS,
    timeoutMs = ROLLOUT_TIMEOUT_MS,
    intervalMs = READ_INTERVAL_MS,
  }: RolloutOptions = {},
): Promise<RolloutOutcome> {
  const started = deps.now();
  let streak = 0;
  for (let reads = 1; ; reads += 1) {
    const served = await deps.readServedSha();
    const matches = served !== null && sameCommit(served, sha);
    streak = matches ? streak + 1 : 0;
    deps.log(
      `SEARCH_PING: rollout read ${reads} — www serves sha=${served ?? "(none)"} ` +
        `want=${sha} streak=${streak}/${required}`,
    );
    if (streak >= required) return { outcome: "live", reads };
    if (served !== null && !matches && deps.isDescendant(served)) {
      return { outcome: "superseded", servedSha: served, reads };
    }
    if (deps.now() - started >= timeoutMs) {
      throw new Error(
        `searchPing: release ${sha} did not reach www — ${required} consecutive reads of ` +
          `${VERSION_URL} not seen within ${Math.round(timeoutMs / 60000)} minutes ` +
          `(${reads} reads). Nothing was pinged.`,
      );
    }
    await deps.sleep(intervalMs);
  }
}

async function readServedSha(): Promise<string | null> {
  try {
    const response = await fetch(`${VERSION_URL}?t=${Date.now()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
    });
    if (!response.ok) return null;
    const sha = (JSON.parse(await response.text()) as { sha?: unknown }).sha;
    return typeof sha === "string" && /^[0-9a-f]{40}$/i.test(sha) ? sha.toLowerCase() : null;
  } catch {
    return null;
  }
}

// ── S3: diff from the last successful ping ────────────────────────────────────────

export interface PingRun {
  id: number;
  headSha: string;
}

export interface BeforeDeps {
  /** Successful `search-ping` runs, newest first. */
  successfulRuns: () => PingRun[];
  /** Whether the run's ping step (PING_STEP_NAME) concluded success. */
  pinged: (run: PingRun) => boolean;
  /** Whether `candidate` is `sha` itself or one of its ancestors. */
  isAncestorOrSelf: (candidate: string) => boolean;
}

export type BeforeRef =
  | { ref: string; source: "last-ping"; runId: number }
  | { ref: string; source: "parent" };

/**
 * The commit whose sitemap is "before": the head of the newest successful run that actually
 * pinged and that this release descends from; the parent only if there is none.
 */
export function resolveBefore(sha: string, deps: BeforeDeps): BeforeRef {
  for (const run of deps.successfulRuns()) {
    if (!deps.isAncestorOrSelf(run.headSha)) continue;
    if (!deps.pinged(run)) continue;
    return { ref: run.headSha, source: "last-ping", runId: run.id };
  }
  return { ref: `${sha}^`, source: "parent" };
}

function gh(args: string[]): string {
  const repo = process.env.GITHUB_REPOSITORY;
  return execFileSync("gh", repo ? [...args, "--repo", repo] : args, {
    cwd: LAZYTOPPER_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function successfulPingRuns(): PingRun[] {
  const rows = JSON.parse(
    gh([
      "run", "list", "--workflow", "search-ping", "--status", "success",
      "--limit", "30", "--json", "databaseId,headSha",
    ]),
  ) as Array<{ databaseId: number; headSha: string }>;
  return rows.map((row) => ({ id: row.databaseId, headSha: row.headSha }));
}

function runPinged(run: PingRun): boolean {
  const view = JSON.parse(gh(["run", "view", String(run.id), "--json", "jobs"])) as {
    jobs?: Array<{ steps?: Array<{ name?: string; conclusion?: string }> }>;
  };
  return (view.jobs ?? []).some((job) =>
    (job.steps ?? []).some((step) => step.name === PING_STEP_NAME && step.conclusion === "success"),
  );
}

function git(args: string[]): boolean {
  try {
    execFileSync("git", args, { cwd: LAZYTOPPER_ROOT, stdio: ["ignore", "ignore", "ignore"] });
    return true;
  } catch {
    return false;
  }
}

/** Make sure a commit is present locally — a newer release may postdate the checkout. */
function haveCommit(sha: string): boolean {
  const present = (): boolean => git(["cat-file", "-e", `${sha}^{commit}`]);
  return present() || (git(["fetch", "--quiet", "origin", sha]) && present());
}

function isAncestor(ancestor: string, descendant: string): boolean {
  return haveCommit(ancestor) && haveCommit(descendant) && git(["merge-base", "--is-ancestor", ancestor, descendant]);
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

  // ── S2: the wait (workflow step 1) ────────────────────────────────────────────
  if (process.argv.includes("--wait")) {
    const result = await waitForRollout(sha, {
      readServedSha,
      isDescendant: (served) => !sameCommit(served, sha) && isAncestor(sha, served),
      sleep: (ms) => new Promise((done) => setTimeout(done, ms)),
      now: () => Date.now(),
      // eslint-disable-next-line no-console
      log: (line) => console.log(line),
    });
    const live = result.outcome === "live";
    // eslint-disable-next-line no-console
    console.log(
      result.outcome === "live"
        ? `SEARCH_PING: release ${sha} is live on www — ${REQUIRED_CONSECUTIVE_READS} consecutive ` +
            `reads (${result.reads} in all). The ping step runs.`
        : `SEARCH_PING: www already serves ${result.servedSha}, which descends from ${sha} — ` +
            `superseded; that release's run will ping. No ping from this run.`,
    );
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `live=${live}\n`);
    return;
  }

  const keyFile = resolve(LAZYTOPPER_ROOT, "public", `${INDEXNOW_KEY}.txt`);
  if (!existsSync(keyFile) || readFileSync(keyFile, "utf8").trim() !== INDEXNOW_KEY) {
    throw new Error(`searchPing: the IndexNow key file public/${INDEXNOW_KEY}.txt is missing or wrong`);
  }

  const after = gitShow(sha, SITEMAP_REPO_PATH);
  if (after === null) throw new Error(`searchPing: ${SITEMAP_REPO_PATH} does not exist at ${sha}`);
  // ── S3: "before" = the last release that was pinged ─────────────────────────────
  const beforeRef = resolveBefore(sha, {
    successfulRuns: successfulPingRuns,
    pinged: runPinged,
    isAncestorOrSelf: (candidate) => sameCommit(candidate, sha) || isAncestor(candidate, sha),
  });
  const before = gitShow(beforeRef.ref, SITEMAP_REPO_PATH);
  const urls = changedUrls(before, after);

  // eslint-disable-next-line no-console
  console.log(
    `SEARCH_PING: sha=${sha} before=${beforeRef.ref} (` +
      (beforeRef.source === "last-ping"
        ? `last successful ping, run ${beforeRef.runId}`
        : "no pinged ancestor — parent fallback") +
      `) sitemap_urls=${parseSitemap(after).size} ` +
      `changed=${urls.length}${before === null ? " (no sitemap at before)" : ""}`,
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
