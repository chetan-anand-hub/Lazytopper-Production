// src/components/freeMcq/mcqBlocks.ts
//
// SEO-MCQ-1 - the pure text helpers behind the free-MCQ pages. The question text is used AS WRITTEN; only its shape is read:
//  - `$...$` spans become `\(...\)` (what MathText renders as maths);
//  - consecutive lines that start with `|` form a GitHub-style table, rendered as a real <table>; everything else is plain text that keeps
//    its line breaks (the page styles it `white-space: pre-line`).
// No React, no bank.

export type McqBlock =
  | { kind: "text"; text: string }
  | { kind: "table"; head: string[]; rows: string[][] };

/** `$x^2$` -> `\(x^2\)`. A text with no `$` is returned unchanged. */
export function dollarMathToParen(text: string): string {
  return text.includes("$") ? text.replace(/\$([^$]+)\$/g, (_m, inner: string) => `\\(${inner}\\)`) : text;
}

function cells(line: string): string[] {
  let body = line.trim();
  if (body.startsWith("|")) body = body.slice(1);
  if (body.endsWith("|")) body = body.slice(0, -1);
  return body.split("|").map((cell) => cell.trim());
}

const SEPARATOR = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/;

/** Split a question into text and table blocks, in order. */
export function parseMcqBlocks(source: string): McqBlock[] {
  const blocks: McqBlock[] = [];
  const text: string[] = [];
  const flush = () => {
    const joined = text.join("\n").replace(/^\n+|\n+$/g, "");
    if (joined) blocks.push({ kind: "text", text: joined });
    text.length = 0;
  };
  const lines = source.split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim().startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i]);
        i += 1;
      }
      i -= 1;
      const hasSeparator = tableLines.length > 1 && SEPARATOR.test(tableLines[1]);
      if (hasSeparator) {
        flush();
        blocks.push({ kind: "table", head: cells(tableLines[0]), rows: tableLines.slice(2).map(cells) });
      } else {
        text.push(...tableLines);
      }
    } else {
      text.push(line);
    }
  }
  flush();
  return blocks;
}

/** The option letters a..d in order. */
export const MCQ_LETTERS = ["a", "b", "c", "d"] as const;
export type McqLetter = (typeof MCQ_LETTERS)[number];

/** "(a)" unless the option text already opens with that lowercase label (some stored options do: "(a) Bacteria: no ..."; "(B) and (D)." is a different thing). */
export function optionLabel(letter: McqLetter, text: string): string {
  return new RegExp(`^\\(${letter}\\)(\\s|$)`).test(text.trim()) ? "" : `(${letter})`;
}
