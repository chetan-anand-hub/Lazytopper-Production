/**
 * myPacksBridgeModel - BRIDGE-PANEL-1 (owner rulings 7 Nov 2026 18:45-19:38, approved design `MyPacks.dc.html`). Pure rules for
 * the "Get your papers marked" panel in My packs: which papers a pack holds, what each paper's status is, the first-marked card and
 * its mistake line. No React, no I/O, no clock, no Math.random.
 *
 * EVERY status comes from the student's own records or the server's own answer:
 *   - the papers a pack holds are the pack's printed codes (`packPaperCode`, the same function the PDFs print; pinned by
 *     packPaperCodes.pin.json) - CBQ papers only from the student's own records (they have codes only once BRIDGE-CODES-1 lands);
 *   - "Marked · x/y" is the session record filed under that code (status graded / partial, its own marks);
 *   - "free mark left" / "with Board Pass" is the server's per-kind first-free flag (GET /api/usage/limits `grade[kind]`), and only
 *     the FIRST ungraded paper of a kind can say "free mark left" (there is one free grade per kind per ACCOUNT, BRIDGE-PDF-1 §2.1);
 *     nothing known -> no status words at all (never a promise the server did not make).
 * Display only (CLAUDE.md §4a): nothing here grades, scores, types a mistake or records.
 */
import { VALIDITY_SHORT } from "../../config/validity";
import type { SessionRecord, SessionSubject } from "../../services/sessionRecords";
import { packPaperCode } from "../../lib/packs/packPaperCode";
import { MOCKS_PER_SUBJECT, packChapterLabel } from "../../lib/packs/packLabels";
import { PACK_CHAPTER_SLUGS, PACK_SUBJECTS, chaptersOfSubject, subjectOfChapter, type OwnedPack, type PackSubject } from "../../services/packs";
import {
  MISTAKE_GROUPS,
  countWithUnit,
  groupCounts,
  groupMarks,
  marksWithUnit,
  readMarksLostByType,
  roundMarks,
  MARKS_LOST_BY_TYPE_VERSION,
  type MistakeGroupKey,
} from "../../lib/mistakeDisplay";

/** The grading kinds a pack paper is marked as (the server's grade buckets). */
export type BridgeKind = "chapter-test" | "worksheet" | "full-mock";

export interface BridgePaper {
  code: string;
  kind: BridgeKind;
  /** Row label: "Chapter Test 1", "Real Numbers · Worksheet", "Maths · Mock paper 3". */
  label: string;
  subject: PackSubject;
  /** Chapter slug (chapter test / worksheet); "" for a mock. */
  chapter: string;
}

/** The sample graded sheet BRIDGE-PDF-1 hosts once as a static asset (its notes: BRIDGE_SAMPLE_PDF_PATH). */
export const BRIDGE_SAMPLE_PDF_PATH = "/media/lazytopper-marked-sample-PK-M-RN-CT1.pdf";
/** CBQ-SAMPLE-2 (owner 9 Nov 16:06): the CBQ Pack's own marked sample (same file as lib/packs/packBridge BRIDGE_SAMPLE_CBQ_PDF_PATH). */
export const BRIDGE_SAMPLE_CBQ_PDF_PATH = "/media/lazytopper-marked-sample-PK-M-RN-CBQ1.pdf";

/**
 * Which marked sample "See a marked sample" opens. The link is page-level (one link above all the packs), so the CBQ sample is used only
 * when the student owns CBQ Packs and nothing else; any other mix (or none) keeps the Chapter Test sample.
 */
export function bridgeSamplePath(packs: ReadonlyArray<Pick<OwnedPack, "sku">>): string {
  return packs.length > 0 && packs.every((p) => p.sku === "pack_cbq") ? BRIDGE_SAMPLE_CBQ_PDF_PATH : BRIDGE_SAMPLE_PDF_PATH;
}

/** Where "See Board Pass" goes: the existing Board Pass page. No checkout code here. */
export const BRIDGE_BOARD_PASS_HREF = "/pricing";

/** Analytics slug of this card (`sale_moment_shown` / `sale_moment_tap` surface). */
export const BRIDGE_ANALYTICS_SURFACE = "my_packs";

