// src/components/fullmock/FullMockHistoryPanel.tsx
//
// "Your mocks" — the SUBJECT-SCOPED history in an OVERLAY PANEL (spec §4, the
// locked WORKSHEET pattern: volume decides the container — mocks accumulate
// across two subjects, so a header control opens a scrollable panel, not a
// rail). Inside: subject filter tabs, then the LOCKED Chapter-Test card shape
// (ScoreRing + four-type DotStrip + "Last completed" + the "⏳ Awaiting sheet"
// pending card PINNED FIRST with its real objective score). A tapped card
// re-opens its stored scorecard read-only; a pending card deep-links to its
// upload. The in-progress mock (if any) shows a "⏸ Resume · 1:42 left" card at
// the very top — an abandoned mock is never silently lost (§8a).
//
// Presentational: every number comes from the stored SessionRecords / the
// persisted session state — nothing is invented. Dim + blur backdrop; ✕ /
// dim-click / Escape close (fixed inset — anchored by the viewport, it cannot
// drift with scroll).

import { useEffect, useMemo, useState } from "react";
import type { SessionRecord, SessionSubject } from "../../services/sessionRecords";
import { ScoreRing, DotStrip } from "../chaptertest/ChapterTestHistoryRail";

type SubjectTab = SessionSubject | "all";

function pct(record: SessionRecord): number {
  return record.marksTotal > 0 ? Math.round((record.marksAwarded / record.marksTotal) * 100) : 0;
}

