/**
 * buildPackFiles — the downloadable PDFs of an owned pack (PACKS-CLIENT-1, contract §4/§5).
 *
 * LAZY-ONLY (dynamic-imported from PacksPage's download handler / My packs). It reaches the question bank,
 * the Full Mock blueprint and — inside each file's `build()` — html2canvas, jsPDF and the worksheet exporter,
 * so none of that is in the entry chunk.
 *
 *   chapter  per non-empty section A..E: questions + answer key (a document over 60 questions is split into
 *            "Part k of n"), Chapter Test 1 and 2 (paper + key), Worksheet (paper + key)
 *   mock     8 full board-pattern papers per subject (paper + key each)
 *   subject  the union of its 13 chapters + that subject's mocks, grouped by chapter
 *   bundle   both subjects
 *   cbq      (CBQ-PACK-1) one subject's competency-based questions: a marking-rules page, then per chapter questions + key
 *
 * Every draw is seeded by `hashSeed(packId + ":" + index)` — same packId, same question ids, every time.
 * Packs never touch the weekly download limit: nothing here calls the limited-download guard.
 */
import type { PersistedWorksheet } from "../../services/worksheetSessionStore";
import type { AuthUser } from "../../context/AuthContext";
import { registerPackPaper, type PackPaperReg } from "./packPaperRecord";
import { packPaperCode } from "./packPaperCode";
import {
  chaptersOfSubject,
  hasLicenseeContact,
  licenseeContact,
  PACK_CHAPTER_SLUGS,
  PACK_SUBJECTS,
  subjectOfChapter,
  type OwnedPack,
  type PackLicensee,
  type PackSku,
  type PackSubject,
} from "../../services/packs";
import { drawChapterTest } from "../../components/chaptertest/chapterTestBlueprint";
import { buildUnionPool, drawFullMock, fullMockChapterWeights } from "../../components/fullmock/fullMockBlueprint";
import {
  bankSubjectName,
  bankSubjectOf,
  cbqPackRows,
  chapterName,
  chapterPackRows,
  drawPackWorksheetRows,
  groupBySection,
  hashSeed,
  loadChapter,
  loadSubjectBank,
  packServedAt,
  splitIntoParts,
  subjectBankRows,
  toWorksheetQuestion,
  withProvenance,
} from "./packContent";
import { CBQ_MIN_PER_CHAPTER, CBQ_MIN_PER_SUBJECT, MATHS_MOCK_PATTERN, MOCKS_PER_SUBJECT } from "./packLabels";
import { CBQ_QUESTION_TYPES } from "./cbqPackTypes";
import type { PrintCoverProps } from "../../components/worksheet/PrintCover";

/** The 4th argument of `exportWorksheetPdf` (PACKS contract §5; PDF-REBRAND-1 adds it). */
export type ExportOpts = {
  licensee?: { name: string; email: string; orderId: string };
  cover?: Pick<PrintCoverProps, "kicker" | "title" | "subtitle" | "stats" | "headline" | "types">;
  filename?: string;
};
type ExportFn = (ws: PersistedWorksheet, mode: "questions" | "answers", code?: string, opts?: ExportOpts) => Promise<string>;

