// src/lib/practice/practiceReturnSnapshot.ts
// TUTOR-Q-1 — "back from the tutor" returns to the SAME Quick Practice set.
//
// Quick Practice draws a NEW set on every mount (the rotation offset includes the visit's start time and
// the fresh-set draw prefers unserved rows), so the tutor's back arrow — which returns to the practice URL —
// used to land the student on different questions with their answers gone. Just before the practice page
// hands the student to the tutor it saves this snapshot; on the next mount at the SAME URL it is read back
// ONCE and the page rebuilds the displayed set from the saved question ids, in order.
//
// THIS-TAB sessionStorage only (registered in services/studentDataMap.ts). It holds bank question ids, the
// student's MCQ picks and verdicts, which questions had their steps open (with the step solutions the page had
// already fetched), the question they were on, the filters that built the set and any TYPED working they had
// saved. Never the uid, never a photo, never a score. Nothing here grades, records or calls the network.

export const PRACTICE_RETURN_KEY = "lazytopper.practiceReturn.v1";
/** A snapshot older than this is stale (the student wandered off) and is dropped unread. */
export const PRACTICE_RETURN_TTL_MS = 60 * 60 * 1000;
const MAX_IDS = 200;
/** sessionStorage is ~5 MB per origin: keep this entry well under it. */
const MAX_BYTES = 1_500_000;

export interface PracticeReturnFilters {
  marks: string;
  style: string;
  source: string;
  difficulty: string;
  /** The engine difficulty preset ("All" | "Easy" | "Medium" | "Hard"). */
  engineDifficulty: string;
  count: number;
  range: { min: number; max: number } | null;
}

export interface PracticeReturnSnapshot {
  /** The exact practice URL (`pathname + search`) the set was on. */
  url: string;
  at: number;
  /** When the visit that built this set began (the page's session identity): a restore CONTINUES that
   *  session, so the one session record it may write is the same idempotent document, never a second. */
  startedAt: number;
  /** The scorecard had been dismissed (it auto-offers once every question is attempted). */
  scorecardDismissed: boolean;
  /** The displayed set's question ids, in order. */
  ids: string[];
  filters: PracticeReturnFilters;
  /** MCQ picks: question id -> chosen option index. */
  picks: Record<string, number>;
  /** The card's verdict for each pick. */
  results: Record<string, "correct" | "wrong">;
  /** Question ids whose solution steps were open AND whose step solution is held in `solutions`. */
  open: string[];
  /** The step solutions the page had already fetched for the open questions (so a restore never refetches). */
  solutions: Record<string, unknown>;
  /** The question the student was on (the one they asked the tutor about). */
  active: string | null;
  /** Saved TYPED working only (no photo / pdf is ever stored here). */
  working: Record<string, { textAnswer: string }>;
}

function clearRaw(): void {
  try {
    sessionStorage.removeItem(PRACTICE_RETURN_KEY);
  } catch {
    /* storage unavailable: nothing to clear */
  }
}

/** Delete the snapshot (taken once; or a new ask that cannot be restored supersedes an older one). */
export function clearPracticeReturn(): void {
  clearRaw();
}

/** Save the snapshot. Best effort: false when storage is unavailable or full (the page then simply
 *  builds a fresh set on return, as it always did). Drops the fetched step solutions before giving up. */
export function savePracticeReturn(snapshot: PracticeReturnSnapshot): boolean {
  const attempt = (value: PracticeReturnSnapshot): boolean => {
    try {
      const text = JSON.stringify(value);
      if (text.length > MAX_BYTES) return false;
      sessionStorage.setItem(PRACTICE_RETURN_KEY, text);
      return true;
    } catch {
      return false;
    }
  };
  if (attempt(snapshot)) return true;
  if (attempt({ ...snapshot, open: [], solutions: {} })) return true;
  clearRaw();
  return false;
}

const isStr = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v.length <= 200;
const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/** Read-only validation: the snapshot, only if it is well-formed, fresh and for exactly `url`. An expired,
 *  malformed or other-URL snapshot is REMOVED and null is returned. A valid one is NOT removed here (the
 *  page deletes it once the restored set is on screen), so a render that runs twice reads it twice. */
export function peekPracticeReturn(url: string, now: number = Date.now()): PracticeReturnSnapshot | null {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(PRACTICE_RETURN_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }
  if (
    !isRecord(parsed) ||
    typeof parsed.url !== "string" ||
    typeof parsed.at !== "number" ||
    now - parsed.at > PRACTICE_RETURN_TTL_MS ||
    parsed.at - now > 60_000 ||
    parsed.url !== url ||
    typeof parsed.startedAt !== "number" ||
    !Number.isFinite(parsed.startedAt) ||
    !Array.isArray(parsed.ids) ||
    !isRecord(parsed.filters)
  ) {
    clearRaw();
    return null;
  }
  const ids = [...new Set((parsed.ids as unknown[]).filter(isStr))].slice(0, MAX_IDS);
  const f = parsed.filters;
  if (
    ids.length === 0 ||
    typeof f.marks !== "string" ||
    typeof f.style !== "string" ||
    typeof f.source !== "string" ||
    typeof f.difficulty !== "string" ||
    typeof f.engineDifficulty !== "string" ||
    typeof f.count !== "number" ||
    !Number.isFinite(f.count)
  ) {
    clearRaw();
    return null;
  }
  const inSet = new Set(ids);
  const range =
    isRecord(f.range) && typeof f.range.min === "number" && typeof f.range.max === "number"
      ? { min: f.range.min, max: f.range.max }
      : null;

  const picks: Record<string, number> = {};
  if (isRecord(parsed.picks)) {
    for (const [id, v] of Object.entries(parsed.picks)) {
      if (inSet.has(id) && typeof v === "number" && Number.isInteger(v) && v >= 0 && v < 50) picks[id] = v;
    }
  }
  const results: Record<string, "correct" | "wrong"> = {};
  if (isRecord(parsed.results)) {
    for (const [id, v] of Object.entries(parsed.results)) {
      if (inSet.has(id) && (v === "correct" || v === "wrong")) results[id] = v;
    }
  }
  const solutions: Record<string, unknown> = {};
  if (isRecord(parsed.solutions)) {
    for (const [id, v] of Object.entries(parsed.solutions)) {
      if (inSet.has(id) && isRecord(v) && Array.isArray(v.steps)) solutions[id] = v;
    }
  }
  const open = Array.isArray(parsed.open)
    ? (parsed.open as unknown[]).filter((id): id is string => isStr(id) && inSet.has(id) && id in solutions)
    : [];
  const working: Record<string, { textAnswer: string }> = {};
  if (isRecord(parsed.working)) {
    for (const [id, v] of Object.entries(parsed.working)) {
      if (inSet.has(id) && isRecord(v) && typeof v.textAnswer === "string" && v.textAnswer.trim()) {
        working[id] = { textAnswer: v.textAnswer };
      }
    }
  }
  return {
    url: parsed.url,
    at: parsed.at,
    startedAt: parsed.startedAt,
    scorecardDismissed: parsed.scorecardDismissed === true,
    ids,
    filters: {
      marks: f.marks,
      style: f.style,
      source: f.source,
      difficulty: f.difficulty,
      engineDifficulty: f.engineDifficulty,
      count: f.count,
      range,
    },
    picks,
    results,
    open,
    solutions,
    active: isStr(parsed.active) && inSet.has(parsed.active) ? parsed.active : null,
    working,
  };
}
