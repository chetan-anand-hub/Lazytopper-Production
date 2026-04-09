import { useState, useRef, useEffect, useMemo } from "react";
import { loadParentPinHash, verifyPin, hasParentPin } from "../services/parentPinService";
import { loadInsights } from "../services/practiceInsights";
import { getWeakAreas } from "../services/weakAreaAggregator";
import { loadTopicMasterySnapshot } from "../services/topicHubMastery";
import { getLatestMockScores } from "../services/mockScoreHistory";
import { getWeeklyFocus } from "../services/focusTracker";
import type { DailyFocusRecord } from "../services/focusTracker";

const TOPIC_NAMES: Record<string, string> = {
  "real-numbers": "Real Numbers", polynomials: "Polynomials",
  "pair-of-linear-equations": "Linear Equations", "quadratic-equations": "Quadratic Equations",
  "arithmetic-progression": "Arithmetic Progression", triangles: "Triangles",
  "coordinate-geometry": "Coordinate Geometry", circles: "Circles",
  constructions: "Constructions", "areas-related-to-circles": "Areas & Circles",
  "surface-areas-and-volumes": "Surface Area & Volumes", trigonometry: "Trigonometry",
  statistics: "Statistics", probability: "Probability",
  "chemical-reactions-equations": "Chemical Reactions", "acids-bases-salts": "Acids, Bases & Salts",
  "metals-non-metals": "Metals & Non-metals", "carbon-and-its-compounds": "Carbon Compounds",
  "life-processes": "Life Processes", "how-do-organisms-reproduce": "Reproduction",
  "human-eye-colourful-world": "Human Eye", electricity: "Electricity",
  "magnetic-effects-of-electric-current": "Magnetic Effects",
  "light-reflection-refraction": "Light & Refraction",
  "control-and-coordination": "Control & Coordination",
  "heredity-and-evolution": "Heredity & Evolution",
  "our-environment": "Our Environment",
};

function getTopicMasteryPercent(topicKey: string): number {
  const snap = loadTopicMasterySnapshot(topicKey);
  if (!snap?.nodes) return 0;
  const nodes = Object.values(snap.nodes);
  if (nodes.length === 0) return 0;
  let score = 0;
  for (const n of nodes) {
    if (n.state === "mastered") score += 100;
    else if (n.state === "checkpoint_passed") score += 70;
    else if (n.state === "needs_practice") score += 40;
    else if (n.state === "learning") score += 20;
  }
  return Math.round(score / nodes.length);
}

function getDailyStudyData(): { day: string; minutes: number }[] {
  const weekly = getWeeklyFocus();
  const last7: { day: string; minutes: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en-IN", { weekday: "short" });
    const rec = weekly.find((r: DailyFocusRecord) => r.date === key);
    last7.push({ day: label, minutes: rec ? Math.round(rec.totalMs / 60000) : 0 });
  }
  return last7;
}

function getRecommendations(weakAreas: { topicName: string; subject: string; accuracy: number }[]): string[] {
  const recs: string[] = [];
  if (weakAreas.length > 0) {
    const worst = weakAreas[0];
    recs.push(`Encourage practice on ${worst.topicName} (${worst.subject}) — accuracy is only ${worst.accuracy}%.`);
  }
  if (weakAreas.length > 2) {
    recs.push(`There are ${weakAreas.length} weak areas. Focus on one topic per day for steady improvement.`);
  }
  const daily = getDailyStudyData();
  const avgMin = daily.reduce((s, d) => s + d.minutes, 0) / 7;
  if (avgMin < 30) {
    recs.push("Study time is below 30 minutes/day. Encourage at least 1 hour of focused practice daily.");
  } else if (avgMin >= 90) {
    recs.push("Great study consistency! Ensure breaks are taken to avoid burnout.");
  }
  if (recs.length === 0) {
    recs.push("Your child is on track. Keep encouraging consistent daily practice!");
  }
  return recs;
}

