/**
 * LIVE-FIX-1 #5 (owner ruling 23 Nov 2026, 23:05 IST) - the result card's line on a Chapter Test / Full Mock whose questions were
 * not found on the uploaded pages: "Q12, Q15: Not attempted · 0 — not found on the pages you uploaded. If you answered these,
 * upload all your pages again, including the missing one." (or "…not marked yet." when the check was not counted - REVIEW S3)
 * with the page's upload step. Renders nothing when no answer was missing from the pages.
 */
import type { WorksheetGradeResponse } from "../../ai/aiClient";
import { NOT_FOUND_ADD_PAGE_ACTION, notFoundAddPageLine, notFoundLead, notFoundSummary } from "../../lib/notFoundNotAttempted";

export default function NotFoundAddPageLine({ response, onAddPage }: { response: WorksheetGradeResponse | null | undefined; onAddPage?: () => void }) {
  const sum = notFoundSummary(response?.results);
  if (!sum) return null;
  return (
    <p className="lt-ct__nfna" data-testid="ct-not-found-not-attempted" data-mode={sum.mode}>
      <b>{notFoundLead(sum.mode, sum.qNumbers)}</b> {notFoundAddPageLine(sum.qNumbers.length)}.
      {onAddPage && (
        <button type="button" className="lt-ct__nfna-btn" data-testid="ct-add-page" onClick={onAddPage}>
          {NOT_FOUND_ADD_PAGE_ACTION}
        </button>
      )}
    </p>
  );
}
