import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "../context/ProfileContext";
import { daysLeftFromIsoDate, fetchCbseExamDate } from "../services/cbseExamDate";
import { cbseDates } from "../config/cbseDates";
import { checkAndUpdateProfile, detectProfileFromDays, getProfileSummary, getProfileConfig } from "../services/paceProfileService";

function formatIsoDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "TBD";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}


export default function Onboarding() {
  const navigate = useNavigate();
  const { loadingProfile, setProfileAndCompute } = useProfile();

  const [examDate, setExamDate] = useState("");
  const [examDateSource, setExamDateSource] = useState<"official" | "predicted">("predicted");
  const [editingDate, setEditingDate] = useState(false);
  const [customDate, setCustomDate] = useState("");
  const [isCustomDate, setIsCustomDate] = useState(false);

  const [autoDaysLeft, setAutoDaysLeft] = useState<number>(90);
  const [target, setTarget] = useState("80");
  const studentClass = "10" as const;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const staticDate =
        String(cbseDates.class10?.boardExam || "");
      const result = await fetchCbseExamDate(studentClass);
      if (cancelled) return;
      setExamDate(result.examDate || staticDate);
      setExamDateSource(result.source);
      const rawLeft = daysLeftFromIsoDate(result.examDate || staticDate);
      const left = Number.isFinite(rawLeft) && rawLeft > 0 ? rawLeft : 90;
      setAutoDaysLeft(left);
    })();
    return () => {
      cancelled = true;
    };
  }, [studentClass]);

  const applyCustomDate = () => {
    if (!customDate) return;
    const rawLeft = daysLeftFromIsoDate(customDate);
    if (!Number.isFinite(rawLeft) || rawLeft < 1) return;
    setExamDate(customDate);
    setAutoDaysLeft(rawLeft);
    setIsCustomDate(true);
    setEditingDate(false);
  };

  const resetToOfficial = () => {
    setIsCustomDate(false);
    setEditingDate(false);
    const staticDate = String(cbseDates.class10?.boardExam || "");
    void (async () => {
      const result = await fetchCbseExamDate(studentClass);
      setExamDate(result.examDate || staticDate);
      setExamDateSource(result.source);
      const rawLeft = daysLeftFromIsoDate(result.examDate || staticDate);
      setAutoDaysLeft(Number.isFinite(rawLeft) && rawLeft > 0 ? rawLeft : 90);
    })();
  };

  const handleSubmit = () => {
    const daysLeft = autoDaysLeft;
    const targetPercent = Number(target) || 80;

    const hoursPerDay = targetPercent >= 85 ? 2.5 : targetPercent >= 70 ? 2 : 1.5;
    const currentPercent = Math.max(35, targetPercent - 20);

    const nextProfile = {
      studentClass,
      daysLeft,
      targetPercent,
      hoursPerDay,
      currentPercent,
      examDate: examDate || undefined,
    };
    checkAndUpdateProfile(daysLeft);
    setProfileAndCompute(nextProfile);
    navigate("/dashboard");
  };

  if (loadingProfile) {
    return (
      <div className="dark-page">
        <div style={{ padding: "40px 20px", textAlign: "center" }}>
          <div className="glass-card" style={{ padding: 24 }}>
            <p className="font-display" style={{ fontSize: 16, fontWeight: 700 }}>Setting things up...</p>
          </div>
        </div>
      </div>
    );
  }

  const targetNum = Number(target) || 80;
  const profileType = detectProfileFromDays(autoDaysLeft);
  const config = getProfileConfig(profileType);
  const summary = getProfileSummary(profileType, autoDaysLeft);
  const profileColors: Record<string, string> = { marathon: "#3b82f6", sprint: "#f97316", crash: "#22c55e" };
  const profileColor = profileColors[profileType] || "#3b82f6";

  return (
    <div className="dark-page">
      <div style={{ padding: "16px 16px 100px", maxWidth: 480, margin: "0 auto" }}>

        <h2 className="font-display" style={{ fontSize: 24, fontWeight: 700, textAlign: "center", marginBottom: 8 }}>
          One quick question
        </h2>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", textAlign: "center", marginBottom: 28, lineHeight: 1.5 }}>
          We'll build your entire study plan from this.
        </p>

        <div className="glass-card" style={{ padding: 24, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: isCustomDate ? "#a855f7" : examDateSource === "official" ? "#22c55e" : "#f97316" }}>
              {isCustomDate ? "Your exam date" : examDateSource === "official" ? "Official exam date" : "Expected exam date"}
            </span>
            <button type="button" onClick={() => { setEditingDate(!editingDate); setCustomDate(examDate); }} style={{
              fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 6,
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.5)", cursor: "pointer",
            }}>{editingDate ? "Cancel" : "Edit"}</button>
          </div>

          {editingDate ? (
            <div style={{ marginBottom: 8 }}>
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                style={{
                  width: "100%", padding: "10px 12px", borderRadius: 10, marginBottom: 8,
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)",
                  color: "#fff", fontSize: 14, fontFamily: "'Space Grotesk', sans-serif",
                  outline: "none",
                }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={applyCustomDate} style={{
                  flex: 1, padding: "8px 0", borderRadius: 8, border: "none",
                  background: "#a855f7", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer",
                }}>Use This Date</button>
                {isCustomDate && (
                  <button type="button" onClick={resetToOfficial} style={{
                    flex: 1, padding: "8px 0", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)",
                    background: "transparent", color: "rgba(255,255,255,0.5)", fontWeight: 700, fontSize: 12, cursor: "pointer",
                  }}>Reset to Official</button>
                )}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
              <span className="font-display" style={{ fontSize: 22, fontWeight: 800 }}>{formatIsoDate(examDate)}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: profileColor }}>
                {autoDaysLeft} {autoDaysLeft === 1 ? "day" : "days"} left
              </span>
            </div>
          )}

          <div style={{
            marginTop: 12, padding: "10px 14px", borderRadius: 12,
            background: `${profileColor}10`,
            border: `1px solid ${profileColor}30`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{
                padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 800,
                background: profileColor, color: "#000",
              }}>{config.label}</span>
            </div>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.5, margin: 0 }}>{summary}</p>
          </div>

          <div style={{
            marginTop: 12, padding: "12px 14px", borderRadius: 12,
            background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)",
          }}>
            <div style={{ fontSize: 12, color: "#22c55e", fontWeight: 700, marginBottom: 4 }}>
              With {autoDaysLeft} {autoDaysLeft === 1 ? "day" : "days"} left, here's your best strategy...
            </div>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.5, margin: 0 }}>
              {autoDaysLeft <= 1
                ? "Focus on formulas, top predicted questions, and rest well tonight."
                : autoDaysLeft <= 7
                  ? "Target only high-weightage chapters and predicted questions. Skip low-priority topics."
                  : autoDaysLeft <= 30
                    ? "Follow the day-by-day revision calendar. Alternate between revision and mini-mocks."
                    : "Build strong foundations chapter by chapter. You have time to cover everything thoroughly."}
            </p>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 6 }}>
              Recommended first action: {
                autoDaysLeft <= 1 ? "Open Night Before page"
                : autoDaysLeft <= 7 ? "Start with Predicted Questions"
                : autoDaysLeft <= 30 ? "Check your Revision Calendar"
                : "Begin with your weakest chapter"
              }
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: 24, marginBottom: 20 }}>
          <label className="font-display" style={{ fontSize: 16, fontWeight: 700, display: "block", marginBottom: 16 }}>
            What score do you want in boards?
          </label>

          <div style={{ position: "relative", marginBottom: 8 }}>
            <input
              type="range"
              min="50"
              max="99"
              step="1"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              style={{
                width: "100%", height: 8,
                appearance: "none", WebkitAppearance: "none",
                background: `linear-gradient(to right, #22c55e ${((targetNum - 50) / 49) * 100}%, rgba(255,255,255,0.1) ${((targetNum - 50) / 49) * 100}%)`,
                borderRadius: 4, outline: "none", cursor: "pointer",
              }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>50%</span>
            <span className="font-display" style={{
              fontSize: 36, fontWeight: 800,
              color: targetNum >= 90 ? "#22c55e" : targetNum >= 75 ? "#3b82f6" : "#f97316",
            }}>
              {targetNum}%
            </span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>99%</span>
          </div>

          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", textAlign: "center", marginTop: 8 }}>
            {targetNum >= 90
              ? "Aiming high! We'll focus on every chapter with extra practice."
              : targetNum >= 75
                ? "Great target! We'll prioritise must-crack chapters."
                : "Solid goal! We'll make sure you cover the essentials well."}
          </p>
        </div>

        <button
          onClick={handleSubmit}
          style={{
            width: "100%", padding: "16px 0", borderRadius: 14, border: "none",
            background: "#22c55e", color: "#000", fontWeight: 800, fontSize: 17,
            fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer",
            boxShadow: "0 0 24px rgba(34,197,94,0.3)",
          }}
        >
          Build My Study Plan
        </button>

        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", textAlign: "center", marginTop: 12 }}>
          You can update your target and study preferences anytime from your profile.
        </p>
      </div>
    </div>
  );
}
