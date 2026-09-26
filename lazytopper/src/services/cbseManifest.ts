import { useEffect, useState } from "react";

import type { CbseCircular, CbsePaper } from "../pages/cbse2027Sources";

/**
 * cbseManifest — the client side of the CBSE mirror (CBSE-AUTO-1 C11/C12).
 *
 * The daily job (`scripts/cbse-mirror/`) publishes `cbse/manifest.json` to Firebase
 * Storage as a public-read object. This module fetches it through the same public
 * REST URL pattern the NCERT modal uses (`NcertPageModal.tsx` `buildNcertPdfUrl`),
 * with NO auth, a 5-second timeout, and one rule above all others:
 *
 * ★ ANY FAILURE IS `null`, AND `null` MEANS "RENDER EXACTLY TODAY'S PAGE". No bucket
 * configured (every local and CI build), a network error, a timeout, a 404, a non-JSON
 * body, a manifest of the wrong shape — every one of them returns null, never throws,
 * and the page then renders its committed hrefs, its "Open" labels, its committed
 * circulars and its committed "checked on" date, byte for byte. The mirror can only
 * ever ADD to the page; it cannot take anything away.
 *
 * ⚠ THE PRERENDER CAPTURE NEVER SEES A MANIFEST, AND THAT IS WHY THE FALLBACK IS THE
 * CAPTURED BODY. `prerender-capture.yml` builds with no `VITE_FIREBASE_STORAGE_BUCKET`,
 * so `fetchCbseManifest` returns null before any request and the committed artifact
 * stays a function of source. If a future change gives that build a bucket, the
 * capture's blocked-vs-live control would NOT catch the difference (it blocks only
 * `/api/**`), and a day's manifest would be frozen into the artifact.
 *
 * ⚠ NO CLOCK. Nothing here reads the time: dates are formatted from the manifest's own
 * strings, so the same manifest always renders the same text.
 */

export const CBSE_MANIFEST_PATH = "cbse/manifest.json";
export const CBSE_MANIFEST_TIMEOUT_MS = 5_000;

export type CbseManifestPaperStatus = "ok" | "source-missing" | "stale";

export type CbseManifestPaper = {
  readonly id: string;
  readonly sourceUrl: string;
  readonly storagePath: string | null;
  readonly sessionYear: string | null;
  readonly status: CbseManifestPaperStatus;
};

export type CbseManifestCircular = {
  readonly id: string;
  /** `YYYY-MM-DD`, or `YYYY-MM` when CBSE published only a month. */
  readonly date: string;
  readonly title: string;
  readonly href: string;
  readonly source: "document" | "index";
  readonly important: boolean;
  readonly headline: string;
};

export type CbseManifest = {
  readonly v: 1;
  readonly generatedAt: string;
  readonly papers: readonly CbseManifestPaper[];
  readonly circulars: readonly CbseManifestCircular[];
  readonly circularsCheckedAt: string | null;
};

export function cbseStorageBucket(): string {
  return String(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "").trim();
}

/** The public download URL for an object — the P8 pattern. */
export function cbseStorageUrl(bucket: string, objectPath: string): string {
  return (
    `https://firebasestorage.googleapis.com/v0/b/${bucket}` +
    `/o/${encodeURIComponent(objectPath)}?alt=media`
  );
}

const STATUSES: readonly string[] = ["ok", "source-missing", "stale"];

function isHttpUrl(value: unknown): value is string {
  return typeof value === "string" && /^https?:\/\/[^\s]+$/i.test(value);
}

function parsePaper(raw: unknown): CbseManifestPaper | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  if (typeof p.id !== "string" || !p.id) return null;
  if (!isHttpUrl(p.sourceUrl)) return null;
  if (typeof p.status !== "string" || !STATUSES.includes(p.status)) return null;
  const storagePath =
    typeof p.storagePath === "string" && p.storagePath.startsWith("cbse/files/")
      ? p.storagePath
      : null;
  const sessionYear = typeof p.sessionYear === "string" ? p.sessionYear : null;
  return {
    id: p.id,
    sourceUrl: p.sourceUrl,
    storagePath,
    sessionYear,
    status: p.status as CbseManifestPaperStatus,
  };
}

function parseCircular(raw: unknown): CbseManifestCircular | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Record<string, unknown>;
  if (typeof c.id !== "string" || !c.id) return null;
  if (typeof c.date !== "string" || !/^\d{4}-\d{2}(-\d{2})?$/.test(c.date)) return null;
  if (typeof c.title !== "string" || !c.title.trim()) return null;
  if (!isHttpUrl(c.href)) return null;
  if (c.source !== "document" && c.source !== "index") return null;
  if (typeof c.important !== "boolean" || typeof c.headline !== "string") return null;
  return {
    id: c.id,
    date: c.date,
    title: c.title,
    href: c.href,
    source: c.source,
    important: c.important,
    headline: c.headline,
  };
}

