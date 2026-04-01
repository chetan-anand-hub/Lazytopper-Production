import { useState } from "react";
import type { WeeklyWrappedSummary, TopicPerformance, DailyCount } from "../services/weeklyWrappedGenerator";

export interface WeeklyWrappedCarouselProps {
  summary: WeeklyWrappedSummary;
  onClose: () => void;
  onShare?: () => void;
}

const GRADIENTS = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function ActivityBarChart({ dailyCounts }: { dailyCounts: DailyCount[] }) {
  const bars = dailyCounts.map((dc) => {
    const d = new Date(dc.date + "T00:00:00");
    return { label: DAY_LABELS[d.getDay()], count: dc.count };
  });
  const max = Math.max(...bars.map((b) => b.count), 1);

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80, marginTop: 16 }}>
      {bars.map((bar, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{ fontSize: 9, fontWeight: 700, opacity: 0.7 }}>{bar.count > 0 ? bar.count : ""}</div>
          <div
            style={{
              width: "100%",
              height: `${Math.max(4, (bar.count / max) * 60)}px`,
              background: bar.count > 0 ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.2)",
              borderRadius: 4,
              transition: "height 0.4s ease",
            }}
          />
          <span style={{ fontSize: 10, opacity: 0.8 }}>{bar.label}</span>
        </div>
      ))}
    </div>
  );
}

function AccuracyRing({ accuracy }: { accuracy: number }) {
  const pct = Math.round(accuracy * 100);
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div style={{ position: "relative", width: 90, height: 90 }}>
      <svg width="90" height="90" viewBox="0 0 90 90">
        <circle cx="45" cy="45" r="36" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="6" />
        <circle
          cx="45" cy="45" r="36" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="6"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 45 45)"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 20 }}>
        {pct}%
      </div>
    </div>
  );
}

function TopicBar({ topic, maxTotal }: { topic: TopicPerformance; maxTotal: number }) {
  const pct = maxTotal > 0 ? (topic.total / maxTotal) * 100 : 0;
  const name = topic.topicName || topic.topicKey.replace(/-/g, " ");

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 2 }}>
        <span style={{ textTransform: "capitalize", fontWeight: 600 }}>{name}</span>
        <span style={{ opacity: 0.8 }}>{Math.round(topic.accuracy * 100)}%</span>
      </div>
      <div style={{ height: 8, background: "rgba(255,255,255,0.15)", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "rgba(255,255,255,0.85)", borderRadius: 999, transition: "width 0.4s ease" }} />
      </div>
    </div>
  );
}

