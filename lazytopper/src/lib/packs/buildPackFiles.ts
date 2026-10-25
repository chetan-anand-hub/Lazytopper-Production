/**
 * buildPackFiles — the downloadable PDFs of an owned pack (PACKS-CLIENT-1, contract §4/§5).
 *
 * LAZY-ONLY (dynamic-imported from PacksPage's download handler / My packs). It reaches the question bank,
 * the Full Mock blueprint and — inside each file's `build()` — html2canvas, jsPDF and the worksheet exporter,
 * so none of that is in the entry chunk.
 *
 *   chapter  per non-empty section A..E: questions + answer key (a document over 60 questions is split into
 *            "Part k of n"), Chapter Test 1 and 2 (paper + key), Worksheet (paper + key)
 *   mock     5 full board-pattern papers (paper + key each)
 *   subject  the union of its 13 chapters + that subject's mocks, grouped by chapter
 *   bundle   both subjects
 *
 * Every draw is seeded by `hashSeed(packId + ":" + index)` — same packId, same question ids, every time.
 * Packs never touch the weekly download limit: nothing here calls the limited-download guard.
 */
import type { PersistedWorksheet } from "../../services/worksheetSessionStore";
import {
  chaptersOfSubject,
  hasLicenseeEmail,
  PACK_CHAPTER_SLUGS,
  PACK_SUBJECTS,
  subjectOfChapter,
  type OwnedPack,
  type PackLicensee,
  type PackSku,
  type PackSubject,
} from "../../services/packs";
import { drawChapterTest } from "../../components/chaptertest/chapterTestBlueprint";
import { drawFullMock } from "../../components/fullmock/fullMockBlueprint";
import {
  bankSubjectName,
  bankSubjectOf,
  chapterName,
  chapterPackRows,
  drawPackWorksheetRows,
  groupBySection,
  hashSeed,
  loadChapter,
  loadSubjectBank,
  splitIntoParts,
  subjectBankRows,
  toWorksheetQuestion,
  withProvenance,
} from "./packContent";

/** The 4th argument of `exportWorksheetPdf` (PACKS contract §5; PDF-REBRAND-1 adds it). */
export type ExportOpts = {
  licensee?: { name: string; email: string; orderId: string };
  cover?: { kicker: string; title: string; subtitle: string; stats: Array<{ value: string; label: string }> };
  filename?: string;
};
type ExportFn = (ws: PersistedWorksheet, mode: "questions" | "answers", code?: string, opts?: ExportOpts) => Promise<string>;

export interface PackFile {
  id: string;
  label: string;
  /** The group the file is listed under (a chapter name, or "Mock papers"). */
  group: string;
  filename: string;
  build: () => Promise<void>;
}

export interface PackRef {
  packId: string;
  sku: PackSku;
  target: string;
}

export interface BuildContext {
  licensee: PackLicensee;
  /** Everything the student owns — the licensed-order reference is the pack that covers each file. */
  owned: readonly OwnedPack[];
  /** Test seam: replaces the lazy import of the PDF exporter. */
  exportPdf?: ExportFn;
  /** Test seam: the clock, read only when a PDF is built (never while listing files). */
  nowIso?: () => string;
  /** Test seam: replaces the download counter event. */
  onDownload?: (sku: PackSku) => void;
}

/** Papers are drawn with this placeholder stamp; the real "Generated <date>" is set when a file is built. */
const DRAW_STAMP = "2026-01-01T00:00:00.000Z";

const fileSlug = (s: string): string => s.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

async function defaultExport(): Promise<ExportFn> {
  const mod = await import("../../components/worksheet/worksheetPdfExport");
  // PDF-REBRAND-1 adds the 4th argument; until it merges the extra argument is ignored.
  return mod.exportWorksheetPdf as unknown as ExportFn;
}

/** The pack that covers a chapter / the mocks, for the "Order <id>" line. Falls back to the pack being listed. */
function coveringRef(owned: readonly OwnedPack[], kind: "chapter" | "mocks", key: string, fallback: OwnedPack | undefined): string {
  const subject: PackSubject | null = kind === "chapter" ? subjectOfChapter(key) : (key as PackSubject);
  const order: string[] =
    kind === "chapter"
      ? [`pack_chapter:${key}`, `pack_subject:${subject}`, "pack_bundle:all"]
      : [`pack_mock:${key}`, `pack_subject:${key}`, "pack_bundle:all"];
  for (const id of order) {
    const hit = owned.find((p) => p.packId === id);
    if (hit) return hit.orderId || hit.packId;
  }
  return fallback ? fallback.orderId || fallback.packId : "";
}

interface DocSpec {
  id: string;
  label: string;
  group: string;
  filename: string;
  ws: () => PersistedWorksheet;
  mode: "questions" | "answers";
  orderRef: string;
  cover: NonNullable<ExportOpts["cover"]>;
}

