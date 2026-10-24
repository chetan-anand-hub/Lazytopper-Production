/**
 * CI-SOFT-1 — who sees the "Pick a board question, watch it get marked" card on /check-improve, and
 * which questions it offers. PURE rules plus two tiny storage readers and the hook the page uses.
 * Holds no copy and no drawing: those live in the lazy chunk (./ciDemoChunk.tsx).
 *
 * WHO SEES IT (all must hold)
 *   - not inside the tutor overlay;
 *   - the visit is an ad arrival: the tab's landing record says landing "/check-improve" OR
 *     utm_campaign "yt_students" (the guide's own record first, so it survives sign-up);
 *   - not closed in this tab (sessionStorage `lazytopper.ciDemoClosed` = "1");
 *   - nothing in progress on the page, OR the card is already open (it never vanishes under a student);
 *   - EITHER signed out in free-check mode with the free check still unspent, OR signed in with ZERO
 *     graded results on the SERVER's answer ("loading" is not zero).
 *   Unreadable storage → no card.
 *
 * DISPLAY ONLY: nothing here reads or changes a grade, a mark, a prompt or a mistake type.
 */
import { useEffect, useRef, useState } from "react";
import { readVisitLanding } from "../guide/guideInputs";
import { hasUsedFreeCheck } from "../../services/freeCheckClient";
import { useZeroGraded, type ZeroGraded } from "../startHere/zeroGraded";
import { readSubjectHint } from "../startHere/startHereModel";
import type { DesktopSubject } from "../../lib/desktop/navigation";

export type CiDemoKey = "circ" | "polyConcept" | "elec" | "chem" | "polySilly" | "light";

/** The order "Mark another question" walks. (Here, not in ciDemoSamples: that file ships only in the lazy chunk.) */
export const CI_DEMO_ORDER: readonly CiDemoKey[] = ["circ", "polyConcept", "elec", "chem", "polySilly", "light"];

/** THIS TAB's sessionStorage: "1" once the card was closed (or used for "Check my own answer"). */
export const CI_DEMO_CLOSED_KEY = "lazytopper.ciDemoClosed";

export interface CiDemoAudienceInput {
  overlay: boolean;
  /** The tab's landing record; null = absent or unreadable. */
  visit: { landing: string | null; utmCampaign: string | null } | null;
  /** The tab already closed the card; true also when storage could not be read. */
  closed: boolean;
  inProgress: boolean;
  /** The card is on screen right now. */
  alreadyOpen: boolean;
  who:
    | { kind: "signedOut"; freeMode: boolean; freeCheckUsed: boolean }
    | { kind: "signedIn"; zeroGraded: ZeroGraded };
}

/** An ad arrival: landed on /check-improve, or came from the students YouTube campaign. */
export function isCiAdArrival(visit: CiDemoAudienceInput["visit"]): boolean {
  if (!visit) return false;
  return visit.landing === "/check-improve" || visit.utmCampaign === "yt_students";
}

/** Everything EXCEPT "nothing in progress" — what lets an already-open card stay open. */
export function ciDemoEligible(i: Omit<CiDemoAudienceInput, "inProgress" | "alreadyOpen">): boolean {
  if (i.overlay || i.closed || !isCiAdArrival(i.visit)) return false;
  return i.who.kind === "signedOut"
    ? i.who.freeMode && !i.who.freeCheckUsed
    : i.who.zeroGraded === "none";
}

export function ciDemoAudience(i: CiDemoAudienceInput): boolean {
  if (!ciDemoEligible(i)) return false;
  return !i.inProgress || i.alreadyOpen;
}

/** The three questions offered first, by the landing's subject hint. */
export function trioFor(hint: DesktopSubject | null): readonly [CiDemoKey, CiDemoKey, CiDemoKey] {
  if (hint === "Maths") return ["circ", "polyConcept", "polySilly"];
  if (hint === "Science") return ["elec", "chem", "light"];
  return ["circ", "polyConcept", "elec"];
}

