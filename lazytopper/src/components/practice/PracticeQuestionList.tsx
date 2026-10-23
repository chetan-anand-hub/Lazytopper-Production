import { Fragment } from "react";
import { Link } from "react-router-dom";
import { type PracticeQuestion } from "../../data/predictionDataService";
import type { CheckSolutionResponse, StepSolutionResponse } from "../../ai/aiClient";
import { PracticeQuestionCard } from "./PracticeQuestionCard";
import type { SolutionCheckerSavedWorking } from "../question/SolutionChecker";
import "./practiceLoadRetry.css";
import "./practiceBankEnd.css";

export interface PracticeQuestionListProps {
  /** GUIDE-SCORE-1 — open THIS question's working box (scroll + focus); a new `nonce` is a new
   *  request. Passed straight through to that one card. */
  openCheckerFor?: { id: string; nonce: number } | null;
  isLoading: boolean;
  error: string | null;
  /** MOMENTS-1 — the set failed to load: a real "Retry" under the error re-runs the load (every
   *  student, both arms). Omitted ⇒ no button (today's error line, unchanged). */
  onRetry?: () => void;
  /** MOMENTS-1 — a Retry is in flight (the button waits). */
  retrying?: boolean;
  questions: PracticeQuestion[];
  filteredQuestions: PracticeQuestion[];
  subjectKey: string;
  topicLabel: string;
  difficultyFilter?: string;
  expandedAnswers: Record<string, boolean>;
  mcqSelections: Record<string, number>;
  mcqResults: Record<string, "correct" | "wrong">;
  practiceSolutionLoading: Record<string, boolean>;
  practiceSolutionError: Record<string, string | undefined>;
  practiceSolutionData: Record<string, StepSolutionResponse>;
  onSetActiveQuestion: (id: string) => void;
  onToggleAnswer: (id: string, q?: PracticeQuestion) => void;
  onMcqSelect: (qId: string, optionIndex: number) => void;
  onMcqResult: (qId: string, result: "correct" | "wrong") => void;
  /** The graded payload for one subjective answer, forwarded to the page (QP sessions). */
  onGraded?: (qId: string, result: CheckSolutionResponse) => void;
  /** Hand a question's concept to the Tutor, with a ticket back to this set. */
  onAskTutor?: (q: PracticeQuestion) => void;
  /**
   * ★★ WIRE-2 · COLLECT MODE, PASSED STRAIGHT THROUGH. This component holds no state and
   * makes no decision about it — it is the ONLY link between PracticePage (which owns the
   * saved answers) and PracticeQuestionCard (which renders the panel), so the props have
   * to travel through here. Omitted ⇒ every prop below is undefined and the card falls
   * back to its shipped per-question behaviour.
   */
  collectMode?: boolean;
  savedAnswers?: Record<string, SolutionCheckerSavedWorking>;
  onSaveAnswer?: (qId: string, working: SolutionCheckerSavedWorking) => void;
  onRemoveAnswer?: (qId: string) => void;
  /**
   * PRACTICE-HONESTY-1 — the host's per-question steps lock, passed straight through to
   * `PracticeQuestionCard.stepsLocked`. The host owns the rule (it alone holds every attempt
   * signal and the finished/review state). Omitted ⇒ nothing is locked (shipped behaviour).
   */
  isStepsLocked?: (qId: string) => boolean;
  /** SHW-2 — the answer box's first-selected tab, passed straight through to every card.
   *  Omitted ⇒ "upload", today's behaviour. */
  defaultAnswerMode?: "type" | "upload";
  /** MLT-MUTE-1 — the host's set came back SHORTER than asked: the verified bank has no more
   *  questions like these (the AI top-up is muted, so nothing is invented to fill the gap). The
   *  note says so honestly and offers real next steps on existing routes. Omitted ⇒ no note. */
  bankEnd?: BankEndLinks;
  /** MLT-MUTE-2 — the student's filters matched NOTHING in a pool that has questions. Shown in
   *  place of the (empty) list and never together with `bankEnd`. Omitted ⇒ no state. */
  filtersEmpty?: FiltersEmptyActions;
  /** QP-CONCEPT-2 (F2) — a concept set (Tutor / HPQ / Topic Hub) has only `after` questions on its
   *  concept; the rest are from the same chapter. The note sits after them (or above the list when 0).
   *  Omitted ⇒ no note. */
  conceptEnd?: { after: number; text: string };
}

function ConceptEndNote({ text }: { text: string }) {
  return (
    <div className="qp-bank-end" role="status" data-testid="qp-concept-end">
      <p className="qp-bank-end__title">{text}</p>
    </div>
  );
}

/** MLT-MUTE-2 — the filters-empty state's actions. */
export interface FiltersEmptyActions {
  /** Opens the existing filter editor (the toolbar's "Edit filters"). */
  onEditFilters: () => void;
  /** `/practice-hub` — omitted inside the tutor overlay. */
  practiceHubHref?: string;
}

export const FILTERS_EMPTY_TITLE = "No questions match these filters.";
export const FILTERS_EMPTY_BODY = "Try fewer filters, or another chapter.";

