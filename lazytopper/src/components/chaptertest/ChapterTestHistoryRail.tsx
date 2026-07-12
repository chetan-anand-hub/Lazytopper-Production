// src/components/chaptertest/ChapterTestHistoryRail.tsx
//
// The TOPIC-SCOPED history rail (spec §2): CARDS (not an accordion — history is
// motivation-to-start, keep it visible) for THIS topic's chapter tests only. Each
// card carries the test name + code + date, a score ring, and a four-type dot-strip;
// the most recent is emphasised with a weak-spot line. A not-yet-completed test shows
// the "⏳ Awaiting sheet" pending card instead of a score. Tapping a card re-opens its
// stored scorecard read-only. Honest empty state before the first test. All numbers
// come from the stored SessionRecord — nothing is invented.

import type { SessionRecord } from "../../services/sessionRecords";

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

/** The dominant knowledge gap (conceptual/calculation only — careless is never a
 *  weakness, MI doctrine). Returns null when there is no knowledge-gap signal. */
function weakSpot(record: SessionRecord): string | null {
  const { conceptual, calculation } = record.fourType;
  if (conceptual <= 0 && calculation <= 0) return null;
  return conceptual >= calculation ? "conceptual" : "calculation";
}

function ScoreRing({ value, fillPct }: { value: string; fillPct: number }) {
  const r = 15.5;
  const circumference = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(100, fillPct)) / 100) * circumference;
  return (
    <svg className="lt-ct__ring-svg" viewBox="0 0 40 40" width="44" height="44" aria-hidden="true">
      <circle cx="20" cy="20" r={r} fill="none" stroke="var(--ct-line)" strokeWidth="4" />
      <circle
        cx="20"
        cy="20"
        r={r}
        fill="none"
        stroke="var(--ct-green)"
        strokeWidth="4"
        strokeDasharray={`${dash} ${circumference - dash}`}
        strokeLinecap="round"
        transform="rotate(-90 20 20)"
      />
      <text x="20" y="24" textAnchor="middle" className="lt-ct__ring-txt">
        {value}
      </text>
    </svg>
  );
}

function DotStrip({ record }: { record: SessionRecord }) {
  const { conceptual, calculation, silly, presentation } = record.fourType;
  const cells: Array<{ cls: string; on: boolean }> = [
    { cls: "con", on: conceptual > 0 },
    { cls: "cal", on: calculation > 0 },
    { cls: "sil", on: silly > 0 },
    { cls: "pre", on: presentation > 0 },
  ];
  return (
    <div className="lt-ct__strip" aria-hidden="true">
      {cells.map((c, i) => (
        <i key={i} className={c.on ? c.cls : ""} />
      ))}
    </div>
  );
}

export default function ChapterTestHistoryRail({
  topicLabel,
  records,
  loading,
  onOpen,
}: {
  topicLabel: string;
  records: SessionRecord[];
  loading: boolean;
  onOpen: (record: SessionRecord) => void;
}) {
  return (
    <div className="lt-ct__histrail">
      <div className="lt-ct__histrail-h">Your {topicLabel} tests</div>

      {loading ? (
        <div className="lt-ct__honest">
          <span>·</span>
          <span>Loading your {topicLabel} tests…</span>
        </div>
      ) : records.length === 0 ? (
        <div className="lt-ct__honest">
          <span>·</span>
          <span>
            No {topicLabel} chapter tests yet — take your first one and it will show here. Your
            all-subject summary lives on Me / Progress.
          </span>
        </div>
      ) : (
        <>
          {records.map((r, i) => {
            const graded = r.status === "graded";
            const latest = i === 0 && graded;
            const spot = latest ? weakSpot(r) : null;
            const cls =
              "lt-ct__hcard" +
              (latest ? " lt-ct__hcard--latest" : "") +
              (!graded ? " lt-ct__hcard--pending" : "");
            return (
              <button key={r.id} type="button" className={cls} onClick={() => onOpen(r)}>
                {latest && <div className="lt-ct__lastlbl">Last attempt</div>}
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
                    {spot && (
                      <div className="lt-ct__vs">
                        Weak spot last time: <b>{spot}</b>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="lt-ct__vs">
                    Objective scored ({r.marksAwarded}/{r.marksTotal}) — upload your written work to
                    complete &amp; grade.
                  </div>
                )}
              </button>
            );
          })}
          <div className="lt-ct__honest">
            <span>·</span>
            <span>
              Only <b>{topicLabel}</b> tests show here. Tap a card to reopen its scorecard.
            </span>
          </div>
        </>
      )}
    </div>
  );
}
