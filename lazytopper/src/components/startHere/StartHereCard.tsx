import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useIsDesktop } from "../../hooks/useIsDesktop";
import { ChapterPickerModal } from "../../lib/desktop/homeDestinations";
import { START_HERE_AVAILABILITY } from "./startHereAvailability.generated";
import { useZeroGraded } from "./zeroGraded";
import { trackOnboardingEvent, type StartHereFocusSurface, type StartHereSurface } from "../../analytics/analytics";
import { desktopTopicsBySubject } from "../../lib/desktop/topics";
import type { DesktopSubject } from "../../lib/desktop/navigation";
import {
  START_HERE_COPY,
  START_HERE_ONE_TAP_COPY,
  analyticsSubject,
  startHereSetSize,
  dismissForSession,
  focusAllowed,
  recordFocusNotNow,
  START_HERE_FOCUS_CLOSED_KEY,
  isDismissedThisSession,
  readSubjectHint,
  startHerePracticePath,
  type StartHereQType,
} from "./startHereModel";

/**
 * StartHereCard — START-HERE-1. A brand-new student's ONE graded result in about two minutes.
 *
 * ── WHO SEES IT ─────────────────────────────────────────────────────────────────────────
 * A signed-in account with ZERO graded results, and nobody else: a signed-out visitor, a
 * student with any graded result, or a student who tapped "Not now" this session sees nothing.
 *
 * ★ THE ZERO SIGNAL IS FirstSession's, AND SO IS ITS HAZARD. `getSessionRecordsFromCloud` is
 * the one store that means "graded activity" across every surface and every device
 * (local-first, then cloud-merged). On a fresh device a returning student has no local rows
 * until the cloud read lands, so the state is TRI-state and the card can only appear AFTER a
 * completed read that returned zero rows — never during hydration, never on a failed read.
 *
 * ── THE READY STATE (START-HERE-ONE-TAP-1) ──────────────────────────────────────────────
 * Once open (inline: after "Start"; focused surface: at once) the card shows ONE button per
 * subject that launches at once — the hinted subject only, else Maths and Science — on the
 * picker's own default chapter and MCQ. "Change chapter or question type" reveals the picker.
 *
 * ── THE PICKER ──────────────────────────────────────────────────────────────────────────
 * Three taps, decisions pre-made: subject (pre-picked from the ad when known), chapter (the
 * chapters that have CBQ MCQs; the rest read "coming soon"), question type (only the types the
 * chapter really has; "Quick 5" is the default). QP-SCORECARD-2 D3: which chapters / types are
 * offered comes from a PRECOMPUTED map (startHereAvailability.generated.ts, guarded against the
 * bank), so listing costs no network; the bank is reached with `import()` only on "Start 5
 * questions", so Home / Practice Hub / Check & Improve stay bank-free. D1: no radio inputs (the
 * global `input` CSS made them white bars); SHW-2: each choice is a segmented control of
 * role="radio" buttons (aria-checked), never styled like the green Start button.
 *
 * ── THE FOCUSED FIRST RUN (QP-SCORECARD-2 E) ────────────────────────────────────────────
 * The same audience may also get StartHereFocusView: full screen on a phone, a centred overlay
 * on desktop, offered at most twice (startHereModel.ts focusAllowed / recordFocusNotNow).
 *
 * Honest copy: no invented numbers, no promised score.
 */

// SHW-2: the zero-graded read (local-first, limit(1) cloud ask, retry, account-age fallback) moved
// verbatim to ./zeroGraded so the answer boxes' type-first default shares the card's ONE read.
export { START_HERE_RETRY_MS, START_HERE_NEW_ACCOUNT_DAYS, accountIsNew } from "./zeroGraded";

/**
 * FOLLOWUPS-2 F2 [FU-SH-SHOWN-DEDUPE] — `start_here_shown` at most ONCE per tab session per
 * surface (a page remount no longer re-fires it). THIS TAB's sessionStorage holds
 * `lazytopper.startHereShown.<surface>` = the constant "1" (never the uid; registered in
 * studentDataMap.ts). Storage unavailable or throwing -> fail open: the per-mount ref still
 * limits it to once per mount, as before.
 */
export const START_HERE_SHOWN_PREFIX = "lazytopper.startHereShown.";

/** True -> fire `start_here_shown` now (first time this tab for this surface, or no storage). */
export function claimStartHereShown(surface: string): boolean {
  try {
    const key = START_HERE_SHOWN_PREFIX + surface;
    if (window.sessionStorage.getItem(key) === "1") return false;
    window.sessionStorage.setItem(key, "1");
    return true;
  } catch {
    return true;
  }
}

