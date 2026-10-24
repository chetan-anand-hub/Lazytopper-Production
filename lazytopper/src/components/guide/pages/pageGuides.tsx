/**
 * GUIDE-PAGES-1 — Byte where a student needs help (owner ruling, 22 Oct 2026 23:32 IST: "wherever a
 * student needs help, Byte and/or Ziggy should be there"). THIS FILE IS THE EAGER HALF, exactly the
 * MOMENTS-1 split (../moments/moments.tsx): who sees a helper, the "?" door and the device marker.
 * No drawing lives here — the rig, the entry/Exam Trends copy and their CSS are in ./pageGuidesChunk.tsx,
 * which Vite emits as its own `pageGuidesChunk-<hash>.js`, fetched only when a helper is about to show.
 * The one exception is M7's two short lines (./m7Copy.ts), eager so the limit panel never grows late.
 *
 *   LimitByte  (m7)          — Byte inside the fair-use LIMIT panel (what was hit + what still works)
 *                              and AFTER the trial-day dialog's actions (one companion line).
 *                              Words render with the panel; Byte's drawing fills a fixed box.
 *   PageGuide  (ws_entry,    — a small "?" on the entry page. On this DEVICE's first visit the helper
 *               ct_entry,      opens once by itself; after that only the "?" opens it. It is a FIXED
 *               fm_entry,      card (portalled, bottom-left — the M10 peek's place), so opening it never
 *               trends_help)   moves the page; the "?" itself sits in an existing row or corner.
 *
 * WHO SEES IT — the signed-in GUIDE arm only (`inGuideArm`, the admin preview included), the same
 * rule as every signed-in moment. A host that already holds the signed-in uid (Chapter Test, Full
 * Mock, Worksheet: `useAuth`) passes it; the others (the limit panel, Exam Trends, the Practice Hub
 * chooser) read Firebase's own session here (`useGuideUid`), so no host gains an auth dependency.
 *   "Hide mascots" (../mascotsMute.ts) → nothing at all, not even the "?".
 *   prefers-reduced-motion → the chunk draws Byte's still pose and no pop animation.
 *   Admin preview (PREVIEW-1) → an "Admin preview" pill; the first-visit marker is neither read nor
 *     written (it opens every visit); analytics are dropped by `trackGuideEvent`.
 *
 * Display only: nothing here reads or changes a grade, a mark, a prompt, a mistake type, a limit,
 * a payment or an entitlement. The limit panel's own data is passed in; Byte only restates it.
 */
import { lazy, Suspense, useEffect, useRef, useState, useSyncExternalStore, type ComponentType } from "react";
import type { GuideMomentId } from "../../../analytics/analytics";
import type { LimitState } from "../../usage/fairUseGate";
import { guideAbActive, guidePreviewActive, resolveGuideVariant, trackGuideEvent } from "../guideVariant";
import { mascotsHidden, useMascotsHidden } from "../mascotsMute";
import { MASCOTS_TOAST_COPY, hideMascotsWithUndo } from "../moments/mascotsToast";
import { M7_COPY, m7DialogLine, m7Lines } from "./m7Copy";
import {
  APPEARANCE_PRIORITY,
  NoteShown,
  appearanceHeld,
  budgetVersion,
  newOccurrence,
  releaseAppearance,
  requestAppearance,
  subscribeBudget,
  useAppearance,
} from "../mascotBudget";
import type { PageGuideId, PageGuidePopProps, PageGuideStep } from "./pageGuidesChunk";
import "./pageGuidesDoor.css";

export type { PageGuideId, PageGuideStep };

type Chunk = typeof import("./pageGuidesChunk");
const load = (): Promise<Chunk> => import("./pageGuidesChunk");

/** One named export of the chunk, as a lazy component; a failed load renders nothing. */
function lazyPart<P extends object>(pick: (m: Chunk) => ComponentType<P>) {
  const Nothing: ComponentType<P> = () => null;
  return lazy(() => load().then((m) => ({ default: pick(m) }), () => ({ default: Nothing })));
}

