/**
 * COMPANION-1 — THE EAGER HALF: who sees a companion moment, and the lazy door. It holds no copy and
 * no drawing — every line, the rig and the CSS live in ./companionChunk.tsx (its own chunk, fetched
 * only when a moment is about to show). Decisions are ./companionModel.ts (pure).
 *
 * WHO SEES ONE: a signed-in student in the GUIDE arm (`resolveGuideVariant(uid) === "guide"`, the
 * admin preview included — it relaxes the once-only markers and silences analytics). "Hide mascots"
 * → nothing, anywhere. Reduced motion → the chunk draws the final frame, still.
 * The A/B split is OFF in test mode, so every existing page suite renders exactly today's page and
 * no door below reads the clock unless a test turns the split on.
 *
 * THE DOORS
 *   CompanionHome       — Home (mobile + desktop): 4 milestones · 5 welcome back · 7 rhythm · 8 countdown.
 *   CompanionNightDoor  — 6 late night, on any signed-in page (mounted ONCE, by the app-wide
 *                         CommandPalette, which App renders on every signed-in route).
 *   CompanionScoreSlot  — 1 low score · 3 improvement: EXPORTED for GUIDE-SCORE-1 (owner of the
 *                         scorecard's mascot line) to mount; not mounted by this lane.
 *   CompanionBreathe    — 2 breathe before a Chapter Test / Full Mock: EXPORTED for GUIDE-PAGES-1's
 *                         mount slot on those entry pages; not mounted by this lane.
 */
import { lazy, Suspense, useEffect, useState, useSyncExternalStore, type ComponentType, type ReactNode } from "react";
import { loadLocalSessionRecords } from "../../../services/sessionRecords";
import { getAttempts, type PracticeAttempt } from "../../../services/practiceInsights";
import { guideAbActive, guideFocusOpen, resolveGuideVariant, subscribeGuideFocus } from "../guideVariant";
import { useMascotsHidden } from "../mascotsMute";
import {
  COMPANION_PRIORITY,
  claimStage,
  companionScoreMoment,
  countdownDue,
  daysToBoards,
  lateNightDue,
  marksFor,
  nightKey,
  otherMascotOnScreen,
  pickHomeMoment,
  previousSeen,
  readMarks,
  releaseStage,
  sessionStartMs,
  stageHolder,
  subscribeStage,
  writeMarks,
  type CompanionMomentId,
  type HomePick,
} from "./companionModel";
import type { BreatheCardProps, CompanionCardProps } from "./companionChunk";
import { canShowScene, markSceneShown } from "../sceneGuard";

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

/** How often a shown card re-checks that no other mascot came onto the page (cheap; no observer). */
export const OTHER_MASCOT_POLL_MS = 1000;

/**
 * The one place a companion card is drawn. It asks for the stage at its priority and draws ONLY
 * while it holds it, no focused guide is open, and no other (non-chrome) mascot is on the page.
 */