export interface PackFile {
  id: string;
  label: string;
  /** The paper code printed on the PDF (paper-shaped files only; never on a question-bank section file). */
  code?: string;
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
  /**
   * The signed-in student. Paper-shaped files (Chapter Tests, Worksheet, Full Mocks) are registered as
   * "waiting for your answers" under their pack code once downloaded (PACKS-GRADE-1). Absent → no card.
   */
  user?: AuthUser | null;
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
function coveringRef(owned: readonly OwnedPack[], kind: "chapter" | "mocks" | "cbq", key: string, fallback: OwnedPack | undefined): string {
  const subject: PackSubject | null = kind === "chapter" ? subjectOfChapter(key) : (key as PackSubject);
  const order: string[] =
    kind === "cbq"
      ? [`pack_cbq:${key}`]
      : kind === "chapter"
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
  /** Paper-shaped files only: the pack code + how the existing download path registers it. */
  paper?: Omit<PackPaperReg, "paper">;
}

function makeFile(spec: DocSpec, sku: PackSku, ctx: BuildContext): PackFile {
  return {
    id: spec.id,
    label: spec.label,
    code: spec.paper?.code,
    group: spec.group,
    filename: spec.filename,
    build: async () => {
      // No licensee email (or, for a phone-only account, its masked phone): no PDF. A pack file is never produced unwatermarked.
      if (!hasLicenseeContact(ctx.licensee)) throw new Error("licensee_unavailable");
      const exportPdf = ctx.exportPdf ?? (await defaultExport());
      const ws = { ...spec.ws(), createdAt: (ctx.nowIso ?? (() => new Date().toISOString()))() };
      await exportPdf(ws, spec.mode, spec.paper?.code, {
        // The exporter's `email` slot is the contact printed after the name: the email, or the MASKED phone.
        licensee: { name: ctx.licensee.name, email: licenseeContact(ctx.licensee), orderId: spec.orderRef },
        cover: spec.cover,
        filename: spec.filename,
      });
      // PACKS-GRADE-1: the PDF is out; now the EXISTING download path files the paper under its printed
      // code so the student can upload answers. Best-effort: it never blocks or fails the download.
      if (spec.paper) await registerPackPaper(ctx.user, { ...spec.paper, paper: ws });
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
  // Step-marked questions first; Chapter Test 2 also steers clear of the questions Chapter Test 1 used.
  const ctUsed: Array<Set<string>> = [];
  for (const n of [1, 2]) {
    const seed = hashSeed(`pack-paper:${slug}:ct${n}`);
    const drawn = drawChapterTest({
      subject,
      topicKey: slug,
      topicLabel: name,
      worksheetId: `pack-${slug}-ct${n}`,
      name: `${name} · Chapter Test ${n}`,
      createdAt: DRAW_STAMP,
      seed,
      servedAt: packServedAt(rows, ctUsed),
    });
    if (!drawn.enoughQuestions) continue;
    ctUsed.push(new Set(drawn.paper.questions.map((q) => q.id)));
    const paper = { ...drawn.paper, questions: withProvenance(drawn.paper.questions, rows) };
    const ctCode = packPaperCode({ kind: n === 1 ? "ct1" : "ct2", chapter: slug });
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
            paper: { kind: "chapter-test", code: ctCode, name: paper.name ?? paper.title, subject, topicKey: slug },
            cover: cover(`CHAPTER TEST ${n}`, paper.title, paper.questions.length, paper.totalMarks),
          },
          sku,
          ctx,
        ),
      );
    }
  }

  // 3. Worksheet (paper + key).
  const wsRows = drawPackWorksheetRows(rows, hashSeed(`pack-paper:${slug}:ws1`));
  if (wsRows.length > 0) {
    const questions = wsRows.map((q, i) => toWorksheetQuestion(q, i + 1, name));
    const marks = questions.reduce((s, q) => s + (Number(q.marks) || 0), 0);
    const title = `${name} · Worksheet`;
    const wsCode = packPaperCode({ kind: "ws", chapter: slug });
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
            paper: { kind: "worksheet", code: wsCode, name: title, subject, topicKey: slug },
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

/**
 * The pack's mock papers for a subject, drawn with the app's own Full Mock blueprint: `MOCKS_PER_SUBJECT` papers, each seeded
 * by its number (`pack-paper:mock:<subject>:<n>`). Step-marked questions are preferred, and each paper steers clear of the
 * questions the earlier papers used, so the overlap between papers is as small as the bank allows.
 */
export function drawPackMocks(subject: PackSubject): Array<{ n: number; drawn: ReturnType<typeof drawFullMock>; name: string }> {
  const bankSubject = bankSubjectName(subject);
  const slugSet = new Set(fullMockChapterWeights(bankSubject).map((c) => c.slug));
  const unionPool = buildUnionPool(bankSubject, slugSet);
  const used: Array<Set<string>> = [];
  const out: Array<{ n: number; drawn: ReturnType<typeof drawFullMock>; name: string }> = [];
  for (let n = 1; n <= MOCKS_PER_SUBJECT; n += 1) {
    const name = `${bankSubject} Full Mock ${n}`;
    const drawn = drawFullMock({
      subject: bankSubject,
      worksheetId: `pack-mock-${subject}-${n}`,
      code: packPaperCode({ kind: "mock", subject, n }),
      name,
      createdAt: DRAW_STAMP,
      seed: hashSeed(`pack-paper:mock:${subject}:${n}`),
      servedAt: packServedAt(unionPool, used),
    });
    if (!drawn.enoughQuestions) continue;
    used.push(new Set(drawn.paper.questions.map((q) => q.id)));
    out.push({ n, drawn, name });
  }
  return out;
}

/** The full board-pattern papers (paper + key each) of a subject. Loads the subject's bank first. */
export async function mockFiles(subject: PackSubject, packId: string, sku: PackSku, ctx: BuildContext, fallback?: OwnedPack): Promise<PackFile[]> {
  await loadSubjectBank(subject);
  const bankSubject = bankSubjectName(subject);
  const orderRef = coveringRef(ctx.owned, "mocks", subject, fallback);
  const files: PackFile[] = [];
  const mockRows = subjectBankRows(subject);
  const pattern = subject === "maths" ? ` · ${MATHS_MOCK_PATTERN}` : "";
  for (const { n, drawn, name } of drawPackMocks(subject)) {
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
            paper: { kind: "full-mock", code: packPaperCode({ kind: "mock", subject, n }), name, subject: bankSubject, topicKey: "" },
            cover: {
              kicker: `FULL MOCK · ${bankSubject.toUpperCase()}`,
              title: name,
              subtitle: `Class 10 CBSE board pattern${pattern} · 80 marks · with worked solutions`,
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

/** The four rules of CBSE step marking, from CLAUDE.md §13 (official CBSE 2026-27 marking scheme). Printed on the pack's first page. */
export const CBQ_MARKING_RULES: ReadonlyArray<{ value: string; label: string }> = [
  { value: "Steps", label: "Every step earns its own mark, so show each step" },
  { value: "\u00bd", label: "The correct formula alone earns half a mark" },
  { value: "ECF", label: "Error carried forward: a slip early on does not cost the later steps" },
  { value: "Unit", label: "A final answer without its SI unit loses half a mark" },
];

/**
 * Board CBQ Pack, one subject (CBQ-PACK-1): a "How examiners mark a CBQ" first page, then per chapter one question document
 * (grouped by section, within it by format) with its answer key of worked step-wise solutions. A chapter over 60 questions is
 * split into "Part k of n". Loads every chapter of the subject first. Nothing here reads the clock or `Math.random`.
 */
export async function cbqFiles(subject: PackSubject, packId: string, sku: PackSku, ctx: BuildContext, fallback?: OwnedPack): Promise<PackFile[]> {
  const bankSubject = bankSubjectName(subject);
  const kicker = bankSubject.toUpperCase();
  const orderRef = coveringRef(ctx.owned, "cbq", subject, fallback);
  const files: PackFile[] = [];
  const slugs = chaptersOfSubject(subject);
  for (const slug of slugs) await loadChapter(slug);

  files.push(
    makeFile(
      {
        id: `${packId}|intro`,
        label: "How examiners mark a CBQ",
        group: "Start here",
        filename: `LazyTopper-${bankSubject}-CBQ-How-Examiners-Mark.pdf`,
        ws: () => worksheetOf({ id: `pack-cbq-${subject}-intro`, title: "How examiners mark a CBQ", subject: bankSubject, sectionFilter: "Read first", questions: [] }),
        mode: "questions",
        orderRef,
        cover: {
          kicker: `${bankSubject.toUpperCase()} CBQ PACK`,
          title: "How examiners mark a CBQ",
          subtitle: "Competency-based questions are marked step by step in the CBSE 2026-27 scheme. Read this once before you start.",
          stats: CBQ_MARKING_RULES.map((r) => ({ ...r })),
        },
      },
      sku,
      ctx,
    ),
  );

  for (const slug of slugs) {
    const name = chapterName(slug);
    const rows = cbqPackRows(slug);
    const parts = splitIntoParts(rows);
    let offset = 0;
    parts.forEach((part, pi) => {
      const start = offset;
      offset += part.length;
      const partTag = parts.length > 1 ? ` (Part ${pi + 1} of ${parts.length})` : "";
      const partFile = parts.length > 1 ? `-Part-${pi + 1}-of-${parts.length}` : "";
      for (const [mode, modeLabel, modeFile] of MODES) {
        const title = `${name} \u00b7 Board CBQs${partTag}`;
        const questions = part.map((q, i) => toWorksheetQuestion(q, start + i + 1, name));
        const marks = questions.reduce((s, q) => s + (Number(q.marks) || 0), 0);
        files.push(
          makeFile(
            {
              id: `${packId}|${slug}|cbq-${pi + 1}-${mode}`,
              label: `${modeLabel}${partTag}`,
              group: name,
              filename: `LazyTopper-${fileSlug(name)}-CBQ${partFile}-${modeFile}.pdf`,
              ws: () => worksheetOf({ id: `pack-cbq-${slug}-${pi + 1}`, title, subject: bankSubject, sectionFilter: "Competency-based", questions }),
              mode,
              orderRef,
              cover: {
                kicker: mode === "questions" ? `${kicker} CBQ PACK` : `${kicker} CBQ PACK \u00b7 ANSWER KEY`,
                title,
                subtitle: `${name} \u00b7 ${questions.length} ${questions.length === 1 ? "question" : "questions"}, ${marks} ${marks === 1 ? "mark" : "marks"} \u00b7 worked step-wise solutions`,
                // COVER-CLEAN-1: the pack's own facts, read from the same constants the pack page and pricing band use.
                headline: { value: `${CBQ_MIN_PER_SUBJECT.toLocaleString("en-IN")}+`, label: "CBQs", note: "competency-based questions" },
                stats: [
                  { value: String(slugs.length), label: "chapters" },
                  { value: `${CBQ_MIN_PER_CHAPTER}+`, label: "in every chapter" },
                  { value: String(CBQ_QUESTION_TYPES.length), label: "question types" },
                ],
                types: CBQ_QUESTION_TYPES,
              },
            },
            sku,
            ctx,
          ),
        );
      }
    });
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
    case "pack_cbq":
      return cbqFiles(pack.target as PackSubject, pack.packId, pack.sku, ctx, owned);
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

