/**
 * MOMENTS-1 — Byte & Ziggy moments before and around a student's first graded result (owner
 * approval, 22 Oct 2026). THIS FILE IS THE EAGER HALF: who sees a moment and the lazy door. It
 * holds no copy and no drawing — every line, the rig and the CSS live in ./momentsChunk.tsx, which
 * Vite emits as its own `momentsChunk-<hash>.js`, fetched only when a moment is about to show. The
 * control arm never downloads it.
 *
 * WHO SEES A MOMENT
 *   signed-in moments (M3–M6, M8) — only the GUIDE arm (`resolveGuideVariant(uid) === "guide"`,
 *     the admin preview included). The control arm renders exactly today's product.
 *   first-session moments (M2–M5) — and only while the account has ZERO graded results on the
 *     SERVER's answer: `useZeroGraded(uid, { serverOnly: true })` read by the host page (local rows,
 *     then the cloud; a failed read stays "loading", so nothing shows and nothing is retracted). An
 *     admin preview relaxes the zero-graded rule exactly as it does for the Start-here card.
 *   problem moments (M6, M8) — every time, guide arm only.
 *   signed-out moments (M9, M10) — the public peek's arm rule (./public/publicPeekModel.ts): the
 *     previewed arm under an admin preview, else this DEVICE's arm (`ensurePublicArm`, drawn once).
 *   Hidden mascots ("Hide mascots", ../mascotsMute.ts) → nothing is drawn, on any of them.
 *   prefers-reduced-motion → the chunk shows the moment's FINAL frame, still.
 *
 * Display only: nothing here reads or changes a grade, a mark, a prompt or a mistake type.
 */
import { lazy, Suspense, useEffect, useState, useSyncExternalStore, type ComponentType } from "react";
import { trackGuidePublicArmAssigned, type GuideMomentId, type GuideVariant } from "../../../analytics/analytics";
import { VISIT_SOURCE_KEY } from "../../../analytics/visitSource";
import type { ZeroGraded } from "../../startHere/zeroGraded";
import { guideAbActive, guideAccountTag, guideArmReportsOn, guidePreviewActive, resolveGuideVariant } from "../guideVariant";
import { mascotsHidden, useMascotsHidden } from "../mascotsMute";
import { useWrittenGraded } from "./writtenGraded";
import { useHoldStage } from "../scoreGuideStage";
import { copyArmToIntent, ensurePublicArm, previewArm, previewOn } from "../public/publicPeekModel";
import type { GuideMomentProps, SolutionsPeekProps } from "./momentsChunk";
import { APPEARANCE_PRIORITY, NoteShown, newOccurrence, useAppearance } from "../mascotBudget";

export type { GuideMomentId };

type Chunk = typeof import("./momentsChunk");
const load = (): Promise<Chunk> => import("./momentsChunk");

/** One named export of the chunk, as a lazy component; a failed load renders nothing. */
function lazyPart<P extends object>(pick: (m: Chunk) => ComponentType<P>) {
  const Nothing: ComponentType<P> = () => null;
  return lazy(() => load().then((m) => ({ default: pick(m) }), () => ({ default: Nothing })));
}

const LazyGuideMoment = lazyPart((m) => m.GuideMoment);
const LazySolutionsPeek = lazyPart((m) => m.SolutionsPeek);

/* ── who sees a signed-in moment ──────────────────────────────────────────────────────────── */

/** The signed-in account is in the GUIDE arm (admin preview included); false when signed out / split off. */
export function inGuideArm(uid: string | null | undefined): boolean {
  return resolveGuideVariant(uid) === "guide";
}

/**
 * A first-session moment's audience: guide arm AND zero graded results (the host page's own
 * `useZeroGraded` read — "loading" is NOT zero). An admin preview relaxes only the zero-graded rule.
 */
export function firstSessionAudience(uid: string | null | undefined, graded: ZeroGraded): boolean {
  if (!inGuideArm(uid)) return false;
  return graded === "none" || guidePreviewActive();
}