const CSS = `
  .lt-shc { background: linear-gradient(160deg, hsl(222,47%,24%) 0%, hsl(222,47%,16%) 100%); color: #fff;
    border-radius: 15px; padding: 23px 25px; min-width: 0; max-width: 100%; box-sizing: border-box;
    box-shadow: 0 6px 18px -10px hsla(222, 47%, 20%, 0.55); margin-bottom: 14px; }
  .lt-shc--spaced { margin-top: 13px; }
  .lt-shc .lt-shc-k { font-size: 10.5px; letter-spacing: 0.14em; text-transform: uppercase;
    color: hsl(152, 55%, 60%); font-weight: 700; margin: 0 0 8px; }
  .lt-shc .lt-shc-h { font-family: 'Fraunces', Georgia, serif; font-size: 21px; line-height: 1.25;
    font-weight: 600; margin: 0 0 14px; color: #fff; }
  .lt-shc .lt-shc-ctas { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
  .lt-shc .lt-shc-go { display: inline-flex; align-items: center; justify-content: center;
    background: hsl(152, 55%, 45%); color: #fff; border: 0; border-radius: 10px; padding: 11px 22px;
    font-size: 14px; font-weight: 700; cursor: pointer; min-height: 44px; box-sizing: border-box; }
  .lt-shc .lt-shc-go:hover { background: hsl(152, 57%, 40%); }
  .lt-shc .lt-shc-go:disabled { opacity: 0.55; cursor: default; }
  .lt-shc .lt-shc-later { background: none; border: 0; color: rgba(255,255,255,0.78); font-size: 13.5px;
    font-weight: 600; text-decoration: underline; cursor: pointer; padding: 6px 2px; }
  .lt-shc .lt-shc-change { min-height: 44px; }
  .lt-shc .lt-shc-ready { display: flex; flex-direction: column; align-items: stretch; gap: 10px; margin: 0 0 12px; }
  .lt-shc .lt-shc-ready .lt-shc-go { width: 100%; text-align: center; }
  .lt-shc .lt-shc-step { margin: 0 0 14px; }
  .lt-shc .lt-shc-lbl { display: block; font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.7);
    margin: 0 0 6px; letter-spacing: 0.02em; }
  .lt-shc .lt-shc-seg { display: flex; width: 100%; box-sizing: border-box; border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.34); overflow: hidden; }
  .lt-shc .lt-shc-seg-opt { flex: 1 1 0; min-width: 0; min-height: 44px; box-sizing: border-box; margin: 0;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
    padding: 8px 10px; border: 0; border-left: 1px solid rgba(255,255,255,0.22); border-radius: 0;
    background: transparent; color: #fff; font-size: 13.5px; font-weight: 700; text-align: center;
    cursor: pointer; }
  .lt-shc .lt-shc-seg-opt:first-child { border-left: 0; }
  .lt-shc .lt-shc-seg-opt:hover { background: rgba(255,255,255,0.06); }
  .lt-shc .lt-shc-seg-opt[aria-checked="true"] { background: rgba(255,255,255,0.16);
    box-shadow: inset 0 0 0 1px rgba(255,255,255,0.55); }
  .lt-shc .lt-shc-seg-opt:focus-visible { outline: 2px solid #fff; outline-offset: -4px; }
  .lt-shc .lt-shc-seg-main { display: inline-flex; align-items: center; gap: 6px; }
  .lt-shc .lt-shc-seg-check { font-size: 12px; line-height: 1; }
  .lt-shc .lt-shc-seg-sub { font-size: 11.5px; font-weight: 600; color: rgba(255,255,255,0.72); }
  .lt-shc .lt-shc-seg--stacked { flex-direction: column; }
  .lt-shc .lt-shc-seg--stacked .lt-shc-seg-opt { flex-direction: row; justify-content: space-between;
    border-left: 0; border-top: 1px solid rgba(255,255,255,0.22); padding: 8px 14px; }
  .lt-shc .lt-shc-seg--stacked .lt-shc-seg-opt:first-child { border-top: 0; }
  .lt-shc .lt-shc-help { font-size: 12.5px; color: rgba(255,255,255,0.78); margin: 8px 0 0; line-height: 1.45; }
  .lt-shc .lt-shc-pick { width: 100%; box-sizing: border-box; display: flex; align-items: center;
    justify-content: space-between; gap: 12px; border-radius: 10px; padding: 11px 14px; font-size: 14px;
    font-weight: 600; text-align: left; border: 1px solid rgba(255,255,255,0.34);
    background: hsl(222,47%,14%); color: #fff; cursor: pointer; }
  .lt-shc .lt-shc-pick:hover { border-color: hsl(152, 55%, 55%); }
  .lt-shc .lt-shc-pick:disabled { opacity: 0.55; cursor: default; }
  .lt-shc .lt-shc-pick-change { font-size: 12.5px; color: hsl(152, 55%, 62%); font-weight: 700; flex: none; }
  .lt-tutor-ov.lt-shc-picker-top { z-index: 1010; }
  .lt-shc .lt-shc-note { font-size: 12.5px; color: rgba(255,255,255,0.72); margin: 0 0 12px; line-height: 1.5; }
  @media (max-width: 480px) {
    .lt-shc { padding: 19px 17px; border-radius: 14px; }
    .lt-shc .lt-shc-h { font-size: 18.5px; }
    .lt-shc .lt-shc-ctas { flex-direction: column; align-items: stretch; gap: 9px; }
    .lt-shc .lt-shc-go { width: 100%; }
    .lt-shc .lt-shc-later { align-self: center; }
  }
  html.lt-shcf-lock, html.lt-shcf-lock body { overflow: hidden; }
  .lt-shcf { position: fixed; inset: 0; z-index: 1000; box-sizing: border-box; }
  .lt-shcf--overlay { background: hsla(222, 47%, 8%, 0.62); display: flex; align-items: center;
    justify-content: center; padding: 24px; }
  .lt-shcf--overlay .lt-shcf-dlg { width: 100%; max-width: 560px; max-height: calc(100vh - 48px);
    overflow-y: auto; margin: 0; position: relative; padding: 32px 34px 28px;
    box-shadow: 0 24px 60px -20px hsla(222, 60%, 4%, 0.8); }
  .lt-shcf--full { background: hsl(222,47%,16%); overflow-y: auto; }
  .lt-shcf--full .lt-shcf-dlg { min-height: 100%; border-radius: 0; margin: 0; box-shadow: none;
    position: relative; padding: 56px 20px 28px; }
  .lt-shcf .lt-shcf-dlg:focus { outline: none; }
  .lt-shcf .lt-shcf-x { position: absolute; top: 12px; right: 12px; width: 40px; height: 40px;
    border-radius: 999px; border: 1px solid rgba(255,255,255,0.3); background: transparent;
    color: #fff; font-size: 16px; cursor: pointer; }
  .lt-shcf .lt-shcf-x:hover { background: rgba(255,255,255,0.1); }
  .lt-shcf .lt-shc-h { padding-right: 36px; }
`;

