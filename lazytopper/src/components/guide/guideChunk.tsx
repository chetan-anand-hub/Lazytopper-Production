/**
 * GUIDE-1 — everything the guide DRAWS, in ONE lazily loaded chunk (Vite emits it as
 * `assets/guideChunk-<hash>.js` + its CSS). Nothing here is reached by a static import: the
 * pages load it through ./lazyGuide.tsx only when Byte or Ziggy is about to show, so the
 * control arm and every existing student never download it.
 *
 *   ByteGuide  — Byte's card: wave, one line, 4–5 options (the first "For you"); hover/focus →
 *                Byte points; tap → Byte cheers, then goes. "5 quick questions" opens the
 *                EXISTING Start-here ready state (owner, 20 Oct 15:10: keep the picker).
 *   GuideChip  — the small Byte in the corner after a close: waves once, reopens on tap.
 *   ZiggyStrip — Ziggy's reaction on the student's first scorecard.
 *   ScoreGuideBeats — GUIDE-SCORE-1: Ziggy's reaction, then Byte's next step, on every other
 *                graded scorecard (the lines come from ./scoreGuideModel.ts).
 */
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link, useInRouterContext, useNavigate } from "react-router-dom";
import "./guide.css";
import BlobCharacter from "./BlobCharacter";
import { prefersReducedMotion, type Pose } from "./rig";
import type { ChapterRef, GuideOption, GuideOptionId, GuidePlan } from "./intentMap";
import type { StartHereFocusSurface, StartHereSurface } from "../../analytics/analytics";
import { guidePreviewActive, trackGuideEvent } from "./guideVariant";
import { markCheckOneHandover } from "../startHere/startHereModel";
import type { ZiggyReaction } from "./ziggyModel";
import type { ScoreGuidePlan } from "./scoreGuideModel";
import { MASCOTS_TOAST_COPY, hideMascotsWithUndo } from "./moments/mascotsToast";

/* ── small glyphs (24×24, currentColor) ─────────────────────────────────────────────── */

