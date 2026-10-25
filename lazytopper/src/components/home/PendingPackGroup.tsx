import { useState } from "react";
import { Link } from "react-router-dom";
import type { PendingPlacement } from "../../analytics/analytics";
import { PENDING_SURFACE_LABEL, type PendingPaper } from "./pendingPapers";
import { trackPendingUploadTap } from "./usePendingPapers";
import { formatSavedDay } from "./pendingPapersUi";

/**
 * PACKS-UX-1 - the ONE grouped row for pack papers ("PK-..." codes) in the pending list, so a bundle buyer is not flooded.
 * LAZY (loaded by PendingPapersList only when two or more pack papers are waiting) so none of it is in the entry chunk;
 * it therefore carries its own copy of the single-paper row markup (same classes and test ids as PendingPapersList).
 */
const CSS = ".lt-pl-row--group{flex-wrap:wrap}.lt-pl-sub{flex:1 0 100%;list-style:none;margin:0;padding:0 0 0 10px;border-left:3px solid hsl(38,60%,82%)}";

export default function PendingPackGroup({ papers, placement, onNavigate }: { papers: PendingPaper[]; placement: PendingPlacement; onNavigate?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="lt-pl-row lt-pl-row--group" data-testid="pending-pack-group">
      <style>{CSS}</style>
      <span className="lt-pl-main">
        <span className="lt-pl-title" data-testid="pending-pack-group-label">
          {papers.length} pack papers waiting for your answers
        </span>
        <span className="lt-pl-meta">From your PDF packs</span>
      </span>
      <button type="button" className="lt-pstrip-more" data-testid="pending-pack-group-toggle" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {open ? "Hide" : "Show"}
      </button>
      {open ? (
        <ul className="lt-pl-sub">
          {papers.map((p) => {
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
      ) : null}
    </li>
  );
}