const LazyPageGuidePop = lazyPart((m) => m.PageGuidePop);
const LazyM7Character = lazyPart((m) => m.M7Character);

/** moments.tsx's `inGuideArm`, restated here so this tiny door does not pull the moments module
 *  (and its readers) into every page that renders a limit panel. Pinned equal by the tests. */
export function inGuideArm(uid: string | null | undefined): boolean {
  return resolveGuideVariant(uid) === "guide";
}

/* ── the signed-in uid, from Firebase's own session (no AuthContext dependency) ───────────── */

interface AuthUserLike {
  uid?: unknown;
  isAnonymous?: boolean;
}
interface AuthLike {
  currentUser: AuthUserLike | null;
  onAuthStateChanged?: (cb: (u: AuthUserLike | null) => void) => unknown;
}

/** `resolved` false until Firebase answered once (or could not be read). */
interface UidState {
  resolved: boolean;
  uid: string | null;
}

let uidState: UidState = { resolved: false, uid: null };
let watchStarted = false;
const uidListeners = new Set<() => void>();

function setUid(u: AuthUserLike | null | undefined): void {
  const uid = u && !u.isAnonymous && typeof u.uid === "string" && u.uid ? u.uid : null;
  if (uidState.resolved && uidState.uid === uid) return;
  uidState = { resolved: true, uid };
  for (const l of uidListeners) l();
}

function startAuthWatch(): void {
  if (watchStarted) return;
  watchStarted = true;
  void (async () => {
    try {
      const m = await import("../../../services/firebaseClient");
      const auth = (m as { authClient?: AuthLike | null }).authClient;
      if (!auth) {
        setUid(null);
        return;
      }
      setUid(auth.currentUser);
      if (typeof auth.onAuthStateChanged === "function") auth.onAuthStateChanged.call(auth, (u) => setUid(u));
    } catch {
      setUid(null); // no auth client (or a test double without one): nobody is signed in here
    }
  })();
}

function subscribeUid(l: () => void): () => void {
  uidListeners.add(l);
  startAuthWatch();
  return () => {
    uidListeners.delete(l);
  };
}

/** A reader that is switched off (split off, mascots hidden, host passed the uid) never starts the watch. */
function subscribeIdle(l: () => void): () => void {
  uidListeners.add(l);
  return () => {
    uidListeners.delete(l);
  };
}

const readUid = () => uidState;

/**
 * The signed-in (non-anonymous) uid per Firebase, `undefined` while it is still being read.
 * `enabled` false → Firebase is never touched by this reader (no dynamic import, no listener).
 */
export function useGuideUid(enabled = true): string | null | undefined {
  const s = useSyncExternalStore(enabled ? subscribeUid : subscribeIdle, readUid, readUid);
  return s.resolved ? s.uid : undefined;
}

export function __resetGuideUidForTests(): void {
  uidState = { resolved: false, uid: null };
  watchStarted = false;
  uidListeners.clear();
}

/* ── the first-visit marker (per DEVICE, per helper) ──────────────────────────────────────── */

/** localStorage `lazytopper.pageGuideSeen.<id>.<step>` = "1" once that helper opened by itself on
 *  this device. A device key (never the uid); "?" still opens it any time. */
export const PAGE_GUIDE_SEEN_PREFIX = "lazytopper.pageGuideSeen.";
const seenThisLoad = new Set<string>();

/** True the FIRST time on this device (and claims it); under an admin preview, every time. */
export function claimFirstVisit(id: PageGuideId, step: PageGuideStep): boolean {
  if (guidePreviewActive()) return true; // PREVIEW-1: every visit, no marker read or written
  const key = `${PAGE_GUIDE_SEEN_PREFIX}${id}.${step}`;
  if (seenThisLoad.has(key)) return false;
  seenThisLoad.add(key);
  try {
    if (window.localStorage.getItem(key) === "1") return false;
    window.localStorage.setItem(key, "1");
  } catch {
    /* blocked storage: this page load only */
  }
  return true;
}

