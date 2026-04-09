import { getAdaptiveLevelInfo } from "../../services/adaptivePracticeEngine";

export interface PracticeHeroProps {
  grade: string;
  subjectKey: string;
  title: string;
  topicParam: string;
  canonicalTopicKey: string;
  questionCount: number;
}

export function PracticeHero({ grade, subjectKey, title, topicParam, canonicalTopicKey, questionCount }: PracticeHeroProps) {
  return (
    <section
      style={{
        borderRadius: 16,
        padding: "20px 18px 22px",
        background: "linear-gradient(135deg, #22c55e 0%, #3b82f6 100%)",
        color: "#fff",
        boxShadow: "0 4px 0 rgba(70,163,2,0.3)",
        marginBottom: 18,
      }}
    >
      <div
        style={{
          fontSize: "0.7rem",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          opacity: 0.85,
          marginBottom: 6,
        }}
      >
        Class {grade} - {subjectKey} - Practice
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1
          style={{
            fontSize: "2rem",
            lineHeight: 1.15,
            fontWeight: 650,
            marginBottom: 6,
          }}
        >
          {title}
        </h1>
        {topicParam !== "Generic" && (() => {
          const levelInfo = getAdaptiveLevelInfo(canonicalTopicKey || topicParam);
          return (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "4px 12px",
                borderRadius: 999,
                backgroundColor: levelInfo.bgColor,
                color: levelInfo.color,
                fontSize: "0.75rem",
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              {levelInfo.emoji} {levelInfo.label}
            </span>
          );
        })()}
      </div>
      <p
        style={{
          fontSize: "0.9rem",
          lineHeight: 1.6,
          opacity: 0.96,
          maxWidth: 640,
        }}
      >
        Auto-generated{" "}
        <strong>{questionCount}</strong> questions adapted to your progress.
        Solve on paper first, then self-assess with{" "}
        <strong>"Got it"</strong> or <strong>"Need practice"</strong>.
      </p>
    </section>
  );
}
