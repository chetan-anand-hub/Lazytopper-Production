/**
 * freeManifest - FREE-RES-1. The pure rules of the free-resources publish: validate a release's manifest.json against the files
 * actually downloaded, derive the download filenames, build the three STORE-only zips, and assemble `free/current.json`.
 * No network, no key, no clock: the same inputs always give the same bytes, so a re-run writes nothing new.
 *
 * Used by buildFreeResources.ts (verify + build, runs on dry runs too) and uploadFreeResources.ts (the only code that holds the key).
 *
 * ★ THE PATH GUARD LIVES HERE (assertFreePath): the key is Storage Object Admin on the whole bucket, so the limit is in code.
 *   Only free/files/<sha256>.pdf, free/zips/<sha256>/<group>.zip and free/current.json can ever be written.
 */
import { createHash } from "node:crypto";
import archiver from "archiver";

export const RESOURCE_KINDS = ["mcq_bank", "notes", "kit"] as const;
export const RESOURCE_SUBJECTS = ["Maths", "Science"] as const;
export type ResourceKind = (typeof RESOURCE_KINDS)[number];
export type ResourceSubject = (typeof RESOURCE_SUBJECTS)[number];
/** A "kit" (the Boards 2027 Excellence Kit) belongs to no one subject: its subject may be omitted or "All", and it is never part of a subject zip. */
export type ResourceSubjectOrAll = ResourceSubject | "All";
export const ZIP_GROUPS = ["maths", "science", "all"] as const;
export type ZipGroup = (typeof ZIP_GROUPS)[number];

/** One entry of the release's manifest.json (produced by the cofounder; validated here, never authored). */
export interface ReleaseResource {
  id: string;
  kind: ResourceKind;
  subject: ResourceSubjectOrAll;
  chapter: string;
  title: string;
  file: string;
  bytes: number;
  sha256: string;
  pages: number;
  questions: number | null;
}
export interface ReleaseManifest {
  version: 1;
  resources: ReleaseResource[];
}

/** An entry of free/current.json: the release entry with `file` replaced by the storage path (plus the download filename). */
export interface CurrentResource extends Omit<ReleaseResource, "file"> {
  path: string;
  filename: string;
}
export interface CurrentZip {
  id: string;
  group: ZipGroup;
  path: string;
  bytes: number;
  count: number;
  filename: string;
}
export interface CurrentManifest {
  version: 1;
  resources: CurrentResource[];
  zips: CurrentZip[];
}

export const sha256Hex = (data: string | Uint8Array): string => createHash("sha256").update(data).digest("hex");

const ID_RE = /^[a-z0-9][a-z0-9-]{0,80}$/;
const HEX_RE = /^[0-9a-f]{64}$/;
const FILE_RE = /^[A-Za-z0-9][A-Za-z0-9._ -]{0,150}\.pdf$/;
const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

export const CURRENT_PATH = "free/current.json";
export const filePath = (sha: string): string => `free/files/${sha}.pdf`;
export const zipPath = (memberListHash: string, group: ZipGroup): string => `free/zips/${memberListHash}/${group}.zip`;

/** The ONLY paths the uploader may write. Throws on anything else. */
export function assertFreePath(p: string): string {
  if (
    typeof p === "string" &&
    (p === CURRENT_PATH || /^free\/files\/[0-9a-f]{64}\.pdf$/.test(p) || /^free\/zips\/[0-9a-f]{64}\/(maths|science|all)\.zip$/.test(p))
  )
    return p;
  throw new Error(`refusing to touch a path outside free/: ${JSON.stringify(p).slice(0, 120)}`);
}

/** Validate manifest.json's SHAPE. Throws one Error listing every problem. Files are checked separately (verifyAssets). */
export function parseReleaseManifest(raw: unknown): ReleaseManifest {
  const problems: string[] = [];
  if (!isRecord(raw) || raw.version !== 1 || !Array.isArray(raw.resources)) throw new Error("manifest: expected { version: 1, resources: [...] }");
  if (raw.resources.length === 0) throw new Error("manifest: no resources");
  const ids = new Set<string>();
  const files = new Set<string>();
  const out: ReleaseResource[] = [];
  raw.resources.forEach((r, i) => {
    const at = `resources[${i}]`;
    if (!isRecord(r)) return void problems.push(`${at}: not an object`);
    const { id, kind, subject, chapter, title, file, bytes, sha256, pages, questions } = r;
    if (typeof id !== "string" || !ID_RE.test(id)) problems.push(`${at}: bad id`);
    else if (ids.has(id)) problems.push(`${at}: duplicate id ${id}`);
    else ids.add(id);
    if (!RESOURCE_KINDS.includes(kind as ResourceKind)) problems.push(`${at}: unknown kind ${JSON.stringify(kind)}`);
    const isKit = kind === "kit";
    if (isKit && (subject === undefined || subject === "All")) r.subject = "All";
    else if (!RESOURCE_SUBJECTS.includes(subject as ResourceSubject)) problems.push(`${at}: unknown subject ${JSON.stringify(subject)}`);
    if (isKit && (chapter === undefined || chapter === "")) r.chapter = typeof title === "string" ? title.slice(0, 120) : "";
    else if (typeof chapter !== "string" || !chapter.trim() || chapter.length > 120) problems.push(`${at}: bad chapter`);
    if (isKit && (typeof r.chapter !== "string" || !r.chapter.trim())) problems.push(`${at}: bad chapter`);
    if (typeof title !== "string" || !title.trim() || title.length > 200) problems.push(`${at}: bad title`);
    if (typeof file !== "string" || !FILE_RE.test(file)) problems.push(`${at}: bad file name`);
    else if (files.has(file)) problems.push(`${at}: duplicate file ${file}`);
    else files.add(file);
    if (typeof bytes !== "number" || !Number.isInteger(bytes) || bytes <= 0) problems.push(`${at}: bad bytes`);
    if (typeof sha256 !== "string" || !HEX_RE.test(sha256)) problems.push(`${at}: bad sha256`);
    if (typeof pages !== "number" || !Number.isInteger(pages) || pages <= 0) problems.push(`${at}: bad pages`);
    if (questions !== null && (typeof questions !== "number" || !Number.isInteger(questions) || questions < 0)) problems.push(`${at}: bad questions`);
    out.push(r as unknown as ReleaseResource);
  });
  if (problems.length) throw new Error(`manifest invalid:\n - ${problems.join("\n - ")}`);
  return { version: 1, resources: out };
}