/* ── the slot a page renders ──────────────────────────────────────────────────────────────── */

/** The moment (its id and step, see ./momentsChunk.tsx) plus the host's audience rule (one of the
 *  helpers above). `show` false → nothing, not even the chunk. */
export type GuideMomentSlotProps = GuideMomentProps & { show: boolean };

/**
 * Where a moment appears on a page. Renders nothing unless `show` and the mascots are not hidden;
 * then the lazy chunk draws it (a failed chunk load renders nothing — never breaks the page).
 */
export function GuideMomentSlot(props: GuideMomentSlotProps) {
  const hidden = useMascotsHidden();
  // MOMENTS-3 — the director: a moment is an UNPROMPTED appearance (at most 3 per session).
  const kind = momentKind(props.moment);
  // A host keeps the slot mounted and toggles `show`: each false -> true is a NEW occurrence (so a
  // second grading counts again). Derived state, so a StrictMode double render still counts once.
  const [gen, setGen] = useState(() => ({ n: newOccurrence(), on: props.show }));
  if (gen.on !== props.show) setGen({ n: props.show ? newOccurrence() : gen.n, on: props.show });
  const allowed = useAppearance(props.show && !hidden ? kind : null, APPEARANCE_PRIORITY.explainer, String(gen.n));
  if (!props.show || hidden) return null;
  // Refused: no mascot - but a line that carries needed information still shows, as plain text.
  if (!allowed) return PLAIN_MOMENTS.has(props.moment) ? <PlainDraw moment={props.moment} step={props.step} /> : null;
  return <MomentDraw {...props} kind={allowed} />;
}

/** The moments whose line carries information the student needs (waiting, unreadable, dropped connection). */
const PLAIN_MOMENTS: ReadonlySet<string> = new Set(["m5", "m6", "m8"]);
const LazyPlainMoment = lazyPart((m) => m.PlainMoment);
function PlainDraw(p: { moment: string; step: string }) {
  return (
    <Suspense fallback={null}>
      <LazyPlainMoment moment={p.moment as never} step={p.step as never} />
    </Suspense>
  );
}

/** The budget kind of a moment (a step change, e.g. M3's swap, is the same appearance). */
export function momentKind(moment: string): string {
  return `moment:${moment}`;
}

/** Draws the moment (no budget decision of its own) and spends the slot once it is on screen. */
function MomentDraw(props: GuideMomentSlotProps & { kind: string }) {
  const which = { moment: props.moment, step: props.step, onCta: props.onCta } as GuideMomentProps;
  return (
    <Suspense fallback={null}>
      <LazyGuideMoment {...which} />
      <NoteShown kind={props.kind} />
    </Suspense>
  );
}

/* ── M11 — the "first written answer" nudge on an MCQ-only Quick Practice scorecard ──────────── */

/** localStorage `lazytopper.m11Shown.<tag>` = "1" once the nudge showed for this account on this
 *  device (<tag> = 8-hex hash of the uid, never the uid) — the FIRST MCQ-only result only. */
export const M11_SHOWN_PREFIX = "lazytopper.m11Shown.";
const m11ShownThisLoad = new Set<string>();

function claimM11(uid: string): boolean {
  if (guidePreviewActive()) return true; // PREVIEW-1: every time, no marker read or written
  const key = M11_SHOWN_PREFIX + guideAccountTag(uid);
  if (m11ShownThisLoad.has(key)) return false;
  try {
    if (window.localStorage.getItem(key) === "1") return false;
    window.localStorage.setItem(key, "1");
  } catch {
    /* blocked storage: this page load only */
  }
  m11ShownThisLoad.add(key);
  return true;
}

export function __resetM11ForTests(): void {
  m11ShownThisLoad.clear();
}