/** Rows shown per pack before "+ N more papers". */
export const BRIDGE_ROWS_COLLAPSED = 4;

/** Approved copy (owner 19:38), with the coordinator's truth fix to the free line (BRIDGE-PDF-1 §2.1). */
export const BRIDGE_COPY = {
  firstMarked: "Your first paper is marked",
  heading: "Get your papers marked",
  intro: "Write on paper, upload a photo, get CBSE examiner style marks in about a minute.",
  // MYPACKS-TS-1 truth fix: the one free grade per kind is still true for a worksheet (server first-free); on Chapter Tests and Full Mocks a free
  // or trial account gets the MCQs marked, and written answers need the Board Pass or the Test Series (TEST-SERIES-1, client gate).
  free: "Every account gets its first worksheet marked free. On chapter tests and full mocks, free accounts get the MCQs marked; written answers are checked with the Board Pass or the Test Series.",
  sample: "See a marked sample",
  passKicker: "Board Pass",
  passTitle: "Your pack has the questions. Board Pass marks every answer.",
  /** MYPACKS-TS-1: for a Test Series owner (their tests' written answers are already checked) - true copy, with the Board Pass link. */
  passTitleSeries: "Your Test Series checks your test answers. The Board Pass adds the rest: Answer Checker for any question, worksheets, your personal tutor and Mistake Intelligence.",
  passCta: "See Board Pass",
  passKeep: "Keep using your pack either way — it is yours for good.",
  freeLeft: "free mark left",
  withPass: "with Board Pass",
} as const;

/** The approved Board Pass benefits. The second line's example ("like HCF vs LCM above") is the mock-up's sample, so it is dropped. */
export const BRIDGE_PASS_POINTS: ReadonlyArray<{ lead: string; rest: string }> = [
  { lead: "CBSE examiner style marking", rest: ` of every paper in every pack, ${VALIDITY_SHORT}` },
  { lead: "Practice aimed at where you lose marks", rest: "" },
  { lead: "Your personal tutor", rest: " for any doubt, any chapter" },
];

function chapterPapers(slug: string, withChapter: boolean): BridgePaper[] {
  const subject = subjectOfChapter(slug);
  if (!subject) return [];
  const pre = withChapter ? `${packChapterLabel(slug)} · ` : "";
  return [
    { code: packPaperCode({ kind: "ct1", chapter: slug }), kind: "chapter-test", label: `${pre}Chapter Test 1`, subject, chapter: slug },
    { code: packPaperCode({ kind: "ct2", chapter: slug }), kind: "chapter-test", label: `${pre}Chapter Test 2`, subject, chapter: slug },
    { code: packPaperCode({ kind: "ws", chapter: slug }), kind: "worksheet", label: `${pre}Worksheet`, subject, chapter: slug },
  ];
}

function mockPapers(subject: PackSubject, withSubject: boolean): BridgePaper[] {
  const pre = withSubject ? `${subject === "science" ? "Science" : "Maths"} · ` : "";
  const out: BridgePaper[] = [];
  for (let n = 1; n <= MOCKS_PER_SUBJECT; n += 1) {
    out.push({ code: packPaperCode({ kind: "mock", subject, n }), kind: "full-mock", label: `${pre}Mock paper ${n}`, subject, chapter: "" });
  }
  return out;
}

const isSubject = (s: string): s is PackSubject => s === "maths" || s === "science";

/**
 * The gradable papers a pack prints, in the pack's own order (chapters, then mocks). CBQ packs: [] here (their papers come from
 * the student's records, `cbqPapersFromRecords`). Unknown sku / target: [].
 */
export function packPapers(pack: Pick<OwnedPack, "sku" | "target">): BridgePaper[] {
  switch (pack.sku) {
    case "pack_chapter":
      return PACK_CHAPTER_SLUGS.includes(pack.target) ? chapterPapers(pack.target, false) : [];
    case "pack_mock":
      return isSubject(pack.target) ? mockPapers(pack.target, false) : [];
    case "pack_subject":
      return isSubject(pack.target)
        ? [...chaptersOfSubject(pack.target).flatMap((s) => chapterPapers(s, true)), ...mockPapers(pack.target, false)]
        : [];
    case "pack_bundle":
      return [...PACK_CHAPTER_SLUGS.flatMap((s) => chapterPapers(s, true)), ...PACK_SUBJECTS.flatMap((s) => mockPapers(s, true))];
    default:
      return [];
  }
}

