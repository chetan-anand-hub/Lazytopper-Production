import {
  MISTAKE_TYPE_LABEL,
  STORED_MISTAKE_TYPES,
  marksWithUnit,
  roundMarks,
  toCounts,
  type StoredMistakeType,
} from "../../../lib/mistakeDisplay";
import type { ScorecardSurface, ScorecardVariant } from "../scorecardVariants";
import { BYTE_TIPS, ZIGGY_LINES, fillLine, type ByteTipKey, type ZiggyMood } from "./shareCopy";

/**
 * SHARE-CARD-1 (extends SHARE-SCORE-1) - the ONE privacy boundary between a scorecard and the
 * image a student posts to WhatsApp / Instagram.
 *
 * The share image is NOT a screenshot of the live scorecard. It is drawn from this model, and
 * this model is built from an explicit ALLOW-LIST of a variant's fields: the score, the surface,
 * a chapter/subject label, the four Mistake-Intelligence types (count from `fourType`, marks
 * lost from `marksLost.byType`), the not-attempted / reason-not-recorded marks, an objective
 * right/wrong count where the variant itself proves it, and a date. Nothing else can reach the
 * image, because nothing else is copied here:
 *   - no email, no uid, no school (a variant carries none); a FIRST NAME only when the student
 *     ticks it (default off), cleaned by the caller (firstNameOf)
 *   - no surface CODE (WS-/CT-/FM-/QP-/CI- codes are stripped from any label)
 *   - no answers, no working, no wrong answers, no steps, no verdicts, no notes
 *
 * Display only (CLAUDE.md 4a): reads a built variant, writes nothing, grades nothing.
 */

export type ShareSize = "story" | "square";
export const SHARE_SIZES: Readonly<Record<ShareSize, { width: number; height: number }>> = {
  story: { width: 1080, height: 1920 },
  square: { width: 1080, height: 1080 },
};

/** One of the four MI rows. `count` / `marks` are null when the grade does not carry that
 *  figure (a count-only grade has no marks; a marks grade without `fourType` has no count) -
 *  never an invented 0. A real 0 is shown as 0. */
export interface ShareTypeRow {
  type: StoredMistakeType;
  label: string;
  count: number | null;
  marks: number | null;
  biggest: boolean;
}

export type ShareMiMode = "marks" | "counts" | "objective" | "none";

export interface ShareBiggest {
  kind: StoredMistakeType | "unattempted";
  label: string;
  marks: number | null;
  count: number | null;
}

export interface ShareCardModel {
  surface: ScorecardSurface;
  /** e.g. "Chapter Test". */
  surfaceLabel: string;
  /** The chapter / subject the score is for, or null when the scorecard names none. */
  context: string | null;
  awarded: number;
  total: number;
  mi: ShareMiMode;
  /** The four types in the product's order, or null (objective / none). */
  rows: ShareTypeRow[] | null;
  /** Marks lost on questions not attempted (never a mistake). 0 = not shown. */
  notAttemptedMarks: number;
  /** Marks lost with no reason recorded. 0 = not shown. */
  untypedMarks: number;
  /** Objective-only set: right / wrong, ONLY when the variant proves both. */
  objective: { right: number; wrong: number } | null;
  biggest: ShareBiggest | null;
  ziggy: { mood: ZiggyMood; pose: (typeof ZIGGY_LINES)[ZiggyMood]["pose"]; line: string };
  byte: { key: ByteTipKey; pose: (typeof BYTE_TIPS)[ByteTipKey]["pose"]; line: string };
  /** Shown only when the student ticked "Add my first name". */
  firstName: string | null;
  showMascots: boolean;
  size: ShareSize;
  /** The public landing link with UTM - never the student's private result. */
  link: string;
  dateLabel: string;
}

const SITE = "https://www.lazytopper.com";
/** The public landing a shared image points to. */
export const SHARE_LANDING_PATH = "/check-your-answer";

/** utm_campaign value per surface (the analytics surface names). */
export const SHARE_CAMPAIGN: Readonly<Record<ScorecardSurface, string>> = {
  worksheet: "worksheet",
  "quick-practice": "quick_practice",
  "chapter-test": "chapter_test",
  "full-mock": "full_mock",
  "check-improve": "check_improve",
};