export interface StartHereState {
  /** True only for a signed-in account with zero graded results that has not tapped "Not now". */
  visible: boolean;
  /** "Not now": hide for the rest of this session. */
  dismiss: () => void;
}

/**
 * Whether the card shows. Split out so Home can ask ONCE and also stand the older
 * FirstSession card down while this one is up (two start cards on one screen is noise).
 */
export function useStartHere(uid?: string | null): StartHereState {
  // The tri-state zero-graded read (./zeroGraded): local first, then ONE cloud ask per uid per tab.
  const graded = useZeroGraded(uid);
  const [dismissed, setDismissed] = useState<boolean>(() => isDismissedThisSession());

  return {
    visible: !!uid && graded === "none" && !dismissed,
    dismiss: () => {
      dismissForSession();
      setDismissed(true);
    },
  };
}

export interface StartHereCardProps {
  /** The signed-in account uid. Falsy → the card never renders (signed-out pages are unchanged). */
  uid?: string | null;
  /** Which page the card is on: the `start_here_shown` / `start_here_dismissed` param. */
  surface: StartHereSurface;
  /** Where the practice set's back link returns to: the page the card is on. */
  returnTo: string;
  spaced?: boolean;
  /**
   * QP-SCORECARD-2 E2 — also offer the FOCUSED first-run surface (full screen on a phone, a
   * centred overlay on desktop) to the same audience. Default false: rendering, reads and events
   * are exactly the inline card's.
   */
  focus?: boolean;
  /**
   * QP-SCORECARD-2 E2 — the student already has something in progress on this page (Check &
   * Improve: a pending upload carried through sign-in, a return path / deep-link task, a draft).
   * True → the focused surface is not offered here (the inline card is unaffected).
   */
  inProgress?: boolean;
  /**
   * ACTIVATION-2 A — Check & Improve only. Set → the focused surface leads with "Check one
   * answer" (this callback, after the takeover closes: the page scrolls to / focuses its question
   * box); the practice picker is the secondary "or practise 5 questions". Closing the takeover
   * by any route also hides the inline card on this page for this visit. Unset (every other
   * page) → rendering, reads and events are exactly as before.
   */
  checkOneAnswer?: () => void;
}

/** The card with its own eligibility read (Practice Hub, Check & Improve). */
export default function StartHereCard({ uid, focus = false, inProgress = false, checkOneAnswer, ...rest }: StartHereCardProps) {
  const state = useStartHere(uid);
  // ACTIVATION-2 A: the takeover on THIS page was closed → the inline card stands down here too.
  const [hiddenHere, setHiddenHere] = useState(false);
  const inlineState = hiddenHere ? { ...state, visible: false } : state;
  return (
    <>
      {focus && !inProgress && uid ? (
        <StartHereFocusView
          uid={uid}
          surface={rest.surface}
          returnTo={rest.returnTo}
          state={state}
          checkOneAnswer={checkOneAnswer}
          onClosed={checkOneAnswer ? () => setHiddenHere(true) : undefined}
        />
      ) : null}
      <StartHereView {...rest} state={inlineState} />
    </>
  );
}

/** The card, given an eligibility read the caller already made (Home). */
export function StartHereView({
  surface,
  returnTo,
  spaced = false,
  state,
}: Omit<StartHereCardProps, "uid" | "focus" | "inProgress" | "checkOneAnswer"> & { state: StartHereState }) {
  const visible = state.visible;
  const shownRef = useRef(false);

  useEffect(() => {
    if (!visible || shownRef.current) return;
    shownRef.current = true;
    if (claimStartHereShown(surface)) trackOnboardingEvent("start_here_shown", { surface });
  }, [visible, surface]);

  if (!visible) return null;

  const onNotNow = () => {
    trackOnboardingEvent("start_here_dismissed", { surface });
    state.dismiss();
  };

  return (
    <>
      <style>{CSS}</style>
      <section className={spaced ? "lt-shc lt-shc--spaced" : "lt-shc"} data-testid="start-here-card">
        <StartHerePanel testIdPrefix="start-here" returnTo={returnTo} onNotNow={onNotNow} />
      </section>
    </>
  );
}

/* ── the shared content: copy, the three-tap picker, Start ─────────────────────────────── */

const QTYPES: readonly StartHereQType[] = ["mcq", "ar", "written"];
/** `written` may be absent from an older map; a missing count is 0 (the type is not offered). */
type ChapterCounts = Partial<Record<StartHereQType, number>>;
/** START-HERE-WRITTEN: the written type is Science only (owner ruling, 16 Oct: typed maths is hard). */
const WRITTEN_SUBJECT: DesktopSubject = "Science";

