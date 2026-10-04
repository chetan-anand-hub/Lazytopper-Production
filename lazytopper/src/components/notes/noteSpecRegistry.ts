/**
 * noteSpecRegistry — ingestion of `notes/specs/*.json`, ONE CHAPTER AT A TIME.
 *
 * `import.meta.glob` (non-recursive) finds every authored spec at build time and —
 * because the pattern has no `**` — automatically excludes the validator fixtures under
 * `notes/specs/_test/`. New specs appear in the app the moment their JSON lands in
 * `notes/specs/`; no code change needed.
 *
 * ★ LOW-END-1 (L4) — EACH SPEC IS ITS OWN CHUNK, LOADED ON DEMAND.
 * The glob used to be `eager`, which bundled all 26 specs (~780 KB of JSON) into every
 * Notes and Topic Hub page, although a page shows one chapter (LOW-END-SCOUT-1 P7). The
 * glob is now lazy: each `<slug>.json` is a separate chunk, keyed by its FILENAME (which
 * must equal its `meta.topic_key` — noteSpecRegistry.test.ts pins that for every spec).
 * The pattern is BANK-SPLIT-1's "await at the boundary, sync inside"
 * (`data/bankChapters/loader.ts` + `useBankChapters.ts`):
 *   - a page awaits its chapter through `useNoteSpec(slug)` (or `ensureNoteSpec`), which
 *     re-renders when the chunk lands;
 *   - `getNoteSpecForTopic` stays SYNCHRONOUS and reads the cache — null until loaded;
 *   - `hasNoteSpec` answers "is there a spec for this slug?" from the file list alone,
 *     with no download, for the Topic Hub's Notes button.
 *
 * Figure assets under `notes/assets/<topic>/<fig>.webp` are globbed as URLs (strings,
 * eagerly — they are tiny); a spec whose asset has not been extracted yet degrades to the
 * honest pending-figure frame inside <Note> (never a broken image).
 *
 * Runtime narrowing is deliberately light: `notes/validate_spec.py` is the
 * hard authoring gate; this only refuses to surface a JSON that is not
 * recognisably a spec, so a bad file can never crash the Topic Hub.
 */

import { useEffect, useReducer, useState } from "react";
import type { NoteSpec } from "./noteSpec.types";

const specLoaders = import.meta.glob("../../../../notes/specs/*.json", {
  import: "default",
}) as Record<string, () => Promise<unknown>>;

const assetModules = import.meta.glob(
  "../../../../notes/assets/**/*.{webp,png,svg}",
  { eager: true, import: "default", query: "?url" },
) as Record<string, string>;

function isNoteSpec(value: unknown): value is NoteSpec {
  if (typeof value !== "object" || value === null) return false;
  const spec = value as Partial<NoteSpec>;
  return (
    typeof spec.schema_version === "string" &&
    typeof spec.meta === "object" &&
    spec.meta !== null &&
    typeof spec.meta.topic_key === "string" &&
    spec.meta.topic_key.length > 0 &&
    Array.isArray(spec.definitions)
  );
}

/** `../../../../notes/specs/electricity.json` → `electricity`. */
function slugOfSpecPath(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1).replace(/\.json$/, "");
}

const loaderBySlug: ReadonlyMap<string, () => Promise<unknown>> = new Map(
  Object.entries(specLoaders).map(([path, load]) => [slugOfSpecPath(path), load]),
);

/** Settled loads: the spec, or null for a file that is not recognisably this slug's spec. */
const loaded = new Map<string, NoteSpec | null>();
const inflight = new Map<string, Promise<NoteSpec | null>>();

/** Every slug that has an authored spec file (no download). */
export function noteSpecSlugs(): string[] {
  return [...loaderBySlug.keys()];
}

/** Whether `topicKey` has an authored spec file — answered without loading it. */
export function hasNoteSpec(topicKey: string): boolean {
  return loaderBySlug.has(topicKey);
}

/** Whether `ensureNoteSpec(topicKey)` has settled (a slug with no spec file counts as settled). */
export function isNoteSpecLoaded(topicKey: string): boolean {
  return !loaderBySlug.has(topicKey) || loaded.has(topicKey);
}

/**
 * Load the spec for a Topic Hub slug (its own chunk). Resolves to the spec, or null when
 * there is none (or the file is not a valid spec for that slug). Rejects only when the
 * chunk itself fails to load (offline, a stale deploy) — and a later call retries.
 */
export function ensureNoteSpec(topicKey: string): Promise<NoteSpec | null> {
  if (loaded.has(topicKey)) return Promise.resolve(loaded.get(topicKey) ?? null);
  const load = loaderBySlug.get(topicKey);
  if (!load) return Promise.resolve(null);
  let pending = inflight.get(topicKey);
  if (!pending) {
    pending = load().then(
      (value) => {
        const spec = isNoteSpec(value) && value.meta.topic_key === topicKey ? value : null;
        loaded.set(topicKey, spec);
        inflight.delete(topicKey);
        return spec;
      },
      (error: unknown) => {
        inflight.delete(topicKey);
        throw error;
      },
    );
    inflight.set(topicKey, pending);
  }
  return pending;
}

/** Load every authored spec (tests and build-side checks only — never a page). */
export async function ensureAllNoteSpecs(): Promise<void> {
  await Promise.all(noteSpecSlugs().map((slug) => ensureNoteSpec(slug)));
}

/**
 * The note-spec for a Topic Hub slug, or null → honest empty state. SYNCHRONOUS: reads
 * what `ensureNoteSpec` / `useNoteSpec` loaded, so it is null until the chunk has landed.
 */
export function getNoteSpecForTopic(topicKey: string): NoteSpec | null {
  return loaded.get(topicKey) ?? null;
}

export interface NoteSpecState {
  /** The spec once loaded; null while loading, when there is none, or on error. */
  spec: NoteSpec | null;
  /** The load has settled (spec or confirmed none). False while the chunk is in flight. */
  ready: boolean;
  /** The chunk failed to load. Show an honest error, never "not found". */
  error: unknown;
}

/**
 * Await one chapter's spec at the page boundary and re-render when it lands. `null` /
 * `undefined` requests nothing (ready, no spec) — e.g. a Topic Hub that has not been asked
 * for its notes yet.
 */
export function useNoteSpec(topicKey: string | null | undefined): NoteSpecState {
  const key = topicKey ?? "";
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const [failed, setFailed] = useState<{ key: string; error: unknown } | null>(null);
  const ready = !key || isNoteSpecLoaded(key);

  useEffect(() => {
    if (!key || isNoteSpecLoaded(key)) return;
    let live = true;
    ensureNoteSpec(key).then(
      () => {
        if (live) rerender();
      },
      (error: unknown) => {
        if (live) setFailed({ key, error });
      },
    );
    return () => {
      live = false;
    };
  }, [key]);

  return {
    spec: key ? getNoteSpecForTopic(key) : null,
    ready,
    error: !ready && failed?.key === key ? failed.error : null,
  };
}

/**
 * Resolve a spec figure `asset` path (e.g. "light/fig_99.webp") to a bundled
 * URL, or null when the asset has not been extracted into notes/assets/ yet.
 */
export function getNoteAssetUrl(assetPath: string | null | undefined): string | null {
  if (!assetPath) return null;
  const suffix = `/notes/assets/${assetPath}`;
  for (const [modulePath, url] of Object.entries(assetModules)) {
    if (modulePath.endsWith(suffix)) return url;
  }
  return null;
}
