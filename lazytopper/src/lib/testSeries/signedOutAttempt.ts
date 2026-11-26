/**
 * TS-FREE-SIGNEDOUT (owner ruling 26 Nov 2026, 19:23 IST) - a signed-out visitor may OPEN and SIT a Test Series paper (a chapter
 * test, a full-length test or a focus set reached from /test-series) without signing in. The account is asked for only when they
 * want their answers MARKED: the attempt is kept in THIS TAB (sessionStorage) while they sign in, and the same paper then opens with
 * their answers back on it. From there the EXISTING signed-in flow runs unchanged (the one-free-test rule, the fair-use walls, the
 * server's free-test pin, the 2 checks): nothing here grants, pins or decides anything.
 *
 * Signed out, nothing is marked, nothing is written to the server, no record or progress is made, and no Mistake Intelligence is
 * shown. The attempt is matched back to the paper by its QUESTION IDS (a series paper is fixed - the same ids for every student), so
 * answers can never land on another paper's rows.
 *
 * Kill switch: VITE_TS_FREE_SIGNEDOUT_DISABLED=1 restores today's sign-in-first redirect on Start.
 */

export const SIGNED_OUT_ATTEMPT_KEY = "lazytopper.ts.signedOutAttempt.v1";
/** An attempt older than this is not restored (a stale tab). */
export const SIGNED_OUT_ATTEMPT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export const SIGN_IN_TO_MARK_TITLE = "Sign in to get your answers marked";
export const SIGN_IN_TO_MARK_LINE =
  "Your answers are kept in this tab. Sign in (free) and this paper opens again with your answers on it — then submit to get them marked.";
export const SIGN_IN_TO_MARK_BUTTON = "Sign in to get my answers marked";
export const BACK_TO_PAPER_BUTTON = "Back to my paper";
export const SIGNED_OUT_ATTEMPT_RESTORED_LINE = "Your answers from before you signed in are back on this paper. Start, check them, then submit to get them marked.";
/** Shown on the taking screen while signed out: honest about what happens at submit. */
export const SIGNED_OUT_TAKING_NOTE = "You're not signed in — you can sit this paper now. To get it marked, you'll sign in when you submit.";

export function tsFreeSignedOutDisabled(): boolean {
  return import.meta.env?.VITE_TS_FREE_SIGNEDOUT_DISABLED === "1";
}

export type SignedOutSurface = "chapter-test" | "full-mock";

export interface SignedOutAttempt {
  v: 1;
  surface: SignedOutSurface;
  /** The paper's URL (pathname + search) the visitor sat it on - where sign-in returns. */
  path: string;
  /** The paper's question ids, in order: the attempt is restored only onto exactly this paper. */
  ids: string[];
  answers: Record<number, string>;
  flags: number[];
  currentQNumber: number;
  /** Time already spent on the paper (ms). */
  elapsedMs: number;
  timerEnabled?: boolean;
  savedAt: number;
}

export function paperQuestionIds(paper: { questions: ReadonlyArray<{ id?: unknown }> } | null | undefined): string[] {
  return paper ? paper.questions.map((q) => String(q.id ?? "")) : [];
}

function sameIds(a: ReadonlyArray<string>, b: ReadonlyArray<string>): boolean {
  return a.length > 0 && a.length === b.length && a.every((id, i) => id !== "" && id === b[i]);
}

export function saveSignedOutAttempt(attempt: Omit<SignedOutAttempt, "v" | "savedAt">, now: number = Date.now()): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.sessionStorage.setItem(SIGNED_OUT_ATTEMPT_KEY, JSON.stringify({ ...attempt, v: 1, savedAt: now }));
    return true;
  } catch {
    return false;
  }
}

/** The kept attempt for THIS paper (same surface, same question ids, not stale), else null. Never throws. */
export function readSignedOutAttempt(surface: SignedOutSurface, ids: ReadonlyArray<string>, now: number = Date.now()): SignedOutAttempt | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SIGNED_OUT_ATTEMPT_KEY);
    if (!raw) return null;
    const a = JSON.parse(raw) as Partial<SignedOutAttempt> | null;
    if (!a || a.v !== 1 || a.surface !== surface || !Array.isArray(a.ids) || typeof a.savedAt !== "number") return null;
    if (now - a.savedAt > SIGNED_OUT_ATTEMPT_MAX_AGE_MS || a.savedAt > now + 60_000) return null;
    if (!sameIds(a.ids.map(String), ids)) return null;
    const answers: Record<number, string> = {};
    if (a.answers && typeof a.answers === "object") {
      for (const [k, v] of Object.entries(a.answers)) {
        const n = Number(k);
        if (Number.isInteger(n) && n > 0 && typeof v === "string") answers[n] = v;
      }
    }
    return {
      v: 1,
      surface,
      path: typeof a.path === "string" ? a.path : "",
      ids: a.ids.map(String),
      answers,
      flags: Array.isArray(a.flags) ? a.flags.filter((n): n is number => Number.isInteger(n)) : [],
      currentQNumber: Number.isInteger(a.currentQNumber) ? (a.currentQNumber as number) : 1,
      elapsedMs: typeof a.elapsedMs === "number" && a.elapsedMs >= 0 ? a.elapsedMs : 0,
      ...(typeof a.timerEnabled === "boolean" ? { timerEnabled: a.timerEnabled } : {}),
      savedAt: a.savedAt,
    };
  } catch {
    return null;
  }
}

export function clearSignedOutAttempt(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(SIGNED_OUT_ATTEMPT_KEY);
  } catch {
    /* best-effort */
  }
}

/** /login with a safe, same-site return path to this paper (the login page's own redirect handling validates it again). */
export function signInToMarkPath(pathname: string, search: string): string {
  const path = `${pathname}${search}`;
  const safe = path.startsWith("/") && !path.startsWith("//") ? path : "/test-series";
  return `/login?redirect=${encodeURIComponent(safe)}`;
}
