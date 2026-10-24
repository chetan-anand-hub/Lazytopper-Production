/**
 * COMPANION-1 — THE EAGER HALF: who sees a companion moment, and the lazy door. It holds no copy and
 * no drawing — every line, the rig and the CSS live in ./companionChunk.tsx (its own chunk, fetched
 * only when a moment is about to show). Decisions are ./companionModel.ts (pure).
 *
 * WHO SEES ONE: a signed-in student in the GUIDE arm (`resolveGuideVariant(uid) === "guide"` — every
 * student since GUIDE-ALL-1; the admin preview relaxes the once-only markers and silences analytics).
 * "Hide mascots" → nothing, anywhere. Reduced motion → the chunk draws the final frame, still.
 * The guide is OFF in test mode, so every existing page suite renders exactly today's page and no
 * door below reads the clock unless a test turns it on.
 *
 * THE DOORS
 *   CompanionHome       — Home (mobile + desktop): 4 milestones · 5 welcome back · 7 rhythm · 8 countdown.
 *   CompanionNightDoor  — 6 late night, on any signed-in page (mounted ONCE, by the app-wide
 *                         CommandPalette, which App renders on every signed-in route).
 *   CompanionScoreSlot  — 1 low score · 3 improvement: EXPORTED for GUIDE-SCORE-1 (owner of the
 *                         scorecard's mascot line) to mount; not mounted by this lane.
 *   CompanionBreathe    — 2 breathe before a Chapter Test / Full Mock: EXPORTED for GUIDE-PAGES-1's
 *                         mount slot on those entry pages; not mounted by this lane.
 *
 * ONE CHARACTER ON SCREEN (outside a scene): every card is `Staged` — it draws only while it holds
 * the priority stage, no focused guide is open, and NO other mascot is registered on the page
 * (../mascotPresence.ts, fed by every BlobCharacter). All three are subscriptions, not polls: the
 * instant a MOMENTS-1 moment (or any mascot) appears, a companion card steps aside.
 */
