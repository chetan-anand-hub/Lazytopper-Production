/**
 * packEntry — PACKS-ENTRY-1: the small "PDF packs" links beside an ask (download wall, notes, footer,
 * account) and the query contract of /packs they point at.
 *
 * ★ LIGHT ON PURPOSE. The links live in surfaces that are loaded early (footer, account menu, wall), so this
 * file imports only the 26-slug list and the analytics sender. It never imports services/packs.ts (that pulls
 * the checkout in); the flag is read here as its own literal `import.meta.env` expression, and a test pins that
 * it agrees with `isPacksClientEnabled()`.
 *
 * ★ OWNER RULE 1: wherever a pack link sits next to an ask, the Premium / Board Pass option is first and
 * primary; the pack link is second and smaller. RULE 2: never a pop-up, never on mount.
 *
 * Query contract for /packs (PacksPage adopts it; the coordinator wires it after both lanes merge):
 *   /packs?chapter=<slug>   preselect that chapter and open the Chapter Pack pop-up
 *   /packs?mock=maths|science   open the Mock Pack pop-up on that subject
 *   /packs?pack=chapter|mock|subject|bundle   open that pack's pop-up (Google Ads sitelinks)
 *   /packs?subject=maths|science   the subject for a mock / subject pop-up opened by ?pack=
 *   /packs?view=sample   open on the PDF cover slide (alone: the Chapter Pack pop-up)
 *   Order: chapter, then mock, then pack, then view=sample. Unknown or repeated values count as absent;
 *   other params (utm_*) are ignored.
 *   /packs#my-packs         the student's owned packs
 */
import { sendAnalyticsHit } from "../../analytics/analytics";
import { ACTIVITY_TOPIC_SLUGS } from "../../services/activityPages";
import { isPacksEntryEnabled } from "./packEntryLazy";

/** PACKS-ENTRY-1 — where the tap on a "PDF packs" link happened. A fixed set, never free text. */
export type PackEntrySource = "download_wall" | "notes" | "footer" | "account";

/** Display price of one Chapter Pack, copy only (the server charges its own amount; a test pins this to the catalogue). */
export const CHAPTER_PACK_PRICE_INR = 49;

export { isPacksEntryEnabled };

export function isPackChapterSlug(value: unknown): value is string {
  return typeof value === "string" && (ACTIVITY_TOPIC_SLUGS as readonly string[]).includes(value);
}

export type PackSubjectName = "maths" | "science";

export interface PacksHrefOptions {
  /** A chapter slug. An unknown slug is dropped: the link then opens the plain /packs. */
  chapter?: string | null;
  /** A subject: the Full Mock wall opens the Mock Pack of that subject. Ignored when a chapter is given. */
  mock?: PackSubjectName | null;
  /** "my-packs" → #my-packs. */
  hash?: "my-packs";
}

export function packsHref(opts: PacksHrefOptions = {}): string {
  const query = isPackChapterSlug(opts.chapter)
    ? `?chapter=${encodeURIComponent(opts.chapter)}`
    : opts.mock === "maths" || opts.mock === "science"
      ? `?mock=${opts.mock}`
      : "";
  return `/packs${query}${opts.hash ? `#${opts.hash}` : ""}`;
}

export type PacksQueryPack = "chapter" | "mock" | "subject" | "bundle";

export interface PacksQuery {
  /** A valid chapter slug, or null. */
  chapter: string | null;
  /** "maths" | "science", or null. */
  mock: PackSubjectName | null;
  /** Which pack pop-up a sitelink asks for, or null. */
  pack: PacksQueryPack | null;
  /** "maths" | "science" for a mock / subject pop-up, or null. */
  subject: PackSubjectName | null;
  /** "sample" = open on the PDF cover slide, or null. */
  view: "sample" | null;
}

/** The single value of a param, or null when it is absent or repeated. */
function onlyOne(q: URLSearchParams, key: string): string | null {
  const all = q.getAll(key);
  return all.length === 1 ? all[0] : null;
}

/** Reads `location.search`. Never trusts it: an unknown or repeated value is treated as absent. */
export function readPacksQuery(search: string): PacksQuery {
  const out: PacksQuery = { chapter: null, mock: null, pack: null, subject: null, view: null };
  try {
    const q = new URLSearchParams(search);
    const c = onlyOne(q, "chapter");
    if (isPackChapterSlug(c)) out.chapter = c;
    const m = onlyOne(q, "mock");
    if (m === "maths" || m === "science") out.mock = m;
    const p = onlyOne(q, "pack");
    if (p === "chapter" || p === "mock" || p === "subject" || p === "bundle") out.pack = p;
    const s = onlyOne(q, "subject");
    if (s === "maths" || s === "science") out.subject = s;
    if (onlyOne(q, "view") === "sample") out.view = "sample";
  } catch {
    return { chapter: null, mock: null, pack: null, subject: null, view: null };
  }
  return out;
}

/**
 * The chapter a page is about, read from its own address: the first path segment that is one of the 26
 * chapter slugs (/notes/<slug>, /topic/<slug>/…), else a `topic` / `chapter` / `topicKey` query value.
 * null when the page names none: the link then opens the plain /packs. Never guessed.
 */
export function chapterFromLocation(pathname: string, search = ""): string | null {
  for (const seg of pathname.split("/")) {
    let decoded = seg;
    try {
      decoded = decodeURIComponent(seg);
    } catch {
      /* keep the raw segment */
    }
    if (isPackChapterSlug(decoded)) return decoded;
  }
  try {
    const q = new URLSearchParams(search);
    for (const key of ["topic", "chapter", "topicKey"]) {
      const v = q.get(key);
      if (isPackChapterSlug(v)) return v;
    }
  } catch {
    /* fall through */
  }
  return null;
}

/**
 * The subject of a Full Mock page, read from its own address (a path containing "mock" plus a "maths" / "science"
 * segment or a `subject` query value). null for anything else: the wall then links to the plain /packs. Never guessed.
 */
export function mockSubjectFromLocation(pathname: string, search = ""): PackSubjectName | null {
  if (!/mock/i.test(pathname)) return null;
  const hit = (v: string | null | undefined): PackSubjectName | null => (v === "maths" || v === "science" ? v : null);
  for (const seg of pathname.toLowerCase().split("/")) if (hit(seg)) return hit(seg);
  try {
    return hit(new URLSearchParams(search).get("subject")?.toLowerCase());
  } catch {
    return null;
  }
}

/**
 * Fires `pack_entry_click` ({ from } travels as `data`, the shape Vercel custom events read; GA4 and the first-party
 * log take the name only). Sent through the shared sender from here, not a new analytics.ts function, to keep the
 * entry bundle flat. Safe in an onClick: analytics never throws into the page.
 */
export function firePackEntryClick(from: PackEntrySource): void {
  try {
    sendAnalyticsHit("event", { name: "pack_entry_click", data: { from } });
  } catch {
    /* analytics must never break the page */
  }
}
