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
 *            (BRIDGE-CODES-1: one file per chapter holding its gradable sets of ~10-15, `PK-<M|S>-<TOPIC>-CBQ<k>`, each filed as a
 *            worksheet)
 *
 * Every draw is seeded by `hashSeed(packId + ":" + index)` — same packId, same question ids, every time.
 * Packs never touch the weekly download limit: nothing here calls the limited-download guard.
 */
import type { PersistedWorksheet } from "../../services/worksheetSessionStore";
import type { AuthUser } from "../../context/AuthContext";
import { registerPackPaper, type PackPaperReg } from "./packPaperRecord";
import { groupIdForTemplateId, templateIdForPackFile } from "./packTemplateCore";
import type { ServerDownloadDeps } from "./serverPdfDownload";
import { cbqPackExampleCode, packPaperCode } from "./packPaperCode";
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
  chapterPackDrawRows,
  chapterPackRows,
  drawAvoidingExcluded,
  drawPackWorksheetRowsSafe,
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
import { cbqSets } from "./cbqSets";
import type { PrintCoverProps } from "../../components/worksheet/PrintCover";
import { bridgePackLabel, cbqBridgeExampleCode, type BridgeContext, type BridgePagesData } from "./packBridge";

/** The 4th argument of `exportWorksheetPdf` (PACKS contract §5; PDF-REBRAND-1 adds it). */
export type ExportOpts = {
  licensee?: { name: string; email: string; orderId: string };
  cover?: Pick<PrintCoverProps, "kicker" | "title" | "subtitle" | "stats" | "headline" | "types">;
  filename?: string;
  /** PACK-TERMS-1: when the covering pack was paid (ms) - picks the re-download date printed on the cover. Absent -> the later (31 May 2027) date. */
  paidAtMs?: number;
  /** BRIDGE-CODES-1: a several-paper file reports each set as it starts ("Preparing… set k of n"). */
  onProgress?: (set: number, of: number) => void;
  /** BRIDGE-PDF-1: pages 2-3 ("Get this paper marked" + the sample scorecard); only on the buyer's download (ctx.bridge). */
  bridge?: BridgePagesData;
};
type ExportFn = (ws: PersistedWorksheet, mode: "questions" | "answers", code?: string, opts?: ExportOpts) => Promise<string>;
/** BRIDGE-CODES-1 round 3: several papers in ONE file (worksheetPdfExport `exportWorksheetSetsPdf`). */
type ExportSetsFn = (sets: Array<{ ws: PersistedWorksheet; code: string }>, mode: "questions" | "answers", opts?: ExportOpts) => Promise<string>;

export interface PackFile {
  id: string;
  label: string;
  /** The paper code printed on the PDF (paper-shaped files only; never on a question-bank section file). */
  code?: string;
  /** BRIDGE-CODES-1 round 3: a file holding several papers (a CBQ Pack chapter) - every paper code it prints, in order. */
  codes?: string[];
  /** The group the file is listed under (a chapter name, or "Mock papers"). */
  group: string;
  /** SERVER-PDF-1: the id the server zips this file under ("Download all (ZIP)"): a chapter slug, `mocks-<subject>`, `cbq-<subject>-<chapter>`. */
  groupId: string;
  /** The pack this file belongs to (the id up to the first "|"). */
  packId: string;
  filename: string;
  /** `onProgress` (several-paper files only): called as each set starts rendering. */
  build: (onProgress?: (set: number, of: number) => void) => Promise<void>;
  /**
   * SERVER-PDF-1: what this file is made from, as plain data (the pack-template generator reads it; nothing in the buyer's
   * download path does). Reading it renders nothing and never touches the licensee.
   */
  source: PackFileSource;
}

