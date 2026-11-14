/**
 * reviewFlags — tells the owner when CBSE publishes something the page has not caught up with
 * (CBSE-LIVE-1).
 *
 * The page derives most of its status from the manifest by itself. A few circulars need a
 * human to edit committed copy: the main date sheet (dates), the second-exam date sheet, the
 * admit cards and the results. For each such circular the daily job opens ONE issue —
 * "CBSE: <headline> — review /cbse/class-10" — through the same de-duplicating issue path as
 * every other issue (an issue already open under that title is not opened again).
 *
 * ★ A CIRCULAR IS "REFLECTED" WHEN ITS href IS IN `CBSE_2027_REVIEWED_CIRCULAR_HREFS`. That
 * list is committed with the page, so the issue stops the moment the page PR lands, and
 * merely closing the issue is not enough: `important` lasts 30 days, and a closed issue does
 * not block a new one (issues.ts), so an unreviewed href would reopen it every morning.
 *
 * ★ HEADLINES STAY RULE-TABLE-ONLY (C9). The issue title uses the circular's `headline`, which
 * the mirror only ever takes from HEADLINE_RULES; nothing is composed from the CBSE title
 * (the title appears only in the body, as a quoted link text).
 */
import type { Circular } from "./circulars";
import { HEADLINE_RULES } from "./circulars";
import type { IssueRequest } from "./issues";

/** The headlines that need a person to update the page. Each must be a rule-table string. */
export const REVIEW_HEADLINES: readonly string[] = Object.freeze([
  "The 2027 board exam date sheet is out",
  "The second board exam date sheet is out",
  "Board exam admit cards are out",
  "Board exam results are out",
]);

export const reviewIssueTitle = (headline: string): string =>
  `CBSE: ${headline} — review /cbse/class-10`;

export function reviewIssues(
  circulars: readonly Circular[],
  reviewedHrefs: ReadonlySet<string>,
  runUrl?: string,
): IssueRequest[] {
  const byHeadline = new Map<string, Circular[]>();
  for (const circular of circulars) {
    if (!circular.important) continue;
    if (!REVIEW_HEADLINES.includes(circular.headline)) continue;
    if (!HEADLINE_RULES.some((rule) => rule.headline === circular.headline)) continue;
    if (reviewedHrefs.has(circular.href)) continue;
    const group = byHeadline.get(circular.headline) ?? [];
    group.push(circular);
    byHeadline.set(circular.headline, group);
  }
  const footer = runUrl ? `\n\nRun: ${runUrl}` : "";
  return [...byHeadline].map(([headline, rows]) => ({
    title: reviewIssueTitle(headline),
    body:
      `CBSE published a circular the /cbse/class-10 page has not been checked against yet:\n\n` +
      rows.map((row) => `- ${row.date} — [${row.title}](${row.href})`).join("\n") +
      `\n\nWhat to do: read it, update \`lazytopper/src/pages/cbse2027Sources.ts\` if the page needs it, ` +
      `and add the circular's href to \`CBSE_2027_REVIEWED_CIRCULAR_HREFS\` in the same PR. ` +
      `Closing this issue alone is not enough while the circular is still recent: the job reopens it ` +
      `until the href is listed.${footer}`,
  }));
}
