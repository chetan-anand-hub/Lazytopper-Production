/**
 * GUIDE-PAGES-1 — Byte where a student needs help (owner ruling, 22 Oct 2026 23:32 IST: "wherever a
 * student needs help, Byte and/or Ziggy should be there"). THIS FILE IS THE EAGER HALF, exactly the
 * MOMENTS-1 split (../moments/moments.tsx): who sees a helper, the "?" door and the device marker.
 * It holds no copy and no drawing — every line, the rig and the CSS live in ./pageGuidesChunk.tsx,
 * which Vite emits as its own `pageGuidesChunk-<hash>.js`, fetched only when a helper is about to show.
 *
 *   LimitByte  (m7)          — Byte inside the fair-use LIMIT panel and the trial-day dialog
 *                              (components/usage/FairUseLimitPanel.tsx). Shown with the panel, every
 *                              time; its slot is RESERVED in the panel (eager CSS) so nothing jumps.
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
const LazyLimitByteBody = lazyPart((m) => m.LimitByteBody);

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
  const claimed = useRef(false);
  const doorRef = useRef<HTMLButtonElement | null>(null);

  // First visit on this device: opens ONCE by itself (no claim while the mascots are hidden).
  useEffect(() => {
    if (!audience || claimed.current || mascotsHidden()) return;
    claimed.current = true;
    if (claimFirstVisit(id, step)) setOpen(true);
  }, [audience, id, step, hidden]);

  if (!audience || hidden) return null;

  const close = () => {
    setOpen(false);
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
            return;
          }
          trackGuideEvent("guide_moment_click", { moment: id as GuideMomentId });
          setOpen(true);
        }}
      >
        ?
      </button>
      {open ? (
        <Suspense fallback={null}>
          <LazyPageGuidePop {...({ id, step, bare, onClose: close } as PageGuidePopProps)} />
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
}

/**
 * Inside FairUseLimitPanel (inline panel and trial-day dialog). The slot is reserved by eager CSS
 * while the uid is read and the chunk loads, so the panel never grows under the student's finger.
 * A signed-in account outside the guide arm (or the split off) → nothing, not even the slot.
 */
export function LimitByte({ limit, when }: LimitByteProps) {
  const hidden = useMascotsHidden();
  const active = !hidden && guideAbActive();
  const uid = useGuideUid(active);
  if (!active) return null;
  if (uid !== undefined && !inGuideArm(uid)) return null;
  return (
    <div className="lt-pg-m7slot" data-testid="guide-m7-slot">
      {uid !== undefined ? (
        <Suspense fallback={null}>
          <LazyLimitByteBody limit={limit} when={when} />
        </Suspense>
      ) : null}
    </div>
  );
}