export function __resetPageGuidesForTests(): void {
  seenThisLoad.clear();
}

/* ── the "?" door + the helper card ───────────────────────────────────────────────────────── */

export interface PageGuideProps {
  id: Exclude<PageGuideId, "m7">;
  step: PageGuideStep;
  /**
   * The signed-in uid when the host already knows it (`useAuth`: pass null for signed out or a
   * local session). Omitted → read from Firebase here.
   */
  uid?: string | null;
  /** Where the "?" sits: `end` = the last item of a flex row; `corner` = top-right of a
   *  position:relative box (absolute, so it never moves the box's content); `inline` = in flow. */
  placement?: "end" | "corner" | "inline";
  /** A full-screen route with no sidebar (Chapter Test, Full Mock): the card sits at the left edge. */
  bare?: boolean;
}

export function PageGuide({ id, step, uid, placement = "inline", bare = false }: PageGuideProps) {
  const hidden = useMascotsHidden();
  const own = useGuideUid(uid === undefined && !hidden && guideAbActive());
  const who = uid === undefined ? own : uid;
  const audience = who !== undefined && inGuideArm(who);
  const [open, setOpen] = useState(false);
  // MOMENTS-3 — true only while the card opened BY ITSELF (unprompted: it spends the session budget).
  // A tap on "?" is prompted: never counted, never refused.
  const [byItself, setByItself] = useState(false);
  const claimed = useRef(false);
  const doorRef = useRef<HTMLButtonElement | null>(null);
  const [occurrence] = useState(newOccurrence); // one occurrence per mount (re-renders and StrictMode keep it)
  const autoKind = `pageguide:${id}.${step}#${occurrence}`;
  useSyncExternalStore(subscribeBudget, budgetVersion, () => 0);

  // First visit on this device: opens ONCE by itself (no claim while the mascots are hidden). The
  // director is asked BEFORE the device marker is spent, so a refused open is offered again later.
  useEffect(() => {
    if (!audience || claimed.current || mascotsHidden()) return;
    claimed.current = true;
    if (!requestAppearance(autoKind, APPEARANCE_PRIORITY.explainer)) return;
    if (claimFirstVisit(id, step)) {
      setByItself(true);
      setOpen(true);
    } else {
      releaseAppearance(autoKind);
    }
  }, [audience, id, step, hidden, autoKind]);
  // Hand the reservation back when the door goes away (noteShown has already spent it if it drew).
  useEffect(() => {
    if (!byItself) return undefined;
    return () => releaseAppearance(autoKind);
  }, [byItself, autoKind]);

  if (!audience || hidden) return null;

  const close = () => {
    setOpen(false);
    setByItself(false);
    doorRef.current?.focus();
  };

  return (
    <span className={`lt-pg-door lt-pg-door--${placement}`} data-testid={`page-guide-${id}`} data-step={step}>
      <button
        ref={doorRef}
        type="button"
        className="lt-pg-door__q"
        aria-label="Ask Byte what this page is"
        aria-expanded={open}
        data-testid={`page-guide-${id}-help`}
        onClick={() => {
          if (open) {
            setOpen(false);
            setByItself(false);
            return;
          }
          trackGuideEvent("guide_moment_click", { moment: id as GuideMomentId });
          setByItself(false);
          setOpen(true);
        }}
      >
        ?
      </button>
      {open && (!byItself || appearanceHeld(autoKind)) ? (
        <Suspense fallback={null}>
          <LazyPageGuidePop {...({ id, step, bare, onClose: close } as PageGuidePopProps)} />
          {byItself ? <NoteShown kind={autoKind} /> : null}
        </Suspense>
      ) : null}
    </span>
  );
}

/* ── M7 — Byte on the limit panel ─────────────────────────────────────────────────────────── */

