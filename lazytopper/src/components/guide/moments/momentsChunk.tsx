/**
 * MOMENTS-1 — everything a moment DRAWS and SAYS, in ONE lazily loaded chunk (Vite emits
 * `assets/momentsChunk-<hash>.js` + CSS). Reached only through the dynamic import in ./moments.tsx.
 *
 *   GuideMoment   — one character slot + one speech bubble, in the page's flow. Byte (blue) guides
 *                   and explains; Ziggy (green) reacts. They NEVER stand side by side: when both
 *                   speak in one moment, Ziggy says his line first, then Byte REPLACES him in the
 *                   same spot (BEAT_MS later). Reduced motion → the final frame at once, still.
 *   SolutionsPeek — M10: Byte peeking in at the corner of the NCERT solutions page (the public
 *                   peek's pattern: fixed, portalled, bottom-left; × closes it).
 *
 * Every bubble carries a visible "Hide mascots" button (PART 0). The copy below is the owner's,
 * word for word (22 Oct 2026); tests pin it.
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import BlobCharacter from "../BlobCharacter";
import { prefersReducedMotion, type CharacterKind, type Pose } from "../rig";
import { guidePreviewActive, trackGuideEvent } from "../guideVariant";
import type { GuideMomentId } from "../../../analytics/analytics";
import { MASCOTS_TOAST_COPY, hideMascotsWithUndo } from "./mascotsToast";
import "../guide.css";
import "./moments.css";

export interface Beat {
  kind: Extract<CharacterKind, "byte" | "ziggy">;
  pose: Pose;
  line: string;
}

/** The owner's copy (22 Oct 2026). Do not reword. */
export const MOMENT_COPY = {
  m3Byte: "Tap the answer you think is right. No typing.",
  m3Ziggy: "Yes! 1 of 5. Next one.",
  m4Type: "Write every step. CBSE gives marks for each one.",
  m4Upload: "Flat page, good light, whole answer in the photo.",
  m5Ziggy: "Fingers crossed…",
  m5Byte: "Marking it step by step, like a CBSE examiner.",
  m5ByteMcq: "Checking your answers, like a CBSE examiner.",
  m6Ziggy: "Hmm. Even I can't read that one.",
  m6Byte: "Flat page, good light, whole answer in the photo. Try again?",
  m8Safe: "Sorry, the connection dropped. Your answer is safe.",
  m8: "Sorry, the connection dropped. Please try again.",
  m9: "Someone sent you this! Check one answer free. No sign-up.",
  m10: "Got it right? See which step loses marks. First check free.",
  m10Cta: "Check my answer",
  m11: "Nice! Write one answer in your notebook and snap a photo. I'll mark it step by step.",
  m11Cta: "Check a written answer",
  close: "Close Byte",
  adminPreview: "Admin preview",
} as const;

/** Each moment's script, by step. A two-beat script is Ziggy first, then Byte in the same spot. */
export const MOMENT_SCRIPTS = {
  m3: {
    byte: [{ kind: "byte", pose: "point", line: MOMENT_COPY.m3Byte }],
    ziggy: [{ kind: "ziggy", pose: "excited", line: MOMENT_COPY.m3Ziggy }],
  },
  m4: {
    type: [{ kind: "byte", pose: "explain", line: MOMENT_COPY.m4Type }],
    upload: [{ kind: "byte", pose: "explain", line: MOMENT_COPY.m4Upload }],
  },
  m5: {
    written: [
      { kind: "ziggy", pose: "nervous", line: MOMENT_COPY.m5Ziggy },
      { kind: "byte", pose: "marking", line: MOMENT_COPY.m5Byte },
    ],
    mcq: [
      { kind: "ziggy", pose: "nervous", line: MOMENT_COPY.m5Ziggy },
      { kind: "byte", pose: "marking", line: MOMENT_COPY.m5ByteMcq },
    ],
  },
  m6: {
    unread: [
      { kind: "ziggy", pose: "confused", line: MOMENT_COPY.m6Ziggy },
      { kind: "byte", pose: "explain", line: MOMENT_COPY.m6Byte },
    ],
  },
  m8: {
    // MOMENTS-3: byte_sorry. Ziggy is sad only about his OWN result (guide), so a dropped connection is Byte's apology.
    safe: [{ kind: "byte", pose: "sorry", line: MOMENT_COPY.m8Safe }],
    plain: [{ kind: "byte", pose: "sorry", line: MOMENT_COPY.m8 }],
  },
  m9: {
    shared: [{ kind: "byte", pose: "hello", line: MOMENT_COPY.m9 }],
  },
  m11: {
    nudge: [{ kind: "byte", pose: "cheer", line: MOMENT_COPY.m11 }],
  },
} as const satisfies Partial<Record<GuideMomentId, Record<string, readonly Beat[]>>>;

type Scripts = typeof MOMENT_SCRIPTS;
export type ScriptedMoment = keyof Scripts;
export type MomentStep<M extends ScriptedMoment> = keyof Scripts[M] & string;

/**
 * A moment's own button (M11 only). GUIDE-SCORE-2 (owner ruling 23 Oct 17:57): Quick Practice has
 * its OWN working upload, so M11 never sends the student to another page — its button is the
 * host's IN-PAGE action (`onCta`: the set's working box, opened, scrolled to and focused). A
 * moment with no `to` and no host action draws no button at all (never a dead or off-page link).
 */
export const MOMENT_CTA: Partial<Record<GuideMomentId, { label: string; to?: string }>> = {
  m11: { label: MOMENT_COPY.m11Cta },
};

