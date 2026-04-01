import React, { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

import { class10MathTopicTrends } from "../../data/class10MathTopicTrends";
import { class10ScienceTopicTrends } from "../../data/class10ScienceTopicTrends";

import { predictedQuestions } from "../../data/predictedQuestions";
import { predictedScienceQuestions } from "../../data/predictedScienceQuestions";

// ✅ correct
import { generateStudyPlan } from "../../engine/studyPlanner";


// ---------------------------------------------------------------------------
// Local UI types (we decouple from the engine typings to avoid TS clashes)
// ---------------------------------------------------------------------------

type SubjectKey = "Maths" | "Science";

interface StudyBlock {
  id: string;
  description: string;
  taskTypeLabel: string;
  estimatedMinutes: number;
}

interface StudyDay {
  dayIndex: number;
  label?: string;
  targetMinutes: number;
  blocks: StudyBlock[];
}

// ---------------------------------------------------------------------------

export const StudyPlannerView: React.FC = () => {
  const location = useLocation();
  const navState = (location.state || {}) as any;

  // Defaults when opened directly; when coming from AiMentorPage
  // these are overridden by state.
  const defaultDaysLeft: number = navState.daysLeft ?? 60;
  const defaultMathHoursPerDay: number = navState.mathHoursPerDay ?? 1;
  const defaultScienceHoursPerDay: number =
    navState.scienceHoursPerDay ?? 1;
  const defaultSubject: SubjectKey = navState.subject ?? "Maths";

  const [subject, setSubject] = useState<SubjectKey>(defaultSubject);

  const daysLeft = defaultDaysLeft;

  // Daily minutes depend on which subject’s plan we are viewing.
  const dailyMinutes =
    subject === "Maths"
      ? Math.round(defaultMathHoursPerDay * 60)
      : Math.round(defaultScienceHoursPerDay * 60);

  const totalDays = daysLeft;

  // -------------------------------------------------------------------------
  // Chapter pools per subject (we just pass topic objects straight through)
  // -------------------------------------------------------------------------

  const chaptersForSubject: any[] = useMemo(() => {
    if (subject === "Science") {
      return Object.values(class10ScienceTopicTrends.topics || {});
    }
    return Object.values(class10MathTopicTrends.topics || {});
  }, [subject]);

  // -------------------------------------------------------------------------
  // Per-subject predicted question bank
  // (we deliberately relax typing here – engine is generic, UI doesn’t care)
  // -------------------------------------------------------------------------

  const predictedForSubject: any[] = useMemo(() => {
    if (subject === "Science") {
      return predictedScienceQuestions as any[];
    }
    return predictedQuestions as any[];
  }, [subject]);

  // -------------------------------------------------------------------------
  // Generate the actual study plan using the engine
  // We cast the result to StudyDay[] so TS stops whining about fields
  // like targetMinutes / id / taskTypeLabel / estimatedMinutes.
  // -------------------------------------------------------------------------

  const plan: StudyDay[] = useMemo(
    () =>
      (generateStudyPlan as any)({
        grade: 10,
        subject,
        totalDays,
        dailyMinutes,
        chapters: chaptersForSubject,
        predictedQuestions: predictedForSubject,
      }) as StudyDay[],
    [subject, totalDays, dailyMinutes, chaptersForSubject, predictedForSubject]
  );

  // -------------------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------------------

  return (
    <div className="planner-page">
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div>
          <h2>Smart Study Plan – Class 10</h2>
          <p style={{ fontSize: "0.9rem", opacity: 0.8 }}>
            Auto-generated using topic trends, HPQs and predictive papers for{" "}
            <strong>{subject}</strong>.
          </p>
          <p style={{ fontSize: "0.85rem", marginTop: 4 }}>
            Duration: <strong>{totalDays} days</strong> • Daily target:{" "}
            <strong>{dailyMinutes} min</strong>
          </p>
        </div>

        <div>
          <button
            type="button"
            className={
              "pill-button" + (subject === "Maths"
                ? " pill-button--active"
                : "")
            }
            style={{ marginRight: 8 }}
            onClick={() => setSubject("Maths")}
          >
            Maths
          </button>
          <button
            type="button"
            className={
              "pill-button" + (subject === "Science"
                ? " pill-button--active"
                : "")
            }
            onClick={() => setSubject("Science")}
          >
            Science
          </button>
        </div>
      </header>

      {plan.length === 0 && (
        <p style={{ marginTop: 16 }}>
          No plan generated. Check that topic trends and predicted questions
          are defined for <strong>{subject}</strong>.
        </p>
      )}

      <div className="planner-days">
        {plan.map((day) => (
          <div key={day.dayIndex} className="study-day-card">
            <div className="study-day-header">
              <div>
                <span className="study-day-title">
                  Day {day.dayIndex + 1}
                </span>
                {day.label && (
                  <span className="study-day-label"> · {day.label}</span>
                )}
              </div>
              <span className="study-day-minutes">
                Target: {day.targetMinutes} min
              </span>
            </div>

            <ul className="study-block-list">
              {day.blocks.map((block) => (
                <li key={block.id} className="study-block-item">
                  <div className="study-block-main">
                    <span className="study-block-chip">
                      {block.taskTypeLabel}
                    </span>
                    <span className="study-block-desc">
                      {block.description}
                    </span>
                  </div>
                  <span className="study-block-time">
                    ~{block.estimatedMinutes} min
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StudyPlannerView;