function FiltersEmptyState({ onEditFilters, practiceHubHref }: FiltersEmptyActions) {
  return (
    <div className="qp-bank-end" role="status" data-testid="qp-filters-empty">
      <p className="qp-bank-end__title">{FILTERS_EMPTY_TITLE}</p>
      <p className="qp-bank-end__body">{FILTERS_EMPTY_BODY}</p>
      <div className="qp-bank-end__actions">
        <button
          type="button"
          className="qp-bank-end__btn qp-bank-end__btn--primary"
          data-testid="qp-filters-empty-edit"
          onClick={onEditFilters}
        >
          Edit filters
        </button>
        {practiceHubHref ? (
          <Link to={practiceHubHref} className="qp-bank-end__btn" data-testid="qp-filters-empty-practice-hub">
            Practise another chapter
          </Link>
        ) : null}
      </div>
    </div>
  );
}

/** MLT-MUTE-1 — the honest end-of-bank note's real next steps (routes that exist in App.tsx). */
export interface BankEndLinks {
  /** `/chapter-test/:grade/:subject/:topicKey` — omitted for a multi-chapter set. */
  chapterTestHref?: string;
  /** `/practice-hub` — pick another chapter's question set or a Quick Practice. */
  practiceHubHref: string;
}

/** The copy, exported so tests pin the exact words (owner ruling 2026-10-22). */
export const BANK_END_TITLE = "That's every question we have like this for now.";
export const BANK_END_BODY = "We only serve checked questions from our bank, so the set stops here instead of being padded with unchecked ones.";

function BankEndNote({ chapterTestHref, practiceHubHref }: BankEndLinks) {
  return (
    <div className="qp-bank-end" role="status" data-testid="qp-bank-end">
      <p className="qp-bank-end__title">{BANK_END_TITLE}</p>
      <p className="qp-bank-end__body">{BANK_END_BODY}</p>
      <div className="qp-bank-end__actions">
        {chapterTestHref ? (
          <Link to={chapterTestHref} className="qp-bank-end__btn qp-bank-end__btn--primary" data-testid="qp-bank-end-chapter-test">
            Take the Chapter Test
          </Link>
        ) : null}
        <Link to={practiceHubHref} className="qp-bank-end__btn" data-testid="qp-bank-end-practice-hub">
          Practise another chapter
        </Link>
      </div>
    </div>
  );
}

export function PracticeQuestionList(props: PracticeQuestionListProps) {
  const {
    isLoading, error, questions, filteredQuestions, subjectKey, topicLabel, difficultyFilter,
    expandedAnswers, mcqSelections, mcqResults,
    practiceSolutionLoading, practiceSolutionError, practiceSolutionData,
    onSetActiveQuestion, onToggleAnswer, onMcqSelect, onMcqResult, onGraded, onAskTutor,
    collectMode, savedAnswers, onSaveAnswer, onRemoveAnswer, isStepsLocked, defaultAnswerMode,
    onRetry, retrying, bankEnd, filtersEmpty, conceptEnd, openCheckerFor,
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
      {error && onRetry ? (
        <button
          type="button"
          className="qp-load-retry"
          data-testid="qp-load-retry"
          disabled={!!retrying}
          onClick={onRetry}
        >
          {retrying ? "Retrying…" : "Retry"}
        </button>
      ) : null}

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
              Try Important Questions instead
            </Link>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {filteredQuestions.map((q, idx) => (
            <Fragment key={q.id}>
            {conceptEnd && !isLoading && !error && conceptEnd.after === idx ? (
              <ConceptEndNote text={conceptEnd.text} />
            ) : null}
            <PracticeQuestionCard
              q={q}
              idx={idx}
              openCheckerRequest={openCheckerFor && openCheckerFor.id === String(q.id) ? openCheckerFor.nonce : undefined}
              subjectKey={subjectKey}
              topicLabel={topicLabel}
              difficultyFilter={difficultyFilter}
              isOpen={!!expandedAnswers[q.id]}
              solutionLoading={!!practiceSolutionLoading[q.id]}
              solutionError={practiceSolutionError[q.id]}
              solutionData={practiceSolutionData[q.id]}
              mcqSelection={mcqSelections[String(q.id)]}
              mcqResult={mcqResults[String(q.id)]}
              onSetActiveQuestion={(id) => onSetActiveQuestion(id)}
              onToggleAnswer={(id, question) => onToggleAnswer(id, question)}
              onMcqSelect={(qId, oi) => onMcqSelect(qId, oi)}
              onMcqResult={(qId, result) => onMcqResult(qId, result)}
              onGraded={onGraded}
              onAskTutor={onAskTutor}
              collectMode={collectMode}
              savedAnswer={savedAnswers ? savedAnswers[String(q.id)] ?? null : null}
              onSaveAnswer={onSaveAnswer}
              onRemoveAnswer={onRemoveAnswer}
              stepsLocked={isStepsLocked ? isStepsLocked(String(q.id)) : false}
              defaultAnswerMode={defaultAnswerMode}
            />
            </Fragment>
          ))}
          {filtersEmpty && !isLoading && !error && filteredQuestions.length === 0 ? (
            <FiltersEmptyState {...filtersEmpty} />
          ) : bankEnd && !isLoading && !error && filteredQuestions.length > 0 ? (
            <BankEndNote {...bankEnd} />
          ) : null}
        </div>
      )}
    </section>
  );
}
