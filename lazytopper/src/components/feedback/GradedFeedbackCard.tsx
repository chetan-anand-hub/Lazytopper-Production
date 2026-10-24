/**
 * GradedFeedbackCard — FEEDBACK-2's "Was this useful?" with Ziggy, where every answer leads somewhere.
 * (Owner rulings 24 Oct 2026; the design is FEEDBACK-2 spec §2.)
 *
 *   Step 1  Ziggy (happy, small, beside the bubble): "Was this useful?" — Yes · Too easy · Too hard · Not really.
 *   Step 2  Ziggy reacts in ONE line, then 1-2 buttons that go to a real page, and "Close".
 *   Step 3  "Not really" -> what was missing: four choices and "Back". Two of them open the note form.
 *   Note    "Tell us more": a PLAIN form (no Ziggy — a character never takes free-text input). Max 500
 *           characters, Send / Skip, saved privately to the student's own account.
 *
 * ★ NEVER LOST / NEVER BLOCKS. No scrim, no focus trap, the page behind stays usable. "Close", the ×
 *   and Escape always return the student to the scorecard untouched. A button closes the card and
 *   navigates with the ROUTER's navigate (handed in by the scorecard) — this card lives in its own React
 *   root, so there is no router here and `window.location` is never used.
 * ★ ZIGGY IS OPTIONAL. `withZiggy={false}` (mascots hidden, or another mascot already on screen) draws
 *   the same flow as a plain card: the same words, the same buttons, no character. Even when he is
 *   drawn he steps aside the instant ANOTHER mascot appears (the scorecard's own Ziggy / Byte, which
 *   load lazily and may arrive after this card) - one character on screen at a time (COMPANION-1,
 *   guide/mascotPresence.ts). The H3 budget (feedbackBudget.ts) reserves a slot, and spends it only when he is actually drawn.
 * ★ NO `style={{}}`: a `<style>` block and class names. Targets >= 44 px. Below 1440 px it is drawn IN
 *   FLOW at the end of the scorecard sheet (the scorecard's `data-lt-feedback-slot`, below its buttons) so
 *   it can never cover them; with no slot it falls back to the fixed panel. From 1440 px up (and with no
 *   slot) a fixed bottom-right panel; on a phone that fallback is a bottom sheet of at most 50% of the screen.
 * ★ PERF-3: this module is its own chunk, loaded by FeedbackPrompt only when a graded card is shown.
 *
 * Presentational: it reports `onAnswer` / `onDismiss` / `onNext` / `onSaveNote`; the host decides what
 * those record. It never reads or writes storage and never calls analytics itself.
 */