function relativeDate(ms: number): string {
  const diff = Date.now() - ms;
  const day = 24 * 60 * 60 * 1000;
  if (diff < day && new Date(ms).toDateString() === new Date().toDateString()) return "today";
  const days = Math.floor(diff / day);
  if (days <= 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "1 week ago";
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** Honest mock-to-mock delta vs the PREVIOUS completed mock of the same subject —
 *  only when both are graded out of the same total (a fair comparison); else null. */
function deltaVsPrevious(record: SessionRecord, ordered: SessionRecord[]): string | null {
  const later = ordered.filter(
    (r) => r.subject === record.subject && r.status === "graded" && r.gradedAt < record.gradedAt,
  );
  const prev = later[0];
  if (!prev || prev.marksTotal !== record.marksTotal || record.marksTotal <= 0) return null;
  const d = record.marksAwarded - prev.marksAwarded;
  if (d === 0) return null;
  const prevName = prev.title || prev.id;
  return `${d > 0 ? "▲" : "▼"} ${Math.abs(d)} vs ${prevName}`;
}

export interface FullMockResumeInfo {
  code: string;
  name: string;
  /** Pre-formatted remaining clock ("1:42:10") — the host computes it from the
   *  persisted wall-clock deadline. */
  remainingLabel: string;
}

export default function FullMockHistoryPanel({
  records,
  loading,
  defaultSubject,
  pendingOnly = false,
  inProgress,
  latestWeakLine,
  onResume,
  onOpen,
  onUpload,
  onClose,
}: {
  /** ALL full-mock records (both subjects), newest first. */
  records: SessionRecord[];
  loading: boolean;
  defaultSubject: SessionSubject;
  /** Open filtered to the awaiting-sheet rows (the banner's "See all N →"). */
  pendingOnly?: boolean;
  /** The in-progress mock on THIS device, if any (§8a resume path). */
  inProgress?: FullMockResumeInfo | null;
  /** Honest weakest-chapter line for the latest completed mock, derived by the
   *  host from its stored per-question payload; null → silent. */
  latestWeakLine?: string | null;
  onResume?: () => void;
  onOpen: (record: SessionRecord) => void;
  /** Deep-link a pending card to its upload (same-device; the host handles the
   *  honest cross-device case). */
  onUpload?: (record: SessionRecord) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<SubjectTab>(defaultSubject);
  const [showPendingOnly, setShowPendingOnly] = useState(pendingOnly);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const ordered = useMemo(
    () => records.slice().sort((a, b) => b.gradedAt - a.gradedAt),
    [records],
  );
  const counts = useMemo(
    () => ({
      maths: ordered.filter((r) => r.subject === "maths").length,
      science: ordered.filter((r) => r.subject === "science").length,
    }),
    [ordered],
  );

  const visible = useMemo(() => {
    let rows = tab === "all" ? ordered : ordered.filter((r) => r.subject === tab);
    if (showPendingOnly) rows = rows.filter((r) => r.status !== "graded");
    // Pending pinned first (spec §4), then newest first within each group.
    return [
      ...rows.filter((r) => r.status !== "graded"),
      ...rows.filter((r) => r.status === "graded"),
    ];
  }, [ordered, tab, showPendingOnly]);

  const latestCompletedId = useMemo(
    () => visible.find((r) => r.status === "graded")?.id ?? null,
    [visible],
  );

  const tabs: Array<{ key: SubjectTab; label: string }> = [
    { key: "maths", label: `Maths · ${counts.maths}` },
    { key: "science", label: `Science · ${counts.science}` },
    { key: "all", label: "All" },
  ];

  return (
    <div
      className="lt-fm__dim"
      role="dialog"
      aria-modal="true"
      aria-label="Your mocks"
      onClick={onClose}
    >
      <div className="lt-fm__panel" onClick={(e) => e.stopPropagation()}>
        <div className="lt-fm__panel-h">
          <div>
            <div className="lt-fm__panel-t">Your mocks</div>
            <div className="lt-fm__panel-sub">
              {ordered.length} saved · newest first
              {showPendingOnly ? " · showing awaiting-sheet only" : ""}
            </div>
          </div>
          <button type="button" className="lt-fm__panel-x" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="lt-fm__tabs" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              className={`lt-fm__tab${tab === t.key ? " lt-fm__tab--on" : ""}`}
              onClick={() => {
                setTab(t.key);
                setShowPendingOnly(false);
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="lt-fm__panel-b">
          {inProgress && onResume && (
            <button
              type="button"
              className="lt-ct__hcard lt-ct__hcard--latest"
              onClick={onResume}
            >
              <div className="lt-ct__lastlbl">In progress</div>
              <div className="lt-ct__hcard-top">
                <div>
                  <div className="lt-ct__hcard-name">⏸ Resume · {inProgress.remainingLabel} left</div>
                  <div className="lt-ct__hcard-code">
                    {inProgress.name} · {inProgress.code}
                  </div>
                </div>
              </div>
              <div className="lt-ct__vs">
                Your answers and timer are saved — reopen exactly where you left off.
              </div>
            </button>
          )}

          {loading ? (
            <div className="lt-ct__honest">
              <span>·</span>
              <span>Loading your mocks…</span>
            </div>
          ) : visible.length === 0 && !inProgress ? (
            <div className="lt-ct__honest">
              <span>·</span>
              <span>
                {showPendingOnly
                  ? "Nothing awaiting an answer sheet."
                  : "No full mocks yet — sit your first board-pattern mock and it will show here."}
              </span>
            </div>
          ) : (
            visible.map((r) => {
              const graded = r.status === "graded";
              const latest = graded && r.id === latestCompletedId;
              const delta = graded ? deltaVsPrevious(r, ordered) : null;
              const cls =
                "lt-ct__hcard" +
                (latest ? " lt-ct__hcard--latest" : "") +
                (!graded ? " lt-ct__hcard--pending" : "");
              return (
                <button
                  key={r.id}
                  type="button"
                  className={cls}
                  onClick={() => (!graded && onUpload ? onUpload(r) : onOpen(r))}
                >
                  {latest && <div className="lt-ct__lastlbl">Last completed</div>}
                  <div className="lt-ct__hcard-top">
                    <div>
                      <div className="lt-ct__hcard-name">{r.title}</div>
                      <div className="lt-ct__hcard-code">
                        {r.id} · {relativeDate(r.gradedAt)}
                      </div>
                    </div>
                    {graded ? (
                      <ScoreRing value={String(r.marksAwarded)} fillPct={pct(r)} />
                    ) : (
                      <span className="lt-ct__pending-pill">⏳ Awaiting sheet</span>
                    )}
                  </div>
                  {graded ? (
                    <>
                      <DotStrip record={r} />
                      {(latest && latestWeakLine) || delta ? (
                        <div className="lt-ct__vs">
                          {latest && latestWeakLine ? <>{latestWeakLine} </> : null}
                          {delta && <b>{delta}</b>}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <div className="lt-fm__objline">
                      Objective scored <b>{r.marksAwarded}/{r.marksTotal}</b> — upload to complete.
                    </div>
                  )}
                </button>
              );
            })
          )}

          <div className="lt-ct__honest">
            <span>·</span>
            <span>
              Scrolls to as many mocks as you sit. Filter by subject above. Cross-subject trends
              live on Me / Progress.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