function makeFile(spec: DocSpec, sku: PackSku, ctx: BuildContext): PackFile {
  return {
    id: spec.id,
    label: spec.label,
    group: spec.group,
    filename: spec.filename,
    build: async () => {
      // No licensee email, no PDF: a pack file is never produced unwatermarked.
      if (!hasLicenseeEmail(ctx.licensee)) throw new Error("licensee_unavailable");
      const exportPdf = ctx.exportPdf ?? (await defaultExport());
      const ws = { ...spec.ws(), createdAt: (ctx.nowIso ?? (() => new Date().toISOString()))() };
      await exportPdf(ws, spec.mode, undefined, {
        licensee: { name: ctx.licensee.name, email: ctx.licensee.email, orderId: spec.orderRef },
        cover: spec.cover,
        filename: spec.filename,
      });
      ctx.onDownload?.(sku);
    },
  };
}

function worksheetOf(args: {
  id: string;
  title: string;
  subject: "Maths" | "Science";
  sectionFilter: string;
  questions: PersistedWorksheet["questions"];
}): PersistedWorksheet {
  return {
    worksheetId: args.id,
    createdAt: DRAW_STAMP,
    title: args.title,
    subject: args.subject,
    grade: "10",
    sectionFilter: args.sectionFilter,
    totalMarks: args.questions.reduce((s, q) => s + (Number(q.marks) || 0), 0),
    questions: args.questions,
    name: args.title,
  };
}

const MODES: Array<["questions" | "answers", string, string]> = [
  ["questions", "Questions", "Questions"],
  ["answers", "Answer key", "Answer-Key"],
];

/** Files for ONE chapter. Loads the chapter first. Empty list only if the chapter has no printable rows. */
export async function chapterFiles(slug: string, packId: string, sku: PackSku, ctx: BuildContext, fallback?: OwnedPack): Promise<PackFile[]> {
  await loadChapter(slug);
  const name = chapterName(slug);
  const subject = bankSubjectOf(slug);
  const subjectKicker = subject.toUpperCase();
  const rows = chapterPackRows(slug);
  const orderRef = coveringRef(ctx.owned, "chapter", slug, fallback);
  const files: PackFile[] = [];
  const cover = (kicker: string, title: string, nQ: number, marks: number) => ({
    kicker: `${kicker} · ${subjectKicker}`,
    title,
    subtitle: `${name} · Class 10 CBSE · printable, with worked solutions`,
    stats: [
      { value: String(nQ), label: nQ === 1 ? "question" : "questions" },
      { value: String(marks), label: marks === 1 ? "mark" : "marks" },
    ],
  });

  // 1. Section documents (questions + key), split over 60 questions.
  for (const [sec, list] of groupBySection(rows)) {
    const parts = splitIntoParts(list);
    let offset = 0;
    parts.forEach((part, pi) => {
      const start = offset;
      offset += part.length;
      const partTag = parts.length > 1 ? ` (Part ${pi + 1} of ${parts.length})` : "";
      const partFile = parts.length > 1 ? `-Part-${pi + 1}-of-${parts.length}` : "";
      for (const [mode, modeLabel, modeFile] of MODES) {
        const title = `${name} · Section ${sec}${partTag}`;
        const questions = part.map((q, i) => toWorksheetQuestion(q, start + i + 1, name));
        const marks = questions.reduce((s, q) => s + (Number(q.marks) || 0), 0);
        files.push(
          makeFile(
            {
              id: `${packId}|${slug}|sec-${sec}-${pi + 1}-${mode}`,
              label: `Section ${sec} · ${modeLabel}${partTag}`,
              group: name,
              filename: `LazyTopper-${fileSlug(name)}-Section-${sec}${partFile}-${modeFile}.pdf`,
              ws: () => worksheetOf({ id: `pack-${slug}-${sec}-${pi + 1}`, title, subject, sectionFilter: `Section ${sec}`, questions }),
              mode,
              orderRef,
              cover: cover(mode === "questions" ? "CHAPTER QUESTION BANK" : "ANSWER KEY", title, questions.length, marks),
            },
            sku,
            ctx,
          ),
        );
      }
    });
  }

  // 2. Chapter Test 1 and 2, drawn by the app's own blueprint with a pack seed.
  for (const n of [1, 2]) {
    const seed = hashSeed(`${packId}:${slug}:ct${n}`);
    const drawn = drawChapterTest({
      subject,
      topicKey: slug,
      topicLabel: name,
      worksheetId: `pack-${slug}-ct${n}`,
      name: `${name} · Chapter Test ${n}`,
      createdAt: DRAW_STAMP,
      seed,
    });
    if (!drawn.enoughQuestions) continue;
    const paper = { ...drawn.paper, questions: withProvenance(drawn.paper.questions, rows) };
    for (const [mode, modeLabel, modeFile] of MODES) {
      files.push(
        makeFile(
          {
            id: `${packId}|${slug}|ct${n}-${mode}`,
            label: `Chapter Test ${n} · ${modeLabel}`,
            group: name,
            filename: `LazyTopper-${fileSlug(name)}-Chapter-Test-${n}-${modeFile}.pdf`,
            ws: () => paper,
            mode,
            orderRef,
            cover: cover(`CHAPTER TEST ${n}`, paper.title, paper.questions.length, paper.totalMarks),
          },
          sku,
          ctx,
        ),
      );
    }
  }

  // 3. Worksheet (paper + key).
  const wsRows = drawPackWorksheetRows(rows, hashSeed(`${packId}:${slug}:ws1`));
  if (wsRows.length > 0) {
    const questions = wsRows.map((q, i) => toWorksheetQuestion(q, i + 1, name));
    const marks = questions.reduce((s, q) => s + (Number(q.marks) || 0), 0);
    const title = `${name} · Worksheet`;
    for (const [mode, modeLabel, modeFile] of MODES) {
      files.push(
        makeFile(
          {
            id: `${packId}|${slug}|worksheet-${mode}`,
            label: `Worksheet · ${modeLabel}`,
            group: name,
            filename: `LazyTopper-${fileSlug(name)}-Worksheet-${modeFile}.pdf`,
            ws: () => worksheetOf({ id: `pack-${slug}-worksheet`, title, subject, sectionFilter: "A-E", questions }),
            mode,
            orderRef,
            cover: cover("WORKSHEET", title, questions.length, marks),
          },
          sku,
          ctx,
        ),
      );
    }
  }
  return files;
}