/**
 * Defensive parse. The top level must be a v1 manifest or the whole thing is null;
 * a single malformed row is dropped rather than sinking the rest.
 */
export function parseCbseManifest(value: unknown): CbseManifest | null {
  if (!value || typeof value !== "object") return null;
  const m = value as Record<string, unknown>;
  if (m.v !== 1) return null;
  if (typeof m.generatedAt !== "string") return null;
  if (!Array.isArray(m.papers) || !Array.isArray(m.circulars)) return null;
  const papers = m.papers.map(parsePaper).filter((p): p is CbseManifestPaper => p !== null);
  const circulars = m.circulars
    .map(parseCircular)
    .filter((c): c is CbseManifestCircular => c !== null);
  const circularsCheckedAt =
    typeof m.circularsCheckedAt === "string" && /^\d{4}-\d{2}-\d{2}/.test(m.circularsCheckedAt)
      ? m.circularsCheckedAt
      : null;
  return { v: 1, generatedAt: m.generatedAt, papers, circulars, circularsCheckedAt };
}

export type FetchCbseManifestOptions = {
  readonly bucket?: string;
  readonly fetchImpl?: typeof fetch;
  readonly timeoutMs?: number;
  readonly signal?: AbortSignal;
};

/** The manifest, or null on ANY failure. Never throws. */
export async function fetchCbseManifest(
  options: FetchCbseManifestOptions = {},
): Promise<CbseManifest | null> {
  const bucket = (options.bucket ?? cbseStorageBucket()).trim();
  if (!bucket) return null;
  const fetchImpl = options.fetchImpl ?? (typeof fetch === "function" ? fetch : null);
  if (!fetchImpl) return null;

  const controller = new AbortController();
  const onAbort = () => controller.abort();
  if (options.signal) {
    if (options.signal.aborted) return null;
    options.signal.addEventListener("abort", onAbort, { once: true });
  }
  const timer = setTimeout(onAbort, options.timeoutMs ?? CBSE_MANIFEST_TIMEOUT_MS);
  try {
    const response = await fetchImpl(cbseStorageUrl(bucket, CBSE_MANIFEST_PATH), {
      signal: controller.signal,
      credentials: "omit",
    });
    if (!response.ok) return null;
    return parseCbseManifest(await response.json());
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", onAbort);
  }
}

/**
 * The manifest for a component, fetched once on mount. `null` until it arrives and
 * forever if it never does — the caller renders its committed fallback meanwhile,
 * which is also the first paint, so the page never flashes an empty state.
 */
