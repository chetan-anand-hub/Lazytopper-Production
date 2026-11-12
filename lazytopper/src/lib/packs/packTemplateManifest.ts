/**
 * packTemplateManifest - SERVER-PDF-1 PR-A. The manifest of one generation of pack templates, and the checks that make it trustworthy.
 *
 * Storage layout (all under packs/ - the uploader refuses anything else; objects are CONTENT-ADDRESSED so a re-run never rewrites one):
 *   packs/files/<fileHash>.pdf       a template (cover, 2 blank bridge pages, body, footer - buyer text left blank)
 *   packs/files/<fileHash>.meta.json {bytes, sha256, pages, marks} written with the PDF
 *   packs/bridge/<key>.pdf           pages 2-3 of a pack's file, with or without the Board Pass card (the server swaps them in)
 *   packs/ws/<sha256>.json           one paper exactly as drawn: what the buyer's upload is graded against (R1)
 *   packs/manifests/<contentHash>.json   this manifest
 *   packs/current.json               {contentHash, manifestPath, createdAt} - written LAST, so a half-finished run is never served
 *
 * PURE: no I/O, no clock, no crypto of its own (a `sha` function is passed in), so the node generator and the vitest suite share it.
 */
import type { TemplateMarks } from "../../components/worksheet/pdfTemplateMarks";
import type { BridgePagesData } from "./packBridge";
import type { PinnedFont } from "./packTemplateFonts";
import { bridgeHashInput, canonicalJson, templateHashInput, type PackUnitsDef, type PlanBridge, type PlanFile } from "./packTemplateCore";

export const MANIFEST_VERSION = 1;
export const STORAGE_PREFIX = "packs/";

export type Sha = (text: string) => string;

export interface TemplateFileMeta {
  bytes: number;
  sha256: string;
  pages: number;
  marks: TemplateMarks;
}

export interface ManifestFile {
  templateId: string;
  groupId: string;
  group: string;
  label: string;
  filename: string;
  mode: "questions" | "answers";
  /** Paper codes printed by the file, in order; each is a key of `papers`. */
  codes: string[];
  hash: string;
  path: string;
  bytes: number;
  sha256: string;
  pages: number;
  /** Does the file hold two blank placeholder pages (2-3) for the server to fill? */
  hasBridge: boolean;
  marks: TemplateMarks;
}

export interface ManifestPaper {
  code: string;
  kind: string;
  name: string;
  subject: string;
  topicKey: string;
  wsPath: string;
  wsSha256: string;
}

export interface ManifestBridge {
  key: string;
  path: string;
  boardPassCard: boolean;
  data: BridgePagesData;
  bytes: number;
  sha256: string;
}

export interface ManifestPack {
  packId: string;
  sku: string;
  target: string;
  /** Template ids in the order the buyer's file list shows them. */
  files: string[];
  /** The "Download all (ZIP)" groups, in file-list order. */
  groups: Array<{ groupId: string; group: string; files: string[] }>;
  /** Per template: the bridge variants this pack uses (keys of `bridges`). */
  bridge: Record<string, { noCard: string; card: string }>;
}

/** A pinned font (packTemplateFonts.ts): the file the cover and the body were rendered with, which the server embeds to stamp the cover. */
export type ManifestFont = PinnedFont;

export interface PackManifest {
  version: typeof MANIFEST_VERSION;
  contentHash: string;
  rendererVersion: string;
  createdAt: string;
  commit: string;
  fonts: ManifestFont[];
  files: Record<string, ManifestFile>;
  papers: Record<string, ManifestPaper>;
  bridges: Record<string, ManifestBridge>;
  packs: Record<string, ManifestPack>;
}

export const fileHashOf = (f: PlanFile, rendererVersion: string, sha: Sha): string => sha(canonicalJson({ rendererVersion, input: templateHashInput(f) }));
export const bridgeKeyOf = (data: BridgePagesData, boardPassCard: boolean, rendererVersion: string, sha: Sha): string =>
  sha(canonicalJson({ rendererVersion, input: bridgeHashInput(data, boardPassCard) }));
export const wsStorageJson = (ws: unknown): string => canonicalJson(ws);

