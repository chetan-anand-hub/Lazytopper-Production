/**
 * FeedbackPrompt — FEEDBACK-1's "help us improve" card (owner ruling 18 Oct 2026).
 *
 * ★ NEVER BLOCKS THE STUDENT. A small card pinned to the bottom of the screen with NO
 * scrim: the page behind stays fully usable, nothing is focus-trapped, and the student can
 * ignore it entirely. "No thanks", the × and Escape all close it with ONE tap. Answering is
 * one tap too (a reason button submits). There is no urgency, no countdown, no price, no
 * upsell — and the thank-you contains none either.
 *
 * ★ NO `style={{}}`: a `<style>` block plus class names, the UpgradeSheet / OfferStrip
 * pattern. Targets are at least 44 px tall; the card fits a 360 px screen with 12 px gutters.
 *
 * Presentational: it reports `onAnswer(code)` / `onDismiss()` and the host decides what
 * those record. It never reads or writes storage.
 *
 * FIRST-FEEDBACK-1 — `moment="first_graded"` draws the short layout: "Was this useful?"
 * with three one-tap answers in a row (Yes / Not really / Too hard) and the ×. No
 * subtitle, no WhatsApp call offer, no text box. Every other moment is byte-unchanged.
 */
import { useEffect, useRef, useState } from "react";
import { WHATSAPP_URL } from "../../config/socialProfiles";
import {
  FEEDBACK_CALL_COPY,
  FEEDBACK_COPY,
  FEEDBACK_REASONS,
  FIRST_GRADED_ANSWERS,
  FIRST_GRADED_COPY,
  FIRST_GRADED_MOMENT,
  feedbackCallHref,
  type FeedbackMoment,
  type FeedbackReason,
} from "./feedbackPromptModel";

const FEEDBACK_PROMPT_CSS = `
  .lt-fb {
    position: fixed;
    left: 12px;
    right: 12px;
    bottom: 12px;
    z-index: 9000;
    max-width: 420px;
    margin: 0 auto;
    box-sizing: border-box;
    background: var(--lt-surface, #ffffff);
    color: var(--lt-ink, #0f2743);
    border: 1px solid rgba(73, 98, 127, 0.22);
    border-radius: 16px;
    box-shadow: 0 10px 32px rgba(9, 22, 40, 0.22);
    padding: 14px 14px 12px;
    max-height: calc(100vh - 24px);
    overflow-y: auto;
  }
  .lt-fb__head {
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }
  .lt-fb__title {
    flex: 1;
    margin: 0;
    font-size: 0.98rem;
    font-weight: 800;
    line-height: 1.35;
    color: var(--lt-ink, #0f2743);
  }
  .lt-fb__x {
    flex: none;
    width: 44px;
    height: 44px;
    margin: -10px -10px 0 0;
    border: none;
    background: transparent;
    color: var(--lt-muted, #49627f);
    font-size: 1.25rem;
    line-height: 1;
    cursor: pointer;
    border-radius: 12px;
  }
  .lt-fb__sub {
    margin: 2px 0 10px;
    font-size: 0.82rem;
    color: var(--lt-muted, #49627f);
  }
  .lt-fb__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 6px;
  }
  .lt-fb__opt {
    width: 100%;
    min-height: 44px;
    box-sizing: border-box;
    text-align: left;
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid rgba(73, 98, 127, 0.28);
    background: var(--lt-surface, #ffffff);
    color: var(--lt-ink, #0f2743);
    font-size: 0.9rem;
    font-weight: 600;
    line-height: 1.3;
    cursor: pointer;
  }
  .lt-fb__opt:hover,
  .lt-fb__opt:focus-visible {
    border-color: var(--lt-green, #16b96a);
    background: rgba(22, 185, 106, 0.08);
  }
  .lt-fb__no {
    display: block;
    margin: 8px auto 0;
    min-height: 44px;
    min-width: 44px;
    padding: 0 16px;
    border: none;
    background: transparent;
    color: var(--lt-muted, #49627f);
    font-size: 0.86rem;
    font-weight: 700;
    text-decoration: underline;
    text-underline-offset: 2px;
    cursor: pointer;
  }
  .lt-fb__thanks {
    margin: 0;
    padding: 6px 0 2px;
    font-size: 0.95rem;
    font-weight: 800;
    color: var(--lt-green-dark, #0b8f50);
  }
  .lt-fb__call {
    margin: 10px 0 0;
    padding: 10px 12px;
    border-radius: 12px;
    background: rgba(22, 185, 106, 0.08);
    border: 1px solid rgba(22, 185, 106, 0.28);
  }
  .lt-fb__call-offer {
    margin: 0;
    font-size: 0.88rem;
    font-weight: 700;
    line-height: 1.35;
    color: var(--lt-ink, #0f2743);
  }
  .lt-fb__call-note {
    margin: 2px 0 8px;
    font-size: 0.8rem;
    color: var(--lt-muted, #49627f);
  }
  .lt-fb__call-cta {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    box-sizing: border-box;
    padding: 0 14px;
    border-radius: 12px;
    background: var(--lt-green, #16b96a);
    color: #ffffff;
    font-size: 0.9rem;
    font-weight: 800;
    text-decoration: none;
  }
  .lt-fb__call-cta:focus-visible {
    outline: 2px solid var(--lt-ink, #0f2743);
    outline-offset: 2px;
  }
  .lt-fb button { font-family: inherit; }
  .lt-fb button:focus-visible {
    outline: 2px solid var(--lt-green, #16b96a);
    outline-offset: 2px;
  }
  .lt-fb__row {
    list-style: none;
    margin: 4px 0 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }
  .lt-fb__row .lt-fb__opt {
    text-align: center;
    padding: 10px 6px;
  }
  @media (min-width: 1024px) {
    .lt-fb { left: auto; right: 24px; bottom: 24px; margin: 0; width: 400px; }
  }
`;