const GLYPH: Record<GuideOptionId, ReactNode> = {
  quick: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M7 10h10M7 14h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  check_one: <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />,
  cbq: (
    <>
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="3.5" fill="currentColor" />
    </>
  ),
  important: (
    <>
      <path d="M6 3h9l4 4v14H6z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M9 12h7M9 16h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  full_mock: (
    <>
      <path d="M6 3h9l4 4v14H6z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M9 12h7M9 16h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  notes: (
    <>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5" fill="none" stroke="currentColor" strokeWidth="2" />
    </>
  ),
  trends: (
    <>
      <path d="M3 17l6-6 4 4 8-8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 7h6v6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </>
  ),
  tutor: <path d="M4 5h16v11H9l-5 4z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />,
  // GUIDE-OPTS-1 — a clock face (a timed test) and a pencil (written on paper).
  chapter_test: (
    <>
      <circle cx="12" cy="13" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M12 9v4l3 2M10 3h4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  worksheet: <path d="M4 20l1-4L16 5l3 3L8 19zM14 7l3 3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />,
};

/** How long Byte cheers before the page changes (0 under reduced motion). */
export const GUIDE_CHEER_MS = 450;

export const GUIDE_COPY = {
  close: "Close the guide",
  heading: "Byte's guide",
  forYou: "For you",
  cheerQuick: "Great pick! Tap a subject to start.",
  cheerGo: (title: string) => `Great pick! Opening ${title}…`,
  back: "Back to all options",
  chipOpen: "Open Byte's guide",
  chipClose: "Hide Byte for now",
  chipPing: "Need me? Tap!",
  welcomeBack: "Welcome back!",
  /** PREVIEW-1 — on Byte's panel and Ziggy's strip while an admin preview is active, so a
   *  screenshot can never pass for a real student's view. */
  adminPreview: "Admin preview",
} as const;

/** PREVIEW-1 — the "Admin preview" pill (never rendered without an active preview). */
function AdminPreviewPill({ className }: { className: string }) {
  return (
    <span className={className} data-testid="guide-admin-preview">
      {GUIDE_COPY.adminPreview}
    </span>
  );
}

export interface ByteGuideProps {
  /** inline = in the page where Start-here was; focus = inside the focused shell; sheet = reopened from the chip. */
  mode: "inline" | "focus" | "sheet";
  /** The page (CBQ on the Practice hub opens the page's own CBQ chooser instead of navigating). */
  page: StartHereSurface;
  /** The analytics surface for guide_option (the page, or "<page>_focus"). */
  eventSurface: StartHereSurface | StartHereFocusSurface;
  plan: GuidePlan;
  onClose: () => void;
  /** Review F1 — a POSITIVE choice closed Byte (no dismissed event, no Not-now count). Absent:
   *  Byte stays where he is (the inline card, under whatever the choice opened). */
  onDone?: () => void;
  /** The EXISTING Start-here ready state (one-tap subject buttons + "Change chapter or question type"). */
  renderQuick: (chapter: ChapterRef | null) => ReactNode;
  /** Check & Improve: the page's own "Check one answer" (focus the question box, inside the tap). */
  onCheckOne?: () => void;
  spaced?: boolean;
  headingId?: string;
  /** The first line (the chip's reopen says "Welcome back!" first). */
  greeting?: string;
  /** MOMENTS-1 — the zero-graded answer is the SERVER's (or an admin preview): "5 quick questions"
   *  plays the M2 moment (Byte points, Hide mascots, guide_moment_shown). Otherwise GUIDE-1's cheer. */
  momentOk?: boolean;
}

function GuideHead({
  pose,
  line,
  bubbleKey,
  onByteTap,
  hideable,
}: {
  pose: Pose;
  line: string;
  bubbleKey: number;
  onByteTap: () => void;
  /** MOMENTS-1 — a moment's bubble (M2) carries the "Hide mascots" button. */
  hideable?: boolean;
}) {
  // Review F5: the bubble is NOT a live region (hover lines would chatter) and not the label.
  const bubble = (
    <p key={bubbleKey} className="lt-guide__bub is-pop" data-testid="guide-line">
      {line}
    </p>
  );
  return (
    <div className="lt-guide__head">
      <BlobCharacter kind="byte" pose={pose} className="lt-guide__byte" onTap={onByteTap} />
      {hideable ? (
        <div className="lt-guide__bubwrap">
          {bubble}
          <button type="button" className="lt-guide__hide" data-testid="mascots-hide" onClick={hideMascotsWithUndo}>
            {MASCOTS_TOAST_COPY.hide}
          </button>
        </div>
      ) : (
        bubble
      )}
    </div>
  );
}

export function ByteGuide({ mode, page, eventSurface, plan, onClose, onDone, renderQuick, onCheckOne, spaced, headingId, greeting, momentOk = false }: ByteGuideProps) {
  const ownHeadingId = useId();
  const labelId = headingId ?? ownHeadingId;
  const closeRef = useRef<HTMLButtonElement | null>(null);
  // Review F5: the reopened sheet takes focus (its ×) when it opens.
  useEffect(() => {
    if (mode === "sheet") closeRef.current?.focus();
  }, [mode]);
  const navigate = useNavigate();
  const [pose, setPose] = useState<Pose>("hello");
  const [line, setLine] = useState(greeting ? `${greeting} ${plan.line}` : plan.line);
  const [bubbleKey, setBubbleKey] = useState(0);
  const [stage, setStage] = useState<"options" | "quick">("options");
  const [quickChapter, setQuickChapter] = useState<ChapterRef | null>(null);
  const goTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduce = useRef(prefersReducedMotion());
  const [preview] = useState(() => guidePreviewActive());

  const say = (text: string, p?: Pose) => {
    setLine(text);
    setBubbleKey((k) => k + 1);
    if (p) setPose(p);
  };

  // Byte waves hello, then rests (a calm cockpit, not a dancing banner).
  useEffect(() => {
    restTimer.current = setTimeout(() => setPose((p) => (p === "hello" ? "idle" : p)), 3000);
    return () => {
      if (restTimer.current) clearTimeout(restTimer.current);
      if (goTimer.current) clearTimeout(goTimer.current);
    };
  }, []);

  const onPick = (o: GuideOption, rank: number) => {
    trackGuideEvent("guide_option", { option: o.id, rank, surface: eventSurface });
    if (o.action.kind === "quick") {
      setQuickChapter(o.action.chapter);
      setStage("quick");
      if (restTimer.current) clearTimeout(restTimer.current);
      if (momentOk) {
        // MOMENTS-1 M2 — Byte points at the subjects (the line is the moment's, word for word).
        say(GUIDE_COPY.cheerQuick, "point");
        trackGuideEvent("guide_moment_shown", { moment: "m2" });
        return;
      }
      // Not server-confirmed zero-graded: GUIDE-1's plain cheer, exactly as before.
      say(GUIDE_COPY.cheerQuick, "cheer");
      restTimer.current = setTimeout(() => setPose("idle"), 1400);
      return;
    }
    if (o.action.kind === "check_one" && onCheckOne) {
      // iOS raises the keyboard only for a focus made INSIDE the tap: no cheer delay here.
      onCheckOne();
      return;
    }
    const path = o.action.path;
    if (o.action.kind === "check_one") {
      // LOGIN-HOME-1: "Check one answer" chosen on a page with no question box (Home) opens
      // Check & Improve after the cheer. Leave a one-shot, this-tab "handed over" note: Check &
      // Improve's Start-here reads and deletes it on that one arrival and does not ask again.
      // Nothing is dismissed here and Byte is NOT closed early (onDone would unmount him and
      // cancel the pending navigation): a student who backs out keeps Byte; the route change
      // unmounts the full-screen guide / sheet.
      markCheckOneHandover();
    }
    say(GUIDE_COPY.cheerGo(o.title), "cheer");
    const go = () => {
      // GUIDE-OPTS-1: the hub reads ?ct=1 only on mount, so the chapter chooser opens the same way.
      const sameHubCard = o.id === "cbq" || (o.id === "chapter_test" && path === "/practice-hub?ct=1");
      if (sameHubCard && page === "practice_hub") {
        // Same page: its own "Competency-based questions" / "Chapter Tests" card opens the chooser.
        const card = document.querySelector<HTMLButtonElement>(o.id === "cbq" ? "button.lt-cbq-card:not(.lt-ct-card)" : "button.lt-ct-card");
        if (card) {
          onDone?.(); // a choice, not a dismissal (review F1)
          card.click();
          return;
        }
      }
      navigate(path);
    };
    if (reduce.current) go();
    else goTimer.current = setTimeout(go, GUIDE_CHEER_MS);
  };

  const rootClass =
    mode === "inline" ? `lt-guide${spaced ? " lt-guide--spaced" : ""}` : mode === "sheet" ? "lt-guide lt-guide--sheet" : "";

  const body = (
    <>
      <h2 className="lt-guide__vh" id={labelId}>
        {GUIDE_COPY.heading}
      </h2>
      <button ref={closeRef} type="button" className="lt-guide__x" aria-label={GUIDE_COPY.close} data-testid="guide-close" onClick={onClose}>
        ✕
      </button>
      {preview ? <AdminPreviewPill className="lt-guide__admin" /> : null}
      <GuideHead
        pose={pose}
        line={line}
        bubbleKey={bubbleKey}
        onByteTap={() => say(stage === "options" ? plan.line : GUIDE_COPY.cheerQuick)}
        hideable={momentOk && stage === "quick"}
      />
      {stage === "options" ? (
        <ul
          className="lt-guide__opts"
          data-testid="guide-options"
          onPointerLeave={() => setPose((p) => (p === "point" ? "idle" : p))}
        >
          {plan.options.map((o, i) => (
            <li key={o.id}>
              <button
                type="button"
                className={i === 0 ? "lt-guide__opt is-top" : "lt-guide__opt"}
                data-testid={`guide-opt-${o.id}`}
                data-rank={i + 1}
                onPointerEnter={() => say(o.point, "point")}
                onFocus={() => say(o.point, "point")}
                onClick={() => onPick(o, i + 1)}
              >
                <span className="lt-guide__gl" aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false">
                    {GLYPH[o.id]}
                  </svg>
                </span>
                <span className="lt-guide__tx">
                  <b>{o.title}</b>
                  <span>{o.sub}</span>
                </span>
                {i === 0 ? <span className="lt-guide__pill">{GUIDE_COPY.forYou}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div data-testid="guide-quick">
          {renderQuick(quickChapter)}
          <button
            type="button"
            className="lt-guide__back"
            data-testid="guide-back"
            onClick={() => {
              setStage("options");
              say(plan.line, "hello");
            }}
          >
            {GUIDE_COPY.back}
          </button>
        </div>
      )}
    </>
  );

  if (mode === "focus") return body; // the focused shell supplies the dialog element
  if (mode === "sheet") {
    return (
      <section className={rootClass} data-testid="byte-guide-sheet" role="dialog" aria-modal="false" aria-labelledby={labelId}>
        {body}
      </section>
    );
  }
  return (
    <section className={rootClass} data-testid={`byte-guide-${mode}`} aria-labelledby={labelId}>
      {body}
    </section>
  );
}

/* ── the corner chip ─────────────────────────────────────────────────────────────────── */

export interface GuideChipProps {
  onOpen: () => void;
  onHide: () => void;
}

/** Portalled to <body>: a transformed ancestor would otherwise trap `position: fixed`. */
export function GuideChip({ onOpen, onHide }: GuideChipProps) {
  const [pose, setPose] = useState<Pose>("hello");
  const [ping, setPing] = useState(true);
  useEffect(() => {
    // Waves ONCE, then rests.
    const t = setTimeout(() => {
      setPose("idle");
      setPing(false);
    }, 2200);
    return () => clearTimeout(t);
  }, []);
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="lt-guide-chip" data-testid="guide-chip">
      {ping ? (
        <p className="lt-guide-chip__ping" aria-hidden="true">
          {GUIDE_COPY.chipPing}
        </p>
      ) : null}
      <button type="button" className="lt-guide-chip__open" aria-label={GUIDE_COPY.chipOpen} data-testid="guide-chip-open" onClick={onOpen}>
        <BlobCharacter kind="byte" pose={pose} className="lt-guide-chip__byte" />
      </button>
      <button type="button" className="lt-guide-chip__x" aria-label={GUIDE_COPY.chipClose} data-testid="guide-chip-close" onClick={onHide}>
        ✕
      </button>
    </div>,
    document.body,
  );
}

/* ── GUIDE-SCORE-1 — Byte & Ziggy on every scorecard ────────────────────────────────── */

/** How long Ziggy's reaction holds before Byte replaces him in the same spot (MOMENTS-1's beat). */
export const SCORE_GUIDE_BEAT_MS = 2000;

export interface ScoreGuideBeatsProps {
  plan: ScoreGuidePlan;
  /** "byte" — Ziggy has already reacted (the FIRST graded result's own Ziggy strip played just
   *  before), so Byte's next step shows at once. Default "ziggy": Ziggy, then Byte. */
  startAt?: "ziggy" | "byte";
}

/** A Link inside a router; a plain anchor otherwise (a scorecard rendered on its own). */
function GuideCtaLink({ to, label }: { to: string; label: string }) {
  const inRouter = useInRouterContext();
  const onClick = () => trackGuideEvent("guide_moment_click", { moment: "score" });
  if (inRouter) {
    return (
      <Link to={to} className="lt-scg__cta" data-testid="score-guide-cta" onClick={onClick}>
        {label}
      </Link>
    );
  }
  return (
    <a href={to} className="lt-scg__cta" data-testid="score-guide-cta" onClick={onClick}>
      {label}
    </a>
  );
}

/**
 * Ziggy reacts (his line), then Byte REPLACES him with the one next step and its link — one
 * character slot, one bubble, in the scorecard's flow (never over a number, never a modal).
 * Reduced motion → Byte's final frame at once, still. The bubble carries "Hide mascots".
 */
export function ScoreGuideBeats({ plan, startAt = "ziggy" }: ScoreGuideBeatsProps) {
  const reduce = useRef(prefersReducedMotion());
  const [beat, setBeat] = useState<"ziggy" | "byte">(() => (reduce.current || startAt === "byte" ? "byte" : "ziggy"));
  const [preview] = useState(() => guidePreviewActive());
  useEffect(() => {
    trackGuideEvent("guide_moment_shown", { moment: "score", surface: plan.surface, situation: plan.situation });
    if (reduce.current || startAt === "byte") return;
    const t = setTimeout(() => setBeat("byte"), SCORE_GUIDE_BEAT_MS);
    return () => clearTimeout(t);
    // Once per mount: the plan is fixed for this result.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const line = beat === "ziggy" ? plan.ziggy : plan.byte;
  return (
    <div
      className={`lt-scg lt-scg--${beat}${preview ? " lt-scg--preview" : ""}`}
      data-testid="score-guide"
      data-kind={beat}
      data-pose={line.pose}
      data-situation={plan.situation}
      data-step={plan.byteStep}
      role="group"
      aria-label={beat === "byte" ? "Byte" : "Ziggy"}
    >
      <BlobCharacter key={beat} kind={beat} pose={line.pose} className="lt-scg__char" still={reduce.current || undefined} />
      <div className="lt-scg__bub">
        {preview ? <AdminPreviewPill className="lt-scg__admin" /> : null}
        <p className="lt-scg__say" aria-live="polite" data-testid="score-guide-line">
          {line.text}
        </p>
        <div className="lt-scg__acts">
        {beat === "byte" && plan.cta?.action ? (
          // The host's in-page action (e.g. back to the missed MCQs) — a button, not a route.
          <button
            type="button"
            className="lt-scg__cta"
            data-testid="score-guide-cta"
            onClick={() => {
              trackGuideEvent("guide_moment_click", { moment: "score" });
              plan.cta?.action?.();
            }}
          >
            {plan.cta.label}
          </button>
        ) : beat === "byte" && plan.cta?.to ? (
          <GuideCtaLink to={plan.cta.to} label={plan.cta.label} />
        ) : null}
        <button type="button" className="lt-scg__hide" data-testid="mascots-hide" onClick={hideMascotsWithUndo}>
          {MASCOTS_TOAST_COPY.hide}
        </button>
        </div>
      </div>
    </div>
  );
}

/* ── Ziggy on the first scorecard ───────────────────────────────────────────────────── */

/** sad → after this long Ziggy bounces back to determined. */
export const ZIGGY_BOUNCE_BACK_MS = 2500;

export function ZiggyStrip({ reaction }: { reaction: ZiggyReaction }) {
  const [pose, setPose] = useState<Pose>(reaction.pose);
  const [line, setLine] = useState(reaction.line);
  const [preview] = useState(() => guidePreviewActive());
  const id = useId();
  useEffect(() => {
    trackGuideEvent("ziggy_reaction", { band: reaction.band });
    if (!reaction.after) return;
    const after = reaction.after;
    const t = setTimeout(() => {
      setPose(after.pose);
      setLine(after.line);
    }, ZIGGY_BOUNCE_BACK_MS);
    return () => clearTimeout(t);
    // Once per mount: the reaction is fixed for this scorecard.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className={preview ? "lt-ziggy lt-ziggy--preview" : "lt-ziggy"} data-testid="ziggy-strip" data-band={reaction.band} role="group" aria-labelledby={id}>
      {preview ? <AdminPreviewPill className="lt-ziggy__admin" /> : null}
      <BlobCharacter kind="ziggy" pose={pose} className="lt-ziggy__z" />
      <p className="lt-ziggy__say" id={id} aria-live="polite" data-testid="ziggy-line">
        {line}
      </p>
    </div>
  );
}
