/**
 * LIVE-FIX-1 #5 (owner ruling 23 Nov 2026, 23:05 IST) - the result card's line on a Chapter Test / Full Mock whose questions were
 * not found on the uploaded pages: "Q12, Q15: Not attempted · 0 — not found on the pages you uploaded. If you answered these,
 * add the page." with the page's existing upload step. Renders nothing when no question was counted that way.
 */
import type { WorksheetGradeResponse } from "../../ai/aiClient";
import { NOT_FOUND_ADD_PAGE_ACTION, notFoundAddPageLine, notFoundNotAttemptedQNumbers } from "../../lib/notFoundNotAttempted";

export default function NotFoundAddPageLine({ response, onAddPage }: { response: WorksheetGradeResponse | null | undefined; onAddPage?: () => void }) {
  const qs = notFoundNotAttemptedQNumbers(response?.results);
  if (qs.length === 0) return null;
  return (
    <p className="lt-ct__nfna" data-testid="ct-not-found-not-attempted">
      <b>{qs.map((n) => `Q${n}`).join(", ")}: Not attempted · 0</b> — not found on the pages you uploaded. {notFoundAddPageLine(qs.length)}.
      {onAddPage && (
        <button type="button" className="lt-ct__nfna-btn" data-testid="ct-add-page" onClick={onAddPage}>
          {NOT_FOUND_ADD_PAGE_ACTION}
        </button>
      )}
    </p>
  );
}
