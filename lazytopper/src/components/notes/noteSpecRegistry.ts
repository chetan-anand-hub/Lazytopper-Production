/**
 * noteSpecRegistry — build-time ingestion of `notes/specs/*.json`.
 *
 * `import.meta.glob` (eager, non-recursive) bundles every authored spec at
 * build time and — because the pattern has no `**` — automatically excludes
 * the validator fixtures under `notes/specs/_test/`. New specs appear in the
 * app the moment their JSON lands in `notes/specs/`; no code change needed.
 *
 * Figure assets under `notes/assets/<topic>/<fig>.webp` are globbed as URLs;
 * a spec whose asset has not been extracted yet degrades to the honest
 * pending-figure frame inside <Note> (never a broken image).
 *
 * Runtime narrowing is deliberately light: `notes/validate_spec.py` is the
 * hard authoring gate; this only refuses to surface a JSON that is not
 * recognisably a spec, so a bad file can never crash the Topic Hub.
 */

import type { NoteSpec } from "./noteSpec.types";

const specModules = import.meta.glob("../../../../notes/specs/*.json", {
  eager: true,
  import: "default",
}) as Record<string, unknown>;

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

const specsByTopicKey: ReadonlyMap<string, NoteSpec> = (() => {
  const map = new Map<string, NoteSpec>();
  for (const value of Object.values(specModules)) {
    if (isNoteSpec(value)) map.set(value.meta.topic_key, value);
  }
  return map;
})();

/** The note-spec for a Topic Hub slug, or null → honest empty state. */
export function getNoteSpecForTopic(topicKey: string): NoteSpec | null {
  return specsByTopicKey.get(topicKey) ?? null;
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
