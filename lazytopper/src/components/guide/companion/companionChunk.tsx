/**
 * COMPANION-1 — everything a companion moment DRAWS and SAYS, in ONE lazily loaded chunk (Vite emits
 * `assets/companionChunk-<hash>.js` + CSS). Reached only through the dynamic import in ./companion.tsx,
 * so the control arm and a student with nothing due never download it.
 *
 *   CompanionCard — one character slot + one bubble. Byte (blue) guides; Ziggy (green) reacts. They
 *                   NEVER stand side by side: the high five is Ziggy first, then Byte REPLACES him in
 *                   the same slot (BEAT_MS later). Reduced motion → the final frame at once, still.
 *                   `fixed` → the late-night note: bottom-left, portalled, never over the page's flow.
 *   BreatheCard   — byte_breathe before a Chapter Test / Full Mock: 10 s, skippable, never blocking.
 *   DuetCard      — a short two-character SCENE (owner ruling 23 Oct 16:40): comfort, the high five,
 *                   a milestone. Only when ../sceneGuard.ts allows it (one per app session, never
 *                   during a question or test, ≥ 360 px); otherwise the solo CompanionCard plays.
 *
 * Every bubble carries "Hide mascots" (MOMENTS-1 PART 0). While a card is up, the sidebar's MI voice
 * character steps out of sight (companion.css): outside a scene, ONE character is on screen.
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import BlobCharacter from "../BlobCharacter";
import { DUET_SCENES, prefersReducedMotion, type DuetScene, type Pose } from "../rig";
import { guidePreviewActive, trackGuideEvent } from "../guideVariant";
import { MASCOTS_TOAST_COPY, hideMascotsWithUndo } from "../moments/mascotsToast";
import { festivalPropsNow } from "./festival";
import { BREATHE_TOTAL_MS, COMPANION_EVENT_ID, type CompanionMomentId, type MilestoneId } from "./companionModel";
import "../guide.css";
import "../moments/moments.css";
import "./companion.css";

/**
 * THE ONE COPY TABLE (COMPANION-1 §D). Warm, ≤18 words a line, no "½", never shaming; a quiet
 * week or a missed day is never mentioned. `{x}` slots take only numbers already on the page.
 * Tests pin every rule above against this table.
 */
export const COMPANION_COPY = {
  lowScore: "Tough one. Let's fix just one thing first.",
  lowScoreCta: "Fix one thing",
  breathe: "Breathe in… and out. You've prepared for this.",
  breatheSkip: "Skip",
  breatheDone: "Done",
  improveZiggy: "Up from {from}% to {to}%. High five!",
  improveByte: "Same chapter, better marks. That's real progress.",
  milestoneFirstWritten: "Your first written answer, checked! Badge earned.",
  milestoneFirstChapterTest: "First Chapter Test done! Badge earned.",
  milestoneFirstFullMock: "A whole Full Mock, done! Badge earned.",
  milestoneAnswers10: "10 answers checked! You're building a real habit.",
  milestoneAnswers50: "50 answers checked! Proper topper energy.",
  welcomeBack: "Welcome back! 5 quick questions to warm up?",
  welcomeBackCta: "Warm up: 5 questions",
  lateNightYawn: "Yawn… it's getting late.",
  lateNight: "It's late — sleep helps memory. Stop here and come back fresh?",
  rhythm: "{days} days this week — nice rhythm!",
  countdown: "{days} days to your boards. Chalo, one chapter at a time.",
  examWeek: "Exam week! Revise lightly, rest well, and trust your preparation.",
  examDay: "Exam day! Take one slow breath. You've prepared for this.",
  close: "Close",
  adminPreview: "Admin preview",
} as const;

export const MILESTONE_COPY: Record<MilestoneId, string> = {
  firstWritten: COMPANION_COPY.milestoneFirstWritten,
  firstChapterTest: COMPANION_COPY.milestoneFirstChapterTest,
  firstFullMock: COMPANION_COPY.milestoneFirstFullMock,
  answers10: COMPANION_COPY.milestoneAnswers10,
  answers50: COMPANION_COPY.milestoneAnswers50,
};

export interface CompanionBeat {
  kind: "byte" | "ziggy";
  pose: Pose;
  line: string;
}

/** Fill `{name}` slots with whole numbers only (anything else leaves the line unchanged → not shown). */
export function fillLine(line: string, vars: Readonly<Record<string, number>> = {}): string {
  return line.replace(/\{(\w+)\}/g, (all, k: string) => {
    const v = vars[k];
    return typeof v === "number" && Number.isFinite(v) ? String(Math.round(v)) : all;
  });
}

