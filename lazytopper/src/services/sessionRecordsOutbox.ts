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
//   1. an OUTBOX per uid in localStorage: the record IDS still to be confirmed in the cloud
//      (the bodies are already mirrored by `sessionRecords.ts`). The entry is written BEFORE
//      the first send, so a tab closed mid-save leaves it behind;
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
}

/** What `sessionRecords.ts` reports for a re-send. Every outcome but a throw settles the entry. */
export type ResendOutcome = "sent" | "cloud-newer" | "no-local-copy" | "no-cloud";

export type SavePhase = "idle" | "saving" | "saved" | "device-only";
export interface SaveStatusSnapshot {
  phase: SavePhase;
}

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

function writeOutbox(uid: string, list: OutboxEntry[]): void {
  if (typeof window === "undefined" || !uid) return;
  try {
    if (list.length === 0) window.localStorage.removeItem(STORAGE_PREFIX + uid);
    else window.localStorage.setItem(STORAGE_PREFIX + uid, JSON.stringify(list));
  } catch {
    /* quota / private mode — the in-memory retry still runs; the mirror is the local copy */
  }
}

function upsertEntry(uid: string, entry: OutboxEntry): void {
  writeOutbox(uid, [...readOutbox(uid).filter((e) => keyOf(e.kind, e.id) !== keyOf(entry.kind, entry.id)), entry]);
}

function removeEntry(uid: string, kind: OutboxKind, id: string): void {
  writeOutbox(uid, readOutbox(uid).filter((e) => keyOf(e.kind, e.id) !== keyOf(kind, id)));
}

// ── status store (read by the UI via useSyncExternalStore) ───────────────────────────────

const inflight = new Map<string, number>(); // key -> generation of the live attempt chain
const failed = new Set<string>(); // keys whose last chain ended in a failure (entry stays queued)
let savedFlash = false;
let failedAcknowledged = false; // the student pressed OK on the device-only line
let snapshot: SaveStatusSnapshot = { phase: "idle" };
const listeners = new Set<() => void>();

function computePhase(): SavePhase {
  if (inflight.size > 0) return "saving";
  if (failed.size > 0 && !failedAcknowledged) return "device-only";
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
  return inflight.size;
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
  const want = inflight.size > 0;
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
  send: () => Promise<unknown>,
): void {
  const key = keyOf(kind, id);
  const gen = ++generation;
  upsertEntry(uid, { kind, id, queuedAt });
  inflight.set(key, gen);
  failed.delete(key);
  savedFlash = false;
  failedAcknowledged = false;
  publish();

  const run = (retry: number): void => {
    let p: Promise<unknown>;
    try {
      p = Promise.resolve(send());
    } catch (error) {
      p = Promise.reject(error);
    }
    p.then(
      () => {
        if (inflight.get(key) !== gen) return; // a newer write took over this id
        inflight.delete(key);
        removeEntry(uid, kind, id);
        if (inflight.size === 0 && failed.size === 0) savedFlash = true;
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
        failed.add(key);
        failedAcknowledged = false;
        publish();
      },
    );
  };
  run(0);
}

// ── drain: next app load for the uid, and the browser `online` event ────────────────────

let draining = false;

/**
 * Re-send every outbox entry that has no live attempt chain. The bodies come from the
 * localStorage mirror via `resendOutboxEntry` (loaded on demand: nothing is imported unless
 * the outbox has an entry). Safe to call repeatedly.
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
      trackCloudWrite(uid, entry.kind, entry.id, entry.queuedAt, async () => {
        const outcome: ResendOutcome = await resendOutboxEntry(uid, entry);
        return outcome;
      });
    }
  } catch (error) {
    console.warn("[sessionRecords] outbox drain could not start", error);
  } finally {
    draining = false;
  }
}

/** Start the sync for a signed-in uid: drain now, and again on every `online`. Returns the cleanup. */
export function startOutboxSync(uid: string): () => void {
  if (typeof window === "undefined" || !uid) return () => {};
  void drainOutbox(uid);
  const onOnline = () => void drainOutbox(uid);
  window.addEventListener("online", onOnline);
  return () => window.removeEventListener("online", onOnline);
}

/** Test seam: forget all in-memory state (the localStorage outbox is the test's to clear). */
export function __resetOutboxForTests(): void {
  inflight.clear();
  failed.clear();
  savedFlash = false;
  failedAcknowledged = false;
  snapshot = { phase: "idle" };
  draining = false;
  if (typeof window !== "undefined" && unloadAttached) {
    window.removeEventListener("beforeunload", onBeforeUnload);
    unloadAttached = false;
  }
}