import { lazy, Suspense, useEffect, useRef, useState, useSyncExternalStore, type ComponentType, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { isResumingSavedPaper } from "../../../lib/papers/resumablePaper";
import { loadLocalSessionRecords } from "../../../services/sessionRecords";
import { getAttempts, type PracticeAttempt } from "../../../services/practiceInsights";
import { useZeroGraded } from "../../startHere/zeroGraded";
import { guideAbActive, guideFocusOpen, guidePreviewActive, resolveGuideVariant, subscribeGuideFocus } from "../guideVariant";
import { mascotsHidden, useMascotsHidden } from "../mascotsMute";
import { mascotHostsVersion, subscribeMascotHosts } from "../mascotPresence";
import {
  COMPANION_PRIORITY,
  activeMsFor,
  cachedExamDate,
  claimStage,
  companionScoreMoment,
  countdownDue,
  daysToBoards,
  examWeekDays,
  examWeekDue,
  istDayIndex,
  isLateNightQuietPath,
  lateNightDue,
  marksFor,
  nightKey,
  noteActivity,
  otherMascotOnScreen,
  pickHomeMoment,
  previousHomeVisit,
  previousSeen,
  readMarks,
  releaseStage,
  stageHolder,
  subscribeStage,
  writeMarks,
  type CompanionMomentId,
  type HomePick,
} from "./companionModel";
import type { BreatheCardProps, CompanionCardProps } from "./companionChunk";
import { canShowScene, markSceneShown } from "../sceneGuard";
import "./companionDoor.css";
import { APPEARANCE_PRIORITY, NoteShown, shownThisSession, useAppearance } from "../mascotBudget";
import { registerPreTestMoment, type PreTestMomentProps } from "../pages/preTestSlot";

type Chunk = typeof import("./companionChunk");
const load = (): Promise<Chunk> => import("./companionChunk");

function lazyPart<P extends object>(pick: (m: Chunk) => ComponentType<P>) {
  const Nothing: ComponentType<P> = () => null;
  return lazy(() => load().then((m) => ({ default: pick(m) }), () => ({ default: Nothing })));
}

const LazyCompanionCard = lazyPart((m) => m.CompanionCard);
const LazyBreatheCard = lazyPart((m) => m.BreatheCard);
const LazyDuetCard = lazyPart((m) => m.DuetCard);

function inGuideArm(uid: string | null | undefined): uid is string {
  return !!uid && resolveGuideVariant(uid) === "guide";
}

/** Another (non-companion, non-chrome) mascot is registered on the page — a subscription. */
function useOtherMascot(): boolean {
  useSyncExternalStore(subscribeMascotHosts, mascotHostsVersion, () => 0);
  return otherMascotOnScreen();
}

/**
 * The one place a companion card is drawn. It asks for the stage at its priority and draws ONLY
 * while it holds it, no focused guide is open, and no other mascot is on the page. `stacked`
 * (admin preview on Home only) lets the owner see it under Start-here's Byte.
 */
function Staged({ id, priority, stacked, budgeted = true, children }: { id: string; priority: number; stacked?: boolean; budgeted?: boolean; children: ReactNode }) {
  const holder = useSyncExternalStore(subscribeStage, stageHolder, () => null);
  const focus = useSyncExternalStore(subscribeGuideFocus, guideFocusOpen, () => false);
  const other = useOtherMascot();
  const exempt = !budgeted || id === "lateNight";
  useEffect(() => {
    claimStage(id, priority);
    return () => releaseStage(id);
  }, [id, priority]);
  const wantsDraw = holder === id && (stacked || (!focus && !other));
  // MOMENTS-3 - the director: a companion card is an UNPROMPTED appearance (at most 3 a session).
  // EXEMPT: the late-night wellbeing note (Ziggy's yawn + Byte's moon) is never counted or refused -
  // safety first, and it is already once per night. A card whose caller already holds the appearance
  // (the scorecard's duet) passes `budgeted={false}`.
  const allowed = useAppearance(!exempt && wantsDraw ? `companion:${id}` : null, APPEARANCE_PRIORITY.companion);
  if (!wantsDraw || (!exempt && !allowed)) return null;
  return (
    <Suspense fallback={null}>
      {children}
      {allowed ? <NoteShown kind={allowed} /> : null}
    </Suspense>
  );
}

function safeAttempts(): PracticeAttempt[] {
  try {
    return getAttempts();
  } catch {
    return [];
  }
}

/* ── Home: 4 · 5 · 7 · 8 ──────────────────────────────────────────────────────────────────────── */

export interface CompanionHomeProps {
  /** The signed-in, non-local account (null → nothing). */
  uid: string | null | undefined;
  /** Start-here's audience (zero graded): Byte is already guiding there, so the companion waits. */
  startHereUp?: boolean;
  /** The Home this is mounted on ("/" desktop, "/browse" mobile) — where the warm-up returns. */
  returnTo?: "/" | "/browse";
}

type HomeShow = HomePick | { moment: "countdown"; days: number } | { moment: "examWeek"; days: number };

export function CompanionHome({ uid, startHereUp, returnTo = "/" }: CompanionHomeProps) {
  const hidden = useMascotsHidden();
  // Controller ruling 23 Oct: under an admin preview Start-here is always "eligible", which would hide
  // the companion from the owner — so in preview both show, stacked.
  const preview = guidePreviewActive();
  if (hidden || !inGuideArm(uid) || (startHereUp && !preview)) return null;
  return <CompanionHomeInner uid={uid} returnTo={returnTo} preview={preview} />;
}

function CompanionHomeInner({ uid, returnTo, preview }: { uid: string; returnTo: "/" | "/browse"; preview: boolean }) {
  const [show, setShow] = useState<HomeShow | null>(null);
  const [closed, setClosed] = useState(false);
  // A milestone may play as a short duet SCENE when the shared guard allows one; decided once.
  const [scene] = useState(() => canShowScene());
  // Controller ruling 23 Oct: nothing is evaluated (or marked) until Start-here's own zero-graded
  // read has an answer — the SAME shared read (no extra request). "none" is Start-here's audience.
  const graded = useZeroGraded(uid);
  const ready = graded === "some" || (preview && graded !== "loading");

  useEffect(() => {
    if (!ready) return undefined;
    let live = true;
    const now = Date.now();
    const prevSeen = previousSeen(uid, now);
    const prevHome = previousHomeVisit(uid, now);
    const records = loadLocalSessionRecords(uid);
    const attempts = safeAttempts();
    if (records.length === 0 && attempts.length === 0) return undefined;
    const marks = marksFor(uid);
    const { pick, silent } = pickHomeMoment({
      now,
      facts: { records, gradedAnswers: attempts.filter((a) => a.mode === "graded").length },
      attemptTimes: attempts.map((a) => a.timestamp),
      gradedTimes: attempts.filter((a) => a.mode === "graded").map((a) => a.timestamp),
      prevSeen,
      prevHome,
      marks,
      returnTo,
    });
    // Veteran rule: milestones reached before the last Home visit are marked, never announced.
    if (silent.length) writeMarks(uid, { m: Array.from(new Set([...readMarks(uid).m, ...silent])) });
    if (pick) {
      setShow(pick);
      return undefined;
    }
    // 8 — weekly, and ONLY from an OFFICIAL date (the server's CBSE read or an admin-confirmed date);
    // the read is kept for the IST day, so Home never refetches it on every mount.
    const cached = cachedExamDate(marks, now);
    // MOMENTS-3: a cached read also lets the exam-week check run (it never triggers a fetch on its own).
    if (!countdownDue({ now, lastCountdownAt: marks.c }) && !cached) return undefined;
    const applyDate = (date: string, src: "official" | "predicted") => {
      // Never an invented date: only an OFFICIAL one (the server's CBSE read or an admin-confirmed date).
      if (!live || src !== "official") return;
      const at = Date.now();
      // ziggy_examday: the week of the exam (0–6 IST days before it), once per exam week.
      const week = examWeekDays(at, date);
      if (week !== null && examWeekDue({ now: at, lastAt: marks.e ?? null })) {
        setShow({ moment: "examWeek", days: week });
        return;
      }
      if (!countdownDue({ now: at, lastCountdownAt: marks.c })) return;
      const days = daysToBoards(at, date);
      if (days !== null) setShow({ moment: "countdown", days });
    };
    if (cached) {
      applyDate(cached.date, cached.src);
      return undefined;
    }
    void import("../../../services/cbseExamDate")
      .then((m) => m.fetchCbseExamDate("10"))
      .then((r) => {
        if (!r) return;
        writeMarks(uid, { x: { d: istDayIndex(now), date: r.examDate, src: r.source } });
        applyDate(r.examDate, r.source);
      })
      .catch(() => {
        /* no date → no moment */
      });
    return () => {
      live = false;
    };
  }, [uid, returnTo, ready]);

  if (!show || closed) return null;
  const close = () => setClosed(true);
  const spend = (): void => {
    const at = Date.now();
    if (show.moment === "milestone") writeMarks(uid, { m: Array.from(new Set([...readMarks(uid).m, ...show.mark])) });
    else if (show.moment === "welcomeBack") writeMarks(uid, { wb: show.ref });
    else if (show.moment === "rhythm") writeMarks(uid, { r: at });
    else if (show.moment === "examWeek") writeMarks(uid, { e: at });
    else writeMarks(uid, { c: at });
  };
  if (show.moment === "milestone" && scene) {
    return (
      <Staged id="home-milestone" priority={COMPANION_PRIORITY.milestone} stacked={preview}>
        <LazyDuetCard
          moment="milestone"
          milestone={show.milestone}
          onShown={() => {
            markSceneShown("milestone");
            spend();
          }}
          onClose={close}
        />
      </Staged>
    );
  }
  const card: CompanionCardProps =
    show.moment === "milestone"
      ? { moment: "milestone", milestone: show.milestone, onShown: spend, onClose: close }
      : show.moment === "welcomeBack"
        ? { moment: "welcomeBack", ctaTo: show.to, onShown: spend, onClose: close }
        : { moment: show.moment, vars: { days: show.days }, onShown: spend, onClose: close };
  return (
    <Staged id={`home-${show.moment}`} priority={COMPANION_PRIORITY[show.moment]} stacked={preview}>
      <LazyCompanionCard {...card} />
    </Staged>
  );
}

/* ── 6 — late night, on any signed-in page ─────────────────────────────────────────────────────── */

export { LATE_NIGHT_QUIET_PATHS } from "./companionModel";
/** How often the late-night rule is re-checked while a page is open. */
export const LATE_NIGHT_CHECK_MS = 60_000;
/** The student's own activity that starts / extends the active session. */
const ACTIVITY_EVENTS = ["pointerdown", "keydown", "wheel", "touchstart"] as const;

/** The signed-in, non-anonymous uid from Firebase Auth (no AuthProvider needed), or null. */
function useSignedInUid(): string | null {
  const [uid, setUid] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    let off: (() => void) | undefined;
    void import("../../../services/firebaseClient")
      .then(({ authClient }) => {
        if (!live || !authClient) return;
        off = authClient.onAuthStateChanged((u) => setUid(u && !u.isAnonymous && u.uid ? u.uid : null));
      })
      .catch(() => {
        /* no auth → no note */
      });
    return () => {
      live = false;
      off?.();
    };
  }, []);
  return uid;
}

