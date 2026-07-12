// src/components/fullmock/FullMockPendingBanner.tsx
//
// The Full Mock PENDING BANNER (spec §4 — the locked worksheet pattern):
// a slim, dismissible-per-session action prompt under the page header whenever
// ≥1 mock is still awaiting its answer sheet (status ≠ graded, read from the
// durable sessionRecords — never fabricated).
//
//   • exactly 1 pending → names it and deep-links "Upload now →" to THAT mock's
//     upload, attaching to the EXISTING record (idempotency anchor — a deferred
//     upload updates, never duplicates);
//   • ≥ 2 pending      → aggregates and opens the panel FILTERED to pending;
//   • 0 pending        → renders nothing.
// Banner = action prompt (dismissible). Panel pill = status label. No third nag.

import type { SessionRecord } from "../../services/sessionRecords";

export default function FullMockPendingBanner({
  pending,
  onUpload,
  onSeeAll,
  onDismiss,
}: {
  /** Ungraded full-mock records, newest-first (already filtered by the parent). */
  pending: SessionRecord[];
  /** Deep-link the single-pending case to that mock's upload. */
  onUpload: (record: SessionRecord) => void;
  /** Open the history panel filtered to pending (the ≥2 case). */
  onSeeAll: () => void;
  /** Dismiss for this session. */
  onDismiss: () => void;
}) {
  if (pending.length === 0) return null;
  const one = pending.length === 1;
  const first = pending[0];

  return (
    <div className="lt-fm__banner" role="status">
      <span>
        {one ? (
          <>
            <b>{first.title}</b> ({first.id}) is awaiting your answer sheet — objective scored{" "}
            <b>
              {first.marksAwarded}/{first.marksTotal}
            </b>
            .
          </>
        ) : (
          <>
            <b>{pending.length} mocks</b> are awaiting your answer sheets.
          </>
        )}
      </span>
      {one ? (
        <button type="button" className="lt-fm__banner-act" onClick={() => onUpload(first)}>
          Upload now →
        </button>
      ) : (
        <button type="button" className="lt-fm__banner-act" onClick={onSeeAll}>
          See all {pending.length} →
        </button>
      )}
      <button type="button" className="lt-fm__banner-x" onClick={onDismiss} aria-label="Dismiss">
        ✕
      </button>
    </div>
  );
}
