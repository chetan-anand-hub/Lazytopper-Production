import type { ConfirmedDetection } from "../utils/checkImproveDetection";

/**
 * ACTIVATION-1 · L2 — the in-progress Check & Improve question and answer survive the
 * sign-in round trip, IN THIS TAB ONLY.
 *
 * ── WHAT IT IS (and what it is not) ──────────────────────────────────────────
 * A signed-out visitor types or photographs a question, attaches their answer, then signs
 * up — and used to come back to an EMPTY page (only an already-graded free-check result
 * was replayed; see freeCheckClient.ts). This is the missing piece for the UN-graded
 * input. No store for it existed (P9), so this is the one.
 *
 *   - TEXT + the confirmed detection  -> `sessionStorage['lazytopper.ci.draft.v1']`.
 *     sessionStorage is per TAB and survives same-tab navigation (the /login round trip,
 *     the Google popup, the phone OTP). A new tab, a closed tab, a shared device's next
 *     visitor: nothing.
 *   - IMAGES (question photo, answer photo) -> IndexedDB, keyed by the draft id held in
 *     sessionStorage. sessionStorage's ~5 MB cap would not hold two phone photos. Every
 *     image record carries its own `savedAt`, and any record older than the 30-minute
 *     window is purged on the next open — so a closed tab cannot leave a photo behind.
 *   - NEVER localStorage (answer content is not written there), and NEVER sent to any
 *     server: this module has no network code. The student still taps Check.
 *
 * Cleared on restore, on submit, and after 30 minutes. If IndexedDB is unavailable the
 * text still restores and the photos are honestly absent — nothing is invented.
 */

export const CI_DRAFT_KEY = "lazytopper.ci.draft.v1";
export const CI_DRAFT_MAX_AGE_MS = 30 * 60 * 1000;

export type CiDraftFields = {
  questionTab: "type" | "upload";
  question: string;
  qImageMime: string;
  qImageName: string;
  tab: string;
  textAnswer: string;
  imageMime: string;
  imageName: string;
  detected: ConfirmedDetection | null;
  confirmed: ConfirmedDetection | null;
};

export type CiDraftImages = {
  qImageBase64: string | null;
  imageBase64: string | null;
};

type StoredDraft = CiDraftFields & {
  v: 1;
  id: string;
  savedAt: number;
  hasQImage: boolean;
  hasAnswerImage: boolean;
};

export type RestoredCiDraft = { fields: CiDraftFields; images: CiDraftImages };

/** The image half. IndexedDB in the browser; an in-memory fake in tests. */
export interface CiDraftImageStore {
  put(id: string, slot: "q" | "a", data: string, savedAt: number): Promise<void>;
  get(id: string, slot: "q" | "a"): Promise<string | null>;
  deleteId(id: string): Promise<void>;
  purgeOlderThan(cutoff: number): Promise<void>;
}

const DB_NAME = "lazytopper.ciDraft";
const STORE = "images";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function runTx<T>(
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | undefined> {
  return openDb().then(
    (db) =>
      new Promise<T | undefined>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = work(tx.objectStore(STORE));
        tx.oncomplete = () => {
          db.close();
          resolve(req ? (req.result as T) : undefined);
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
        tx.onabort = () => {
          db.close();
          reject(tx.error);
        };
      }),
  );
}

const indexedDbImageStore: CiDraftImageStore = {
  async put(id, slot, data, savedAt) {
    await runTx("readwrite", (s) => s.put({ data, savedAt }, `${id}:${slot}`));
  },
  async get(id, slot) {
    const rec = await runTx<{ data?: unknown } | undefined>("readonly", (s) =>
      s.get(`${id}:${slot}`),
    );
    return rec && typeof rec.data === "string" ? rec.data : null;
  },
  async deleteId(id) {
    await runTx("readwrite", (s) => {
      s.delete(`${id}:q`);
      s.delete(`${id}:a`);
    });
  },
  async purgeOlderThan(cutoff) {
    await runTx("readwrite", (s) => {
      const cursorReq = s.openCursor();
      cursorReq.onsuccess = () => {
        const cur = cursorReq.result;
        if (!cur) return;
        const rec = cur.value as { savedAt?: unknown } | undefined;
        if (!rec || typeof rec.savedAt !== "number" || rec.savedAt < cutoff) cur.delete();
        cur.continue();
      };
    });
  },
};

let imageStore: CiDraftImageStore = indexedDbImageStore;

/** Test seam: swap the image store (null restores IndexedDB). */
export function __setCiDraftImageStoreForTests(store: CiDraftImageStore | null): void {
  imageStore = store ?? indexedDbImageStore;
  lastPut.clear();
}

/**
 * The image strings already written for the live draft id — a re-save skips an UNCHANGED photo,
 * but only for REFRESH_IMAGE_MS: each record carries its own `savedAt` and the age sweep deletes
 * any record past the window, so a photo in a long editing session is re-stamped now and then
 * rather than being swept out from under a draft that is still alive.
 */
const lastPut = new Map<string, { data: string; at: number }>();
const REFRESH_IMAGE_MS = 10 * 60 * 1000;

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

function newId(now: number): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through */
  }
  return `d${now.toString(36)}`;
}

