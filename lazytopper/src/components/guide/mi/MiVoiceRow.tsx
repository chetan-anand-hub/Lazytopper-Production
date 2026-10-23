/**
 * MI-VOICE-1 — the character row ABOVE the sidebar Mistake Intel card's text (guide arm only).
 * The card's own text, numbers and links render unchanged below it: the character adds a
 * voice, it never replaces the facts. Mounted ONLY by components/desktop/MistakeIntelCard.tsx
 * (navy-sidebar chrome — CLAUDE.md §5: MI is never rendered on a page body).
 *
 * EAGER and tiny: this file holds the decision (arm + the pure model) and the bubble, which is
 * real text from fixed templates. The DRAWING (BlobCharacter + the rig) is a separate lazy
 * chunk (./MiVoiceCharacter.tsx), requested only for the guide arm and only after the browser
 * is idle, so the card's text never waits on it.
 *
 * NO LAYOUT SHIFT — the row is reserved at its final size for the guide arm on first render:
 * the arm and the moment are both known synchronously (the uid hash; the card's view state),
 * so the reserved row IS the final row. The bubble shows at once; the character fills a fixed
 * 56 px slot when its chunk lands (a failed load leaves the slot empty, never a broken card).
 * Reserving only once the chunk is ready would push the card's text down mid-read.
 */
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ComponentType, type RefObject } from "react";
import { resolveGuideVariant } from "../guideVariant";
import { useMascotsHidden } from "../mascotsMute";
import { useStageHeld } from "../scoreGuideStage";
import { miVoiceFor, type MiVoiceInput, type MiVoiceLine } from "./miVoiceModel";
import { noteMiVoiceShown } from "./miVoiceShown";
import type { MiVoiceCharacterProps } from "./MiVoiceCharacter";
import "./miVoice.css";

const Nothing: ComponentType<MiVoiceCharacterProps> = () => null;
const LazyMiVoiceCharacter = lazy(() =>
  import("./MiVoiceCharacter").then((m) => ({ default: m.default }), () => ({ default: Nothing })),
);

/** How long to wait for idle before loading the drawing anyway. */
export const MI_VOICE_IDLE_TIMEOUT_MS = 2000;

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  cancelIdleCallback?: (id: number) => void;
};

/** True once the browser has been idle (or the timeout passed) since mount. */
function useIdle(enabled: boolean): boolean {
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    if (!enabled || idle) return;
    const w = window as IdleWindow;
    if (typeof w.requestIdleCallback === "function") {
      const id = w.requestIdleCallback(() => setIdle(true), { timeout: MI_VOICE_IDLE_TIMEOUT_MS });
      return () => w.cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(() => setIdle(true), 200);
    return () => window.clearTimeout(t);
  }, [enabled, idle]);
  return idle;
}

/** In the layout (not display:none anywhere up the tree) and with a non-zero box. */
function laidOut(el: HTMLElement): boolean {
  if (el.offsetParent === null) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

/**
 * Review F10 — `mi_voice_shown` only when the row is ACTUALLY visible: laid out and
 * intersecting the viewport (IntersectionObserver). A sidebar hidden at a narrow width, or
 * scrolled out of view, sends nothing. Without IntersectionObserver nothing can prove the row
 * was seen, so nothing is sent.
 */
function useShownWhenVisible(ref: RefObject<HTMLDivElement | null>, state: MiVoiceLine["state"] | null): void {
  useEffect(() => {
    const el = ref.current;
    if (!state || !el || typeof IntersectionObserver !== "function") return;
    let done = false;
    const io = new IntersectionObserver((entries) => {
      if (done) return;
      if (entries.some((e) => e.isIntersecting) && laidOut(el)) {
        done = true;
        io.disconnect();
        noteMiVoiceShown(state);
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, state]);
}

export interface MiVoiceRowProps {
  uid: string | null;
  input: MiVoiceInput;
  /**
   * Review F2 — the account's cloud mistake history has been hydrated on this device
   * (AuthContext `mistakeLogsHydrated` > 0). Before that the card may still be reading a
   * cold device, so the character would voice a state ("No clues yet") that is about to
   * change: no row and no event until hydration.
   */
  hydrated: boolean;
}

export function MiVoiceRow({ uid, input, hydrated }: MiVoiceRowProps) {
  // MOMENTS-1 PART 0 — "Hide mascots" on this device: no row; the card's own text is unchanged.
  const mascotsHidden = useMascotsHidden();
  const guideArm = hydrated && !mascotsHidden && resolveGuideVariant(uid) === "guide";
  const voice = useMemo(() => (guideArm ? miVoiceFor(input) : null), [guideArm, input]);
  const idle = useIdle(voice !== null);
  const state = voice?.state ?? null;
  const rowRef = useRef<HTMLDivElement | null>(null);
  useShownWhenVisible(rowRef, state);
  const scorecardOnStage = useStageHeld("scorecard", "m11", "nudge");

  if (!voice) return null;
  return (
    <div
      ref={rowRef}
      className="lt-mi-voice"
      data-testid="mi-voice"
      data-state={voice.state}
      data-kind={voice.kind}
      data-pose={voice.pose}
    >
      <span className="lt-mi-voice__slot" data-testid="mi-voice-slot">
        {/* GUIDE-SCORE-1: a scorecard's character (or M11's Byte) holds the stage → this one steps
            aside (never two characters on screen); the line itself stays. */}
        {idle && !scorecardOnStage ? (
          <Suspense fallback={null}>
            {/* key: one character at a time — Ziggy and Byte never share the slot. */}
            <LazyMiVoiceCharacter key={voice.kind} kind={voice.kind} pose={voice.pose} bagLabel={voice.bagLabel} />
          </Suspense>
        ) : null}
      </span>
      <p className="lt-mi-voice__say" data-testid="mi-voice-line">
        {voice.line}
      </p>
    </div>
  );
}
