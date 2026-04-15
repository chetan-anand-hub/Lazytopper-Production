import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getHighlyProbableQuestions } from "../data/highlyProbableQuestions";
import type { HPQTopicBucket } from "../data/highlyProbableQuestions";
import { useProfile } from "../context/ProfileContext";
import { daysLeftFromIsoDate, fetchCbseExamDate } from "../services/cbseExamDate";
import { getTopicContent } from "../data/class10ContentConfig";
import { useEffect } from "react";
import ReturnContextBar from "../components/ux/ReturnContextBar";

interface DayPlan {
  day: number;
  date: string;
  dateLabel: string;
  topics: { subject: string; topic: string; weight: number }[];
  type: "revision" | "mock" | "rest";
}

function generateRevisionCalendar(daysLeft: number, examDateStr: string): DayPlan[] {
  const mathsBuckets = getHighlyProbableQuestions("Maths");
  const scienceBuckets = getHighlyProbableQuestions("Science");

  const allTopics: { subject: string; topic: string; weight: number }[] = [];

  const likelihoodScore = (l: string) => l === "Very High" ? 4 : l === "High" ? 3 : l === "Medium-High" ? 2 : 1;

  const bucketWeight = (b: HPQTopicBucket, subjectKey: "Maths" | "Science") => {
    let predictionScore = 0;
    for (const q of b.questions) {
      predictionScore += likelihoodScore(q.likelihood);
    }
    const topicConfig = getTopicContent(subjectKey, b.topic.toLowerCase().replace(/\s+/g, "-"));
    const boardWeightage = topicConfig.weightagePercent || 5;
    return predictionScore * 2 + boardWeightage;
  };

  for (const b of mathsBuckets) allTopics.push({ subject: "Maths", topic: b.topic, weight: bucketWeight(b, "Maths") });
  for (const b of scienceBuckets) allTopics.push({ subject: "Science", topic: b.topic, weight: bucketWeight(b, "Science") });

  allTopics.sort((a, b) => b.weight - a.weight);

  const calendarDays = Math.min(30, daysLeft);
  const examDate = new Date(examDateStr + "T00:00:00");
  const startDate = new Date(examDate.getTime() - calendarDays * 86400000);

  const plans: DayPlan[] = [];

  let topicIdx = 0;
  for (let d = 0; d < calendarDays; d++) {
    const currentDate = new Date(startDate.getTime() + d * 86400000);
    const dateStr = currentDate.toISOString().slice(0, 10);
    const dateLabel = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", weekday: "short" }).format(currentDate);
    const dayNum = d + 1;

    if (dayNum === calendarDays) {
      plans.push({ day: dayNum, date: dateStr, dateLabel, topics: [], type: "rest" });
      continue;
    }

    if (dayNum % 7 === 0) {
      plans.push({ day: dayNum, date: dateStr, dateLabel, topics: [], type: "mock" });
      continue;
    }

    const dayTopics: { subject: string; topic: string; weight: number }[] = [];
    const topicsPerDay = Math.max(2, Math.ceil(allTopics.length / (calendarDays - Math.floor(calendarDays / 7) - 1)));

    for (let t = 0; t < topicsPerDay && topicIdx < allTopics.length; t++) {
      dayTopics.push(allTopics[topicIdx % allTopics.length]);
      topicIdx++;
    }

    if (dayTopics.length === 0 && allTopics.length > 0) {
      dayTopics.push(allTopics[d % allTopics.length]);
    }

    plans.push({ day: dayNum, date: dateStr, dateLabel, topics: dayTopics, type: "revision" });
  }

  return plans;
}