const LOCKOUT_KEY = "lazytopper.parentPin.lockout";
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000;

function getLockoutState(): { locked: boolean; attemptsLeft: number; unlockAt: number } {
  try {
    const raw = localStorage.getItem(LOCKOUT_KEY);
    if (!raw) return { locked: false, attemptsLeft: MAX_ATTEMPTS, unlockAt: 0 };
    const data = JSON.parse(raw);
    if (data.lockedUntil && Date.now() < data.lockedUntil) {
      return { locked: true, attemptsLeft: 0, unlockAt: data.lockedUntil };
    }
    if (data.lockedUntil && Date.now() >= data.lockedUntil) {
      localStorage.removeItem(LOCKOUT_KEY);
      return { locked: false, attemptsLeft: MAX_ATTEMPTS, unlockAt: 0 };
    }
    return { locked: false, attemptsLeft: MAX_ATTEMPTS - (data.failures || 0), unlockAt: 0 };
  } catch { return { locked: false, attemptsLeft: MAX_ATTEMPTS, unlockAt: 0 }; }
}

function recordFailedAttempt(): { locked: boolean; attemptsLeft: number } {
  try {
    const raw = localStorage.getItem(LOCKOUT_KEY);
    const data = raw ? JSON.parse(raw) : { failures: 0 };
    data.failures = (data.failures || 0) + 1;
    if (data.failures >= MAX_ATTEMPTS) {
      data.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
      localStorage.setItem(LOCKOUT_KEY, JSON.stringify(data));
      return { locked: true, attemptsLeft: 0 };
    }
    localStorage.setItem(LOCKOUT_KEY, JSON.stringify(data));
    return { locked: false, attemptsLeft: MAX_ATTEMPTS - data.failures };
  } catch { return { locked: false, attemptsLeft: MAX_ATTEMPTS }; }
}

function clearLockout(): void {
  try { localStorage.removeItem(LOCKOUT_KEY); } catch {}
}

export default function ParentAccessPage() {
  const [pin, setPin] = useState(["", "", "", ""]);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");
  const [noPinSet, setNoPinSet] = useState(false);
  const [lockout, setLockout] = useState(getLockoutState);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!hasParentPin()) {
      setNoPinSet(true);
    }
  }, []);

  useEffect(() => {
    if (!lockout.locked) return;
    const interval = setInterval(() => {
      const state = getLockoutState();
      if (!state.locked) {
        setLockout(state);
        setError("");
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockout.locked]);

  const handleDigit = (idx: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    if (lockout.locked) return;
    const next = [...pin];
    next[idx] = value;
    setPin(next);
    setError("");
    if (value && idx < 3) {
      inputRefs.current[idx + 1]?.focus();
    }
    if (next.every(d => d.length === 1)) {
      const fullPin = next.join("");
      const hash = loadParentPinHash();
      if (hash) {
        void verifyPin(fullPin, hash).then(ok => {
          if (ok) {
            clearLockout();
            setVerified(true);
          } else {
            const result = recordFailedAttempt();
            if (result.locked) {
              setError("Too many incorrect attempts. Locked for 5 minutes.");
              setLockout({ locked: true, attemptsLeft: 0, unlockAt: Date.now() + LOCKOUT_DURATION_MS });
            } else {
              setError(`Incorrect PIN. ${result.attemptsLeft} attempts remaining.`);
            }
            setPin(["", "", "", ""]);
            inputRefs.current[0]?.focus();
          }
        });
      }
    }
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !pin[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  if (noPinSet) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ maxWidth: 400, padding: "32px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: "0 0 12px", fontFamily: "'Space Grotesk', sans-serif" }}>
            Parent Access Not Set Up
          </h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
            Your child needs to set a Parent PIN in the app first. Ask them to set it up in their Profile settings.
          </p>
        </div>
      </div>
    );
  }

  if (!verified) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ maxWidth: 400, padding: "32px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>👨‍👩‍👧</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: "0 0 8px", fontFamily: "'Space Grotesk', sans-serif" }}>
            Parent Access
          </h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", margin: "0 0 28px", lineHeight: 1.5 }}>
            Enter the 4-digit PIN set by your child
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 16 }}>
            {pin.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => { inputRefs.current[idx] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigit(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                style={{
                  width: 56, height: 64, textAlign: "center", fontSize: 28, fontWeight: 800,
                  borderRadius: 14, border: error ? "2px solid #ef4444" : "2px solid rgba(255,255,255,0.15)",
                  background: "rgba(255,255,255,0.06)", color: "#fff", outline: "none",
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              />
            ))}
          </div>
          {error && <p style={{ fontSize: 13, color: "#ef4444", fontWeight: 600 }}>{error}</p>}
        </div>
      </div>
    );
  }

  return <ParentView />;
}