/** A CBQ pack paper code (BRIDGE-CODES-1 scheme `PK-<M|S>-<TOPIC>-CBQ<k>`). */
const CBQ_CODE_RE = /^PK-([MS])-[A-Z0-9]+-CBQ\d+(?:-V\d+)?$/;

/** A CBQ pack's papers = the CBQ papers this student has downloaded (their own records). Nothing is listed before that. */
export function cbqPapersFromRecords(subject: string, records: readonly SessionRecord[]): BridgePaper[] {
  if (!isSubject(subject)) return [];
  const letter = subject === "science" ? "S" : "M";
  const out: BridgePaper[] = [];
  const seen = new Set<string>();
  for (const r of records) {
    const m = r && typeof r.id === "string" ? CBQ_CODE_RE.exec(r.id) : null;
    if (!m || m[1] !== letter || r.surface !== "worksheet" || seen.has(r.id)) continue;
    seen.add(r.id);
    const chapter = (r.topicKeys || []).find((k) => typeof k === "string" && !!k && !k.startsWith("mixed:")) || "";
    out.push({ code: r.id, kind: "worksheet", label: (typeof r.title === "string" && r.title.trim()) || r.id, subject, chapter });
  }
  return out;
}

/** What the server said about this account's grading (GET /api/usage/limits), or null when unknown. */
export interface GradeAllowance {
  enforced: boolean;
  tier: string | null;
  /** Per kind: is this account's one free grade of that kind still unused? Absent kind = not reported. */
  firstFree: Partial<Record<BridgeKind, boolean>>;
  /** Per kind: graded papers still allowed in this window (a trial's 1 per 7 days). Absent = not reported. */
  remaining?: Partial<Record<BridgeKind, number>>;
}

/** Parse the limits summary body; null on anything unexpected (unknown -> no status words). */
export function parseGradeAllowance(body: unknown): GradeAllowance | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const firstFree: Partial<Record<BridgeKind, boolean>> = {};
  const remaining: Partial<Record<BridgeKind, number>> = {};
  const g = b.grade && typeof b.grade === "object" ? (b.grade as Record<string, unknown>) : null;
  if (g) {
    for (const k of ["chapter-test", "worksheet", "full-mock"] as const) {
      const v = g[k] && typeof g[k] === "object" ? (g[k] as Record<string, unknown>) : null;
      if (!v) continue;
      if (typeof v.firstFreeAvailable === "boolean") firstFree[k] = v.firstFreeAvailable;
      if (typeof v.remaining === "number" && Number.isFinite(v.remaining) && v.remaining >= 0) remaining[k] = v.remaining;
    }
  }
  return { enforced: b.enforced === true, tier: typeof b.tier === "string" ? b.tier : null, firstFree, remaining };
}

/**
 * What one ungraded paper of `kind` may say. `freeLeft` = this kind's one free grade is unused (only the FIRST such row says so);
 * `other` = what every other ungraded row of that kind says.
 *  - paid Board Pass: never free, every row "with Board Pass";
 *  - Basic: the limits gate on -> the server's per-kind flag, then the 402 ("with Board Pass"); gate off -> the 402 for all;
 *  - trial (metered): the server's flag; a row beyond it says "with Board Pass" ONLY when this window has no grade left of that
 *    kind - while the trial still has one, it says nothing (it is not a Board Pass-only paper yet);
 *  - anything unknown (no read, unmetered trial, other tiers): nothing at all.
 */
function kindStatus(kind: BridgeKind, paidPass: boolean, allowance: GradeAllowance | null): { freeLeft: boolean; other: string | null } {
  if (paidPass) return { freeLeft: false, other: BRIDGE_COPY.withPass };
  if (!allowance) return { freeLeft: false, other: null };
  const ff = allowance.firstFree[kind];
  if (allowance.tier === "free") {
    if (!allowance.enforced) return { freeLeft: false, other: BRIDGE_COPY.withPass };
    return typeof ff === "boolean" ? { freeLeft: ff, other: BRIDGE_COPY.withPass } : { freeLeft: false, other: null };
  }
  if (allowance.tier === "trial" && allowance.enforced && typeof ff === "boolean") {
    const left = allowance.remaining?.[kind];
    return { freeLeft: ff, other: typeof left === "number" && left === 0 ? BRIDGE_COPY.withPass : null };
  }
  return { freeLeft: false, other: null };
}

