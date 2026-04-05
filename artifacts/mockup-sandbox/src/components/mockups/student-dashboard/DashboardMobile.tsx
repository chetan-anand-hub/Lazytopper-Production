export function DashboardMobile() {
  const streak = 7;
  const xp = 1250;
  const accuracy = 72;
  const topicsMastered = 4;
  const topicsStarted = 12;
  const targetPercent = 85;
  const hoursPerDay = 3;
  const daysLeft = 42;
  const realisticMin = 78;
  const realisticMax = 88;

  const weakAreas = [
    { name: "Triangles", accuracy: 45, subject: "Maths", attempted: 18 },
    { name: "Electricity", accuracy: 52, subject: "Science", attempted: 14 },
    { name: "Statistics", accuracy: 58, subject: "Maths", attempted: 11 },
  ];

  const mathsMastery = [
    { name: "Quadratic Eq.", pct: 92, tier: "must-crack" },
    { name: "Arithmetic Prog.", pct: 85, tier: "must-crack" },
    { name: "Real Numbers", pct: 78, tier: "high-roi" },
    { name: "Polynomials", pct: 70, tier: "high-roi" },
    { name: "Triangles", pct: 45, tier: "must-crack" },
    { name: "Coord. Geometry", pct: 63, tier: "high-roi" },
    { name: "Circles", pct: 55, tier: "good-to-do" },
    { name: "Statistics", pct: 58, tier: "high-roi" },
  ];

  const scienceMastery = [
    { name: "Light", pct: 80, tier: "must-crack" },
    { name: "Chemical Rxns", pct: 68, tier: "must-crack" },
    { name: "Electricity", pct: 52, tier: "must-crack" },
    { name: "Heredity", pct: 40, tier: "high-roi" },
  ];

  const recentActivity = [
    { action: "Completed Daily Mix", subject: "Maths", time: "2h ago", icon: "⚡" },
    { action: "Practiced Triangles", subject: "Maths", time: "5h ago", icon: "📐" },
    { action: "Teach Me: Electricity", subject: "Science", time: "Yesterday", icon: "💡" },
    { action: "Mock Test #3", subject: "Maths", time: "2 days ago", icon: "📝" },
    { action: "Weekly Wrapped viewed", subject: "", time: "3 days ago", icon: "📊" },
  ];

  const badges = [
    { name: "First Steps", icon: "🚀", unlocked: true },
    { name: "3-Day Streak", icon: "🔥", unlocked: true },
    { name: "7-Day Streak", icon: "🔥", unlocked: true },
    { name: "Topic Master", icon: "🎯", unlocked: true },
    { name: "100 Qs", icon: "💯", unlocked: true },
    { name: "Mock Warrior", icon: "⚔️", unlocked: false },
    { name: "30-Day Streak", icon: "👑", unlocked: false },
    { name: "Perfect Score", icon: "💎", unlocked: false },
  ];

  const dailyMixItems = [
    { type: "concept", title: "Circles: Tangent Properties", icon: "📖" },
    { type: "question", title: "Area of Sector — 3 marks", icon: "✏️" },
    { type: "question", title: "Tangent from external point — 4 marks", icon: "✏️" },
    { type: "revision", title: "Quick recap: Quadratic Formula", icon: "🔄" },
    { type: "question", title: "Statistics: Mean of grouped data — 3 marks", icon: "✏️" },
  ];

  function RingChart({ value, size = 48, strokeWidth = 4, color }: { value: number; size?: number; strokeWidth?: number; color: string }) {
    const r = (size - strokeWidth) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ * (1 - value / 100);
    return (
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
    );
  }

  function ProgressBar({ value, color, height = 6 }: { value: number; color: string; height?: number }) {
    return (
      <div style={{ width: "100%", height, borderRadius: height, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div style={{ width: `${Math.min(value, 100)}%`, height: "100%", borderRadius: height, background: color, transition: "width 0.6s ease" }} />
      </div>
    );
  }

  function tierColor(tier: string) {
    if (tier === "must-crack") return "#22c55e";
    if (tier === "high-roi") return "#3b82f6";
    return "#f97316";
  }

  return (
    <div style={{
      minHeight: "100vh",
      width: "100%",
      background: "#0a0a0a",
      color: "#fff",
      fontFamily: "'Inter', sans-serif",
      overflowX: "hidden",
    }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&display=swap');
        .font-display { font-family: 'Space Grotesk', sans-serif; }
        .glass-card { background: rgba(255,255,255,0.03); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; }
        .glass-card-accent { background: rgba(34,197,94,0.06); backdrop-filter: blur(16px); border: 1px solid rgba(34,197,94,0.15); border-radius: 16px; }
        .glass-card-blue { background: rgba(59,130,246,0.06); backdrop-filter: blur(16px); border: 1px solid rgba(59,130,246,0.15); border-radius: 16px; }
        .glass-card-warn { background: rgba(249,115,22,0.06); backdrop-filter: blur(16px); border: 1px solid rgba(249,115,22,0.15); border-radius: 16px; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
      `}} />

      <div style={{ padding: "20px 16px 100px", maxWidth: 430, margin: "0 auto" }}>

        {/* HEADER */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%",
              background: "linear-gradient(135deg, #22c55e, #3b82f6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, fontWeight: 800, color: "#000",
            }}>A</div>
            <div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 500, textTransform: "uppercase", letterSpacing: 1 }}>Good morning</div>
              <div className="font-display" style={{ fontSize: 20, fontWeight: 700 }}>Arjun</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "4px 10px", borderRadius: 20,
              background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.25)",
            }}>
              <span style={{ fontSize: 14 }}>🔥</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#fb923c" }}>{streak}</span>
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "4px 10px", borderRadius: 20,
              background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.25)",
            }}>
              <span style={{ fontSize: 14 }}>⚡</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#c084fc" }}>{xp.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* HERO ACTION CARD */}
        <div className="glass-card-accent" style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 20 }}>🎯</span>
            <span className="font-display" style={{ fontSize: 16, fontWeight: 700 }}>Your Saturday Mix</span>
          </div>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.5, marginBottom: 14 }}>
            3 questions + concept + revision. Complete it to keep your 7-day streak alive!
          </p>
          <button style={{
            width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
            background: "#22c55e", color: "#000", fontWeight: 800, fontSize: 15,
            fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer",
            boxShadow: "0 0 24px rgba(34,197,94,0.3)",
          }}>
            Start Daily Mix — 20 min
          </button>
        </div>

        {/* STATS ROW */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
          {[
            { label: "Streak", value: `${streak}d`, icon: "🔥", color: "#fb923c" },
            { label: "XP", value: xp.toLocaleString(), icon: "⚡", color: "#c084fc" },
            { label: "Accuracy", value: `${accuracy}%`, icon: "", color: "#3b82f6", ring: true },
            { label: "Mastered", value: `${topicsMastered}/${topicsStarted}`, icon: "", color: "#22c55e", ring: true },
          ].map((s, i) => (
            <div key={i} className="glass-card" style={{ padding: "12px 8px", textAlign: "center", position: "relative" }}>
              {s.ring ? (
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>
                  <div style={{ position: "relative", width: 40, height: 40 }}>
                    <RingChart value={s.label === "Accuracy" ? accuracy : (topicsMastered / topicsStarted) * 100} size={40} strokeWidth={3} color={s.color} />
                    <span style={{
                      position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 9, fontWeight: 800, color: s.color,
                    }}>{s.value}</span>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 16, marginBottom: 2 }}>{s.icon}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</div>
                </>
              )}
              <div style={{ fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: 0.8 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* DAILY MIX PREVIEW */}
        <div className="glass-card" style={{ padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span className="font-display" style={{ fontSize: 14, fontWeight: 700 }}>Today's Mix</span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 500 }}>5 items · ~20 min</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {dailyMixItems.map((item, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
                borderRadius: 10, background: "rgba(255,255,255,0.02)",
              }}>
                <span style={{ fontSize: 14, width: 20, textAlign: "center" }}>{item.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.7)", flex: 1 }}>{item.title}</span>
                <span style={{
                  fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5,
                  padding: "2px 6px", borderRadius: 4,
                  background: item.type === "question" ? "rgba(59,130,246,0.12)" : item.type === "concept" ? "rgba(34,197,94,0.12)" : "rgba(249,115,22,0.12)",
                  color: item.type === "question" ? "#60a5fa" : item.type === "concept" ? "#4ade80" : "#fb923c",
                }}>{item.type}</span>
              </div>
            ))}
          </div>
          <button style={{
            width: "100%", padding: "12px 0", borderRadius: 10, border: "none",
            background: "rgba(59,130,246,0.15)", color: "#60a5fa", fontWeight: 700, fontSize: 13,
            fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer",
            border: "1px solid rgba(59,130,246,0.25)", marginTop: 10,
          }}>
            Play Daily Mix
          </button>
        </div>

        {/* WEAK AREAS */}
        <div className="glass-card-warn" style={{ padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 16 }}>⚠️</span>
            <span className="font-display" style={{ fontSize: 14, fontWeight: 700 }}>Weak Areas</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {weakAreas.map((w, i) => (
              <div key={i}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{w.name}</span>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginLeft: 6 }}>{w.subject}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: w.accuracy < 50 ? "#ef4444" : "#fb923c" }}>{w.accuracy}%</span>
                    <button style={{
                      fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 8,
                      background: "rgba(249,115,22,0.15)", border: "1px solid rgba(249,115,22,0.3)",
                      color: "#fb923c", cursor: "pointer", textTransform: "uppercase", letterSpacing: 0.5,
                    }}>Practice</button>
                  </div>
                </div>
                <ProgressBar value={w.accuracy} color={w.accuracy < 50 ? "#ef4444" : "#fb923c"} />
              </div>
            ))}
          </div>
        </div>

        {/* TOPIC MASTERY GRID */}
        <div className="glass-card" style={{ padding: 16, marginBottom: 16 }}>
          <span className="font-display" style={{ fontSize: 14, fontWeight: 700, display: "block", marginBottom: 14 }}>Topic Mastery</span>

          <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Maths</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
            {mathsMastery.map((t, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div style={{ position: "relative", width: 48, height: 48, margin: "0 auto 4px" }}>
                  <RingChart value={t.pct} size={48} strokeWidth={3.5} color={tierColor(t.tier)} />
                  <span style={{
                    position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 800, color: tierColor(t.tier),
                  }}>{t.pct}%</span>
                </div>
                <div style={{ fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.5)", lineHeight: 1.2 }}>{t.name}</div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Science</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
            {scienceMastery.map((t, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div style={{ position: "relative", width: 48, height: 48, margin: "0 auto 4px" }}>
                  <RingChart value={t.pct} size={48} strokeWidth={3.5} color={tierColor(t.tier)} />
                  <span style={{
                    position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 800, color: tierColor(t.tier),
                  }}>{t.pct}%</span>
                </div>
                <div style={{ fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.5)", lineHeight: 1.2 }}>{t.name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* STUDY PLAN SUMMARY */}
        <div className="glass-card-blue" style={{ padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 16 }}>📋</span>
            <span className="font-display" style={{ fontSize: 14, fontWeight: 700 }}>Study Plan</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
            {[
              { label: "Target", value: `${targetPercent}%`, color: "#3b82f6" },
              { label: "Hours/day", value: `${hoursPerDay}h`, color: "#22c55e" },
              { label: "Days left", value: `${daysLeft}`, color: "#fb923c" },
            ].map((s, i) => (
              <div key={i} style={{
                textAlign: "center", padding: "10px 6px", borderRadius: 10,
                background: "rgba(255,255,255,0.03)",
              }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: 0.5 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{
            padding: "10px 12px", borderRadius: 10, background: "rgba(59,130,246,0.08)",
            border: "1px solid rgba(59,130,246,0.15)",
          }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>Realistic Score Range</div>
            <div className="font-display" style={{ fontSize: 20, fontWeight: 800 }}>
              <span style={{ color: "#3b82f6" }}>{realisticMin}%</span>
              <span style={{ color: "rgba(255,255,255,0.2)", margin: "0 6px" }}>—</span>
              <span style={{ color: "#22c55e" }}>{realisticMax}%</span>
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>Your plan is realistic and achievable with regular study.</div>
          </div>
        </div>

        {/* RECENT ACTIVITY */}
        <div className="glass-card" style={{ padding: 16, marginBottom: 16 }}>
          <span className="font-display" style={{ fontSize: 14, fontWeight: 700, display: "block", marginBottom: 12 }}>Recent Activity</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {recentActivity.map((a, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "10px 0",
                borderBottom: i < recentActivity.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                  background: "rgba(255,255,255,0.04)", fontSize: 14, flexShrink: 0,
                }}>{a.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{a.action}</div>
                  {a.subject && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{a.subject}</div>}
                </div>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", whiteSpace: "nowrap" }}>{a.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* BADGES */}
        <div className="glass-card" style={{ padding: 16, marginBottom: 16 }}>
          <span className="font-display" style={{ fontSize: 14, fontWeight: 700, display: "block", marginBottom: 12 }}>Badges & Achievements</span>
          <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4 }}>
            {badges.map((b, i) => (
              <div key={i} style={{
                flexShrink: 0, width: 64, textAlign: "center",
                opacity: b.unlocked ? 1 : 0.3,
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12, margin: "0 auto 4px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22,
                  background: b.unlocked ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.03)",
                  border: b.unlocked ? "1px solid rgba(34,197,94,0.2)" : "1px solid rgba(255,255,255,0.06)",
                }}>
                  {b.unlocked ? b.icon : "🔒"}
                </div>
                <div style={{ fontSize: 8, fontWeight: 600, color: "rgba(255,255,255,0.5)", lineHeight: 1.2 }}>{b.name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* QUICK ACTIONS FOOTER */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[
            { label: "Trends", icon: "📈", bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.2)" },
            { label: "Chapter Hub", icon: "📚", bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.2)" },
            { label: "Mock Test", icon: "📝", bg: "rgba(168,85,247,0.08)", border: "rgba(168,85,247,0.2)" },
            { label: "Weekly Wrapped", icon: "📊", bg: "rgba(249,115,22,0.08)", border: "rgba(249,115,22,0.2)" },
          ].map((a, i) => (
            <button key={i} style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "14px 12px", borderRadius: 12, border: `1px solid ${a.border}`,
              background: a.bg, color: "#fff", fontSize: 13, fontWeight: 600,
              cursor: "pointer", fontFamily: "'Inter', sans-serif",
            }}>
              <span style={{ fontSize: 16 }}>{a.icon}</span>
              {a.label}
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}
