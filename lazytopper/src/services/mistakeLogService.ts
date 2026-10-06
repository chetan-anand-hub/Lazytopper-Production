import {
  collection,
  addDoc,
  doc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  getDocs,
  limit,
  startAfter,
  type QueryConstraint,
} from "firebase/firestore";
import { firestoreDb } from "./firebaseClient";

const LOCAL_KEY_PREFIX = "lazytopper.mistakeLogs.v1";
const MAX_LOCAL_ENTRIES = 200;
/** ME-ENGINE-1 PR-1 (G14) — one page of a windowed cloud read. A window is read page after
 *  page until a short page; a single `limit(200)` silently dropped everything past the 200th
 *  entry of a busy 30- or 120-day window. */
export const MISTAKE_LOG_PAGE_SIZE = 200;
/** A safety bound on pages per read (10,000 entries). Reaching it is REPORTED (`complete:
 *  false`), never hidden — a reader then says its numbers may be partial. */
const MAX_MISTAKE_LOG_PAGES = 50;

export interface MistakeLogEntry {
  id: string;
  timestamp: string;
  questionText: string;
  topic: string;
  /**
   * MI-CONCEPT-1 — the bank row's `subtopic`, VERBATIM, resolved from the question
   * id at write time (see services/mistakeConcept.ts).
   *
   * ★ OPTIONAL AND IT MUST STAY OPTIONAL. Every entry written before MI-CONCEPT-1
   * shipped has neither this nor `questionId`, and those entries must keep parsing.
   * ★ ABSENT MEANS UNKNOWABLE, NOT ZERO. A free-typed Check & Improve answer is not
   * a bank question, and a withheld/deleted id no longer resolves — both correctly
   * carry no concept. Never substitute the topic for a missing concept.
   */
  concept?: string;
  /**
   * MI-CONCEPT-1 — the id the grading surface identified this answer by, written
   * through from `RecordMistakeContext.questionId`.
   *
   * ⚠ NOT ALWAYS A BANK ID. Quick Practice and the per-question SolutionChecker
   * write the bare bank id; worksheet / full-mock / chapter-test / multi-question
   * Check & Improve write a surface-scoped SYNTHETIC attempt id
   * (`ws:`/`fm:`/`ct:`/`ci:`). Anything re-serving a question from this field must
   * handle that (see [FU-RETRY-SYNTHETIC-QUESTION-ID]).
   */
  questionId?: string;
  subject: string;
  totalMarks: number;
  marksLost: number;
  mistakeCounts: {
    conceptual: number;
    calculation: number;
    silly: number;
    presentation: number;
  };
  stepDetails: Array<{
    stepNumber: number;
    mistakeType: string;
    marksDeducted: number;
  }>;
  /**
   * SCORECARD-MI-1 PR-2 (B7) — the grade's marks lost per bucket (conceptual, calculation,
   * silly, presentation, unattempted, untyped), stored ONLY for a grade that carried them
   * (GRADER-CORE-1 v2), together with its schema version. Both are ABSENT on every older entry:
   * that entry is COUNT-ONLY — read as counts, labelled as counts, never converted and never
   * given invented marks (G5). Readers validate it through lib/mistakeDisplay.
   */
  marksLostByType?: {
    conceptual: number;
    calculation: number;
    silly: number;
    presentation: number;
    unattempted: number;
    untyped: number;
  };
  marksLostByTypeVersion?: number;
  /**
   * ME-ENGINE-1 PR-1 (G7) — MISTAKE HISTORY. When this mistake stopped being a live mistake
   * (ISO-8601), and how. Written ONLY onto a stable-id entry (never a legacy random-id one) by
   * `resolveStableMistakeLog` / `resolveEarlierMistakesForQuestion`; the rest of the entry is
   * left exactly as it was, so the original mistake (its date, marks and types) survives.
   * ★ ABSENT ON EVERY OLDER ENTRY, AND THAT IS HONEST: no entry is back-filled. A re-grade
   *   before this field existed DELETED its entry, so that history cannot be known.
   * ★ A later mistake on the SAME submission rewrites the whole entry (setDoc) and these two
   *   fields go with it — the entry is live again.
   */
  resolvedAt?: string;
  resolvedBy?: MistakeResolution;
}