export default function RevisionCalendarPage() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const [examDate, setExamDate] = useState("");
  const [daysLeft, setDaysLeft] = useState(30);

  useEffect(() => {
    if (profile?.examDate) {
      setExamDate(profile.examDate);
      setDaysLeft(Math.max(1, daysLeftFromIsoDate(profile.examDate)));
      return;
    }
    void (async () => {
      const result = await fetchCbseExamDate(profile?.studentClass || "10");
      setExamDate(result.examDate);
      setDaysLeft(Math.max(1, daysLeftFromIsoDate(result.examDate)));
    })();
  }, [profile?.studentClass, profile?.examDate]);

  const calendar = useMemo(() => {
    if (!examDate) return [];
    return generateRevisionCalendar(daysLeft, examDate);
  }, [daysLeft, examDate]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", paddingBottom: 80 }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: #fff !important; color: #000 !important; }
          .no-print { display: none !important; }
          .print-card { border: 1px solid #ddd !important; background: #fff !important; color: #000 !important; break-inside: avoid; }
          .print-card * { color: #000 !important; }
        }
      `}} />
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "16px 16px 32px" }}>
        <div className="no-print">
          <ReturnContextBar backTo="/dashboard" backLabel="Back to Dashboard" />
        </div>

        <div style={{
          marginTop: 24, padding: "24px 20px", borderRadius: 20,
          background: "linear-gradient(135deg, rgba(59,130,246,0.12), rgba(168,85,247,0.08))",
          border: "1px solid rgba(59,130,246,0.2)", marginBottom: 24,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h1 style={{
                fontSize: 20, fontWeight: 800, color: "var(--text)", margin: "0 0 4px",
                fontFamily: "'Space Grotesk', sans-serif",
              }}>📅 30-Day Revision Calendar</h1>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
                {Math.min(30, daysLeft)} days · weighted by prediction confidence
              </p>
            </div>
            <button
              className="no-print"
              onClick={() => window.print()}
              style={{
                padding: "8px 16px", borderRadius: 10, border: "1px solid rgba(59,130,246,0.3)",
                background: "rgba(59,130,246,0.15)", color: "#60a5fa", fontWeight: 700,
                fontSize: 12, cursor: "pointer",
              }}
            >
              🖨️ Print
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
          {calendar.map((day) => {
            const isToday = day.date === today;
            const isPast = day.date < today;
            return (
              <div
                key={day.day}
                className="print-card"
                style={{
                  padding: "14px 16px", borderRadius: 14,
                  background: isToday ? "rgba(34,197,94,0.08)" : day.type === "mock" ? "rgba(168,85,247,0.06)" : day.type === "rest" ? "rgba(249,115,22,0.06)" : "var(--bg-card)",
                  border: isToday ? "1px solid rgba(34,197,94,0.3)" : "1px solid var(--bg-card-border)",
                  opacity: isPast ? 0.5 : 1,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: day.type === "revision" ? 8 : 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 800, minWidth: 24, height: 24,
                      borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
                      background: isToday ? "#22c55e" : day.type === "mock" ? "#a855f7" : day.type === "rest" ? "#fb923c" : "var(--text-muted)",
                      color: isToday || day.type === "mock" || day.type === "rest" ? "#000" : "var(--text-muted)",
                    }}>D{day.day}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{day.dateLabel}</span>
                    {isToday && <span style={{ fontSize: 9, fontWeight: 800, color: "#22c55e", textTransform: "uppercase", letterSpacing: 0.5 }}>Today</span>}
                  </div>
                  {day.type === "mock" && <span style={{ fontSize: 11, fontWeight: 700, color: "#a855f7" }}>📝 Full Mock Test Day</span>}
                  {day.type === "rest" && <span style={{ fontSize: 11, fontWeight: 700, color: "#fb923c" }}>😴 Rest & Light Review</span>}
                </div>
                {day.type === "revision" && day.topics.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {day.topics.map((t, ti) => (
                      <span key={ti} style={{
                        fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 6,
                        background: t.subject === "Maths" ? "rgba(59,130,246,0.12)" : "rgba(34,197,94,0.12)",
                        color: t.subject === "Maths" ? "#60a5fa" : "#4ade80",
                        border: `1px solid ${t.subject === "Maths" ? "rgba(59,130,246,0.2)" : "rgba(34,197,94,0.2)"}`,
                      }}>
                        {t.topic}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="no-print" style={{ marginTop: 20 }}>
          <button
            onClick={() => navigate("/dashboard")}
            style={{
              width: "100%", padding: "14px 0", borderRadius: 12, border: "none",
              background: "rgba(59,130,246,0.15)", color: "#60a5fa", fontWeight: 700,
              fontSize: 14, fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer",
            }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
