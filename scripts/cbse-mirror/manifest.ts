/**
 * manifest — C10, the one file the page and the Home banner read.
 *
 *   cbse/manifest.json   cacheControl "public, max-age=300"
 *   { v: 1, generatedAt,
 *     papers:    [{ id, sourceUrl, storagePath, sessionYear, bytes, sha256, etag,
 *                   lastModified, checkedAt, status: "ok"|"source-missing"|"stale" }],
 *     circulars: [{ id, date, title, href, source, important, headline }],
 *     circularsCheckedAt }
 *
 * `status` is what the page trusts:
 *   ok             — a verified copy is in Storage and matches the source as of checkedAt.
 *   source-missing — CBSE answered 404/410. Any mirrored copy is KEPT (C6).
 *   stale          — no verified current copy: never seeded, or the latest candidate
 *                    failed a C4 guard and the older copy was kept.
 * Only `ok` makes the page link Storage and say "Download" (C11).
 *
 * The shape is checked here BEFORE the job writes it (`validateManifest`), and the
 * client parses it defensively again — a manifest the job would refuse to write is a
 * manifest the page would refuse to render.
 */
import { HEADLINE_RULES, type Circular } from "./circulars";

export type PaperStatus = "ok" | "source-missing" | "stale";

export type ManifestPaper = {
  readonly id: string;
  readonly sourceUrl: string;
  readonly storagePath: string | null;
  readonly sessionYear: string | null;
  readonly bytes: number | null;
  readonly sha256: string | null;
  readonly etag: string | null;
  readonly lastModified: string | null;
  readonly checkedAt: string | null;
  readonly status: PaperStatus;
};

export type Manifest = {
  readonly v: 1;
  readonly generatedAt: string;
  readonly papers: readonly ManifestPaper[];
  readonly circulars: readonly Circular[];
  readonly circularsCheckedAt: string | null;
};

const PAPER_KEYS = [
  "id",
  "sourceUrl",
  "storagePath",
  "sessionYear",
  "bytes",
  "sha256",
  "etag",
  "lastModified",
  "checkedAt",
  "status",
] as const;
const CIRCULAR_KEYS = ["id", "date", "title", "href", "source", "important", "headline"] as const;
const STATUSES: readonly PaperStatus[] = ["ok", "source-missing", "stale"];

function isStringOrNull(value: unknown): boolean {
  return value === null || typeof value === "string";
}

/** Every problem with a would-be manifest; an empty list means it may be written. */
export function validateManifest(value: unknown): string[] {
  const errors: string[] = [];
  if (!value || typeof value !== "object") return ["manifest is not an object"];
  const m = value as Record<string, unknown>;
  if (m.v !== 1) errors.push("v must be 1");
  if (typeof m.generatedAt !== "string" || !Number.isFinite(Date.parse(m.generatedAt))) {
    errors.push("generatedAt must be an ISO timestamp");
  }
  if (!isStringOrNull(m.circularsCheckedAt)) errors.push("circularsCheckedAt must be string|null");
  if (!Array.isArray(m.papers)) errors.push("papers must be an array");
  if (!Array.isArray(m.circulars)) errors.push("circulars must be an array");

  const ids = new Set<string>();
  for (const [i, raw] of (Array.isArray(m.papers) ? m.papers : []).entries()) {
    const p = raw as Record<string, unknown>;
    for (const key of PAPER_KEYS) {
      if (!(key in (p ?? {}))) errors.push(`papers[${i}] is missing ${key}`);
    }
    if (typeof p?.id !== "string" || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.id)) {
      errors.push(`papers[${i}].id must be kebab-case`);
    } else if (ids.has(p.id)) {
      errors.push(`papers[${i}].id ${p.id} is duplicated`);
    } else {
      ids.add(p.id);
    }
    if (typeof p?.sourceUrl !== "string" || !/^https?:\/\//.test(p.sourceUrl)) {
      errors.push(`papers[${i}].sourceUrl must be an absolute http(s) URL`);
    }
    if (p?.storagePath !== null && !(typeof p?.storagePath === "string" && p.storagePath.startsWith("cbse/files/"))) {
      errors.push(`papers[${i}].storagePath must be null or under cbse/files/`);
    }
    if (!STATUSES.includes(p?.status as PaperStatus)) errors.push(`papers[${i}].status is invalid`);
    if (p?.status === "ok" && (typeof p?.storagePath !== "string" || typeof p?.sha256 !== "string")) {
      errors.push(`papers[${i}] is ok but has no storagePath/sha256`);
    }
    if (!(p?.bytes === null || (typeof p?.bytes === "number" && p.bytes >= 0))) {
      errors.push(`papers[${i}].bytes must be a non-negative number or null`);
    }
    for (const key of ["sessionYear", "sha256", "etag", "lastModified", "checkedAt"] as const) {
      if (!isStringOrNull(p?.[key])) errors.push(`papers[${i}].${key} must be string|null`);
    }
  }

  for (const [i, raw] of (Array.isArray(m.circulars) ? m.circulars : []).entries()) {
    const c = raw as Record<string, unknown>;
    for (const key of CIRCULAR_KEYS) {
      if (!(key in (c ?? {}))) errors.push(`circulars[${i}] is missing ${key}`);
    }
    if (typeof c?.date !== "string" || !/^\d{4}-\d{2}(-\d{2})?$/.test(c.date)) {
      errors.push(`circulars[${i}].date must be YYYY-MM or YYYY-MM-DD`);
    }
    if (typeof c?.href !== "string" || !/^https?:\/\//.test(c.href)) {
      errors.push(`circulars[${i}].href must be an absolute http(s) URL`);
    }
    if (c?.source !== "document" && c?.source !== "index") errors.push(`circulars[${i}].source is invalid`);
    if (typeof c?.important !== "boolean") errors.push(`circulars[${i}].important must be boolean`);
    if (typeof c?.headline !== "string") errors.push(`circulars[${i}].headline must be a string`);
    if (c?.important === false && c?.headline !== "") {
      errors.push(`circulars[${i}] is not important but carries a headline`);
    }
    // C9: a headline is one of the table's fixed strings or nothing. A manifest carrying
    // any other headline was not produced by the rule table, and is not written.
    if (
      c?.important === true &&
      !HEADLINE_RULES.some((rule) => rule.headline === c?.headline)
    ) {
      errors.push(`circulars[${i}].headline is not one of the C9 rule-table headlines`);
    }
  }
  return errors;
}

/** Parse a previous manifest read back from Storage; anything malformed is ignored. */
export function readPreviousManifest(value: unknown): Manifest | null {
  return validateManifest(value).length === 0 ? (value as Manifest) : null;
}