/** How long the first beat of a two-beat moment holds before the second replaces it ("about 2 s"). */
export const BEAT_MS = 2000;

export type GuideMomentProps = {
  [M in ScriptedMoment]: { moment: M; step: MomentStep<M> };
}[ScriptedMoment] & {
  /** The host's in-page action for the moment's button (MOMENT_CTA) — wins over any route. */
  onCta?: (() => void) | null;
};

function beatsFor(moment: ScriptedMoment, step: string): readonly Beat[] {
  const byStep = MOMENT_SCRIPTS[moment] as Record<string, readonly Beat[]>;
  return byStep[step] ?? [];
}

/** The "Hide mascots" button every bubble carries. */
function HideButton() {
  return (
    <button type="button" className="lt-mom__hide" data-testid="mascots-hide" onClick={hideMascotsWithUndo}>
      {MASCOTS_TOAST_COPY.hide}
    </button>
  );
}

export function GuideMoment({ moment, step, onCta }: GuideMomentProps) {
  const beats = beatsFor(moment, step);
  const reduce = useRef(prefersReducedMotion());
  // Reduced motion: the FINAL frame at once (no beat change, the rig still).
  const [index, setIndex] = useState(() => (reduce.current ? Math.max(0, beats.length - 1) : 0));
  const [preview] = useState(() => guidePreviewActive());

  // guide_moment_shown — once per mount of this moment (a step change, e.g. M3's swap, is the same moment).
  useEffect(() => {
    trackGuideEvent("guide_moment_shown", { moment });
    // MOMENTS-3: the new pose also reports under its own id (m5 / m8 keep reporting, unchanged).
    if (moment === "m5") trackGuideEvent("guide_moment_shown", { moment: "byte_marking" });
    if (moment === "m8") trackGuideEvent("guide_moment_shown", { moment: "byte_sorry" });
  }, [moment]);

  // A new step restarts its script.
  useEffect(() => {
    setIndex(reduce.current ? Math.max(0, beats.length - 1) : 0);
    if (reduce.current || beats.length < 2) return;
    const t = setTimeout(() => setIndex(1), BEAT_MS);
    return () => clearTimeout(t);
    // The script is fixed per (moment, step).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moment, step]);

  const beat = beats[Math.min(index, beats.length - 1)];
  const cta = MOMENT_CTA[moment];
  if (!beat) return null;
  return (
    <div
      className={`lt-mom lt-mom--${beat.kind}`}
      data-testid={`guide-moment-${moment}`}
      data-step={step}
      data-kind={beat.kind}
      data-pose={beat.pose}
      role="group"
      aria-label={beat.kind === "byte" ? "Byte" : "Ziggy"}
    >
      {/* key: one character at a time; the second beat REPLACES the first in this same slot. */}
      <BlobCharacter key={beat.kind} kind={beat.kind} pose={beat.pose} className="lt-mom__char" still={reduce.current || undefined} />
      <div className="lt-mom__bub">
        {preview ? (
          <span className="lt-mom__admin" data-testid="guide-admin-preview">
            {MOMENT_COPY.adminPreview}
          </span>
        ) : null}
        <p className="lt-mom__say" aria-live="polite" data-testid="guide-moment-line">
          {beat.line}
        </p>
        {cta && onCta ? (
          <button
            type="button"
            className="lt-mom__cta"
            data-testid={`guide-moment-${moment}-cta`}
            onClick={() => {
              trackGuideEvent("guide_moment_click", { moment });
              onCta();
            }}
          >
            {cta.label}
          </button>
        ) : cta?.to ? (
          <Link
            to={cta.to}
            className="lt-mom__cta"
            data-testid={`guide-moment-${moment}-cta`}
            onClick={() => trackGuideEvent("guide_moment_click", { moment })}
          >
            {cta.label}
          </Link>
        ) : null}
        <HideButton />
      </div>
    </div>
  );
}

/* ── M10 — Byte peeks in on the NCERT solutions page ─────────────────────────────────────── */

export interface SolutionsPeekProps {
  onClose: () => void;
}

export function SolutionsPeek({ onClose }: SolutionsPeekProps) {
  const reduce = useRef(prefersReducedMotion());
  const [preview] = useState(() => guidePreviewActive());
  useEffect(() => {
    trackGuideEvent("guide_moment_shown", { moment: "m10" });
  }, []);
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="lt-mom-peek" data-testid="guide-moment-m10" role="group" aria-label="Byte">
      <BlobCharacter kind="byte" pose="peek" className="lt-mom-peek__byte" still={reduce.current || undefined} />
      <div className="lt-mom__bub lt-mom-peek__bub">
        {preview ? (
          <span className="lt-mom__admin" data-testid="guide-admin-preview">
            {MOMENT_COPY.adminPreview}
          </span>
        ) : null}
        <p className="lt-mom__say" data-testid="guide-moment-line">
          {MOMENT_COPY.m10}
        </p>
        <div className="lt-mom-peek__acts">
          <Link to="/check-improve" className="lt-mom-peek__cta" data-testid="guide-moment-m10-cta">
            {MOMENT_COPY.m10Cta}
          </Link>
          <HideButton />
        </div>
      </div>
      <button type="button" className="lt-mom-peek__x" aria-label={MOMENT_COPY.close} data-testid="guide-moment-m10-close" onClick={onClose}>
        ✕
      </button>
    </div>,
    document.body,
  );
}