/** The public link with `utm_source=share&utm_medium=scorecard&utm_campaign=<surface>`. */
export function shareLink(surface: ScorecardSurface): string {
  const campaign = SHARE_CAMPAIGN[surface] ?? "scorecard";
  return `${SITE}${SHARE_LANDING_PATH}?utm_source=share&utm_medium=scorecard&utm_campaign=${campaign}`;
}

const SURFACE_LABEL: Record<ScorecardSurface, string> = {
  worksheet: "Worksheet",
  "quick-practice": "Quick Practice",
  "chapter-test": "Chapter Test",
  "full-mock": "Full Mock",
  "check-improve": "Check & Improve",
};

/** How the share text names a scorecard that carries no chapter label. */
const SURFACE_PHRASE: Record<ScorecardSurface, string> = {
  worksheet: "a worksheet",
  "quick-practice": "Quick Practice",
  "chapter-test": "a chapter test",
  "full-mock": "a full mock",
  "check-improve": "a Check & Improve paper",
};

/** Head labels that name a surface, not a chapter - never shown as the context. */
const GENERIC_LABELS = new Set([
  "session scorecard",
  "check & improve paper",
  "checked paper",
  "uploaded paper",
  "quick practice",
  "chapter test",
  "full mock",
  "worksheet",
]);

/** Any surface code or internal id, whole, any case, hex tails included: `WS-M-RN-03`,
 *  `CT-M-RN-02`, `FM-M-04`, `CI-M-TR-01`, `QP-M-RN-3fa9c0b1` (sessionRecords.ts:1200),
 *  `ws-…`/`ct-…`/`fm-…`/`qp-…` ids, `UNL-…` paper ids. */
const CODE_TOKEN = /\b(?:WS|CT|FM|CI|QP|UNL)-[A-Z0-9]+(?:-[A-Z0-9]+)*/gi;
/** The ONLY head whose subtitle may lend the chapter: the LIVE C&I builder's fixed title
 *  (scorecardVariants.ts:1798), whose subtitle leads with the topic. A saved / reopened
 *  record's subtitle leads with its CODE and is never read. */
const LIVE_CI_TITLE = "check & improve paper";
const MAX_CONTEXT = 60;