export type BridgeRowState =
  | { kind: "marked"; awarded: number; total: number; partial: boolean; href: string }
  | { kind: "waiting"; href: string }
  | { kind: "not-downloaded" };

export interface BridgeRow {
  paper: BridgePaper;
  state: BridgeRowState;
  /** Status words after the code ("free mark left" / "with Board Pass"), or null. Never on a marked paper. */
  note: string | null;
}

const subjectSegment = (s: PackSubject | SessionSubject): "Maths" | "Science" => (s === "science" ? "Science" : "Maths");

/** Where a returned link sends the student back to: My packs. */
const RETURN_TO = "/packs";

function withPacksSource(path: string, params: Record<string, string>): string {
  const sp = new URLSearchParams(params);
  sp.set("source", "packs");
  sp.set("returnTo", RETURN_TO);
  return `${path}?${sp.toString()}`;
}

/**
 * The existing surface entry for a paper (the same routes Home's "papers waiting" uses, pendingPapers.ts `pendingPaperHref`):
 *  - waiting: worksheet `upload=`, chapter test `review=` (its pending record opens the upload step), full mock `upload=`;
 *  - marked: `review=` on all three, which reopens the stored scorecard read-only.
 */
export function paperHref(paper: BridgePaper, mode: "upload" | "review"): string {
  const subject = subjectSegment(paper.subject);
  if (paper.kind === "worksheet") {
    return withPacksSource("/practice/worksheets", { subject, scope: "full-subject", [mode]: paper.code });
  }
  if (paper.kind === "chapter-test") {
    return withPacksSource(`/chapter-test/10/${subject}/${encodeURIComponent(paper.chapter)}`, { review: paper.code });
  }
  return withPacksSource(`/full-mock/10/${subject}`, { [mode]: paper.code });
}

const PAPER_SURFACE: Record<BridgeKind, SessionRecord["surface"]> = {
  "chapter-test": "chapter-test",
  worksheet: "worksheet",
  "full-mock": "full-mock",
};

/** The student's own record for a paper (same code AND same surface), or null. */
export function recordFor(paper: BridgePaper, byCode: ReadonlyMap<string, SessionRecord>): SessionRecord | null {
  const r = byCode.get(paper.code);
  return r && r.surface === PAPER_SURFACE[paper.kind] ? r : null;
}

export function recordsByCode(records: readonly SessionRecord[]): Map<string, SessionRecord> {
  const m = new Map<string, SessionRecord>();
  for (const r of records) {
    if (!r || typeof r.id !== "string" || !r.id.startsWith("PK-")) continue;
    const prev = m.get(r.id);
    if (!prev || (Number(r.gradedAt) || 0) > (Number(prev.gradedAt) || 0)) m.set(r.id, r);
  }
  return m;
}

function stateOf(paper: BridgePaper, rec: SessionRecord | null): BridgeRowState {
  if (!rec) return { kind: "not-downloaded" };
  if (rec.status === "graded" || rec.status === "partial") {
    return {
      kind: "marked",
      awarded: roundMarks(Number(rec.marksAwarded) || 0),
      total: roundMarks(Number(rec.marksTotal) || 0),
      partial: rec.status === "partial",
      href: paperHref(paper, rec.status === "partial" ? "upload" : "review"),
    };
  }
  return { kind: "waiting", href: paperHref(paper, "upload") };
}

const rank = (s: BridgeRowState): number => (s.kind === "marked" ? 0 : s.kind === "waiting" ? 1 : 2);

/**
 * The rows of one pack: marked papers first (newest first), then papers downloaded and waiting (newest first), then the rest in
 * the pack's own order. The one free grade of each kind is shown on the first ungraded paper of that kind only.
 * `freeTaken` carries the kinds already given their "free mark left" by an earlier pack in the list (one free per ACCOUNT).
 */
