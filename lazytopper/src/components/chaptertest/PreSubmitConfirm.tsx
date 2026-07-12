// src/components/chaptertest/PreSubmitConfirm.tsx
//
// The integrity-critical pre-submit confirm (spec §5): submitting reveals the score,
// so it is GATED behind this dialog. It shows how many questions are unanswered /
// flagged and makes "cannot change answers, like a real exam" explicit. NO score is
// visible until the student confirms. Presentational — the page owns submit.

export default function PreSubmitConfirm({
  unanswered,
  flagged,
  onKeepWorking,
  onSubmit,
}: {
  unanswered: number;
  flagged: number;
  onKeepWorking: () => void;
  onSubmit: () => void;
}) {
  const plural = (n: number) => (n === 1 ? "" : "s");
  return (
    <div
      className="lt-ct__confirm"
      role="dialog"
      aria-modal="true"
      aria-label="Confirm submit"
      onClick={onKeepWorking}
    >
      <div className="lt-ct__confirm-box" onClick={(e) => e.stopPropagation()}>
        <h3 className="lt-ct__confirm-h lt-ct__fr">Submit your test?</h3>
        <p className="lt-ct__confirm-p">
          Once you submit you <b>cannot change answers</b> — just like a real exam. Your objective
          score is revealed only after you confirm; then you upload your written work for the full
          result.
        </p>
        {(unanswered > 0 || flagged > 0) && (
          <div className="lt-ct__confirm-warn">
            ⚠ You have <b>{unanswered} unanswered</b> and <b>{flagged} flagged</b> question
            {plural(Math.max(unanswered, flagged))}. You can still go back and review them.
          </div>
        )}
        <div className="lt-ct__confirm-row">
          <button type="button" className="lt-ct__btn lt-ct__btn--ghost" onClick={onKeepWorking}>
            Keep working
          </button>
          <button type="button" className="lt-ct__btn lt-ct__btn--primary" onClick={onSubmit}>
            Submit now →
          </button>
        </div>
      </div>
    </div>
  );
}
