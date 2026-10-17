import { useEffect, useId, useState } from "react";
import { Link } from "react-router-dom";
import type { PendingPaper } from "./pendingPapers";
import { PendingPapersList } from "./PendingPapersList";
import { PENDING_CSS, papersWaitingLabel } from "./pendingPapersUi";
import { trackPendingShown, trackPendingUploadTap } from "./usePendingPapers";

/**
 * PendingPapersStrip — HOME-PENDING-1 (owner rulings 17 Oct 2026, rework after UX review): a
 * compact ACTION STRIP at the TOP of Home (desktop + mobile), above the Start-here heroes, so a
 * student with answers to upload sees it without scrolling on a 390 px phone.
 *
 * One row: icon · "N paper(s) waiting for your answers" · the newest paper's code and title ·
 * "Upload answers →" (the newest paper's deep link) · a disclosure that opens the full list
 * (max 3 + "See all (N)"). The page decides whether it shows (signed in AND ≥ 1 pending — the
 * same `usePendingPapers` read the header bell uses); it renders nothing for an empty list.
 * Display only — nothing here grades, scores or records.
 */
export default function PendingPapersStrip({ papers, spaced = false }: { papers: PendingPaper[]; spaced?: boolean }) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const count = papers.length;
  const newest = papers[0] ?? null;

  useEffect(() => {
    if (count > 0) trackPendingShown("strip", count);
  }, [count]);

  if (!newest) return null;

  return (
    <>
      <style>{PENDING_CSS}</style>
      <section
        className={spaced ? "lt-pstrip lt-pstrip--spaced" : "lt-pstrip"}
        data-testid="pending-strip"
        aria-label="Papers waiting for your answers"
      >
        <div className="lt-pstrip-row">
          <span className="lt-pstrip-ic" aria-hidden="true">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
              <path d="M12 18v-6M9 15l3-3 3 3" />
            </svg>
          </span>
          <span className="lt-pstrip-txt">
            <span className="lt-pstrip-h" data-testid="pending-strip-count">
              {papersWaitingLabel(count)}
            </span>
            <span className="lt-pstrip-sub" data-testid="pending-strip-newest">
              <span className="lt-pstrip-code">{newest.code}</span> · {newest.title}
            </span>
          </span>
          <span className="lt-pstrip-acts">
            <Link
              to={newest.href}
              className="lt-pstrip-go"
              data-testid="pending-strip-upload"
              aria-label={`Upload answers for ${newest.code}`}
              onClick={() => trackPendingUploadTap(newest.surface, "strip")}
            >
              Upload answers →
            </Link>
            <button
              type="button"
              className="lt-pstrip-more"
              data-testid="pending-strip-toggle"
              aria-expanded={open}
              aria-controls={listId}
              aria-label={open ? "Hide the papers waiting" : `Show all ${count} papers waiting`}
              onClick={() => setOpen((v) => !v)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
          </span>
        </div>
        <div id={listId} hidden={!open}>
          {open ? <PendingPapersList papers={papers} placement="strip" /> : null}
        </div>
      </section>
    </>
  );
}