export interface LimitByteProps {
  limit: LimitState;
  /** The panel's own formatted reset time (formatResetIst), "" when the server sent none. */
  when: string;
  /**
   * `inline` (the panel): what was hit + what still works. `dialog` (the trial-day dialog, which
   * already says all of that): ONE companion line (m7DialogLine), AFTER its actions.
   */
  variant?: "inline" | "dialog";
}

/** Stand-in while Firebase's uid is read: a fair-use refusal only reaches a verified signed-in student. */
const PENDING_SIGNED_IN = "pending-signed-in";

/**
 * Inside FairUseLimitPanel. The row and its words are EAGER and render in the SAME commit as the
 * panel; only Byte's drawing is lazy, into a fixed 40×48 box — so nothing grows or jumps when the
 * chunk arrives. A fair-use refusal only ever reaches a verified, signed-in student, so the row draws
 * while Firebase's uid is still being read; it goes if the account resolves signed out, or the arm is
 * forced off (an admin "Show control" preview) — every student is in the guide arm since GUIDE-ALL-1.
 */
export function LimitByte({ limit, when, variant = "inline" }: LimitByteProps) {
  const hidden = useMascotsHidden();
  const active = !hidden && guideAbActive();
  const uid = useGuideUid(active);
  // Since GUIDE-ALL-1 the arm no longer depends on WHICH account (only on a test seam / admin preview
  // / dev override), so while the uid is still being read the arm is resolved for "a signed-in
  // account" — an admin "Show control" preview never flashes Byte; a resolved signed-out → nothing.
  const armOut = !active || !inGuideArm(uid === undefined ? PENDING_SIGNED_IN : uid);
  // MOMENTS-3 — the limit panel's Byte is an unprompted appearance (a first-time explainer); the panel's own
  // words stand when the session's budget is spent.
  const allowed = useAppearance(armOut ? null : "limit-byte", APPEARANCE_PRIORITY.explainer);
  const out = armOut; // refused -> the same lines, as plain text with no character (the budget limits the mascot, not the information)
  const [preview] = useState(() => guidePreviewActive());

  // guide_moment_shown — once per refusal shown (a NEW limit object is a new refusal).
  useEffect(() => {
    if (!out && allowed) trackGuideEvent("guide_moment_shown", { moment: "m7" });
  }, [limit, out, allowed]);

  if (out) return null;
  const lines = m7Lines(limit, when);
  // The dialog already says what was used, when it comes back, what still works and the Premium
  // line — so there Byte says ONE companion line (m7DialogLine) instead of repeating any of it.
  // The inline panel: what was hit + what still works.
  const first = variant === "dialog" ? m7DialogLine(limit) : lines.hit;
  const second = variant === "dialog" ? null : lines.still;
  return (
    <div
      className={`lt-pg-m7 lt-pg-m7--${variant}`}
      data-testid="guide-moment-m7"
      data-variant={variant}
      data-tier={limit.tier}
      data-scope={limit.scope}
      role="group"
      aria-label="Byte"
    >
      {allowed ? (
        <span className="lt-pg-m7__box" aria-hidden="true">
          <Suspense fallback={null}>
            <LazyM7Character />
            <NoteShown kind={allowed} />
          </Suspense>
        </span>
      ) : null}
      <div className="lt-pg-m7__bub">
        {preview ? (
          <span className="lt-pg-m7__admin" data-testid="guide-admin-preview">
            {M7_COPY.adminPreview}
          </span>
        ) : null}
        <p className="lt-pg-m7__say" data-testid={variant === "dialog" ? "guide-m7-dialog" : "guide-m7-hit"}>
          {first}
        </p>
        {second ? (
          <p className="lt-pg-m7__say lt-pg-m7__say--soft" data-testid="guide-m7-still">
            {second}
          </p>
        ) : null}
        <button type="button" className="lt-pg-m7__hide" data-testid="mascots-hide" onClick={hideMascotsWithUndo}>
          {MASCOTS_TOAST_COPY.hide}
        </button>
      </div>
    </div>
  );
}
