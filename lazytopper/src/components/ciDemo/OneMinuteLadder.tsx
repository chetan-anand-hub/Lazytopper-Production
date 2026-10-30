/**
 * ONE-MINUTE-1 — step 1 (TAP) of the first-minute ladder, drawn inside the CI-SOFT-1 card (a lazy chunk) and
 * voiced by Byte (the card owns his drawing, his line and the mascot budget; this part only reports the line
 * he should say). One real CBSE board MCQ, four big option buttons; a tap gives an instant LOCAL verdict
 * (no network): the mark out of 1, the right option and one honest "why" line from the row's own stored solution.
 * An MCQ scores 0 or full on the tap alone (CLAUDE.md §13); a tap carries no working, so no mistake type.
 *
 * The bank is reached here, on mount, through import() only (/check-improve stays bank-free statically).
 * A failed load renders nothing for this step: the card falls back to its sample picker.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { trackOneMinute } from "../../analytics/analytics";
import { CI_DEMO_COPY } from "./ciDemoSamples";
import { correctIndex, pickStarter, visitSeed, whyLine, type OneMinuteStarter } from "./oneMinuteStarters";
import type { DesktopSubject } from "../../lib/desktop/navigation";

/** What the page needs to record the tap as an MCQ attempt (signed in) — nothing else leaves this component. */
export interface LadderAnswer {
  bankId: string;
  subject: "Maths" | "Science";
  topicKey: string;
  topicName: string;
  question: string;
  correct: boolean;
}

interface LoadedMcq {
  starter: OneMinuteStarter;
  question: string;
  options: string[];
  right: number;
  why: string;
  topicKey: string;
  topicName: string;
}

const LETTERS = ["A", "B", "C", "D"];

async function loadStarter(starter: OneMinuteStarter): Promise<LoadedMcq | null> {
  try {
    const loader = await import("../../data/bankChapters/loader");
    for (const ch of loader.bankChaptersFor([starter.topicKey])) {
      await loader.ensureBankChapters([ch]);
      const row = (loader.getBankRows([ch]) as unknown as Array<Record<string, unknown>>).find((r) => r.id === starter.bankId);
      if (!row) continue;
      const options = Array.isArray(row.options) ? row.options.map(String) : [];
      const right = correctIndex(options, String(row.answer ?? ""));
      const topicKey = String(row.topicKey ?? "");
      const topics = await import("../../lib/desktop/topics");
      const topicName = topics.desktopTopicBySlug(topicKey)?.name ?? starter.chapter;
      if (options.length !== 4 || right < 0) return null;
      return { starter, question: String(row.questionText ?? ""), options, right, why: whyLine(row.solutionSteps as unknown[]), topicKey, topicName };
    }
    return null;
  } catch {
    return null;
  }
}

export interface OneMinuteLadderProps {
  hint: DesktopSubject | null;
  /** Byte's line for this moment (the card voices it). */
  onLine: (line: string, mood: "tap" | "right" | "wrong") => void;
  /** The tap happened (signed in: the page records it as an MCQ attempt). */
  onAnswered: (a: LadderAnswer) => void;
  /** "Now a 2-mark one": hand on to step 2. */
  onNext: (starter: OneMinuteStarter) => void;
  /** "Or watch me mark a board answer": the existing sample picker. */
  onWatch: () => void;
  /** The bank could not give a starter: let the card show its sample picker instead. */
  onUnavailable: () => void;
}

export default function OneMinuteLadder({ hint, onLine, onAnswered, onNext, onWatch, onUnavailable }: OneMinuteLadderProps) {
  const starter = useMemo(() => pickStarter(hint, visitSeed()), [hint]);
  const [mcq, setMcq] = useState<LoadedMcq | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const shown = useRef(false);

  useEffect(() => {
    let live = true;
    void loadStarter(starter).then((m) => {
      if (!live) return;
      if (!m) {
        onUnavailable();
        return;
      }
      setMcq(m);
    });
    return () => {
      live = false;
    };
    // The starter is fixed for this mount; the callbacks are the card's stable handlers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [starter]);

  useEffect(() => {
    if (!mcq) return;
    if (!shown.current) {
      shown.current = true;
      trackOneMinute("one_min_tap_shown");
    }
    if (picked === null) onLine(CI_DEMO_COPY.ladderHead, "tap");
    else if (picked === mcq.right) onLine(CI_DEMO_COPY.ladderRight, "right");
    else onLine(CI_DEMO_COPY.ladderWrong, "wrong");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mcq, picked]);

  if (!mcq) return <div className="ci-demo__ladder ci-demo__ladder--wait" data-testid="one-min-wait" aria-busy="true" />;

  const done = picked !== null;
  const correct = done && picked === mcq.right;

  function tap(i: number) {
    if (!mcq || done) return;
    setPicked(i);
    const ok = i === mcq.right;
    trackOneMinute("one_min_tap_answered", { correct: ok });
    onAnswered({
      bankId: mcq.starter.bankId,
      subject: mcq.starter.subject,
      topicKey: mcq.topicKey,
      topicName: mcq.topicName,
      question: mcq.question,
      correct: ok,
    });
  }

  return (
    <div className="ci-demo__ladder" data-testid="one-min-ladder" data-step={done ? "verdict" : "tap"}>
      <p className="ci-demo__ladder-meta">
        {mcq.starter.subject} · {mcq.topicName} · 1 mark · CBSE board question
      </p>
      <p className="ci-demo__ladder-q" data-testid="one-min-question">
        {mcq.question}
      </p>
      {done ? (
        <p
          className={`ci-demo__verdict-mark ${correct ? "ci-demo__verdict-mark--right" : "ci-demo__verdict-mark--wrong"}`}
          data-testid="one-min-verdict"
          role="status"
        >
          {correct ? "✓ 1/1" : "✗ 0/1"}
          <span className="ci-demo__verdict-ans">
            {" "}
            Right answer: {LETTERS[mcq.right]}. {mcq.options[mcq.right]}
          </span>
        </p>
      ) : null}

      <ul className="ci-demo__opts" role="list">
        {mcq.options.map((o, i) => {
          const state = !done ? "" : i === mcq.right ? " ci-demo__opt--right" : i === picked ? " ci-demo__opt--wrong" : " ci-demo__opt--dim";
          return (
            <li key={i}>
              <button
                type="button"
                className={`ci-demo__opt${state}`}
                data-testid={`one-min-opt-${i}`}
                disabled={done}
                aria-pressed={picked === i}
                onClick={() => tap(i)}
              >
                <span className="ci-demo__opt-letter" aria-hidden="true">
                  {LETTERS[i]}
                </span>
                <span className="ci-demo__opt-text">{o}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {done ? (
        <div className="ci-demo__verdict">
          {mcq.why ? (
            <p className="ci-demo__verdict-why" data-testid="one-min-why">
              {mcq.why}
            </p>
          ) : null}
          <button
            type="button"
            className="ci-demo__btn ci-demo__btn--primary"
            data-testid="one-min-next"
            onClick={() => {
              trackOneMinute("one_min_type_shown");
              onNext(mcq.starter);
            }}
          >
            <span>{CI_DEMO_COPY.ladderNext}</span>
          </button>
        </div>
      ) : null}

      <button type="button" className="ci-demo__link" data-testid="one-min-watch" onClick={onWatch}>
        {CI_DEMO_COPY.ladderWatch}
      </button>
    </div>
  );
}
