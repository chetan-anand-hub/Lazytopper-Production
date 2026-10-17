import { marksGroupRows, roundMarks } from "../../../lib/mistakeDisplay";
import type { ScorecardSurface, ScorecardVariant } from "../scorecardVariants";

/**
 * SHARE-SCORE-1 - the ONE privacy boundary between a scorecard and the image a student
 * posts to WhatsApp.
 *
 * The share image is NOT a screenshot of the live scorecard. It is drawn from this model,
 * and this model is built from an explicit ALLOW-LIST of a variant's fields: the score, the
 * surface, a chapter/subject label, the three mistake groups in MARKS, and a date. Nothing
 * else can reach the image, because nothing else is copied here:
 *   - no name, no email, no uid (a variant carries none)
 *   - no surface CODE (WS-/CT-/FM-/QP-/CI- codes are stripped from any label)
 *   - no answers, no working, no wrong answers, no steps, no verdicts, no notes
 *
 * Display only (CLAUDE.md 4a): reads a built variant, writes nothing, grades nothing.
 */

export interface ShareSplitRow {
  key: string;
  label: string;
  marks: number;
}

export interface ShareCardModel {
  surface: ScorecardSurface;
  /** e.g. "Chapter Test". */
  surfaceLabel: string;
  /** The chapter / subject the score is for, or null when the scorecard names none. */
  context: string | null;
  awarded: number;
  total: number;
  /** The three mistake groups in MARKS, only those that lost marks. Null when the grade
   *  carries no typed marks (count-only) - the image then has no split at all. */
  split: ShareSplitRow[] | null;
  dateLabel: string;
}

export const SHARE_LINK = "https://www.lazytopper.com/?utm_source=whatsapp&utm_medium=share&utm_campaign=scorecard";

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

/** Any surface code (`WS-M-RN-03`, `CT-M-RN-02`, `FM-M-04`, `CI-1`, ...). */
const CODE_TOKEN = /\b[A-Z]{2}-[A-Z0-9]+(?:-[A-Z0-9]+)*\b/g;
const MAX_CONTEXT = 60;

function cleanSegment(raw: string): string | null {
  const s = raw.replace(CODE_TOKEN, "").replace(/\s+/g, " ").trim();
  if (!s || GENERIC_LABELS.has(s.toLowerCase())) return null;
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
 * "Real Numbers"; "Maths · Mock #4" -> "Maths"). A generic head ("Check & Improve paper",
 * "Session scorecard") falls back to the subtitle's first segment, which the live C&I
 * builder leads with the topic. Codes are stripped; nothing left -> null (honest-or-silent).
 */
export function shareContextOf(variant: Pick<ScorecardVariant, "title" | "subtitle">): string | null {
  return firstSegment(variant.title) ?? firstSegment(variant.subtitle);
}

/**
 * Whether a scorecard offers "Share my score": a REAL graded marks score only.
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

function splitOf(variant: ScorecardVariant): ShareSplitRow[] | null {
  const pm = variant.marksLost;
  if (!pm || !(pm.lost > 0)) return null;
  const rows = marksGroupRows(pm.byType)
    .filter((r) => r.marks > 0)
    .map((r) => ({ key: r.group.key, label: r.group.label, marks: r.marks }));
  return rows.length > 0 ? rows : null;
}

/** Build the share model, or null when the scorecard is not shareable. */
export function buildShareCardModel(variant: ScorecardVariant, dateLabel: string): ShareCardModel | null {
  if (!canShareScore(variant) || variant.score.kind !== "marks") return null;
  return {
    surface: variant.surface,
    surfaceLabel: SURFACE_LABEL[variant.surface] ?? "Scorecard",
    context: shareContextOf(variant),
    awarded: roundMarks(variant.score.awarded),
    total: roundMarks(variant.score.total),
    split: splitOf(variant),
    dateLabel,
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
  return `I scored ${model.awarded}/${model.total} in ${where} on LazyTopper. Try it: ${SHARE_LINK}`;
}

/** The desktop fallback: WhatsApp's own share link with the text pre-filled. */
export function whatsAppShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
