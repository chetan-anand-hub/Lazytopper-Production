import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MobileShell from "../../components/mobile/MobileShell";
import { useAuth } from "../../context/AuthContext";
import { useSubjectContext } from "../../hooks/useSubjectContext";
import { useSubscription } from "../../hooks/useSubscription";
import { getMistakeLogs } from "../../services/mistakeLogService";
import { summarizeCareless, type CarelessInsight } from "../../services/mistakeInsightsService";
import { normalizeTopicKey } from "../../utils/topicResolver";

function readLocalInt(key: string, fallback = 0): number {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (typeof parsed === "number") return parsed;
    if (typeof parsed === "object" && parsed !== null) {
      return Number(parsed.count ?? parsed.value ?? fallback);
    }
    return Number(raw) || fallback;
  } catch {
    return fallback;
  }
}

export default function Me() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subject } = useSubjectContext();
  const { isTrialActive, isPremium, daysLeftInTrial } = useSubscription();

  const streak = readLocalInt("lazytopper.streak");
  const xp = readLocalInt("lazytopper.xp");

  // Real mistake mix from the SHARED pipeline — the same getMistakeLogs(uid, 30)
  // desktop Me reads. Persisted by Check & Improve (mobile + desktop). No
  // fabricated data: an honest empty-state shows until the student grades an
  // answer; once they do, the real category mix appears here AND on desktop Me.
  const [mistakeMix, setMistakeMix] = useState<{
    bars: Array<{ label: string; count: number; pct: number }>;
    total: number;
  }>({ bars: [], total: 0 });
  // Careless (silly + presentation) marks — surfaced as a DISTINCT insight,
  // separate from weak topics (those slips are exam-technique, not knowledge
  // gaps, so they never bridge to weak-areas). Derived from the same logs.
  const [careless, setCareless] = useState<CarelessInsight>({
    sillyCount: 0,
    presentationCount: 0,
    count: 0,
    marksLost: 0,
    hasData: false,
  });
  // #1 weak topic (highest marks lost) from the same logs — the target for the
  // "practise where you lose marks" CTA. Null when there is no real weak topic
  // yet (honest fallback: the generic worksheet generator, never a fake target).
  const [topWeak, setTopWeak] = useState<{
    subjectPath: string;
    topicSlug: string;
    topicLabel: string;
  } | null>(null);

  useEffect(() => {
    if (!user) {
      setMistakeMix({ bars: [], total: 0 });
      setCareless({ sillyCount: 0, presentationCount: 0, count: 0, marksLost: 0, hasData: false });
      setTopWeak(null);
      return;
    }
    let cancelled = false;
    void getMistakeLogs(user.uid, 30)
      .then((logs) => {
        if (cancelled) return;
        setCareless(summarizeCareless(logs));
        // Top weak topic by marks lost (mirrors desktop Me's weak-area ranking).
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
        setTopWeak(
          top && top.marksLost > 0
            ? {
                subjectPath: (top.subject || "Maths").toLowerCase(),
                topicSlug: normalizeTopicKey(top.label) || top.label,
                topicLabel: top.label,
              }
            : null,
        );
        const totals = { conceptual: 0, calculation: 0, silly: 0, presentation: 0 };
        for (const l of logs) {
          const c = l.mistakeCounts || ({} as typeof totals);
          totals.conceptual += Number(c.conceptual) || 0;
          totals.calculation += Number(c.calculation) || 0;
          totals.silly += Number(c.silly) || 0;
          totals.presentation += Number(c.presentation) || 0;
        }
        const total =
          totals.conceptual + totals.calculation + totals.silly + totals.presentation;
        const bars = [
          { label: "Conceptual", count: totals.conceptual },
          { label: "Calculation", count: totals.calculation },
          { label: "Silly mistakes", count: totals.silly },
          { label: "Presentation", count: totals.presentation },
        ]
          .filter((d) => d.count > 0)
          .map((d) => ({
            label: d.label,
            count: d.count,
            pct: total > 0 ? Math.round((d.count / total) * 100) : 0,
          }))
          .sort((a, b) => b.count - a.count);
        setMistakeMix({ bars, total });
      })
      .catch(() => {
        if (!cancelled) {
          setMistakeMix({ bars: [], total: 0 });
          setCareless({ sillyCount: 0, presentationCount: 0, count: 0, marksLost: 0, hasData: false });
          setTopWeak(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const displayName = user?.displayName || user?.email?.split("@")[0] || "Student";
  const initials = displayName
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const trialLabel = isPremium
    ? "Premium"
    : isTrialActive
    ? `${daysLeftInTrial}d trial left`
    : "Free";

  const trialBg = isPremium
    ? "rgba(34,197,94,0.12)"
    : isTrialActive
    ? "rgba(34,197,94,0.1)"
    : "rgba(156,163,175,0.12)";
  const trialColor = isPremium || isTrialActive ? "var(--mob-success)" : "var(--mob-fg-muted)";

  return (
    <MobileShell
      title="Me"
      subtitle={user ? "Your progress" : "Preview · sign in to save"}
      showNav
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Profile card */}
        <div
          className="card-soft"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "16px",
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: "var(--mob-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "1.15rem",
              color: "#ffffff",
              flexShrink: 0,
            }}
          >
            {initials || "S"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "1rem",
                color: "var(--mob-fg)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {displayName} · Class 10
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--mob-fg-muted)", marginTop: 2 }}>
              CBSE · {subject || "Maths + Science"}
            </div>
          </div>
          <span
            style={{
              padding: "4px 10px",
              borderRadius: 20,
              background: trialBg,
              color: trialColor,
              fontSize: "0.7rem",
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {trialLabel}
          </span>
        </div>

        {/* Compact analytics — 3 tiles */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {[
            {
              iconPath: "M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3",
              value: `${streak}d`,
              label: "Streak",
            },
            {
              iconPath: "M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2",
              value: `${xp} XP`,
              label: "Total XP",
            },
            {
              // Honest no-data marker: mobile Me has no real weak-areas data
              // source yet (the desktop Me weak-area pipeline is not wired here).
              // Show "—", never a fabricated count. Real count arrives with the
              // Phase-2 convergence + Check & Improve persistence (Track B).
              iconPath: "M22 12h-4l-3 9L9 3l-3 9H2",
              value: "—",
              label: "Weak topics",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="card-soft"
              style={{
                padding: "12px 10px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 9,
                  background: "var(--mob-muted)",
                  color: "var(--mob-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={stat.iconPath} />
                </svg>
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 800,
                  fontSize: "1rem",
                  color: "var(--mob-fg)",
                  lineHeight: 1,
                }}
              >
                {stat.value}
              </div>
              <div style={{ fontSize: "0.62rem", color: "var(--mob-fg-muted)" }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Where you lose marks */}
        <div>
          <div
            style={{
              fontSize: "0.72rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--mob-fg-muted)",
              marginBottom: 10,
            }}
          >
            Where you lose marks
          </div>
          {/* REAL mistake mix (Track B): when the student has graded answers, show
              their actual category breakdown from the shared getMistakeLogs
              pipeline (counts per category, mirroring desktop Me's
              "{count} of {total} ({pct}%)"). Otherwise an HONEST empty-state —
              never fabricated numbers (the −12/−8/−5 sample bars were removed in
              #220). The mix fills in once Check & Improve persists a grade. */}
          {mistakeMix.total > 0 ? (
            <div className="card-soft" style={{ padding: "14px 16px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {mistakeMix.bars.map((b) => (
                  <div key={b.label}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 6,
                      }}
                    >
                      <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--mob-fg)" }}>
                        {b.label}
                      </span>
                      <span style={{ fontSize: "0.72rem", color: "var(--mob-fg-muted)" }}>
                        {b.count} of {mistakeMix.total} ({b.pct}%)
                      </span>
                    </div>
                    <div
                      style={{
                        height: 6,
                        borderRadius: 3,
                        background: "var(--mob-muted)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          borderRadius: 3,
                          background: "var(--mob-danger, #ef4444)",
                          width: `${b.pct}%`,
                          transition: "width 0.4s ease",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="card-soft" style={{ padding: "16px" }}>
              <div
                style={{
                  fontSize: "0.86rem",
                  fontWeight: 700,
                  color: "var(--mob-fg)",
                  marginBottom: 6,
                }}
              >
                {user ? "No mistake logs yet" : "Your mistake mix appears here"}
              </div>
              <div
                style={{
                  fontSize: "0.78rem",
                  color: "var(--mob-fg-muted)",
                  lineHeight: 1.5,
                }}
              >
                {user
                  ? "Use Check & Improve to grade an answer. Each graded answer with a mistake adds to your real mistake mix — nothing is shown until then."
                  : "Sign in and grade an answer in Check & Improve. Your real mistake categories will appear here automatically."}
              </div>
            </div>
          )}
        </div>

        {/* Careless mark-loss (silly + presentation) — a DISTINCT insight,
            separate from weak topics. Only shown once there is real mistake
            data; honest copy either way, never a fabricated number. */}
        {user && mistakeMix.total > 0 && (
          <div>
            <div
              style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--mob-fg-muted)",
                marginBottom: 10,
              }}
            >
              Careless mark-loss
            </div>
            <div className="card-soft" style={{ padding: "14px 16px" }}>
              {careless.hasData ? (
                <>
                  <div
                    style={{
                      fontSize: "0.95rem",
                      fontWeight: 800,
                      fontFamily: "var(--font-display)",
                      color: "var(--mob-fg)",
                      marginBottom: 4,
                    }}
                  >
                    {careless.marksLost > 0
                      ? `${careless.marksLost} mark${careless.marksLost === 1 ? "" : "s"} lost to careless slips`
                      : `${careless.count} careless slip${careless.count === 1 ? "" : "s"}`}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--mob-fg-muted)", lineHeight: 1.5 }}>
                    {careless.sillyCount} silly · {careless.presentationCount} presentation. These
                    are exam-technique slips, not topic weaknesses — slow down on the final line,
                    units, and labels.
                  </div>
                </>
              ) : (
                <div style={{ fontSize: "0.82rem", color: "var(--mob-fg-muted)", lineHeight: 1.5 }}>
                  No careless marks lost — your slips are concept or calculation based. That&rsquo;s a
                  knowledge gap to close with practice, not carelessness.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recommended next action */}
        <div>
          <div
            style={{
              fontSize: "0.72rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--mob-fg-muted)",
              marginBottom: 10,
            }}
          >
            Recommended next
          </div>
          <button
            className="tap"
            onClick={() =>
              navigate(
                topWeak
                  ? `/practice/10/${topWeak.subjectPath}?topic=${encodeURIComponent(topWeak.topicSlug)}&source=me`
                  : "/practice/worksheets",
              )
            }
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              width: "100%",
              padding: "16px",
              borderRadius: 16,
              background: "var(--mob-primary)",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
              color: "#ffffff",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 11,
                background: "rgba(255,255,255,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ffffff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  marginBottom: 2,
                }}
              >
                {topWeak ? `Practise ${topWeak.topicLabel}` : "Generate a worksheet"}
              </div>
              <div style={{ fontSize: "0.74rem", color: "rgba(255,255,255,0.72)" }}>
                {topWeak
                  ? "Ready set on your biggest mark-loss"
                  : "Board-style · targets your weak areas"}
              </div>
            </div>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(255,255,255,0.7)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {/* Check & Improve CTA */}
        <button
          className="card-soft tap"
          onClick={() => navigate("/check-improve")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "14px 16px",
            border: "1px solid var(--mob-card-border)",
            background: "var(--mob-card)",
            cursor: "pointer",
            textAlign: "left",
            width: "100%",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "rgba(139,92,246,0.1)",
              color: "hsl(280,60%,50%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="13 2 13 9 20 9" />
              <path d="m9 15 2 2 4-4" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontWeight: 700,
                fontSize: "0.88rem",
                color: "var(--mob-fg)",
                marginBottom: 2,
              }}
            >
              Check & Improve
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--mob-fg-muted)" }}>
              Upload your answers · get board-style grading
            </div>
          </div>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--mob-fg-muted)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        {/* Sign-in nudge (logged out) */}
        {!user && (
          <button
            className="tap"
            onClick={() => navigate("/login")}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: 14,
              border: "1.5px dashed var(--mob-card-border)",
              background: "transparent",
              cursor: "pointer",
              fontSize: "0.82rem",
              color: "var(--mob-fg-muted)",
              textAlign: "center",
            }}
          >
            Sign in to save your progress →
          </button>
        )}

        {/* Honesty footer — mirrors desktop Me: numbers come only from real
            activity; empty cards mean no data yet, never a sample number. */}
        <div
          style={{
            fontSize: "0.68rem",
            color: "var(--mob-fg-muted)",
            textAlign: "center",
            lineHeight: 1.5,
            marginTop: 2,
          }}
        >
          Stats here come only from your saved attempts and graded answers. Empty
          cards mean there's no data yet — never a sample number.
        </div>
      </div>
    </MobileShell>
  );
}