function parse(raw: string | null): StoredDraft | null {
  if (!raw) return null;
  try {
    const d = JSON.parse(raw) as Partial<StoredDraft> | null;
    if (!d || d.v !== 1 || typeof d.id !== "string" || typeof d.savedAt !== "number") return null;
    return d as StoredDraft;
  } catch {
    return null;
  }
}

function hasContent(f: CiDraftFields, i: CiDraftImages): boolean {
  return (
    f.question.trim().length > 0 ||
    f.textAnswer.trim().length > 0 ||
    Boolean(i.qImageBase64) ||
    Boolean(i.imageBase64)
  );
}

/**
 * Sweep expired photos on page load, signed in or out: a tab that died with a draft in it must
 * not leave a photo on the device. A no-op where there is no IndexedDB (and then it never reads
 * the clock).
 */
export async function sweepExpiredCiDraftImages(nowArg?: number): Promise<void> {
  if (imageStore === indexedDbImageStore && typeof indexedDB === "undefined") return;
  const now = nowArg ?? Date.now();
  try {
    await imageStore.purgeOlderThan(now - CI_DRAFT_MAX_AGE_MS);
  } catch {
    /* nothing to sweep */
  }
}

/** Remove the draft and its photos. Safe to call at any time. */
export function clearCiDraft(): void {
  const s = storage();
  const d = s ? parse(s.getItem(CI_DRAFT_KEY)) : null;
  try {
    s?.removeItem(CI_DRAFT_KEY);
  } catch {
    /* nothing to clear */
  }
  lastPut.clear();
  if (d) void imageStore.deleteId(d.id).catch(() => undefined);
}

/**
 * Save the in-progress input. Empty input clears instead (a blank form is not a draft).
 * Fire-and-forget on the image half: the text is committed synchronously.
 */
export function saveCiDraft(
  fields: CiDraftFields,
  images: CiDraftImages,
  nowArg?: number,
): void {
  const s = storage();
  if (!s) return;
  if (!hasContent(fields, images)) {
    clearCiDraft();
    return;
  }
  const now = nowArg ?? Date.now();
  const prev = parse(s.getItem(CI_DRAFT_KEY));
  const id = prev?.id ?? newId(now);
  const stored: StoredDraft = {
    ...fields,
    v: 1,
    id,
    savedAt: now,
    hasQImage: Boolean(images.qImageBase64),
    hasAnswerImage: Boolean(images.imageBase64),
  };
  try {
    s.setItem(CI_DRAFT_KEY, JSON.stringify(stored));
  } catch {
    return;
  }
  void imageStore.purgeOlderThan(now - CI_DRAFT_MAX_AGE_MS).catch(() => undefined);
  const slots: Array<["q" | "a", string | null]> = [
    ["q", images.qImageBase64],
    ["a", images.imageBase64],
  ];
  for (const [slot, data] of slots) {
    const mapKey = `${id}:${slot}`;
    if (!data) {
      lastPut.delete(mapKey);
      continue;
    }
    const done = lastPut.get(mapKey);
    if (done && done.data === data && now - done.at < REFRESH_IMAGE_MS) continue;
    lastPut.set(mapKey, { data, at: now });
    void imageStore.put(id, slot, data, now).catch(() => lastPut.delete(mapKey));
  }
}

/**
 * Take the draft back, once. Returns null when there is none or it is older than 30 minutes
 * (an expired draft is cleared). A valid draft is CLEARED as it is returned — restore is
 * one-shot, so it can never reappear after the student edits, submits or leaves.
 */
export async function takeCiDraft(nowArg?: number): Promise<RestoredCiDraft | null> {
  const s = storage();
  if (!s) return null;
  const d = parse(s.getItem(CI_DRAFT_KEY));
  if (!d) {
    if (s.getItem(CI_DRAFT_KEY) !== null) clearCiDraft();
    return null;
  }
  // The clock is read only once there IS a draft to age — a page mount with nothing saved
  // (nearly every visit) never touches it.
  const now = nowArg ?? Date.now();
  if (now - d.savedAt > CI_DRAFT_MAX_AGE_MS || d.savedAt > now + 60_000) {
    clearCiDraft();
    return null;
  }
  let qImageBase64: string | null = null;
  let imageBase64: string | null = null;
  try {
    if (d.hasQImage) qImageBase64 = await imageStore.get(d.id, "q");
    if (d.hasAnswerImage) imageBase64 = await imageStore.get(d.id, "a");
  } catch {
    /* IndexedDB unavailable: the text still restores, the photos are honestly absent */
  }
  clearCiDraft();
  const fields: CiDraftFields = {
    questionTab: d.questionTab,
    question: d.question,
    qImageMime: d.qImageMime,
    qImageName: d.qImageName,
    tab: d.tab,
    textAnswer: d.textAnswer,
    imageMime: d.imageMime,
    imageName: d.imageName,
    detected: d.detected,
    confirmed: d.confirmed,
  };
  // A question that was read from a photo whose photo did not come back is NOT "confirmed":
  // grading would run against a question it never received. The student re-reads it.
  if (d.hasQImage && !qImageBase64) {
    fields.detected = null;
    fields.confirmed = null;
  }
  return { fields, images: { qImageBase64, imageBase64 } };
}
