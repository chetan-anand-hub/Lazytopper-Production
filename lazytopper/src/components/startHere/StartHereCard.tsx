import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useIsDesktop } from "../../hooks/useIsDesktop";
import { START_HERE_AVAILABILITY } from "./startHereAvailability.generated";
import { cloudHasAnySessionRecord, loadLocalSessionRecords } from "../../services/sessionRecords";
import { authClient } from "../../services/firebaseClient";
import { trackOnboardingEvent, type StartHereSurface } from "../../analytics/analytics";
import { desktopTopicsBySubject } from "../../lib/desktop/topics";
import type { DesktopSubject } from "../../lib/desktop/navigation";
import {
  START_HERE_COPY,
  START_HERE_COUNT,
  START_HERE_QTYPE_LABEL,
  analyticsSubject,
  dismissForSession,
  focusAllowed,
  recordFocusNotNow,
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
 * ── THE PICKER ──────────────────────────────────────────────────────────────────────────
 * Three taps, decisions pre-made: subject (pre-picked from the ad when known), chapter (the
 * chapters that have CBQ MCQs; the rest read "coming soon"), question type (only the types the
 * chapter really has; "Quick 5" is the default). QP-SCORECARD-2 D3: which chapters / types are
 * offered comes from a PRECOMPUTED map (startHereAvailability.generated.ts, guarded against the
 * bank), so listing costs no network; the bank is reached with `import()` only on "Start 5
 * questions", so Home / Practice Hub / Check & Improve stay bank-free. D1: every choice is a
 * chip button (aria-pressed), no radio inputs (the global `input` CSS made them white bars).
 *
 * ── THE FOCUSED FIRST RUN (QP-SCORECARD-2 E) ────────────────────────────────────────────
 * The same audience may also get StartHereFocusView: full screen on a phone, a centred overlay
 * on desktop, offered at most twice (startHereModel.ts focusAllowed / recordFocusNotNow).
 *
 * Honest copy: no invented numbers, no promised score.
 */

type Tri = "loading" | "none" | "some";

/** One more ask after this long when the cloud could not answer. */
export const START_HERE_RETRY_MS = 3000;
/** An account created within this many days counts as new when the network cannot say. */
export const START_HERE_NEW_ACCOUNT_DAYS = 7;

/** The signed-in user's Firebase Auth `metadata.creationTime`, already on the device. Missing,
 *  unparseable, a different user, or in the future -> false (never guess "new"). */
export function accountIsNew(uid: string, now: number = Date.now()): boolean {
  try {
    const user = authClient?.currentUser;
    if (!user || user.uid !== uid) return false;
    const created = Date.parse(user.metadata?.creationTime ?? "");
    if (!Number.isFinite(created)) return false;
    const age = now - created;
    return age >= 0 && age <= START_HERE_NEW_ACCOUNT_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

const CSS = `
  .lt-sh { background: linear-gradient(160deg, hsl(222,47%,24%) 0%, hsl(222,47%,16%) 100%); color: #fff;
    border-radius: 15px; padding: 23px 25px; min-width: 0; max-width: 100%; box-sizing: border-box;
    box-shadow: 0 6px 18px -10px hsla(222, 47%, 20%, 0.55); margin-bottom: 14px; }
  .lt-sh--spaced { margin-top: 13px; }
  .lt-sh .lt-sh-k { font-size: 10.5px; letter-spacing: 0.14em; text-transform: uppercase;
    color: hsl(152, 55%, 60%); font-weight: 700; margin: 0 0 8px; }
  .lt-sh .lt-sh-h { font-family: 'Fraunces', Georgia, serif; font-size: 21px; line-height: 1.25;
    font-weight: 600; margin: 0 0 14px; color: #fff; }
  .lt-sh .lt-sh-ctas { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
  .lt-sh .lt-sh-go { display: inline-flex; align-items: center; justify-content: center;
    background: hsl(152, 55%, 45%); color: #fff; border: 0; border-radius: 10px; padding: 11px 22px;
    font-size: 14px; font-weight: 700; cursor: pointer; }
  .lt-sh .lt-sh-go:hover { background: hsl(152, 57%, 40%); }
  .lt-sh .lt-sh-go:disabled { opacity: 0.55; cursor: default; }
  .lt-sh .lt-sh-later { background: none; border: 0; color: rgba(255,255,255,0.78); font-size: 13.5px;
    font-weight: 600; text-decoration: underline; cursor: pointer; padding: 6px 2px; }
  .lt-sh .lt-sh-step { margin: 0 0 14px; }
  .lt-sh .lt-sh-lbl { display: block; font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.7);
    margin: 0 0 6px; letter-spacing: 0.02em; }
  .lt-sh .lt-sh-chips { display: flex; gap: 8px; flex-wrap: wrap; }
  .lt-sh .lt-sh-chip { border: 1px solid rgba(255,255,255,0.34); background: transparent; color: #fff;
    border-radius: 999px; padding: 9px 18px; font-size: 13.5px; font-weight: 700; cursor: pointer; }
  .lt-sh .lt-sh-chip[aria-pressed="true"] { background: hsl(152, 55%, 45%); border-color: hsl(152, 55%, 45%); }
  .lt-sh .lt-sh-select { width: 100%; box-sizing: border-box; border-radius: 10px; padding: 11px 12px;
    font-size: 14px; border: 1px solid rgba(255,255,255,0.34); background: hsl(222,47%,14%); color: #fff; }
  .lt-sh .lt-sh-select option { background: hsl(222,47%,14%); color: #fff; }
  .lt-sh .lt-sh-note { font-size: 12.5px; color: rgba(255,255,255,0.72); margin: 0 0 12px; line-height: 1.5; }
  @media (max-width: 480px) {
    .lt-sh { padding: 19px 17px; border-radius: 14px; }
    .lt-sh .lt-sh-h { font-size: 18.5px; }
    .lt-sh .lt-sh-ctas { flex-direction: column; align-items: stretch; gap: 9px; }
    .lt-sh .lt-sh-go { width: 100%; }
    .lt-sh .lt-sh-later { align-self: center; }
  }
  html.lt-shf-lock, html.lt-shf-lock body { overflow: hidden; }
  .lt-shf { position: fixed; inset: 0; z-index: 1000; box-sizing: border-box; }
  .lt-shf--overlay { background: hsla(222, 47%, 8%, 0.62); display: flex; align-items: center;
    justify-content: center; padding: 24px; }
  .lt-shf--overlay .lt-shf-dlg { width: 100%; max-width: 560px; max-height: calc(100vh - 48px);
    overflow-y: auto; margin: 0; position: relative; padding: 32px 34px 28px;
    box-shadow: 0 24px 60px -20px hsla(222, 60%, 4%, 0.8); }
  .lt-shf--full { background: hsl(222,47%,16%); overflow-y: auto; }
  .lt-shf--full .lt-shf-dlg { min-height: 100%; border-radius: 0; margin: 0; box-shadow: none;
    position: relative; padding: 56px 20px 28px; }
  .lt-shf .lt-shf-dlg:focus { outline: none; }
  .lt-shf .lt-shf-x { position: absolute; top: 12px; right: 12px; width: 40px; height: 40px;
    border-radius: 999px; border: 1px solid rgba(255,255,255,0.3); background: transparent;
    color: #fff; font-size: 16px; cursor: pointer; }
  .lt-shf .lt-shf-x:hover { background: rgba(255,255,255,0.1); }
  .lt-shf .lt-sh-h { padding-right: 36px; }
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
  const [graded, setGraded] = useState<Tri>("loading");
  const [dismissed, setDismissed] = useState<boolean>(() => isDismissedThisSession());

  useEffect(() => {
    // Re-enter "loading" on a uid change so a sign-in can never inherit the previous verdict.
    setGraded("loading");
    if (!uid) return;
    // Local first: any record on this device is the answer, and costs no network call.
    if (loadLocalSessionRecords(uid).length > 0) {
      setGraded("some");
      return;
    }
    let cancelled = false;
    void (async () => {
      // Only a device with no local rows asks the cloud, and only whether ONE record exists.
      // `true` -> a returning student; `false` -> a first session. `null` is "could not tell"
      // (offline, no Firestore, a cached answer, any error): ask ONCE more after a few seconds,
      // and if the network still cannot answer, decide from the account's age (known on the
      // device, no network) so a weak connection never hides the card from a NEW student.
      const ask = async (): Promise<boolean | null> => {
        try {
          return await cloudHasAnySessionRecord(uid);
        } catch {
          return null;
        }
      };
      let has = await ask();
      if (cancelled) return;
      if (has === null) {
        await new Promise((r) => setTimeout(r, START_HERE_RETRY_MS));
        if (cancelled) return;
        has = await ask();
        if (cancelled) return;
      }
      if (has === null) {
        // Still cannot tell: a young account with no local rows is almost certainly new; an older
        // or unknown one is never shown the card on a failed read.
        setGraded(accountIsNew(uid) ? "none" : "some");
        return;
      }
      setGraded(has === false ? "none" : "some");
    })();
    return () => {
      cancelled = true;
    };
  }, [uid]);

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
}

/** The card with its own eligibility read (Practice Hub, Check & Improve). */
export default function StartHereCard({ uid, focus = false, inProgress = false, ...rest }: StartHereCardProps) {
  const state = useStartHere(uid);
  return (
    <>
      {focus && !inProgress && uid ? (
        <StartHereFocusView uid={uid} surface={rest.surface} returnTo={rest.returnTo} state={state} />
      ) : null}
      <StartHereView {...rest} state={state} />
    </>
  );
}

/** The card, given an eligibility read the caller already made (Home). */
export function StartHereView({
  surface,
  returnTo,
  spaced = false,
  state,
}: Omit<StartHereCardProps, "uid" | "focus" | "inProgress"> & { state: StartHereState }) {
  const visible = state.visible;
  const shownRef = useRef(false);

  useEffect(() => {
    if (!visible || shownRef.current) return;
    shownRef.current = true;
    trackOnboardingEvent("start_here_shown", { surface });
  }, [visible, surface]);

  if (!visible) return null;

  const onNotNow = () => {
    trackOnboardingEvent("start_here_dismissed", { surface });
    state.dismiss();
  };

  return (
    <>
      <style>{CSS}</style>
      <section className={spaced ? "lt-sh lt-sh--spaced" : "lt-sh"} data-testid="start-here-card">
        <StartHerePanel testIdPrefix="start-here" returnTo={returnTo} onNotNow={onNotNow} />
      </section>
    </>
  );
}

/* ── the shared content: copy, the three-tap picker, Start ─────────────────────────────── */

const QTYPES: readonly StartHereQType[] = ["mcq", "ar"];
type ChapterCounts = Record<StartHereQType, number>;

/** D3: the honest state while the five questions are fetched (the only bank download). */
export const START_HERE_GETTING = "Getting your 5 questions…";

/** The precomputed counts for a chapter (startHereAvailability.generated.ts; no bank download). */
function chapterCounts(subject: DesktopSubject, slug: string): ChapterCounts | undefined {
  const bySubject = START_HERE_AVAILABILITY[subject] as Record<string, ChapterCounts | undefined>;
  return bySubject[slug];
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
  const chapterId = useId();
  const [open, setOpen] = useState(startOpen);
  // D4: the ad's hint pre-picks a subject; with no hint NOTHING is pre-selected (the card asks).
  const [subject, setSubject] = useState<DesktopSubject | null>(() => readSubjectHint());
  const [chapter, setChapter] = useState("");
  // D1: "Quick 5: tap the answer" is the default type.
  const [qtype, setQtype] = useState<StartHereQType>("mcq");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const tid = (s: string) => `${testIdPrefix}-${s}`;

  // D2/D3: the chapter list is the shared one (`desktopTopicsBySubject`, the list
  // ChapterPickerModal shows, with its " — coming soon" / first-available rules), and which
  // chapters can host a set comes from the precomputed map: a subject tap lists chapters at
  // once, with NO network call.
  const topics = useMemo(() => (subject ? desktopTopicsBySubject(subject) : []), [subject]);
  const offered = (slug: string, t: StartHereQType): boolean =>
    !!subject && (chapterCounts(subject, slug)?.[t] ?? 0) >= START_HERE_COUNT;
  const chapterOk = (slug: string): boolean => QTYPES.some((t) => offered(slug, t));
  const selected = chapter && chapterOk(chapter) ? chapter : (topics.find((t) => chapterOk(t.slug))?.slug ?? "");
  const types = QTYPES.filter((t) => selected && offered(selected, t));
  const activeType: StartHereQType = types.includes(qtype) ? qtype : (types[0] ?? "mcq");

  const onGo = async () => {
    if (!subject || !selected || busy) return;
    setBusy(true);
    setFailed(false);
    try {
      // D3: the bank is reached HERE, on Start, and nowhere earlier.
      const bank = await import("./startHereBank");
      const ids = await bank.pickStartHereSet({ subject, chapter: selected, qtype: activeType, rotation: Date.now() });
      if (ids.length < START_HERE_COUNT) {
        setFailed(true);
        setBusy(false);
        return;
      }
      trackOnboardingEvent("start_here_start", { subject: analyticsSubject(subject), chapter: selected, qtype: activeType });
      navigate(startHerePracticePath({ subject, chapter: selected, ids, qtype: activeType, returnTo }));
    } catch {
      setFailed(true);
      setBusy(false);
    }
  };

  return (
    <>
      <p className="lt-sh-k">{START_HERE_COPY.kicker}</p>
      <h2 className="lt-sh-h" id={headingId}>
        {START_HERE_COPY.body}
      </h2>
      {!open ? (
        <div className="lt-sh-ctas">
          <button type="button" className="lt-sh-go" data-testid={tid("start")} onClick={() => setOpen(true)}>
            {START_HERE_COPY.start}
          </button>
          <button type="button" className="lt-sh-later" data-testid={tid("not-now")} onClick={onNotNow}>
            {START_HERE_COPY.notNow}
          </button>
        </div>
      ) : (
        <>
          <div className="lt-sh-step" role="group" aria-label="Subject">
            <span className="lt-sh-lbl">1 · Subject</span>
            <div className="lt-sh-chips">
              {(["Maths", "Science"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  className="lt-sh-chip"
                  aria-pressed={subject === s}
                  data-testid={tid(`subject-${s.toLowerCase()}`)}
                  onClick={() => {
                    setSubject(s);
                    setChapter("");
                    setFailed(false);
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          {subject && (
            <div className="lt-sh-step">
              <label className="lt-sh-lbl" htmlFor={chapterId}>
                2 · Chapter
              </label>
              <select
                id={chapterId}
                className="lt-sh-select"
                data-testid={tid("chapter")}
                value={selected}
                onChange={(e) => {
                  setChapter(e.target.value);
                  setFailed(false);
                }}
              >
                {topics.map((t) => (
                  <option key={t.slug} value={t.slug} disabled={!chapterOk(t.slug)}>
                    {chapterOk(t.slug) ? t.name : `${t.name} — coming soon`}
                  </option>
                ))}
              </select>
            </div>
          )}
          {subject && types.length > 0 && (
            <div className="lt-sh-step" role="group" aria-label="Question type">
              <span className="lt-sh-lbl">3 · Question type</span>
              <div className="lt-sh-chips">
                {types.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className="lt-sh-chip"
                    aria-pressed={activeType === t}
                    data-testid={tid(`qtype-${t}`)}
                    onClick={() => setQtype(t)}
                  >
                    {START_HERE_QTYPE_LABEL[t]}
                  </button>
                ))}
              </div>
            </div>
          )}
          {failed && (
            <p className="lt-sh-note" role="alert">
              We couldn&apos;t line up five questions for that chapter just now. Try another chapter.
            </p>
          )}
          <div className="lt-sh-ctas">
            <button
              type="button"
              className="lt-sh-go"
              data-testid={tid("go")}
              aria-live="polite"
              disabled={!subject || !selected || busy}
              onClick={() => void onGo()}
            >
              {busy ? START_HERE_GETTING : "Start 5 questions"}
            </button>
            <button type="button" className="lt-sh-later" data-testid={tid("not-now")} onClick={onNotNow}>
              {START_HERE_COPY.notNow}
            </button>
          </div>
        </>
      )}
    </>
  );
}

/* ── QP-SCORECARD-2 E1/E3 — the FOCUSED first-run surface ───────────────────────────────── */

/** The focused surface's analytics param: the page's surface + "_focus" (TRACK-2 event names). */
export type StartHereFocusSurface = `${StartHereSurface}_focus`;
export function focusSurfaceOf(surface: StartHereSurface): StartHereFocusSurface {
  return `${surface}_focus`;
}

/**
 * `start_here_shown` / `start_here_dismissed` with a focus surface. The event NAMES are TRACK-2's;
 * only the `surface` VALUE is new, and it passes the onboarding slug filter as-is. The cast is the
 * one place the narrower StartHereSurface type (analytics.ts, outside this lane) is widened.
 */
function trackFocus(name: "start_here_shown" | "start_here_dismissed", surface: StartHereSurface): void {
  trackOnboardingEvent(name, { surface: focusSurfaceOf(surface) as unknown as StartHereSurface });
}

export interface StartHereFocusViewProps {
  /** The signed-in uid (the "Not now" memory is per uid, on this device). */
  uid: string;
  /** The page: "home" | "practice_hub" | "check_improve" → event surface "<page>_focus". */
  surface: StartHereSurface;
  returnTo: string;
  /** The SAME eligibility read the inline card uses (useStartHere). */
  state: StartHereState;
}

/**
 * The focused first-run surface. Renders NOTHING, and reads nothing beyond the audience check,
 * unless the inline card's own audience rule holds AND the E3 "Not now" rule allows it — so a
 * signed-out visitor or an existing student never reaches the overlay code path.
 */
export function StartHereFocusView({ uid, surface, returnTo, state }: StartHereFocusViewProps) {
  const [closed, setClosed] = useState(false);
  const eligible = state.visible && !!uid && !closed;
  // The device memory is read only once the audience rule says yes.
  const allowed = useMemo(() => (eligible ? focusAllowed(uid) : false), [eligible, uid]);
  if (!eligible || !allowed) return null;
  return (
    <StartHereFocusDialog
      surface={surface}
      returnTo={returnTo}
      onNotNow={() => {
        trackFocus("start_here_dismissed", surface);
        recordFocusNotNow(uid);
        setClosed(true);
      }}
    />
  );
}

const FOCUSABLE =
  'button:not([disabled]), select:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

function StartHereFocusDialog({
  surface,
  returnTo,
  onNotNow,
}: {
  surface: StartHereSurface;
  returnTo: string;
  onNotNow: () => void;
}) {
  const isDesktop = useIsDesktop();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const headingId = useId();
  const shownRef = useRef(false);

  useEffect(() => {
    if (shownRef.current) return;
    shownRef.current = true;
    trackFocus("start_here_shown", surface);
  }, [surface]);

  // Focus moves into the dialog, the page behind stops scrolling, and focus returns on close.
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const first = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? dialogRef.current)?.focus();
    document.documentElement.classList.add("lt-shf-lock");
    return () => {
      document.documentElement.classList.remove("lt-shf-lock");
      if (before && typeof before.focus === "function" && document.contains(before)) before.focus();
    };
  }, []);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onNotNow();
      return;
    }
    const root = dialogRef.current;
    if (e.key !== "Tab" || !root) return;
    const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (items.length === 0) {
      e.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || !root.contains(active))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (active === last || !root.contains(active))) {
      e.preventDefault();
      first.focus();
    }
  };

  // Portalled to <body>: a transformed ancestor (the phone layout's animated <main>) would
  // otherwise become the containing block of `position: fixed` (the ChapterPickerModal trap).
  return createPortal(
    <div
      className={isDesktop ? "lt-shf lt-shf--overlay" : "lt-shf lt-shf--full"}
      data-testid="start-here-focus"
      data-layout={isDesktop ? "overlay" : "full"}
    >
      <style>{CSS}</style>
      <div
        ref={dialogRef}
        className="lt-sh lt-shf-dlg"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
      >
        <button
          type="button"
          className="lt-shf-x"
          aria-label="Close"
          data-testid="start-here-focus-close"
          onClick={onNotNow}
        >
          ✕
        </button>
        <StartHerePanel
          testIdPrefix="start-here-focus"
          returnTo={returnTo}
          onNotNow={onNotNow}
          startOpen
          headingId={headingId}
        />
      </div>
    </div>,
    document.body,
  );
}