/** SERVER-PDF-1: the inputs of one pack file, exactly what `build()` hands the exporter, minus the buyer. */
export interface PackFileSource {
  mode: "questions" | "answers";
  cover?: ExportOpts["cover"];
  /** Page 2-3 data for a buyer's file; `boardPassCard` is the one buyer-specific switch. Undefined: the file has no bridge pages. */
  bridgeData?: (boardPassCard: boolean) => BridgePagesData;
  /** Paper-shaped files: each paper's code, registration facts and worksheet (a single-paper file has one; a CBQ chapter file several). */
  papers: Array<{ reg: Omit<PackPaperReg, "paper">; ws: () => PersistedWorksheet }>;
  /** The worksheet a paper-less file (question-bank section, CBQ intro) is made from. */
  ws?: () => PersistedWorksheet;
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
  /** Test seam: replaces the lazy import of the PDF exporter. For a several-paper file without `exportSetsPdf` it is called once per paper. */
  exportPdf?: ExportFn;
  /** Test seam: replaces the lazy import of the several-papers exporter (a CBQ Pack chapter file). */
  exportSetsPdf?: ExportSetsFn;
  /** Test seam: the clock, read only when a PDF is built (never while listing files). */
  nowIso?: () => string;
  /** Test seam: replaces the download counter event. */
  onDownload?: (sku: PackSku) => void;
  /**
   * BRIDGE-PDF-1: present ONLY on the buyer's own download (My packs). Every file with a paper code to show then gets pages 2-3 after
   * its cover. Absent (free samples, shop previews, tests) -> no extra pages, files exactly as before.
   */
  bridge?: BridgeContext;
  /**
   * SERVER-PDF-1 PR-C: set ONLY on the buyer's own download (My packs, the receipt card). The file is then fetched from the server
   * (a signed 15-minute link to the file stamped for this buyer) and `build()` falls back to the in-browser builder, silently, on ANY
   * failure. The server counts the `pack_download` itself, so `onDownload` is NOT called for a file a server link delivered.
   */
  serverLinks?: boolean;
  /** Test seam for the server path (fetch, headers, timeout, the download trigger, the clock, the kill switch). */
  serverPdf?: ServerDownloadDeps;
}

/**
 * The server path of one file (SERVER-PDF-1 PR-C): true = the browser is downloading the server's file and the papers it prints are
 * registered from the server's own ws; false = nothing was downloaded, build it here. Never throws.
 */
async function downloadFromServer(ctx: BuildContext, fileId: string): Promise<boolean> {
  if (!ctx.serverLinks) return false;
  try {
    const { downloadFileFromServer } = await import("./serverPdfDownload");
    const packId = packOfFileId(fileId);
    const res = await downloadFileFromServer({ packId, fileId, user: ctx.user }, { ...ctx.serverPdf, nowIso: ctx.nowIso });
    return res.ok;
  } catch {
    return false;
  }
}

/** Papers are drawn with this placeholder stamp; the real "Generated <date>" is set when a file is built. */
const DRAW_STAMP = "2026-01-01T00:00:00.000Z";

const fileSlug = (s: string): string => s.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

async function defaultExport(): Promise<ExportFn> {
  const mod = await import("../../components/worksheet/worksheetPdfExport");
  // PDF-REBRAND-1 adds the 4th argument; until it merges the extra argument is ignored.
  return mod.exportWorksheetPdf as unknown as ExportFn;
}

async function defaultExportSets(): Promise<ExportSetsFn> {
  const mod = await import("../../components/worksheet/worksheetPdfExport");
  return mod.exportWorksheetSetsPdf as unknown as ExportSetsFn;
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
  /** BRIDGE-PDF-1: the page-2/3 header for this file and, for a file without its own code, a paper code from this pack (or null). */
  bridge?: { packLabel: string; exampleCode: () => string | null; /** CBQ-SAMPLE-1: the CBQ Pack shows the CBQ marked sample. */ sample?: "cbq" };
}

/** PACK-TERMS-1: the paid time of the owned pack whose order reference is `ref` (the one printed on the file); undefined when unknown. */
function paidAtOf(owned: readonly OwnedPack[], ref: string): number | undefined {
  const hit = ref ? owned.find((p) => (p.orderId || p.packId) === ref) : undefined;
  return hit && typeof hit.paidAt === "number" && hit.paidAt > 0 ? hit.paidAt : undefined;
}

const packOfFileId = (fileId: string): string => fileId.slice(0, Math.max(0, fileId.indexOf("|")));
const groupIdOf = (fileId: string): string => {
  const t = templateIdForPackFile(packOfFileId(fileId), fileId);
  return (t && groupIdForTemplateId(t)) || "";
};

