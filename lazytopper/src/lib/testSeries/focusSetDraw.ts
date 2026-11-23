/**
 * TS-THEMES-1 - the ONE-TIME draw of the focus sets and their theme rules. Used ONLY by focusSets.guard.test.ts: in write mode it
 * draws the 30 sets and commits them (focusSetIds.json + server/data/testSeriesFocusSets.json); in guard mode it re-checks every
 * committed set against the rules below. The pages never import this (they build a set FROM its pinned ids: pinnedFocusSet.ts).
 *
 * WHICH ROWS (all of these, for every theme):
 *   - a SERVED bank row (getBankRowsForSubject) of a board chapter;
 *   - figure-safe (`needsMissingFigure` false: the app's ONE figure rule, as the Full Mock pool uses);
 *   - step-marked (`isStepMarked`: every solution step carries its [N mark] and they sum to the marks);
 *   - not a pack syllabus exclusion (PACK_SYLLABUS_EXCLUDED), and syllabus-clean by the caller's scan (the SAME scan the paid packs
 *     go through: scripts/src/syllabusGuard.ts banned sub-topics, OUT/FORMATIVE reference items, surface phrases, content lenses);
 *   - one row per question (questionKey), so a re-worded twin is never a second question.
 *
 * THE THEME RULES (by the NUMERIC `q.marks`, never the fused marks buckets):
 *   LA  Long answers          marks === 5.
 *   CB  Case-based            marks === 4, format "Case-Based", a real case (stem >= CBQ_MIN_CASE_CHARS), not a CBQ-pack fragment.
 *   SA  Tricky short answers  marks 2 or 3, difficulty "Hard".
 *   NU  Numericals            a Physics chapter (light, the eye, electricity, magnetic effects), marks 2..5, not a case study, the
 *                             FINAL ANSWER is a number with a unit, the stem gives at least one number with a unit, and at least HALF
 *                             of the marked solution steps are a calculation ("= <number>"). Conservative on purpose: a question that
 *                             only names a unit, or a mostly "draw / explain" question with one sum in it, is not a numerical.
 *
 * HOW A SET IS DRAWN (deterministic: seeded by the theme code, never Math.random): the theme's rows in three tiers, Hard, then Medium,
 * then Easy, each in a seeded shuffle; the sets fill ROUND-ROBIN (set 1 takes a row, then set 2, …) so each set gets a fair share of
 * the hardest rows. Each pick comes from the hardest tier that still has a row that fits, preferring a chapter the set does not have yet. A set takes a row only if it stays <= FOCUS_MAX_MARKS and is
 * complete once it reaches FOCUS_MIN_MARKS. No row is used twice within a theme.
 */
import type { CanonicalQuestion } from "../../data/predictionTypes";
import { questionKey } from "../../utils/questionKey";
import { mulberry32, seededShuffle } from "../../utils/balancedMockDraw";
import { BOARD_CHAPTER_KEYS } from "../../config/syllabusUnits2026-27";
import { needsMissingFigure } from "../figureSafe";
import { CBQ_MIN_CASE_CHARS, CBQ_PACK_EXCLUDED_IDS, PACK_SYLLABUS_EXCLUDED, hashSeed, isStepMarked } from "../packs/packContent";
import { FOCUS_SETS_PER_THEME, focusSetCode, focusSetMinutes, type FocusSubject, type FocusThemeId } from "./focusSets";

export const FOCUS_MIN_MARKS = 20;
export const FOCUS_MAX_MARKS = 25;

export const PHYSICS_CHAPTERS: ReadonlySet<string> = new Set([
  "light-reflection-and-refraction",
  "human-eye-and-colourful-world",
  "electricity",
  "magnetic-effects-of-electric-current",
]);

