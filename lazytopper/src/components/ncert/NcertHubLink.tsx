/**
 * NcertHubLink — NCERT-HUB-1 (owner approval 6 Nov 2026): the one-line link from a page about a
 * subject or chapter (the Important Questions page) into the NCERT Hub.
 *
 *   a chapter in scope (`topic` names an NCERT chapter of this subject) → that chapter's hub card,
 *     in words that say what the card holds (`ncertHubLinkLabel`: "solutions" only where published);
 *   otherwise → the hub with the subject chosen.
 *
 * Styles: `NCERT_HUB_LINK_CSS`, scoped `.lt-nhl`, rendered as a <style> WITH the link (HPQ-CLS-1): the Important Questions
 * pages are prerendered, and a route-chunk stylesheet arrived after their first paint, so the line painted unstyled and
 * then moved (layout shift at 1280 px, found on #1612). The #1607 pattern. No inline style objects.
 */
import { Link } from "react-router-dom";

import {
  NCERT_CLASS10_CHAPTERS,
  ncertHubChapterPath,
  ncertHubLinkLabel,
  ncertHubSubjectOf,
  ncertHubSubjectPath,
  type NcertBook,
  type NcertBookChapter,
} from "../../config/ncertBooks";

export const NCERT_HUB_LINK_CSS = `
.lt-nhl {
  margin: 10px 0 0;
  font-size: 0.85rem;
  line-height: 1.45;
}
.lt-nhl a {
  display: inline-block;
  padding: 6px 0;
  color: hsl(152, 60%, 28%);
  font-weight: 700;
  text-decoration: none;
}
.lt-nhl a:hover {
  text-decoration: underline;
}
`;

/** The NCERT chapter a `?topic=` value names for this subject (its notes / topic slug), or null. */
export function ncertRowForTopic(subject: NcertBook, topic: string | null | undefined): NcertBookChapter | null {
  const t = String(topic ?? "").trim().toLowerCase();
  if (!t) return null;
  return NCERT_CLASS10_CHAPTERS.find((r) => r.book === subject && r.slug === t) ?? null;
}

export default function NcertHubLink({ subject, topic }: { subject: NcertBook; topic?: string | null }) {
  const row = ncertRowForTopic(subject, topic);
  return (
    <p className="lt-nhl" data-testid="ncert-hub-link">
      <style>{NCERT_HUB_LINK_CSS}</style>
      {row ? (
        <Link to={ncertHubChapterPath(row)}>{ncertHubLinkLabel(row)}</Link>
      ) : (
        <Link to={ncertHubSubjectPath(ncertHubSubjectOf(subject))}>
          NCERT Hub: {subject} books and solutions, chapter by chapter →
        </Link>
      )}
    </p>
  );
}
