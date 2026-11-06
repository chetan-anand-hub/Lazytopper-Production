/**
 * Pack paper codes (PACKS-GRADE-1). A paper-shaped pack file prints a stable code so it can be uploaded for
 * grading through the existing path: `PK-<M|S>-<TOPIC|FULL>-<CT1|CT2|WS|M1..M8>`.
 * The `PK-` prefix cannot collide with in-app codes (`WS-`, `CT-`, `FM-`). The code is a function of the
 * paper alone, never of the pack that sold it, so every re-download (and every covering pack) is one paper.
 */
import { subjectOfChapter, type PackSubject } from "../../services/packs";
import { topicAbbr } from "../../components/worksheet/worksheetNaming";

export type PackPaperCodeInput =
  | { kind: "ct1" | "ct2" | "ws"; chapter: string }
  | { kind: "mock"; subject: PackSubject; n: number };

const letter = (s: PackSubject | null): "M" | "S" => (s === "science" ? "S" : "M");

/**
 * PACK-SYLLABUS-1 (owner ruling 5 Nov 2026): the three graded papers whose questions changed when syllabus-excluded rows left them.
 * registerPackPaper stores each student's own snapshot under the printed code at download, so a student holding the OLD PDF keeps
 * grading against that saved copy under the OLD code, and a re-download of the corrected paper must not overwrite it. Each of these
 * therefore prints `<old code>-V2` (same characters as every other pack code, so every consumer that treats a code as an opaque
 * id accepts it; `-V2` cannot collide with a WS-/CT-/FM-/PK- code). Every other paper keeps its code for good.
 */
export const REVISED_PACK_PAPER_CODES: ReadonlyMap<string, string> = new Map([
  ["PK-M-PO-WS", "PK-M-PO-WS-V2"],
  ["PK-S-FULL-M5", "PK-S-FULL-M5-V2"],
  ["PK-S-MEOE-WS", "PK-S-MEOE-WS-V2"],
]);

export function packPaperCode(input: PackPaperCodeInput): string {
  const base = baseCode(input);
  return REVISED_PACK_PAPER_CODES.get(base) ?? base;
}

function baseCode(input: PackPaperCodeInput): string {
  if (input.kind === "mock") return `PK-${letter(input.subject)}-FULL-M${input.n}`;
  const tail = input.kind === "ct1" ? "CT1" : input.kind === "ct2" ? "CT2" : "WS";
  return `PK-${letter(subjectOfChapter(input.chapter))}-${topicAbbr(input.chapter)}-${tail}`;
}
