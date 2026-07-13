import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import MobileShell from "../../components/mobile/MobileShell";
import { useAuth } from "../../context/AuthContext";
import { useSubjectContext } from "../../hooks/useSubjectContext";
import { loadInsights, type PracticeAttempt } from "../../services/practiceInsights";
import { getMistakeLogs, type MistakeLogEntry } from "../../services/mistakeLogService";
import { summarizeCareless, type CarelessInsight } from "../../services/mistakeInsightsService";
import { getWrongConceptsForTopic } from "../../services/adaptivePracticeEngine";
import { normalizeTopicKey } from "../../utils/topicResolver";
import { ProgressWindowArc } from "../../components/progress/ProgressWindowArc";

/**
 * MobileMePage — the mobile Me / Progress surface (arc PR-4).
 *
 * REPLACES the retired legacy mobile Me (pages/app/Me.tsx — a streak / XP /
 * gamification hero). This surface renders the SAME progress vision as desktop Me,
 * mobile-laid-out: the cross-device "study mirror" arc (ProgressWindowArc, reading
 * progressStore.getWindowedProgress — the ONE shared component) plus honest, real-data
 * cards.
 *
 * CONSUMPTION-ONLY — reads existing read services only (never the data layer):
 *   • loadInsights()            — device-local saved attempts (accuracy / topics —
 *                                 mirrors desktop Me exactly, so both show the same
 *                                 numbers). The cross-device before→now story is the arc.
 *   • getMistakeLogs(uid, 30)   — mistake mix + careless mark-loss + top weak topic.
 *   • summarizeCareless(logs)   — the careless (silly+presentation) exam-technique insight
 *                                 CARRIED FORWARD from the legacy Me (a real MI insight,
 *                                 not silently dropped in the redesign).
 *
 * HONEST-OR-SILENT: every number derives from real saved data; empty cards show an
 * honest "—" / empty state, never a fabricated value. No streak/XP (gamification,
 * retired). No subscription badge (account chrome, and useSubscription client-activates
 * a trial — a doctrine liability — so it is deliberately not reintroduced here).
 *
 * Chrome / header parity: the global brand navbar is suppressed on mobile /me
 * (App.tsx isMobileSelfChromedRoute), so this page owns ONE clean header via MobileShell
 * — no doubled bar. The mobile BottomNav (Home / Exam Trends / Practice / Check / Me)
 * is PRESERVED (showNav keeps its content offset); it is mobile's only equivalent to the
 * desktop sidebar and is never removed.
 *
 * Mistake Intel: the desktop navy-sidebar MI card is NOT ported here — doctrine is
 * "MI is navy-sidebar chrome ONLY, never a page body". Its content (mistake patterns)
 * is exactly this page's "Where you lose marks" + "Careless mark-loss" sections — the
 * destination the desktop MI card's "See where →" already links to. Explicit placement,
 * not a silent omission.
 *
 * Class-driven CSS (CLAUDE.md §7 — no inline style objects); one injected <style> block
 * on the mobile design tokens (--mob-*). Works at 360px.
 */

interface MistakeBar {
  key: "conceptual" | "calculation" | "silly" | "presentation";
  label: string;
  count: number;
  pct: number;
}

interface TopWeak {
  subjectPath: string;
  topicSlug: string;
  topicLabel: string;
  /** Recoverable wrong-answer count (Stream 3) — shrinks toward zero as the topic is
   *  drilled correctly. Distinct from the historical marks lost. */
  activeGaps: number;
}

function computeAccuracyPct(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((correct / total) * 100);
}

function computeMistakeBars(logs: MistakeLogEntry[]): { bars: MistakeBar[]; total: number } {
  const totals = { conceptual: 0, calculation: 0, silly: 0, presentation: 0 };
  for (const l of logs) {
    const c = l.mistakeCounts;
    if (!c) continue;
    totals.conceptual += Number(c.conceptual) || 0;
    totals.calculation += Number(c.calculation) || 0;
    totals.silly += Number(c.silly) || 0;
    totals.presentation += Number(c.presentation) || 0;
  }
  const total = totals.conceptual + totals.calculation + totals.silly + totals.presentation;
  const bars: MistakeBar[] = (
    [
      { key: "conceptual", label: "Conceptual" },
      { key: "calculation", label: "Calculation" },
      { key: "silly", label: "Silly mistakes" },
      { key: "presentation", label: "Presentation" },
    ] as Array<{ key: MistakeBar["key"]; label: string }>
  )
    .map((d) => ({
      key: d.key,
      label: d.label,
      count: totals[d.key],
      pct: total > 0 ? Math.round((totals[d.key] / total) * 100) : 0,
    }))
    .filter((d) => d.count > 0)
    .sort((a, b) => b.count - a.count);
  return { bars, total };
}