export function useCbseManifest(): CbseManifest | null {
  const [manifest, setManifest] = useState<CbseManifest | null>(null);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    void fetchCbseManifest({ signal: controller.signal }).then((result) => {
      if (active) setManifest(result);
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, []);
  return manifest;
}

// ─── What the page renders from it ──────────────────────────────────────────

export type CbsePaperLink = {
  readonly href: string;
  /** "Download" ONLY when the file is served from our mirror as an attachment. */
  readonly label: "Open" | "Download";
  readonly title: string;
};

/**
 * C11 — a paper whose manifest status is `ok` links its Storage copy and reads
 * "Download", because the mirror serves it with `Content-Disposition: attachment`
 * (P5: the label changes because the behaviour does).
 *
 * CA-2 (owner ruling, AUDIT HOLD on #824 — resolves C6 vs C11 in C6's favour): a
 * `source-missing` paper is treated like `ok` WHEN A MIRRORED COPY EXISTS. CBSE has
 * pulled the file, so its href is dead; the mirror keeps serving the last good copy.
 * `stale` and anything else — and no manifest, no bucket, no entry, no storagePath —
 * is exactly the committed row.
 *
 * P16: the only session year a paper row shows is in its title (the two
 * "Syllabus 2026-27" rows). When the mirrored copy is from a named session, that
 * year is shown instead of the committed one.
 */
const SERVED_FROM_MIRROR: readonly CbseManifestPaperStatus[] = ["ok", "source-missing"];

export function cbsePaperLink(
  paper: CbsePaper,
  manifest: CbseManifest | null,
  bucket: string = cbseStorageBucket(),
): CbsePaperLink {
  const committed: CbsePaperLink = { href: paper.href, label: "Open", title: paper.title };
  if (!manifest || !bucket) return committed;
  const entry = manifest.papers.find((p) => p.id === paper.id);
  if (!entry || !SERVED_FROM_MIRROR.includes(entry.status) || !entry.storagePath) return committed;
  const title =
    entry.sessionYear && /^\d{4}-\d{2}$/.test(entry.sessionYear)
      ? paper.title.replace(/\b\d{4}-\d{2}\b/, entry.sessionYear)
      : paper.title;
  return { href: cbseStorageUrl(bucket, entry.storagePath), label: "Download", title };
}

/** The first session whose sample papers make the "Sample papers" pill read "out". */
export const CBSE_SQP_READY_FROM_SESSION = 2026;

/**
 * CA-3 (owner ruling, AUDIT HOLD on #824) — the hero's "Sample papers" pill reads the
 * manifest. It is READY only when a mirrored sample-paper row (a committed paper whose
 * href is a `-SQP.pdf` under CBSE's `/SQP/` folder) has status `ok` or `source-missing`,
 * a storagePath, and a sessionYear of 2026-27 or later. Everything else — including no
 * manifest at all — keeps today's "awaited" pill exactly.
 */
export function cbseSamplePapersOut(
  manifest: CbseManifest | null,
  papers: readonly CbsePaper[],
): boolean {
  if (!manifest) return false;
  const sqpIds = new Set(
    papers.filter((p) => /\/SQP\/.*-SQP\.pdf$/i.test(p.href)).map((p) => p.id),
  );
  return manifest.papers.some((entry) => {
    if (!sqpIds.has(entry.id)) return false;
    if (!SERVED_FROM_MIRROR.includes(entry.status) || !entry.storagePath) return false;
    const start = entry.sessionYear?.match(/^(\d{4})-\d{2}$/)?.[1];
    return start !== undefined && Number(start) >= CBSE_SQP_READY_FROM_SESSION;
  });
}

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * The feed's date column, in the committed rows' own style: "10 Sep" in the year the
 * feed was checked, "5 Aug 25" for an earlier year. A month-only row stays month-only
 * ("Sep", "Sep 2025") — CBSE did not publish a day, so the page does not invent one.
 */
export function formatCircularDate(date: string, referenceYear: number | null): string {
  const match = date.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/);
  if (!match) return date;
  const year = Number(match[1]);
  const month = MONTHS_SHORT[Number(match[2]) - 1] ?? match[2];
  const sameYear = referenceYear === year;
  if (!match[3]) return sameYear ? month : `${month} ${year}`;
  const day = String(Number(match[3]));
  return sameYear ? `${day} ${month}` : `${day} ${month} ${match[1].slice(2)}`;
}

/** "2026-09-26T00:31:07.000Z" → "26 September 2026" (the UTC date). */
export function formatCheckedOn(iso: string): string | null {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const month = MONTHS_LONG[Number(match[2]) - 1];
  if (!month) return null;
  return `${Number(match[3])} ${month} ${match[1]}`;
}

export type CbseCircularRow = {
  readonly key: string;
  readonly date: string;
  readonly title: string;
  readonly href: string;
  readonly source: "document" | "index";
};

/**
 * The circular feed and its "checked on" date: the manifest's when it carries both,
 * otherwise the committed rows and the committed date — never a mix of the two.
 */
export function cbseCircularFeed(
  manifest: CbseManifest | null,
  committed: readonly CbseCircular[],
  committedCheckedOn: string,
): { rows: CbseCircularRow[]; checkedOn: string } {
  const checkedOn = manifest?.circularsCheckedAt ? formatCheckedOn(manifest.circularsCheckedAt) : null;
  if (manifest && checkedOn && manifest.circulars.length > 0) {
    const referenceYear = Number(manifest.circularsCheckedAt?.slice(0, 4)) || null;
    return {
      rows: manifest.circulars.map((c) => ({
        key: c.id,
        date: formatCircularDate(c.date, referenceYear),
        title: c.title,
        href: c.href,
        source: c.source,
      })),
      checkedOn,
    };
  }
  return {
    rows: committed.map((c) => ({
      key: c.href + c.date,
      date: c.date,
      title: c.title,
      href: c.href,
      source: c.source,
    })),
    checkedOn: committedCheckedOn,
  };
}

function dateKey(date: string): string {
  return date.length === 7 ? `${date}-00` : date;
}

/** C12 — the newest circular flagged important that carries a headline, or null. */
export function newestImportantCircular(
  manifest: CbseManifest | null,
): CbseManifestCircular | null {
  if (!manifest) return null;
  let best: CbseManifestCircular | null = null;
  for (const circular of manifest.circulars) {
    if (!circular.important || !circular.headline.trim()) continue;
    if (!best || dateKey(circular.date) > dateKey(best.date)) best = circular;
  }
  return best;
}
