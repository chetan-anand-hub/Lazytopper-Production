import { Link } from "react-router-dom";
import { type PracticeQuestion } from "../../data/predictionDataService";
import type { StepSolutionResponse } from "../../ai/aiClient";
import { PracticeQuestionCard } from "./PracticeQuestionCard";

export interface PracticeQuestionListProps {
  isLoading: boolean;
  error: string | null;
  questions: PracticeQuestion[];
  filteredQuestions: PracticeQuestion[];
  subjectKey: string;
  topicLabel: string;
  difficultyFilter?: string;
  expandedAnswers: Record<string, boolean>;
  selfAssessments: Record<string, "got_it" | "need_practice">;
  mcqSelections: Record<string, number>;
  mcqResults: Record<string, "correct" | "wrong">;
  practiceSolutionLoading: Record<string, boolean>;
  practiceSolutionError: Record<string, string | undefined>;
  practiceSolutionData: Record<string, StepSolutionResponse>;
  onSetActiveQuestion: (id: string) => void;
  onToggleAnswer: (id: string, q?: PracticeQuestion) => void;
  onMcqSelect: (qId: string, optionIndex: number) => void;
  onMcqResult: (qId: string, result: "correct" | "wrong") => void;
  onSelfAssessGotIt: (q: PracticeQuestion, idx: number) => void;
  onSelfAssessNeedPractice: (q: PracticeQuestion, idx: number) => void;
  onOpenConceptDrawer: (q: PracticeQuestion) => void;
  onOpenMentorBoard: (q: PracticeQuestion, idx: number) => void;
}

export function PracticeQuestionList(props: PracticeQuestionListProps) {
  const {
    isLoading, error, questions, filteredQuestions, subjectKey, topicLabel, difficultyFilter,
    expandedAnswers, selfAssessments, mcqSelections, mcqResults,
    practiceSolutionLoading, practiceSolutionError, practiceSolutionData,
    onSetActiveQuestion, onToggleAnswer, onMcqSelect, onMcqResult,
    onSelfAssessGotIt, onSelfAssessNeedPractice,
    onOpenConceptDrawer, onOpenMentorBoard,
  } = props;

  return (
    <section>
      {isLoading && (
        <div
          style={{
            padding: "32px 16px",
            textAlign: "center",
            borderRadius: 14,
            background: "#ffffff",
            border: "1px solid var(--bg-card-border)",
            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: "2rem", marginBottom: 8 }}>{"\uD83D\uDCDD"}</div>
          <p style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>
            Preparing your questions...
          </p>
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
            Building a board-style set from your selected scope.
          </p>
        </div>
      )}

      {error && (
        <p style={{ fontSize: "0.85rem", color: "#ef4444", marginBottom: 8 }}>
          {error}
        </p>
      )}

      {!isLoading && !error && questions.length === 0 ? (
        <div
          style={{
            padding: "32px 16px",
            textAlign: "center",
            borderRadius: 14,
            background: "#ffffff",
            border: "1px solid var(--bg-card-border)",
            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
          }}
        >
          <div style={{ fontSize: "2rem", marginBottom: 8 }}>{"\uD83D\uDD0D"}</div>
          <p style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>
            No questions found for this topic yet
          </p>
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: 16 }}>
            This can happen if the topic name didn't match our question bank. Here's what you can do:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 320, margin: "0 auto" }}>
            <Link
              to={`/topic-hub/10/${subjectKey}`}
              style={{
                padding: "10px 16px", borderRadius: 10,
                background: "hsl(152, 55%, 45%)", border: "1px solid hsl(152, 55%, 45%)",
                color: "#ffffff", fontSize: "0.82rem", fontWeight: 700,
                textDecoration: "none", display: "block",
              }}
            >
              Browse chapters in Chapter Hub
            </Link>
            <Link
              /* SEVER PR: re-pointed off the retired /trends to live /exam-trends. */
              to={`/exam-trends`}
              style={{
                padding: "10px 16px", borderRadius: 10,
                background: "#ffffff", border: "1px solid hsl(220, 18%, 90%)",
                color: "hsl(220, 25%, 12%)", fontSize: "0.82rem", fontWeight: 700,
                textDecoration: "none", display: "block",
              }}
            >
              Pick a chapter from Exam Trends
            </Link>
            <Link
              to={`/highly-probable/10/${subjectKey}`}
              style={{
                padding: "10px 16px", borderRadius: 10,
                background: "#ffffff", border: "1px solid hsl(220, 18%, 90%)",
                color: "hsl(220, 25%, 12%)", fontSize: "0.82rem", fontWeight: 700,
                textDecoration: "none", display: "block",
              }}
            >
              Try Predicted Questions instead
            </Link>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {filteredQuestions.map((q, idx) => (
            <PracticeQuestionCard
              key={q.id}
              q={q}
              idx={idx}
              subjectKey={subjectKey}
              topicLabel={topicLabel}
              difficultyFilter={difficultyFilter}
              isOpen={!!expandedAnswers[q.id]}
              selfAssessment={selfAssessments[q.id]}
              solutionLoading={!!practiceSolutionLoading[q.id]}
              solutionError={practiceSolutionError[q.id]}
              solutionData={practiceSolutionData[q.id]}
              mcqSelection={mcqSelections[String(q.id)]}
              mcqResult={mcqResults[String(q.id)]}
              onSetActiveQuestion={(id) => onSetActiveQuestion(id)}
              onToggleAnswer={(id, question) => onToggleAnswer(id, question)}
              onMcqSelect={(qId, oi) => onMcqSelect(qId, oi)}
              onMcqResult={(qId, result) => onMcqResult(qId, result)}
              onSelfAssessGotIt={(question) => onSelfAssessGotIt(question, idx)}
              onSelfAssessNeedPractice={(question) => onSelfAssessNeedPractice(question, idx)}
              onOpenConceptDrawer={onOpenConceptDrawer}
              onOpenMentorBoard={(question) => onOpenMentorBoard(question, idx)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
