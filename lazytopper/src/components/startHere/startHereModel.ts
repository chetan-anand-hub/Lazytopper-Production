// src/components/startHere/startHereModel.ts
//
// START-HERE-1 — the pure, BANK-FREE half of the "Start here · 2 minutes" card: copy, the
// subject pre-pick, the practice URL, and the card's session/"not now" memory.
//
// ★ BANK-FREE ON PURPOSE. Home, /practice-hub and /check-improve must not reach the question
// bank in their static graph (src/config/bankReach.guard.test.ts). Everything that reads the
// bank — which chapters have CBQ MCQs, the five-question pick — lives in ./startHereBank.ts and
// is loaded with `import()` only when the student opens the picker.

import type { DesktopSubject } from "../../lib/desktop/navigation";

/** The `src` value the card's practice link carries; PracticePage reads it to know the set is a
 *  Start-here set (fires `start_here_graded`, adds the Start-here result actions). */
export const START_HERE_SRC = "start_here";
export const START_HERE_COUNT = 5;

export const START_HERE_COPY = {
  kicker: "Your first 2 minutes",
  body: "Pick a chapter, answer 5 board-style questions, and see exactly where marks slip.",
  start: "Start",
  notNow: "Not now",
} as const;

/**
 * START-HERE-ONE-TAP-1 — the READY state's copy: one button per subject that launches at once.
 * Honest: no counts or promises beyond "5 questions" and the chapter's own name.
 */
export const START_HERE_ONE_TAP_COPY = {
  /** The hinted subject's one button, followed by the pre-selected chapter's name. */
  hinted: "Start 5 questions",
  /** No hint: one button per subject, "<Subject> · 5 questions". */
  perSubjectSuffix: "5 questions",
  /** The secondary text button that reveals the full picker (subject, chapter, type, go). */
  change: "Change chapter or question type",
} as const;

export type StartHereQType = "mcq" | "ar" | "written";
export const START_HERE_QTYPE_LABEL: Record<StartHereQType, string> = {
  mcq: "Quick 5: tap the answer",
  ar: "Assertion–Reason",
  written: "Written: 1 board question (uses 1 of today's checks)",
};

/**
 * START-HERE-WRITTEN - how many questions a Start-here set of this type has. MCQ / A-R: the five
 * of START-HERE-1. Written: ONE Science CBQ short-answer question, typed and graded by Quick
 * Practice's EXISTING written path (/api/grade-worksheet, surface "quick-practice"), so it uses
 * one of the trial's daily checks. Science only: the bank side (startHereBank.ts) counts no
 * written item for Maths, so the type is never offered there.
 */
export const START_HERE_WRITTEN_COUNT = 1;
export function startHereSetSize(qtype: StartHereQType): number {
  return qtype === "written" ? START_HERE_WRITTEN_COUNT : START_HERE_COUNT;
}

/**
 * The Practice page's lower bound for `count`: its usual floor, except a Start-here WRITTEN link
 * (`src=start_here&qt=written`), whose exact set is one question. Without this the page's floor
 * (3) would lift count above the one id, and the exact-set path (focusBankIds covers the count)
 * would not apply. Every other link keeps `fallback` exactly.
 */
export function startHereCountFloor(src: string | null, qt: string | null, fallback: number): number {
  return src === START_HERE_SRC && qt === "written" ? START_HERE_WRITTEN_COUNT : fallback;
}

/* ── the ad's subject hint ─────────────────────────────────────────────────────────────── */

/**
 * ★ WHY A SEPARATE KEY. `lazytopper.visitSource` is deleted the moment sign-up sends it, and its
 * `landing` is path-only (the query is dropped), so by the time Home renders for a brand-new
 * account the landing's `utm_content` and `?cbq=1` are gone. The hint is therefore derived
 * from the landing at capture time (analytics/visitSource.ts) into this one tab-scoped
 * sessionStorage key — one word, "Maths" or "Science", no id, never sent anywhere — and it
 * lives until the tab closes.
 */
export const START_HERE_SUBJECT_HINT_KEY = "lazytopper.startHereSubject";

/** `utm_content` = `cbq_short`, or a landing of `/practice-hub?cbq=1` → Maths; `sci_*` → Science;
 *  anything else → null (the card then asks). */
export function subjectHintFromLanding(utmContent: string | null, search: string): DesktopSubject | null {
  const content = String(utmContent || "").trim().toLowerCase();
  if (content === "cbq_short") return "Maths";
  if (content.indexOf("sci_") === 0) return "Science";
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(search || "");
  } catch {
    return null;
  }
  return params.get("cbq") === "1" && !content.startsWith("sci_") ? "Maths" : null;
}

