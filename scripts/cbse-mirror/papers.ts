/**
 * papers — the list the mirror works from (CBSE-AUTO-1 C2/C3).
 *
 * ★ ONE SOURCE OF TRUTH. The mirror does not keep its own copy of the papers; it
 * reads `CBSE_SUBJECTS` from the page's committed data module, so the page and the
 * job can never disagree about which papers exist or what their ids are. Adding a
 * paper to the page is the whole of adding it to the mirror.
 *
 * The import is a relative path into the lazytopper workspace, not a package
 * import: `cbse2027Sources.ts` has no imports of its own, so `tsx` loads it as a
 * plain module and no new workspace dependency is needed.
 */
import {
  CBSE_SUBJECTS,
  type CbseSourceKind,
  type CbseSubjectKey,
} from "../../lazytopper/src/pages/cbse2027Sources";

export type MirrorPaper = {
  readonly id: string;
  readonly subject: CbseSubjectKey;
  readonly subjectLabel: string;
  readonly title: string;
  /** The committed CBSE href — the source until a later session supersedes it (C7). */
  readonly href: string;
  readonly kind: CbseSourceKind;
};

export const MIRROR_PAPERS: readonly MirrorPaper[] = CBSE_SUBJECTS.flatMap((subject) =>
  subject.papers.map((paper) => ({
    id: paper.id,
    subject: subject.key,
    subjectLabel: subject.label,
    title: paper.title,
    href: paper.href,
    kind: paper.kind,
  })),
);

/** Every object this job writes lives under this prefix (C1). */
export const STORAGE_PREFIX = "cbse/";
export const MANIFEST_PATH = "cbse/manifest.json";
export const MANIFEST_TEMP_PATH = "cbse/manifest.tmp.json";

export function storagePathFor(paper: Pick<MirrorPaper, "id" | "kind">): string {
  return `cbse/files/${paper.id}.${paper.kind}`;
}

/** `cbse/archive/<id>/<YYYY-MM-DD>.<ext>` — C5. The date is the run's UTC date. */
export function archivePathFor(paper: Pick<MirrorPaper, "id" | "kind">, now: Date): string {
  return `cbse/archive/${paper.id}/${now.toISOString().slice(0, 10)}.${paper.kind}`;
}

/** How a paper is named in an issue title: "Science: Sample paper". */
export function issueLabel(paper: Pick<MirrorPaper, "subjectLabel" | "title">): string {
  return `${paper.subjectLabel}: ${paper.title}`;
}

/**
 * The download filename a student's browser saves (C3 `contentDisposition`).
 * ASCII only — a quoted filename with an em dash or a curly apostrophe is exactly the
 * kind of header some browsers mangle, and the save dialog is the one place a student
 * sees it.
 */
export function friendlyFilename(
  paper: Pick<MirrorPaper, "subjectLabel" | "title" | "kind">,
  sessionYear: string | null,
): string {
  const base = `CBSE Class 10 ${paper.subjectLabel} - ${paper.title}`
    .replace(/[^A-Za-z0-9 ._()-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const withYear =
    sessionYear && !base.includes(sessionYear) ? `${base} ${sessionYear}` : base;
  return `${withYear}.${paper.kind}`;
}

export function contentDispositionFor(
  paper: Pick<MirrorPaper, "subjectLabel" | "title" | "kind">,
  sessionYear: string | null,
): string {
  return `attachment; filename="${friendlyFilename(paper, sessionYear)}"`;
}

export function contentTypeFor(kind: CbseSourceKind): string {
  return kind === "pdf" ? "application/pdf" : "application/zip";
}

/** C3 — both the files and the manifest are cached for five minutes, no longer. */
export const CACHE_CONTROL = "public, max-age=300";
