// src/services/sessionRecordsOutbox.ts
//
// SAVE-SYNC-1 (D190) — a graded result is never silently lost on a flaky connection.
//
// Every graded result is written by ONE module (`sessionRecords.ts`: `writeSessionRecord` and
// `writeSessionPerQuestion`). Before this file the cloud half was a single fire-and-forget
// `setDoc` whose failure was only `console.warn`ed, and nothing ever re-sent a record that
// lived only in the localStorage mirror (`getSessionRecordsFromCloud` merges cloud → local,
// never local → cloud). On bad mobile data a result could miss the student's account for good.
//
// WHAT THIS ADDS (and nothing else — no new Firestore path, no rules change, no schema change):
//   1. an OUTBOX per uid in localStorage: the writes still to be confirmed in the cloud, each
//      WITH the body that was queued (the mirror in `sessionRecords.ts` is capped and is
//      rewritten by the cloud-wins read, so it is not trusted to hold it). The entry is written
//      BEFORE the first send, so a tab closed mid-save leaves it behind;
//   2. in-session RETRY with backoff (3 retries);
//   3. a DRAIN on the next app load for that uid and on the browser `online` event;
//   4. a tiny STATUS store the UI reads (saving / saved / device-only) and a `beforeunload`
//      prompt that exists ONLY while a write is pending.
//
// IDEMPOTENT: the doc id is the record id and the write is a FULL replace (N5, unchanged). One
// attempt chain per record id at a time: a newer write for the same id supersedes the older
// chain. A re-send never overwrites a cloud copy that is NEWER than the queued one (the
// re-send path in `sessionRecords.ts` reads `updatedAt` first).

export type OutboxKind = "record" | "perQuestion";

export interface OutboxEntry {
  kind: OutboxKind;
  id: string;
  /** ISO time the write was queued; it is also the `updatedAt` the cloud doc carries. */
  queuedAt: string;
  /**
   * The body to send, kept WITH the entry. The localStorage mirror is capped (25 payloads / 200
   * records) and the cloud read rewrites it (cloud wins), so it cannot be trusted to still hold the
   * result that was queued: a re-grade queued offline must re-send ITSELF, not whatever the mirror
   * holds by then. Absent only on an entry written without one.
   */
  body?: unknown;
  /** True for a write that is not a graded result (a worksheet download): tracked, never announced. */
  quiet?: boolean;
}

/** What `sessionRecords.ts` reports for a re-send. Every outcome but a throw settles the entry. */
export type ResendOutcome = "sent" | "cloud-newer" | "no-local-copy" | "no-cloud" | "superseded";

export type SavePhase = "idle" | "saving" | "saved" | "device-only";
export interface SaveStatusSnapshot {
  phase: SavePhase;
}

/**
 * The Firestore web SDK does NOT reject an offline write: it queues it and the promise stays pending
 * until the server acknowledges. So "no answer in this long" is what offline looks like. After this
 * the line stops claiming it is saving (device-only) and the `beforeunload` prompt is dropped; the
 * attempt itself stays alive (the SDK flushes its queue when the network returns) and the outbox
 * entry stays, so a closed tab is still covered by the next load.
 */
export const SLOW_AFTER_MS = 12000;

/** In-session retries after the first attempt. */
export const RETRY_DELAYS_MS: readonly number[] = [1000, 3000, 8000];

const STORAGE_PREFIX = "lazytopper.sessionOutbox.v1:";
const keyOf = (kind: OutboxKind, id: string) => `${kind}:${id}`;

// ── persistence (localStorage, best effort) ──────────────────────────────────────────────

export function readOutbox(uid: string): OutboxEntry[] {
  if (typeof window === "undefined" || !uid) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + uid);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is OutboxEntry =>
        !!e && (e.kind === "record" || e.kind === "perQuestion") && typeof e.id === "string" && typeof e.queuedAt === "string",
    );
  } catch {
    return [];
  }
}

function writeOutbox(uid: string, list: OutboxEntry[]): boolean {
  if (typeof window === "undefined" || !uid) return false;
  try {
    if (list.length === 0) window.localStorage.removeItem(STORAGE_PREFIX + uid);
    else window.localStorage.setItem(STORAGE_PREFIX + uid, JSON.stringify(list));
    return true;
  } catch (error) {
    // quota / private mode: the in-memory retry still runs for this session, but a CLOSED tab then has
    // nothing to re-send. Said out loud, never swallowed.
    console.warn("[sessionRecords] outbox could not be persisted; this result is only retried while the tab stays open", error);
    return false;
  }
}