export function bridgeRows(
  papers: readonly BridgePaper[],
  byCode: ReadonlyMap<string, SessionRecord>,
  opts: { paidPass: boolean; allowance: GradeAllowance | null; freeTaken?: Set<BridgeKind> },
): BridgeRow[] {
  const items = papers.map((paper, i) => {
    const rec = recordFor(paper, byCode);
    return { paper, rec, state: stateOf(paper, rec), i };
  });
  items.sort((a, b) => {
    const d = rank(a.state) - rank(b.state);
    if (d !== 0) return d;
    if (a.state.kind !== "not-downloaded") return (Number(b.rec?.gradedAt) || 0) - (Number(a.rec?.gradedAt) || 0) || a.i - b.i;
    return a.i - b.i;
  });
  const taken = opts.freeTaken ?? new Set<BridgeKind>();
  return items.map(({ paper, state }) => {
    // A marked (or partly marked) paper already had its grade: no status words on it.
    if (state.kind === "marked") return { paper, state, note: null };
    const st = kindStatus(paper.kind, opts.paidPass, opts.allowance);
    if (st.freeLeft && !taken.has(paper.kind)) {
      taken.add(paper.kind);
      return { paper, state, note: BRIDGE_COPY.freeLeft };
    }
    return { paper, state, note: st.other };
  });
}

/** "25.5/31" */
export function scoreText(awarded: number, total: number): string {
  return `${roundMarks(awarded)}/${roundMarks(total)}`;
}

/** The first pack paper this student had marked (earliest graded record among the given papers), or null. */
export function firstMarked(
  papers: readonly BridgePaper[],
  byCode: ReadonlyMap<string, SessionRecord>,
): { paper: BridgePaper; record: SessionRecord } | null {
  let best: { paper: BridgePaper; record: SessionRecord } | null = null;
  const seen = new Set<string>();
  for (const paper of papers) {
    if (seen.has(paper.code)) continue;
    seen.add(paper.code);
    const rec = recordFor(paper, byCode);
    if (!rec || rec.status !== "graded" || !(Number(rec.marksTotal) > 0)) continue;
    if (!best || (Number(rec.gradedAt) || 0) < (Number(best.record.gradedAt) || 0)) best = { paper, record: rec };
  }
  return best;
}

const GROUP_PHRASE: Record<MistakeGroupKey, string> = {
  knowledge: "a knowledge gap",
  technique: "exam technique",
  careless: "careless slips",
};

function topGroup(values: Record<MistakeGroupKey, number>): MistakeGroupKey | null {
  let top: MistakeGroupKey | null = null;
  for (const g of MISTAKE_GROUPS) {
    if (values[g.key] > 0 && (top === null || values[g.key] > values[top])) top = g.key;
  }
  return top;
}

/**
 * The first-marked card's one line, from the record alone (the scorecard's own stored numbers, never invented):
 *  - marks per kind stored (GRADER-CORE-1 v2) -> "Most marks lost to <kind> (<n> marks)." (+ the careless marks when they are not the top)
 *  - counts only -> "Most mistakes: <kind> (<n>)."
 *  - nothing lost -> the scorecard's full-marks line;  nothing recorded -> null (the card says to open the scorecard).
 */
export function mistakeLine(record: SessionRecord): string | null {
  const awarded = Number(record.marksAwarded) || 0;
  const total = Number(record.marksTotal) || 0;
  const m = record.marksLostByTypeVersion === MARKS_LOST_BY_TYPE_VERSION ? readMarksLostByType(record.marksLostByType) : null;
  if (m) {
    const g = groupMarks(m);
    const top = topGroup(g);
    if (top) {
      const lead = `Most marks lost to ${GROUP_PHRASE[top]} (${marksWithUnit(g[top])}).`;
      if (top !== "careless" && g.careless > 0) {
        return `${lead} ${marksWithUnit(g.careless)} ${roundMarks(g.careless) === 1 ? "was a careless slip" : "were careless slips"} you can stop today.`;
      }
      return lead;
    }
  } else {
    const g = groupCounts(record.fourType);
    const top = topGroup(g);
    if (top) return `Most mistakes: ${GROUP_PHRASE[top]} (${countWithUnit(g[top], "mistake")}).`;
  }
  if (total > 0 && awarded >= total) return "Full marks on everything graded.";
  return null;
}