function makeFile(spec: DocSpec, sku: PackSku, ctx: BuildContext): PackFile {
  return {
    id: spec.id,
    label: spec.label,
    code: spec.paper?.code,
    group: spec.group,
    groupId: groupIdOf(spec.id),
    packId: packOfFileId(spec.id),
    filename: spec.filename,
    source: {
      mode: spec.mode,
      cover: spec.cover,
      ...(spec.bridge
        ? {
            bridgeData: (boardPassCard: boolean): BridgePagesData => ({
              packLabel: spec.bridge!.packLabel,
              exampleCode: spec.paper?.code ?? spec.bridge!.exampleCode(),
              ownCode: !!spec.paper?.code,
              boardPassCard,
              ...(spec.bridge!.sample ? { sample: spec.bridge!.sample } : {}),
            }),
          }
        : {}),
      papers: spec.paper ? [{ reg: spec.paper, ws: spec.ws }] : [],
      ws: spec.ws,
    },
    build: async () => {
      // No licensee email (or, for a phone-only account, its masked phone): no PDF. A pack file is never produced unwatermarked.
      if (!hasLicenseeContact(ctx.licensee)) throw new Error("licensee_unavailable");
      // SERVER-PDF-1 PR-C: the server's stamped file first; on any failure fall through to the in-browser build below.
      if (await downloadFromServer(ctx, spec.id)) return;
      const exportPdf = ctx.exportPdf ?? (await defaultExport());
      const ws = { ...spec.ws(), createdAt: (ctx.nowIso ?? (() => new Date().toISOString()))() };
      // A paper file shows its OWN printed code; any other file the pack's first paper code (null: no "e.g." clause).
      const bridge: BridgePagesData | undefined =
        ctx.bridge && spec.bridge
          ? { packLabel: spec.bridge.packLabel, exampleCode: spec.paper?.code ?? spec.bridge.exampleCode(), ownCode: !!spec.paper?.code, boardPassCard: ctx.bridge.paidBoardPass === false, ...(spec.bridge.sample ? { sample: spec.bridge.sample } : {}) }
          : undefined;
      await exportPdf(ws, spec.mode, spec.paper?.code, {
        // The exporter's `email` slot is the contact printed after the name: the email, or the MASKED phone.
        licensee: { name: ctx.licensee.name, email: licenseeContact(ctx.licensee), orderId: spec.orderRef },
        cover: spec.cover,
        filename: spec.filename,
        paidAtMs: paidAtOf(ctx.owned, spec.orderRef),
        ...(bridge ? { bridge } : {}),
      });
      // PACKS-GRADE-1: the PDF is out; now the EXISTING download path files the paper under its printed
      // code so the student can upload answers. Best-effort: it never blocks or fails the download.
      if (spec.paper) await registerPackPaper(ctx.user, { ...spec.paper, paper: ws });
      ctx.onDownload?.(sku);
    },
  };
}

/** BRIDGE-CODES-1 round 3: a file that holds several papers, each its own printed code and its own "waiting" record. */
interface SetsDocSpec extends Omit<DocSpec, "ws" | "paper"> {
  sets: Array<{ ws: () => PersistedWorksheet; paper: Omit<PackPaperReg, "paper"> }>;
}