/** How long the thank-you stays before the card closes itself. A constant, never random. */
export const FEEDBACK_THANKS_MS = 2600;

export interface FeedbackPromptProps {
  onAnswer: (reason: FeedbackReason) => void;
  onDismiss: () => void;
  /** Called once the card should be removed (after the thank-you, or right after a dismiss). */
  onDone: () => void;
  /** The student tapped the 5-minute call offer (it only opens WhatsApp; nothing is granted). */
  onCallTap?: () => void;
  /** Which moment this card asks about. Omitted -> the "help us improve" layout. */
  moment?: FeedbackMoment;
}

export function FeedbackPrompt({ onAnswer, onDismiss, onDone, onCallTap, moment }: FeedbackPromptProps) {
  const firstGraded = moment === FIRST_GRADED_MOMENT;
  const [answered, setAnswered] = useState(false);
  const settled = useRef(false);

  // Escape closes it, exactly like "No thanks" — but only while the question is up.
  const dismissRef = useRef<() => void>(() => {});
  useEffect(() => {
    if (answered) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // FIRST-FEEDBACK-1 (review fix 3): "Was this useful?" sits on top of the scorecard,
      // whose own Escape listener is on `window`. This listener is on `document`, so it runs
      // first; stopping the event here makes one Escape close only the top card (a second
      // Escape then closes the scorecard). The other moments are unchanged.
      if (firstGraded) e.stopPropagation();
      dismissRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [answered, firstGraded]);

  useEffect(() => {
    if (!answered) return;
    const t = setTimeout(onDone, FEEDBACK_THANKS_MS);
    return () => clearTimeout(t);
  }, [answered, onDone]);

  function dismiss() {
    if (settled.current) return;
    settled.current = true;
    onDismiss();
    onDone();
  }
  dismissRef.current = dismiss;

  function answer(code: FeedbackReason) {
    if (settled.current) return;
    settled.current = true;
    onAnswer(code);
    setAnswered(true);
  }

  return (
    <div
      className="lt-fb"
      role="dialog"
      aria-modal="false"
      aria-labelledby="lt-fb-title"
      data-testid="feedback-prompt"
    >
      <style>{FEEDBACK_PROMPT_CSS}</style>
      {answered ? (
        <div className="lt-fb__head">
          <p className="lt-fb__thanks" role="status" data-testid="feedback-thanks">
            {firstGraded ? FIRST_GRADED_COPY.thanks : FEEDBACK_COPY.thanks}
          </p>
          <button type="button" className="lt-fb__x" aria-label="Close" onClick={onDone}>
            ×
          </button>
        </div>
      ) : firstGraded ? (
        <>
          <div className="lt-fb__head">
            <h2 className="lt-fb__title" id="lt-fb-title">
              {FIRST_GRADED_COPY.title}
            </h2>
            <button type="button" className="lt-fb__x" aria-label="Close" onClick={dismiss} data-testid="feedback-x">
              ×
            </button>
          </div>
          <ul className="lt-fb__row" data-testid="feedback-first-graded">
            {FIRST_GRADED_ANSWERS.map((a) => (
              <li key={a.code}>
                <button
                  type="button"
                  className="lt-fb__opt"
                  onClick={() => answer(a.code)}
                  data-testid={`feedback-opt-${a.code}`}
                >
                  {a.label}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <div className="lt-fb__head">
            <h2 className="lt-fb__title" id="lt-fb-title">
              {FEEDBACK_COPY.title}
            </h2>
            <button type="button" className="lt-fb__x" aria-label="Close" onClick={dismiss} data-testid="feedback-x">
              ×
            </button>
          </div>
          <p className="lt-fb__sub">{FEEDBACK_COPY.subtitle}</p>
          <ul className="lt-fb__list">
            {FEEDBACK_REASONS.map((r) => (
              <li key={r.code}>
                <button
                  type="button"
                  className="lt-fb__opt"
                  onClick={() => answer(r.code)}
                  data-testid={`feedback-opt-${r.code}`}
                >
                  {r.label}
                </button>
              </li>
            ))}
          </ul>
          <div className="lt-fb__call" data-testid="feedback-call">
            <p className="lt-fb__call-offer">{FEEDBACK_CALL_COPY.offer}</p>
            <p className="lt-fb__call-note">{FEEDBACK_CALL_COPY.note}</p>
            <a
              className="lt-fb__call-cta"
              href={feedbackCallHref(WHATSAPP_URL)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onCallTap?.()}
              data-testid="feedback-call-cta"
            >
              {FEEDBACK_CALL_COPY.cta}
            </a>
          </div>
          <button type="button" className="lt-fb__no" onClick={dismiss} data-testid="feedback-no-thanks">
            {FEEDBACK_COPY.close}
          </button>
        </>
      )}
    </div>
  );
}

export default FeedbackPrompt;