import { Suspense, lazy, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { anyMascotHost, mascotHostsVersion, subscribeMascotHosts } from "../guide/mascotPresence";
import { isSidebarMascot } from "./feedbackMascots";
import { FeedbackShownNote, useFeedbackAppearance } from "./feedbackBudget";
import {
  FIRST_GRADED_ANSWERS,
  FIRST_GRADED_COPY,
  type FeedbackNextAction,
  type FirstGradedAnswer,
  type GradedMoment,
} from "./feedbackPromptModel";
import {
  FEEDBACK_NOTE_MAX,
  GRADED_FEEDBACK_COPY as COPY,
  NOT_REALLY_REASONS,
  cleanNoteText,
  nextStepFor,
  notReallyOutcome,
  type GradedFeedbackContext,
  type GradedNextStep,
  type NotReallyReason,
} from "./gradedFeedbackFlow";

const FeedbackZiggy = lazy(() => import("./FeedbackZiggy"));

const GRADED_CARD_CSS = `
  .lt-fbg {
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
    padding: 12px 14px 10px;
    max-height: 50vh;
    overflow-y: auto;
    overscroll-behavior: contain;
  }
  .lt-fbg button, .lt-fbg textarea { font-family: inherit; }
  .lt-fbg button:focus-visible, .lt-fbg textarea:focus-visible {
    outline: 2px solid var(--lt-green, #16b96a);
    outline-offset: 2px;
  }
  .lt-fbg__head { display: flex; align-items: center; gap: 8px; }
  .lt-fbg__z { width: 56px; height: 56px; flex: none; }
  .lt-fbg__say {
    flex: 1;
    min-width: 0;
    margin: 0;
    font-size: 0.98rem;
    font-weight: 800;
    line-height: 1.35;
    color: var(--lt-ink, #0f2743);
  }
  .lt-fbg__x {
    flex: none;
    width: 44px;
    height: 44px;
    margin: -6px -8px 0 0;
    border: none;
    background: transparent;
    color: var(--lt-muted, #49627f);
    font-size: 1.25rem;
    line-height: 1;
    cursor: pointer;
    border-radius: 12px;
  }
  .lt-fbg__grid {
    list-style: none;
    margin: 6px 0 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  .lt-fbg__stack { list-style: none; margin: 8px 0 0; padding: 0; display: grid; gap: 8px; }
  .lt-fbg__opt {
    width: 100%;
    min-height: 44px;
    box-sizing: border-box;
    text-align: center;
    padding: 10px 8px;
    border-radius: 12px;
    border: 1px solid rgba(73, 98, 127, 0.28);
    background: var(--lt-surface, #ffffff);
    color: var(--lt-ink, #0f2743);
    font-size: 0.9rem;
    font-weight: 700;
    line-height: 1.3;
    cursor: pointer;
  }
  .lt-fbg__stack .lt-fbg__opt { text-align: left; }
  .lt-fbg__opt:hover, .lt-fbg__opt:focus-visible {
    border-color: var(--lt-green, #16b96a);
    background: rgba(22, 185, 106, 0.08);
  }
  .lt-fbg__opt--primary {
    background: var(--lt-green, #16b96a);
    border-color: var(--lt-green, #16b96a);
    color: #ffffff;
  }
  .lt-fbg__opt--primary:hover, .lt-fbg__opt--primary:focus-visible { background: var(--lt-green-dark, #0b8f50); border-color: var(--lt-green-dark, #0b8f50); }
  .lt-fbg__foot { display: flex; justify-content: center; gap: 8px; margin-top: 4px; }
  .lt-fbg__link {
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
  .lt-fbg__title { margin: 0; font-size: 1rem; font-weight: 800; line-height: 1.35; flex: 1; min-width: 0; }
  .lt-fbg__hint { margin: 4px 0 8px; font-size: 0.84rem; color: var(--lt-muted, #49627f); }
  .lt-fbg__label { display: block; margin: 0 0 4px; font-size: 0.82rem; font-weight: 700; }
  .lt-fbg__ta {
    display: block;
    width: 100%;
    box-sizing: border-box;
    min-height: 88px;
    resize: vertical;
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid rgba(73, 98, 127, 0.4);
    background: var(--lt-surface, #ffffff);
    color: var(--lt-ink, #0f2743);
    font-size: 1rem;
    line-height: 1.4;
  }
  .lt-fbg__count { margin: 2px 0 0; text-align: right; font-size: 0.76rem; color: var(--lt-muted, #49627f); }
  .lt-fbg__err { margin: 6px 0 0; font-size: 0.84rem; font-weight: 700; color: #b3261e; }
  .lt-fbg__send { margin-top: 8px; }
  .lt-fbg__send[disabled] { opacity: 0.5; cursor: not-allowed; }
  .lt-fbg__thanks { margin: 0; flex: 1; padding: 6px 0 2px; font-size: 0.95rem; font-weight: 800; color: var(--lt-green-dark, #0b8f50); }
  @media (min-width: 1024px) {
    .lt-fbg { left: auto; right: 24px; bottom: 24px; margin: 0; width: 400px; max-height: calc(100vh - 48px); }
  }
  /* Below 1440 px the card sits IN FLOW in the scorecard's slot, below its buttons: it can never cover them (the scorecard is centred, so a bottom-right panel would reach its second button between 1024 and ~1390 px). Declared AFTER the desktop rule so it wins. */
  .lt-fbg--flow {
    position: static;
    width: auto;
    max-width: none;
    margin: 0;
    border: none;
    border-top: 1px solid rgba(73, 98, 127, 0.22);
    border-radius: 0;
    box-shadow: none;
    max-height: none;
    overflow: visible;
    padding: 14px 20px 18px;
    animation: none;
  }
  @media (prefers-reduced-motion: no-preference) {
    .lt-fbg { animation: lt-fbg-in 160ms ease-out; }
    @keyframes lt-fbg-in { from { transform: translateY(12px); opacity: 0; } to { transform: none; opacity: 1; } }
  }
`;

/** How long a thank-you / saved message stays before the card closes itself. A constant, never random. */
export const GRADED_THANKS_MS = 2600;

type Step =
  | { t: "ask" }
  | { t: "next"; answer: Exclude<FirstGradedAnswer, "not_really">; plan: GradedNextStep }
  | { t: "why" }
  | { t: "note"; noteKind: "marks" | "other"; title: string; hint: string }
  | { t: "thanks"; text: string };

const PHONE_QUERY = "(max-width: 1439px)";
function phoneNow(): boolean {
  try {
    return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(PHONE_QUERY).matches;
  } catch {
    return false;
  }
}

export interface GradedFeedbackCardProps {
  moment: GradedMoment;
  /** What the scorecard handed in. Null: no flow (an answer just says thanks), like the original card. */
  ctx: GradedFeedbackContext | null;
  /** Draw Ziggy. False: mascots hidden, or another mascot already on screen — the same flow, plain. */
  withZiggy: boolean;
  onAnswer: (code: FirstGradedAnswer) => void;
  onDismiss: () => void;
  /** A button that leads somewhere was tapped (the host records its NAME only). */
  onNext: (action: FeedbackNextAction) => void;
  /** Save the note; resolves true when it was kept. The text goes nowhere else. */
  onSaveNote: (kind: "marks" | "other", text: string) => Promise<boolean>;
  /** The card should be removed. */
  onDone: () => void;
  /** The card is naming where to tap on the page the scorecard opened, so it outlives that scorecard briefly. */
  onHandOff?: () => void;
}

export function GradedFeedbackCard({ moment, ctx, withZiggy, onAnswer, onDismiss, onNext, onSaveNote, onDone, onHandOff }: GradedFeedbackCardProps) {
  const [step, setStep] = useState<Step>({ t: "ask" });
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  const settled = useRef(false);
  const lastCode = useRef<FirstGradedAnswer | null>(null);
  const noteKindRef = useRef<"marks" | "other" | null>(null);
  const [phone, setPhone] = useState(phoneNow);
  const [floating, setFloating] = useState(false);
  const root = useRef<HTMLDivElement | null>(null);
  const stepKey = step.t === "next" ? `next:${step.answer}` : step.t;

  // Escape: at the question it is a dismiss; anywhere later it just closes. It sits over the
  // scorecard (whose own Escape listener is on `window`), so one Escape closes only this card.
  const escRef = useRef<() => void>(() => {});
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      escRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Narrower than 1440 px -> in flow; a wide desktop -> the bottom-right panel. Follows a resize / rotation.
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(PHONE_QUERY);
    const on = () => setPhone(mq.matches);
    on();
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);

  // A thank-you closes itself.
  useEffect(() => {
    if (step.t !== "thanks") return;
    const t = setTimeout(onDone, GRADED_THANKS_MS);
    return () => clearTimeout(t);
  }, [step.t, onDone]);

  // After a tap moves the card to its next step, put keyboard focus on that step's first control.
  // (Never on the very first render: the card must not steal focus from the scorecard.)
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const el = root.current?.querySelector<HTMLElement>("[data-autofocus]");
    el?.focus();
  }, [stepKey]);

  function dismiss() {
    if (settled.current) {
      onDone(); // already answered (the student came Back): the × is a plain close
      return;
    }
    settled.current = true;
    onDismiss();
    onDone();
  }
  // Esc in the note form goes BACK to the question list and keeps what was typed; elsewhere it closes.
  escRef.current = step.t === "ask" ? dismiss : step.t === "note" ? () => setStep({ t: "why" }) : onDone;

  function answer(code: FirstGradedAnswer) {
    if (lastCode.current !== code) onAnswer(code);
    lastCode.current = code;
    settled.current = true; // answered: the × is now a plain close, never a "dismissed"
    if (!ctx) {
      setStep({ t: "thanks", text: COPY.thanks });
      return;
    }
    if (code === "not_really") setStep({ t: "why" });
    else setStep({ t: "next", answer: code, plan: nextStepFor(code, ctx) });
  }

  function tap(action: FeedbackNextAction, run: () => void) {
    onNext(action);
    try {
      run();
    } finally {
      onDone();
    }
  }

  function chooseWhy(reason: NotReallyReason) {
    if (!ctx) return;
    const out = notReallyOutcome(reason, ctx);
    if (out.kind === "go") tap(out.button.action, out.button.run);
    else if (out.kind === "missed") {
      // Quick Practice, a missed MCQ: open that question (its own "Report issue" form) and say where to tap.
      // The scorecard goes away with this tap, so the card is handed off and floats for its few seconds.
      onHandOff?.();
      setFloating(true);
      setStep({ t: "thanks", text: out.line });
      out.run();
    } else if (out.kind === "note") {
      if (noteKindRef.current !== out.noteKind) setText(""); // coming Back to the same box keeps what was typed
      noteKindRef.current = out.noteKind;
      setFailed(false);
      setStep({ t: "note", noteKind: out.noteKind, title: out.title, hint: out.hint });
    } else onDone();
  }

  async function send() {
    if (step.t !== "note" || sending) return;
    const clean = cleanNoteText(text);
    if (!clean) return;
    setSending(true);
    setFailed(false);
    let ok = false;
    try {
      ok = await onSaveNote(step.noteKind, clean);
    } catch {
      ok = false;
    }
    setSending(false);
    if (ok) setStep({ t: "thanks", text: COPY.note.saved });
    else setFailed(true);
  }

  // One character on screen at a time: Ziggy steps aside while a mascot that is NOT his own is drawn.
  useSyncExternalStore(subscribeMascotHosts, mascotHostsVersion, mascotHostsVersion);
  const othersPresent = anyMascotHost((el) => !root.current?.contains(el) && !isSidebarMascot(el));
  // The H3 budget (MOMENTS-3) limits the CHARACTER, never the question: a slot is reserved while Ziggy is
  // wanted, he is drawn only once it is confirmed, the slot is spent when his drawing has committed
  // (FeedbackShownNote, inside the Suspense) and is given back on unmount. No slot left -> the same
  // card, plain. Hidden mascots -> plain, nothing counted.
  const wantsZiggy = withZiggy && !othersPresent && step.t !== "note";
  const budgetKey = useFeedbackAppearance(wantsZiggy);
  const showZiggy = wantsZiggy && budgetKey !== null;
  const ziggy = showZiggy ? (
    <Suspense fallback={<span className="lt-fbg__z" aria-hidden="true" />}>
      <FeedbackZiggy />
      <FeedbackShownNote kind={budgetKey} />
    </Suspense>
  ) : null;

  let body: React.ReactNode;
  if (step.t === "ask") {
    body = (
      <>
        <div className="lt-fbg__head">
          {ziggy}
          <h2 className="lt-fbg__say" id="lt-fbg-title">
            {FIRST_GRADED_COPY.title}
          </h2>
          <button type="button" className="lt-fbg__x" aria-label="Close" onClick={dismiss} data-testid="feedback-x">
            ×
          </button>
        </div>
        <ul className="lt-fbg__grid" data-testid="feedback-first-graded">
          {FIRST_GRADED_ANSWERS.map((a) => (
            <li key={a.code}>
              <button type="button" className="lt-fbg__opt" onClick={() => answer(a.code)} data-testid={`feedback-opt-${a.code}`}>
                {a.label}
              </button>
            </li>
          ))}
        </ul>
      </>
    );
  } else if (step.t === "next") {
    body = (
      <>
        <div className="lt-fbg__head">
          {ziggy}
          <p className="lt-fbg__say" id="lt-fbg-title" role="status" data-testid="feedback-line">
            {step.plan.line}
          </p>
        </div>
        {step.plan.buttons.length > 0 && (
          <ul className="lt-fbg__stack" data-testid="feedback-next">
            {step.plan.buttons.map((b, i) => (
              <li key={b.id}>
                <button
                  type="button"
                  className={`lt-fbg__opt${i === 0 ? " lt-fbg__opt--primary" : ""}`}
                  onClick={() => tap(b.action, b.run)}
                  data-testid={`feedback-go-${b.id}`}
                  {...(i === 0 ? { "data-autofocus": "" } : {})}
                >
                  {b.label}
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="lt-fbg__foot">
          <button type="button" className="lt-fbg__link" onClick={onDone} data-testid="feedback-close" {...(step.plan.buttons.length === 0 ? { "data-autofocus": "" } : {})}>
            {COPY.close}
          </button>
        </div>
      </>
    );
  } else if (step.t === "why") {
    body = (
      <>
        <div className="lt-fbg__head">
          {ziggy}
          <p className="lt-fbg__say" id="lt-fbg-title" role="status" data-testid="feedback-line">
            {COPY.line.not_really}
          </p>
        </div>
        <ul className="lt-fbg__stack" data-testid="feedback-why">
          {NOT_REALLY_REASONS.map((r, i) => (
            <li key={r.id}>
              <button
                type="button"
                className="lt-fbg__opt"
                onClick={() => chooseWhy(r.id)}
                data-testid={`feedback-why-${r.id}`}
                {...(i === 0 ? { "data-autofocus": "" } : {})}
              >
                {r.label}
              </button>
            </li>
          ))}
        </ul>
        <div className="lt-fbg__foot">
          <button type="button" className="lt-fbg__link" onClick={() => setStep({ t: "ask" })} data-testid="feedback-back">
            {COPY.back}
          </button>
          <button type="button" className="lt-fbg__link" onClick={onDone} data-testid="feedback-close">
            {COPY.close}
          </button>
        </div>
      </>
    );
  } else if (step.t === "note") {
    const clean = cleanNoteText(text);
    body = (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        data-testid="feedback-note-form"
      >
        <div className="lt-fbg__head">
          <h2 className="lt-fbg__title" id="lt-fbg-title">
            {step.title}
          </h2>
          <button type="button" className="lt-fbg__x" aria-label="Close" onClick={onDone} data-testid="feedback-x">
            ×
          </button>
        </div>
        <p className="lt-fbg__hint">{step.hint}</p>
        <label className="lt-fbg__label" htmlFor="lt-fbg-note">
          {COPY.note.label}
        </label>
        <textarea
          id="lt-fbg-note"
          className="lt-fbg__ta"
          value={text}
          maxLength={FEEDBACK_NOTE_MAX}
          rows={4}
          onChange={(e) => setText(e.target.value)}
          data-autofocus=""
          data-testid="feedback-note-text"
        />
        <p className="lt-fbg__count" aria-hidden="true">
          {COPY.note.counter.replace("{n}", String(text.length)).replace("{max}", String(FEEDBACK_NOTE_MAX))}
        </p>
        {failed && (
          <p className="lt-fbg__err" role="alert" data-testid="feedback-note-failed">
            {COPY.note.failed}
          </p>
        )}
        <button
          type="submit"
          className="lt-fbg__opt lt-fbg__opt--primary lt-fbg__send"
          disabled={!clean || sending}
          data-testid="feedback-note-send"
        >
          {sending ? COPY.note.sending : COPY.note.send}
        </button>
        <div className="lt-fbg__foot">
          <button type="button" className="lt-fbg__link" onClick={() => setStep({ t: "why" })} data-testid="feedback-back">
            {COPY.back}
          </button>
          <button type="button" className="lt-fbg__link" onClick={onDone} data-testid="feedback-skip">
            {COPY.note.skip}
          </button>
        </div>
      </form>
    );
  } else {
    body = (
      <div className="lt-fbg__head">
        <p className="lt-fbg__thanks" role="status" data-testid="feedback-thanks">
          {step.text}
        </p>
        <button type="button" className="lt-fbg__x" aria-label="Close" onClick={onDone}>
          ×
        </button>
      </div>
    );
  }

  const slot = phone && !floating ? ctx?.getSlot?.() ?? null : null;
  const inFlow = !!slot && slot.isConnected;

  const card = (
    <div
      ref={root}
      className={`lt-fbg${inFlow ? " lt-fbg--flow" : ""}`}
      role="dialog"
      aria-modal="false"
      aria-labelledby={step.t === "thanks" ? undefined : "lt-fbg-title"}
      data-testid="feedback-prompt"
      data-moment={moment}
      data-ziggy={showZiggy ? "1" : "0"}
    >
      <style>{GRADED_CARD_CSS}</style>
      {body}
    </div>
  );
  return inFlow && slot ? createPortal(card, slot) : card;
}

export default GradedFeedbackCard;
