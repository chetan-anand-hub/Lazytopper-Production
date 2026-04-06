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
  const { profile, loadingProfile, setProfileAndCompute } = useProfile();

  const [learningSupportMode, setLearningSupportMode] = useState<"guided" | "standard">("guided");

  const [examDate, setExamDate] = useState("");
  const [examDateSource, setExamDateSource] = useState<"official" | "predicted">("predicted");
  const [examDateNote, setExamDateNote] = useState("");

  const [autoDaysLeft, setAutoDaysLeft] = useState<number>(90);
  const [days, setDays] = useState<string>("90");
  const [target, setTarget] = useState("");
  const [hours, setHours] = useState("");
  const [mark1, setMark1] = useState("");
  const [mark2, setMark2] = useState("");
  const [mark3, setMark3] = useState("");
  const studentClass = "10" as const;

  const applyGuidedDefaults = () => {
    setLearningSupportMode("guided");
    setTarget((prev) => prev || "75");
    setHours((prev) => prev || "1.5");
    setMark1((prev) => prev || "55");
    setMark2((prev) => prev || "58");
    setMark3((prev) => prev || "60");
  };

  const applyStandardDefaults = () => {
    setLearningSupportMode("standard");
    setTarget((prev) => prev || "85");
    setHours((prev) => prev || "2");
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const staticDate =
        String(cbseDates.class10?.boardExam || "");
      const result = await fetchCbseExamDate(studentClass);
      if (cancelled) return;
      setExamDate(result.examDate || staticDate);
      setExamDateSource(result.source);
      setExamDateNote(String(result.note || ""));
      const left = Math.max(1, daysLeftFromIsoDate(result.examDate || staticDate));
      setAutoDaysLeft(left);
      setDays((prev) => {
        if (!prev || Number(prev) <= 0 || prev === "90") return String(left);
        return prev;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [studentClass]);

  const handleSubmit = () => {
    const daysLeft = Number(days || profile?.daysLeft || autoDaysLeft);
    const targetPercent = Number(target || profile?.targetPercent || 0);
    const hoursPerDay = Number(hours || profile?.hoursPerDay || 0);

    if (!daysLeft || !targetPercent || !hoursPerDay) {
      alert("Please fill days, target %, and hours/day with valid numbers.");
      return;
    }

    const m1 = Number(mark1);
    const m2 = Number(mark2);
    const m3 = Number(mark3);
    if (!m1 || !m2 || !m3) {
      alert("Please enter your last three test percentages.");
      return;
    }
    const currentPercent = (m1 + m2 + m3) / 3;

    const nextProfile = {
      studentClass,
      daysLeft,
      targetPercent,
      hoursPerDay,
      currentPercent,
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
            <p className="font-display" style={{ fontSize: 16, fontWeight: 700 }}>Preparing your onboarding...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dark-page">
      <div style={{ padding: "16px 16px 100px", maxWidth: 480, margin: "0 auto" }}>

        <h2 className="font-display" style={{ fontSize: 24, fontWeight: 700, textAlign: "center", marginBottom: 24 }}>Tell us about you</h2>

        <div className="glass-card" style={{ padding: 20, marginBottom: 16 }}>
          <h3 className="font-display" style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Choose your start mode</h3>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 12, lineHeight: 1.5 }}>
            If you feel weak in basics, pick guided mode. We will keep the plan lighter and step-by-step.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={applyGuidedDefaults}
              style={{
                padding: "8px 16px", borderRadius: 12, border: "none", cursor: "pointer",
                fontWeight: 700, fontSize: 13,
                background: learningSupportMode === "guided" ? "#22c55e" : "rgba(255,255,255,0.06)",
                color: learningSupportMode === "guided" ? "#000" : "rgba(255,255,255,0.5)",
                boxShadow: learningSupportMode === "guided" ? "0 0 16px rgba(34,197,94,0.3)" : "none",
              }}
            >
              Guided start (recommended)
            </button>
            <button
              type="button"
              onClick={applyStandardDefaults}
              style={{
                padding: "8px 16px", borderRadius: 12, border: "none", cursor: "pointer",
                fontWeight: 700, fontSize: 13,
                background: learningSupportMode === "standard" ? "#3b82f6" : "rgba(255,255,255,0.06)",
                color: learningSupportMode === "standard" ? "#fff" : "rgba(255,255,255,0.5)",
                boxShadow: learningSupportMode === "standard" ? "0 0 16px rgba(59,130,246,0.3)" : "none",
              }}
            >
              Standard start
            </button>
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: "rgba(255,255,255,0.35)", lineHeight: 1.55 }}>
            1. Fill quick details. 2. Generate your study strategy. 3. Start from Chapter Hub and move to Practice.
          </div>
        </div>

        <div className="glass-card" style={{ padding: 20, marginBottom: 16 }}>
          <label style={{ color: "rgba(255,255,255,0.45)", fontWeight: 700, fontSize: 13 }}>Class</label>
          <select value={studentClass} disabled style={{
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.6)", borderRadius: 12, padding: "10px 14px", width: "100%",
            fontSize: 14, fontWeight: 600, marginTop: 4,
          }}>
            <option value="10">Class 10 (CBSE)</option>
          </select>

          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 12, lineHeight: 1.6 }}>
            Approx. board exam date for Class {studentClass}:{" "}
            <strong style={{ color: "#fff" }}>{formatIsoDate(examDate)}</strong>{" "}
            <span style={{ fontWeight: 700, color: examDateSource === "official" ? "#22c55e" : "#f97316" }}>
              ({examDateSource})
            </span>
            <br />
            That is around{" "}
            <strong style={{ color: "#fff" }}>
              {autoDaysLeft} {autoDaysLeft === 1 ? "day" : "days"}
            </strong>{" "}
            from today. You can adjust it if your school schedule differs.
            {examDateNote ? <><br /><span style={{ color: "rgba(255,255,255,0.35)" }}>{examDateNote}</span></> : null}
          </p>

          <label style={{ color: "rgba(255,255,255,0.45)", fontWeight: 700, fontSize: 13, marginTop: 14 }}>Days left for your board exam (editable)</label>
          <input
            type="number"
            placeholder="e.g., 40"
            value={days || String(profile?.daysLeft || autoDaysLeft)}
            onChange={(e) => setDays(e.target.value)}
            style={{
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
              color: "#fff", borderRadius: 12, padding: "10px 14px", width: "100%",
              fontSize: 14, fontWeight: 600, marginTop: 4,
            }}
          />
        </div>

        <div className="glass-card" style={{ padding: 20, marginBottom: 16 }}>
          <h3 className="font-display" style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>How should we estimate your level?</h3>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 12, lineHeight: 1.5 }}>
            We currently use board marks mode.
          </p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginBottom: 12 }}>
            Diagnostic onboarding will be re-enabled after its full scoring flow lands.
          </p>
          {[
            { label: "Last test / pre-board % (latest)", value: mark1, setter: setMark1, placeholder: "e.g., 72" },
            { label: "Second last test %", value: mark2, setter: setMark2, placeholder: "e.g., 68" },
            { label: "Third last test %", value: mark3, setter: setMark3, placeholder: "e.g., 65" },
          ].map((field) => (
            <div key={field.label}>
              <label style={{ color: "rgba(255,255,255,0.45)", fontWeight: 700, fontSize: 13, marginTop: 10 }}>{field.label}</label>
              <input
                type="number"
                value={field.value || String(Math.round(Number(profile?.currentPercent || 0)) || "")}
                onChange={(e) => field.setter(e.target.value)}
                placeholder={field.placeholder}
                style={{
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                  color: "#fff", borderRadius: 12, padding: "10px 14px", width: "100%",
                  fontSize: 14, fontWeight: 600, marginTop: 4,
                }}
              />
            </div>
          ))}
        </div>

        <div className="glass-card" style={{ padding: 20, marginBottom: 16 }}>
          <label style={{ color: "rgba(255,255,255,0.45)", fontWeight: 700, fontSize: 13 }}>Your target percentage</label>
          <input
            type="number"
            value={target || String(profile?.targetPercent || "")}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="e.g., 85"
            style={{
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
              color: "#fff", borderRadius: 12, padding: "10px 14px", width: "100%",
              fontSize: 14, fontWeight: 600, marginTop: 4,
            }}
          />

          <label style={{ color: "rgba(255,255,255,0.45)", fontWeight: 700, fontSize: 13, marginTop: 14 }}>Hours you can study per day</label>
          <input
            type="number"
            value={hours || String(profile?.hoursPerDay || "")}
            onChange={(e) => setHours(e.target.value)}
            placeholder="e.g., 2"
            style={{
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
              color: "#fff", borderRadius: 12, padding: "10px 14px", width: "100%",
              fontSize: 14, fontWeight: 600, marginTop: 4,
            }}
          />

          {(() => {
            const daysNum = Number(days || autoDaysLeft);
            if (daysNum > 0) {
              const profileType = detectProfileFromDays(daysNum);
              const config = getProfileConfig(profileType);
              const summary = getProfileSummary(profileType, daysNum);
              const profileColors: Record<string, string> = { marathon: "#3b82f6", sprint: "#f97316", crash: "#ef4444" };
              return (
                <div style={{
                  marginTop: 16, padding: "12px 16px", borderRadius: 12,
                  background: `${profileColors[profileType]}10`,
                  border: `1px solid ${profileColors[profileType]}30`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{
                      padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 800,
                      background: profileColors[profileType], color: "#000", textTransform: "uppercase",
                    }}>{config.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: profileColors[profileType] }}>mode</span>
                  </div>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.5, margin: 0 }}>{summary}</p>
                </div>
              );
            }
            return null;
          })()}

          <button
            onClick={handleSubmit}
            style={{
              width: "100%", marginTop: 20, padding: "14px 0", borderRadius: 14, border: "none",
              background: "#22c55e", color: "#000", fontWeight: 800, fontSize: 16,
              fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer",
              boxShadow: "0 0 24px rgba(34,197,94,0.3)",
            }}
          >
            Generate My Strategy
          </button>
        </div>
      </div>
    </div>
  );
}