/** START-HERE-WRITTEN: the honest state while the ONE written question is fetched. */
export const START_HERE_GETTING_ONE = "Getting your question…";

/** D3: the honest state while the five questions are fetched (the only bank download). */
export const START_HERE_GETTING = "Getting your 5 questions…";

/** The precomputed counts for a chapter (startHereAvailability.generated.ts; no bank download). */
function chapterCounts(subject: DesktopSubject, slug: string): ChapterCounts | undefined {
  const bySubject = START_HERE_AVAILABILITY[subject] as Record<string, ChapterCounts | undefined>;
  return bySubject[slug];
}

/** Whether `subject`'s chapter `slug` can host a full set of type `t` (precomputed map; no network). */
function offeredIn(subject: DesktopSubject, slug: string, t: StartHereQType): boolean {
  return (t !== "written" || subject === WRITTEN_SUBJECT) && (chapterCounts(subject, slug)?.[t] ?? 0) >= startHereSetSize(t);
}

/** A chapter that can host a set of ANY offered type. */
function chapterOkIn(subject: DesktopSubject, slug: string): boolean {
  return QTYPES.some((t) => offeredIn(subject, slug, t));
}

/** One ready-state button: a subject and its pre-selected chapter. */
interface OneTapTarget {
  subject: DesktopSubject;
  slug: string;
  name: string;
}

/**
 * START-HERE-ONE-TAP-1 — the chapter a subject's one-tap button launches: the picker's own
 * pre-selection (the first chapter, in the shared list's order, that can host a set) on the
 * default MCQ type. Null when that chapter has no full MCQ set (the button is then not offered).
 */
export function oneTapTarget(subject: DesktopSubject): OneTapTarget | null {
  const first = desktopTopicsBySubject(subject).find((t) => chapterOkIn(subject, t.slug));
  if (!first || !offeredIn(subject, first.slug, "mcq")) return null;
  return { subject, slug: first.slug, name: first.name };
}

/* ── SHW-2 — the SEGMENTED CONTROL (owner ruling, 16 Oct) ────────────────────────────────
 * The subject and type choices used to be pills whose selected state was the Start button's
 * green, so students read them as CTAs and tapped them expecting something to happen. Each
 * choice is now ONE connected control: role="radiogroup", options role="radio" + aria-checked,
 * arrow keys / Home / End move the choice (roving tabindex), >= 44px tall. Checked = a light
 * fill + a check mark, NEVER the CTA green; unchecked = transparent with a divider. The Start
 * button stays the only solid-green control. */

/** The type control's labels: a main line and a count line. */
const QTYPE_SEG: Record<StartHereQType, string> = {
  mcq: "Tap answer",
  ar: "Assertion–Reason",
  written: "Written",
};
/** One helper line under the type control, describing the selected type. */
const START_HERE_QTYPE_HELP: Record<StartHereQType, string> = {
  mcq: "Tap the right option – 5 board MCQs, about 2 min.",
  ar: "Assertion and reason – 5 board questions.",
  written:
    "One written board question – type your answer, it is marked like the board (uses 1 of today's checks).",
};
/** The Start label follows the choice. */
const START_HERE_START_LABEL: Record<StartHereQType, string> = {
  mcq: "Start 5 questions",
  ar: "Start 5 questions",
  written: "Start 1 written question",
};
/** Below this container width the type control stacks into rows. */
export const START_HERE_SEG_STACK_BELOW = 360;

function countLine(t: StartHereQType): string {
  const n = startHereSetSize(t);
  return `${n} Q${n === 1 ? "" : "s"}`;
}

interface SegOption<T extends string> {
  value: T;
  label: string;
  sub?: string;
  testId: string;
}

