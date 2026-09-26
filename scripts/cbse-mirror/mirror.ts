/**
 * mirror — one run of the CBSE mirror (C3, C5, C6, C7, C8, C10), with every side
 * effect behind an injected port so the whole run is testable with no network.
 *
 * ORDER OF A RUN
 *   1. Read the previous manifest (it is the job's memory: etags, hashes, sizes).
 *   2. Each paper: conditional GET → unchanged / seed / replace / reject / missing.
 *   3. C7: probe the current session's sample-paper index; ingest later-session
 *      papers through the same guards, requiring a STRICTLY later session.
 *   4. C8: both circular indexes → one feed, or keep the previous feed.
 *   5. C10: validate, then write the manifest LAST, atomically (temp, then copy).
 *   6. Open the issues, de-duplicated against the ones already open.
 *
 * ★ DRY RUN WRITES NOTHING. With `dryRun`, no storage write method is called and no
 * issue is opened; the plan is printed instead. That is enforced twice: the run
 * never calls a writer in dry-run mode, and the storage it is handed in a real dry
 * run (`readOnlyStorage`) throws if anything tries.
 */
import { createHash } from "node:crypto";

import {
  ACADEMIC_INDEX_URL,
  GOV_INDEX_URL,
  buildCircularFeed,
  feedGuard,
  parseAcademicCirculars,
  parseGovCirculars,
  reclassify,
  type Circular,
} from "./circulars";
import { evaluateCandidate, parseSessionYear, type LiveCopy } from "./guards";
import { ISSUE_TITLES, dedupeIssues, type IssueRequest, type IssueTracker } from "./issues";
import { validateManifest, readPreviousManifest, type Manifest, type ManifestPaper } from "./manifest";
import {
  CACHE_CONTROL,
  MANIFEST_PATH,
  MANIFEST_TEMP_PATH,
  MIRROR_PAPERS,
  archivePathFor,
  contentDispositionFor,
  contentTypeFor,
  issueLabel,
  storagePathFor,
  type MirrorPaper,
} from "./papers";
import { mapSqpLinks, nextSessionIndexUrl, parseSqpIndexLinks } from "./sqpIndex";
import type { MirrorStorage } from "./storage";

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type MirrorDeps = {
  readonly now: Date;
  readonly fetch: FetchLike;
  readonly storage: MirrorStorage;
  /** Null in a dry run: a dry run opens no issues. */
  readonly issues: IssueTracker | null;
  readonly dryRun: boolean;
  readonly log: (line: string) => void;
  readonly papers?: readonly MirrorPaper[];
  readonly runUrl?: string;
  readonly requestTimeoutMs?: number;
};

export type MirrorResult = {
  readonly manifest: Manifest;
  readonly plan: readonly string[];
  /** Every issue the run wanted, before de-duplication. */
  readonly issues: readonly IssueRequest[];
  /** Issues actually opened (always empty in a dry run). */
  readonly opened: readonly IssueRequest[];
};

/**
 * ⚠ NO URL IN THE USER-AGENT — MEASURED, 2026-09-26. With a "+https://github.com/…"
 * contact URL appended, www.cbse.gov.in answered HTTP 403 (text/html) for BOTH toppers'
 * ZIPs AND its examination-circulars index, while the same request with this shorter
 * string, a bare "Mozilla/5.0", or no User-Agent at all got 200. cbseacademic.nic.in did
 * not care. A local dry run caught it: two papers "could not be checked" and the gov
 * feed silently contributed zero rows. Pinned by the guard test.
 */
export const USER_AGENT = "Mozilla/5.0 (compatible; LazyTopper-cbse-mirror/1)";

/** The C1 dry-run rule. A scheduled run is real; a manual run is a dry run unless it
 *  says `dry_run: false`; anything unrecognised is a dry run. */
export function resolveDryRun(eventName: string | undefined, input: string | undefined): boolean {
  if (eventName === "schedule") return false;
  if (eventName === "workflow_dispatch") return String(input ?? "").trim().toLowerCase() !== "false";
  return true;
}

/**
 * CA-4 (owner ruling) — defence in depth behind the workflow's own gate: a WRITING run
 * is refused unless the repository variable CBSE_MIRROR_LIVE is exactly "1". A dry run
 * is always allowed. Returns the refusal message, or null when the run may proceed.
 */
export function liveRunRefusal(dryRun: boolean, mirrorLive: string | undefined): string | null {
  if (dryRun) return null;
  if (String(mirrorLive ?? "").trim() === "1") return null;
  return "cbse-mirror: refusing a live (writing) run — CBSE_MIRROR_LIVE is not '1'. Dry runs are allowed.";
}