function upsertEntry(uid: string, entry: OutboxEntry): void {
  void writeOutbox(uid, [...readOutbox(uid).filter((e) => keyOf(e.kind, e.id) !== keyOf(entry.kind, entry.id)), entry]);
}

function removeEntry(uid: string, kind: OutboxKind, id: string): void {
  writeOutbox(uid, readOutbox(uid).filter((e) => keyOf(e.kind, e.id) !== keyOf(kind, id)));
}

// ── status store (read by the UI via useSyncExternalStore) ───────────────────────────────

const inflight = new Map<string, number>(); // key -> generation of the live attempt chain
const failed = new Set<string>(); // keys whose last chain ended in a failure (entry stays queued)
const quiet = new Set<string>(); // keys of writes that are not graded results: never announced
const slow = new Set<string>(); // keys still unanswered after SLOW_AFTER_MS (alive, but not "saving" any more)
let savedFlash = false;
let failedAcknowledged = false; // the student pressed OK on the device-only line
let snapshot: SaveStatusSnapshot = { phase: "idle" };
const listeners = new Set<() => void>();

/** Chains the student should still wait for: alive and not yet slow. */
function activeCount(): number {
  let n = 0;
  for (const k of inflight.keys()) if (!slow.has(k) && !quiet.has(k)) n++;
  return n;
}

function computePhase(): SavePhase {
  if (activeCount() > 0) return "saving";
  const loud = (s: Set<string>) => Array.from(s).some((k) => !quiet.has(k));
  if ((loud(failed) || loud(slow)) && !failedAcknowledged) return "device-only";
  return savedFlash ? "saved" : "idle";
}

function publish(): void {
  const phase = computePhase();
  if (phase !== snapshot.phase) {
    snapshot = { phase };
    for (const l of Array.from(listeners)) l();
  }
  syncBeforeUnload();
}

export function subscribeSaveStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function getSaveStatus(): SaveStatusSnapshot {
  return snapshot;
}
/** The student dismissed the line (or its timer ran out): "saved" settles to idle. */
export function dismissSaveStatus(): void {
  savedFlash = false;
  failedAcknowledged = true;
  publish();
}
export function pendingCount(): number {
  return activeCount();
}

// ── beforeunload: ONLY while a write is pending ──────────────────────────────────────────

let unloadAttached = false;
function onBeforeUnload(e: BeforeUnloadEvent): void {
  // Browsers ignore custom text here; the in-page line carries the explanation. The student can always leave.
  e.preventDefault();
  e.returnValue = "";
}
function syncBeforeUnload(): void {
  if (typeof window === "undefined") return;
  const want = activeCount() > 0;
  if (want && !unloadAttached) {
    window.addEventListener("beforeunload", onBeforeUnload);
    unloadAttached = true;
  } else if (!want && unloadAttached) {
    window.removeEventListener("beforeunload", onBeforeUnload);
    unloadAttached = false;
  }
}

// ── the tracked write ────────────────────────────────────────────────────────────────────

let generation = 0;

/**
 * Record a cloud write as pending, run it NOW (synchronously, so callers see no change), retry
 * on failure, and settle the outbox entry on success. `send` must be a full-replace write that
 * is safe to repeat. Never throws.
 */
