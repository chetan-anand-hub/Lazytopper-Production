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
 * FIRST-FEEDBACK-1 / FEEDBACK-2 — the graded moments (`first_graded`, `after_graded`) draw
 * "Was this useful?" with Ziggy, four one-tap answers, and a next step that leads somewhere
 * (GradedFeedbackCard.tsx). Every other moment is byte-unchanged.
 */
import { Component, Suspense, lazy, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { lazyWithRetry } from "../../lib/lazyWithRetry";
import { WHATSAPP_URL } from "../../config/socialProfiles";
import { anyMascotHost, mascotHostsVersion, subscribeMascotHosts } from "../guide/mascotPresence";
import { FeedbackShownNote, useNudgeAppearance } from "./feedbackBudget";
import { isSidebarMascot } from "./feedbackMascots";
import {
  FEEDBACK_CALL_COPY,
  FEEDBACK_COPY,
  FEEDBACK_REASONS,
  feedbackCallHref,
  isGradedMoment,
  type FeedbackMoment,
  type FeedbackNextAction,
  type FeedbackReason,
  type FirstGradedAnswer,
} from "./feedbackPromptModel";
import type { GradedFeedbackContext } from "./gradedFeedbackFlow";

// FEEDBACK-NUDGE-1: `.lt-fb--rise` is a short slide-up so the card is noticed; the class is only added when the
// device has not asked for less motion (and the keyframes sit under no-preference as well).
const FEEDBACK_PROMPT_CSS = `
  .lt-fb {
    position: fixed;
    left: 12px;
    right: 12px;
    bottom: calc(12px + env(safe-area-inset-bottom, 0px));
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
    max-height: calc(100vh - 24px - env(safe-area-inset-bottom, 0px));
    overflow-y: auto;
  }
  @media (prefers-reduced-motion: no-preference) {
    .lt-fb--rise { animation: lt-fb-rise 250ms ease-out both; }
    @keyframes lt-fb-rise {
      from { transform: translateY(calc(100% + 24px)); opacity: 0; }
    }
  }
  .lt-fb__head {
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }
  .lt-fb__head--z { align-items: center; }
  .lt-fb .lt-fbg__z { width: 48px; height: 48px; flex: none; }
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
  @media (max-width: 400px), (max-height: 700px) {
    .lt-fb { padding: 10px 10px 2px; }
    .lt-fb__title { font-size: 0.9rem; line-height: 1.25; }
    .lt-fb__sub { margin: 0 0 6px; font-size: 0.78rem; }
    .lt-fb__list { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
    .lt-fb__opt { padding: 5px 8px; font-size: 0.8rem; line-height: 1.2; }
    .lt-fb__call { margin-top: 6px; padding: 7px 10px; }
    .lt-fb__call-offer { font-size: 0.8rem; line-height: 1.25; }
    .lt-fb__call-note { margin: 1px 0 6px; font-size: 0.74rem; }
    .lt-fb__no { margin-top: 0; }
    .lt-fb .lt-fbg__z { width: 36px; height: 36px; }
  }
  @media (min-width: 1024px) {
    .lt-fb { left: auto; right: 24px; bottom: calc(24px + env(safe-area-inset-bottom, 0px)); margin: 0; width: 400px; }
  }
`;

/** Ziggy's drawing (its own small chunk, shared with the graded card). Decorative; never speaks. */
const FeedbackZiggy = lazy(() => import("./FeedbackZiggy"));

/** FEEDBACK-NUDGE-1: slide in only when the device has not asked for reduced motion (no matchMedia -> no motion). */
function motionAllowed(): boolean {
  try {
    return typeof window !== "undefined" && typeof window.matchMedia === "function" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

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
  /** FEEDBACK-2 (graded moments only) — what the scorecard handed in. Omitted: an answer just says thanks. */
  flow?: GradedFeedbackContext | null;
  /** FEEDBACK-2 (graded moments only) — draw Ziggy. Default true; false = the plain card. */
  withZiggy?: boolean;
  /** FEEDBACK-2 (graded moments only) — a next-step button was tapped (the host records its NAME). */
  onNext?: (action: FeedbackNextAction) => void;
  /** FEEDBACK-2 (graded moments only) — save the optional note; true when kept. */
  onSaveNote?: (kind: "marks" | "other", text: string) => Promise<boolean>;
  /** FEEDBACK-2 (graded moments only) — the card is naming where to tap on the page the scorecard opened. */
  onHandOff?: () => void;
}

/**
 * PERF-3: the graded card (its copy, flow and CSS) is its own chunk, loaded only when a graded
 * "Was this useful?" is actually shown - this module is in the entry (the paywall prompt uses it).
 */
const GradedFeedbackCard = lazyWithRetry(() => import("./GradedFeedbackCard"));

/** A chunk that will not load shows NOTHING (never a crash): the host is told so it can clean up. */
export class CardChunkGuard extends Component<{ children: ReactNode; onFail: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFail();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function FeedbackPrompt(props: FeedbackPromptProps) {
  if (isGradedMoment(props.moment)) {
    return (
      <CardChunkGuard onFail={props.onDone}>
        <Suspense fallback={null}>
          <GradedFeedbackCard
            moment={props.moment}
            ctx={props.flow ?? null}
            withZiggy={props.withZiggy !== false}
            onAnswer={(code: FirstGradedAnswer) => props.onAnswer(code)}
            onDismiss={props.onDismiss}
            onNext={(a) => props.onNext?.(a)}
            onSaveNote={(k, t) => (props.onSaveNote ? props.onSaveNote(k, t) : Promise.resolve(false))}
            onDone={props.onDone}
            onHandOff={props.onHandOff}
          />
        </Suspense>
      </CardChunkGuard>
    );
  }
  return <ImproveFeedbackPrompt {...props} />;
}

const noop = () => {};

function ImproveFeedbackPrompt({ onAnswer, onDismiss, onDone, onCallTap, withZiggy }: FeedbackPromptProps) {
  const [answered, setAnswered] = useState(false);
  const [rise] = useState(motionAllowed);
  const root = useRef<HTMLDivElement | null>(null);

  // Ziggy beside the question: an unprompted, companion-priority appearance. Only while the question is up, only
  // when the host asked for him (the paywall / trial-end moments) and no other mascot is on screen (one at a time),
  // and drawn only once the H3 budget has CONFIRMED a slot. The slot is spent when his drawing commits and is given
  // back on unmount. No slot / hidden mascots -> today's plain card.
  useSyncExternalStore(subscribeMascotHosts, mascotHostsVersion, mascotHostsVersion);
  const othersPresent = anyMascotHost((el) => !root.current?.contains(el) && !isSidebarMascot(el));
  const wantsZiggy = withZiggy === true && !answered && !othersPresent;
  const budgetKey = useNudgeAppearance(wantsZiggy);
  const showZiggy = wantsZiggy && budgetKey !== null;
  const settled = useRef(false);

  // Escape closes it, exactly like "No thanks" — but only while the question is up.
  const dismissRef = useRef<() => void>(() => {});
  useEffect(() => {
    if (answered) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      dismissRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [answered]);

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
      ref={root}
      className={`lt-fb${rise ? " lt-fb--rise" : ""}`}
      role="dialog"
      aria-modal="false"
      aria-labelledby="lt-fb-title"
      data-testid="feedback-prompt"
    >
      <style>{FEEDBACK_PROMPT_CSS}</style>
      {answered ? (
        <div className="lt-fb__head">
          <p className="lt-fb__thanks" role="status" data-testid="feedback-thanks">
            {FEEDBACK_COPY.thanks}
          </p>
          <button type="button" className="lt-fb__x" aria-label="Close" onClick={onDone}>
            ×
          </button>
        </div>
      ) : (
        <>
          <div className={`lt-fb__head${showZiggy ? " lt-fb__head--z" : ""}`}>
            {showZiggy && (
              <CardChunkGuard onFail={noop}>
                <Suspense fallback={<span className="lt-fbg__z" aria-hidden="true" />}>
                  <FeedbackZiggy />
                  <FeedbackShownNote kind={budgetKey} />
                </Suspense>
              </CardChunkGuard>
            )}
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
