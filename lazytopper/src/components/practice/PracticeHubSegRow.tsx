/**
 * PracticeHubSegRow — NCERT-HUB-1 (owner approval 6 Nov 2026, 20:32 IST): the row at the top of
 * /practice-hub that names the three ways in — Practice (this page) · NCERT Hub · Important Qs —
 * with a one-line helper under it.
 *
 *   NCERT Hub     → /ncert-class-10
 *   Important Qs  → /highly-probable/10/<the subject picked on this page>
 *
 * ★ NO LAYOUT SHIFT. Rendered synchronously in the page body (no auth, no fetch), AND its rules ship
 * as a `<style>` element rendered WITH the row (`SEG_CSS`), the practice page's own first-paint
 * pattern (its `.lt-entry-pair` rules are a `<style>` too). A route-chunk stylesheet arrives after
 * the prerendered HTML paints, so the row first painted unstyled at ~40 px and grew to ~78 px
 * (CLS 0.019 on the paid `/practice-hub?cbq=1` landing, review of #1607). Here the rules are in the
 * prerendered HTML itself, so the first paint is the final box: fixed min-height, labels that never
 * wrap ("Important Qs" at 360 px, "Important Questions" from 768 px, swapped by CSS).
 * ★ NO INP COST. Plain links; the only handler is a fire-and-forget vendor event.
 *
 * Styles: `SEG_CSS` below, scoped `.lt-pseg`; no inline style objects.
 */
import { Link } from "react-router-dom";

import { sendAnalyticsHit } from "../../analytics/analytics";

/** The row's rules, rendered as a `<style>` with the row so the prerendered first paint is final. */
export const SEG_CSS = `
.lt-pseg {
  margin: 0;
  font-family: Inter, system-ui, -apple-system, sans-serif;
}
.lt-pseg__row {
  display: flex;
  gap: 6px;
  min-height: 52px;
  padding: 5px;
  border-radius: 14px;
  background: #eef2f7;
  box-sizing: border-box;
}
.lt-pseg__seg {
  flex: 1 1 0;
  min-width: 0;
  min-height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  border-radius: 10px;
  color: #13294b;
  font-size: 13.5px;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
  text-decoration: none;
  box-sizing: border-box;
}
a.lt-pseg__seg:hover {
  background: rgba(19, 41, 75, 0.06);
}
a.lt-pseg__seg:focus-visible {
  outline: 2px solid #0b8f50;
  outline-offset: 2px;
}
.lt-pseg__seg--on {
  background: #13294b;
  color: #fff;
}
.lt-pseg__long {
  display: none;
}
.lt-pseg__help {
  margin: 8px 0 0;
  font-size: 12.5px;
  line-height: 1.4;
  color: #64748b;
}
@media (min-width: 768px) {
  .lt-pseg__row {
    max-width: 560px;
  }
  .lt-pseg__seg {
    font-size: 15px;
    padding: 0 10px;
  }
  .lt-pseg__short {
    display: none;
  }
  .lt-pseg__long {
    display: inline;
  }
}
`;

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
      <style>{SEG_CSS}</style>
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
      <p className="lt-pseg__help">NCERT Hub: books, NCERT &amp; Exemplar solutions</p>
    </nav>
  );
}
