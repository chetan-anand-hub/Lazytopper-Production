// src/lib/papers/resumablePaper.ts
//
// CT-RESUME-2 — "is there a saved, in-progress paper behind THIS paper route?"
//
// MockViewGate counts a paper view for a non-premium student on every page load of
// /chapter-test/... and /full-mock/.... A reload mid-test therefore spent one of the day's
// papers, and a student on their last paper could not even get back to the paper they were
// sitting. The owner rule: count only NEW papers — resuming a saved in-progress paper is not a
// new paper. This module answers that one question from the SAME saved state the pages resume
// from (never a separate marker that could drift from it):
//
//   Chapter Test — this TAB's in-progress autosave (sessionStorage `lazytopper.ct.progress.*`,
//     written by ChapterTestPage while taking) that carries its paper AND the route it was taken
//     on. Matching the route (grade / subject / chapter) keeps it to this chapter.
//   Full Mock    — this ACCOUNT's in-progress session on this device (localStorage
//     `lazytopper.fm.session.v1.<uid|local>.*`, phase "taking") for this route's subject.
//
// A genuinely new paper has no such state and is counted exactly as before. Server metering is
// untouched: the server's paper pass is still minted (and spent) when a paper is graded.
//
// Dependency-free on purpose: MockViewGate sits on the app's first-paint path, so this file
// imports nothing (no bank, no page modules) and only mirrors the two storage key formats.

/** ChapterTestPage's in-progress autosave key prefix (one entry per test code). */
export const CT_PROGRESS_PREFIX = "lazytopper.ct.progress.";
/** fullMockSession.ts's key prefix: `${prefix}.${uid|"local"}.${code}`. */
const FM_SESSION_PREFIX = "lazytopper.fm.session.v1";

/**
 * The route identity a Chapter Test autosave carries (case-insensitive, no trailing slash).
 *
 * TS-MORE-1: a Test Series paper is told apart by its query, because chapter papers 1..5 share one pathname and full-length papers
 * 1..25 share one per subject. `?paper=k` is appended ONLY for a series chapter paper 2..5 (`?series=1&paper=k`) and for a full-length
 * `?paper=n`. Everything else - a non-series test, chapter paper 1 - keeps EXACTLY today's key (pathname alone), so existing saved
 * state and uncounted marks still match.
 */
export function paperRouteKey(pathname: string, search = ""): string {
  const base = String(pathname || "").trim().toLowerCase().replace(/\/+$/, "");
  const q = String(search || "");
  if (!q) return base;
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(q);
  } catch {
    return base;
  }
  const paper = params.get("paper");
  if (paper === null) return base;
  if (/^\/chapter-test\//.test(base)) return params.get("series") === "1" && /^[2-9]$/.test(paper) ? `${base}?paper=${paper}` : base;
  if (/^\/full-mock\//.test(base)) return /^[1-9][0-9]?$/.test(paper) ? `${base}?paper=${paper}` : base;
  return base;
}

function hasPaper(v: unknown): boolean {
  const p = (v as { paper?: { questions?: unknown } } | null)?.paper;
  return !!p && Array.isArray(p.questions) && p.questions.length > 0;
}

/** A saved, unsubmitted Chapter Test paper for exactly this route, in this tab. */
export function hasResumableChapterTest(pathname: string, search = ""): boolean {
  if (typeof window === "undefined") return false;
  const route = paperRouteKey(pathname, search);
  try {
    const store = window.sessionStorage;
    for (let i = 0; i < store.length; i += 1) {
      const key = store.key(i);
      if (!key || !key.startsWith(CT_PROGRESS_PREFIX)) continue;
      try {
        const saved = JSON.parse(store.getItem(key) || "null") as { route?: unknown } | null;
        if (saved && hasPaper(saved) && typeof saved.route === "string" && paperRouteKey(saved.route) === route) {
          return true;
        }
      } catch {
        /* an unreadable entry is not a resumable paper */
      }
    }
  } catch {
    return false;
  }
  return false;
}

/** The Full Mock page's own subject rule (`subjectFromParam`): anything naming science is Science. */
function fullMockSubject(raw: string): "Maths" | "Science" {
  return raw.toLowerCase().includes("science") ? "Science" : "Maths";
}

/** A saved Full Mock this account is still sitting (phase "taking") for this subject, on this device. */
export function hasResumableFullMock(uid: string | null | undefined, subjectParam: string, search = ""): boolean {
  if (typeof window === "undefined") return false;
  const token = uid && uid !== "anonymous" ? uid : "local";
  const prefix = `${FM_SESSION_PREFIX}.${token}.`;
  const subject = fullMockSubject(subjectParam);
  // TS-MORE-1: on a series paper (?paper=n) only a saved sitting of THAT paper is a resume (worksheet id fm-ts1-<m|s><n>--).
  const wantN = /^[1-9][0-9]?$/.test(new URLSearchParams(search).get("paper") ?? "") ? new URLSearchParams(search).get("paper") : null;
  const paperRe = wantN ? new RegExp(`^fm-ts1-[ms]${wantN}--`) : null;
  try {
    const store = window.localStorage;
    for (let i = 0; i < store.length; i += 1) {
      const key = store.key(i);
      if (!key || !key.startsWith(prefix)) continue;
      try {
        const s = JSON.parse(store.getItem(key) || "null") as { phase?: unknown; subject?: unknown } | null;
        if (s && s.phase === "taking" && s.subject === subject && hasPaper(s)) {
          if (!paperRe) return true;
          const wid = (s as { paper?: { worksheetId?: unknown } }).paper?.worksheetId;
          if (typeof wid === "string" && paperRe.test(wid)) return true;
        }
      } catch {
        /* skip an unreadable blob */
      }
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * Is the paper behind this route a RESUME of a saved in-progress paper (not a new paper)?
 * Only the two in-progress surfaces qualify; every other gated route (e.g. /mock-paper/...)
 * is always a new view.
 */
export function isResumingSavedPaper(pathname: string, uid: string | null | undefined, search = ""): boolean {
  const parts = paperRouteKey(pathname).split("/").filter(Boolean);
  if (parts[0] === "chapter-test" && parts.length >= 4) return hasResumableChapterTest(pathname, search);
  if (parts[0] === "full-mock" && parts.length >= 3) return hasResumableFullMock(uid, parts[2], search);
  return false;
}
