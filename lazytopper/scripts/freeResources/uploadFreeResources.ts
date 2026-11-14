/**
 * uploadFreeResources - FREE-RES-1. The ONLY place the free resources leave the CI machine. Used by .github/workflows/free-resources.yml.
 *
 *   tsx scripts/freeResources/uploadFreeResources.ts --assets <release dir> [--dry-run]
 *
 * SAFETY (the key is Storage Object Admin on the whole bucket, so the limits live here): the release is verified AGAIN here
 * (sha256 + size against manifest.json) before anything is written; every path passes assertFreePath (free/ only); objects are
 * content-addressed and written with ifGenerationMatch=0 (never overwritten); free/current.json is written LAST and only when every
 * object before it is in place. Credentials: FIREBASE_SERVICE_ACCOUNT (the repo secret, JSON), FIREBASE_STORAGE_BUCKET. The key is read
 * from the environment, parsed in memory, never echoed and never written to a file. Without it only --dry-run works.
 */
import { cert, initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { assertFreePath, CURRENT_PATH, planFreeRelease } from "./freeManifest";
import { loadRelease } from "./loadRelease";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const dryRun = process.argv.includes("--dry-run");

export interface FreeStore {
  write(p: string, data: Uint8Array | string, opts: { contentType: string; overwrite: boolean }): Promise<"written" | "exists">;
}

function gcsStore(): FreeStore {
  const key = process.env.FIREBASE_SERVICE_ACCOUNT;
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
  if (!key || !bucketName) throw new Error("FIREBASE_SERVICE_ACCOUNT and FIREBASE_STORAGE_BUCKET are required (or pass --dry-run)");
  const app = initializeApp({ credential: cert(JSON.parse(key)), storageBucket: bucketName });
  const bucket = getStorage(app).bucket();
  return {
    async write(p, data, opts) {
      assertFreePath(p);
      try {
        await bucket.file(p).save(Buffer.from(typeof data === "string" ? new TextEncoder().encode(data) : data), {
          contentType: opts.contentType,
          resumable: false,
          // private: no public ACL, no download token; only the server (admin SDK) reads these
          metadata: { cacheControl: "private, max-age=0" },
          preconditionOpts: opts.overwrite ? undefined : { ifGenerationMatch: 0 },
        });
        return "written";
      } catch (e) {
        if (!opts.overwrite && (e as { code?: number }).code === 412) return "exists"; // already there: content-addressed, so identical
        throw e;
      }
    },
  };
}

/** Publish a verified release through `store`. current.json is the last write. */
export async function publishFree(store: FreeStore, release: ReturnType<typeof loadRelease>): Promise<{ wrote: string[]; kept: string[] }> {
  const { current, zips } = await planFreeRelease(release.manifest, release.assets);
  const wrote: string[] = [];
  const kept: string[] = [];
  const put = async (p: string, data: Uint8Array | string, contentType: string, overwrite = false): Promise<void> => {
    assertFreePath(p);
    ((await store.write(p, data, { contentType, overwrite })) === "written" ? wrote : kept).push(p);
  };
  for (const r of release.manifest.resources) {
    const data = release.assets.get(r.file);
    if (!data) throw new Error(`asset ${r.file} vanished`);
    const entry = current.resources.find((c) => c.id === r.id);
    if (!entry) throw new Error(`no current entry for ${r.id}`);
    await put(entry.path, data, "application/pdf");
  }
  for (const z of zips) await put(z.path, z.data, "application/zip");
  await put(CURRENT_PATH, `${JSON.stringify(current, null, 2)}\n`, "application/json", true); // LAST
  return { wrote, kept };
}

async function main(): Promise<void> {
  const dir = arg("assets");
  if (!dir) throw new Error("usage: --assets <release dir> [--dry-run]");
  const release = loadRelease(dir);
  const store: FreeStore = dryRun
    ? {
        async write(p, data) {
          console.log(`[dry-run] would write ${assertFreePath(p)} (${data.length} bytes)`);
          return "written";
        },
      }
    : gcsStore();
  const { wrote, kept } = await publishFree(store, release);
  console.log(`published: ${wrote.length} written, ${kept.length} already present, ${CURRENT_PATH} last`);
}

// Only run as a CLI (the tests import publishFree).
if (process.argv[1] && /uploadFreeResources\.[tj]s$/.test(process.argv[1])) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