/** Every listed asset must exist, match its byte size and sha256, and look like a PDF; no unlisted .pdf may be present. */
export function verifyAssets(manifest: ReleaseManifest, assets: ReadonlyMap<string, Uint8Array>): void {
  const problems: string[] = [];
  for (const r of manifest.resources) {
    const data = assets.get(r.file);
    if (!data) {
      problems.push(`${r.id}: asset ${r.file} is missing`);
      continue;
    }
    if (data.length !== r.bytes) problems.push(`${r.id}: ${r.file} is ${data.length} bytes, manifest says ${r.bytes}`);
    if (sha256Hex(data) !== r.sha256) problems.push(`${r.id}: ${r.file} sha256 does not match the manifest`);
    if (Buffer.from(data.subarray(0, 5)).toString("latin1") !== "%PDF-") problems.push(`${r.id}: ${r.file} is not a PDF`);
  }
  const listed = new Set(manifest.resources.map((r) => r.file));
  for (const name of assets.keys()) if (name.toLowerCase().endsWith(".pdf") && !listed.has(name)) problems.push(`unlisted asset ${name}`);
  if (problems.length) throw new Error(`assets invalid:\n - ${problems.join("\n - ")}`);
}

/** The download filename IS the release asset's own name (validated ASCII by FILE_RE, so it is header-safe). Chapter titles may carry ":" or "\u00b7"; they only ever appear in display text. */
export function downloadName(r: Pick<ReleaseResource, "file">): string {
  return r.file;
}

export const zipName = (group: ZipGroup): string => `LazyTopper-${group === "all" ? "Everything" : group === "maths" ? "Maths" : "Science"}-Free-Resources.zip`;

export function membersOf(group: ZipGroup, manifest: ReleaseManifest): ReleaseResource[] {
  return manifest.resources
    .filter((r) => r.kind !== "kit" && (group === "all" || r.subject.toLowerCase() === group))
    .slice()
    .sort((a, b) => downloadName(a).localeCompare(downloadName(b)));
}

/** sha256 over the sorted "<file sha256> <member name>" lines: what makes a zip's storage path content-addressed. */
export function memberListHash(members: readonly ReleaseResource[]): string {
  return sha256Hex(members.map((m) => `${m.sha256} ${downloadName(m)}`).join("\n"));
}

/** A STORE-only (no compression: PDFs are already compressed) zip with fixed dates and a sorted order, so the same members give the same bytes. */
export async function buildZip(members: readonly ReleaseResource[], assets: ReadonlyMap<string, Uint8Array>): Promise<Buffer> {
  const archive = archiver("zip", { store: true });
  const chunks: Buffer[] = [];
  archive.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<void>((resolve, reject) => {
    archive.on("end", () => resolve());
    archive.on("error", reject);
  });
  const fixed = new Date(Date.UTC(2026, 0, 1, 0, 0, 0));
  for (const m of members) {
    const data = assets.get(m.file);
    if (!data) throw new Error(`zip: asset ${m.file} is missing`);
    archive.append(Buffer.from(data), { name: downloadName(m), date: fixed, mode: 0o644 });
  }
  await archive.finalize();
  await done;
  return Buffer.concat(chunks);
}

export interface BuiltZip {
  group: ZipGroup;
  path: string;
  data: Buffer;
  count: number;
}

/** Everything the upload step needs: the three zips (built) and the finished free/current.json (as an object). */
export async function planFreeRelease(manifest: ReleaseManifest, assets: ReadonlyMap<string, Uint8Array>): Promise<{ current: CurrentManifest; zips: BuiltZip[] }> {
  verifyAssets(manifest, assets);
  const resources: CurrentResource[] = manifest.resources.map((r) => {
    const { file: _file, ...rest } = r;
    void _file;
    return { ...rest, path: filePath(r.sha256), filename: downloadName(r) };
  });
  const zips: BuiltZip[] = [];
  const entries: CurrentZip[] = [];
  for (const group of ZIP_GROUPS) {
    const members = membersOf(group, manifest);
    if (members.length === 0) continue; // a subject with nothing yet gets no zip entry (honest, never an empty zip)
    const data = await buildZip(members, assets);
    const p = zipPath(memberListHash(members), group);
    zips.push({ group, path: p, data, count: members.length });
    entries.push({ id: `zip-${group}`, group, path: p, bytes: data.length, count: members.length, filename: zipName(group) });
  }
  return { current: { version: 1, resources, zips: entries }, zips };
}
