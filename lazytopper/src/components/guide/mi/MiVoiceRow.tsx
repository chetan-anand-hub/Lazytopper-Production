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
import { lazy, Suspense, useEffect, useMemo, useState, type ComponentType } from "react";
import { resolveGuideVariant } from "../guideVariant";
import { miVoiceFor, type MiVoiceInput } from "./miVoiceModel";
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

export interface MiVoiceRowProps {
  uid: string | null;
  input: MiVoiceInput;
}

export function MiVoiceRow({ uid, input }: MiVoiceRowProps) {
  const guideArm = resolveGuideVariant(uid) === "guide";
  const voice = useMemo(() => (guideArm ? miVoiceFor(input) : null), [guideArm, input]);
  const idle = useIdle(voice !== null);
  const state = voice?.state ?? null;

  useEffect(() => {
    if (state) noteMiVoiceShown(state);
  }, [state]);

  if (!voice) return null;
  return (
    <div
      className="lt-mi-voice"
      data-testid="mi-voice"
      data-state={voice.state}
      data-kind={voice.kind}
      data-pose={voice.pose}
    >
      <span className="lt-mi-voice__slot" data-testid="mi-voice-slot">
        {idle ? (
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
