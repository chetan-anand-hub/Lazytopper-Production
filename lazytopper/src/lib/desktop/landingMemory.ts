/**
 * Desktop Level 2 — Landing memory helpers.
 *
 * Reference (final desktop prototype):
 *   chetan-anand-hub/topic-focus-lite — src/context/LazyTopperContext.tsx
 *   (`hasMeaningfulMemory` / `memory` / `clearMemory` / resume target).
 *
 * The prototype keeps an in-context `SessionSnapshot` in
 * `lazytopper.memory.v1`. Production has no equivalent single snapshot,
 * but it already persists everything the public landing actually needs
 * to render an honest "Welcome back / Resume" panel:
 *
 *   - `lazytopper.lastSubjectContext`
 *       last viewed grade + subject (mirrors the prototype's
 *       `subject` + `lastRoute` hint). Written by the existing
 *       subject-context redirect chain; read by `useSubjectContext`,
 *       `DesktopHome`, and `DesktopTopicHubPage`.
 *
 *   - `lazytopper.desktop.savedWorksheets.v1`
 *       newest-first array of locally-saved worksheets. Newest entry
 *       maps to the prototype's "lastAttempt" line — it is the most
 *       recent intentional artefact the user produced on the desktop.
 *       Score is not modelled (saved worksheets capture the plan, not
 *       a graded result), so the panel falls back to the topic label
 *       only when no graded mistake log entry is available.
 *
 *   - `lazytopper.profile.v2`
 *       presence indicates the user has been here before; used only as
 *       a tiebreaker so first-time visitors never see "Welcome back".
 *
 * No new persistence is introduced. No sample / placeholder data is
 * ever returned. If real data is unavailable, `hasMeaningfulMemory`
 * is `false` and the public-landing panel must fall back to the
 * first-time-visitor layout.
 *
 * `clearMemory` deliberately clears ONLY the resume hint
 * (`lazytopper.lastSubjectContext`). It MUST NOT touch saved
 * worksheets, mistake logs, profile, streak, XP, or any other durable
 * learner data — those are the user's own work and "Start fresh" on
 * the public landing is a navigation hint, not an account reset.
 *
 * Pure data layer — no React, no DOM. Defensive against malformed
 * reads, SSR (`localStorage` undefined), and JSON errors.
 */

const SUBJECT_CONTEXT_KEY = "lazytopper.lastSubjectContext";
const SAVED_WORKSHEETS_KEY = "lazytopper.desktop.savedWorksheets.v1";
const PROFILE_KEY_V2 = "lazytopper.profile.v2";
const PROFILE_KEY_V1 = "lazytopper.profile";

export interface LandingResumeAttempt {
  /** Topic label as the user saw it when the worksheet was saved. */
  topicLabel: string;
  /** Subject the worksheet was scoped to. */
  subject: "Maths" | "Science";
  /** ISO-8601 saved-at timestamp. */
  savedAt: string;
}

export interface LandingMemory {
  /** Last viewed subject (from `lazytopper.lastSubjectContext`), if any. */
  subject: string | null;
  /** Last viewed grade (from `lazytopper.lastSubjectContext`), if any. */
  grade: string | null;
  /** Newest saved worksheet, if the user has any. */
  lastAttempt: LandingResumeAttempt | null;
  /** Whether the visitor has signed in here before (presence of profile). */
  hasProfile: boolean;
}

const isBrowser = (): boolean =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

function readSubjectContext(): { grade: string; subject: string } | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(SUBJECT_CONTEXT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.grade === "string" &&
      typeof parsed.subject === "string" &&
      parsed.grade.trim() &&
      parsed.subject.trim()
    ) {
      return { grade: parsed.grade.trim(), subject: parsed.subject.trim() };
    }
  } catch {
    // malformed — ignore
  }
  return null;
}

function readNewestSavedWorksheet(): LandingResumeAttempt | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(SAVED_WORKSHEETS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    // Newest-first per savedWorksheets.ts contract; defensively pick
    // the first entry that has the fields we need.
    for (const entry of parsed) {
      if (
        entry &&
        typeof entry === "object" &&
        typeof entry.createdAt === "string" &&
        typeof entry.topicLabel === "string" &&
        typeof entry.subject === "string" &&
        (entry.subject === "Maths" || entry.subject === "Science")
      ) {
        return {
          topicLabel: entry.topicLabel,
          subject: entry.subject,
          savedAt: entry.createdAt,
        };
      }
    }
  } catch {
    // malformed — ignore
  }
  return null;
}

function hasProfileFlag(): boolean {
  if (!isBrowser()) return false;
  try {
    return (
      window.localStorage.getItem(PROFILE_KEY_V2) !== null ||
      window.localStorage.getItem(PROFILE_KEY_V1) !== null
    );
  } catch {
    return false;
  }
}

/**
 * Read the current real landing memory from the same localStorage keys
 * that production already writes. Returns `null` if nothing meaningful
 * is present.
 */
export function readLandingMemory(): LandingMemory | null {
  const ctx = readSubjectContext();
  const attempt = readNewestSavedWorksheet();
  const hasProfile = hasProfileFlag();
  if (!ctx && !attempt && !hasProfile) return null;
  return {
    subject: ctx?.subject ?? null,
    grade: ctx?.grade ?? null,
    lastAttempt: attempt,
    hasProfile,
  };
}

/**
 * `true` when the visitor has at least one real, intentional artefact
 * we can resume from — either a saved worksheet, a recorded subject
 * focus, or an existing profile. Mirrors the prototype's
 * `isMeaningfulMemory` shape but reads ONLY real production keys.
 */
export function hasMeaningfulMemory(memory: LandingMemory | null): boolean {
  if (!memory) return false;
  if (memory.lastAttempt) return true;
  if (memory.subject || memory.grade) return true;
  if (memory.hasProfile) return true;
  return false;
}

/**
 * Resolve the route the "Resume" CTA should send the user to, based on
 * real memory. Returns `/` when only a profile exists (no safe resume
 * target) and when nothing is known.
 *
 * Never returns a route that depends on faked state.
 */
export function resolveResumeRoute(memory: LandingMemory | null): string {
  if (!memory) return "/";
  if (memory.lastAttempt) {
    // Send the user back to the worksheet workspace they last saved a
    // plan from. Subject context is part of the worksheet record.
    return "/practice/worksheets";
  }
  if (memory.grade && memory.subject) {
    // Broad grade/subject context should resume safely via Exam Trends,
    // not Topic Hub (which can over-promise missing per-topic state).
    return `/exam-trends?subject=${encodeURIComponent(memory.subject)}`;
  }
  if (memory.hasProfile) return "/";
  return "/";
}

/**
 * Clear the resume hint so the next visit starts at the first-time
 * layout. Intentionally narrow: we ONLY remove the navigation hint
 * (`lazytopper.lastSubjectContext`). Saved worksheets, mistake logs,
 * profile, streak, XP, etc. remain untouched — those are the user's
 * own work and "Start fresh" on the landing must not delete them.
 */
export function clearLandingMemory(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(SUBJECT_CONTEXT_KEY);
  } catch {
    // ignore quota / access errors
  }
}