function Staged({ id, priority, children }: { id: string; priority: number; children: ReactNode }) {
  const holder = useSyncExternalStore(subscribeStage, stageHolder, () => null);
  const focus = useSyncExternalStore(subscribeGuideFocus, guideFocusOpen, () => false);
  const [blocked, setBlocked] = useState(() => otherMascotOnScreen());
  useEffect(() => {
    claimStage(id, priority);
    return () => releaseStage(id);
  }, [id, priority]);
  useEffect(() => {
    const t = window.setInterval(() => setBlocked(otherMascotOnScreen()), OTHER_MASCOT_POLL_MS);
    return () => window.clearInterval(t);
  }, []);
  if (holder !== id || focus || blocked) return null;
  return <Suspense fallback={null}>{children}</Suspense>;
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

type HomeShow = HomePick | { moment: "countdown"; days: number };

export function CompanionHome({ uid, startHereUp, returnTo = "/" }: CompanionHomeProps) {
  const hidden = useMascotsHidden();
  if (hidden || startHereUp || !inGuideArm(uid)) return null;
  return <CompanionHomeInner uid={uid} returnTo={returnTo} />;
}

function CompanionHomeInner({ uid, returnTo }: { uid: string; returnTo: "/" | "/browse" }) {
  const [show, setShow] = useState<HomeShow | null>(null);
  const [closed, setClosed] = useState(false);
  // A milestone may play as a short duet SCENE (Byte cheering beside Ziggy and his badge) when the
  // shared guard allows one; decided once, so the card never flips between solo and duet.
  const [scene] = useState(() => canShowScene());

  useEffect(() => {
    let live = true;
    const now = Date.now();
    const prevSeen = previousSeen(uid, now);
    const records = loadLocalSessionRecords(uid);
    const attempts = safeAttempts();
    // A brand-new account has nothing to celebrate or miss yet (Start-here is its guide).
    if (records.length === 0 && attempts.length === 0) return undefined;
    const marks = marksFor(uid);
    const pick = pickHomeMoment({
      now,
      facts: { records, gradedAnswers: attempts.filter((a) => a.mode === "graded").length },
      attemptTimes: attempts.map((a) => a.timestamp),
      prevSeen,
      marks,
      returnTo,
    });
    if (pick) {
      setShow(pick);
      return undefined;
    }
    // 8 — weekly, and ONLY from an OFFICIAL date (the server's CBSE read or an admin-confirmed date).
    // The predicted date is never counted down to: no date → no moment.
    if (!countdownDue({ now, lastCountdownAt: marks.c })) return undefined;
    void import("../../../services/cbseExamDate")
      .then((m) => m.fetchCbseExamDate("10"))
      .then((r) => {
        if (!live || !r || r.source !== "official") return;
        const days = daysToBoards(Date.now(), r.examDate);
        if (days !== null) setShow({ moment: "countdown", days });
      })
      .catch(() => {
        /* no date → no moment */
      });
    return () => {
      live = false;
    };
  }, [uid, returnTo]);

  if (!show || closed) return null;
  const close = () => setClosed(true);
  const spend = (): void => {
    const at = Date.now();
    if (show.moment === "milestone") writeMarks(uid, { m: Array.from(new Set([...readMarks(uid).m, ...show.mark])) });
    else if (show.moment === "welcomeBack") writeMarks(uid, { wb: show.ref });
    else if (show.moment === "rhythm") writeMarks(uid, { r: at });
    else writeMarks(uid, { c: at });
  };
  if (show.moment === "milestone" && scene) {
    return (
      <Staged id="home-milestone" priority={COMPANION_PRIORITY.milestone}>
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
    <Staged id={`home-${show.moment}`} priority={COMPANION_PRIORITY[show.moment]}>
      <LazyCompanionCard {...card} />
    </Staged>
  );
}

/* ── 6 — late night, on any signed-in page ─────────────────────────────────────────────────────── */

/** Never during a timed paper: the note waits until the student is off these pages. */
export const LATE_NIGHT_QUIET_PATHS: readonly RegExp[] = [/^\/chapter-test\//, /^\/full-mock\//, /^\/mock-paper\//];
/** How often the late-night rule is re-checked while a page is open. */
export const LATE_NIGHT_CHECK_MS = 60_000;

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

/** Mounted ONCE for the whole app. Renders nothing at all unless the guide split is live. */
export function CompanionNightDoor() {
  if (!guideAbActive()) return null;
  return <CompanionNight />;
}

function CompanionNight() {
  const uid = useSignedInUid();
  const hidden = useMascotsHidden();
  const [due, setDue] = useState(false);
  const [closed, setClosed] = useState(false);
  const guide = inGuideArm(uid);

  useEffect(() => {
    if (!guide || !uid) return undefined;
    const check = () => {
      const now = Date.now();
      previousSeen(uid, now); // records this visit (the welcome-back rule reads it)
      const sessionStart = sessionStartMs(now);
      const path = typeof window !== "undefined" ? window.location.pathname : "";
      if (LATE_NIGHT_QUIET_PATHS.some((re) => re.test(path))) return;
      // Sticky once due: the note stays until the student closes it.
      if (lateNightDue({ now, sessionStart, lastNight: marksFor(uid).n })) setDue(true);
    };
    check();
    const t = window.setInterval(check, LATE_NIGHT_CHECK_MS);
    return () => window.clearInterval(t);
  }, [guide, uid]);

  if (!guide || !uid || !due || closed || hidden) return null;
  return (
    <Staged id="lateNight" priority={COMPANION_PRIORITY.lateNight}>
      <LazyCompanionCard moment="lateNight" fixed onShown={() => writeMarks(uid, { n: nightKey(Date.now()) })} onClose={() => setClosed(true)} />
    </Staged>
  );
}

/* ── 1 & 3 — for GUIDE-SCORE-1 to mount on the scorecard ──────────────────────────────────────── */

export interface CompanionScoreSlotProps {
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

export function CompanionScoreSlot({ uid, pct, previousPct, fixTo, busy }: CompanionScoreSlotProps) {
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
      <Staged id={`score-${id}`} priority={COMPANION_PRIORITY[id]}>
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
    <Staged id={`score-${id}`} priority={COMPANION_PRIORITY[id]}>
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
  if (hidden || done || !inGuideArm(uid)) return null;
  const finish: BreatheCardProps["onDone"] = () => {
    setDone(true);
    onDone?.();
  };
  return (
    <Staged id="breathe" priority={COMPANION_PRIORITY.breathe}>
      <LazyBreatheCard onDone={finish} />
    </Staged>
  );
}