/** Mounted ONCE for the whole app. Renders nothing at all unless the guide is live. */
export function CompanionNightDoor() {
  if (!guideAbActive()) return null;
  return <CompanionNight />;
}

function CompanionNight() {
  const uid = useSignedInUid();
  const { pathname } = useLocation();
  const hidden = useMascotsHidden();
  const [due, setDue] = useState<string | null>(null); // the uid it became due for
  const [closed, setClosed] = useState<string | null>(null);
  const tracked = useRef(false);
  const guide = inGuideArm(uid);

  // The ACTIVE session: only the student's own activity starts or extends it (controller ruling).
  useEffect(() => {
    if (!guide || !uid) return undefined;
    const onAct = () => {
      noteActivity(uid, Date.now());
    };
    const onVis = () => {
      if (document.visibilityState === "visible") onAct();
    };
    onAct(); // opening a signed-in page is the student's own action
    for (const e of ACTIVITY_EVENTS) window.addEventListener(e, onAct, { passive: true });
    document.addEventListener("visibilitychange", onVis);
    return () => {
      for (const e of ACTIVITY_EVENTS) window.removeEventListener(e, onAct);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [guide, uid]);

  useEffect(() => {
    if (!guide || !uid) return undefined;
    const check = () => {
      const now = Date.now();
      previousSeen(uid, now); // records this visit (the welcome-back rule reads it)
      // Sticky once due: the note stays until the student closes it (a quiet route only HIDES it).
      if (lateNightDue({ now, activeMs: activeMsFor(uid, now), lastNight: marksFor(uid).n })) setDue(uid);
    };
    check();
    const t = window.setInterval(check, LATE_NIGHT_CHECK_MS);
    return () => window.clearInterval(t);
  }, [guide, uid]);

  // Checked on EVERY render: navigating into a test / practice / Check & Improve hides it; leaving
  // brings it back (unless closed). A different account never inherits another's note.
  if (!guide || !uid || due !== uid || closed === uid || hidden || isLateNightQuietPath(pathname)) return null;
  return (
    <Staged id="lateNight" priority={COMPANION_PRIORITY.lateNight}>
      <LazyCompanionCard
        moment="lateNight"
        fixed
        trackShown={!tracked.current}
        onShown={() => {
          tracked.current = true;
          writeMarks(uid, { n: nightKey(Date.now()) });
        }}
        onClose={() => setClosed(uid)}
      />
    </Staged>
  );
}

/* ── 1 & 3 — for GUIDE-SCORE-1 to mount on the scorecard ──────────────────────────────────────── */

export interface CompanionScoreSlotProps {
  /** MOMENTS-3: false when the caller already holds the appearance (the scorecard guide). Default true. */
  budgeted?: boolean;
  uid: string | null | undefined;
  /** This result's whole percentage (companionModel.scorePct over the scorecard's own marks). */
  pct: number | null;
  /** The previous result on the same surface + chapter (companionModel.previousSameScore), or null. */
  previousPct: number | null;
  /** The scorecard's own Mistake-Intelligence targeted fix (an internal route), for "Fix one thing". */
  fixTo?: string | null;
  /** A question or test is still in progress on this page → never a two-character scene. */
  busy?: boolean;
}

export function CompanionScoreSlot({ uid, pct, previousPct, fixTo, busy, budgeted = true }: CompanionScoreSlotProps) {
  const hidden = useMascotsHidden();
  const [closed, setClosed] = useState(false);
  // Comfort and the high five play as a short duet SCENE when the shared guard allows one (decided
  // once per result); otherwise the solo poses (Ziggy first, then Byte in the same slot).
  const [scene] = useState(() => canShowScene({ busy }));
  if (hidden || closed || !inGuideArm(uid)) return null;
  const m = companionScoreMoment(pct, previousPct);
  if (!m) return null;
  const id: CompanionMomentId = m.moment;
  if (scene) {
    return (
      <Staged id={`score-${id}`} priority={COMPANION_PRIORITY[id]} budgeted={budgeted}>
        <LazyDuetCard
          moment={m.moment}
          vars={m.moment === "improve" ? { from: m.from, to: m.to } : undefined}
          ctaTo={m.moment === "lowScore" ? fixTo ?? null : null}
          onShown={() => markSceneShown(m.moment === "improve" ? "highfive" : "comfort")}
          onClose={() => setClosed(true)}
        />
      </Staged>
    );
  }
  return (
    <Staged id={`score-${id}`} priority={COMPANION_PRIORITY[id]} budgeted={budgeted}>
      {m.moment === "improve" ? (
        <LazyCompanionCard moment="improve" vars={{ from: m.from, to: m.to }} onClose={() => setClosed(true)} />
      ) : (
        <LazyCompanionCard moment="lowScore" ctaTo={fixTo ?? null} onClose={() => setClosed(true)} />
      )}
    </Staged>
  );
}

/* ── 2 — for GUIDE-PAGES-1's slot on the Chapter Test / Full Mock entry pages ─────────────────── */

export interface CompanionBreatheProps {
  uid: string | null | undefined;
  /** Mount once per test start; called when skipped or after 10 s. The test never waits on it. */
  onDone?: () => void;
}

export function CompanionBreathe({ uid, onDone }: CompanionBreatheProps) {
  const hidden = useMascotsHidden();
  const [done, setDone] = useState(false);
  // Once per session - decided at mount, so finishing it never makes it vanish mid-way.
  const [again] = useState(() => shownThisSession("companion:breathe"));
  const [hiddenAtMount] = useState(() => mascotsHidden());
  const key = useAppearance(!hidden && !hiddenAtMount && !done && !again && inGuideArm(uid) ? "companion:breathe" : null, APPEARANCE_PRIORITY.companion);
  if (!key) return null;
  const finish: BreatheCardProps["onDone"] = () => {
    setDone(true);
    onDone?.();
  };
  // IN FLOW, and its height is reserved from the first paint (companionDoor.css), so the Start row below
  // never moves while the chunk loads; the card collapses only on the student's own Skip / Done tap.
  return (
    <div className="lt-cmp-pretest" data-testid="guide-pretest-slot">
      <div className="lt-cmp-pretest__in">
        <Suspense fallback={null}>
          <LazyBreatheCard onDone={finish} />
          <NoteShown kind={key} />
        </Suspense>
      </div>
    </div>
  );
}

/**
 * MOMENTS-3 - the pre-test breathe, through the reserved slot (pages/preTestSlot.tsx): Chapter Test and
 * Full Mock ENTRY screens only (the slot is rendered before the Start row, never during a test). It is
 * optional (Skip), never blocks, delays or changes Start, shows once per session, and the director counts it.
 * Eligibility is decided SYNCHRONOUSLY from what is already in memory (auth context uid, the session
 * flag, hidden mascots, the saved-test signal), never after an async read. It stays out of the way of:
 *   - a RESUME screen (a saved test in progress: lib/papers/resumablePaper isResumingSavedPaper);
 *   - the page's own first-visit helper (one character at a time: the helper owns the first visit).
 */
export function PreTestBreathe({ surface }: PreTestMomentProps) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const uid = user?.uid || null;
  // Decided ONCE, at mount: a later re-render (a marker written, the session resolving) must never insert
  // the card above Start. It can only stay eligible or stay out; it never flips to true afterwards.
  const [eligible] = useState(() => !!uid && guideAbActive() && !isResumingSavedPaper(pathname, uid) && !firstVisitHelperPending(surface));
  if (!eligible || !uid) return null;
  return <CompanionBreathe uid={uid} />;
}

/** The page helper for this entry screen has not auto-opened on this device yet: it owns the first visit. */
/** pages/pageGuides.tsx PAGE_GUIDE_SEEN_PREFIX (not imported: that door is not in the entry chunk; a test pins the two equal). */
export const PAGE_GUIDE_SEEN = "lazytopper.pageGuideSeen.";

function firstVisitHelperPending(surface: PreTestMomentProps["surface"]): boolean {
  try {
    return window.localStorage.getItem(`${PAGE_GUIDE_SEEN}${surface === "full_mock" ? "fm_entry" : "ct_entry"}.page`) !== "1";
  } catch {
    return false;
  }
}
registerPreTestMoment(PreTestBreathe);
