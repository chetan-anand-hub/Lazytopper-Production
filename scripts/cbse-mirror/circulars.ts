/**
 * circulars — C8 (parse both CBSE circular indexes) and C9 (the fixed rule table).
 *
 * ★ NO HTML LIBRARY, ON PURPOSE: adding one moves the lockfile #810 holds. Both pages
 * are table-of-rows markup, parsed here row by row. The row shapes were read off the
 * two pages on 2026-09-26 and the pages themselves are committed as fixtures under
 * `fixtures/`, so the parser is tested against what CBSE really serves, with no
 * network in any test.
 *
 *   cbse.gov.in  — `<tr>` = DATE (DD/MM/YYYY) · CIRCULAR (title) · ENGLISH (link) ·
 *                  HINDI (link) · FILE TYPE · FILE SIZE. Five tables, one per year.
 *   cbseacademic — `<tr>` = number (`Acad-63/2026`, or `132` in the notifications
 *                  table) · MONTH ONLY · subject (link). No day is published, so the
 *                  row's date is `YYYY-MM` — never an invented day.
 *
 * ★ HEADLINES COME FROM THE TABLE BELOW AND NOWHERE ELSE (C9). There is no code path
 * that composes a headline from a circular's title. A row that matches no rule, or
 * matches one but is older than 30 days, ships `important: false` and `headline: ""`.
 */
import { createHash } from "node:crypto";

export const GOV_INDEX_URL = "https://www.cbse.gov.in/cbsenew/examination_Circular.html";
export const ACADEMIC_INDEX_URL = "https://cbseacademic.nic.in/circulars.html";

/**
 * CA-5 — CBSE Academic's NOTIFICATIONS index. Measured 2026-09-26: there is no separate
 * notifications page (`notifications.html` and `notification.html` both 404 with a
 * 624-byte body); the stable index is the SECOND table of `circulars.html`
 * (`<div id="notification">`, heading "Notifications- 2026"), which lists
 * `web_material/Notifications/2026/…` — including `132_Notification_2026.pdf`, the
 * 2026-27 sample-paper release. It is fetched with the circulars page (one request)
 * and its rows are recorded as their own origin.
 */
export const ACADEMIC_NOTIFICATIONS_URL = ACADEMIC_INDEX_URL;

/** Where a row came from. Order is precedence: on a duplicate href the FIRST wins. */
export const CIRCULAR_ORIGINS = ["cbse-gov", "academic-circulars", "academic-notifications"] as const;
export type CircularOrigin = (typeof CIRCULAR_ORIGINS)[number];

export const FEED_SIZE = 30;
/**
 * CA-5 — the 30-row cap must not starve a source. Each origin's newest rows, up to
 * this many, are reserved a place; the rest of the 30 goes to the newest rows overall.
 */
export const MIN_ROWS_PER_ORIGIN = 5;
export const IMPORTANT_WITHIN_DAYS = 30;

export type ParsedCircular = {
  /** `YYYY-MM-DD`, or `YYYY-MM` where the source publishes only a month. */
  readonly date: string;
  readonly title: string;
  readonly href: string;
  readonly source: "document" | "index";
  /** CA-5 — which index the row was read from. */
  readonly origin: CircularOrigin;
};

export type Circular = ParsedCircular & {
  readonly id: string;
  readonly important: boolean;
  readonly headline: string;
};

/** C9 — the fixed rule table. Case-insensitive; the FIRST matching rule wins. */
export const HEADLINE_RULES: readonly { readonly pattern: RegExp; readonly headline: string }[] =
  Object.freeze([
    Object.freeze({ pattern: /date ?sheet/i, headline: "The 2027 board exam date sheet is out" }),
    Object.freeze({
      pattern: /sample (question )?papers?|\bSQP\b/i,
      headline: "New CBSE sample papers are out",
    }),
    Object.freeze({
      pattern: /two (board )?exam|second board exam|board exams? twice/i,
      headline: "CBSE has updated the two-exam rules",
    }),
    Object.freeze({ pattern: /syllabus|curriculum/i, headline: "CBSE has updated the syllabus" }),
  ]);

/** The headline a title earns from the table, or null. Never anything else. */
export function ruleHeadline(title: string): string | null {
  for (const rule of HEADLINE_RULES) {
    if (rule.pattern.test(title)) return rule.headline;
  }
  return null;
}

// ─── HTML helpers ────────────────────────────────────────────────────────────

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  ndash: "–",
  mdash: "—",
  hellip: "…",
};

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, body: string) => {
    if (body[0] === "#") {
      const code =
        body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : whole;
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? whole;
  });
}