function makeSetsFile(spec: SetsDocSpec, sku: PackSku, ctx: BuildContext): PackFile {
  return {
    id: spec.id,
    label: spec.label,
    codes: spec.sets.map((x) => x.paper.code),
    group: spec.group,
    groupId: groupIdOf(spec.id),
    packId: packOfFileId(spec.id),
    filename: spec.filename,
    source: {
      mode: spec.mode,
      cover: spec.cover,
      ...(spec.bridge && spec.sets.length > 0
        ? {
            bridgeData: (boardPassCard: boolean): BridgePagesData => ({
              packLabel: spec.bridge!.packLabel,
              exampleCode: spec.sets[0].paper.code,
              ownCode: true,
              boardPassCard,
              ...(spec.bridge!.sample ? { sample: spec.bridge!.sample } : {}),
            }),
          }
        : {}),
      papers: spec.sets.map((x) => ({ reg: x.paper, ws: x.ws })),
    },
    build: async (onProgress) => {
      if (!hasLicenseeContact(ctx.licensee)) throw new Error("licensee_unavailable");
      if (await downloadFromServer(ctx, spec.id)) return;
      const now = (ctx.nowIso ?? (() => new Date().toISOString()))();
      const papers = spec.sets.map((x) => ({ ws: { ...x.ws(), createdAt: now }, reg: x.paper }));
      const bridge: BridgePagesData | undefined =
        ctx.bridge && spec.bridge && papers.length > 0
          ? { packLabel: spec.bridge.packLabel, exampleCode: papers[0].reg.code, ownCode: true, boardPassCard: ctx.bridge.paidBoardPass === false, ...(spec.bridge.sample ? { sample: spec.bridge.sample } : {}) }
          : undefined;
      const opts: ExportOpts = {
        licensee: { name: ctx.licensee.name, email: licenseeContact(ctx.licensee), orderId: spec.orderRef },
        cover: spec.cover,
        filename: spec.filename,
        paidAtMs: paidAtOf(ctx.owned, spec.orderRef),
        ...(bridge ? { bridge } : {}),
      };
      if (ctx.exportSetsPdf || !ctx.exportPdf) {
        const exportSets = ctx.exportSetsPdf ?? (await defaultExportSets());
        await exportSets(papers.map((p) => ({ ws: p.ws, code: p.reg.code })), spec.mode, onProgress ? { ...opts, onProgress } : opts);
      } else {
        // Test seam only (an `exportPdf` stub and no `exportSetsPdf`): every paper goes through it, so guards see each set.
        for (const p of papers) await ctx.exportPdf(p.ws, spec.mode, p.reg.code, opts);
      }
      // Every set of the file waits on Home under its own code, exactly as a one-paper file does.
      for (const p of papers) await registerPackPaper(ctx.user, { ...p.reg, paper: p.ws });
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
  // The seeded draws (Chapter Tests, Worksheet) keep the list they have always drawn from; an excluded row is steered out of them
  // by drawAvoidingExcluded / drawPackWorksheetRowsSafe, so a paper that never held one is byte-identical (PACK-SYLLABUS-1).
  const drawRows = chapterPackDrawRows(slug);
  const orderRef = coveringRef(ctx.owned, "chapter", slug, fallback);
  const files: PackFile[] = [];
  // BRIDGE-PDF-1: a paper file shows its own code; a question-bank file shows the chapter's first paper code (read at build time,
  // after the list below is complete).
  const bridgeFor = (ownCode?: string) => ({
    packLabel: bridgePackLabel(name, sku, subjectOfChapter(slug) ?? "maths"),
    exampleCode: () => ownCode ?? files.find((f) => f.code)?.code ?? null,
  });
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
              bridge: bridgeFor(),
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
    const drawn = drawAvoidingExcluded(
      (servedAt) =>
        drawChapterTest({
          subject,
          topicKey: slug,
          topicLabel: name,
          worksheetId: `pack-${slug}-ct${n}`,
          name: `${name} · Chapter Test ${n}`,
          createdAt: DRAW_STAMP,
          seed,
          servedAt,
        }),
      packServedAt(drawRows, ctUsed),
    );
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
            bridge: bridgeFor(ctCode),
          },
          sku,
          ctx,
        ),
      );
    }
  }

  // 3. Worksheet (paper + key).
  const wsRows = drawPackWorksheetRowsSafe(drawRows, hashSeed(`pack-paper:${slug}:ws1`));
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
            bridge: bridgeFor(wsCode),
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
    const drawn = drawAvoidingExcluded(
      (servedAt) =>
        drawFullMock({
          subject: bankSubject,
          worksheetId: `pack-mock-${subject}-${n}`,
          code: packPaperCode({ kind: "mock", subject, n }),
          name,
          createdAt: DRAW_STAMP,
          seed: hashSeed(`pack-paper:mock:${subject}:${n}`),
          servedAt,
        }),
      packServedAt(unionPool, used),
    );
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
    const mockCode = packPaperCode({ kind: "mock", subject, n });
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
            paper: { kind: "full-mock", code: mockCode, name, subject: bankSubject, topicKey: "" },
            bridge: { packLabel: bridgePackLabel(bankSubject, sku, subject), exampleCode: () => mockCode },
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
 * Board CBQ Pack, one subject (CBQ-PACK-1): a "How examiners mark a CBQ" first page, then per chapter ONE question file and ONE
 * answer-key file holding the chapter's CBQs as gradable sets ("Set k of n", ~10-15 questions each, cbqSets.ts; BRIDGE-CODES-1),
 * each set starting on a new page with its own code (grouped by section, within it by format; worked step-wise solutions). Loads every chapter of the subject first. Nothing here reads the clock
 * or `Math.random`.
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
        bridge: { packLabel: bridgePackLabel(bankSubject, sku, subject), exampleCode: () => cbqPackExampleCode(subject), sample: "cbq" },
      },
      sku,
      ctx,
    ),
  );

  for (const slug of slugs) {
    const name = chapterName(slug);
    // BRIDGE-CODES-1 round 2 (owner 8 Nov 20:17): the chapter's CBQs as gradable sets of ~10-15 (cbqSets.ts). Every question is in
    // exactly one set, so the pack holds the same questions as before; each set is numbered Q1.. as the paper it is.
    // Round 3 (owner 8 Nov 21:20, "One pdf per chapter"): a file holds several sets in order; each set starts on a new page with its
    // own title row, printed code and (questions) QR, and waits on Home on its own.
    const sets = cbqSets(cbqPackRows(slug));
    if (sets.length === 0) continue;
    const papers = sets.map((set, pi) => {
      const title = `${name} \u00b7 Board CBQs \u00b7 Set ${pi + 1} of ${sets.length}`;
      const questions = set.map((q, i) => toWorksheetQuestion(q, i + 1, name));
      return {
        ws: () => worksheetOf({ id: `pack-cbq-${slug}-set-${pi + 1}`, title, subject: bankSubject, sectionFilter: "Competency-based", questions }),
        // BRIDGE-CODES-1: each set is a paper filed as a worksheet (the Chapter Pack's `-WS` path): same upload, grader, entitlement.
        paper: { kind: "worksheet" as const, code: packPaperCode({ kind: "cbq", chapter: slug, set: pi + 1 }), name: title, subject: bankSubject, topicKey: slug },
        nQ: questions.length,
        marks: questions.reduce((m, q) => m + (Number(q.marks) || 0), 0),
      };
    });
    // Owner 8 Nov 22:45 ("make it deliver/download in parts, that way user wont think that they are stuck"): the chapter's sets are
    // delivered as PART files of about CBQ_SETS_PER_PART sets each, so every download is quick and finishes on its own.
    for (const [pk, part] of cbqParts(papers).entries()) {
      const nParts = cbqParts(papers).length;
      const first = papers.indexOf(part[0]) + 1;
      const last = first + part.length - 1;
      const range = first === last ? `Set ${first}` : `Sets ${first}\u2013${last}`;
      const nQ = part.reduce((m, p) => m + p.nQ, 0);
      const marks = part.reduce((m, p) => m + p.marks, 0);
      for (const [mode, modeLabel, modeFile] of MODES) {
        const title = `${name} \u00b7 Board CBQs \u00b7 Part ${pk + 1} of ${nParts}`;
        files.push(
          makeSetsFile(
            {
              id: `${packId}|${slug}|cbq-part-${pk + 1}-${mode}`,
              label: `Part ${pk + 1} of ${nParts} \u00b7 ${range} \u00b7 ${modeLabel}`,
              group: name,
              filename: `LazyTopper-${fileSlug(name)}-CBQ-Part-${pk + 1}-of-${nParts}-Sets-${first}-${last}-${modeFile}.pdf`,
              mode,
              orderRef,
              sets: part.map((p) => ({ ws: p.ws, paper: p.paper })),
              cover: {
                kicker: mode === "questions" ? `${kicker} CBQ PACK` : `${kicker} CBQ PACK \u00b7 ANSWER KEY`,
                title,
                subtitle: `${name} \u00b7 ${range} of ${papers.length} \u00b7 ${nQ} ${nQ === 1 ? "question" : "questions"}, ${marks} ${marks === 1 ? "mark" : "marks"} \u00b7 worked step-wise solutions`,
                // COVER-CLEAN-1: the pack's own facts, read from the same constants the pack page and pricing band use.
                headline: { value: `${CBQ_MIN_PER_SUBJECT.toLocaleString("en-IN")}+`, label: "CBQs", note: "competency-based questions" },
                stats: [
                  { value: String(slugs.length), label: "chapters" },
                  { value: `${CBQ_MIN_PER_CHAPTER}+`, label: "in every chapter" },
                  { value: String(CBQ_QUESTION_TYPES.length), label: "question types" },
                ],
                types: CBQ_QUESTION_TYPES,
              },
              // Owner 8 Nov 23:30: pages 2-3 ("Get this paper marked" + sample scorecard) only in each chapter's Part 1.
              ...(pk === 0 ? { bridge: { packLabel: bridgePackLabel(name, sku, subject), exampleCode: () => cbqBridgeExampleCode(subject, slug), sample: "cbq" } } : {}),
            },
            sku,
            ctx,
          ),
        );
      }
    }
  }
  return files;
}

/**
 * BRIDGE-CODES-1: at most this many CBQ sets per PART file (owner 8 Nov 22:45 "deliver/download in parts"; 23:30: 3 sets per part,
 * body pages at 1.5x - SETS_RASTER_SCALE - and pages 2-3 only in Part 1, "but ensure that print quality is good").
 */
export const CBQ_SETS_PER_PART = 3;

/** A chapter's sets split, in order, into ceil(n / CBQ_SETS_PER_PART) parts of near-equal size (9 -> 3+3+3, 8 -> 3+3+2, 7 -> 3+2+2). */
export function cbqParts<T>(sets: readonly T[]): T[][] {
  if (sets.length === 0) return [];
  const n = Math.ceil(sets.length / CBQ_SETS_PER_PART);
  const out: T[][] = [];
  let at = 0;
  for (let i = 0; i < n; i += 1) {
    const size = Math.ceil((sets.length - at) / (n - i));
    out.push(sets.slice(at, at + size));
    at += size;
  }
  return out;
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