type Fetched =
  | { readonly kind: "response"; readonly status: number; readonly headers: Headers; readonly body: Uint8Array }
  | { readonly kind: "error"; readonly message: string };

function sha256(body: Uint8Array): string {
  return createHash("sha256").update(body).digest("hex");
}

function liveOf(entry: ManifestPaper | null): LiveCopy | null {
  if (!entry || !entry.storagePath || !entry.sha256 || !entry.bytes) return null;
  return { bytes: entry.bytes, sessionYear: entry.sessionYear, lastModified: entry.lastModified };
}

function emptyEntry(paper: MirrorPaper): ManifestPaper {
  return {
    id: paper.id,
    sourceUrl: paper.href,
    storagePath: null,
    sessionYear: null,
    bytes: null,
    sha256: null,
    etag: null,
    lastModified: null,
    checkedAt: null,
    status: "stale",
  };
}

export async function runMirror(deps: MirrorDeps): Promise<MirrorResult> {
  const { now, storage, dryRun, log } = deps;
  const nowIso = now.toISOString();
  const papers = deps.papers ?? MIRROR_PAPERS;
  const plan: string[] = [];
  const issues: IssueRequest[] = [];
  const note = (line: string) => {
    plan.push(line);
    log(`${dryRun ? "[dry-run] " : ""}${line}`);
  };
  const footer = deps.runUrl ? `\n\nRun: ${deps.runUrl}` : "";

  async function get(url: string, headers: Record<string, string> = {}): Promise<Fetched> {
    try {
      const response = await deps.fetch(url, {
        headers: { "User-Agent": USER_AGENT, ...headers },
        redirect: "follow",
        signal: AbortSignal.timeout(deps.requestTimeoutMs ?? 120_000),
      });
      const body = new Uint8Array(await response.arrayBuffer());
      return { kind: "response", status: response.status, headers: response.headers, body };
    } catch (error: unknown) {
      return { kind: "error", message: error instanceof Error ? error.message : String(error) };
    }
  }

  /** Seed or replace one paper's live object (C3 + C5). Nothing is written in a dry run. */
  async function install(
    paper: MirrorPaper,
    previous: ManifestPaper | null,
    sourceUrl: string,
    body: Uint8Array,
    headers: Headers,
    why: string,
  ): Promise<ManifestPaper> {
    const storagePath = storagePathFor(paper);
    const sessionYear = parseSessionYear(sourceUrl);
    const live = liveOf(previous);
    const meta = {
      contentType: contentTypeFor(paper.kind),
      cacheControl: CACHE_CONTROL,
      contentDisposition: contentDispositionFor(paper, sessionYear),
    };
    if (live && previous?.storagePath) {
      const archive = archivePathFor(paper, now);
      note(`${paper.id}: REPLACE (${why}) — archive ${previous.storagePath} → ${archive}, then write ${storagePath} (${body.length} B)`);
      if (!dryRun) {
        await storage.copy(previous.storagePath, archive);
        await storage.save(storagePath, body, meta);
      }
      issues.push({
        title: ISSUE_TITLES.replaced(issueLabel(paper)),
        body:
          `The mirror replaced **${issueLabel(paper)}** (\`${paper.id}\`) — ${why}.\n\n` +
          `- Old source: ${previous.sourceUrl} (${previous.bytes ?? "?"} bytes, sha256 ${previous.sha256})\n` +
          `- New source: ${sourceUrl} (${body.length} bytes, sha256 ${sha256(body)})\n` +
          `- Previous copy archived at \`${archive}\`.${footer}`,
      });
    } else {
      note(`${paper.id}: SEED — write ${storagePath} (${body.length} B) from ${sourceUrl}`);
      if (!dryRun) await storage.save(storagePath, body, meta);
    }
    return {
      id: paper.id,
      sourceUrl,
      storagePath,
      sessionYear,
      bytes: body.length,
      sha256: sha256(body),
      etag: headers.get("etag"),
      lastModified: headers.get("last-modified"),
      checkedAt: nowIso,
      status: "ok",
    };
  }

  function reject(paper: MirrorPaper, url: string, failed: readonly string[], context: string): void {
    note(`${paper.id}: REJECTED ${url} — guard(s) failed: ${failed.join(", ")}`);
    issues.push({
      title: ISSUE_TITLES.rejected(issueLabel(paper)),
      body:
        `A candidate for **${issueLabel(paper)}** (\`${paper.id}\`) failed the mirror's guards and was NOT installed. ` +
        `The live copy (if any) stays.\n\n- Candidate: ${url}\n- Found by: ${context}\n` +
        `- Failed guard(s): ${failed.map((name) => `\`${name}\``).join(", ")}${footer}`,
    });
  }

  // ── 1. The previous manifest ─────────────────────────────────────────────
  const previous = readPreviousManifest(await storage.readManifest());
  note(previous ? `previous manifest from ${previous.generatedAt}` : "no previous manifest — first seed");

  // ── 2. Each paper (C3, C5, C6) ───────────────────────────────────────────
  const entries = new Map<string, ManifestPaper>();
  for (const paper of papers) {
    const prior = previous?.papers.find((p) => p.id === paper.id) ?? null;
    const base = prior ?? emptyEntry(paper);
    const live = liveOf(prior);
    const sourceUrl = base.sourceUrl;
    const conditional: Record<string, string> = {};
    if (live && prior?.etag) conditional["If-None-Match"] = prior.etag;
    if (live && prior?.lastModified) conditional["If-Modified-Since"] = prior.lastModified;

    const fetched = await get(sourceUrl, conditional);
    if (fetched.kind === "error" || fetched.status >= 500 || ![200, 304, 404, 410].includes(fetched.status)) {
      const why = fetched.kind === "error" ? fetched.message : `HTTP ${fetched.status}`;
      note(`${paper.id}: could not check ${sourceUrl} (${why}) — keeping ${live ? `status ${base.status}` : "no copy"}`);
      entries.set(paper.id, { ...base, status: live ? base.status : "stale" });
      continue;
    }
    if (fetched.status === 404 || fetched.status === 410) {
      note(`${paper.id}: SOURCE MISSING (HTTP ${fetched.status}) ${sourceUrl} — ${live ? "keeping the mirror" : "nothing mirrored yet"}`);
      issues.push({
        title: ISSUE_TITLES.sourceMissing(issueLabel(paper)),
        body:
          `CBSE answered HTTP ${fetched.status} for **${issueLabel(paper)}** (\`${paper.id}\`).\n\n- Source: ${sourceUrl}\n` +
          `- ${live ? `The mirrored copy at \`${base.storagePath}\` is kept.` : "No copy had been mirrored yet."}${footer}`,
      });
      entries.set(paper.id, { ...base, status: "source-missing", checkedAt: nowIso });
      continue;
    }
    if (fetched.status === 304) {
      note(`${paper.id}: unchanged (304)`);
      entries.set(paper.id, { ...base, status: live ? "ok" : "stale", checkedAt: nowIso });
      continue;
    }
    // 200
    const digest = sha256(fetched.body);
    if (live && prior && digest === prior.sha256) {
      note(`${paper.id}: unchanged (same sha256)`);
      entries.set(paper.id, {
        ...base,
        status: "ok",
        etag: fetched.headers.get("etag") ?? base.etag,
        lastModified: fetched.headers.get("last-modified") ?? base.lastModified,
        checkedAt: nowIso,
      });
      continue;
    }
    const verdict = evaluateCandidate(
      paper,
      { url: sourceUrl, body: fetched.body, lastModified: fetched.headers.get("last-modified") },
      live,
    );
    if (!verdict.pass) {
      reject(paper, sourceUrl, verdict.failed, "the daily freshness check");
      entries.set(paper.id, { ...base, status: "stale", checkedAt: nowIso });
      continue;
    }
    entries.set(
      paper.id,
      await install(paper, prior, sourceUrl, fetched.body, fetched.headers, live ? "the source file changed" : "first seed"),
    );
  }

  // ── 3. C7 — the new-session probe ────────────────────────────────────────
  const probe = nextSessionIndexUrl(now);
  const index = await get(probe.url);
  if (index.kind === "response" && index.status === 200) {
    const html = Buffer.from(index.body).toString("utf8");
    const { mapped, unmapped } = mapSqpLinks(parseSqpIndexLinks(html, probe.url), papers);
    const fresh = mapped.filter(({ paperId, url }) => entries.get(paperId)?.sourceUrl !== url);
    note(`C7 ${probe.url}: 200 — ${mapped.length} mapped (${fresh.length} new), ${unmapped.length} unmapped`);
    // Report unmapped Science/Maths links on the run that meets a NEW mapping, not
    // every morning for the rest of the session.
    if (fresh.length > 0 && unmapped.length > 0) {
      issues.push({
        title: ISSUE_TITLES.unmapped(probe.session),
        body:
          `The ${probe.session} Class X sample-paper index (${probe.url}) links these Science/Maths files, ` +
          `which map to no paper on /cbse/class-10. They were NOT ingested.\n\n` +
          unmapped.map((url) => `- ${url}`).join("\n") +
          footer,
      });
    }
    for (const { paperId, url } of fresh) {
      const paper = papers.find((p) => p.id === paperId);
      const current = entries.get(paperId) ?? null;
      if (!paper) continue;
      const fetched = await get(url);
      if (fetched.kind === "error" || fetched.status !== 200) {
        note(`${paperId}: C7 candidate ${url} not fetched (${fetched.kind === "error" ? fetched.message : `HTTP ${fetched.status}`})`);
        continue;
      }
      const verdict = evaluateCandidate(
        paper,
        { url, body: fetched.body, lastModified: fetched.headers.get("last-modified") },
        liveOf(current),
        { requireLaterSession: true },
      );
      if (!verdict.pass) {
        reject(paper, url, verdict.failed, `the ${probe.session} sample-paper index (C7)`);
        continue;
      }
      entries.set(
        paperId,
        await install(paper, current, url, fetched.body, fetched.headers, `CBSE published the ${probe.session} version`),
      );
    }
  } else {
    note(`C7 ${probe.url}: not published (${index.kind === "error" ? index.message : `HTTP ${index.status}`})`);
  }

  // ── 4. C8 — circulars ─────────────────────────────────────────────────────
  const [gov, academic] = [await get(GOV_INDEX_URL), await get(ACADEMIC_INDEX_URL)];
  const text = (f: Fetched) =>
    f.kind === "response" && f.status === 200 ? new TextDecoder("utf-8").decode(f.body) : null;
  const status = (f: Fetched) => (f.kind === "error" ? f.message : `HTTP ${f.status}`);
  const govHtml = text(gov);
  const academicHtml = text(academic);
  const feed = buildCircularFeed(
    [
      ...(govHtml ? parseGovCirculars(govHtml, GOV_INDEX_URL) : []),
      ...(academicHtml ? parseAcademicCirculars(academicHtml, ACADEMIC_INDEX_URL) : []),
    ],
    now,
  );
  const previousCirculars: readonly Circular[] = previous?.circulars ?? [];
  const verdict = feedGuard(feed.length, previousCirculars.length);
  let circulars: Circular[];
  let circularsCheckedAt: string | null;
  if (verdict.ok) {
    circulars = feed;
    circularsCheckedAt = nowIso;
    note(`circulars: ${feed.length} rows (${feed.filter((c) => c.important).length} important)`);
  } else {
    circulars = reclassify(previousCirculars, now);
    circularsCheckedAt = previous?.circularsCheckedAt ?? null;
    note(`circulars: REJECTED (${verdict.reason}) — keeping the previous ${previousCirculars.length} rows`);
    issues.push({
      title: ISSUE_TITLES.circularsRejected(),
      body:
        `The circulars feed was not updated: ${verdict.reason}. The previous feed is kept.\n\n` +
        `- ${GOV_INDEX_URL}: ${status(gov)}\n- ${ACADEMIC_INDEX_URL}: ${status(academic)}${footer}`,
    });
  }

  // ── 5. C10 — the manifest, last and atomically ──────────────────────────
  const manifest: Manifest = {
    v: 1,
    generatedAt: nowIso,
    papers: papers.map((paper) => entries.get(paper.id) ?? emptyEntry(paper)),
    circulars,
    circularsCheckedAt,
  };
  const problems = validateManifest(manifest);
  if (problems.length > 0) {
    throw new Error(`cbse-mirror: refusing to write an invalid manifest:\n  - ${problems.join("\n  - ")}`);
  }
  const bytes = new TextEncoder().encode(`${JSON.stringify(manifest, null, 2)}\n`);
  note(`manifest: ${manifest.papers.filter((p) => p.status === "ok").length}/${manifest.papers.length} papers ok, ${circulars.length} circulars → ${MANIFEST_PATH}`);
  if (!dryRun) {
    const meta = { contentType: "application/json", cacheControl: CACHE_CONTROL };
    await storage.save(MANIFEST_TEMP_PATH, bytes, meta);
    await storage.copy(MANIFEST_TEMP_PATH, MANIFEST_PATH);
    await storage.remove(MANIFEST_TEMP_PATH);
  }

  // ── 6. Issues, de-duplicated against what is already open ───────────────
  let opened: IssueRequest[] = [];
  if (!dryRun && deps.issues) {
    opened = dedupeIssues(issues, await deps.issues.openTitles());
    for (const request of opened) await deps.issues.create(request);
  }
  for (const request of dryRun ? dedupeIssues(issues, new Set()) : opened) {
    note(`issue${dryRun ? " (would open)" : ""}: ${request.title}`);
  }

  return { manifest, plan, issues, opened };
}
