/**
 * NOTES-AUTHORED-1 — worked-example prompts that LazyTopper wrote itself.
 *
 * The spec authoring convention (handoff/CONTENT_LANE_STATE.md, "Process/authored examples") prefixes
 * (or suffixes) `problem_verbatim` with the marker "[authored prompt]" so the NCERT fidelity gate
 * (notes/verify_note_fidelity.py, example_is_ncert_verbatim) SKIPS the item and never mislabels
 * authored text as NCERT. The marker is a PROVENANCE FLAG FOR THAT GATE and stays in the spec JSON; it is
 * never meant to be shown. The page reads it here, removes it from the displayed text, and labels the
 * card instead.
 */
import { NOTE_MATH_RE } from "./noteMathCore";
import { subscriptFormulas } from "../../lib/chemSubscript";

const MARKER_RE = /\s*\[authored prompt\]\s*/i;

export function isAuthoredPrompt(problemText: string | null | undefined): boolean {
  return MARKER_RE.test(problemText ?? "");
}

/** The prompt text as a student should read it: marker removed, no stray spaces. */
export function stripAuthoredMarker(problemText: string): string {
  return problemText.replace(new RegExp(MARKER_RE.source, "gi"), " ").replace(/\s{2,}/g, " ").trim();
}

/** `subscriptFormulas` on the prose only: text inside `$...$` is LaTeX and is left to KaTeX. */
export function subscriptOutsideMath(text: string): string {
  let out = "";
  let last = 0;
  for (const m of text.matchAll(NOTE_MATH_RE)) {
    const i = m.index ?? 0;
    out += subscriptFormulas(text.slice(last, i)) + m[0];
    last = i + m[0].length;
  }
  return out + subscriptFormulas(text.slice(last));
}

/** What the example card quotes: the marker stripped, chemical formulae subscripted (display only). */
export function displayPromptText(problemText: string): string {
  return subscriptOutsideMath(stripAuthoredMarker(problemText));
}

export type ExamplesProvenance = "verbatim" | "mixed" | "authored";

export function examplesProvenance(examples: ReadonlyArray<{ problem_verbatim: string }>): ExamplesProvenance {
  const n = examples.filter((e) => isAuthoredPrompt(e.problem_verbatim)).length;
  return n === 0 ? "verbatim" : n === examples.length ? "authored" : "mixed";
}

/** Section copy that is true for the section's actual contents (no verbatim/sourced claim on authored items). */
export function examplesSectionCopy(p: ExamplesProvenance): { label: string; heading: string; intro: string; chip: boolean; allAuthored: boolean } {
  if (p === "verbatim") {
    return {
      label: "Worked examples — real solved problems",
      heading: "Solved exactly as the source does them",
      intro:
        "Every problem is a real sourced item, quoted verbatim with its page; the step-by-step decoding and mark-logic are LazyTopper-authored coaching.",
      chip: true,
      allAuthored: false,
    };
  }
  if (p === "mixed") {
    return {
      label: "Worked examples and important questions",
      heading: "Worked examples and important questions, decoded step by step",
      intro: "Worked examples and important questions, decoded step by step with the marks each step earns.",
      chip: false,
      allAuthored: false,
    };
  }
  return {
    label: "Important questions — solved step by step",
    heading: "Important questions, solved step by step",
    intro: "Board-style questions on this chapter, decoded step by step with the marks each step earns.",
    chip: false,
    allAuthored: true,
  };
}