export function readSubjectHint(): DesktopSubject | null {
  try {
    const raw = window.sessionStorage.getItem(START_HERE_SUBJECT_HINT_KEY);
    return raw === "Maths" || raw === "Science" ? raw : null;
  } catch {
    return null;
  }
}

/* ── "Not now" is session-scoped ───────────────────────────────────────────────────────── */

/** "Not now" hides the card for the rest of this session (tab); it returns on the next visit. */
export const START_HERE_DISMISSED_KEY = "lazytopper.startHereDismissed";

export function isDismissedThisSession(): boolean {
  try {
    return window.sessionStorage.getItem(START_HERE_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissForSession(): void {
  try {
    window.sessionStorage.setItem(START_HERE_DISMISSED_KEY, "1");
  } catch {
    /* blocked storage: the card simply returns on the next render */
  }
}

/* ── the practice URL ──────────────────────────────────────────────────────────────────── */

/**
 * The Quick Practice URL for a Start-here set. The five ids are chosen up front
 * (./startHereBank.ts) and travel as `focusBankIds` + `strictFocus=true` + `count=5` — the
 * exact-set path Quick Practice already serves in the displayed order (CONCEPT-MAP-FILL-1 PR-2,
 * pinned by PracticePage.strictFocusExact.test.tsx), so the page builds no new engine and grades
 * nothing differently. `src=start_here` marks the set; `returnTo` is a fixed internal path.
 */
export function startHerePracticePath(args: {
  subject: DesktopSubject;
  chapter: string;
  ids: readonly string[];
  qtype: StartHereQType;
  returnTo: string;
}): string {
  const sp = new URLSearchParams();
  sp.set("topic", args.chapter);
  sp.set("focusBankIds", args.ids.join(","));
  sp.set("strictFocus", "true");
  sp.set("count", String(startHereSetSize(args.qtype)));
  sp.set("src", START_HERE_SRC);
  sp.set("qt", args.qtype);
  sp.set("backLabel", "Back");
  sp.set("returnTo", args.returnTo);
  return `/practice/10/${args.subject}?${sp.toString()}`;
}

/** Board slug / subject for an analytics param: lower-case, slug-shaped. */
export function analyticsSubject(subject: DesktopSubject): string {
  return subject === "Science" ? "science" : "maths";
}

/* ── QP-SCORECARD-2 E3 — the FOCUSED first-run surface's "Not now" memory ───────────────── */

/**
 * The focused surface (full screen on a phone, a centred overlay on desktop) is offered to the
 * Start-here audience at most TWICE across visits: its first "Not now" closes it for this visit
 * (the inline card stays), the next visit offers it ONCE more, and after a second "Not now" only
 * the inline card shows — until the first graded result ends both (the card's existing rule).
 *
 * Per uid, on this device only, never sent anywhere (registered in services/studentDataMap.ts):
 *  - localStorage `lazytopper.startHereFocusNotNow.<uid>`: "1" or "2", how many times "Not now"
 *    was tapped on the focused surface.
 *  - sessionStorage `lazytopper.startHereFocusClosed`: the constant "1" once the focused surface
 *    was closed in THIS tab's visit. It never stores the uid (or anything derived from it) as a
 *    value; a different account signing in within the same tab session also sees the focused
 *    surface closed for that visit (harmless: the inline card still shows).
 */
export const START_HERE_FOCUS_NOT_NOW_PREFIX = "lazytopper.startHereFocusNotNow.";
export const START_HERE_FOCUS_CLOSED_KEY = "lazytopper.startHereFocusClosed";
export const START_HERE_FOCUS_MAX_NOT_NOW = 2;

export function focusNotNowCount(uid: string): number {
  try {
    const n = Number(window.localStorage.getItem(START_HERE_FOCUS_NOT_NOW_PREFIX + uid));
    return Number.isInteger(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

/** Whether the focused surface may open for this uid now (the audience check is the caller's). */
export function focusAllowed(uid: string): boolean {
  if (!uid) return false;
  try {
    if (window.sessionStorage.getItem(START_HERE_FOCUS_CLOSED_KEY) === "1") return false;
  } catch {
    /* unreadable session memory: fall through to the device count */
  }
  return focusNotNowCount(uid) < START_HERE_FOCUS_MAX_NOT_NOW;
}

/** "Not now" on the focused surface: closed for this visit, and one fewer offer left. */
export function recordFocusNotNow(uid: string): void {
  if (!uid) return;
  try {
    window.sessionStorage.setItem(START_HERE_FOCUS_CLOSED_KEY, "1");
  } catch {
    /* blocked storage */
  }
  try {
    const next = Math.min(focusNotNowCount(uid) + 1, START_HERE_FOCUS_MAX_NOT_NOW);
    window.localStorage.setItem(START_HERE_FOCUS_NOT_NOW_PREFIX + uid, String(next));
  } catch {
    /* blocked storage: the surface simply returns next visit */
  }
}
