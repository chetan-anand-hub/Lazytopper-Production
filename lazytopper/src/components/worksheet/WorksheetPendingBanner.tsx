import type { SessionRecord } from "../../services/sessionRecords";

/**
 * WorksheetPendingBanner — Worksheet redesign FIX C: the slim, dismissible
 * "awaiting your answer sheet" prompt that rides UNDER the page header whenever
 * ≥1 worksheet session is still ungraded (status `pending-upload` / `partial`,
 * read from the durable sessionRecords via progressStore — never fabricated).
 *
 * Deterministic deep-link (spec §FIX C):
 *   • exactly 1 pending → name it ("{title} · {code}") and deep-link `Upload now →`
 *     to THAT worksheet's upload flow (the parent re-opens the existing record — no
 *     new session record is ever created).
 *   • ≥2 pending       → aggregate ("N worksheets …") and `See all N →` opens the
 *     history panel FILTERED to pending, where each row carries its own upload.
 * The banner (action prompt) and the panel's pending pill (status label) coexist
 * by design — no third nag.
 *
 * Blue-tinted, dismissible-per-session (✕). Class-driven scoped styling; no inline
 * style objects; mobile-first reflow.
 */

interface WorksheetPendingBannerProps {
  /** Ungraded worksheet records, newest-first (already filtered by the parent). */
  pending: SessionRecord[];
  /** Deep-link the single-pending case to that worksheet's upload flow. */
  onUpload: (record: SessionRecord) => void;
  /** Open the history panel filtered to pending (the ≥2 case). */
  onSeeAll: () => void;
  /** Dismiss for this session. */
  onDismiss: () => void;
}

export default function WorksheetPendingBanner({
  pending,
  onUpload,
  onSeeAll,
  onDismiss,
}: WorksheetPendingBannerProps) {
  if (pending.length === 0) return null;
  const one = pending.length === 1;
  const first = pending[0];

  return (
    <div className="lt-wpb" role="status">
      <style>{WPB_CSS}</style>
      <span className="lt-wpb__icon" aria-hidden="true">⏳</span>
      <div className="lt-wpb__tx">
        {one ? (
          <>
            <b className="lt-wpb__t">1 worksheet is awaiting your answer sheet</b>
            <span className="lt-wpb__d">
              {first.title} · {first.id} — upload your written work to get it graded.
            </span>
          </>
        ) : (
          <>
            <b className="lt-wpb__t">{pending.length} worksheets are awaiting your answer sheet</b>
            <span className="lt-wpb__d">Upload each written sheet to get it graded.</span>
          </>
        )}
      </div>
      {one ? (
        <button type="button" className="lt-wpb__go" onClick={() => onUpload(first)}>
          Upload now →
        </button>
      ) : (
        <button type="button" className="lt-wpb__go" onClick={onSeeAll}>
          See all {pending.length} →
        </button>
      )}
      <button type="button" className="lt-wpb__x" onClick={onDismiss} aria-label="Dismiss this reminder">
        ✕
      </button>
    </div>
  );
}

const WPB_CSS = `
.lt-wpb {
  --wpb-blue: hsl(222, 64%, 53%);
  --wpb-blue-t: hsl(222, 70%, 96%);
  --wpb-blue-b: hsla(222, 64%, 53%, 0.28);
  --wpb-fg: hsl(220, 25%, 12%);
  --wpb-muted: hsl(220, 15%, 42%);
  --wpb-fb: "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  display: flex; align-items: center; gap: 12px;
  background: var(--wpb-blue-t); border: 1px solid var(--wpb-blue-b);
  border-radius: 14px; padding: 12px 15px; margin-bottom: 16px;
  font-family: var(--wpb-fb); color: var(--wpb-fg);
}
.lt-wpb__icon { font-size: 17px; flex-shrink: 0; line-height: 1; }
.lt-wpb__tx { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.lt-wpb__t { font-size: 13.5px; font-weight: 700; }
.lt-wpb__d { font-size: 12px; color: var(--wpb-muted); overflow: hidden; text-overflow: ellipsis; }
.lt-wpb__go {
  flex-shrink: 0; background: var(--wpb-blue); color: #fff; border: none;
  border-radius: 10px; padding: 9px 15px; font-size: 12.5px; font-weight: 700;
  cursor: pointer; font-family: var(--wpb-fb); white-space: nowrap;
}
.lt-wpb__go:hover { background: hsl(222, 64%, 46%); }
.lt-wpb__x {
  flex-shrink: 0; background: none; border: none; color: hsl(220, 12%, 58%);
  font-size: 15px; cursor: pointer; padding: 2px 4px; line-height: 1;
}
.lt-wpb__x:hover { color: var(--wpb-fg); }

@media (max-width: 640px) {
  .lt-wpb { flex-wrap: wrap; }
  .lt-wpb__tx { flex-basis: 100%; order: 1; }
  .lt-wpb__icon { order: 0; }
  .lt-wpb__go { order: 2; margin-left: auto; }
  .lt-wpb__x { order: 3; }
}
`;
