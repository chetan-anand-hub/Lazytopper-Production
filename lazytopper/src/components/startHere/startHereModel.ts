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
  kicker: "Start here · 2 minutes",
  body: "Pick a chapter, answer 5 board-style questions, and see exactly where marks slip.",
  start: "Start",
  notNow: "Not now",
} as const;

export type StartHereQType = "mcq" | "ar";
export const START_HERE_QTYPE_LABEL: Record<StartHereQType, string> = {
  mcq: "Quick 5: tap the answer",
  ar: "Assertion–Reason",
};

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
  sp.set("count", String(START_HERE_COUNT));
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