/** Each moment's script (solo beats). A two-beat script is Ziggy first, then Byte in the same slot. */
export function companionBeats(moment: CompanionMomentId, opts: { milestone?: MilestoneId; days?: number } = {}): CompanionBeat[] {
  switch (moment) {
    case "lowScore":
      return [{ kind: "byte", pose: "comfort", line: COMPANION_COPY.lowScore }];
    case "breathe":
      return [{ kind: "byte", pose: "breathe", line: COMPANION_COPY.breathe }];
    case "improve":
      return [
        { kind: "ziggy", pose: "highfive", line: COMPANION_COPY.improveZiggy },
        { kind: "byte", pose: "highfiveL", line: COMPANION_COPY.improveByte },
      ];
    case "milestone":
      return [{ kind: "ziggy", pose: "badge", line: MILESTONE_COPY[opts.milestone ?? "firstWritten"] }];
    case "welcomeBack":
      return [{ kind: "ziggy", pose: "study", line: COMPANION_COPY.welcomeBack }];
    case "lateNight":
      // MOMENTS-3: Ziggy yawns first, then Byte's moon line (one at a time, never a scene).
      return [
        { kind: "ziggy", pose: "yawn", line: COMPANION_COPY.lateNightYawn },
        { kind: "byte", pose: "moon", line: COMPANION_COPY.lateNight },
      ];
    case "examWeek":
      // Only reached with an OFFICIAL exam date (companion.tsx); `days` 0 = the day itself.
      return [{ kind: "ziggy", pose: "examday", line: opts.days === 0 ? COMPANION_COPY.examDay : COMPANION_COPY.examWeek }];
    case "rhythm":
      return [{ kind: "ziggy", pose: "streak", line: COMPANION_COPY.rhythm }];
    case "countdown":
      return [{ kind: "byte", pose: "calendar", line: COMPANION_COPY.countdown }];
    default:
      return [];
  }
}

/** How long the first beat of a two-beat moment holds before the second replaces it. */
export const BEAT_MS = 2000;

export interface CompanionCardProps {
  moment: CompanionMomentId;
  milestone?: MilestoneId;
  vars?: Record<string, number>;
  /** Where the moment's own button goes (its label is this table's): an INTERNAL route only. */
  ctaTo?: string | null;
  /** The late-night note: fixed bottom-left, portalled to <body>. */
  fixed?: boolean;
  /** Drawn: the door spends the once-only marker now (never before the drawing exists). */
  onShown?: () => void;
  /** false → no guide_moment_shown on this mount (the late note re-appearing after a quiet route). */
  trackShown?: boolean;
  onClose: () => void;
}

function useBodyFlag(): void {
  useEffect(() => {
    if (typeof document === "undefined" || !document.body) return;
    const b = document.body;
    const n = Number(b.getAttribute("data-lt-companion-n") || "0") + 1;
    b.setAttribute("data-lt-companion-n", String(n));
    b.setAttribute("data-lt-companion", "on");
    return () => {
      const left = Number(b.getAttribute("data-lt-companion-n") || "1") - 1;
      if (left <= 0) {
        b.removeAttribute("data-lt-companion");
        b.removeAttribute("data-lt-companion-n");
      } else b.setAttribute("data-lt-companion-n", String(left));
    };
  }, []);
}

function internal(to: string): boolean {
  return to.startsWith("/") && !to.startsWith("//") && !to.includes("\\");
}

/** The moments that carry their own button, and its words. */
export const COMPANION_CTA_LABEL: Partial<Record<CompanionMomentId, string>> = {
  lowScore: COMPANION_COPY.lowScoreCta,
  welcomeBack: COMPANION_COPY.welcomeBackCta,
};