/**
 * M11 — on the MCQ-only (tap-only) Quick Practice / Start-here scorecard, right after the result:
 * a signed-in GUIDE-arm student who has answered at least one MCQ, whose account has NEVER had a
 * written answer graded on the SERVER's answer (./writtenGraded.ts; nothing while it is loading or
 * if the read fails), once per account per device. Respects "Hide mascots" (no claim while hidden).
 * The host renders it ONLY on the MCQ-only scorecard — never on a written / Check & Improve result.
 */
export function M11Nudge({
  uid,
  mcqAnswered,
  onOpenWorking,
}: {
  uid: string | null | undefined;
  mcqAnswered: number;
  /** GUIDE-SCORE-2 — the host's in-page "open the working box" action (no action → no button). */
  onOpenWorking?: (() => void) | null;
}) {
  const eligible = !!uid && mcqAnswered > 0 && inGuideArm(uid);
  const written = useWrittenGraded(eligible ? uid : null);
  const hidden = useMascotsHidden();
  const [claimed, setClaimed] = useState(false);
  useEffect(() => {
    if (!eligible || !uid || written !== "none" || claimed || mascotsHidden()) return;
    if (claimM11(uid)) setClaimed(true);
    // claimed once per mount
  }, [eligible, uid, written, claimed, hidden]);
  const show = eligible && written === "none" && claimed;
  // MOMENTS-3 — the director decides FIRST: a refused nudge draws nothing and must not take the
  // scorecard's stage either.
  const allowed = useAppearance(show && !hidden ? momentKind("m11") : null, APPEARANCE_PRIORITY.explainer);
  const draws = show && !hidden && !!allowed;
  // GUIDE-SCORE-1 — while Byte's nudge shows, it owns the scorecard: the scorecard's own
  // character slot yields (never two characters on screen at once).
  useHoldStage("m11", draws);
  return allowed && draws ? <MomentDraw show moment="m11" step="nudge" onCta={onOpenWorking} kind={allowed} /> : null;
}

/* ── M6 — "We couldn't read any answers" ──────────────────────────────────────────────────── */

/** The scorecard's own all-pending title for an unreadable paper (scorecardVariants.allPendingMessage;
 *  pinned equal by moments.test.tsx). The mismatch and not-graded titles are NOT this moment. */
export const UNREAD_ALL_TITLE = "We couldn\u2019t read any answers";

export function isUnreadAllPending(allPending: { title: string } | null | undefined): boolean {
  return !!allPending && allPending.title === UNREAD_ALL_TITLE;
}

/* ── signed-out moments: the public peek's arm rule ───────────────────────────────────────── */

/** The signed-in, non-anonymous uid once Firebase has restored the session, else null. */
async function currentUid(): Promise<string | null> {
  try {
    const { authClient } = await import("../../../services/firebaseClient");
    if (!authClient) return null;
    const ready = (authClient as { authStateReady?: () => Promise<void> }).authStateReady;
    if (typeof ready === "function") {
      await Promise.race([ready.call(authClient), new Promise((r) => setTimeout(r, 3000))]);
    }
    const u = authClient.currentUser;
    if (!u || u.isAnonymous || typeof u.uid !== "string" || !u.uid) return null;
    return u.uid;
  } catch {
    return null;
  }
}

/**
 * The arm of a SIGNED-OUT visitor, by the public peek's rule (publicPeekModel.ts): under an admin
 * preview the previewed arm (no device arm drawn or written); otherwise this DEVICE's arm —
 * "guide" on every device since GUIDE-ALL-1 (22 Oct 2026; no random draw, no arm report) —
 * copied into this tab's guide-intent record, exactly as the peek does. Null → no arm (nothing shows).
 */
export function publicMomentArm(): GuideVariant | null {
  if (!guideAbActive()) return null;
  if (previewOn()) return previewArm();
  const a = ensurePublicArm();
  if (!a) return null;
  copyArmToIntent(a.arm);
  // GUIDE-ALL-1 (22 Oct 2026): the A/B ended — the device arm is no longer reported.
  if (a.fresh && guideArmReportsOn()) trackGuidePublicArmAssigned(a.arm);
  return a.arm;
}