/**
 * How a mistake was resolved (ME-ENGINE-1 PR-1, G7):
 *  - `re-grade`              a re-grade of the SAME submission came back with no mistake —
 *                            the case that used to DELETE the entry. NOT won back (the
 *                            student did nothing new — the grade was re-read).
 *  - `re-grade-not-attempted` a re-grade of the same submission found the work NOT ATTEMPTED.
 *                            The entry is no longer a mistake, but nothing was won back.
 *  - `later-correct-attempt` a LATER submission of the same question (joined by its bank id)
 *                            scored full marks. The ONLY resolution that is "won back".
 * A re-grade REPLACES its submission's grade everywhere (the attempt, the session record), so
 * an entry resolved by a re-grade is no longer a live mistake on any aggregation — exactly as
 * when it was deleted. A later correct attempt does NOT erase the earlier loss (that attempt
 * still stands in the graded stream), so its entry still counts where the loss happened.
 */
export type MistakeResolution = "re-grade" | "re-grade-not-attempted" | "later-correct-attempt";

/** Resolved by a re-grade of the same submission — equivalent to the old deletion for every
 *  aggregation (the entry is history, not a live mistake). */
export function isSupersededByRegrade(e: Pick<MistakeLogEntry, "resolvedBy"> | null | undefined): boolean {
  return e?.resolvedBy === "re-grade" || e?.resolvedBy === "re-grade-not-attempted";
}

/**
 * Did resolving this entry win marks back? OWNER RULING (2026-10-06, verbatim): "confirm, and pin
 * with a test, that "marks won back" counts ONLY later-correct-attempt (a new attempt by the
 * student). Mistakes resolved by re-grade or re-grade-not-attempted leave the live counts (as
 * now), but never count as won back and never show as improvement."
 * Pinned by progressReadModel.wonBackRule.test.ts.
 */
export function isWonBack(e: Pick<MistakeLogEntry, "resolvedBy" | "resolvedAt"> | null | undefined): boolean {
  return typeof e?.resolvedAt === "string" && e.resolvedBy === "later-correct-attempt";
}

/** SCORECARD-MI-1 (D5) — how an entry is written. With `id` (the stable grade identity from
 *  `gradeIdentityDocId`) the write REPLACES any earlier entry for the same submission, on the
 *  device and in Firestore (`setDoc` on that id — firestore.rules:41-43 allow the owner to
 *  create and update `mistakeLogs/{logId}`). Without it, the legacy append path. */
export interface LogMistakesOptions {
  id?: string;
}

function localKey(uid: string): string {
  return `${LOCAL_KEY_PREFIX}:${uid}`;
}

