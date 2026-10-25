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

export function packPaperCode(input: PackPaperCodeInput): string {
  if (input.kind === "mock") return `PK-${letter(input.subject)}-FULL-M${input.n}`;
  const tail = input.kind === "ct1" ? "CT1" : input.kind === "ct2" ? "CT2" : "WS";
  return `PK-${letter(subjectOfChapter(input.chapter))}-${topicAbbr(input.chapter)}-${tail}`;
}
