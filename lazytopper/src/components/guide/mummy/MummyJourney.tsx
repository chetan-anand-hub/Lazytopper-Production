/**
 * MUMMY-1 — Mummy's journey on /for-parents (prototype scene D): worry → report → relief → pride,
 * four beats that walk a parent to the page's two actions (send to the child; check one answer
 * free). Mummy appears on /for-parents ONLY.
 *
 * ★ THE TEXT IS PLAIN HTML, MUMMY IS NOT. All four beats are in the DOM (the inactive ones
 * `hidden`), so the prerendered page carries every title and line for a crawler. Mummy's SVG is
 * drawn client-side, after the page is idle, from the lazily loaded ./mummyChunk.tsx (the rig never
 * enters the page chunk), into a fixed-size slot that is always there, so nothing shifts.
 *
 * ★ BEAT 4 REUSES THE PAGE'S OWN TWO ACTIONS. The page passes its ShareButton and FreeCheckLink
 * (placement "journey") in as `actions`: the same href, the same handler, never a new link.
 *
 * Reduced motion: the rig shows still poses, and beat changes swap without animation (CSS).
 * Analytics: `mummy_seen { beat: 1 }` once per page load when the section first enters the
 * viewport, `mummy_beat { beat }` once per beat per mount when a visitor moves the story, and
 * `mummy_tap`; all suppressed under the guide preview (mummyModel.mummyPreviewActive).
 */
import { lazy, Suspense, useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import "./mummyJourney.css";
import {
  MUMMY_BEATS,
  MUMMY_COPY,
  MUMMY_IDLE_TIMEOUT_MS,
  MUMMY_LAUGH_MS,
  shouldDrawMummy,
  trackMummyBeat,
  trackMummySeen,
  trackMummyTap,
  type MummyBeatNumber,
  type MummyPose,
} from "./mummyModel";
import type { MummyFigureProps } from "./mummyChunk";

const NoFigure: ComponentType<MummyFigureProps> = () => null;
/** The ONLY door into the mummy chunk; a failed load draws nothing (the section still works). */
const LazyMummyFigure = lazy(() =>
  import("./mummyChunk").then(
    (m) => ({ default: m.MummyFigure }),
    () => ({ default: NoFigure }),
  ),
);

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
  cancelIdleCallback?: (h: number) => void;
};

/** True once the page is idle (never in an automated browser: see shouldDrawMummy). */
function useDrawAfterIdle(): boolean {
  const [draw, setDraw] = useState(false);
  useEffect(() => {
    if (!shouldDrawMummy()) return;
    const w = window as IdleWindow;
    if (typeof w.requestIdleCallback === "function") {
      const h = w.requestIdleCallback(() => setDraw(true), { timeout: MUMMY_IDLE_TIMEOUT_MS });
      return () => w.cancelIdleCallback?.(h);
    }
    const t = setTimeout(() => setDraw(true), 1);
    return () => clearTimeout(t);
  }, []);
  return draw;
}

/** `mummy_seen` when the section first enters the viewport (IntersectionObserver; none → nothing). */
function useSeenOnce(ref: { current: HTMLElement | null }): void {
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver !== "function") return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        trackMummySeen();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
}

export interface MummyJourneyProps {
  /** Beat 4's actions: the page's own ShareButton + FreeCheckLink (placement "journey"). */
  actions: ReactNode;
}

export default function MummyJourney({ actions }: MummyJourneyProps) {
  const [index, setIndex] = useState(0);
  const [laughing, setLaughing] = useState(false);
  const laughTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sent = useRef(new Set<MummyBeatNumber>());
  const draw = useDrawAfterIdle();
  const sectionRef = useRef<HTMLElement | null>(null);
  useSeenOnce(sectionRef);
  const beat = MUMMY_BEATS[index];
  const pose: MummyPose = laughing ? "laugh" : beat.pose;

  useEffect(
    () => () => {
      if (laughTimer.current) clearTimeout(laughTimer.current);
    },
    [],
  );

  const goTo = (i: number) => {
    if (i === index || i < 0 || i >= MUMMY_BEATS.length) return;
    if (laughTimer.current) clearTimeout(laughTimer.current);
    setLaughing(false);
    setIndex(i);
    const n = MUMMY_BEATS[i].beat;
    if (!sent.current.has(n)) {
      sent.current.add(n);
      trackMummyBeat(n);
    }
  };

  const onTap = () => {
    trackMummyTap();
    if (laughTimer.current) clearTimeout(laughTimer.current);
    setLaughing(true);
    laughTimer.current = setTimeout(() => setLaughing(false), MUMMY_LAUGH_MS);
  };

  return (
    <section ref={sectionRef} aria-labelledby="fp-mummy" className="lt-mj" data-testid="mummy-journey" data-beat={beat.beat}>
      <h2 id="fp-mummy" className="lt-mj__h">
        {MUMMY_COPY.heading}
      </h2>
      <div className="lt-mj__stage">
        <div className="lt-mj__fig" data-testid="mummy-slot" aria-hidden="true">
          {draw ? (
            <Suspense fallback={null}>
              <LazyMummyFigure pose={pose} onTap={onTap} />
            </Suspense>
          ) : null}
        </div>
        {MUMMY_BEATS.map((b, i) => (
          <div key={b.beat} className="lt-mj__beat" data-testid={`mummy-beat-${b.beat}`} hidden={i !== index}>
            <p key={laughing ? "tap" : "line"} className="lt-mj__say" data-testid={i === index ? "mummy-line" : undefined}>
              {i === index && laughing ? MUMMY_COPY.tapLine : b.line}
            </p>
            <div className="lt-mj__card">
              <h3>{b.title}</h3>
              <p>{b.text}</p>
            </div>
            <div className={b.next ? "lt-mj__act" : "lt-mj__act is-send"}>
              {b.next ? (
                <button type="button" className="lt-mj__next" data-testid={`mummy-next-${b.beat}`} onClick={() => goTo(i + 1)}>
                  {b.next}
                </button>
              ) : (
                <div className="lt-fp__actions">{actions}</div>
              )}
            </div>
          </div>
        ))}
        <div className="lt-mj__dots" role="group" aria-label={MUMMY_COPY.steps}>
          {MUMMY_BEATS.map((b, i) => (
            <button
              key={b.beat}
              type="button"
              className={i === index ? "lt-mj__dot is-on" : "lt-mj__dot"}
              aria-label={MUMMY_COPY.stepLabel(b.beat)}
              aria-current={i === index ? "step" : undefined}
              data-testid={`mummy-dot-${b.beat}`}
              onClick={() => goTo(i)}
            >
              {b.beat}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
