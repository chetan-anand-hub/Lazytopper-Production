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
 */
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import "./guide.css";
import BlobCharacter from "./BlobCharacter";
import { prefersReducedMotion, type Pose } from "./rig";
import type { ChapterRef, GuideOption, GuideOptionId, GuidePlan } from "./intentMap";
import type { StartHereFocusSurface, StartHereSurface } from "../../analytics/analytics";
import { guidePreviewActive, trackGuideEvent } from "./guideVariant";
import type { ZiggyReaction } from "./ziggyModel";

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
}

function GuideHead({ pose, line, bubbleKey, onByteTap }: { pose: Pose; line: string; bubbleKey: number; onByteTap: () => void }) {
  // Review F5: the bubble is NOT a live region (hover lines would chatter) and not the label.
  return (
    <div className="lt-guide__head">
      <BlobCharacter kind="byte" pose={pose} className="lt-guide__byte" onTap={onByteTap} />
      <p key={bubbleKey} className="lt-guide__bub is-pop" data-testid="guide-line">
        {line}
      </p>
    </div>
  );
}

export function ByteGuide({ mode, page, eventSurface, plan, onClose, onDone, renderQuick, onCheckOne, spaced, headingId, greeting }: ByteGuideProps) {
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
      say(GUIDE_COPY.cheerQuick, "cheer");
      if (restTimer.current) clearTimeout(restTimer.current);
      restTimer.current = setTimeout(() => setPose("idle"), 1400);
      return;
    }
    if (o.action.kind === "check_one" && onCheckOne) {
      // iOS raises the keyboard only for a focus made INSIDE the tap: no cheer delay here.
      onCheckOne();
      return;
    }
    const path = o.action.path;
    say(GUIDE_COPY.cheerGo(o.title), "cheer");
    const go = () => {
      if (o.id === "cbq" && page === "practice_hub") {
        // Same page: its own "Competency-based questions" card opens the CBQ chooser.
        const card = document.querySelector<HTMLButtonElement>("button.lt-cbq-card:not(.lt-ct-card)");
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
    <div className="lt-ziggy" data-testid="ziggy-strip" data-band={reaction.band} role="group" aria-labelledby={id}>
      {preview ? <AdminPreviewPill className="lt-ziggy__admin" /> : null}
      <BlobCharacter kind="ziggy" pose={pose} className="lt-ziggy__z" />
      <p className="lt-ziggy__say" id={id} aria-live="polite" data-testid="ziggy-line">
        {line}
      </p>
    </div>
  );
}
