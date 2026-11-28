// src/pages/tutor/TutorText.tsx
//
// TUTOR-MIND-2 (F5) — the tutor bubble's text: MathText (KaTeX) plus `**bold**`.
// The model sometimes writes `**Step 6: ...**` although told not to; the student saw the literal
// asterisks. Bold is rendered as a real <strong> from a pure split of the string — no HTML is ever
// built from the text (React escapes it), so there is nothing to inject. A `**` that sits inside an
// open math span (\( ... \) or \[ ... \]) is left alone, so a product in a formula is never eaten.
// Pipe tables are not rendered: the prompt forbids them.
// TUTOR-BULLETS-1 — likewise a line that starts with a markdown bullet (`* ` or `- `) shows as `• `,
// so the student never sees a stray asterisk. Only at the start of a line, never inside a math span.

import React from "react";
import { MathText } from "../../components/question/MathText";

export interface TextPart {
  text: string;
  bold: boolean;
}

const BOLD = /\*\*(?!\s)([^*\n]+?)(?<!\s)\*\*/g;

/** Is the position `at` inside an unclosed \( or \[ math span of `text`? */
function insideMath(text: string, at: number): boolean {
  const head = text.slice(0, at);
  const open = (head.match(/\\\(/g) ?? []).length - (head.match(/\\\)/g) ?? []).length;
  const openDisplay = (head.match(/\\\[/g) ?? []).length - (head.match(/\\\]/g) ?? []).length;
  return open > 0 || openDisplay > 0;
}

const LINE_BULLET = /^([ \t]*)[*-][ \t]+(?=\S)/gm;

/** `* point` / `- point` at the start of a line becomes `• point`. Pure; math spans are left alone. */
export function tidyBullets(text: string): string {
  return text.replace(LINE_BULLET, (m: string, indent: string, at: number) =>
    insideMath(text, at) ? m : `${indent}\u2022 `,
  );
}

/** Split `text` into plain and bold parts. Pure; concatenating the parts' text (with `**` restored) gives the input. */
export function splitBold(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const m of text.matchAll(BOLD)) {
    const at = m.index ?? 0;
    if (insideMath(text, at)) continue;
    if (at > last) parts.push({ text: text.slice(last, at), bold: false });
    parts.push({ text: m[1], bold: true });
    last = at + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), bold: false });
  return parts.length ? parts : [{ text, bold: false }];
}

export function TutorText({ text: raw }: { text: string }): React.ReactElement {
  const text = tidyBullets(String(raw ?? ""));
  const parts = splitBold(text);
  if (parts.length === 1 && !parts[0].bold) return <MathText text={text} />;
  return (
    <>
      {parts.map((p, i) =>
        p.bold ? (
          <strong key={i}>
            <MathText text={p.text} />
          </strong>
        ) : (
          <MathText key={i} text={p.text} />
        ),
      )}
    </>
  );
}
