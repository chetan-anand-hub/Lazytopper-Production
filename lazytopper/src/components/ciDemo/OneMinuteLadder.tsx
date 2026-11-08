/**
 * ONE-MINUTE-1 — step 1 (TAP) of the first-minute ladder, drawn inside the CI-SOFT-1 card (a lazy chunk) and
 * voiced by Byte (the card owns his drawing, his line and the mascot budget; this part only reports the line
 * he should say). One real CBSE board MCQ, four big option buttons; a tap gives an instant LOCAL verdict
 * (no network): the mark out of 1, the right option and one honest "why" line from the row's own stored solution.
 * An MCQ scores 0 or full on the tap alone (CLAUDE.md §13); a tap carries no working, so no mistake type.
 *
 * SPEED-SITE-1a: a starter's row is read from STARTER_ROWS (./oneMinuteStarterRows.ts, test-pinned to the bank),
 * so the question renders on the first frame. The bank is reached only as a fallback, and for a friend's
 * challenge, through import() (/check-improve stays bank-free statically).
 * A failed load renders nothing for this step: the card falls back to its sample picker.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { wrongPickFields } from "../../services/mistakePick";
import { trackFriendChallenge, trackOneMinute } from "../../analytics/analytics";
import ChallengeFriendButton from "./ChallengeFriendButton";
import { parseChallengeId, type ChallengeQuestion } from "./challengeModel";
import { markLadderStart } from "./ladderClock";
import { useClearBottomNav } from "./useClearBottomNav";
import { CI_DEMO_COPY } from "./ciDemoSamples";
import { LADDER_MORE_COPY } from "./ladderMoreCopy";
import { correctIndex, fixedStarter, pickStarter, visitSeed, whyLine, type OneMinuteStarter } from "./oneMinuteStarters";
import { isFirstLadderVisit, markLadderSeen, peekLadderTap, takeLadderTap } from "./ladderVisit";
import { LadderMeta, LadderOptions, LadderQuestionText, ladderLetter } from "./LadderTapParts";
import { STARTER_ROWS } from "./oneMinuteStarterRows";
import type { DesktopSubject } from "../../lib/desktop/navigation";
import { subscriptFormulas } from "../../lib/chemSubscript";
import LadderOffers from "../packs/LadderOffers";

/** What the page needs to record the tap as an MCQ attempt (signed in) — nothing else leaves this component. */
export interface LadderAnswer {
  bankId: string;
  subject: "Maths" | "Science";
  topicKey: string;
  topicName: string;
  question: string;
  correct: boolean;
  /** TUTOR-MEM-1 - a WRONG tap's option and the key ("(b) 7" / "(c) 9"); absent on a right tap. */
  pickedOption?: string;
  keyOption?: string;
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

/** SPEED-SITE-1a — the starter as the bank would give it, with no download; null if it has no copied row. */
function starterFromRows(starter: OneMinuteStarter): LoadedMcq | null {
  const row = STARTER_ROWS[starter.bankId];
  if (!row || row.options.length !== 4 || row.right < 0 || row.right > 3) return null;
  return { starter, question: row.question, options: [...row.options], right: row.right, why: row.why, topicKey: row.topicKey, topicName: row.topicName };
}

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

/** FRIEND-CHALLENGE-1 - a friend's question, shaped like a starter so the rest of the ladder is unchanged. */
function loadedFromChallenge(q: ChallengeQuestion): LoadedMcq {
  const starter: OneMinuteStarter = {
    bankId: q.id,
    topicKey: q.topicKey,
    subject: q.subject,
    chapter: q.chapter,
    nextKey: q.subject === "Maths" ? "circ" : "elec",
  };
  return { starter, question: q.question, options: q.options, right: q.right, why: q.why, topicKey: q.topicKey, topicName: q.chapter };
}

function readChallengeParam(): string | null {
  try {
    return typeof window === "undefined" ? null : parseChallengeId(window.location.search);
  } catch {
    return null;
  }
}

/** The shareable question behind a loaded MCQ (the same bank row, the same stored answer). */
function challengeFrom(m: LoadedMcq): ChallengeQuestion {
  return { id: m.starter.bankId, subject: m.starter.subject, topicKey: m.topicKey, chapter: m.topicName, question: m.question, options: m.options, right: m.right, why: m.why };
}

export interface OneMinuteLadderProps {
  hint: DesktopSubject | null;
  /** Byte's line for this moment (the card voices it). */
  onLine: (line: string, mood: "tap" | "right" | "wrong") => void;
  /**
   * The tap happened (signed in: the page records it as an MCQ attempt). SPEED-CI-2: `early` = the tap was made before
   * the ladder was in (static page / preview); the page records it at once but leaves its LAYOUT as it is until
   * `onSettled` (the student's next tap or key), so nothing moves seconds after the tap.
   */
  onAnswered: (a: LadderAnswer, meta?: { early: true }) => void;
  /** SPEED-CI-2: after an early tap, the student's next tap / key has completed: the page may lay itself out again. */
  onSettled?: () => void;
  /** "Now a 2-mark one": hand on to step 2. */
  onNext: (starter: OneMinuteStarter) => void;
  /** "Or watch me mark a board answer": the existing sample picker. */
  onWatch: () => void;
  /** FIVE-MORE-1: "5 more like this" - a ready Quick Practice set for the same chapter (the page launches it). */
  onMore?: (c: { subject: "Maths" | "Science"; chapter: string }) => void;
  /** The bank could not give a starter: let the card show its sample picker instead. */
  onUnavailable: () => void;
}

export default function OneMinuteLadder({ hint, onLine, onAnswered, onNext, onWatch, onUnavailable, onMore, onSettled }: OneMinuteLadderProps) {
  // SPEED-CI-2 (owner ruling 8 Nov 2026): a browser's FIRST ladder opens with the fixed top-weightage starter (the
  // Answer Checker's static paint draws that same question before the app runs); every later visit picks per visit.
  const starter = useMemo(() => (isFirstLadderVisit() ? fixedStarter(hint) : pickStarter(hint, visitSeed())), [hint]);
  // FRIEND-CHALLENGE-1 - a friend's link names one question; an id that resolves to no objective bank row is ignored.
  const [challengeId] = useState<string | null>(() => readChallengeParam());
  // SPEED-SITE-1a: no friend's challenge -> the copied row, on the first render (no bank download, no wait box).
  const [mcq, setMcq] = useState<LoadedMcq | null>(() => (challengeId ? null : starterFromRows(starter)));
  // SPEED-CI-2: a tap made on THIS question before the ladder could answer (on the static paint or the preview) is the
  // ladder's FIRST state, not a later update (review of #1639, FU1): the verdict renders in the very frame that replaces
  // the preview, inside the boxes the early tap reserved (`ci-demo__verdict--reserve`), so nothing moves. It is scored
  // exactly as a tap here (picked === right: 0 or full), reported once below. A friend's challenge never takes one.
  const [early] = useState<number | null>(() => (challengeId || !mcq ? null : peekLadderTap(mcq.starter.bankId)));
  const [picked, setPicked] = useState<number | null>(early);
  const [reserve, setReserve] = useState(early !== null);
  const shown = useRef(false);
  const verdictRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLParagraphElement>(null);
  // LADDER-NAV-1: the verdict + "Now a 2-mark one" appear below the fold; bring them in once, clear of the BottomNav.
  // SPEED-CI-3 (review of #1641, B1): ...but never so far that the student's own mark line leaves the screen.
  useClearBottomNav(verdictRef, picked !== null, markRef);
  // SPEED-CI-3 — SETTLING. An early tap's verdict lands (this first frame) and its buying block's pack rows land a
  // moment later (OffersBlock's lazy OfferRows chunk). No height is reserved for either; instead, from this first frame
  // until the rows are in, what lies BELOW the verdict (the watch link, the page under the card) is hidden IN PLACE
  // (ciDemo.css `[data-settling]`): a hidden node that moves is not a layout shift, and it reappears in its final place.
  // Settled = the rows are in the DOM, or the block has no rows to wait for (no block / the rows chunk resolved and
  // rendered none), or the student's next tap / key. Nothing above the verdict ever moves.
  const [settling, setSettling] = useState(early !== null);
  useEffect(() => {
    if (!settling) return undefined;
    let live = true;
    let mounted = true;
    let observer: MutationObserver | undefined;
    // ★ Never in the frame the verdict landed in: the hiding must have been PAINTED with the grown verdict, or the page
    // below is seen moving. (Measured: with the rows already cached the effect settled synchronously, before the first
    // paint, and the page below moved 0.39.) So the release waits two animation frames.
    const frame = (next: () => void) => {
      if (typeof requestAnimationFrame === "function") requestAnimationFrame(next);
      else window.setTimeout(next, 16);
    };
    const done = () => {
      if (!live) return;
      live = false;
      observer?.disconnect();
      document.removeEventListener("click", done);
      document.removeEventListener("keyup", done);
      frame(() => frame(() => {
        if (mounted) setSettling(false);
      }));
    };
    const block = verdictRef.current?.querySelector('[data-testid="offers-block"]') ?? null;
    const rowsIn = () => !!block?.querySelector('[data-testid="offers-packs"]');
    if (!block || rowsIn()) {
      done();
      return () => {
        mounted = false;
      };
    }
    document.addEventListener("click", done);
    document.addEventListener("keyup", done);
    if (typeof MutationObserver === "function") {
      observer = new MutationObserver(() => {
        if (rowsIn()) done();
      });
      observer.observe(block, { childList: true, subtree: true });
    }
    // The same module OffersBlock's lazy() loads. The rows normally appear right after it resolves (the observer above
    // settles then); a block that has rendered no rows a second after the module is in has none to show (or its chunk
    // failed): settle then, so the page below is never left hidden. (A few frames were not enough on a slow phone: React
    // can render the lazy rows later than that, and the rows then moved the shown page — measured 0.285 once at 4x CPU.)
    let fallback: number | undefined;
    const later = () => {
      if (live) fallback = window.setTimeout(done, 1000);
    };
    void import("../packs/OfferRows").then(later, later);
    return () => {
      if (fallback !== undefined) window.clearTimeout(fallback);
      mounted = false;
      live = false;
      observer?.disconnect();
      document.removeEventListener("click", done);
      document.removeEventListener("keyup", done);
    };
    // Once, for the early tap this mount started with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // SPEED-SITE-1a-fu: DELIBERATE — the question is chosen once per mount (from the visit's subject hint and seed) and
  // does NOT swap if the subject hint changes later in the visit: a student must never see the question they are
  // reading replaced under their thumb. A new mount (a new visit / reopening the card) picks again.
  useEffect(() => {
    if (mcq) return undefined;
    let live = true;
    void (async (): Promise<LoadedMcq | null> => {
      if (challengeId) {
        try {
          const { resolveChallengeQuestion } = await import("./challengeBank");
          const q = await resolveChallengeQuestion(challengeId);
          if (q) {
            if (live) trackFriendChallenge("friend_challenge_open");
            return loadedFromChallenge(q);
          }
        } catch {
          /* fall back to the normal ladder */
        }
      }
      return loadStarter(starter);
    })().then((m) => {
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
      markLadderStart();
      trackOneMinute("one_min_tap_shown");
      markLadderSeen();
    }
    if (picked === null) onLine(CI_DEMO_COPY.ladderHead, "tap");
    else if (picked === mcq.right) onLine(CI_DEMO_COPY.ladderRight, "right");
    else onLine(CI_DEMO_COPY.ladderWrong, "wrong");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mcq, picked]);

  const reported = useRef(false);
  // SPEED-CI-2 (reviews of #1639, FU1 + B3): an early tap is RECORDED at once (onAnswered, `early`), and the only
  // thing that waits is layout: the reserved verdict box and the page's landing line (hidden in place meanwhile, by
  // CSS) are given back AFTER the student's next tap or key has COMPLETED (click / keyup, then a task) — never on
  // pointerdown (that would move the very thing being tapped, or start with a scroll) — still inside the input's
  // 500 ms window, so it is not a counted layout shift. Leaving the card settles it too.
  useEffect(() => {
    if (early === null || !mcq || reported.current) return;
    reported.current = true;
    takeLadderTap(mcq.starter.bankId);
    report(mcq, early, true);
    // Once, for the early tap this mount started with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const settle = useRef(onSettled);
  settle.current = onSettled;
  useEffect(() => {
    if (!reserve) return undefined;
    let timer: number | undefined;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      setReserve(false);
      settle.current?.();
    };
    const after = () => {
      if (timer === undefined) timer = window.setTimeout(finish, 0);
    };
    document.addEventListener("click", after);
    document.addEventListener("keyup", after);
    return () => {
      document.removeEventListener("click", after);
      document.removeEventListener("keyup", after);
      if (timer !== undefined) window.clearTimeout(timer);
      if (!done) {
        done = true;
        settle.current?.();
      }
    };
  }, [reserve]);

  /** The answered tap, recorded: unchanged ONE-MINUTE-1 behaviour (0 or full on the tap alone). */
  function report(m: LoadedMcq, i: number, early = false) {
    const ok = i === m.right;
    trackOneMinute("one_min_tap_answered", { correct: ok });
    const answer: LadderAnswer = {
      bankId: m.starter.bankId,
      subject: m.starter.subject,
      topicKey: m.topicKey,
      topicName: m.topicName,
      question: m.question,
      correct: ok,
      ...(ok ? {} : wrongPickFields(m.options, m.options[i], m.options[m.right])),
    };
    if (early) onAnswered(answer, { early: true });
    else onAnswered(answer);
  }

  if (!mcq) return <div className="ci-demo__ladder ci-demo__ladder--wait" data-testid="one-min-wait" aria-busy="true" />;

  const done = picked !== null;
  const correct = done && picked === mcq.right;

  function tap(i: number) {
    if (!mcq || done) return;
    setPicked(i);
    report(mcq, i);
  }

  return (
    <div
      className="ci-demo__ladder"
      data-testid="one-min-ladder"
      data-step={done ? "verdict" : "tap"}
      data-settling={settling ? "" : undefined}
    >
      <LadderMeta subject={mcq.starter.subject} topicName={mcq.topicName} />
      <LadderQuestionText question={mcq.question} />
      {done ? (
        <p
          className={`ci-demo__verdict-mark ${correct ? "ci-demo__verdict-mark--right" : "ci-demo__verdict-mark--wrong"}`}
          data-testid="one-min-verdict"
          ref={markRef}
          role="status"
        >
          {correct ? "✓ 1/1" : "✗ 0/1"}
          <span className="ci-demo__verdict-ans">
            {" "}
            Right answer: {ladderLetter(mcq.right)}. {subscriptFormulas(mcq.options[mcq.right])}
          </span>
        </p>
      ) : null}

      <LadderOptions options={mcq.options} right={mcq.right} picked={picked} onTap={tap} />

      {done ? (
        <div className={`ci-demo__verdict ci-nav-clear${reserve ? " ci-demo__verdict--reserve" : ""}`} ref={verdictRef}>
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
          {correct ? <ChallengeFriendButton placement="ladder" question={challengeFrom(mcq)} /> : null}
          {onMore ? (
            <button
              type="button"
              className="ci-ladder-more__btn"
              data-testid="one-min-more"
              onClick={() => onMore({ subject: mcq.starter.subject, chapter: mcq.topicKey || mcq.starter.topicKey })}
            >
              {LADDER_MORE_COPY}
            </button>
          ) : null}
          {/* OFFERS-V2 - the one buying block at the first verdict: the Board Pass card, then this chapter's pack rows. Non-paid students only. */}
          <LadderOffers chapterSlug={mcq.topicKey} chapterName={mcq.topicName} />
        </div>
      ) : null}

      <button type="button" className="ci-demo__link" data-testid="one-min-watch" onClick={onWatch}>
        {CI_DEMO_COPY.ladderWatch}
      </button>
    </div>
  );
}