export interface BuildManifestInput {
  plan: readonly PlanFile[];
  bridges: readonly PlanBridge[];
  /** The shop's packs as units (packUnits() of the plan module, carried in plan.json). */
  packDefs: readonly PackUnitsDef[];
  /** By file hash. */
  metas: Readonly<Record<string, TemplateFileMeta>>;
  /** By bridge key. */
  bridgeMetas: Readonly<Record<string, { bytes: number; sha256: string }>>;
  rendererVersion: string;
  fonts: ManifestFont[];
  createdAt: string;
  commit: string;
  sha: Sha;
}

export function buildManifest(input: BuildManifestInput): PackManifest {
  const { plan, bridges, metas, bridgeMetas, rendererVersion, sha } = input;
  const files: Record<string, ManifestFile> = {};
  const papers: Record<string, ManifestPaper> = {};
  for (const f of plan) {
    const hash = fileHashOf(f, rendererVersion, sha);
    const meta = metas[hash];
    if (!meta) throw new Error(`no render recorded for ${f.templateId} (${hash})`);
    files[f.templateId] = {
      templateId: f.templateId,
      groupId: f.groupId,
      group: f.group,
      label: f.label,
      filename: f.filename,
      mode: f.mode,
      codes: f.codes,
      hash,
      path: `${STORAGE_PREFIX}files/${hash}.pdf`,
      bytes: meta.bytes,
      sha256: meta.sha256,
      pages: meta.pages,
      hasBridge: f.hasBridge,
      marks: meta.marks,
    };
    for (const p of f.papers) {
      const wsSha = sha(wsStorageJson(p.ws));
      const prev = papers[p.code];
      if (prev && prev.wsSha256 !== wsSha) throw new Error(`paper ${p.code} is drawn two different ways (${f.templateId})`);
      papers[p.code] = { code: p.code, kind: p.reg.kind, name: p.reg.name, subject: p.reg.subject, topicKey: p.reg.topicKey, wsPath: `${STORAGE_PREFIX}ws/${wsSha}.json`, wsSha256: wsSha };
    }
  }
  const bridgeAssets: Record<string, ManifestBridge> = {};
  const byPack: Record<string, Record<string, { noCard: string; card: string }>> = {};
  for (const b of bridges) {
    const noCard = bridgeKeyOf(b.data, false, rendererVersion, sha);
    const card = bridgeKeyOf(b.data, true, rendererVersion, sha);
    for (const [key, withCard] of [[noCard, false], [card, true]] as const) {
      const m = bridgeMetas[key];
      if (!m) throw new Error(`no bridge render recorded for ${b.packId} ${b.templateId} (${key})`);
      bridgeAssets[key] = { key, path: `${STORAGE_PREFIX}bridge/${key}.pdf`, boardPassCard: withCard, data: { ...b.data, boardPassCard: withCard }, bytes: m.bytes, sha256: m.sha256 };
    }
    (byPack[b.packId] ??= {})[b.templateId] = { noCard, card };
  }
  const unitFiles = (u: PackUnitsDef["units"][number]): string[] =>
    plan.filter((f) => f.unit.kind === u.kind && f.unit.key === u.key).map((f) => f.templateId);
  const packs: Record<string, ManifestPack> = {};
  for (const p of input.packDefs) {
    const ids = p.units.flatMap(unitFiles);
    const groups: ManifestPack["groups"] = [];
    for (const id of ids) {
      const f = files[id];
      const g = groups.find((x) => x.groupId === f.groupId);
      if (g) g.files.push(id);
      else groups.push({ groupId: f.groupId, group: f.group, files: [id] });
    }
    packs[p.packId] = { packId: p.packId, sku: p.sku, target: p.target, files: ids, groups, bridge: byPack[p.packId] ?? {} };
  }
  const contentHash = sha(
    canonicalJson({
      rendererVersion,
      files: Object.values(files).map((f) => [f.templateId, f.hash, f.sha256]).sort(),
      papers: Object.values(papers).map((p) => [p.code, p.wsSha256]).sort(),
      bridges: Object.values(bridgeAssets).map((b) => [b.key, b.sha256]).sort(),
      packs: Object.values(packs).map((p) => [p.packId, p.files]).sort(),
    }),
  );
  return { version: MANIFEST_VERSION, contentHash, rendererVersion, createdAt: input.createdAt, commit: input.commit, fonts: input.fonts, files, papers, bridges: bridgeAssets, packs };
}