export const WeeklyWrappedCarousel: React.FC<WeeklyWrappedCarouselProps> = ({
  summary,
  onClose,
  onShare,
}) => {
  const [index, setIndex] = useState(0);

  const biggestWin = summary.biggestWinTopic;
  const focusArea = [...summary.topics].sort((a, b) => a.accuracy - b.accuracy)[0];
  const maxTopicTotal = Math.max(...summary.topics.map((t) => t.total), 1);
  const topTopics = summary.topics.slice(0, 5);

  const slides = [
    {
      title: "Your Week in Numbers",
      gradient: GRADIENTS[0],
      content: (
        <div>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", marginTop: 20 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 42, fontWeight: 900 }}>{summary.totalAttempts}</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>Questions</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 42, fontWeight: 900 }}>{summary.activeDays}</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>Active Days</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 42, fontWeight: 900 }}>{summary.estimatedStudyMinutes}</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>Minutes</div>
            </div>
          </div>
          <ActivityBarChart dailyCounts={summary.dailyCounts} />
        </div>
      ),
    },
    {
      title: "Accuracy Report",
      gradient: GRADIENTS[1],
      content: (
        <div style={{ display: "flex", alignItems: "center", gap: 24, marginTop: 16 }}>
          <AccuracyRing accuracy={summary.accuracy} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{summary.totalCorrect} / {summary.totalAttempts} correct</div>
            <div style={{ fontSize: 13, opacity: 0.85 }}>
              {summary.accuracy >= 0.8 ? "Incredible accuracy! Keep this up." :
               summary.accuracy >= 0.6 ? "Solid performance. Room to push higher." :
               "Focus on understanding, not speed. You'll improve!"}
            </div>
            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
              {(["Easy", "Medium", "Hard"] as const).map((d) => (
                <div key={d} style={{ textAlign: "center", flex: 1, padding: "4px 0", background: "rgba(255,255,255,0.12)", borderRadius: 8 }}>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>{summary.difficultyCounts[d]}</div>
                  <div style={{ fontSize: 10, opacity: 0.7 }}>{d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Topic Breakdown",
      gradient: GRADIENTS[2],
      content: (
        <div style={{ marginTop: 12 }}>
          {topTopics.length === 0 ? (
            <div style={{ opacity: 0.7, fontSize: 14 }}>No topic data yet</div>
          ) : (
            topTopics.map((t) => <TopicBar key={t.topicKey} topic={t} maxTotal={maxTopicTotal} />)
          )}
          {summary.topics.length > 5 && (
            <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>
              +{summary.topics.length - 5} more topics
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Biggest Win",
      gradient: GRADIENTS[3],
      content: biggestWin ? (
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <div style={{ fontSize: 48 }}>🏆</div>
          <div style={{ fontSize: 18, fontWeight: 800, marginTop: 8, textTransform: "capitalize" }}>
            {(biggestWin.topicName || biggestWin.topicKey).replace(/-/g, " ")}
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, marginTop: 4 }}>
            +{Math.round(biggestWin.delta * 100)}% improvement
          </div>
          <div style={{ fontSize: 13, opacity: 0.8, marginTop: 8 }}>
            {Math.round(biggestWin.firstHalfAccuracy * 100)}% → {Math.round(biggestWin.secondHalfAccuracy * 100)}% accuracy — most improved topic this week!
          </div>
        </div>
      ) : (
        <div style={{ textAlign: "center", marginTop: 20, opacity: 0.7 }}>Practice more topics to see your biggest improvement!</div>
      ),
    },
    {
      title: "Focus Area",
      gradient: GRADIENTS[4],
      content: focusArea && focusArea.accuracy < 0.8 ? (
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <div style={{ fontSize: 48 }}>🎯</div>
          <div style={{ fontSize: 18, fontWeight: 800, marginTop: 8, textTransform: "capitalize" }}>
            {(focusArea.topicName || focusArea.topicKey).replace(/-/g, " ")}
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, marginTop: 4 }}>
            {Math.round(focusArea.accuracy * 100)}% accuracy
          </div>
          <div style={{ fontSize: 13, opacity: 0.8, marginTop: 8 }}>
            Spend extra time here next week for a big boost!
          </div>
        </div>
      ) : (
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <div style={{ fontSize: 48 }}>💎</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginTop: 8 }}>All topics looking strong!</div>
          <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>Challenge yourself with harder questions next week.</div>
        </div>
      ),
    },
    {
      title: "Your Study Rhythm",
      gradient: GRADIENTS[5],
      content: (
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <div style={{ fontSize: 48 }}>⚡</div>
          <div style={{ fontSize: 14, fontWeight: 700, marginTop: 8 }}>Power Hour</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{summary.powerHourLabel}</div>
          <div style={{ fontSize: 13, opacity: 0.8, marginTop: 8 }}>
            This is when you're most productive. Own this time slot!
          </div>
          <div style={{ marginTop: 16, padding: "12px 16px", background: "rgba(255,255,255,0.12)", borderRadius: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Consistency Score</div>
            <div style={{ fontSize: 32, fontWeight: 900 }}>{summary.consistencyPercentile}%</div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>
              {summary.consistencyPercentile >= 80 ? "Top performer territory!" :
               summary.consistencyPercentile >= 50 ? "Above average. Push for top tier!" :
               "Building momentum. Every day counts!"}
            </div>
          </div>
        </div>
      ),
    },
  ];

  const slide = slides[index];
  const next = () => setIndex((i) => Math.min(i + 1, slides.length - 1));
  const prev = () => setIndex((i) => Math.max(i - 1, 0));

  return (
    <div
      style={{
        borderRadius: 20,
        overflow: "hidden",
        color: "#fff",
        position: "relative",
        minHeight: 380,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          background: slide.gradient,
          padding: "28px 24px 20px",
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.5, opacity: 0.8 }}>
              LazyTopper Weekly Wrapped
            </div>
            <h2 style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 900 }}>{slide.title}</h2>
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.7 }}>
            {index + 1}/{slides.length}
          </div>
        </div>

        <div style={{ flex: 1 }}>{slide.content}</div>

        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 16 }}>
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              style={{
                width: i === index ? 24 : 8,
                height: 8,
                borderRadius: 999,
                background: i === index ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.3)",
                border: "none",
                cursor: "pointer",
                transition: "all 0.3s ease",
                padding: 0,
              }}
            />
          ))}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "12px 24px",
          background: "rgba(0,0,0,0.15)",
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={prev}
            disabled={index === 0}
            style={{
              padding: "6px 16px",
              background: index === 0 ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.2)",
              border: "none",
              borderRadius: 8,
              color: "#fff",
              fontWeight: 600,
              fontSize: 13,
              cursor: index === 0 ? "default" : "pointer",
              opacity: index === 0 ? 0.4 : 1,
            }}
          >
            ← Prev
          </button>
          <button
            type="button"
            onClick={next}
            disabled={index === slides.length - 1}
            style={{
              padding: "6px 16px",
              background: index === slides.length - 1 ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.2)",
              border: "none",
              borderRadius: 8,
              color: "#fff",
              fontWeight: 600,
              fontSize: 13,
              cursor: index === slides.length - 1 ? "default" : "pointer",
              opacity: index === slides.length - 1 ? 0.4 : 1,
            }}
          >
            Next →
          </button>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {onShare && (
            <button
              type="button"
              onClick={onShare}
              style={{
                padding: "6px 16px",
                background: "rgba(255,255,255,0.2)",
                border: "none",
                borderRadius: 8,
                color: "#fff",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              📋 Share
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "6px 16px",
              background: "rgba(255,255,255,0.2)",
              border: "none",
              borderRadius: 8,
              color: "#fff",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