/** Top weak topic by marks lost (mirrors desktop Me + the legacy mobile Me). Null when
 *  there is no real weak topic yet — honest fallback, never a fabricated target. */
function computeTopWeak(logs: MistakeLogEntry[]): TopWeak | null {
  const byTopic = new Map<string, { marksLost: number; subject: string; label: string }>();
  for (const l of logs) {
    const label = (l.topic || "").trim();
    if (!label) continue;
    const prev = byTopic.get(label) || { marksLost: 0, subject: l.subject || "Maths", label };
    prev.marksLost += Number(l.marksLost) || 0;
    byTopic.set(label, prev);
  }
  let top: { marksLost: number; subject: string; label: string } | null = null;
  for (const v of byTopic.values()) {
    if (!top || v.marksLost > top.marksLost) top = v;
  }
  if (!top || top.marksLost <= 0) return null;
  const slug = normalizeTopicKey(top.label) || top.label;
  return {
    subjectPath: (top.subject || "Maths").toLowerCase(),
    topicSlug: slug,
    topicLabel: top.label,
    activeGaps: getWrongConceptsForTopic(slug).reduce((sum, e) => sum + (Number(e.count) || 0), 0),
  };
}

/* ── inline glyphs (currentColor; styling via parent class) ── */

const Chevron = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const CheckDoc = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M15 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="13 2 13 9 20 9" />
    <path d="m9 15 2 2 4-4" />
  </svg>
);

const FileDoc = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

