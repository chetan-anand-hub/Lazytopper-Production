import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "../context/ProfileContext";
import { daysLeftFromIsoDate, fetchCbseExamDate } from "../services/cbseExamDate";
import { cbseDates } from "../config/cbseDates";

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
    setProfileAndCompute(nextProfile);
    navigate("/dashboard");
  };

  if (loadingProfile) {
    return (
      <div className="lt-page">
        <div className="card">
          <h3>Preparing your onboarding...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="lt-page">
      <h2 className="title center">Tell us about you</h2>

      <div className="card" data-testid="onboarding-support-cues">
        <h3 style={{ marginBottom: 8 }}>Choose your start mode</h3>
        <p className="subtitle" style={{ marginBottom: 10 }}>
          If you feel weak in basics, pick guided mode. We will keep the plan lighter and step-by-step.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            className="pill-btn"
            style={{ background: learningSupportMode === "guided" ? "#3467d6" : "#2e2e2e" }}
            onClick={applyGuidedDefaults}
          >
            Guided start (recommended)
          </button>
          <button
            type="button"
            className="pill-btn"
            style={{ background: learningSupportMode === "standard" ? "#3467d6" : "#2e2e2e" }}
            onClick={applyStandardDefaults}
          >
            Standard start
          </button>
        </div>
        <div style={{ marginTop: 10, fontSize: "0.86rem", opacity: 0.82, lineHeight: 1.55 }}>
          1. Fill quick details. 2. Generate your study strategy. 3. Start from TopicHub Learn and move to Grind + Practice.
        </div>
      </div>

      <div className="card">
        <label>Class</label>
        <select value={studentClass} disabled>
          <option value="10">Class 10 (CBSE)</option>
        </select>

        <p className="subtitle" style={{ marginTop: 12 }}>
          Approx. board exam date for Class {studentClass}:{" "}
          <strong>{formatIsoDate(examDate)}</strong>{" "}
          <span style={{ fontWeight: 700, color: examDateSource === "official" ? "#065f46" : "#92400e" }}>
            ({examDateSource})
          </span>
          <br />
          That is around{" "}
          <strong>
            {autoDaysLeft} {autoDaysLeft === 1 ? "day" : "days"}
          </strong>{" "}
          from today. You can adjust it if your school schedule differs.
          {examDateNote ? <><br />{examDateNote}</> : null}
        </p>

        <label>Days left for your board exam (editable)</label>
        <input
          type="number"
          placeholder="e.g., 40"
          value={days || String(profile?.daysLeft || autoDaysLeft)}
          onChange={(e) => setDays(e.target.value)}
        />
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 8 }}>How should we estimate your level?</h3>
        <p className="subtitle" style={{ marginBottom: 12 }}>
          We currently use board marks mode.
        </p>
        <p className="subtitle" style={{ marginTop: 4 }}>
          Diagnostic onboarding will be re-enabled after its full scoring flow lands.
        </p>
        <label>Last test / pre-board % (latest)</label>
        <input type="number" value={mark1 || String(Math.round(Number(profile?.currentPercent || 0)) || "")} onChange={(e) => setMark1(e.target.value)} placeholder="e.g., 72" />
        <label>Second last test %</label>
        <input type="number" value={mark2 || String(Math.round(Number(profile?.currentPercent || 0)) || "")} onChange={(e) => setMark2(e.target.value)} placeholder="e.g., 68" />
        <label>Third last test %</label>
        <input type="number" value={mark3 || String(Math.round(Number(profile?.currentPercent || 0)) || "")} onChange={(e) => setMark3(e.target.value)} placeholder="e.g., 65" />
      </div>

      <div className="card">
        <label>Your target percentage</label>
        <input type="number" value={target || String(profile?.targetPercent || "")} onChange={(e) => setTarget(e.target.value)} placeholder="e.g., 85" />

        <label>Hours you can study per day</label>
        <input type="number" value={hours || String(profile?.hoursPerDay || "")} onChange={(e) => setHours(e.target.value)} placeholder="e.g., 2" />

        <button className="cta-btn" onClick={handleSubmit}>
          Generate My Strategy
        </button>
      </div>
    </div>
  );
}
