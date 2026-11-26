/**
 * TS-FREE-SIGNEDOUT - shown in place of the paper when a SIGNED-OUT visitor submits a Test Series paper (or its clock runs out):
 * their answers are kept in this tab, and marking needs an account. No score, no record, no Mistake Intelligence - nothing is marked
 * until they sign in and submit (the existing signed-in flow).
 */
import { BACK_TO_PAPER_BUTTON, SIGN_IN_TO_MARK_BUTTON, SIGN_IN_TO_MARK_LINE, SIGN_IN_TO_MARK_TITLE } from "../../lib/testSeries/signedOutAttempt";
import "./writtenCheckGate.css";

export default function SignInToMarkCard({ onSignIn, onBack }: { onSignIn: () => void; onBack?: (() => void) | null }) {
  return (
    <div className="lt-wcg lt-wcg--signin" role="dialog" aria-labelledby="lt-wcg-signin-h" data-testid="ts-sign-in-to-mark">
      <p id="lt-wcg-signin-h" className="lt-wcg__line">
        {SIGN_IN_TO_MARK_TITLE}
      </p>
      <p className="lt-wcg__sub">{SIGN_IN_TO_MARK_LINE}</p>
      <button type="button" className="lt-wcg__btn lt-wcg__btn--block" onClick={onSignIn} data-testid="ts-sign-in-to-mark-go">
        <span className="lt-wcg__main">{SIGN_IN_TO_MARK_BUTTON}</span>
      </button>
      {onBack ? (
        <button type="button" className="lt-wcg-tutor__close" onClick={onBack} data-testid="ts-sign-in-to-mark-back">
          {BACK_TO_PAPER_BUTTON}
        </button>
      ) : null}
    </div>
  );
}
