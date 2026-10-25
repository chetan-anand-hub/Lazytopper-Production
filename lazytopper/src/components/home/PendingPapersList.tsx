import { useState } from "react";
import { Link } from "react-router-dom";
import type { PendingPlacement } from "../../analytics/analytics";
import { groupPendingRows, PENDING_SURFACE_LABEL, type PendingPaper } from "./pendingPapers";
import { trackPendingUploadTap } from "./usePendingPapers";
import { formatSavedDay, packPapersWaitingLabel, PENDING_LIST_MAX_ROWS } from "./pendingPapersUi";

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
  const [packsOpen, setPacksOpen] = useState(false);
  const rows = groupPendingRows(papers);
  const count = rows.length;
  const visible = all ? rows : rows.slice(0, PENDING_LIST_MAX_ROWS);
  const renderPaper = (p: PendingPaper) => {
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
  };
  return (
    <div className="lt-pl" data-testid={`pending-list-${placement}`}>
      <ul className="lt-pl-list">
        {visible.map((r) =>
          r.kind === "paper" ? (
            renderPaper(r.paper)
          ) : (
            <li key="pack-group" className="lt-pl-row lt-pl-row--group" data-testid="pending-pack-group">
              <div className="lt-pl-pack">
                <span className="lt-pl-main">
                  <span className="lt-pl-title" data-testid="pending-pack-group-label">{packPapersWaitingLabel(r.papers.length)}</span>
                  <span className="lt-pl-meta">From your PDF packs</span>
                </span>
                <button
                  type="button"
                  className="lt-pl-pack-toggle"
                  data-testid="pending-pack-group-toggle"
                  aria-expanded={packsOpen}
                  onClick={() => setPacksOpen((v) => !v)}
                >
                  {packsOpen ? "Hide" : "Show"}
                </button>
              </div>
              {packsOpen ? <ul className="lt-pl-sub">{r.papers.map(renderPaper)}</ul> : null}
            </li>
          ),
        )}
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
