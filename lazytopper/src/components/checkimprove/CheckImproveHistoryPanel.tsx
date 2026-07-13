// src/components/checkimprove/CheckImproveHistoryPanel.tsx
//
// "Your checked papers" — the C&I history in an OVERLAY PANEL (locked C&I spec §6,
// the volume rule: checked papers accumulate fast across both subjects, so a header
// control opens a scrollable panel — the Worksheet/Full-Mock pattern, not a rail).
// Inside: subject filter tabs, then the LOCKED Chapter-Test card shape (ScoreRing +
// four-type DotStrip + "Last checked"), imported verbatim from the CT rail exactly
// as the Full-Mock panel does. A `mixed` paper shows a plain "Mixed topics" chip —
// NEVER a guessed topic name, and NEVER a topic COUNT: per-question topic does not
// exist until C&I PR-3, so a count would be a fabricated number (owner decision
// 2026-07-13; the counted chip lights up in PR-3). Tap a card → the host re-opens
// its stored scorecard read-only. Honest empty state before the first paper.
//
// Presentational: every number comes from the stored SessionRecords — nothing is
// invented. Dim + blur backdrop; ✕ / dim-click / Escape close (fixed inset —
// anchored by the viewport, it cannot drift with scroll). The host page styles
// itself inline, so this panel carries its own scope class (`lt-ci-scope`) that
// re-declares the shared `--ct-*` tokens (the per-surface self-contained-tokens
// pattern) and injects the CT + FM stylesheets it composes from.

import { useEffect, useMemo, useState } from "react";
import type { SessionRecord, SessionSubject } from "../../services/sessionRecords";
import { ScoreRing, DotStrip } from "../chaptertest/ChapterTestHistoryRail";
import { CT_CSS } from "../chaptertest/chapterTestStyles";
import { FM_CSS } from "../fullmock/fullMockStyles";

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

// The token scope + the one C&I-only class. Tokens duplicate `.lt-ct`'s on purpose —
// the locked per-surface pattern (each surface's stylesheet is self-contained) —
// minus its page-level layout props (min-height/background), which would fight the
// fixed-inset dim this scope wraps.
const CI_HIST_CSS = `
.lt-ci-scope {
  --ct-green: hsl(152, 55%, 45%);
  --ct-green-d: hsl(152, 55%, 38%);
  --ct-green-t: hsl(152, 55%, 96%);
  --ct-ink: #15233a;
  --ct-ink-2: #4a5568;
  --ct-ink-3: #8794a7;
  --ct-amber: #e0912f;
  --ct-amber-t: #fdf3e5;
  --ct-blue: #3b6fd4;
  --ct-blue-t: #eaf0fb;
  --ct-line: #e7ebf0;
  --ct-bg: #f6f8fa;
  --ct-card: #fff;
  --ct-r: 18px;
  --ct-sh: 0 1px 3px rgba(21,35,58,.06), 0 4px 16px rgba(21,35,58,.05);
  --ct-fd: "Fraunces", Georgia, serif;
  --ct-fb: "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
}
.lt-ci-scope * { box-sizing: border-box; }
.lt-ci__mixchip { font-size: 10px; font-weight: 700; color: var(--ct-ink-3); background: var(--ct-bg); border: 1px solid var(--ct-line); padding: 3px 7px; border-radius: 5px; white-space: nowrap; }
`;

export default function CheckImproveHistoryPanel({
  records,
  loading,
  defaultSubject,
  onOpen,
  onClose,
}: {
  /** ALL check-improve records (both subjects), any order. */
  records: SessionRecord[];
  loading: boolean;
  defaultSubject: SessionSubject;
  /** Re-open a stored scorecard read-only (the host renders it). */
  onOpen: (record: SessionRecord) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<SubjectTab>(defaultSubject);

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

  const visible = useMemo(
    () => (tab === "all" ? ordered : ordered.filter((r) => r.subject === tab)),
    [ordered, tab],
  );

  const latestId = visible[0]?.id ?? null;

  const tabs: Array<{ key: SubjectTab; label: string }> = [
    { key: "maths", label: `Maths · ${counts.maths}` },
    { key: "science", label: `Science · ${counts.science}` },
    { key: "all", label: "All" },
  ];

  return (
    <div className="lt-ci-scope">
      <style>{CT_CSS}</style>
      <style>{FM_CSS}</style>
      <style>{CI_HIST_CSS}</style>
      <div
        className="lt-fm__dim"
        role="dialog"
        aria-modal="true"
        aria-label="Your checked papers"
        onClick={onClose}
      >
        <div className="lt-fm__panel" onClick={(e) => e.stopPropagation()}>
          <div className="lt-fm__panel-h">
            <div>
              <div className="lt-fm__panel-t">Your checked papers</div>
              <div className="lt-fm__panel-sub">{ordered.length} saved · newest first</div>
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
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="lt-fm__panel-b">
            {loading ? (
              <div className="lt-ct__honest">
                <span>·</span>
                <span>Loading your checked papers…</span>
              </div>
            ) : visible.length === 0 ? (
              <div className="lt-ct__honest">
                <span>·</span>
                <span>
                  No checked papers yet — grade your first answer with Check &amp; Improve and it
                  will show here.
                </span>
              </div>
            ) : (
              visible.map((r) => {
                const latest = r.id === latestId;
                const mixed = r.topicSource === "mixed";
                const cls = "lt-ct__hcard" + (latest ? " lt-ct__hcard--latest" : "");
                return (
                  <button key={r.id} type="button" className={cls} onClick={() => onOpen(r)}>
                    {latest && <div className="lt-ct__lastlbl">Last checked</div>}
                    <div className="lt-ct__hcard-top">
                      <div>
                        <div className="lt-ct__hcard-name">{r.title}</div>
                        <div className="lt-ct__hcard-code">
                          {r.id} · {relativeDate(r.gradedAt)}
                          {mixed && (
                            <>
                              {" "}
                              <span className="lt-ci__mixchip">Mixed topics</span>
                            </>
                          )}
                        </div>
                      </div>
                      <ScoreRing value={String(r.marksAwarded)} fillPct={pct(r)} />
                    </div>
                    <DotStrip record={r} />
                    {r.status === "partial" && (
                      <div className="lt-ct__vs">
                        Some pages couldn’t be read on this session — the score shows the graded
                        portion only.
                      </div>
                    )}
                  </button>
                );
              })
            )}

            <div className="lt-ct__honest">
              <span>·</span>
              <span>
                Scrolls to as many papers as you check. Filter by subject above. Tap a card to
                reopen its scorecard.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
