/**
 * PracticeHubSegRow — NCERT-HUB-1 (owner approval 6 Nov 2026, 20:32 IST): the row at the top of
 * /practice-hub that names the three ways in — Practice (this page) · NCERT Hub · Important Qs —
 * with a one-line helper under it.
 *
 *   NCERT Hub     → /ncert-class-10
 *   Important Qs  → /highly-probable/10/<the subject picked on this page>
 *
 * ★ NO LAYOUT SHIFT. Rendered synchronously in the page body (no auth, no fetch, no lazy chunk), so
 * the prerendered page already holds it at its final size; the row has a fixed min-height and the
 * labels never wrap (one line at 360 px: "Important Qs" there, "Important Questions" from 768 px,
 * swapped by CSS so both widths render the same box).
 * ★ NO INP COST. Plain links; the only handler is a fire-and-forget vendor event.
 *
 * Styles: `practiceHubSegRow.css`, scoped `.lt-pseg`; no inline style objects.
 */
import { Link } from "react-router-dom";

import { sendAnalyticsHit } from "../../analytics/analytics";
import "./practiceHubSegRow.css";

export type PracticeSegTarget = "ncert_hub" | "important_qs";

/** Vendor-only event (the NAV-PRICING-1 pattern): the name plus one coarse slug. */
function trackSegTap(to: PracticeSegTarget): void {
  try {
    sendAnalyticsHit("event", { name: "practice_seg_tap", data: { to } }, { ga4: { to } });
  } catch {
    /* analytics must never break the page */
  }
}

export function importantQsPath(subject: "Maths" | "Science"): string {
  return `/highly-probable/10/${subject}`;
}

export default function PracticeHubSegRow({ subject }: { subject: "Maths" | "Science" }) {
  return (
    <nav className="lt-pseg" aria-label="Practice, NCERT Hub and Important Questions" data-testid="practice-seg-row">
      <div className="lt-pseg__row">
        <span className="lt-pseg__seg lt-pseg__seg--on" aria-current="page">
          Practice
        </span>
        <Link
          className="lt-pseg__seg"
          to="/ncert-class-10"
          onClick={() => trackSegTap("ncert_hub")}
          data-testid="practice-seg-ncert"
        >
          NCERT Hub
        </Link>
        <Link
          className="lt-pseg__seg"
          to={importantQsPath(subject)}
          onClick={() => trackSegTap("important_qs")}
          data-testid="practice-seg-important"
        >
          <span className="lt-pseg__short">Important Qs</span>
          <span className="lt-pseg__long">Important Questions</span>
        </Link>
      </div>
      <p className="lt-pseg__help">NCERT Hub: books, NCERT &amp; Exemplar solutions — Maths and Science</p>
    </nav>
  );
}
