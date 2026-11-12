/**
 * packTemplatePublish - SERVER-PDF-1 PR-A. The publishing rules for pack templates, against an abstract store (so they are tested
 * without Storage, and the uploader script only supplies the real bucket):
 *
 *   - a path outside `packs/` is refused (the key this runs with is Storage Object Admin on the WHOLE bucket; the guard is ours)
 *   - objects are content-addressed and never overwritten; an existing one is skipped
 *   - the manifest is only written when every template, bridge page set and paper it names is present and `validateManifest` is clean
 *   - `packs/current.json` is written LAST: until it moves, the server keeps serving the previous generation untouched
 */
import type { PlanBridge, PlanFile, PackUnitsDef } from "./packTemplateCore";
import {
  STORAGE_PREFIX,
  buildManifest,
  currentPointer,
  validateManifest,
  wsStorageJson,
  type ManifestFont,
  type PackManifest,
  type Sha,
  type TemplateFileMeta,
} from "./packTemplateManifest";
import { bridgeKeyOf, fileHashOf } from "./packTemplateManifest";

export interface TemplateStore {
  /** Object names under a prefix. */
  list(prefix: string): Promise<string[]>;
  read(path: string): Promise<Uint8Array | null>;
  /** `overwrite: false` -> an existing object is left alone (not an error). */
  write(path: string, data: Uint8Array | string, opts: { contentType: string; overwrite: boolean }): Promise<void>;
}

export const CURRENT_POINTER_PATH = `${STORAGE_PREFIX}current.json`;

export function assertPackPath(path: string): string {
  if (!path.startsWith(STORAGE_PREFIX) || path.includes("..") || path.includes("//") || path.includes("\\") || path.length > 300) {
    throw new Error(`refusing a path outside ${STORAGE_PREFIX}: ${path}`);
  }
  return path;
}

/** Wraps a store so that every operation passes `assertPackPath`. */
export function guardedStore(inner: TemplateStore): TemplateStore {
  return {
    list: (prefix) => inner.list(assertPackPath(prefix)),
    read: (path) => inner.read(assertPackPath(path)),
    write: (path, data, opts) => inner.write(assertPackPath(path), data, opts),
  };
}

const enc = new TextEncoder();
const dec = new TextDecoder();

export interface PublishInput {
  plan: readonly PlanFile[];
  bridges: readonly PlanBridge[];
  packDefs: readonly PackUnitsDef[];
  rendererVersion: string;
  fonts: ManifestFont[];
  createdAt: string;
  commit: string;
  sha: Sha;
}

export interface PublishResult {
  manifest: PackManifest;
  /** Every path written, in order (current.json is the last). */
  wrote: string[];
}

export async function publishManifest(rawStore: TemplateStore, input: PublishInput): Promise<PublishResult> {
  const store = guardedStore(rawStore);
  const { plan, bridges, rendererVersion, sha } = input;
  const have = new Set<string>([...(await store.list(`${STORAGE_PREFIX}files/`)), ...(await store.list(`${STORAGE_PREFIX}bridge/`))]);
  const metas: Record<string, TemplateFileMeta> = {};
  for (const f of plan) {
    const hash = fileHashOf(f, rendererVersion, sha);
    if (!have.has(`${STORAGE_PREFIX}files/${hash}.pdf`)) throw new Error(`template ${f.templateId} (${hash}) is not in storage`);
    const raw = await store.read(`${STORAGE_PREFIX}files/${hash}.meta.json`);
    if (!raw) throw new Error(`template ${f.templateId} has no meta`);
    metas[hash] = JSON.parse(dec.decode(raw)) as TemplateFileMeta;
  }
  const bridgeMetas: Record<string, { bytes: number; sha256: string }> = {};
  for (const b of bridges) {
    for (const card of [false, true]) {
      const key = bridgeKeyOf(b.data, card, rendererVersion, sha);
      if (bridgeMetas[key]) continue;
      if (!have.has(`${STORAGE_PREFIX}bridge/${key}.pdf`)) throw new Error(`bridge pages ${key} (${b.packId} ${b.templateId}) are not in storage`);
      const raw = await store.read(`${STORAGE_PREFIX}bridge/${key}.meta.json`);
      if (!raw) throw new Error(`bridge pages ${key} have no meta`);
      bridgeMetas[key] = JSON.parse(dec.decode(raw)) as { bytes: number; sha256: string };
    }
  }
  const manifest = buildManifest({ plan, bridges, packDefs: input.packDefs, metas, bridgeMetas, rendererVersion, fonts: input.fonts, createdAt: input.createdAt, commit: input.commit, sha });
  const problems = validateManifest(manifest, plan, input.packDefs);
  if (problems.length > 0) throw new Error(`manifest is not publishable:\n${problems.slice(0, 20).join("\n")}`);

  const wrote: string[] = [];
  const put = async (path: string, data: string, overwrite: boolean) => {
    await store.write(path, enc.encode(data), { contentType: "application/json", overwrite });
    wrote.push(path);
  };
  // 1. the papers exactly as drawn (R1: what a student's upload is graded against), content-addressed
  const seenWs = new Set<string>();
  for (const f of plan) {
    for (const p of f.papers) {
      const wsSha = manifest.papers[p.code].wsSha256;
      if (seenWs.has(wsSha)) continue;
      seenWs.add(wsSha);
      await put(manifest.papers[p.code].wsPath, wsStorageJson(p.ws), false);
    }
  }
  // 2. the manifest, content-addressed by its own hash
  await put(currentPointer(manifest).manifestPath, JSON.stringify(manifest), false);
  // 3. LAST: the pointer the server reads
  await put(CURRENT_POINTER_PATH, JSON.stringify(currentPointer(manifest)), true);
  return { manifest, wrote };
}

/** Uploads rendered objects that are not in the store yet (PDF first, then its meta, so a meta never exists without its PDF). */
export async function putRendered(rawStore: TemplateStore, objects: ReadonlyArray<{ path: string; data: Uint8Array; contentType: string }>): Promise<string[]> {
  const store = guardedStore(rawStore);
  const have = new Set<string>([...(await store.list(`${STORAGE_PREFIX}files/`)), ...(await store.list(`${STORAGE_PREFIX}bridge/`))]);
  const wrote: string[] = [];
  const ordered = [...objects].sort((a, b) => Number(a.path.endsWith(".meta.json")) - Number(b.path.endsWith(".meta.json")));
  for (const o of ordered) {
    if (have.has(o.path)) continue;
    await store.write(o.path, o.data, { contentType: o.contentType, overwrite: false });
    wrote.push(o.path);
  }
  return wrote;
}
