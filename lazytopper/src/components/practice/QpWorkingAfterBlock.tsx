// QP-WORKING-AFTER-1 — under the score on a GRADED Quick Practice scorecard:
//   • the honesty line when a row is a review attempt (checked after the answer was seen:
//     shown to help the student learn, never added to their record);
//   • "Check this working · Question N" for working added after the set was graded.
// Display + one host callback; the host grades through its existing path. No style objects.
import "./qpWorkingAfter.css";

export const QP_REVIEW_NOTE =
  "Checked after you saw the answer. Shown here to help you learn, not added to your record.";

export interface QpWorkingAfterBlockProps {
  reviewShown: boolean;
  pending: Array<{ id: string; qNumber: number }>;
  busyId: string | null;
  error: string | null;
  onCheck: (id: string) => void;
}

export function QpWorkingAfterBlock({ reviewShown, pending, busyId, error, onCheck }: QpWorkingAfterBlockProps) {
  if (!reviewShown && pending.length === 0 && !error) return null;
  return (
    <div className="qp-wa" data-testid="qp-working-after">
      {reviewShown ? (
        <p className="qp-wa__note" data-testid="qp-review-note">
          {QP_REVIEW_NOTE}
        </p>
      ) : null}
      {pending.map((p) => (
        <button
          key={p.id}
          type="button"
          className="qp-wa__check"
          data-testid="qp-scorecard-check-now"
          disabled={!!busyId}
          onClick={() => onCheck(p.id)}
        >
          {busyId === p.id ? "Checking your working…" : `Check this working · Question ${p.qNumber}`}
        </button>
      ))}
      {error ? (
        <p className="qp-wa__err" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