function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  stackBelow,
}: {
  label: string;
  options: readonly SegOption<T>[];
  value: T | null;
  onChange: (v: T) => void;
  /** Stack the options into rows when the control is narrower than this (px). */
  stackBelow?: number;
}) {
  const groupRef = useRef<HTMLDivElement | null>(null);
  const [stacked, setStacked] = useState(false);

  // The container width, measured by a ResizeObserver (none / 0 width -> unknown -> side by side).
  useEffect(() => {
    if (!stackBelow) return;
    const el = groupRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width ?? 0;
      setStacked(w > 0 && w < stackBelow);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [stackBelow]);

  const checkedIdx = options.findIndex((o) => o.value === value);
  const onKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>, i: number) => {
    const n = options.length;
    let next = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (i + 1) % n;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (i - 1 + n) % n;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = n - 1;
    if (next < 0) return;
    e.preventDefault();
    onChange(options[next].value);
    groupRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus();
  };

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label={label}
      className={stacked ? "lt-shc-seg lt-shc-seg--stacked" : "lt-shc-seg"}
    >
      {options.map((o, i) => {
        const checked = o.value === value;
        // Roving tabindex: the checked option (or the first, when none is) is the one Tab stop.
        const tabbable = checkedIdx >= 0 ? checked : i === 0;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={tabbable ? 0 : -1}
            className="lt-shc-seg-opt"
            data-testid={o.testId}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            <span className="lt-shc-seg-main">
              {checked ? (
                <span className="lt-shc-seg-check" aria-hidden="true">
                  {"✓"}
                </span>
              ) : null}
              {o.label}
            </span>
            {o.sub ? <span className="lt-shc-seg-sub">{o.sub}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

function StartHerePanel({
  testIdPrefix,
  returnTo,
  onNotNow,
  startOpen = false,
  headingId,
}: {
  testIdPrefix: string;
  returnTo: string;
  onNotNow: () => void;
  /** The focused surface opens straight onto the picker (it IS the dedicated first step). */
  startOpen?: boolean;
  headingId?: string;
}) {
  const navigate = useNavigate();
  const chapterLabelId = useId();
  const pickerIdPrefix = `lt-shc-ch${chapterLabelId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const chapterBtnRef = useRef<HTMLButtonElement | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [open, setOpen] = useState(startOpen);
  // D4: the ad's hint pre-picks a subject; with no hint NOTHING is pre-selected (the card asks).
  const [hint] = useState<DesktopSubject | null>(() => readSubjectHint());
  const [subject, setSubject] = useState<DesktopSubject | null>(hint);
  const [chapter, setChapter] = useState("");
  // D1: "Quick 5: tap the answer" is the default type.
  const [qtype, setQtype] = useState<StartHereQType>("mcq");
  // Which launch is fetching: the picker's go, or one subject's one-tap button.
  const [busy, setBusy] = useState<null | "picker" | DesktopSubject>(null);
  const [failed, setFailed] = useState(false);
  // START-HERE-ONE-TAP-1: false = the READY state (one button per subject); true = the full picker.
  const [picking, setPicking] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const focusAfterRef = useRef<string | null>(null);
  const tid = (s: string) => `${testIdPrefix}-${s}`;
  const isBusy = busy !== null;

  // START-HERE-ONE-TAP-1 §1.1: the hinted subject gets ONE button; no hint, one per subject.
  // Each launches that subject's pre-selected chapter (the picker's own default) on MCQ.
  const readyTargets = useMemo(
    () => (hint ? [hint] : (["Maths", "Science"] as const)).map(oneTapTarget).filter((t): t is OneTapTarget => !!t),
    [hint],
  );
  // Nothing can launch in one tap (no ready chapter) -> the picker, as before.
  const showPicker = picking || readyTargets.length === 0;

  // A control that replaced the tapped one (Start -> ready, Change -> picker) takes focus, so
  // keyboard and screen-reader users are not dropped onto <body>.
  useEffect(() => {
    const sel = focusAfterRef.current;
    if (!sel) return;
    focusAfterRef.current = null;
    panelRef.current?.querySelector<HTMLElement>(sel)?.focus();
  }, [open, picking]);

  // D2/D3: the chapter list is the shared one (`desktopTopicsBySubject`, the list
  // ChapterPickerModal shows, with its " — coming soon" / first-available rules), and which
  // chapters can host a set comes from the precomputed map: a subject tap lists chapters at
  // once, with NO network call.
  const topics = useMemo(() => (subject ? desktopTopicsBySubject(subject) : []), [subject]);
  const offered = (slug: string, t: StartHereQType): boolean => !!subject && offeredIn(subject, slug, t);
  const chapterOk = (slug: string): boolean => !!subject && chapterOkIn(subject, slug);
  const selected = chapter && chapterOk(chapter) ? chapter : (topics.find((t) => chapterOk(t.slug))?.slug ?? "");
  const types = QTYPES.filter((t) => selected && offered(selected, t));
  const activeType: StartHereQType = types.includes(qtype) ? qtype : (types[0] ?? "mcq");
  const selectedName = topics.find((t) => t.slug === selected)?.name ?? "";

  // The nested picker takes focus when it opens (Esc / Tab then belong to it, the topmost
  // layer), and focus returns to the chapter button when it closes.
  useEffect(() => {
    if (!pickerOpen) return;
    const ov = document.querySelector<HTMLElement>(`[data-testid="${tid("chapter-picker")}"]`);
    (ov?.querySelector<HTMLElement>("select") ?? ov?.querySelector<HTMLElement>("button"))?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickerOpen]);
  const closePicker = () => {
    setPickerOpen(false);
    chapterBtnRef.current?.focus();
  };

  /** The ONE launch path (P8), shared by the picker's go and the ready state's one-tap buttons. */
  const launch = async (
    s: DesktopSubject,
    ch: string,
    t: StartHereQType,
    mode: "one_tap" | "picker",
  ): Promise<void> => {
    if (isBusy) return;
    setBusy(mode === "picker" ? "picker" : s);
    setFailed(false);
    try {
      // D3: the bank is reached HERE, on Start, and nowhere earlier.
      const bank = await import("./startHereBank");
      const ids = await bank.pickStartHereSet({ subject: s, chapter: ch, qtype: t, rotation: Date.now() });
      if (ids.length < startHereSetSize(t)) {
        setFailed(true);
        setBusy(null);
        return;
      }
      trackOnboardingEvent("start_here_start", { subject: analyticsSubject(s), chapter: ch, qtype: t, mode });
      navigate(startHerePracticePath({ subject: s, chapter: ch, ids, qtype: t, returnTo }));
    } catch {
      setFailed(true);
      setBusy(null);
    }
  };

  const onGo = () => {
    if (!subject || !selected) return;
    void launch(subject, selected, activeType, "picker");
  };

  const onOneTap = (target: OneTapTarget) => {
    // The tapped subject becomes the picker's subject too, so "Change…" after a failure opens on it.
    setSubject(target.subject);
    setChapter("");
    setQtype("mcq");
    void launch(target.subject, target.slug, "mcq", "one_tap");
  };

  const oneTapLabel = (target: OneTapTarget): string =>
    hint
      ? `${START_HERE_ONE_TAP_COPY.hinted} · ${target.name}`
      : `${target.subject} · ${START_HERE_ONE_TAP_COPY.perSubjectSuffix}`;

  return (
    <div ref={panelRef}>
      <p className="lt-shc-k">{START_HERE_COPY.kicker}</p>
      <h2 className="lt-shc-h" id={headingId}>
        {START_HERE_COPY.body}
      </h2>
      {!open ? (
        <div className="lt-shc-ctas">
          <button
            type="button"
            className="lt-shc-go"
            data-testid={tid("start")}
            onClick={() => {
              focusAfterRef.current = ".lt-shc-ready .lt-shc-go, [role='radio']";
              setOpen(true);
            }}
          >
            {START_HERE_COPY.start}
          </button>
          <button type="button" className="lt-shc-later" data-testid={tid("not-now")} onClick={onNotNow}>
            {START_HERE_COPY.notNow}
          </button>
        </div>
      ) : !showPicker ? (
        <>
          {/* START-HERE-ONE-TAP-1 — the READY state: each button launches at once (P8 path). */}
          <div className="lt-shc-ready" data-testid={tid("ready")}>
            {readyTargets.map((target) => (
              <button
                key={target.subject}
                type="button"
                className="lt-shc-go"
                data-testid={tid(`one-tap-${target.subject.toLowerCase()}`)}
                data-chapter={target.slug}
                aria-live="polite"
                disabled={isBusy}
                onClick={() => onOneTap(target)}
              >
                {busy === target.subject ? START_HERE_GETTING : oneTapLabel(target)}
              </button>
            ))}
          </div>
          {failed && (
            <p className="lt-shc-note" role="alert">
              We couldn't line up five questions for that chapter just now. Try another chapter.
            </p>
          )}
          <div className="lt-shc-ctas">
            <button
              type="button"
              className="lt-shc-later lt-shc-change"
              data-testid={tid("change")}
              disabled={isBusy}
              onClick={() => {
                focusAfterRef.current = "[role='radio'][tabindex='0']";
                setFailed(false);
                setPicking(true);
              }}
            >
              {START_HERE_ONE_TAP_COPY.change}
            </button>
            <button type="button" className="lt-shc-later" data-testid={tid("not-now")} onClick={onNotNow}>
              {START_HERE_COPY.notNow}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="lt-shc-step">
            <span className="lt-shc-lbl" aria-hidden="true">
              1 · Subject
            </span>
            <Segmented<DesktopSubject>
              label="Subject"
              options={(["Maths", "Science"] as const).map((s) => ({
                value: s,
                label: s,
                testId: tid(`subject-${s.toLowerCase()}`),
              }))}
              value={subject}
              onChange={(s) => {
                setSubject(s);
                setChapter("");
                setFailed(false);
              }}
            />
          </div>
          {subject && (
            <div className="lt-shc-step" role="group" aria-labelledby={chapterLabelId}>
              <span className="lt-shc-lbl" id={chapterLabelId}>
                2 · Chapter
              </span>
              <button
                ref={chapterBtnRef}
                type="button"
                className="lt-shc-pick"
                data-testid={tid("chapter")}
                data-chapter={selected}
                aria-haspopup="dialog"
                disabled={!selected}
                onClick={() => setPickerOpen(true)}
              >
                <span className="lt-shc-pick-name">{selectedName || "No chapter ready yet"}</span>
                <span className="lt-shc-pick-change" aria-hidden="true">
                  Change
                </span>
              </button>
              {/* D2 — the EXISTING chapter picker (ChapterPickerModal), opened on the tapped
                  subject with that subject locked; chapters without a full Start-here set are
                  "coming soon" and cannot be chosen. Re-keyed per subject so it opens fresh. */}
              <ChapterPickerModal
                key={subject}
                open={pickerOpen}
                onClose={closePicker}
                title="Pick a chapter"
                sub={`${subject} chapters with board-style questions ready.`}
                goLabel="Use this chapter"
                testId={tid("chapter-picker")}
                idPrefix={pickerIdPrefix}
                initialSubject={subject}
                initialTopicKey={selected}
                lockSubject
                overlayClassName="lt-shc-picker-top"
                isComingSoon={(_s, slug) => !chapterOk(slug)}
                onGo={(_s, slug) => {
                  setChapter(slug);
                  setFailed(false);
                }}
              />
            </div>
          )}
          {subject && types.length > 0 && (
            <div className="lt-shc-step">
              <span className="lt-shc-lbl" aria-hidden="true">
                3 · Question type
              </span>
              <Segmented<StartHereQType>
                label="Question type"
                options={types.map((t) => ({ value: t, label: QTYPE_SEG[t], sub: countLine(t), testId: tid(`qtype-${t}`) }))}
                value={activeType}
                onChange={setQtype}
                stackBelow={START_HERE_SEG_STACK_BELOW}
              />
              <p className="lt-shc-help" data-testid={tid("qtype-help")}>
                {START_HERE_QTYPE_HELP[activeType]}
              </p>
            </div>
          )}
          {failed && (
            <p className="lt-shc-note" role="alert">
              {activeType === "written"
                ? "We couldn't line up a written question for that chapter just now. Try another chapter."
                : "We couldn't line up five questions for that chapter just now. Try another chapter."}
            </p>
          )}
          <div className="lt-shc-ctas">
            <button
              type="button"
              className="lt-shc-go"
              data-testid={tid("go")}
              aria-live="polite"
              disabled={!subject || !selected || isBusy}
              onClick={onGo}
            >
              {busy === "picker"
                ? activeType === "written"
                  ? START_HERE_GETTING_ONE
                  : START_HERE_GETTING
                : START_HERE_START_LABEL[activeType]}
            </button>
            <button type="button" className="lt-shc-later" data-testid={tid("not-now")} onClick={onNotNow}>
              {START_HERE_COPY.notNow}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ── QP-SCORECARD-2 E1/E3 — the FOCUSED first-run surface ───────────────────────────────── */

/** The focused surface's analytics param: the page's surface + "_focus" (TRACK-2 event names). */
export type { StartHereFocusSurface };
export function focusSurfaceOf(surface: StartHereSurface): StartHereFocusSurface {
  return `${surface}_focus`;
}

/**
 * `start_here_shown` / `start_here_dismissed` with a focus surface. The event NAMES are TRACK-2's;
 * only the `surface` VALUE is new (analytics.ts StartHereFocusSurface), and it passes the
 * onboarding slug filter as-is.
 */
function trackFocus(
  name: "start_here_shown" | "start_here_dismissed",
  surface: StartHereSurface,
  checkOne = false,
): void {
  // ACTIVATION-2 A: the Check & Improve takeover adds `variant: "check_one"`; every other call is
  // byte-for-byte the payload it was.
  trackOnboardingEvent(
    name,
    checkOne ? { surface: focusSurfaceOf(surface), variant: "check_one" } : { surface: focusSurfaceOf(surface) },
  );
}

/** ACTIVATION-2 A — the Check & Improve takeover's copy (honest: one answer, free, no promise). */
export const START_HERE_CHECK_ONE_COPY = {
  kicker: "Start here",
  body: "Check one written answer – free. Type or photograph a question, then your answer; we show where marks are lost.",
  cta: "Check one answer",
  practise: "or practise 5 questions",
} as const;

export interface StartHereFocusViewProps {
  /** The signed-in uid (the "Not now" memory is per uid, on this device). */
  uid: string;
  /** The page: "home" | "practice_hub" | "check_improve" → event surface "<page>_focus". */
  surface: StartHereSurface;
  returnTo: string;
  /** The SAME eligibility read the inline card uses (useStartHere). */
  state: StartHereState;
  /** ACTIVATION-2 A — set on Check & Improve only: lead with "Check one answer". */
  checkOneAnswer?: () => void;
  /** ACTIVATION-2 A — called once the takeover closes by any route (✕, Esc, Not now, Check one). */
  onClosed?: () => void;
}

/**
 * The focused first-run surface. Renders NOTHING, and reads nothing beyond the audience check,
 * unless the inline card's own audience rule holds AND the E3 "Not now" rule allows it — so a
 * signed-out visitor or an existing student never reaches the overlay code path.
 */
export function StartHereFocusView({ uid, surface, returnTo, state, checkOneAnswer, onClosed }: StartHereFocusViewProps) {
  const [closed, setClosed] = useState(false);
  const eligible = state.visible && !!uid && !closed;
  // The device memory is read only once the audience rule says yes.
  const allowed = useMemo(() => (eligible ? focusAllowed(uid) : false), [eligible, uid]);
  if (!eligible || !allowed) return null;
  const checkOne = !!checkOneAnswer;
  return (
    <StartHereFocusDialog
      surface={surface}
      returnTo={returnTo}
      checkOne={checkOne}
      onNotNow={() => {
        trackFocus("start_here_dismissed", surface, checkOne);
        recordFocusNotNow(uid);
        setClosed(true);
        onClosed?.();
      }}
      onCheckOne={
        checkOneAnswer
          ? () => {
              // The student chose the check: closed for this visit (not a "Not now", so the
              // twice-offered count is untouched); the page then takes them to its question box.
              try {
                window.sessionStorage.setItem(START_HERE_FOCUS_CLOSED_KEY, "1");
              } catch {
                /* blocked storage: closed for this mount only */
              }
              setClosed(true);
              onClosed?.();
              checkOneAnswer();
            }
          : undefined
      }
    />
  );
}

const FOCUSABLE =
  'button:not([disabled]), select:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

function StartHereFocusDialog({
  surface,
  returnTo,
  onNotNow,
  checkOne = false,
  onCheckOne,
}: {
  surface: StartHereSurface;
  returnTo: string;
  onNotNow: () => void;
  /** ACTIVATION-2 A — lead with "Check one answer" (Check & Improve only). */
  checkOne?: boolean;
  onCheckOne?: () => void;
}) {
  const isDesktop = useIsDesktop();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const headingId = useId();
  const shownRef = useRef(false);
  // ACTIVATION-2 A: "or practise 5 questions" swaps in the existing practice picker, in place.
  const [practise, setPractise] = useState(false);
  // ACTIVATION-2 A (iOS): "Check one answer" hands focus to the page's question box INSIDE the tap
  // (iOS raises the keyboard only for a focus made in the user gesture). Once released, the trap
  // stops pulling focus back and the close does not restore focus over the box.
  const releasedRef = useRef(false);

  useEffect(() => {
    if (shownRef.current) return;
    shownRef.current = true;
    if (claimStartHereShown(focusSurfaceOf(surface))) trackFocus("start_here_shown", surface, checkOne);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per mount; checkOne is fixed per page
  }, [surface]);

  // The latest Not-now handler, for the document listeners below (mounted once).
  const notNowRef = useRef(onNotNow);
  useEffect(() => {
    notNowRef.current = onNotNow;
  }, [onNotNow]);

  // ORDER MATTERS: this effect is declared BEFORE the focus-restore one, so on unmount its
  // listeners are removed first and restoring focus to the page cannot be pulled back in.
  /**
   * The trap and Esc live on the DOCUMENT (capture phase), so they hold wherever focus is —
   * including <body> after a click on the dimmed backdrop. The one exception is the nested
   * chapter picker (ChapterPickerModal, portalled to <body>, `.lt-shc-picker-top`): while it is
   * open it is the topmost layer, so its own Esc closes only it and focus inside it is left alone.
   * Capture runs BEFORE React's root listener, i.e. while the picker is still in the DOM.
   */
  useEffect(() => {
    const pickerOpen = (): HTMLElement | null => document.querySelector<HTMLElement>(".lt-shc-picker-top");
    const items = (): HTMLElement[] =>
      dialogRef.current ? Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)) : [];
    const inside = (n: EventTarget | null): boolean => {
      const node = n as Node | null;
      if (!node) return false;
      if (dialogRef.current?.contains(node)) return true;
      const picker = pickerOpen();
      return !!picker && picker.contains(node);
    };
    const pullBack = () => {
      const picker = pickerOpen();
      const target = picker
        ? (picker.querySelector<HTMLElement>("select") ?? picker.querySelector<HTMLElement>("button"))
        : (items()[0] ?? dialogRef.current);
      target?.focus();
    };

    const onKey = (e: globalThis.KeyboardEvent) => {
      if (releasedRef.current) return;
      const picker = pickerOpen();
      if (e.key === "Escape") {
        if (picker) return; // the topmost layer (the picker) handles its own Esc
        e.preventDefault();
        e.stopPropagation();
        notNowRef.current();
        return;
      }
      if (e.key !== "Tab" || picker) return;
      const list = items();
      if (list.length === 0) {
        e.preventDefault();
        return;
      }
      const first = list[0];
      const last = list[list.length - 1];
      const active = document.activeElement;
      const outside = !dialogRef.current || !dialogRef.current.contains(active);
      if (e.shiftKey && (active === first || outside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || outside)) {
        e.preventDefault();
        first.focus();
      }
    };
    // Focus that lands outside the dialog (and outside an open picker) is pulled back in.
    const onFocusIn = (e: FocusEvent) => {
      if (releasedRef.current) return;
      if (!inside(e.target)) pullBack();
    };
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("focusin", onFocusIn, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("focusin", onFocusIn, true);
    };
  }, []);

  // Focus moves into the dialog, the page behind stops scrolling, and focus returns on close.
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const first = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? dialogRef.current)?.focus();
    document.documentElement.classList.add("lt-shcf-lock");
    return () => {
      document.documentElement.classList.remove("lt-shcf-lock");
      if (releasedRef.current) return; // focus already handed to the page's question box
      if (before && typeof before.focus === "function" && document.contains(before)) before.focus();
    };
  }, []);

  // Portalled to <body>: a transformed ancestor (the phone layout's animated <main>) would
  // otherwise become the containing block of `position: fixed` (the ChapterPickerModal trap).
  return createPortal(
    <div
      className={isDesktop ? "lt-shcf lt-shcf--overlay" : "lt-shcf lt-shcf--full"}
      data-testid="start-here-focus"
      data-layout={isDesktop ? "overlay" : "full"}
      // A press on the dimmed backdrop must not move focus to <body> (out of the trap).
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) e.preventDefault();
      }}
    >
      <style>{CSS}</style>
      <div
        ref={dialogRef}
        className="lt-shc lt-shcf-dlg"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        tabIndex={-1}
      >
        <button
          type="button"
          className="lt-shcf-x"
          aria-label="Close"
          data-testid="start-here-focus-close"
          onClick={onNotNow}
        >
          ✕
        </button>
        {checkOne && onCheckOne && !practise ? (
          <>
            <p className="lt-shc-k">{START_HERE_CHECK_ONE_COPY.kicker}</p>
            <h2 className="lt-shc-h" id={headingId}>
              {START_HERE_CHECK_ONE_COPY.body}
            </h2>
            <div className="lt-shc-ctas">
              <button
                type="button"
                className="lt-shc-go"
                data-testid="start-here-focus-check-one"
                onClick={() => {
                  releasedRef.current = true;
                  onCheckOne();
                }}
              >
                {START_HERE_CHECK_ONE_COPY.cta}
              </button>
              <button
                type="button"
                className="lt-shc-later"
                data-testid="start-here-focus-practise"
                onClick={() => setPractise(true)}
              >
                {START_HERE_CHECK_ONE_COPY.practise}
              </button>
            </div>
          </>
        ) : (
          <StartHerePanel
            testIdPrefix="start-here-focus"
            returnTo={returnTo}
            onNotNow={onNotNow}
            startOpen
            headingId={headingId}
          />
        )}
      </div>
    </div>,
    document.body,
  );
}