export default function MobileMePage() {
  const navigate = useNavigate();
  const { user, mistakeLogsHydrated } = useAuth();
  const { subject } = useSubjectContext();

  const [attempts, setAttempts] = useState<PracticeAttempt[]>([]);
  const [mistakeLogs, setMistakeLogs] = useState<MistakeLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [careless, setCareless] = useState<CarelessInsight>({
    sillyCount: 0,
    presentationCount: 0,
    count: 0,
    marksLost: 0,
    hasData: false,
  });

  // Device-local saved attempts (synchronous localStorage), scoped per-uid by the
  // practiceInsights service — the same read desktop Me uses, so the numbers match.
  useEffect(() => {
    if (!user) {
      setAttempts([]);
      return;
    }
    try {
      const insights = loadInsights();
      setAttempts(Array.isArray(insights.attempts) ? insights.attempts : []);
    } catch {
      setAttempts([]);
    }
  }, [user?.uid, mistakeLogsHydrated]);

  // Mistake logs (async Firestore + local merge). Any failure degrades honestly to the
  // empty state — never a fabricated number.
  useEffect(() => {
    if (!user) {
      setMistakeLogs([]);
      setCareless({ sillyCount: 0, presentationCount: 0, count: 0, marksLost: 0, hasData: false });
      return;
    }
    let cancelled = false;
    setLogsLoading(true);
    void (async () => {
      try {
        const logs = await getMistakeLogs(user.uid, 30);
        if (cancelled) return;
        const arr = Array.isArray(logs) ? logs : [];
        setMistakeLogs(arr);
        setCareless(summarizeCareless(arr));
      } catch {
        if (!cancelled) {
          setMistakeLogs([]);
          setCareless({ sillyCount: 0, presentationCount: 0, count: 0, marksLost: 0, hasData: false });
        }
      } finally {
        if (!cancelled) setLogsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid, mistakeLogsHydrated]);

  const totalAttempts = attempts.length;
  const correctAttempts = useMemo(
    () => attempts.reduce((acc, a) => acc + (a.correct ? 1 : 0), 0),
    [attempts],
  );
  const accuracyPct = useMemo(
    () => computeAccuracyPct(correctAttempts, totalAttempts),
    [correctAttempts, totalAttempts],
  );
  const topicsCovered = useMemo(() => {
    const set = new Set<string>();
    for (const a of attempts) if (a.topicKey) set.add(a.topicKey);
    return set.size;
  }, [attempts]);
  const totalMarksLost = useMemo(
    () => mistakeLogs.reduce((s, l) => s + (Number(l.marksLost) || 0), 0),
    [mistakeLogs],
  );
  const { bars: mistakeBars, total: mistakeTotal } = useMemo(
    () => computeMistakeBars(mistakeLogs),
    [mistakeLogs],
  );
  const topWeak = useMemo(() => computeTopWeak(mistakeLogs), [mistakeLogs]);

  const displayName = user?.displayName || user?.email?.split("@")[0] || "Student";
  const initials =
    displayName
      .split(" ")
      .map((w: string) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "S";

  // Real (non-local) uid — the arc is cross-device and renders nothing for a local
  // session (honest: cross-device progress needs a real account).
  const realUid = user && !user.isLocalSession ? user.uid : null;

  const dash = "—";
  const statTiles: Array<{ label: string; value: string; unavailable: boolean }> = [
    {
      label: "Saved attempts",
      value: user ? String(totalAttempts) : dash,
      unavailable: !user || totalAttempts === 0,
    },
    {
      label: "Accuracy",
      value: user && totalAttempts > 0 ? `${accuracyPct}%` : dash,
      unavailable: !user || totalAttempts === 0,
    },
    {
      label: "Mistakes (30d)",
      value: !user ? dash : logsLoading ? "…" : String(mistakeLogs.length),
      unavailable: !user || (!logsLoading && mistakeLogs.length === 0),
    },
    {
      label: "Topics covered",
      value: user ? String(topicsCovered) : dash,
      unavailable: !user || topicsCovered === 0,
    },
  ];

  const goPractice = () => {
    if (topWeak) {
      navigate(
        `/practice/10/${topWeak.subjectPath}?topic=${encodeURIComponent(topWeak.topicSlug)}&source=me`,
      );
    } else {
      navigate("/practice-hub?source=me");
    }
  };

  return (
    <MobileShell title="Me" subtitle={user ? "Your study mirror" : "Preview · sign in to save"} showNav>
      <style>{ME_CSS}</style>
      <div className="lt-me">
        {/* Signed-out honest banner */}
        {!user && (
          <button className="lt-me__signin tap" type="button" onClick={() => navigate("/login?reason=open-progress&redirect=/me")}>
            <div className="lt-me__signin-title">Sign in to see your progress</div>
            <div className="lt-me__signin-body">
              Your study mirror needs saved attempts. Accuracy, mistakes and your
              before&rarr;now trend all derive from real saved data &mdash; nothing is invented.
            </div>
            <span className="lt-me__signin-cta">
              Sign in to open progress <Chevron />
            </span>
          </button>
        )}

        {/* Profile identity (no subscription badge — see file header) */}
        {user && (
          <div className="lt-me__profile card-soft">
            <div className="lt-me__avatar">{initials}</div>
            <div className="lt-me__profile-main">
              <div className="lt-me__profile-name">{displayName} &middot; Class 10</div>
              <div className="lt-me__profile-sub">CBSE &middot; {subject || "Maths + Science"}</div>
            </div>
          </div>
        )}

        {/* Honest stat tiles (real data only; "—" when there is nothing to show) */}
        <div className="lt-me__stats">
          {statTiles.map((s) => (
            <div key={s.label} className="lt-me__stat card-soft">
              <div className={`lt-me__stat-value${s.unavailable ? " lt-me__stat-value--muted" : ""}`}>
                {s.value}
              </div>
              <div className="lt-me__stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* The cross-device before→now arc — the ONE shared progress component. Renders
            nothing for signed-out / local sessions (it owns that internally). */}
        <ProgressWindowArc uid={realUid} />

        {/* Where you lose marks — real mistake mix */}
        <section className="lt-me__section">
          <div className="lt-me__section-label">Where you lose marks</div>
          {mistakeTotal > 0 ? (
            <div className="lt-me__card card-soft">
              {mistakeBars.map((b) => (
                <div key={b.key} className="lt-me__mix-row">
                  <span className="lt-me__bar-label">{b.label}</span>
                  <span className="lt-me__bar-meta">
                    {b.count} of {mistakeTotal} <strong className="lt-me__mix-pct">({b.pct}%)</strong>
                  </span>
                </div>
              ))}
              {totalMarksLost > 0 && (
                <div className="lt-me__bar-foot">{totalMarksLost} marks lost across logged answers.</div>
              )}
            </div>
          ) : (
            <div className="lt-me__card card-soft">
              <div className="lt-me__empty-title">
                {user ? "No mistake logs yet" : "Your mistake mix appears here"}
              </div>
              <div className="lt-me__empty-body">
                {user
                  ? "Use Check & Improve to grade an answer. Each graded answer with a mistake adds to your real mistake mix — nothing is shown until then."
                  : "Sign in and grade an answer in Check & Improve. Your real mistake categories will appear here automatically."}
              </div>
            </div>
          )}
        </section>

        {/* Careless mark-loss (silly + presentation) — CARRIED FORWARD from the legacy
            Me. A DISTINCT exam-technique insight, never a topic weakness. */}
        {user && mistakeTotal > 0 && (
          <section className="lt-me__section">
            <div className="lt-me__section-label">Careless mark-loss</div>
            <div className="lt-me__card card-soft">
              {careless.hasData ? (
                <>
                  <div className="lt-me__careless-head">
                    {careless.marksLost > 0
                      ? `${careless.marksLost} mark${careless.marksLost === 1 ? "" : "s"} lost to careless slips`
                      : `${careless.count} careless slip${careless.count === 1 ? "" : "s"}`}
                  </div>
                  <div className="lt-me__empty-body">
                    {careless.sillyCount} silly &middot; {careless.presentationCount} presentation. These
                    are exam-technique slips, not topic weaknesses &mdash; slow down on the final line,
                    units, and labels.
                  </div>
                </>
              ) : (
                <div className="lt-me__empty-body">
                  No careless marks lost &mdash; your slips are concept or calculation based. That&rsquo;s
                  a knowledge gap to close with practice, not carelessness.
                </div>
              )}
            </div>
          </section>
        )}

        {/* Recommended next — real top weak topic, else the generic practice hub */}
        <section className="lt-me__section">
          <div className="lt-me__section-label">Recommended next</div>
          <button className="lt-me__reco tap" type="button" onClick={goPractice}>
            <span className="lt-me__reco-icon">
              <FileDoc />
            </span>
            <span className="lt-me__reco-main">
              <span className="lt-me__reco-title">
                {topWeak ? `Practice ${topWeak.topicLabel}` : "Open practice"}
              </span>
              <span className="lt-me__reco-sub">
                {topWeak
                  ? topWeak.activeGaps > 0
                    ? `${topWeak.activeGaps} active gap${topWeak.activeGaps === 1 ? "" : "s"} to clear · biggest mark-loss`
                    : "Ready set on your biggest mark-loss"
                  : "Board-style practice on your topics"}
              </span>
            </span>
            <span className="lt-me__reco-chev">
              <Chevron />
            </span>
          </button>
        </section>

        {/* Check & Improve CTA */}
        <button className="lt-me__ci card-soft tap" type="button" onClick={() => navigate("/check-improve?source=me")}>
          <span className="lt-me__ci-icon">
            <CheckDoc />
          </span>
          <span className="lt-me__reco-main">
            <span className="lt-me__ci-title">Check &amp; Improve</span>
            <span className="lt-me__reco-sub">Upload your answers &middot; get board-style grading</span>
          </span>
          <span className="lt-me__reco-chev">
            <Chevron />
          </span>
        </button>

        {/* Honesty footer — mirrors desktop Me */}
        <div className="lt-me__footer">
          Stats here come only from your saved attempts and graded answers. Empty cards
          mean there&rsquo;s no data yet &mdash; never a sample number.
        </div>
      </div>
    </MobileShell>
  );
}

const ME_CSS = `
.lt-me { display: flex; flex-direction: column; gap: 16px; }

.lt-me__signin {
  display: block;
  width: 100%;
  text-align: left;
  padding: 16px;
  border-radius: 16px;
  border: 1.5px solid var(--mob-card-border, hsl(220,18%,90%));
  background: var(--mob-card, #fff);
  cursor: pointer;
}
.lt-me__signin-title {
  font-family: var(--font-display, "Fraunces", Georgia, serif);
  font-weight: 700;
  font-size: 1rem;
  color: var(--mob-fg, hsl(220,25%,12%));
  margin-bottom: 6px;
}
.lt-me__signin-body { font-size: 0.8rem; color: var(--mob-fg-muted, hsl(220,15%,42%)); line-height: 1.5; }
.lt-me__signin-cta {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 12px;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--mob-primary, hsl(152,55%,40%));
}

.lt-me__profile { display: flex; align-items: center; gap: 14px; padding: 16px; }
.lt-me__avatar {
  width: 52px; height: 52px; border-radius: 50%;
  background: var(--mob-primary, hsl(152,55%,45%));
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-display, "Fraunces", Georgia, serif);
  font-weight: 800; font-size: 1.15rem; color: #fff; flex-shrink: 0;
}
.lt-me__profile-main { flex: 1; min-width: 0; }
.lt-me__profile-name {
  font-family: var(--font-display, "Fraunces", Georgia, serif);
  font-weight: 700; font-size: 1rem; color: var(--mob-fg, hsl(220,25%,12%));
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.lt-me__profile-sub { font-size: 0.75rem; color: var(--mob-fg-muted, hsl(220,15%,42%)); margin-top: 2px; }

.lt-me__stats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.lt-me__stat { padding: 14px 12px; display: flex; flex-direction: column; gap: 4px; }
.lt-me__stat-value {
  font-family: var(--font-display, "Fraunces", Georgia, serif);
  font-weight: 800; font-size: 1.4rem; line-height: 1.05;
  color: var(--mob-fg, hsl(220,25%,12%));
}
.lt-me__stat-value--muted { color: var(--mob-fg-muted, hsl(220,15%,55%)); }
.lt-me__stat-label { font-size: 0.7rem; color: var(--mob-fg-muted, hsl(220,15%,42%)); }

.lt-me__section { display: flex; flex-direction: column; gap: 10px; }
.lt-me__section-label {
  font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;
  color: var(--mob-fg-muted, hsl(220,15%,42%));
}
.lt-me__card { padding: 14px 16px; display: flex; flex-direction: column; gap: 14px; }

.lt-me__mix-row {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  padding: 9px 11px; border-radius: 9px;
  background: var(--mob-muted, hsl(220,20%,97%));
}
.lt-me__bar-label { font-size: 0.82rem; font-weight: 600; color: var(--mob-fg, hsl(220,25%,12%)); }
.lt-me__bar-meta { font-size: 0.74rem; color: var(--mob-fg-muted, hsl(220,15%,42%)); flex-shrink: 0; }
.lt-me__mix-pct { font-weight: 700; color: var(--mob-fg, hsl(220,25%,20%)); }
.lt-me__bar-foot { font-size: 0.72rem; color: var(--mob-fg-muted, hsl(220,15%,42%)); }

.lt-me__empty-title { font-size: 0.86rem; font-weight: 700; color: var(--mob-fg, hsl(220,25%,12%)); }
.lt-me__empty-body { font-size: 0.78rem; color: var(--mob-fg-muted, hsl(220,15%,42%)); line-height: 1.5; }
.lt-me__careless-head {
  font-family: var(--font-display, "Fraunces", Georgia, serif);
  font-weight: 800; font-size: 0.95rem; color: var(--mob-fg, hsl(220,25%,12%));
}

.lt-me__reco {
  display: flex; align-items: center; gap: 14px; width: 100%;
  padding: 16px; border-radius: 16px; border: none; cursor: pointer; text-align: left;
  background: var(--mob-primary, hsl(152,55%,45%)); color: #fff;
}
.lt-me__reco-icon {
  width: 40px; height: 40px; border-radius: 11px; flex-shrink: 0;
  background: rgba(255,255,255,0.14); display: flex; align-items: center; justify-content: center; color: #fff;
}
.lt-me__reco-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.lt-me__reco-title { font-family: var(--font-display, "Fraunces", Georgia, serif); font-weight: 700; font-size: 0.95rem; }
.lt-me__reco-sub { font-size: 0.74rem; color: rgba(255,255,255,0.75); }
.lt-me__reco-chev { color: rgba(255,255,255,0.7); flex-shrink: 0; display: flex; }

.lt-me__ci {
  display: flex; align-items: center; gap: 14px; width: 100%;
  padding: 14px 16px; cursor: pointer; text-align: left;
  border: 1px solid var(--mob-card-border, hsl(220,18%,90%)); background: var(--mob-card, #fff);
}
.lt-me__ci-icon {
  width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
  background: rgba(139,92,246,0.1); color: hsl(280,60%,50%);
  display: flex; align-items: center; justify-content: center;
}
.lt-me__ci-title { font-weight: 700; font-size: 0.88rem; color: var(--mob-fg, hsl(220,25%,12%)); }
.lt-me__ci .lt-me__reco-sub { color: var(--mob-fg-muted, hsl(220,15%,42%)); }
.lt-me__ci .lt-me__reco-chev { color: var(--mob-fg-muted, hsl(220,15%,42%)); }

.lt-me__footer {
  font-size: 0.68rem; color: var(--mob-fg-muted, hsl(220,15%,42%));
  text-align: center; line-height: 1.5; margin-top: 2px;
}
`;
