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
        borderRadius: 14,
        padding: "24px",
        background: "#ffffff",
        color: "hsl(220, 25%, 12%)",
        border: "1px solid hsl(220, 18%, 90%)",
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
        marginBottom: 18,
      }}
    >
      <div
        style={{
          fontSize: "0.7rem",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "hsl(152, 55%, 32%)",
          fontWeight: 800,
          marginBottom: 6,
        }}
      >
        Class {grade} - {subjectKey} - Practice
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "2rem",
            lineHeight: 1.15,
            fontWeight: 600,
            letterSpacing: "-0.01em",
            margin: "0 0 6px",
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
                backgroundColor: levelInfo.bgColor || "hsl(152, 55%, 95%)",
                color: levelInfo.color || "hsl(152, 55%, 28%)",
                fontSize: "0.75rem",
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              {levelInfo.label}
            </span>
          );
        })()}
      </div>
      <p
        style={{
          fontSize: "0.94rem",
          lineHeight: 1.6,
          color: "hsl(220, 15%, 42%)",
          maxWidth: 760,
          margin: 0,
        }}
      >
        Board-style practice set with <strong>{questionCount}</strong> questions
        generated from available LazyTopper question sources. Attempt on paper
        first, then compare your steps and self-assess. Use Check &amp; Improve
        for real grading.
      </p>
    </section>
  );
}
