/**
 * CI-SOFT-1 — everything the "Pick a board question, watch it get marked" card DRAWS and SAYS, in
 * ONE lazily loaded chunk (Vite emits `assets/ciDemoChunk-<hash>.js` + CSS). Reached only through
 * the dynamic import in ./CiDemoCard.tsx, and only when the card will show.
 *
 *   PICK   three board questions (Byte's line + sub).
 *   MARK   the sample answer on ruled paper; a red pen reveals one step every 1.8 s, Byte says
 *          what it sees, then the circled total. "Skip to result" / "Watch again".
 *   RESULT total, each scheme step, "Where the marks went" (the product's three MISTAKE_GROUPS),
 *          the takeaway, Byte, and the two ways on.
 *
 * DISPLAY ONLY. The six marked answers (./ciDemoSamples.ts) are FIXED data animated in the browser:
 * no grader call, no AI call, nothing sent but analytics names. The handwriting font (Kalam) is self-hosted
 * (public/fonts/kalam/, declared in ciDemo.css): no request leaves this origin. prefers-reduced-motion → the final
 * frame at once, no timer. ONE Byte, drawn only when the mascot budget grants it.
 */
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { trackNamedEvent } from "../../analytics/analytics";
import { MISTAKE_TYPE_LABEL } from "../../lib/mistakeDisplay";
import { MarksLostLines } from "../results/GradeStateParts";
import { prefersReducedMotion } from "../guide/rig";
import { APPEARANCE_PRIORITY, NoteShown, newOccurrence, useAppearance } from "../guide/mascotBudget";
import {
  CI_DEMO_COPY,
  CI_DEMO_SAMPLES,
  CI_DEMO_STEP_MS,
  formatMarks,
  sampleLabel,
  sampleMarksLost,
  sampleTotal,
  type CiDemoKey,
  type CiDemoSample,
} from "./ciDemoSamples";
import { nextSampleKey, readCiDemoSubjectHint, trioFor } from "./ciDemoModel";
import { guidePlanFor } from "../guide/guideInputs";
import { parseChallengeId } from "./challengeModel";
import OneMinuteLadder, { type LadderAnswer } from "./OneMinuteLadder";
import type { OneMinuteStarter } from "./oneMinuteStarters";
import "./ciDemo.css";

const LazyByte = lazy(() => import("../guide/BlobCharacter"));

/** What the sample was filled into the page's question box as (the page does the fill). */
export interface CiDemoOwnPick {
  bankId: string;
  /** The board row's text with its marks, as "Try a board question" fills it. */
  text: string;
  label: string;
}

export interface CiDemoChunkProps {
  /** × — close for this tab. */
  onClose: () => void;
  /** "Check my own answer" after a sample: the page fills the question, closes the card, focuses the answer. */
  onCheckOwn: (pick: CiDemoOwnPick) => void;
  /** "Or check my own answer ↓": scroll to / focus the question box (the card stays). */
  onJumpToOwn: () => void;
  /** Signed out → the first-check-free sub-line. */
  signedOut: boolean;
  /** Red-pen step length in ms (default 1.8 s). A seam for tests; the page never passes it. */
  stepMs?: number;
  /** ONE-MINUTE-1 — the signed-in uid (null signed out): the intent map is asked with it, like Byte's own guide. */
  uid?: string | null;
  /** ONE-MINUTE-1 — Byte's "Check one answer" asked for the ladder: it leads whatever the arrival. */
  ladderForced?: boolean;
  /** ONE-MINUTE-1 step 1 — the tap was answered (the page records it as an MCQ attempt for a signed-in student). */
  onLadderAnswered?: (a: LadderAnswer) => void;
  /** ONE-MINUTE-1 step 2 — prefill the 2-mark question, seed its confirmed metadata, focus the Type box. */
  onLadderType?: (pick: CiDemoLadderPick) => void;
  /** FIVE-MORE-1: "5 more like this" under the tap verdict. */
  onLadderMore?: (c: { subject: "Maths" | "Science"; chapter: string }) => void;
}

/** A CI-SOFT-1 sample handed on to the Type step, with the bank row's own metadata the page seeds `confirmed` from. */
export interface CiDemoLadderPick extends CiDemoOwnPick {
  seed: { marks: number; subject: "Maths" | "Science"; topicKey: string; questionText: string };
}

type View = { name: "pick" } | { name: "mark"; key: CiDemoKey } | { name: "result"; key: CiDemoKey };