/** The 5 full board-pattern papers (paper + key each) of a subject. Loads the subject's bank first. */
export async function mockFiles(subject: PackSubject, packId: string, sku: PackSku, ctx: BuildContext, fallback?: OwnedPack): Promise<PackFile[]> {
  await loadSubjectBank(subject);
  const bankSubject = bankSubjectName(subject);
  const orderRef = coveringRef(ctx.owned, "mocks", subject, fallback);
  const files: PackFile[] = [];
  const mockRows = subjectBankRows(subject);
  for (let n = 1; n <= 5; n += 1) {
    const name = `${bankSubject} Full Mock ${n}`;
    const drawn = drawFullMock({
      subject: bankSubject,
      worksheetId: `pack-mock-${subject}-${n}`,
      code: `PACK-${subject.toUpperCase()}-${n}`,
      name,
      createdAt: DRAW_STAMP,
      seed: hashSeed(`${packId}:mock${n}`),
    });
    if (!drawn.enoughQuestions) continue;
    const paper = { ...drawn.paper, questions: withProvenance(drawn.paper.questions, mockRows) };
    for (const [mode, modeLabel, modeFile] of MODES) {
      files.push(
        makeFile(
          {
            id: `${packId}|mock-${subject}-${n}-${mode}`,
            label: `Mock ${n} · ${modeLabel}`,
            group: `${bankSubject} mock papers`,
            filename: `LazyTopper-${bankSubject}-Full-Mock-${n}-${modeFile}.pdf`,
            ws: () => paper,
            mode,
            orderRef,
            cover: {
              kicker: `FULL MOCK · ${bankSubject.toUpperCase()}`,
              title: name,
              subtitle: "Class 10 CBSE board pattern · 80 marks · with worked solutions",
              stats: [
                { value: String(paper.questions.length), label: "questions" },
                { value: String(paper.totalMarks), label: "marks" },
              ],
            },
          },
          sku,
          ctx,
        ),
      );
    }
  }
  return files;
}

/**
 * The files of one owned pack. `packId` seeds every draw. For a subject / bundle pack the chapters come
 * first (grouped by chapter), then the mocks.
 */
export async function buildPackFiles(pack: PackRef, ctx: BuildContext): Promise<PackFile[]> {
  const owned = ctx.owned.find((p) => p.packId === pack.packId);
  switch (pack.sku) {
    case "pack_chapter":
      return chapterFiles(pack.target, pack.packId, pack.sku, ctx, owned);
    case "pack_mock":
      return mockFiles(pack.target as PackSubject, pack.packId, pack.sku, ctx, owned);
    case "pack_subject": {
      const subject = pack.target as PackSubject;
      const out: PackFile[] = [];
      for (const slug of chaptersOfSubject(subject)) out.push(...(await chapterFiles(slug, pack.packId, pack.sku, ctx, owned)));
      out.push(...(await mockFiles(subject, pack.packId, pack.sku, ctx, owned)));
      return out;
    }
    case "pack_bundle": {
      const out: PackFile[] = [];
      for (const slug of PACK_CHAPTER_SLUGS) out.push(...(await chapterFiles(slug, pack.packId, pack.sku, ctx, owned)));
      for (const s of PACK_SUBJECTS) out.push(...(await mockFiles(s, pack.packId, pack.sku, ctx, owned)));
      return out;
    }
  }
}

/** Group a flat file list for display, keeping first-seen order. */
export function groupPackFiles(files: readonly PackFile[]): Array<{ group: string; files: PackFile[] }> {
  const out: Array<{ group: string; files: PackFile[] }> = [];
  for (const f of files) {
    const g = out.find((x) => x.group === f.group);
    if (g) g.files.push(f);
    else out.push({ group: f.group, files: [f] });
  }
  return out;
}

