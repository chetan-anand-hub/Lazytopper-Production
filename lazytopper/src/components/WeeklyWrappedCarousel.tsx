import React, { useMemo, useState } from "react";
import type { WeeklyWrappedSummary } from "../services/weeklyWrappedGenerator";

export interface WeeklyWrappedCarouselProps {
  summary: WeeklyWrappedSummary;
  onClose: () => void;
  onShare?: () => void;
}

interface Slide {
  title: string;
  content: React.ReactNode;
}

export const WeeklyWrappedCarousel: React.FC<WeeklyWrappedCarouselProps> = ({
  summary,
  onClose,
  onShare,
}) => {
  const slides = useMemo<Slide[]>(
    () => [
      {
        title: "Your Week At A Glance",
        content: (
          <div>
            <p>Total attempts: {summary.totalAttempts}</p>
            <p>Correct answers: {summary.totalCorrect}</p>
            <p>Accuracy: {(summary.accuracy * 100).toFixed(1)}%</p>
            <p>Estimated study time: {summary.estimatedStudyMinutes} minutes</p>
            <p>Active days: {summary.activeDays} / 7</p>
          </div>
        ),
      },
      {
        title: "Consistency And Momentum",
        content: (
          <div>
            <p>Consistency percentile: {summary.consistencyPercentile}%</p>
            <p>Power hour: {summary.powerHourLabel}</p>
            <p>Topics conquered: {summary.topicsConquered}</p>
          </div>
        ),
      },
      {
        title: "Strong vs Weak Topics",
        content: (
          <div>
            <p>
              <strong>Strong:</strong> {summary.strongTopics.join(", ") || "None yet"}
            </p>
            <p>
              <strong>Weak:</strong> {summary.weakTopics.join(", ") || "None yet"}
            </p>
          </div>
        ),
      },
      {
        title: "Difficulty Distribution",
        content: (
          <ul>
            {Object.entries(summary.difficultyCounts).map(([level, count]) => (
              <li key={level}>
                {level}: {count}
              </li>
            ))}
          </ul>
        ),
      },
    ],
    [summary]
  );

  const [index, setIndex] = useState(0);
  const nextSlide = () => setIndex((i) => (i + 1 < slides.length ? i + 1 : i));
  const prevSlide = () => setIndex((i) => (i - 1 >= 0 ? i - 1 : 0));

  const current = slides[index];

  return (
    <div
      className="weekly-wrapped-carousel"
      style={{
        padding: "1rem",
        borderRadius: "0.75rem",
        background: "var(--bg-card)",
        border: "1px solid rgba(15,23,42,0.12)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>{current.title}</h2>
        <div>
          <button type="button" onClick={prevSlide} disabled={index === 0}>
            Prev
          </button>
          <button type="button" onClick={nextSlide} disabled={index === slides.length - 1}>
            Next
          </button>
        </div>
      </div>

      <div style={{ marginTop: "1rem" }}>{current.content}</div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "1rem",
        }}
      >
        <div>
          {slides.map((_, i) => (
            <span key={i} style={{ marginRight: "4px", fontSize: "0.8rem" }}>
              {i === index ? "[x]" : "[ ]"}
            </span>
          ))}
        </div>
        <div>
          {onShare && (
            <button type="button" onClick={onShare}>
              Share to Instagram
            </button>
          )}
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