/** "Mark another question": the next of the six not yet watched this visit, wrapping; all watched → the next one. */
export function nextSampleKey(current: CiDemoKey, watched: ReadonlySet<CiDemoKey>): CiDemoKey {
  const n = CI_DEMO_ORDER.length;
  const at = CI_DEMO_ORDER.indexOf(current);
  for (let step = 1; step <= n; step += 1) {
    const k = CI_DEMO_ORDER[(at + step) % n];
    if (k !== current && !watched.has(k)) return k;
  }
  return CI_DEMO_ORDER[(at + 1) % n];
}

/* ── storage ─────────────────────────────────────────────────────────────────────────────── */

/** Closed this tab. Unreadable storage counts as closed: no card rather than a card that cannot stay shut. */
export function readCiDemoClosed(): boolean {
  try {
    return window.sessionStorage.getItem(CI_DEMO_CLOSED_KEY) === "1";
  } catch {
    return true;
  }
}

export function markCiDemoClosed(): void {
  try {
    window.sessionStorage.setItem(CI_DEMO_CLOSED_KEY, "1");
  } catch {
    /* blocked storage: readCiDemoClosed() already says closed, so the card stays shut on reload */
  }
}

export function readCiDemoSubjectHint(): DesktopSubject | null {
  return readSubjectHint();
}

/* ── the hook the page uses ──────────────────────────────────────────────────────────────── */

export interface CiDemoAudienceArgs {
  overlay: boolean;
  /** The signed-in student's uid (a real account, not a local session), else null. */
  uid: string | null;
  /** Signed out and the free-check flag is on. */
  freeMode: boolean;
  inProgress: boolean;
  /** This page has shown a real result, or a real grade has started: the card is done for this tab. */
  resultSeen: boolean;
}

/**
 * `show`: render the card (and NOT Start-here). `close`: the student closed it, or used "Check my own
 * answer" — it stays shut for this tab. The signed-in read is the Start-here card's own
 * (`useZeroGraded(uid, { serverOnly: true })`, shared per uid: no second request), asked ONLY for an ad
 * arrival (anyone else can never see the card). A real result / grade closes the card for the tab, for
 * good: the zero-graded answer is memoised and would otherwise let the latch bring it back.
 */
export function useCiDemoAudience(args: CiDemoAudienceArgs): { show: boolean; close: () => void } {
  const visit = readVisitLanding();
  const adArrival = isCiAdArrival(visit);
  const zeroGraded = useZeroGraded(args.overlay || !adArrival ? null : args.uid, { serverOnly: true });
  const [closed, setClosed] = useState<boolean>(() => readCiDemoClosed());
  const [open, setOpen] = useState(false);
  const who: CiDemoAudienceInput["who"] = args.uid
    ? { kind: "signedIn", zeroGraded }
    : { kind: "signedOut", freeMode: args.freeMode, freeCheckUsed: args.freeMode ? hasUsedFreeCheck() : false };
  const done = closed || args.resultSeen;
  const show = ciDemoAudience({ overlay: args.overlay, visit, closed: done, who, inProgress: args.inProgress, alreadyOpen: open });
  // Derived-state latch: once the card has shown it stays through typing, until closed.
  if (show !== open && (show || closed)) setOpen(show);
  // A real result ends it for this tab (derived state: no effect-driven setState).
  if (args.resultSeen && open && !closed) setClosed(true);
  // The tab remembers it (a ref, not state: a render-phase update above can re-render before this commits).
  const wasShown = useRef(false);
  useEffect(() => {
    if (show) wasShown.current = true;
    else if (args.resultSeen && wasShown.current) markCiDemoClosed();
  }, [show, args.resultSeen]);
  const close = () => {
    markCiDemoClosed();
    setClosed(true);
    setOpen(false);
  };
  return { show, close };
}