function ParentView() {
  const insights = useMemo(() => loadInsights(), []);
  const weakSummary = useMemo(() => getWeakAreas({ limit: 10 }), []);
  const mockScores = useMemo(() => getLatestMockScores(10), []);
  const dailyStudy = useMemo(() => getDailyStudyData(), []);
  const weeklyFocus = useMemo(() => getWeeklyFocus(), []);
  const recommendations = useMemo(() => getRecommendations(weakSummary.weakAreas), [weakSummary.weakAreas]);

  const attempts = insights.attempts || [];
  const totalQuestions = attempts.length;
  const accuracy = totalQuestions > 0 ? Math.round(attempts.filter(a => a.correct).length / totalQuestions * 100) : 0;

  const totalFocusedMs = weeklyFocus.reduce((s, r) => s + r.focusedMs, 0);
  const totalSessionMs = weeklyFocus.reduce((s, r) => s + r.totalMs, 0);
  const focusPct = totalSessionMs > 60000 ? Math.round((totalFocusedMs / totalSessionMs) * 100) : 0;

  const maxDailyMin = Math.max(...dailyStudy.map(d => d.minutes), 60);

  const allTopics = [
    "real-numbers", "polynomials", "pair-of-linear-equations", "quadratic-equations",
    "arithmetic-progression", "triangles", "coordinate-geometry", "trigonometry",
    "statistics", "probability", "chemical-reactions-equations", "acids-bases-salts",
    "metals-non-metals", "electricity", "light-reflection-refraction",
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", paddingBottom: 80 }}>
      <div style={{ maxWidth: 500, margin: "0 auto", padding: "16px 16px 32px" }}>
        <div style={{
          padding: "20px 18px", marginBottom: 20, borderRadius: 16, textAlign: "center",
          background: "linear-gradient(135deg, rgba(59,130,246,0.1), rgba(168,85,247,0.08))",
          border: "1px solid rgba(59,130,246,0.2)",
        }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>👨‍👩‍👧</div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "#fff", margin: "0 0 4px", fontFamily: "'Space Grotesk', sans-serif" }}>
            Parent Dashboard
          </h1>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: 0 }}>
            CBSE Class 10 Progress Report
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 20 }}>
          {[
            { label: "Questions", value: totalQuestions, color: "#3b82f6" },
            { label: "Accuracy", value: `${accuracy}%`, color: accuracy >= 70 ? "#22c55e" : "#ef4444" },
            { label: "Focus", value: `${focusPct}%`, color: focusPct >= 70 ? "#22c55e" : "#f97316" },
          ].map((s) => (
            <div key={s.label} style={{ padding: 14, borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{
          padding: "16px 18px", marginBottom: 16, borderRadius: 16,
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
        }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: "0 0 12px", fontFamily: "'Space Grotesk', sans-serif" }}>
            📊 Daily Study Time (Last 7 Days)
          </h3>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 120 }}>
            {dailyStudy.map((d) => {
              const h = maxDailyMin > 0 ? Math.max(4, (d.minutes / maxDailyMin) * 100) : 4;
              const color = d.minutes >= 60 ? "#22c55e" : d.minutes >= 30 ? "#3b82f6" : d.minutes > 0 ? "#f97316" : "rgba(255,255,255,0.06)";
              return (
                <div key={d.day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>
                    {d.minutes > 0 ? `${d.minutes}m` : ""}
                  </span>
                  <div style={{ width: "100%", height: h, borderRadius: 4, background: color, transition: "height 0.3s" }} />
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.35)" }}>{d.day}</span>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 8, display: "flex", gap: 12, justifyContent: "center" }}>
            {[
              { label: "< 30m", color: "#f97316" },
              { label: "30-60m", color: "#3b82f6" },
              { label: "60m+", color: "#22c55e" },
            ].map((l) => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: l.color }} />
                <span style={{ fontSize: 9, color: "rgba(255,255,255,0.4)" }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          padding: "16px 18px", marginBottom: 16, borderRadius: 16,
          background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)",
        }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: "0 0 12px", fontFamily: "'Space Grotesk', sans-serif" }}>
            💡 Recommendations for You
          </h3>
          {recommendations.map((rec, i) => (
            <div key={i} style={{
              padding: "10px 12px", marginBottom: i < recommendations.length - 1 ? 8 : 0,
              borderRadius: 10, background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.04)",
            }}>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.5, margin: 0 }}>{rec}</p>
            </div>
          ))}
        </div>

        {mockScores.length > 0 && (
          <div style={{
            padding: "16px 18px", marginBottom: 16, borderRadius: 16,
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: "0 0 12px", fontFamily: "'Space Grotesk', sans-serif" }}>
              📝 Mock Test Scores
            </h3>
            {mockScores.slice(0, 5).map((m) => (
              <div key={m.id} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)",
              }}>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>{m.subject}</span>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginLeft: 8 }}>
                    {new Date(m.timestamp).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                  </span>
                </div>
                <span style={{ fontSize: 14, fontWeight: 800, color: m.percent >= 65 ? "#22c55e" : m.percent >= 45 ? "#3b82f6" : "#ef4444" }}>
                  {m.percent}%
                </span>
              </div>
            ))}
          </div>
        )}

        {weakSummary.weakAreas.length > 0 && (
          <div style={{
            padding: "16px 18px", marginBottom: 16, borderRadius: 16,
            background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)",
          }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: "0 0 12px", fontFamily: "'Space Grotesk', sans-serif" }}>
              ⚠️ Weak Areas
            </h3>
            {weakSummary.weakAreas.slice(0, 5).map((w) => (
              <div key={w.topicKey} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)",
              }}>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>{w.topicName}</span>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginLeft: 6 }}>{w.subject}</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 800, color: w.accuracy < 50 ? "#ef4444" : "#fb923c" }}>{w.accuracy}%</span>
              </div>
            ))}
          </div>
        )}

        <div style={{
          padding: "16px 18px", marginBottom: 16, borderRadius: 16,
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
        }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: "0 0 12px", fontFamily: "'Space Grotesk', sans-serif" }}>
            📈 Topic Mastery Snapshot
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {allTopics.map((tk) => {
              const pct = getTopicMasteryPercent(tk);
              const color = pct >= 75 ? "#22c55e" : pct >= 50 ? "#3b82f6" : pct >= 25 ? "#f97316" : "rgba(255,255,255,0.15)";
              return (
                <div key={tk} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "6px 10px", borderRadius: 8, background: "rgba(255,255,255,0.02)",
                }}>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", flex: 1 }}>{TOPIC_NAMES[tk] || tk}</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color, minWidth: 32, textAlign: "right" }}>{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>

        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", textAlign: "center", marginTop: 24 }}>
          LazyTopper — CBSE Class 10 Board Prep
        </p>
      </div>
    </div>
  );
}
