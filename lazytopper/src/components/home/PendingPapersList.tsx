import { useState } from "react";
import { Link } from "react-router-dom";
import type { PendingPlacement } from "../../analytics/analytics";
import { PENDING_SURFACE_LABEL, type PendingPaper } from "./pendingPapers";
import { trackPendingUploadTap } from "./usePendingPapers";
import { formatSavedDay, PENDING_LIST_MAX_ROWS } from "./pendingPapersUi";

/**
 * HOME-PENDING-1 — the pending-papers list both the Home action strip (expanded) and the header
 * bell's popover show: one row per paper (code, title, surface, subject, saved day, "Upload
 * answers"), at most three, then "See all (N)" opens the rest in place. Styles: PENDING_CSS.
 */

export function PendingPapersList({
  papers,
  placement,
  onNavigate,
}: {
  papers: PendingPaper[];
  placement: PendingPlacement;
  /** Called after an "Upload answers" tap (the bell closes its popover). */
  onNavigate?: () => void;
}) {
  const [all, setAll] = useState(false);
  const count = papers.length;
  const visible = all ? papers : papers.slice(0, PENDING_LIST_MAX_ROWS);
  return (
    <div className="lt-pl" data-testid={`pending-list-${placement}`}>
      <ul className="lt-pl-list">
        {visible.map((p) => {
          const day = formatSavedDay(p.savedAt);
          return (
            <li key={`${p.surface}::${p.code}`} className="lt-pl-row" data-testid="pending-paper-row" data-surface={p.surface}>
              <span className="lt-pl-main">
                <span className="lt-pl-code" data-testid="pending-paper-code">{p.code}</span>
                <span className="lt-pl-title">{p.title}</span>
                <span className="lt-pl-meta">
                  {PENDING_SURFACE_LABEL[p.surface]} · {p.subject === "science" ? "Science" : "Maths"}
                  {day ? ` · Saved ${day}` : ""}
                </span>
              </span>
              <Link
                to={p.href}
                className="lt-pl-go"
                data-testid="pending-paper-upload"
                aria-label={`Upload answers for ${p.code}`}
                onClick={() => {
                  trackPendingUploadTap(p.surface, placement);
                  onNavigate?.();
                }}
              >
                Upload answers
              </Link>
            </li>
          );
        })}
      </ul>
      {count > PENDING_LIST_MAX_ROWS ? (
        <button
          type="button"
          className="lt-pl-all"
          data-testid="pending-papers-see-all"
          aria-expanded={all}
          onClick={() => setAll((v) => !v)}
        >
          {all ? "Show fewer" : `See all (${count})`}
        </button>
      ) : null}
    </div>
  );
}
