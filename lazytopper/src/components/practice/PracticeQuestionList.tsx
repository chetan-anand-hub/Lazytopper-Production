import { type PracticeQuestion } from "../../data/predictionDataService";
import type { StepSolutionResponse } from "../../ai/aiClient";
import { PracticeQuestionCard } from "./PracticeQuestionCard";
import { SessionProgressBar } from "./SessionProgressBar";
import type { SessionStats } from "../../services/adaptivePracticeEngine";

export interface PracticeQuestionListProps {
  isLoading: boolean;
  error: string | null;
  questions: PracticeQuestion[];
  filteredQuestions: PracticeQuestion[];
  subjectKey: string;
  topicLabel: string;
  expandedAnswers: Record<string, boolean>;
  selfAssessments: Record<string, "got_it" | "need_practice">;
  mcqSelections: Record<string, number>;
  mcqResults: Record<string, "correct" | "wrong">;
  practiceSolutionLoading: Record<string, boolean>;
  practiceSolutionError: Record<string, string | undefined>;
  practiceSolutionData: Record<string, StepSolutionResponse>;
  sessionStats: SessionStats;
  onSetActiveQuestion: (id: string) => void;
  onToggleAnswer: (id: string, q?: PracticeQuestion) => void;
  onMcqSelect: (qId: string, optionIndex: number) => void;
  onMcqResult: (qId: string, result: "correct" | "wrong") => void;
  onSelfAssessGotIt: (q: PracticeQuestion, idx: number) => void;
  onSelfAssessNeedPractice: (q: PracticeQuestion, idx: number) => void;
  onOpenConceptDrawer: (q: PracticeQuestion) => void;
  onOpenMentorSocratic: (q: PracticeQuestion, idx: number) => void;
  onOpenMentorBoard: (q: PracticeQuestion, idx: number) => void;
}

export function PracticeQuestionList(props: PracticeQuestionListProps) {
  const {
    isLoading, error, questions, filteredQuestions, subjectKey, topicLabel,
    expandedAnswers, selfAssessments, mcqSelections, mcqResults,
    practiceSolutionLoading, practiceSolutionError, practiceSolutionData,
    sessionStats,
    onSetActiveQuestion, onToggleAnswer, onMcqSelect, onMcqResult,
    onSelfAssessGotIt, onSelfAssessNeedPractice,
    onOpenConceptDrawer, onOpenMentorSocratic, onOpenMentorBoard,
  } = props;

  return (
    <section>
      {isLoading && (
        <div
          style={{
            padding: "32px 16px",
            textAlign: "center",
            borderRadius: 16,
            background: "#0a0a0a",
            border: "1px solid rgba(255,255,255,0.06)",
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: "2rem", marginBottom: 8 }}>{"\uD83D\uDCDD"}</div>
          <p style={{ fontSize: "0.95rem", fontWeight: 700, color: "rgba(255,255,255,0.85)", marginBottom: 4 }}>
            Preparing your questions...
          </p>
          <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.45)" }}>
            Picking the best questions based on your topic and difficulty level.
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
            borderRadius: 16,
            background: "#0a0a0a",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div style={{ fontSize: "2rem", marginBottom: 8 }}>{"\uD83D\uDD0D"}</div>
          <p style={{ fontSize: "0.95rem", fontWeight: 700, color: "rgba(255,255,255,0.85)", marginBottom: 4 }}>
            No questions found for this topic yet
          </p>
          <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.45)" }}>
            Try picking a different topic from the Trends page, or check back soon as we keep adding new questions.
          </p>
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
              onOpenMentorSocratic={(question) => onOpenMentorSocratic(question, idx)}
              onOpenMentorBoard={(question) => onOpenMentorBoard(question, idx)}
            />
          ))}
        </div>
      )}

      <SessionProgressBar stats={sessionStats} />
    </section>
  );
}