/** Problems that make a manifest unsafe to publish. Empty = fine. */
export function validateManifest(m: PackManifest, plan: readonly PlanFile[], packDefs: readonly PackUnitsDef[]): string[] {
  const bad: string[] = [];
  if (m.version !== MANIFEST_VERSION) bad.push(`version ${m.version}`);
  const ids = new Set(plan.map((f) => f.templateId));
  if (ids.size !== plan.length) bad.push("duplicate template ids in the plan");
  for (const id of ids) if (!m.files[id]) bad.push(`missing file ${id}`);
  for (const id of Object.keys(m.files)) if (!ids.has(id)) bad.push(`unplanned file ${id}`);
  for (const p of packDefs) {
    const mp = m.packs[p.packId];
    if (!mp) {
      bad.push(`missing pack ${p.packId}`);
      continue;
    }
    if (new Set(mp.files).size !== mp.files.length) bad.push(`${p.packId}: a file listed twice`);
    const grouped = mp.groups.flatMap((g) => g.files);
    if (grouped.length !== mp.files.length || grouped.some((id) => !mp.files.includes(id))) bad.push(`${p.packId}: groups do not partition the files`);
    for (const id of mp.files) {
      const f = m.files[id];
      if (!f) {
        bad.push(`${p.packId}: unknown file ${id}`);
        continue;
      }
      if (f.hasBridge && !mp.bridge[id]) bad.push(`${p.packId}: ${id} has no bridge pages`);
    }
  }
  for (const f of Object.values(m.files)) {
    if (!f.path.startsWith(STORAGE_PREFIX)) bad.push(`${f.templateId}: path outside ${STORAGE_PREFIX}`);
    if (!f.marks.footer) bad.push(`${f.templateId}: no footer geometry`);
    if (!f.marks.cover) bad.push(`${f.templateId}: no cover marks`);
    else {
      for (const need of ["box", "textcol", "licence", "redownload", "edition"]) if (!f.marks.cover.stamps.some((s) => s.name === need)) bad.push(`${f.templateId}: cover has no "${need}" mark`);
    }
    if (f.marks.cover && f.marks.cover.licenceFit.maxLines !== 1) bad.push(`${f.templateId}: no licence fit rule`);
    if (f.marks.cover && f.marks.cover.stamps.find((s) => s.name === "edition")?.anchor !== "right") bad.push(`${f.templateId}: edition is not right-anchored`);
    if (f.marks.footer && (f.marks.footer.firstPage > f.marks.footer.lastPage)) bad.push(`${f.templateId}: footer page range`);
    if (f.pages !== f.marks.pages) bad.push(`${f.templateId}: page count ${f.pages} vs marks ${f.marks.pages}`);
    for (const code of f.codes) if (!m.papers[code]) bad.push(`${f.templateId}: paper ${code} not stored`);
    // every paper (set) of a file prints one "Generated <date>" line under its title; a paper-less file has one such line too
    const generated = f.marks.body.filter((x) => x.name === "generated").length;
    if (generated !== Math.max(1, f.codes.length)) bad.push(`${f.templateId}: ${generated} "Generated" marks for ${Math.max(1, f.codes.length)} paper(s)`);
    for (const g of f.marks.body) if (g.page < 2 || g.page > f.pages) bad.push(`${f.templateId}: body mark on page ${g.page}`);
  }
  for (const b of Object.values(m.bridges)) if (!b.path.startsWith(STORAGE_PREFIX)) bad.push(`bridge ${b.key}: path outside ${STORAGE_PREFIX}`);
  if (!m.fonts.length) bad.push("no fonts recorded");
  for (const need of ["Inter", "Fraunces"]) if (!m.fonts.some((f) => f.family === need)) bad.push(`font ${need} is not recorded`);
  return bad;
}

export const currentPointer = (m: PackManifest): { version: 1; contentHash: string; manifestPath: string; createdAt: string } => ({
  version: 1,
  contentHash: m.contentHash,
  manifestPath: `${STORAGE_PREFIX}manifests/${m.contentHash}.json`,
  createdAt: m.createdAt,
});