export function trackCloudWrite(
  uid: string,
  kind: OutboxKind,
  id: string,
  queuedAt: string,
  send: (isCurrent: () => boolean) => Promise<unknown>,
  opts: { body?: unknown; quiet?: boolean } = {},
): void {
  const key = keyOf(kind, id);
  const gen = ++generation;
  upsertEntry(uid, { kind, id, queuedAt, body: opts.body, quiet: opts.quiet });
  if (opts.quiet) quiet.add(key);
  else quiet.delete(key);
  inflight.set(key, gen);
  failed.delete(key);
  slow.delete(key);
  savedFlash = false;
  failedAcknowledged = false;
  publish();

  const run = (retry: number): void => {
    let p: Promise<unknown>;
    try {
      p = Promise.resolve(send(() => inflight.get(key) === gen));
    } catch (error) {
      p = Promise.reject(error);
    }
    p.then(
      (value) => {
        if (inflight.get(key) !== gen) return; // a newer write took over this id
        inflight.delete(key);
        slow.delete(key);
        quiet.delete(key);
        removeEntry(uid, kind, id);
        // Only a write that really reached the cloud (or found it already there, newer) earns the tick:
        // a re-send that had nothing to send must not claim "Saved to your account".
        const sentNothing = value === "no-local-copy" || value === "no-cloud" || value === "superseded" || opts.quiet === true;
        // "all done" is about the writes the student is told about: a quiet download in flight, or a
        // quiet failure, must not silence the tick for a graded result that really landed
        const loudLeft = (s: Iterable<string>) => Array.from(s).some((k) => !quiet.has(k));
        if (!sentNothing && !loudLeft(inflight.keys()) && !loudLeft(failed)) savedFlash = true;
        publish();
      },
      (error) => {
        if (inflight.get(key) !== gen) return;
        if (retry < RETRY_DELAYS_MS.length) {
          setTimeout(() => {
            if (inflight.get(key) === gen) run(retry + 1);
          }, RETRY_DELAYS_MS[retry]);
          return;
        }
        console.warn("[sessionRecords] cloud write failed; kept in the outbox for the next load / online", { kind, id, error });
        inflight.delete(key);
        slow.delete(key);
        failed.add(key);
        failedAcknowledged = false;
        publish();
      },
    );
  };
  run(0);
  setTimeout(() => {
    if (inflight.get(key) === gen) {
      slow.add(key);
      publish();
    }
  }, SLOW_AFTER_MS);
}

// ── drain: next app load for the uid, and the browser `online` event ────────────────────

let draining = false;

/**
 * Re-send every outbox entry that has no live attempt chain, from the body stored with the entry
 * (`resendOutboxEntry`, loaded on demand: nothing is imported unless the outbox has an entry).
 * Safe to call repeatedly.
 */
export async function drainOutbox(uid: string): Promise<void> {
  if (draining || !uid) return;
  const entries = readOutbox(uid).filter((e) => !inflight.has(keyOf(e.kind, e.id)));
  if (entries.length === 0) return;
  draining = true;
  try {
    const { resendOutboxEntry } = await import("./sessionRecords");
    for (const entry of entries) {
      if (inflight.has(keyOf(entry.kind, entry.id))) continue;
      trackCloudWrite(
        uid,
        entry.kind,
        entry.id,
        entry.queuedAt,
        async (isCurrent) => {
          const outcome: ResendOutcome = await resendOutboxEntry(uid, entry, isCurrent);
          return outcome;
        },
        { body: entry.body, quiet: entry.quiet },
      );
    }
  } catch (error) {
    console.warn("[sessionRecords] outbox drain could not start", error);
  } finally {
    draining = false;
  }
}

/**
 * Forget every in-memory chain and status: a different student is about to use this tab. The
 * running attempts finish on their own (their results are ignored: the generation no longer
 * matches), the localStorage entries stay under the uid they belong to, and the next student
 * starts with an idle line and no leave-page prompt that belongs to someone else.
 */
export function resetOutboxSession(): void {
  inflight.clear();
  failed.clear();
  slow.clear();
  quiet.clear();
  savedFlash = false;
  failedAcknowledged = false;
  publish();
}

/** Start the sync for a signed-in uid: drain now, and again on every `online`. Returns the cleanup. */
export function startOutboxSync(uid: string): () => void {
  if (typeof window === "undefined" || !uid) return () => {};
  void drainOutbox(uid);
  const onOnline = () => void drainOutbox(uid);
  window.addEventListener("online", onOnline);
  return () => {
    window.removeEventListener("online", onOnline);
    resetOutboxSession();
  };
}

/** Test seam: forget all in-memory state (the localStorage outbox is the test's to clear). */
export function __resetOutboxForTests(): void {
  inflight.clear();
  failed.clear();
  slow.clear();
  quiet.clear();
  savedFlash = false;
  failedAcknowledged = false;
  snapshot = { phase: "idle" };
  draining = false;
  if (typeof window !== "undefined" && unloadAttached) {
    window.removeEventListener("beforeunload", onBeforeUnload);
    unloadAttached = false;
  }
}
