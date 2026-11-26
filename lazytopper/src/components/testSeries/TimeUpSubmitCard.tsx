/**
 * TS-FREE-SIGNEDOUT (review nit 1) - shown in place of the paper when a kept signed-out attempt comes back after sign-in with its
 * time already run out. The answers are LOCKED (no question, option or flag is rendered, so nothing can be changed) and nothing is
 * submitted behind the student's back: they tap submit, and the existing signed-in submit runs.
 */
import { TIME_UP_BUTTON, TIME_UP_LINE, TIME_UP_TITLE } from "../../lib/testSeries/signedOutAttempt";
import "./writtenCheckGate.css";

export default function TimeUpSubmitCard({ onSubmit }: { onSubmit: () => void }) {
  return (
    <div className="lt-wcg lt-wcg--signin" role="dialog" aria-labelledby="lt-wcg-timeup-h" data-testid="ts-time-up-submit">
      <p id="lt-wcg-timeup-h" className="lt-wcg__line">
        {TIME_UP_TITLE}
      </p>
      <p className="lt-wcg__sub">{TIME_UP_LINE}</p>
      <button type="button" className="lt-wcg__btn lt-wcg__btn--block" onClick={onSubmit} data-testid="ts-time-up-submit-go">
        <span className="lt-wcg__main">{TIME_UP_BUTTON}</span>
      </button>
    </div>
  );
}
