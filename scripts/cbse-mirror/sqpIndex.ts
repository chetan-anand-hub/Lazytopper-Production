/**
 * sqpIndex — C7, the new-session probe.
 *
 * Every day the job asks for the Class X sample-paper index of the session whose
 * board exam is next. The URL is DERIVED FROM THE CLOCK, never hardcoded: CBSE's
 * academic session starts in April, so on 26 Sep 2026 the session is 2026-27 and the
 * probe is `SQP_CLASSX_2026-27.html`; from April 2027 it becomes `..._2027-28.html`.
 *
 * ★ MEASURED 2026-09-26: `SQP_CLASSX_2026-27.html` already returns 200 (the 2026-27
 * papers were published on 23 Sep), and `SQP_CLASSX_2027-28.html` returns 404 with a
 * 624-byte HTML body. The 2026-27 index is committed as a fixture.
 *
 * ★ MAPPING IS BY SUBJECT + TYPE TOKENS, EXACTLY. A filename stem `Science-SQP`
 * splits into subject `science` and type `sqp`, and maps to the paper whose own
 * committed filename has the SAME two tokens. That is why the index's neighbouring
 * links cannot be mis-ingested: `MathsStandardVIC-SQP` has subject token
 * `mathsstandardvic` (the four VIC variants were dead on the 2025-26 index), and
 * `Science-SQP_hi` has type token `sqp_hi` (the Hindi paper). Neither matches a paper.
 *
 * A Science or Maths link that maps to NO paper is REPORTED in an issue and never
 * ingested. Links for other subjects (English, Hindi, Social Science, …) are outside
 * this page's scope and are not reported — the page covers Science and Maths only.
 */
import { absoluteHref } from "./circulars";
import { subjectOfUrl } from "./guards";
import type { MirrorPaper } from "./papers";

export const SQP_INDEX_BASE = "https://cbseacademic.nic.in/";

/** The start year of the academic session `now` falls in (sessions start in April). */
export function currentSessionStartYear(now: Date): number {
  const year = now.getUTCFullYear();
  return now.getUTCMonth() >= 3 ? year : year - 1;
}

export function sessionLabel(startYear: number): string {
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
}

export function nextSessionIndexUrl(now: Date): { url: string; session: string } {
  const session = sessionLabel(currentSessionStartYear(now));
  return { url: `${SQP_INDEX_BASE}SQP_CLASSX_${session}.html`, session };
}

/** Every absolute PDF link on the index, de-duplicated, in page order. */
export function parseSqpIndexLinks(html: string, pageUrl: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const match of html.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["']/gi)) {
    const href = absoluteHref(match[1], pageUrl);
    if (!href || !/\.pdf$/i.test(new URL(href).pathname)) continue;
    if (seen.has(href)) continue;
    seen.add(href);
    out.push(href);
  }
  return out;
}

/** `Science-SQP.pdf` → { subject: "science", type: "sqp" }; null if not two-part. */
export function sqpTokens(url: string): { subject: string; type: string } | null {
  let name: string;
  try {
    name = decodeURIComponent(new URL(url).pathname.split("/").pop() ?? "");
  } catch {
    return null;
  }
  const stem = name.replace(/\.pdf$/i, "");
  const dash = stem.indexOf("-");
  if (dash <= 0 || dash === stem.length - 1) return null;
  return { subject: stem.slice(0, dash).toLowerCase(), type: stem.slice(dash + 1).toLowerCase() };
}

export type SqpMapping = {
  readonly mapped: readonly { readonly paperId: string; readonly url: string }[];
  readonly unmapped: readonly string[];
};

export function mapSqpLinks(
  links: readonly string[],
  papers: readonly Pick<MirrorPaper, "id" | "href" | "subject">[],
): SqpMapping {
  const mapped: { paperId: string; url: string }[] = [];
  const unmapped: string[] = [];
  for (const link of links) {
    const subject = subjectOfUrl(link);
    if (subject !== "science" && subject !== "maths") continue;
    const tokens = sqpTokens(link);
    const matches = tokens
      ? papers.filter((paper) => {
          const own = sqpTokens(paper.href);
          return (
            own !== null &&
            /\/SQP\//i.test(paper.href) &&
            own.subject === tokens.subject &&
            own.type === tokens.type
          );
        })
      : [];
    if (matches.length === 1) mapped.push({ paperId: matches[0].id, url: link });
    else unmapped.push(link);
  }
  return { mapped, unmapped };
}