/**
 * The TEXT of a fragment of CBSE's markup — a title, a date, a month.
 *
 * ⚠ A MULTI-CHARACTER STRIP IS NOT A SANITISER, AND CodeQL SAID SO TWICE ON THIS LANE
 * ("incomplete multi-character sanitization"): deleting `<!-- … -->` can splice the
 * leftovers into a NEW `<!--`, and a strip-until-stable loop did not satisfy it either.
 * So: comments are cut by index with a SPACE left in their place (a space cannot splice
 * into `<!--`), tags are blanked, and then EVERY `<` and `>` is removed outright —
 * before and after entity decoding, so `&lt;` cannot bring one back. The result is plain
 * text with no angle brackets at all; React escapes it again when the page renders it,
 * but this function does not rely on that.
 */
function withoutComments(html: string): string {
  let out = "";
  let at = 0;
  for (;;) {
    const open = html.indexOf("<!--", at);
    if (open < 0) return out + html.slice(at);
    out += `${html.slice(at, open)} `;
    const close = html.indexOf("-->", open + 4);
    if (close < 0) return out; // an unterminated comment runs to the end
    at = close + 3;
  }
}

export function textOf(html: string): string {
  const stripped = withoutComments(html).replace(/<[^>]*>/g, " ").replace(/[<>]/g, " ");
  return decodeEntities(stripped)
    .replace(/[<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function englishSpan(html: string): string | null {
  const match = html.match(/<span[^>]*class\s*=\s*["']?english["']?[^>]*>([\s\S]*?)<\/span>/i);
  return match ? match[1] : null;
}

function firstHref(html: string): string | null {
  const match = html.match(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["']/i);
  return match ? decodeEntities(match[1].trim()) : null;
}

/** An absolute http(s) URL, or null. `javascript:` and friends never survive. */
export function absoluteHref(href: string | null, base: string): string | null {
  if (!href) return null;
  try {
    const url = new URL(href, base);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

type Row = { readonly at: number; readonly cells: readonly string[] };

/** Comments replaced by the same number of spaces, so every index still lines up with
 *  the raw page (the academic parser matches row positions against heading positions). */
function blankComments(html: string): string {
  let out = "";
  let at = 0;
  for (;;) {
    const open = html.indexOf("<!--", at);
    if (open < 0) return out + html.slice(at);
    const close = html.indexOf("-->", open + 4);
    const end = close < 0 ? html.length : close + 3;
    out += html.slice(at, open) + " ".repeat(end - open);
    at = end;
  }
}

/**
 * Every LEAF table row: a row's content runs to the next `<tr` or `</tr>`, whichever
 * comes first, so an outer layout row that merely CONTAINS a nested table yields no
 * cells of its own rather than one giant bogus row.
 */
function rowsOf(html: string): Row[] {
  const clean = blankComments(html);
  const rows: Row[] = [];
  const opener = /<tr\b[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = opener.exec(clean)) !== null) {
    const start = match.index + match[0].length;
    const rest = clean.slice(start);
    const stop = rest.search(/<tr\b|<\/tr>/i);
    const block = stop < 0 ? rest : rest.slice(0, stop);
    const cells = Array.from(block.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi), (m) => m[1]);
    if (cells.length > 0) rows.push({ at: match.index, cells });
  }
  return rows;
}

// ─── cbse.gov.in ─────────────────────────────────────────────────────────────

export function parseGovCirculars(html: string, pageUrl: string = GOV_INDEX_URL): ParsedCircular[] {
  const out: ParsedCircular[] = [];
  for (const { cells } of rowsOf(html)) {
    if (cells.length < 3) continue;
    const dateMatch = textOf(cells[0]).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!dateMatch) continue;
    const [, dd, mm, yyyy] = dateMatch;
    if (Number(mm) < 1 || Number(mm) > 12 || Number(dd) < 1 || Number(dd) > 31) continue;
    // The title cell sometimes carries extra inline links after " | " (a user
    // manual, an "apply here" link). The circular's own title is the part before.
    const title = textOf(cells[1]).split(" | ")[0].trim();
    if (!title) continue;
    const href =
      absoluteHref(firstHref(cells[2]), pageUrl) ??
      absoluteHref(firstHref(cells[3] ?? ""), pageUrl) ??
      absoluteHref(firstHref(cells[1]), pageUrl);
    out.push({
      date: `${yyyy}-${mm}-${dd}`,
      title,
      href: href ?? pageUrl,
      source: href ? "document" : "index",
      origin: "cbse-gov",
    });
  }
  return out;
}

// ─── cbseacademic.nic.in ─────────────────────────────────────────────────────

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

function monthIndex(text: string): number | null {
  const word = text.trim().toLowerCase().match(/^[a-z]+/);
  if (!word) return null;
  const index = MONTHS.indexOf(word[0]);
  return index < 0 ? null : index + 1;
}

export function parseAcademicCirculars(
  html: string,
  pageUrl: string = ACADEMIC_INDEX_URL,
): ParsedCircular[] {
  // The notifications table states its year only in its heading ("Notifications- 2026"),
  // so each row takes the year of the nearest heading above it unless its own number
  // carries one (`Acad-63/2026`).
  const headings = Array.from(html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi), (m) => ({
    at: m.index ?? 0,
    year: textOf(m[1]).match(/(20\d\d)\s*$/)?.[1] ?? null,
    // CA-5: a row under the "Notifications" heading is a notification, not a circular.
    notifications: /notification/i.test(textOf(m[1])),
  }));

  const out: ParsedCircular[] = [];
  for (const { at, cells } of rowsOf(html)) {
    if (cells.length < 3) continue;
    const monthCell = englishSpan(cells[1]) ?? cells[1];
    const month = monthIndex(textOf(monthCell));
    if (month === null) continue;

    const ownYear = textOf(cells[0]).match(/\/(20\d\d)\b/)?.[1] ?? null;
    let headingYear: string | null = null;
    let underNotifications = false;
    for (const heading of headings) {
      if (heading.at < at) underNotifications = heading.notifications;
      if (heading.at < at && heading.year) headingYear = heading.year;
    }
    const year = ownYear ?? headingYear;
    if (!year) continue;

    const subject = englishSpan(cells[2]) ?? cells[2];
    const title = textOf(subject);
    if (!title) continue;
    const href = absoluteHref(firstHref(subject) ?? firstHref(cells[2]), pageUrl);
    out.push({
      date: `${year}-${String(month).padStart(2, "0")}`,
      title,
      href: href ?? pageUrl,
      source: href ? "document" : "index",
      origin: underNotifications ? "academic-notifications" : "academic-circulars",
    });
  }
  return out;
}

// ─── C8 filtering, ordering and C9 classification ────────────────────────────

/**
 * C8 — drop a row whose title names Class XII/12 and NOT Class X/10. "Class X/XII",
 * "Classes X & XII" and a range such as "Classes IX-XII" all name Class X and stay.
 * Roman numerals are matched case-sensitively: a lowercase "x" is not Class X.
 */
export function isClassXIIOnly(title: string): boolean {
  const names12 = /\bXII\b/.test(title) || /\bclass(es)?\s*[-:]?\s*12(th)?\b|\b12th\b/i.test(title);
  if (!names12) return false;
  const names10 =
    /\bX\b/.test(title) ||
    /\bclass(es)?\s*[-:]?\s*10(th)?\b|\b10th\b/i.test(title) ||
    /\b(IX|9)\s*(-|–|to)\s*(XII|12)\b/i.test(title);
  return !names10;
}

/** Sortable key: a month-only date sorts below every dated row of the same month. */
function sortKey(date: string): string {
  return date.length === 7 ? `${date}-00` : date;
}

function dateMs(date: string): number | null {
  const match = date.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/);
  if (!match) return null;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, match[3] ? Number(match[3]) : 1);
}

/**
 * Whether a row is dated within the last `days` days of `now`. A month-only row is
 * dated the FIRST of its month — the conservative reading, which can only make a
 * row stop being important sooner, never later. A row dated in the future (beyond a
 * day of clock skew) is not "recent", it is wrong, and is not flagged.
 */
export function isWithinDays(date: string, now: Date, days: number): boolean {
  const at = dateMs(date);
  if (at === null) return false;
  const age = now.getTime() - at;
  return age >= -86_400_000 && age <= days * 86_400_000;
}

export function classifyCircular(
  row: Pick<ParsedCircular, "title" | "date">,
  now: Date,
): { important: boolean; headline: string } {
  const headline = ruleHeadline(row.title);
  if (headline && isWithinDays(row.date, now, IMPORTANT_WITHIN_DAYS)) {
    return { important: true, headline };
  }
  return { important: false, headline: "" };
}

export function circularId(href: string): string {
  return createHash("sha256").update(href).digest("hex").slice(0, 16);
}

function dedupeKey(row: ParsedCircular): string {
  return row.source === "index" ? `${row.href}#${row.date}#${row.title}` : row.href;
}

/**
 * Every source's rows after the Class-XII filter and de-duplication — the set the feed
 * is cut from, and the set the CA-5 per-source count guard measures. On a duplicate
 * absolute href the row from the EARLIER origin in `CIRCULAR_ORIGINS` wins (cbse.gov.in
 * over the academic circulars over the academic notifications), whatever order the
 * rows arrived in.
 */
export function filteredCirculars(rows: readonly ParsedCircular[]): ParsedCircular[] {
  const byPrecedence = rows
    .map((row, index) => ({ row, index }))
    .sort(
      (a, b) =>
        CIRCULAR_ORIGINS.indexOf(a.row.origin) - CIRCULAR_ORIGINS.indexOf(b.row.origin) ||
        a.index - b.index,
    )
    .map(({ row }) => row);
  const seen = new Set<string>();
  const kept: ParsedCircular[] = [];
  for (const row of byPrecedence) {
    if (isClassXIIOnly(row.title)) continue;
    const key = dedupeKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(row);
  }
  return kept;
}

export function countByOrigin(rows: readonly ParsedCircular[]): Record<CircularOrigin, number> {
  const counts: Record<CircularOrigin, number> = {
    "cbse-gov": 0,
    "academic-circulars": 0,
    "academic-notifications": 0,
  };
  for (const row of rows) counts[row.origin] += 1;
  return counts;
}

/**
 * All sources → one feed: Class-XII-only rows dropped, de-duplicated by href (earlier
 * origin wins), newest first (stable), capped at 30, classified.
 *
 * CA-5 — THE CAP RESERVES A SHARE PER SOURCE. Each origin's newest
 * `MIN_ROWS_PER_ORIGIN` rows are always in the 30; the remaining places go to the
 * newest rows overall. Without it, CBSE Academic's many month-only rows can push every
 * cbse.gov.in row out of a busy month — silently.
 */
export function buildCircularFeed(rows: readonly ParsedCircular[], now: Date): Circular[] {
  const kept = filteredCirculars(rows)
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const ka = sortKey(a.row.date);
      const kb = sortKey(b.row.date);
      if (ka !== kb) return ka < kb ? 1 : -1;
      return a.index - b.index;
    });
  const chosen = new Set<number>();
  for (const origin of CIRCULAR_ORIGINS) {
    kept
      .filter(({ row }) => row.origin === origin)
      .slice(0, MIN_ROWS_PER_ORIGIN)
      .forEach(({ index }) => chosen.add(index));
  }
  for (const { index } of kept) {
    if (chosen.size >= FEED_SIZE) break;
    chosen.add(index);
  }
  const ordered = kept.filter(({ index }) => chosen.has(index)).map(({ row }) => row);
  return ordered.map((row) => ({
    id: circularId(dedupeKey(row)),
    ...row,
    ...classifyCircular(row, now),
  }));
}

/** Re-apply C9 to rows kept from a previous run, so `important` still expires. */
export function reclassify(rows: readonly Circular[], now: Date): Circular[] {
  return rows.map((row) => ({ ...row, ...classifyCircular(row, now) }));
}

/**
 * CA-5 — the C8 count guard, applied PER SOURCE, so a healthy source cannot mask the
 * collapse of another. Each origin must parse at least one row, and — when the previous
 * manifest recorded per-source counts — at least 50% of its previous count. Counts are
 * of `filteredCirculars` (before the 30-row cap), which keeps them comparable run to
 * run. Any failure keeps the previous feed and opens an issue.
 */
export function sourceGuard(
  counts: Record<CircularOrigin, number>,
  previous: Partial<Record<CircularOrigin, number>> | null,
): { ok: true } | { ok: false; reason: string } {
  const problems: string[] = [];
  for (const origin of CIRCULAR_ORIGINS) {
    const current = counts[origin];
    const before = previous?.[origin] ?? 0;
    if (current === 0) problems.push(`${origin} parsed to 0 rows`);
    else if (before > 0 && current < before * 0.5) {
      problems.push(`${origin} has ${current} rows, fewer than 50% of the previous ${before}`);
    }
  }
  return problems.length === 0 ? { ok: true } : { ok: false, reason: problems.join("; ") };
}

/**
 * C8 guard — a feed with no rows, or with fewer than half the previous count, is a
 * parse failure until proven otherwise (CBSE redesigned the page, or served an error
 * page with a 200). The previous feed is kept and an issue opened.
 */
export function feedGuard(
  newCount: number,
  previousCount: number,
): { ok: true } | { ok: false; reason: string } {
  if (newCount === 0) return { ok: false, reason: "the new feed parsed to 0 rows" };
  if (previousCount > 0 && newCount < previousCount * 0.5) {
    return {
      ok: false,
      reason: `the new feed has ${newCount} rows, fewer than 50% of the previous ${previousCount}`,
    };
  }
  return { ok: true };
}