function useWide(): boolean {
  const query = "(min-width: 1024px)";
  const read = () => (typeof window.matchMedia === "function" ? window.matchMedia(query).matches : false);
  const [wide, setWide] = useState(read);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;
    const mq = window.matchMedia(query);
    const on = () => setWide(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return wide;
}

function marginMark(awarded: number, max: number): string {
  if (awarded === max) return `✓ ${formatMarks(awarded)}`;
  if (awarded === 0) return "✗ 0";
  return `${formatMarks(awarded)} of ${formatMarks(max)}`;
}

/**
 * A2 — the ladder leads ONLY where the intent map already leads with "Check one answer" (Byte's own order for
 * this arrival), or when Byte's "Check one answer" asked for it. A CBQ, chapter, packs, papers or quick arrival
 * keeps today's sample picker. The map is read, never changed.
 */
function ladderLeads(uid: string | null | undefined, forced: boolean): boolean {
  if (forced) return true;
  // FRIEND-CHALLENGE-1 - a friend's challenge link (a valid-shaped id) leads with the ladder; the ladder itself
  // falls back to its normal starter when the id resolves to nothing.
  try {
    if (typeof window !== "undefined" && parseChallengeId(window.location.search)) return true;
  } catch {
    /* no param */
  }
  try {
    return guidePlanFor("check_improve", uid ?? null).options[0]?.id === "check_one";
  } catch {
    return false;
  }
}

export default function CiDemoChunk({ onClose, onCheckOwn, onJumpToOwn, signedOut, stepMs = CI_DEMO_STEP_MS, uid = null, ladderForced = false, onLadderAnswered, onLadderType, onLadderMore }: CiDemoChunkProps) {
  const [view, setView] = useState<View>({ name: "pick" });
  const [ladderOn, setLadderOn] = useState<boolean>(() => ladderLeads(uid, ladderForced));
  const [ladderSay, setLadderSay] = useState<{ line: string; mood: "tap" | "right" | "wrong" }>({ line: CI_DEMO_COPY.ladderHead, mood: "tap" });
  const [shown, setShown] = useState(0);
  const [reduced] = useState(() => prefersReducedMotion());
  const watched = useRef<Set<CiDemoKey>>(new Set());
  const wide = useWide();

  useEffect(() => {
    trackNamedEvent("ci_demo_shown");
  }, []);

  // ONE Byte per card: the slot is requested once, here; every view reuses the same drawing.
  const [occurrence] = useState(() => String(newOccurrence()));
  const byteKey = useAppearance("ci_demo", APPEARANCE_PRIORITY.explainer, occurrence);

  const sample = view.name === "pick" ? null : CI_DEMO_SAMPLES[view.key];
  const stepCount = sample ? sample.steps.length : 0;
  const done = sample !== null && shown > stepCount;
  // At desktop width the mark view and the result are one layout: when the total appears it IS the result.
  const effective: View = useMemo(
    () => (view.name === "mark" && done && wide ? { name: "result", key: view.key } : view),
    [view, done, wide],
  );

  // The red pen.
  useEffect(() => {
    if (view.name !== "mark" || reduced || shown > stepCount) return undefined;
    const t = window.setTimeout(() => setShown((n) => n + 1), stepMs);
    return () => window.clearTimeout(t);
  }, [view, shown, stepCount, reduced, stepMs]);

  // The result was reached (skip, button, or the wide layout finishing): count it once per sample view.
  const resultCounted = useRef<string | null>(null);
  useEffect(() => {
    if (effective.name !== "result") {
      resultCounted.current = null;
      return;
    }
    if (resultCounted.current === effective.key) return;
    resultCounted.current = effective.key;
    trackNamedEvent("ci_demo_result");
  }, [effective]);

  function startMark(key: CiDemoKey) {
    watched.current.add(key);
    setShown(reduced ? CI_DEMO_SAMPLES[key].steps.length + 1 : 0);
    setView({ name: "mark", key });
  }

  function pick(key: CiDemoKey) {
    trackNamedEvent("ci_demo_pick");
    startMark(key);
  }

  function another() {
    if (!sample) return;
    trackNamedEvent("ci_demo_another");
    startMark(nextSampleKey(sample.key, watched.current));
  }

  function skipToResult() {
    if (view.name !== "mark") return;
    setShown(stepCount + 1);
    setView({ name: "result", key: view.key });
  }

  function watchAgain() {
    if (!sample) return;
    setShown(reduced ? stepCount + 1 : 0);
    setView({ name: "mark", key: sample.key });
  }

  function checkOwn() {
    if (!sample) return;
    trackNamedEvent("ci_demo_check_own");
    onCheckOwn({
      bankId: sample.bankId,
      text: `${sample.questionText} [${sample.marks}]`,
      label: sampleLabel(sample),
    });
  }

  function goType(starter: OneMinuteStarter) {
    const smp = CI_DEMO_SAMPLES[starter.nextKey];
    const lp: CiDemoLadderPick = {
      bankId: smp.bankId,
      text: `${smp.questionText} [${smp.marks}]`,
      label: sampleLabel(smp),
      seed: { marks: smp.marks, subject: smp.subject, topicKey: smp.topicKey, questionText: smp.questionText },
    };
    if (onLadderType) onLadderType(lp);
    else onCheckOwn(lp);
  }

  function close() {
    trackNamedEvent("ci_demo_close");
    onClose();
  }

  // Byte's words for this moment.
  const onLadder = ladderOn && effective.name === "pick";
  let line: string = onLadder ? ladderSay.line : CI_DEMO_COPY.l1;
  if (sample && effective.name === "mark") {
    line = shown === 0 ? CI_DEMO_COPY.l4 : shown <= stepCount ? sample.steps[shown - 1].say : sample.summary;
  } else if (effective.name === "result") {
    line = CI_DEMO_COPY.l9;
  }
  const pose = effective.name === "mark" && !done ? "marking" : onLadder ? (ladderSay.mood === "right" ? "cheer" : ladderSay.mood === "wrong" ? "comfort" : "hello") : "idle";

  const body =
    effective.name === "pick" && ladderOn ? (
      <OneMinuteLadder
        hint={readCiDemoSubjectHint()}
        onLine={(l, mood) => setLadderSay({ line: l, mood })}
        onAnswered={(a) => onLadderAnswered?.(a)}
        onNext={(st) => goType(st)}
        onMore={onLadderMore}
        onWatch={() => setLadderOn(false)}
        onUnavailable={() => setLadderOn(false)}
      />
    ) : effective.name === "pick" || !sample ? (
      <PickView hint={readCiDemoSubjectHint()} onPick={pick} onJumpToOwn={onJumpToOwn} />
    ) : (
      <SampleView
        sample={sample}
        shown={shown}
        resultView={effective.name === "result"}
        wide={wide}
      />
    );

  return (
    <section
      className={`ci-demo ci-demo--${effective.name}`}
      data-testid="ci-demo"
      data-view={effective.name}
      aria-label="Watch a sample answer get marked"
    >
      <button type="button" className="ci-demo__close" aria-label="Close" data-testid="ci-demo-close" onClick={close}>
        <span aria-hidden="true">×</span>
      </button>

      <div className="ci-demo__main">{body}</div>

      <div className="ci-demo__byte" data-testid="ci-demo-byte" data-pose={pose} data-drawn={byteKey ? "1" : "0"}>
        {byteKey ? (
          <span className="ci-demo__avatar">
            <Suspense fallback={null}>
              <LazyByte kind="byte" pose={pose} className="ci-demo__char" />
              <NoteShown kind={byteKey} />
            </Suspense>
          </span>
        ) : null}
        <div className="ci-demo__say">
          <p className="ci-demo__line" aria-live="polite" data-testid="ci-demo-line">
            {line}
          </p>
          {effective.name === "pick" && !ladderOn ? <p className="ci-demo__sub">{CI_DEMO_COPY.l2}</p> : null}
        </div>
      </div>

      {effective.name === "mark" ? (
        <div className="ci-demo__actions">
          {done ? (
            <button type="button" className="ci-demo__btn ci-demo__btn--primary" data-testid="ci-demo-see-result" onClick={skipToResult}>
              See where the marks slipped
            </button>
          ) : (
            <button type="button" className="ci-demo__btn ci-demo__btn--ghost" data-testid="ci-demo-skip" onClick={skipToResult}>
              Skip to result
            </button>
          )}
          {reduced ? null : (
            <button type="button" className="ci-demo__link" data-testid="ci-demo-again" onClick={watchAgain}>
              Watch again
            </button>
          )}
        </div>
      ) : null}

      {effective.name === "result" ? (
        <div className="ci-demo__actions">
          <button type="button" className="ci-demo__btn ci-demo__btn--primary" data-testid="ci-demo-check-own" onClick={checkOwn}>
            <span>Check my own answer</span>
            <span className="ci-demo__btn-sub">{signedOut ? "Type it or snap a photo · first check free" : "Type it or snap a photo"}</span>
          </button>
          <button type="button" className="ci-demo__btn ci-demo__btn--ghost" data-testid="ci-demo-another" onClick={another}>
            Mark another question
          </button>
          {reduced ? null : (
            <button type="button" className="ci-demo__link" data-testid="ci-demo-again" onClick={watchAgain}>
              Watch again
            </button>
          )}
        </div>
      ) : null}
    </section>
  );
}

/* ── PICK ────────────────────────────────────────────────────────────────────────────────── */

function PickView({ hint, onPick, onJumpToOwn }: { hint: ReturnType<typeof readCiDemoSubjectHint>; onPick: (k: CiDemoKey) => void; onJumpToOwn: () => void }) {
  return (
    <>
      <ul className="ci-demo__tiles">
        {trioFor(hint).map((k) => {
          const s = CI_DEMO_SAMPLES[k];
          return (
            <li key={k}>
              <button type="button" className="ci-demo__tile" data-testid={`ci-demo-tile-${k}`} onClick={() => onPick(k)}>
                <span className="ci-demo__tile-meta">
                  {s.subject} · {s.chapter} · {s.marks} marks · CBSE {s.year}
                </span>
                <span className="ci-demo__tile-stem">{s.tileStem}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <button type="button" className="ci-demo__own" data-testid="ci-demo-own-link" onClick={onJumpToOwn}>
        Or check my own answer <span aria-hidden="true">↓</span>
      </button>
    </>
  );
}

/* ── MARK + RESULT ───────────────────────────────────────────────────────────────────────── */

function SampleView({ sample, shown, resultView, wide }: { sample: CiDemoSample; shown: number; resultView: boolean; wide: boolean }) {
  const stepCount = sample.steps.length;
  const done = shown > stepCount;
  const total = sampleTotal(sample);
  const ghost = new Set(sample.ghostLines ?? []);
  const revealed = sample.steps.slice(0, Math.min(shown, stepCount));
  const showScorecard = resultView || wide;
  const dimmed = !resultView && !done;

  return (
    <div className="ci-demo__sample">
      {/* The label and the question reference sit OUTSIDE the paper column, which phones hide on the
          result: the sample is never presented as the student's own grade, at any width. */}
      <div className="ci-demo__head" data-testid="ci-demo-head">
        <p className="ci-demo__chip" data-testid="ci-demo-label">
          {CI_DEMO_COPY.l3}
        </p>
        <p className="ci-demo__qref" data-testid="ci-demo-qref">
          Q ({sample.marks} marks, {sample.paper})
        </p>
      </div>
      <div className="ci-demo__cols">
      <div className="ci-demo__paperCol" data-testid="ci-demo-paper-col">
        <p className="ci-demo__q">{sample.questionText}</p>
        <div className="ci-demo__paper" data-testid="ci-demo-paper">
          {sample.lines.map((text, i) => {
            const mark = revealed.find((st) => st.line === i);
            const ring = revealed.some((st) => st.line === i && st.type !== null);
            return (
              <div className="ci-demo__ln" key={i} data-testid={`ci-demo-ln-${i}`}>
                <span className={`ci-demo__hw${ghost.has(i) ? " ci-demo__hw--ghost" : ""}${ring ? " ci-demo__hw--ring" : ""}`}>{text}</span>
                {mark ? (
                  <span className={`ci-demo__red${mark.awarded === mark.max ? "" : " ci-demo__red--lost"}`} data-testid={`ci-demo-mark-${i}`}>
                    {marginMark(mark.awarded, mark.max)}
                  </span>
                ) : null}
              </div>
            );
          })}
          <div className="ci-demo__ln ci-demo__ln--total">
            {done ? (
              <span className="ci-demo__circled" data-testid="ci-demo-total-paper">
                {formatMarks(total)} / {sample.marks}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {showScorecard ? (
        <div className={`ci-demo__score${dimmed ? " ci-demo__score--dim" : ""}`} data-testid="ci-demo-score" aria-hidden={dimmed ? true : undefined}>
          <section className="ci-demo__total">
            <span className="ci-demo__big" data-testid="ci-demo-total">
              {formatMarks(total)}
              <span className="ci-demo__bigof"> / {sample.marks}</span>
            </span>
            <span className="ci-demo__src">
              {sample.paper} · Marked against the CBSE marking scheme
            </span>
          </section>
          <ul className="ci-demo__steps" data-testid="ci-demo-steps">
            {sample.steps.map((st, i) => {
              const lost = st.awarded < st.max;
              return (
                <li className="ci-demo__step" key={i}>
                  <div className="ci-demo__steprow">
                    <b className="ci-demo__point">{st.point}</b>
                    {lost && st.type ? <span className={`ci-demo__tag ci-demo__tag--${st.type}`}>{MISTAKE_TYPE_LABEL[st.type]}</span> : null}
                    <b className={lost ? "ci-demo__got ci-demo__got--lost" : "ci-demo__got"}>
                      {formatMarks(st.awarded)} / {formatMarks(st.max)}
                    </b>
                  </div>
                  {lost && st.note ? <p className="ci-demo__note">{st.note}</p> : null}
                </li>
              );
            })}
          </ul>
          <section className="ci-demo__groups" data-testid="ci-demo-groups">
            {/* The product's own block (the same group words as a live scorecard) under OUR heading: this is a sample, not theirs. */}
            <b className="ci-demo__ghead">Where the marks went</b>
            <MarksLostLines marks={sampleMarksLost(sample)} heading={false} />
            <p className="ci-demo__take">{sample.takeaway}</p>
          </section>
        </div>
      ) : null}
      </div>
    </div>
  );
}
