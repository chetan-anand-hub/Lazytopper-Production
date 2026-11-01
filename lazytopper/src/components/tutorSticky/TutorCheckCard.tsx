import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MathText } from "../question/MathText";
import { trackTutorSticky } from "../../analytics/analytics";
import { selectBankQuestions } from "../../data/bankQuery";
import { ensureBankChapters } from "../../data/bankChapters/loader";
import { gradeCheckPick, letterOf, selectCheckQuestion, type CheckQuestion } from "../../lib/tutorSticky/checkQuestion";
import { istDay, markFixCleared, nextFix } from "../../lib/tutorSticky/dailyFix";
import { useDailyFix } from "./useDailyFix";
import "./tutorSticky.css";

export const CHECK_RIGHT_COPY = "Right — nice recovery.";
export const CHECK_RIGHT_NEUTRAL_COPY = "Right — nice work.";
export const CHECK_WRONG_COPY = "Not this one — now you know it for the exam.";

export interface TutorCheckCardProps {
  topicKey: string;
  topicLabel: string;
  subject: "maths" | "science" | "";
  /** The concept the tutor is on: the URL's `concept`, else the anchor question's subtopic. */
  concept?: string | null;
  /** The bank question the thread is about (URL `q`): its subtopic is the concept when none is given. */
  anchorId?: string | null;
  /** Bank ids already offered / anchored in this thread (never offered again). */
  excludeIds: readonly string[];
  /** The daily-fix item this thread is about (URL `fix`), if any: a right answer clears it. */
  fixKey?: string | null;
  uid?: string | null;
  /** The checked question was offered (its id), so the thread never repeats it. */
  onOffered: (id: string) => void;
  /** The student asks the tutor to explain the answer. */
  onAsk: (text: string) => void;
  /** The check finished (right, wrong) or there was nothing honest to ask (null). */
  onResolved: (correct: boolean | null) => void;
}

/**
 * TUTOR-STICKY-1 — "Every explanation ends in a one-tap check". Offered under the tutor's reply: ONE
 * similar bank question (objective, same concept when the bank has one), graded instantly on the device.
 * The bank's own key decides right and wrong; nothing is sent to a model, nothing is recorded as a grade.
 */
export default function TutorCheckCard(props: TutorCheckCardProps) {
  const { topicKey, subject, concept, anchorId, excludeIds, fixKey, uid, onOffered, onAsk, onResolved, topicLabel } = props;
  const [question, setQuestion] = useState<CheckQuestion | null | undefined>(undefined);
  const [picked, setPicked] = useState<number | null>(null);
  // Held in refs so a parent re-render never re-runs the (once per mounted card) selection.
  const excludeRef = useRef(excludeIds);
  const onOfferedRef = useRef(onOffered);
  const onResolvedRef = useRef(onResolved);
  useEffect(() => {
    excludeRef.current = excludeIds;
    onOfferedRef.current = onOffered;
    onResolvedRef.current = onResolved;
  });

  useEffect(() => {
    let live = true;
    void (async () => {
      let chosen: CheckQuestion | null = null;
      try {
        await ensureBankChapters([topicKey]);
        const rows = selectBankQuestions({
          subject: subject === "maths" ? "Maths" : subject === "science" ? "Science" : undefined,
          topicKeys: [topicKey],
          format: "MCQ",
        });
        const anchorRow = anchorId ? rows.find((r) => String(r.id) === anchorId) : undefined;
        chosen = selectCheckQuestion({
          rows,
          concept: concept || (anchorRow ? String(anchorRow.subtopic ?? "") : ""),
          excludeIds: anchorId ? [...excludeRef.current, anchorId] : excludeRef.current,
        });
      } catch {
        chosen = null; // no bank, no check: the tutor simply carries on
      }
      if (!live) return;
      setQuestion(chosen);
      if (chosen) {
        onOfferedRef.current(chosen.id);
        trackTutorSticky("tutor_check_shown", { surface: "tutor" });
      } else {
        onResolvedRef.current(null);
      }
    })();
    return () => {
      live = false;
    };
    // The selection runs once per mounted card (the parent keys the card by tutor turn).
  }, [topicKey, subject, concept, anchorId]);

  if (!question) return null;
  const answered = picked !== null;
  const correct = answered ? gradeCheckPick(question, picked) : false;

  const choose = (i: number) => {
    if (answered) return;
    setPicked(i);
    const ok = gradeCheckPick(question, i);
    if (ok) {
      trackTutorSticky("tutor_check_correct", { surface: "tutor" });
      // Only a question on the SAME concept counts as working through the lost mark; a chapter fallback does not.
      if (uid && fixKey && question.sameConcept) markFixCleared(uid, fixKey, istDay(Date.now()));
    }
    onResolvedRef.current(ok);
  };

  return (
    <section className="lt-tchk" aria-label="Quick check" data-testid="tutor-check">
      <p className="lt-tchk__kicker">
        {question.sameConcept && question.subtopic ? `Quick check · ${question.subtopic}` : `Quick check · ${topicLabel}`}
      </p>
      <div className="lt-tchk__q">
        <MathText text={question.questionText} />
      </div>
      <ul className="lt-tchk__opts" role="list">
        {question.options.map((o, i) => {
          const state = !answered ? "" : i === question.correctIndex ? " lt-tchk__opt--right" : i === picked ? " lt-tchk__opt--wrong" : "";
          return (
            <li key={i}>
              <button
                type="button"
                className={`lt-tchk__opt${state}`}
                disabled={answered}
                data-testid={`tutor-check-opt-${i}`}
                onClick={() => choose(i)}
              >
                <span className="lt-tchk__letter">{letterOf(i)}.</span>
                <span>
                  <MathText text={o} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {answered ? (
        <div role="status" data-testid="tutor-check-result">
          <p className={`lt-tchk__res ${correct ? "lt-tchk__res--right" : "lt-tchk__res--wrong"}`}>
            {correct ? (question.sameConcept ? CHECK_RIGHT_COPY : CHECK_RIGHT_NEUTRAL_COPY) : `${CHECK_WRONG_COPY} The answer is ${letterOf(question.correctIndex)}.`}
          </p>
          {!correct && question.explanation && !/^the correct answer/i.test(question.explanation) ? (
            <p className="lt-tchk__res lt-tchk__res--wrong">
              <MathText text={question.explanation} />
            </p>
          ) : null}
          {!correct ? (
            <button
              type="button"
              className="lt-tchk__btn"
              data-testid="tutor-check-explain"
              onClick={() => onAsk(`Why is the answer ${letterOf(question.correctIndex)}? Please explain simply.`)}
            >
              Explain this one
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

/**
 * TUTOR-STICKY-1 — "after the tutor explains, offer the next". Rendered only on a thread opened from the
 * daily-fix card (URL `fix`), once the explanation and its check are done: a link to the next lost mark
 * the student has not cleared today. Renders nothing when there is no next one.
 */
export function TutorNextFix({ fixKey }: { fixKey: string }) {
  const state = useDailyFix();
  const next = state && state.access === "open" ? nextFix(state.items, fixKey) : null;
  if (!next) return null;
  return (
    <section className="lt-tnext" aria-label="Next lost mark" data-testid="tutor-next-fix">
      <p className="lt-tnext__p">Next lost mark: {next.line}</p>
      <Link
        to={next.path}
        className="lt-tnext__cta"
        data-testid="tutor-next-fix-go"
        onClick={() => trackTutorSticky("tutor_daily_fix_tap", { surface: "tutor", cta: "next" })}
      >
        Fix the next one
      </Link>
    </section>
  );
}