export function CompanionCard({ moment, milestone, vars, ctaTo, fixed, onShown, trackShown = true, onClose }: CompanionCardProps) {
  const beats = companionBeats(moment, { milestone, days: vars?.days });
  // MOMENTS-3 — Diwali props (5–10 Nov 2026 IST) on Home-door cards; never the late-night note or breathe.
  const [festival] = useState(() => (fixed || moment === "breathe" ? undefined : festivalPropsNow()));
  const reduce = useRef(prefersReducedMotion());
  const [index, setIndex] = useState(() => (reduce.current ? Math.max(0, beats.length - 1) : 0));
  const [preview] = useState(() => guidePreviewActive());
  const shownRef = useRef(onShown);
  // A `{slot}` with no number → the card says nothing (and spends nothing) rather than guess.
  const missing = beats.some((b) => /\{\w+\}/.test(fillLine(b.line, vars)));
  useBodyFlag();

  useEffect(() => {
    if (missing) return;
    if (trackShown) trackGuideEvent("guide_moment_shown", { moment: COMPANION_EVENT_ID[moment] });
    shownRef.current?.();
    // Once per mount of this moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moment]);

  useEffect(() => {
    if (reduce.current || beats.length < 2) return;
    const t = setTimeout(() => setIndex(1), BEAT_MS);
    return () => clearTimeout(t);
    // The script is fixed per moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moment]);

  const beat = beats[Math.min(index, beats.length - 1)];
  if (!beat || missing) return null;
  const line = fillLine(beat.line, vars);
  const label = COMPANION_CTA_LABEL[moment];
  const link = label && ctaTo && internal(ctaTo) ? { label, to: ctaTo } : null;
  const card = (
    <div
      className={`lt-mom lt-mom--${beat.kind} lt-cmp${fixed ? " lt-cmp--fixed" : ""}`}
      data-testid={`guide-companion-${moment}`}
      data-kind={beat.kind}
      data-pose={beat.pose}
      role="group"
      aria-label={beat.kind === "byte" ? "Byte" : "Ziggy"}
    >
      {/* key: one character at a time; the second beat REPLACES the first in this same slot. */}
      <BlobCharacter key={beat.kind} kind={beat.kind} pose={beat.pose} className="lt-mom__char lt-cmp__char" still={reduce.current || undefined} extraProps={festival} />
      <div className="lt-mom__bub">
        {preview ? (
          <span className="lt-mom__admin" data-testid="guide-admin-preview">
            {COMPANION_COPY.adminPreview}
          </span>
        ) : null}
        <p className="lt-mom__say" aria-live="polite" data-testid="guide-companion-line">
          {line}
        </p>
        {link ? (
          <Link
            to={link.to}
            className="lt-mom__cta"
            data-testid={`guide-companion-${moment}-cta`}
            onClick={() => trackGuideEvent("guide_moment_click", { moment: COMPANION_EVENT_ID[moment] })}
          >
            {link.label}
          </Link>
        ) : null}
        <div className="lt-cmp__acts">
          <button type="button" className="lt-mom__hide" data-testid="mascots-hide" onClick={hideMascotsWithUndo}>
            {MASCOTS_TOAST_COPY.hide}
          </button>
          <button type="button" className="lt-cmp__close" data-testid="guide-companion-close" onClick={onClose}>
            {COMPANION_COPY.close}
          </button>
        </div>
      </div>
    </div>
  );
  if (fixed && typeof document !== "undefined") return createPortal(card, document.body);
  return card;
}

/* ── DUET — a short two-character scene (owner ruling 23 Oct 16:40; ../sceneGuard.ts decides) ── */

/** Which scene each scene-capable moment plays. */
export const MOMENT_SCENE = {
  lowScore: "comfort",
  improve: "highfive",
  milestone: "milestone",
} as const satisfies Partial<Record<CompanionMomentId, DuetScene>>;
export type SceneMoment = keyof typeof MOMENT_SCENE;

export interface DuetCardProps {
  moment: SceneMoment;
  milestone?: MilestoneId;
  vars?: Record<string, number>;
  ctaTo?: string | null;
  onShown?: () => void;
  onClose: () => void;
}

/** The scene's one line (the same words as the solo moment's opening line). */
export function duetLine(moment: SceneMoment, milestone?: MilestoneId): string {
  if (moment === "lowScore") return COMPANION_COPY.lowScore;
  if (moment === "improve") return COMPANION_COPY.improveZiggy;
  return MILESTONE_COPY[milestone ?? "firstWritten"];
}

/**
 * Byte (left) and Ziggy (right) together, briefly: Byte's hand on a sad Ziggy's shoulder (Ziggy turns
 * relieved after BEAT_MS), a real high five with the hands meeting in the middle, or Byte cheering
 * beside Ziggy and his badge. Reduced motion → the final frame, still.
 */
export function DuetCard({ moment, milestone, vars, ctaTo, onShown, onClose }: DuetCardProps) {
  const scene = DUET_SCENES[MOMENT_SCENE[moment]];
  const reduce = useRef(prefersReducedMotion());
  const zig = scene.ziggy as readonly Pose[];
  const [zi, setZi] = useState(() => (reduce.current ? zig.length - 1 : 0));
  const [preview] = useState(() => guidePreviewActive());
  const [festival] = useState(() => festivalPropsNow());
  const shownRef = useRef(onShown);
  const line = fillLine(duetLine(moment, milestone), vars);
  const missing = /\{\w+\}/.test(line);
  useBodyFlag();

  useEffect(() => {
    if (missing) return;
    trackGuideEvent("guide_moment_shown", { moment: COMPANION_EVENT_ID[moment] });
    shownRef.current?.();
    // Once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moment]);

  useEffect(() => {
    if (reduce.current || zig.length < 2) return;
    const t = setTimeout(() => setZi(zig.length - 1), BEAT_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moment]);

  if (missing) return null;
  const label = COMPANION_CTA_LABEL[moment];
  const link = label && ctaTo && internal(ctaTo) ? { label, to: ctaTo } : null;
  return (
    <div
      className="lt-mom lt-mom--duet lt-cmp lt-cmp--duet"
      data-testid={`guide-companion-${moment}`}
      data-scene={MOMENT_SCENE[moment]}
      role="group"
      aria-label="Byte and Ziggy"
    >
      <div className="lt-cmp-duet__pair">
        <BlobCharacter kind="byte" pose={scene.byte} className="lt-mom__char lt-cmp__char lt-cmp-duet__byte" still={reduce.current || undefined} extraProps={festival} />
        <BlobCharacter kind="ziggy" pose={zig[zi]} className="lt-mom__char lt-cmp__char lt-cmp-duet__ziggy" still={reduce.current || undefined} />
      </div>
      <div className="lt-mom__bub">
        {preview ? (
          <span className="lt-mom__admin" data-testid="guide-admin-preview">
            {COMPANION_COPY.adminPreview}
          </span>
        ) : null}
        <p className="lt-mom__say" aria-live="polite" data-testid="guide-companion-line">
          {line}
        </p>
        {link ? (
          <Link
            to={link.to}
            className="lt-mom__cta"
            data-testid={`guide-companion-${moment}-cta`}
            onClick={() => trackGuideEvent("guide_moment_click", { moment: COMPANION_EVENT_ID[moment] })}
          >
            {link.label}
          </Link>
        ) : null}
        <div className="lt-cmp__acts">
          <button type="button" className="lt-mom__hide" data-testid="mascots-hide" onClick={hideMascotsWithUndo}>
            {MASCOTS_TOAST_COPY.hide}
          </button>
          <button type="button" className="lt-cmp__close" data-testid="guide-companion-close" onClick={onClose}>
            {COMPANION_COPY.close}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── 2 — breathe before a Chapter Test / Full Mock ─────────────────────────────────────────────── */

export interface BreatheCardProps {
  /** The student's own Skip / Done tap. The test is never waiting on this, and nothing collapses the card
   *  but this tap (a card that left by itself would move the Start button under a finger). */
  onDone: () => void;
}

export function BreatheCard({ onDone }: BreatheCardProps) {
  const reduce = useRef(prefersReducedMotion());
  const [preview] = useState(() => guidePreviewActive());
  const done = useRef(onDone);
  done.current = onDone;
  const [ended, setEnded] = useState(false);
  useBodyFlag();
  useEffect(() => {
    trackGuideEvent("guide_moment_shown", { moment: COMPANION_EVENT_ID.breathe });
    // After the ten seconds the button turns from "Skip" into "Done"; the card stays until it is tapped.
    const t = setTimeout(() => setEnded(true), BREATHE_TOTAL_MS);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="lt-mom lt-mom--byte lt-cmp lt-cmp--breathe" data-testid="guide-companion-breathe" data-kind="byte" data-pose="breathe" role="group" aria-label="Byte">
      <BlobCharacter kind="byte" pose="breathe" className="lt-mom__char lt-cmp__char" still={reduce.current || undefined} />
      <div className="lt-mom__bub">
        {preview ? (
          <span className="lt-mom__admin" data-testid="guide-admin-preview">
            {COMPANION_COPY.adminPreview}
          </span>
        ) : null}
        <p className="lt-mom__say" aria-live="polite" data-testid="guide-companion-line">
          {COMPANION_COPY.breathe}
        </p>
        <div className="lt-cmp__acts">
          <button type="button" className="lt-cmp__close" data-testid="guide-companion-skip" onClick={() => done.current()}>
            {ended ? COMPANION_COPY.breatheDone : COMPANION_COPY.breatheSkip}
          </button>
          <button type="button" className="lt-mom__hide" data-testid="mascots-hide" onClick={hideMascotsWithUndo}>
            {MASCOTS_TOAST_COPY.hide}
          </button>
        </div>
      </div>
    </div>
  );
}