function readLocal(uid: string): MistakeLogEntry[] {
  try {
    const raw = localStorage.getItem(localKey(uid));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MistakeLogEntry[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(uid: string, entries: MistakeLogEntry[]): void {
  try {
    localStorage.setItem(
      localKey(uid),
      JSON.stringify(entries.slice(0, MAX_LOCAL_ENTRIES))
    );
  } catch {
    // quota exceeded or SSR — ignore
  }
}

/** Merge two entry arrays by ID, primary wins, sorted newest-first. */
function mergeByID(
  primary: MistakeLogEntry[],
  secondary: MistakeLogEntry[]
): MistakeLogEntry[] {
  const seen = new Set(primary.map((e) => e.id));
  const merged = [...primary, ...secondary.filter((e) => !seen.has(e.id))];
  return merged.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

/**
 * Write a mistake log entry for a completed answer check.
 * Always writes to localStorage first. Attempts Firestore write fire-and-forget.
 */
export async function logMistakes(
  uid: string,
  entry: Omit<MistakeLogEntry, "id">,
  options?: LogMistakesOptions
): Promise<void> {
  const stableId = options?.id?.trim() || "";
  const id = stableId || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const full: MistakeLogEntry = { id, ...entry };

  // A stable id REPLACES the earlier local copy of the same submission (never two).
  const existing = readLocal(uid).filter((e) => e.id !== id);
  writeLocal(uid, [full, ...existing]);

  if (firestoreDb) {
    try {
      if (stableId) {
        await setDoc(doc(firestoreDb, "learnerProfiles", uid, "mistakeLogs", stableId), full);
      } else {
        await addDoc(
          collection(firestoreDb, "learnerProfiles", uid, "mistakeLogs"),
          full
        );
      }
    } catch {
      // Firestore write failed — localStorage copy remains the source of truth
    }
  }
}

/**
 * SCORECARD-MI-1 (W1) — a stable grade-identity id always holds "::"
 * (surface::submission::question — `gradeIdentityDocId`); a legacy random id
 * (`${Date.now()}-xxxxxx`) never does. Only a stable id may ever be removed.
 */
export function isStableMistakeLogId(id: string): boolean {
  return typeof id === "string" && id.includes("::");
}

/**
 * SCORECARD-MI-1 (W1) as amended by ME-ENGINE-1 PR-1 (G7) — a re-grade of the SAME submission
 * came back with no mistake (full marks, or not attempted). That submission's stable-identity
 * entry is RESOLVED, not deleted: `resolvedAt` + `resolvedBy` are added and every other field
 * is left as it was, on the device and in Firestore. Every aggregation then treats it exactly as
 * it treated the deleted entry (`isSupersededByRegrade` — `getMistakeLogs` leaves it out), so no
 * live number moves, while the history ("won back", with its date) survives.
 * `firestore.rules:41-43` (`allow read, write: if isOwner(uid)`) covers the update.
 *
 * - Acts on a STABLE id only; a legacy random-id entry is never touched.
 * - `known` is the caller's evidence that an entry was written (the MI dedup ring). Without
 *   it, only a LIVE copy on this device triggers the cloud update, so a first-time clean grade
 *   costs no write.
 * - `updateDoc`, never `setDoc`: an entry that never reached the cloud is not re-created as a
 *   bare "resolved" stub (the update fails and is swallowed — same best effort as the write).
 *
 * Returns whether it acted.
 */
export async function resolveStableMistakeLog(
  uid: string,
  id: string,
  resolution: { resolvedBy: "re-grade" | "re-grade-not-attempted"; resolvedAt: string },
  options?: { known?: boolean }
): Promise<boolean> {
  const stableId = (id || "").trim();
  if (!uid || !isStableMistakeLogId(stableId)) return false;
  const local = readLocal(uid);
  const hadLocal = local.some((e) => e.id === stableId && !e.resolvedAt);
  if (!hadLocal && !options?.known) return false;
  const fields = { resolvedAt: resolution.resolvedAt, resolvedBy: resolution.resolvedBy };
  if (hadLocal) writeLocal(uid, local.map((e) => (e.id === stableId ? { ...e, ...fields } : e)));
  if (firestoreDb) {
    try {
      await updateDoc(doc(firestoreDb, "learnerProfiles", uid, "mistakeLogs", stableId), fields);
    } catch {
      // Firestore update failed (or the entry never reached the cloud) — best effort, as the write
    }
  }
  return true;
}

/**
 * ME-ENGINE-1 PR-1 (G7) — can this question id join a LATER attempt to an earlier mistake?
 * Only a real question id (the bank id Quick Practice / the per-question checker write, or an
 * HPQ row id). A surface-scoped synthetic id (`ws:`/`ct:`/`fm:`/`ci:` — always holds ":") names
 * one paper's slot, never the question, so it cannot join anything: that join is by concept,
 * ME-ENGINE-1 PR-3.
 */
export function isJoinableQuestionId(id: string | null | undefined): boolean {
  const v = String(id ?? "").trim();
  return v.length > 0 && !v.includes(":");
}

/**
 * ME-ENGINE-1 PR-1 (G7) — a LATER submission of the same question scored full marks: every
 * earlier, still-live stable-id mistake on that question (same `questionId`, strictly earlier
 * `timestamp`, not this submission's own entry) is marked `later-correct-attempt`, dated
 * `resolvedAt`. Cross-device: the earlier entries are found in Firestore by `questionId`
 * (a single-field equality query — Firestore indexes it automatically), and the device copy is
 * updated too. A legacy random-id entry is never touched (legacy is never converted).
 *
 * Returns how many entries it resolved.
 */
export async function resolveEarlierMistakesForQuestion(
  uid: string,
  questionId: string,
  options: { exceptId?: string; beforeMs: number; resolvedAt: string }
): Promise<number> {
  const qid = String(questionId ?? "").trim();
  if (!uid || !isJoinableQuestionId(qid)) return 0;
  const fields = { resolvedAt: options.resolvedAt, resolvedBy: "later-correct-attempt" as const };
  const eligible = (e: Partial<MistakeLogEntry> & { id: string }): boolean => {
    if (e.id === options.exceptId || !isStableMistakeLogId(e.id)) return false;
    if (String(e.questionId ?? "").trim() !== qid || e.resolvedAt) return false;
    const ts = Date.parse(String(e.timestamp ?? ""));
    return Number.isFinite(ts) && ts < options.beforeMs;
  };
  const resolved = new Set<string>();

  if (firestoreDb) {
    try {
      const snap = await getDocs(
        query(collection(firestoreDb, "learnerProfiles", uid, "mistakeLogs"), where("questionId", "==", qid))
      );
      for (const d of snap.docs) {
        const data = d.data() as MistakeLogEntry;
        const id = data.id || d.id;
        if (!eligible({ ...data, id })) continue;
        try {
          // eslint-disable-next-line no-await-in-loop
          await updateDoc(doc(firestoreDb, "learnerProfiles", uid, "mistakeLogs", id), fields);
          resolved.add(id);
        } catch {
          /* best effort, as every MI write */
        }
      }
    } catch {
      /* the cloud is unreachable — the device copy below still records what it can */
    }
  }

  const local = readLocal(uid);
  let touched = false;
  const next = local.map((e) => {
    if (!eligible(e)) return e;
    touched = true;
    resolved.add(e.id);
    return { ...e, ...fields };
  });
  if (touched) writeLocal(uid, next);
  return resolved.size;
}

/** The outcome of a paginated cloud read: `complete` is false when the read failed, Firestore
 *  is not configured, or the page safety bound was reached — a reader must then not present
 *  its figures as whole. */
export interface MistakeLogCloudRead {
  entries: MistakeLogEntry[];
  complete: boolean;
}

/**
 * G14 — read EVERY entry matching `constraints` (ordered by `orderField` desc), page by page
 * (`MISTAKE_LOG_PAGE_SIZE`), until a short page. Throws when Firestore is unreachable; returns
 * `complete: false` only when the safety bound stopped it.
 */
async function readAllMistakeLogPages(
  uid: string,
  constraints: QueryConstraint[],
  orderField: "timestamp" | "resolvedAt"
): Promise<MistakeLogCloudRead> {
  if (!firestoreDb) return { entries: [], complete: false };
  const base = collection(firestoreDb, "learnerProfiles", uid, "mistakeLogs");
  const entries: MistakeLogEntry[] = [];
  let cursor: unknown = null;
  for (let page = 0; page < MAX_MISTAKE_LOG_PAGES; page += 1) {
    const parts: QueryConstraint[] = [...constraints, orderBy(orderField, "desc")];
    // `startAfter` only from the second page on, so a one-page read issues the same query as before.
    if (cursor) parts.push(startAfter(cursor));
    parts.push(limit(MISTAKE_LOG_PAGE_SIZE));
    // eslint-disable-next-line no-await-in-loop
    const snap = await getDocs(query(base, ...parts));
    for (const d of snap.docs) {
      const data = d.data() as MistakeLogEntry;
      entries.push({ ...data, id: data.id || d.id });
    }
    if (snap.docs.length < MISTAKE_LOG_PAGE_SIZE) return { entries, complete: true };
    cursor = snap.docs[snap.docs.length - 1];
  }
  return { entries, complete: false };
}

/**
 * ME-ENGINE-1 PR-1 — the mistake HISTORY of a window, from Firestore ONLY (synced data, never a
 * device-only copy), for the shared read model (`progressReadModel`). Two paginated reads,
 * unioned by id:
 *   1. every entry LOGGED since `startMs` (live, resolved and legacy alike);
 *   2. every entry RESOLVED since `startMs`, however long ago it was logged — "won back this
 *      week" must find a mistake made last month.
 * Nothing is filtered or converted here: the read model decides what is live, won back or
 * legacy. Throws when Firestore cannot be read (the caller degrades honestly).
 */
export async function getMistakeLogHistoryFromCloud(
  uid: string,
  startMs: number
): Promise<MistakeLogCloudRead> {
  const startIso = new Date(startMs).toISOString();
  const [logged, resolved] = await Promise.all([
    readAllMistakeLogPages(uid, [where("timestamp", ">=", startIso)], "timestamp"),
    readAllMistakeLogPages(uid, [where("resolvedAt", ">=", startIso)], "resolvedAt"),
  ]);
  const byId = new Map<string, MistakeLogEntry>();
  for (const e of [...logged.entries, ...resolved.entries]) byId.set(e.id, e);
  return {
    entries: [...byId.values()].sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)),
    complete: logged.complete && resolved.complete,
  };
}

/**
 * One-time hydration: if localStorage has no mistake log entries for the user,
 * fetch the most recent 200 entries from Firestore and populate localStorage.
 *
 * Called on profile load (sign-in) so history survives cleared browser data
 * or device switches. No-ops when Firestore is unavailable.
 */
export async function hydrateMistakeLogsFromCloud(uid: string): Promise<void> {
  const existing = readLocal(uid);
  if (existing.length > 0) return; // localStorage already has data — skip

  if (!firestoreDb) return;

  try {
    const q = query(
      collection(firestoreDb, "learnerProfiles", uid, "mistakeLogs"),
      orderBy("timestamp", "desc"),
      limit(MAX_LOCAL_ENTRIES)
    );
    const snap = await getDocs(q);
    if (snap.empty) return;

    const remote = snap.docs.map((d) => {
      const data = d.data() as MistakeLogEntry;
      return { ...data, id: data.id || d.id };
    });

    writeLocal(uid, remote);
  } catch {
    // Firestore unavailable — silently no-op; localStorage will be populated
    // organically on the next getMistakeLogs call.
  }
}

/**
 * Return mistake log entries for the given user within the last `days` days,
 * sorted newest-first.
 *
 * Primary source: Firestore subcollection `learnerProfiles/{uid}/mistakeLogs`
 * (when Firebase is configured and reachable).
 * Fallback: localStorage cache — always works offline or when Firestore is
 * unavailable / not yet configured.
 *
 * Firestore results are merged into localStorage so subsequent reads are fast
 * even when offline, and locally-written entries that pre-date cloud config
 * are preserved.
 *
 * ME-ENGINE-1 PR-1: the window is read in full (paginated — G14), and an entry resolved by a
 * re-grade (`isSupersededByRegrade`) is left out, so every existing reader sees exactly what
 * it saw when such an entry was deleted. The shared read model reads the full history through
 * `getMistakeLogHistoryFromCloud` instead.
 */
export async function getMistakeLogs(
  uid: string,
  days: number
): Promise<MistakeLogEntry[]> {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const cutoffIso = new Date(cutoff).toISOString();

  if (firestoreDb) {
    try {
      // G14 — every page of the window, not the first 200 entries of it.
      const { entries: remote } = await readAllMistakeLogPages(
        uid,
        [where("timestamp", ">=", cutoffIso)],
        "timestamp"
      );

      // Merge with local cache so locally-written entries (written while offline
      // or before Firestore was ready) are not silently dropped.
      const merged = mergeByID(remote, readLocal(uid));
      writeLocal(uid, merged);

      // Return the merged set filtered to the requested date window. G7 — an entry a re-grade
      // resolved is history, not a live mistake: left out exactly as when it was deleted.
      return merged.filter((e) => {
        try {
          return new Date(e.timestamp).getTime() >= cutoff && !isSupersededByRegrade(e);
        } catch {
          return false;
        }
      });
    } catch (error) {
      console.warn(
        "[mistakeLogService] Firestore read failed — using local cache",
        { uid, error }
      );
      // Fall through to localStorage
    }
  }

  // No Firestore or read failed: filter local cache by date window
  return readLocal(uid)
    .filter((e) => {
      try {
        return new Date(e.timestamp).getTime() >= cutoff && !isSupersededByRegrade(e);
      } catch {
        return false;
      }
    })
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
}
