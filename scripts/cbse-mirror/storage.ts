/**
 * storage — the only code that can write to the bucket, and the rule that it may
 * write ONLY under `cbse/` (C1).
 *
 * ★ firebase-admin IS LOADED WITH createRequire, NOT IMPORTED (spec P18, measured
 * 2026-09-26). It is a dependency of the `lazytopper` workspace only, and pnpm does
 * not hoist it: `node_modules/firebase-admin` does not exist at the repo root, so a
 * bare import from `scripts/` fails. Anchoring `createRequire` on
 * `lazytopper/package.json` resolves the copy that workspace already installs
 * (13.7.0) — no new dependency, no lockfile change.
 *
 * ★ THE KEY NEVER TOUCHES DISK. The service-account JSON arrives in an environment
 * variable scoped to one workflow step, is parsed in memory and handed to `cert()`.
 * Nothing here writes it, logs it or echoes it.
 */
import { createRequire } from "node:module";
import { join } from "node:path";

import { MANIFEST_PATH, STORAGE_PREFIX } from "./papers";

export type ObjectMeta = {
  readonly contentType: string;
  readonly cacheControl: string;
  readonly contentDisposition?: string;
};

export interface MirrorStorage {
  /** The current manifest's JSON, or null when there is none yet. */
  readManifest(): Promise<unknown | null>;
  save(path: string, body: Uint8Array, meta: ObjectMeta): Promise<void>;
  copy(from: string, to: string): Promise<void>;
  remove(path: string): Promise<void>;
}

export function assertCbsePath(path: string): void {
  if (!path.startsWith(STORAGE_PREFIX) || path.includes("..") || path.includes("//")) {
    throw new Error(`cbse-mirror: refusing to touch "${path}" — this job writes only under ${STORAGE_PREFIX}`);
  }
}

/** Wraps any storage so every WRITE path is checked against the `cbse/` rule. */
export function guardedStorage(inner: MirrorStorage): MirrorStorage {
  return {
    readManifest: () => inner.readManifest(),
    async save(path, body, meta) {
      assertCbsePath(path);
      await inner.save(path, body, meta);
    },
    async copy(from, to) {
      assertCbsePath(from);
      assertCbsePath(to);
      await inner.copy(from, to);
    },
    async remove(path) {
      assertCbsePath(path);
      await inner.remove(path);
    },
  };
}

export function publicObjectUrl(bucket: string, path: string): string {
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media`;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/**
 * Reads the manifest through its PUBLIC url (the objects are public-read), so a
 * dry run needs no credential at all. Writing is impossible through this object:
 * every write method throws.
 */
export function readOnlyStorage(bucket: string, fetchImpl: FetchLike = fetch): MirrorStorage {
  const refuse = async (): Promise<never> => {
    throw new Error("cbse-mirror: read-only storage (dry run) was asked to write");
  };
  return {
    async readManifest() {
      const response = await fetchImpl(`${publicObjectUrl(bucket, MANIFEST_PATH)}&cb=${Date.now()}`, {
        signal: AbortSignal.timeout(30_000),
      });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`reading the manifest failed: HTTP ${response.status}`);
      return (await response.json()) as unknown;
    },
    save: refuse,
    copy: refuse,
    remove: refuse,
  };
}

type AdminFile = {
  exists(): Promise<[boolean]>;
  download(): Promise<[Buffer]>;
  save(data: Buffer, options: Record<string, unknown>): Promise<void>;
  copy(destination: AdminFile): Promise<unknown>;
  delete(options?: Record<string, unknown>): Promise<unknown>;
};
type AdminBucket = { file(path: string): AdminFile };

export function firebaseStorage(options: {
  readonly repoRoot: string;
  readonly serviceAccountJson: string;
  readonly bucket: string;
}): MirrorStorage {
  let credentials: Record<string, unknown>;
  try {
    credentials = JSON.parse(options.serviceAccountJson) as Record<string, unknown>;
  } catch {
    // Deliberately says nothing about the value — it is a secret.
    throw new Error("cbse-mirror: FIREBASE_SERVICE_ACCOUNT is not valid JSON");
  }
  const requireFromApp = createRequire(join(options.repoRoot, "lazytopper", "package.json"));
  const adminApp = requireFromApp("firebase-admin/app") as {
    initializeApp(options: Record<string, unknown>, name?: string): unknown;
    cert(credentials: Record<string, unknown>): unknown;
  };
  const adminStorage = requireFromApp("firebase-admin/storage") as {
    getStorage(app: unknown): { bucket(name: string): AdminBucket };
  };
  const app = adminApp.initializeApp(
    { credential: adminApp.cert(credentials), storageBucket: options.bucket },
    "cbse-mirror",
  );
  const bucket = adminStorage.getStorage(app).bucket(options.bucket);

  return guardedStorage({
    async readManifest() {
      const file = bucket.file(MANIFEST_PATH);
      const [exists] = await file.exists();
      if (!exists) return null;
      const [data] = await file.download();
      return JSON.parse(data.toString("utf8")) as unknown;
    },
    async save(path, body, meta) {
      await bucket.file(path).save(Buffer.from(body), {
        resumable: false,
        contentType: meta.contentType,
        metadata: {
          contentType: meta.contentType,
          cacheControl: meta.cacheControl,
          ...(meta.contentDisposition ? { contentDisposition: meta.contentDisposition } : {}),
        },
      });
    },
    async copy(from, to) {
      await bucket.file(from).copy(bucket.file(to));
    },
    async remove(path) {
      await bucket.file(path).delete({ ignoreNotFound: true });
    },
  });
}