const UNIT = String.raw`(?:cm|mm|km|m|Ω|ohms?|kΩ|kV|mV|V|mA|A|kWh|kW|W|kJ|J|s|Dioptres?|dioptres?|Diopters?|diopters?|D|C|N|Hz)`;
/** A number followed by a physical unit ("−30 cm", "0.27 A", "+2 D", "4.4 Ω", "6 × 10^18"-style mantissas are read from the number). */
export const NUMBER_WITH_UNIT = new RegExp(String.raw`(?:^|[^A-Za-z0-9.])[−+-]?\d+(?:\.\d+)?\s*${UNIT}(?![A-Za-z0-9])`);
const CALCULATION = /[=≈]\s*[−+-]?\(?\d/;

const BOARD: ReadonlySet<string> = new Set(BOARD_CHAPTER_KEYS);

/** The rules every focus-set row meets, whatever its theme (the syllabus scan is the caller's: it needs node-only guard code). */
export function isFocusEligible(q: CanonicalQuestion): boolean {
  return (
    BOARD.has(q.topicKey) &&
    Number(q.marks) >= 2 &&
    !needsMissingFigure(q) &&
    !PACK_SYLLABUS_EXCLUDED.has(q.id) &&
    isStepMarked(q) &&
    !(Array.isArray(q.options) && q.options.length > 0)
  );
}

export function isNumerical(q: CanonicalQuestion): boolean {
  const marks = Number(q.marks);
  if (!PHYSICS_CHAPTERS.has(q.topicKey) || marks < 2 || marks > 5 || q.format === "Case-Based") return false;
  if (!NUMBER_WITH_UNIT.test(String(q.finalAnswer ?? ""))) return false;
  if (!NUMBER_WITH_UNIT.test(String(q.questionText ?? ""))) return false;
  // Mostly working: at least half of the marked steps are a calculation (a "draw / explain" part with one sum is not a numerical).
  const steps = (q.solutionSteps ?? []).filter(Boolean);
  const calc = steps.filter((s) => CALCULATION.test(String(s))).length;
  return steps.length > 0 && calc * 2 >= steps.length;
}

/** Does `q` meet the theme's own rule? (isFocusEligible is checked separately.) */
export function themeAdmits(theme: FocusThemeId, q: CanonicalQuestion): boolean {
  const marks = Number(q.marks);
  switch (theme) {
    case "LA":
      return marks === 5;
    case "CB":
      return marks === 4 && q.format === "Case-Based" && String(q.questionText ?? "").length >= CBQ_MIN_CASE_CHARS && !CBQ_PACK_EXCLUDED_IDS.has(q.id);
    case "SA":
      return (marks === 2 || marks === 3) && q.difficulty === "Hard";
    case "NU":
      return isNumerical(q);
    default:
      return false;
  }
}

/** The board section a focus-set row is printed in, by its marks: 2 -> B, 3 -> C, 5 -> D, 4 -> E (the full paper's slots). */
export function focusSectionOf(marks: number): "B" | "C" | "D" | "E" {
  if (marks === 2) return "B";
  if (marks === 3) return "C";
  if (marks === 5) return "D";
  return "E";
}

export interface DrawnFocusSet {
  key: string;
  code: string;
  ids: string[];
  sections: string;
  marks: number;
  minutes: number;
}

const TIER: Readonly<Record<string, number>> = { Hard: 0, Medium: 1, Easy: 2 };

/**
 * Draw FOCUS_SETS_PER_THEME sets for one theme from `rows` (the caller has already applied isFocusEligible, the syllabus scan and
 * themeAdmits). Returns fewer sets only if the rows cannot fill them (each returned set is complete: >= FOCUS_MIN_MARKS).
 */
export function drawFocusSetsForTheme(subject: FocusSubject, theme: FocusThemeId, rows: readonly CanonicalQuestion[]): DrawnFocusSet[] {
  // One row per question; bank order decides the keeper.
  const seenKey = new Set<string>();
  const seenId = new Set<string>();
  const unique: CanonicalQuestion[] = [];
  for (const q of rows) {
    const k = questionKey(q);
    if (seenKey.has(k) || seenId.has(q.id)) continue;
    seenKey.add(k);
    seenId.add(q.id);
    unique.push(q);
  }
  const rand = mulberry32(hashSeed(`tsfs:${subject}:${theme}`));
  const byTier = [0, 1, 2].map((t) => seededShuffle(unique.filter((q) => (TIER[q.difficulty] ?? 1) === t), rand));
  const used = new Set<string>();
  const sets = Array.from({ length: FOCUS_SETS_PER_THEME }, () => ({ rows: [] as CanonicalQuestion[], marks: 0 }));
  const done = (s: { marks: number }) => s.marks >= FOCUS_MIN_MARKS;
  let progressed = true;
  while (progressed && sets.some((s) => !done(s))) {
    progressed = false;
    for (const s of sets) {
      if (done(s)) continue;
      const fits = (q: CanonicalQuestion) => !used.has(q.id) && s.marks + Number(q.marks) <= FOCUS_MAX_MARKS;
      const chapters = new Set(s.rows.map((q) => q.topicKey));
      // The hardest tier that still has a fitting row wins; inside it, a chapter the set does not have yet.
      let pick: CanonicalQuestion | undefined;
      for (const tier of byTier) {
        pick = tier.find((q) => fits(q) && !chapters.has(q.topicKey)) ?? tier.find(fits);
        if (pick) break;
      }
      if (!pick) continue;
      used.add(pick.id);
      s.rows.push(pick);
      s.marks += Number(pick.marks);
      progressed = true;
    }
  }
  const out: DrawnFocusSet[] = [];
  sets.forEach((s, i) => {
    if (!done(s)) return;
    // Board order on the paper: by section (B, C, D, E), the draw order kept inside a section.
    const ordered = [...s.rows].sort((a, b) => focusSectionOf(Number(a.marks)).localeCompare(focusSectionOf(Number(b.marks))));
    const code = focusSetCode(subject, theme, i + 1);
    out.push({
      key: `TS-${code}`,
      code,
      ids: ordered.map((q) => q.id),
      sections: ordered.map((q) => focusSectionOf(Number(q.marks))).join(""),
      marks: s.marks,
      minutes: focusSetMinutes(s.marks),
    });
  });
  return out;
}
