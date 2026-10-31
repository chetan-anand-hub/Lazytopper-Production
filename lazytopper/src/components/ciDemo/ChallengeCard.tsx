import { BRAND_MARK_SRC } from "../../config/brandMark";
import { CHALLENGE_COPY, type ChallengeCardModel } from "./challengeModel";
import "./friendChallenge.css";

/**
 * FRIEND-CHALLENGE-1 - the challenge image, 1080 x 1920. Renders ONLY a ChallengeCardModel (the
 * allow-listed projection in challengeModel.ts): the stem and four options as the bank has them, and
 * NO answer marker - the model does not carry the right option, so none can be drawn. Drawn off-screen
 * and turned into a PNG by runChallengeShare; the student sees the PNG before anything leaves.
 * Design reference: FriendShare.dc.html. Classes only (CLAUDE.md 7).
 */
const LETTERS = ["A", "B", "C", "D"];

export default function ChallengeCard({ model }: { model: ChallengeCardModel }) {
  const longQ = model.question.length > 170;
  const longOpts = model.options.some((o) => o.length > 60) || model.question.length + model.options.join("").length > 330;
  return (
    <div className="lt-fc" data-testid="challenge-card">
      <div className="lt-fc__disc-a" />
      <div className="lt-fc__disc-b" />
      <div className="lt-fc__col">
        <div className="lt-fc__top">
          <span className="lt-fc__brand">
            <img src={BRAND_MARK_SRC} alt="" width={40} height={40} /> LazyTopper
          </span>
          <span className="lt-fc__badge">{CHALLENGE_COPY.badge}</span>
        </div>
        <span className="lt-fc__lead" data-testid="challenge-lead">
          {model.lead}
        </span>
        <h1 className="lt-fc__head">{model.headline}</h1>
        <div className="lt-fc__card">
          <span className="lt-fc__kicker">{model.kicker}</span>
          <span className={`lt-fc__q${longQ ? " lt-fc__q--long" : ""}`} data-testid="challenge-question">
            {model.question}
          </span>
          <div className={`lt-fc__opts${longOpts ? " lt-fc__opts--long" : ""}`}>
            {model.options.map((o, i) => (
              <span key={i} className="lt-fc__opt" data-testid="challenge-option">
                {LETTERS[i]} {"·"} {o}
              </span>
            ))}
          </div>
        </div>
        <div className="lt-fc__foot">
          <div className="lt-fc__cta">{CHALLENGE_COPY.cta}</div>
          <span className="lt-fc__small">{CHALLENGE_COPY.foot}</span>
        </div>
      </div>
    </div>
  );
}
