/**
 * NoteRichText — renders one note-spec text field.
 *
 * Spec text fields (see notes/specs/*.json) mix three ingredients:
 *   - `$…$` inline LaTeX (KaTeX — the prototype's auto-render contract),
 *   - light inline HTML (`<b>`, `<i>`) and entities (`&amp;`) carried over
 *     from the locked note prototypes,
 *   - plain prose.
 *
 * Trust boundary: spec JSON is repo-committed content that passes
 * `notes/validate_spec.py` and owner review before merge — the same trust
 * level as source code, never user input. KaTeX runs with trust:false.
 *
 * This is intentionally NOT MathText: MathText speaks the question bank's
 * `\(...\)` dialect with bare-pattern heuristics; note-specs are authored
 * against the `$…$` prototype contract and must not be heuristically mangled.
 */

import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

interface NoteRichTextProps {
  text: string;
  className?: string;
}

type Segment = { type: "html"; html: string } | { type: "math"; html: string };

/** Split on $…$ (no lookbehind games: specs never use bare `$` in prose). */
const MATH_RE = /\$([^$]+)\$/g;

function renderMath(latex: string): string | null {
  try {
    return katex.renderToString(latex, {
      throwOnError: false,
      displayMode: false,
      output: "html",
      trust: false,
      strict: "ignore",
    });
  } catch {
    return null;
  }
}

function segment(text: string): Segment[] {
  const segments: Segment[] = [];
  let last = 0;
  for (const match of text.matchAll(MATH_RE)) {
    const index = match.index ?? 0;
    if (index > last) {
      segments.push({ type: "html", html: text.slice(last, index) });
    }
    const rendered = renderMath(match[1].trim());
    if (rendered) {
      segments.push({ type: "math", html: rendered });
    } else {
      // KaTeX refused → show the raw LaTeX rather than dropping content.
      segments.push({ type: "html", html: match[0] });
    }
    last = index + match[0].length;
  }
  if (last < text.length) {
    segments.push({ type: "html", html: text.slice(last) });
  }
  return segments;
}

export function NoteRichText({ text, className }: NoteRichTextProps) {
  const segments = useMemo(() => segment(text ?? ""), [text]);
  return (
    <span className={className}>
      {segments.map((seg, i) => (
        <span key={i} dangerouslySetInnerHTML={{ __html: seg.html }} />
      ))}
    </span>
  );
}

export default NoteRichText;