/**
 * A signed-out moment's audience, decided ONCE when `enabled` turns true: signed out (the page's
 * own knowledge, or Firebase's restored session) and the device's public arm is "guide".
 * `knownSignedOut` skips the auth wait (Check & Improve's free mode is signed out by construction).
 */
export function usePublicMomentAudience(enabled: boolean, knownSignedOut = false): boolean {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!enabled || !guideAbActive()) return;
    let live = true;
    void (async () => {
      const uid = knownSignedOut ? null : await currentUid();
      if (!live || uid) return; // a signed-in reader: these are signed-out moments only
      if (publicMomentArm() === "guide") setShow(true);
    })();
    return () => {
      live = false;
    };
  }, [enabled, knownSignedOut]);
  return enabled && show;
}

/* ── M9 — a page opened from a shared link ────────────────────────────────────────────────── */

/**
 * The visit came from a SHARED link: `utm_source=parent_share` (the parent's WhatsApp link,
 * ForParentsPage PARENT_SHARE_URL — SOURCE-2 reads it as "Parent share") or `utm_medium=share`
 * (the scorecard share link). Read from this URL, else from this tab's captured visit source
 * (analytics/visitSource.ts) — so a hop inside the site keeps the answer.
 */
export function cameFromSharedLink(search: string): boolean {
  const shared = (src: string | null | undefined, medium: string | null | undefined) =>
    (src ?? "").toLowerCase() === "parent_share" || (medium ?? "").toLowerCase() === "share";
  try {
    const p = new URLSearchParams(search || "");
    if (shared(p.get("utm_source"), p.get("utm_medium"))) return true;
  } catch {
    /* a malformed query: fall through to the captured source */
  }
  try {
    const raw = window.sessionStorage.getItem(VISIT_SOURCE_KEY);
    if (!raw) return false;
    const v = JSON.parse(raw) as { utm_source?: string | null; utm_medium?: string | null } | null;
    return !!v && shared(v.utm_source, v.utm_medium);
  } catch {
    return false;
  }
}

/* ── M10 — the NCERT solutions page ───────────────────────────────────────────────────────── */

let solutionMatched = false;
const matchListeners = new Set<() => void>();

/** A question's "Check" on the solutions page said the student's answer MATCHES (verdict right). */
export function noteSolutionMatched(): void {
  if (solutionMatched) return;
  solutionMatched = true;
  for (const l of matchListeners) l();
}

function subscribeMatched(l: () => void): () => void {
  matchListeners.add(l);
  return () => {
    matchListeners.delete(l);
  };
}

export function __resetSolutionMatchedForTests(): void {
  solutionMatched = false;
}

/**
 * M10 — mounted ONCE by the solutions page. Nothing until a check MATCHED; then, for a signed-out
 * visitor in the public guide arm (and only when the page's "first check free" is true —
 * `freeCheckOn`), Byte peeks in the corner. Closed with its ×, he stays away for this page load.
 */
export function SolutionsMoment({ freeCheckOn }: { freeCheckOn: boolean }) {
  const matched = useSyncExternalStore(subscribeMatched, () => solutionMatched, () => false);
  const show = usePublicMomentAudience(matched && freeCheckOn);
  const hidden = useMascotsHidden();
  const [closed, setClosed] = useState(false);
  const allowed = useAppearance(show && !hidden && !closed ? momentKind("m10") : null, APPEARANCE_PRIORITY.explainer);
  if (!show || hidden || closed || !allowed) return null;
  return (
    <Suspense fallback={null}>
      <LazySolutionsPeek onClose={() => setClosed(true)} />
      <NoteShown kind={allowed} />
    </Suspense>
  );
}

export type { SolutionsPeekProps };