function cleanSegment(raw: string): string | null {
  const s = raw
    .replace(CODE_TOKEN, "")
    .replace(/\s+/g, " ")
    .replace(/^[\s\-–—:|,#.]+|[\s\-–—:|,#.]+$/g, "")
    .trim();
  // Nothing left, or only digits/punctuation (a code's remnant), is not a chapter.
  if (!s || !/[A-Za-z]/.test(s) || GENERIC_LABELS.has(s.toLowerCase())) return null;
  // A status segment ("graded just now") is not a chapter.
  if (/^(graded|submitted|fully graded|saved)\b/i.test(s)) return null;
  return s.length > MAX_CONTEXT ? `${s.slice(0, MAX_CONTEXT - 3).trimEnd()}...` : s;
}

function firstSegment(label: string | null | undefined): string | null {
  if (!label) return null;
  return cleanSegment(label.split("·")[0] ?? "");
}

/**
 * The chapter/subject label: the head title's first segment ("Real Numbers · Test #2" ->
 * "Real Numbers"; "Maths · Mock #4" -> "Maths"). ONLY the live C&I head ("Check & Improve
 * paper") falls back to the subtitle's first segment, which that builder leads with the
 * topic; every other head (incl. a saved / reopened record, whose subtitle leads with its
 * code) never reads the subtitle. Codes are stripped; nothing left -> null (honest-or-silent).
 */
export function shareContextOf(variant: Pick<ScorecardVariant, "title" | "subtitle">): string | null {
  const fromTitle = firstSegment(variant.title);
  if (fromTitle) return fromTitle;
  if ((variant.title ?? "").trim().toLowerCase() !== LIVE_CI_TITLE) return null;
  return firstSegment(variant.subtitle);
}

/**
 * Whether a scorecard offers "Share result": a REAL graded marks score only.
 * Not on: a deferred stub, the all-pending / nothing-read state, an attempts-only hero
 * (no graded score), a 0-mark total, or the signed-out Check & Improve preview (its
 * "Save" sign-up row, scorecardVariants.ts signUpToSave).
 */
export function canShareScore(variant: ScorecardVariant): boolean {
  if (variant.deferred || variant.allPending) return false;
  if (variant.score.kind !== "marks") return false;
  const { awarded, total } = variant.score;
  if (!Number.isFinite(awarded) || !Number.isFinite(total) || total <= 0 || awarded < 0) return false;
  if (variant.actions.some((a) => a.tag === "Save")) return false;
  return true;
}

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/**
 * Right / wrong on an objective-only set, ONLY where the variant itself proves both numbers:
 *   - a graded sheet whose every answer is objective with a real awarded/available pair
 *     (whole mark or nothing: right = full mark);
 *   - Quick Practice's MCQ-only scorecard when its marks ARE its MCQ count (one mark each:
 *     total === gradedCount), so right = awarded and wrong = total - awarded.
 * Anything else -> null (the image shows the score alone, never a guessed split).
 */
export function objectiveSplitOf(variant: ScorecardVariant): { right: number; wrong: number } | null {
  if (variant.score.kind !== "marks") return null;
  const ga = variant.gradedAnswers;
  if (ga && ga.length > 0) {
    if (!ga.every((a) => a.objective === true && isNum(a.awarded) && isNum(a.available))) return null;
    const right = ga.filter((a) => (a.awarded as number) >= (a.available as number)).length;
    return { right, wrong: ga.length - right };
  }
  const { awarded, total, gradedCount } = variant.score;
  if (variant.surface === "quick-practice" && isNum(gradedCount) && gradedCount > 0 && total === gradedCount && Number.isInteger(awarded)) {
    return { right: awarded, wrong: total - awarded };
  }
  return null;
}

/** The four MI rows, the mode, and the two non-mistake lines. */
function miOf(variant: ScorecardVariant): {
  mi: ShareMiMode;
  rows: ShareTypeRow[] | null;
  notAttemptedMarks: number;
  untypedMarks: number;
  objective: { right: number; wrong: number } | null;
} {
  const counts = variant.fourType != null ? toCounts(variant.fourType) : null;
  const pm = variant.marksLost;
  if (pm) {
    const rows = STORED_MISTAKE_TYPES.map((type) => ({
      type,
      label: MISTAKE_TYPE_LABEL[type],
      count: counts ? counts[type] : null,
      marks: roundMarks(pm.byType[type]),
      biggest: false,
    }));
    return { mi: "marks", rows, notAttemptedMarks: roundMarks(pm.byType.unattempted), untypedMarks: roundMarks(pm.byType.untyped), objective: null };
  }
  if (counts) {
    const rows = STORED_MISTAKE_TYPES.map((type) => ({ type, label: MISTAKE_TYPE_LABEL[type], count: counts[type], marks: null, biggest: false }));
    return { mi: "counts", rows, notAttemptedMarks: 0, untypedMarks: 0, objective: null };
  }
  const objective = objectiveSplitOf(variant);
  return { mi: objective ? "objective" : "none", rows: null, notAttemptedMarks: 0, untypedMarks: 0, objective };
}

/** The biggest loss: the type (or not-attempted) with the most MARKS lost; in a count-only
 *  grade, the type with the most mistakes. Ties keep the product's type order. None lost -> null. */
function biggestOf(mi: ShareMiMode, rows: ShareTypeRow[] | null, notAttemptedMarks: number): ShareBiggest | null {
  if (!rows) return null;
  let best: ShareBiggest | null = null;
  if (mi === "marks") {
    for (const r of rows) {
      const m = r.marks ?? 0;
      if (m > 0 && (!best || m > (best.marks ?? 0))) best = { kind: r.type, label: r.label, marks: r.marks, count: r.count };
    }
    if (notAttemptedMarks > 0 && (!best || notAttemptedMarks > (best.marks ?? 0))) {
      best = { kind: "unattempted", label: "Not attempted", marks: notAttemptedMarks, count: null };
    }
    return best;
  }
  for (const r of rows) {
    const c = r.count ?? 0;
    if (c > 0 && (!best || c > (best.count ?? 0))) best = { kind: r.type, label: r.label, marks: null, count: r.count };
  }
  return best;
}

/** Ziggy's mood from the score's own fraction (and a not-attempted biggest loss). */
export function ziggyMoodOf(awarded: number, total: number, biggest: ShareBiggest | null): ZiggyMood {
  const pct = total > 0 ? awarded / total : 0;
  if (pct >= 0.8) return "great";
  if (biggest?.kind === "unattempted") return "hide";
  if (pct >= 0.5) return "mixed";
  return "oops";
}

function byteTipKey(
  mi: ShareMiMode,
  biggest: ShareBiggest | null,
  objective: { right: number; wrong: number } | null,
  lost: number,
): ByteTipKey {
  if (mi === "objective" && objective) return objective.wrong > 0 ? "objective-wrong" : "objective-clean";
  if (mi === "marks") {
    if (biggest) return biggest.kind;
    return lost <= 0 ? "clean" : "none";
  }
  if (mi === "counts") {
    if (biggest) return "counts";
    return lost <= 0 ? "clean" : "none";
  }
  return "none";
}

export interface ShareModelOptions {
  dateLabel: string;
  size?: ShareSize;
  /** "Show Byte & Ziggy" - default ON. */
  showMascots?: boolean;
  /** The CLEANED first name, passed only when the student ticked "Add my first name". */
  firstName?: string | null;
}

/** Build the share model, or null when the scorecard is not shareable. */
export function buildShareCardModel(variant: ScorecardVariant, opts: ShareModelOptions): ShareCardModel | null {
  if (!canShareScore(variant) || variant.score.kind !== "marks") return null;
  const awarded = roundMarks(variant.score.awarded);
  const total = roundMarks(variant.score.total);
  const { mi, rows, notAttemptedMarks, untypedMarks, objective } = miOf(variant);
  const biggest = biggestOf(mi, rows, notAttemptedMarks);
  const markedRows = rows ? rows.map((r) => ({ ...r, biggest: biggest?.kind === r.type })) : null;
  const mood = ziggyMoodOf(awarded, total, biggest);
  const tipKey = byteTipKey(mi, biggest, objective, roundMarks(total - awarded));
  const tip = BYTE_TIPS[tipKey];
  const line = fillLine(tip.line, {
    marks: biggest?.marks != null ? marksWithUnit(biggest.marks) : undefined,
    count: biggest?.count != null ? String(biggest.count) : undefined,
    label: biggest?.label,
  });
  const name = typeof opts.firstName === "string" && opts.firstName.trim() ? opts.firstName.trim() : null;
  return {
    surface: variant.surface,
    surfaceLabel: SURFACE_LABEL[variant.surface] ?? "Scorecard",
    context: shareContextOf(variant),
    awarded,
    total,
    mi,
    rows: markedRows,
    notAttemptedMarks,
    untypedMarks,
    objective,
    biggest,
    ziggy: { mood, pose: ZIGGY_LINES[mood].pose, line: ZIGGY_LINES[mood].line },
    byte: { key: tipKey, pose: tip.pose, line },
    firstName: name,
    showMascots: opts.showMascots !== false,
    size: opts.size ?? "story",
    link: shareLink(variant.surface),
    dateLabel: opts.dateLabel,
  };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "17 Oct 2026" - the day the student shared it. */
export function formatShareDate(d: Date): string {
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** The message that rides with the image (and is the whole wa.me message on desktop). */
export function shareText(model: Pick<ShareCardModel, "awarded" | "total" | "context" | "surface">): string {
  const where = model.context ?? SURFACE_PHRASE[model.surface] ?? "a test";
  return `I scored ${model.awarded}/${model.total} in ${where} on LazyTopper. See where your marks go: ${shareLink(model.surface)}`;
}

/** The desktop fallback: WhatsApp's own share link with the text pre-filled. */
export function whatsAppShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
