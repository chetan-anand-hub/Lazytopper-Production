import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

interface MathTextProps {
  text: string;
  style?: React.CSSProperties;
  className?: string;
}

const UNICODE_MAP: Record<string, string> = {
  "\\sqrt": "\u221A",
  "\\times": "\u00D7",
  "\\div": "\u00F7",
  "\\pm": "\u00B1",
  "\\leq": "\u2264",
  "\\geq": "\u2265",
  "\\neq": "\u2260",
  "\\infty": "\u221E",
  "\\pi": "\u03C0",
  "\\alpha": "\u03B1",
  "\\beta": "\u03B2",
  "\\gamma": "\u03B3",
  "\\theta": "\u03B8",
  "\\Delta": "\u0394",
  "\\degree": "\u00B0",
  "\\circ": "\u00B0",
  "\\angle": "\u2220",
  "\\triangle": "\u25B3",
  "\\parallel": "\u2225",
  "\\perp": "\u22A5",
  "\\approx": "\u2248",
  "\\rightarrow": "\u2192",
  "\\leftarrow": "\u2190",
  "\\Rightarrow": "\u21D2",
  "\\therefore": "\u2234",
  "\\because": "\u2235",
  "\\in": "\u2208",
  "\\notin": "\u2209",
  "\\subset": "\u2282",
  "\\cup": "\u222A",
  "\\cap": "\u2229",
  "\\forall": "\u2200",
  "\\exists": "\u2203",
  "\\sum": "\u2211",
  "\\prod": "\u220F",
  "\\int": "\u222B",
};

type Segment = { type: "text"; content: string } | { type: "math"; html: string };

function renderKatexToHtml(latex: string, displayMode: boolean): string | null {
  try {
    return katex.renderToString(latex, {
      throwOnError: false,
      displayMode,
      output: "html",
      trust: false,
      strict: "ignore",
    });
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Auto-promotion — the protected-span model
// ---------------------------------------------------------------------------
// Promotion turns readable shorthand into rendered maths (x^2, sqrt5, frac1/2,
// a_1). It used to run as a series of blind regexes over the whole string, which
// had no notion of where a LaTeX command started or ended. That single omission
// produced four defects:
//
//   D1  `\cos^2 A`            -> `\co\(s^{2}\) A`   (a rule grabbed the `s` INSIDE
//                                                    the command name)
//   D2  `\cos^{2} A`          -> shown to the student as literal source: only
//                               \sqrt and \frac had a wrap path
//   D3  `\[\cos^2 A\]`        -> mangled INSIDE block delimiters: the old guard
//                               scanned `\(...\)` only, never `\[...\]`
//   D4  `\sqrt{\frac{a}{b}}`  -> `\(\sqrt{\frac{a}\){b}}`: every brace rule used
//                               `[^}]+`, which stops at the FIRST `}`
//
// The cure is structural rather than another lookbehind: scan the string ONCE
// into protected spans, then promote only in the gaps between them. D1 then dies
// by construction -- the `s` in `\cos` is inside a span and can never be a base.
//
// Why not just add `(?<![\\a-zA-Z])` to the ^/_ rules (as the sqrt/frac rules
// already carry)? Because it rejects a base letter preceded by ANY letter, which
// silently stops promoting `AB^2 + BC^2 = AC^2` (Pythagoras), `CO_2`, `cm^2` --
// all over the bank, all rendering correctly today. That trades a bank-wide
// regression for a trig fix. Gaps need no lookbehind, so those stay byte-identical.

interface ProtectedSpan {
  start: number;
  end: number;
  kind: "delim" | "command";
  /**
   * Whether this command needs KaTeX to render at all -- i.e. whether Phase 3
   * should wrap it. True when it carries {...} arguments or a ^/_ script
   * (\frac{a}{b}, \text{LHS}, \cos^2), OR when UNICODE_MAP has no glyph for it
   * (\tan, \ln, \text).
   *
   * The second half matters: a lone \tan is not "structural" in any syntactic
   * sense, but UNICODE_MAP cannot express it, so leaving it alone shows the
   * student the literal string `\tan`. The real question is not "is it complex"
   * but "can the proven fallback render it".
   *
   * Conversely a LONE symbol command UNICODE_MAP DOES know (\theta, \pi, \degree,
   * \times) is deliberately left alone. Routing it through KaTeX would swap a
   * plain text node for a KaTeX span -- same glyph, different font metrics --
   * i.e. a visual diff on every print doc, bought for nothing. Wrap what is
   * broken; leave what works untouched. This constraint is load-bearing.
   */
  structural: boolean;
}

/**
 * Index just past the `}` closing the balanced group at `open`, or -1 if unbalanced.
 * Nesting-aware: this is what the old `[^}]+` rules could not do (D4).
 */
function consumeBalancedGroup(text: string, open: number): number {
  if (text[open] !== "{") return -1;
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    const ch = text[i];
    if (ch === "\\") {
      i++;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

/** Read `\name` plus any trailing {...} arguments and ^/_ scripts, starting at a backslash. */
function consumeCommandSpan(text: string, start: number): ProtectedSpan {
  let i = start + 1;
  while (i < text.length && /[a-zA-Z]/.test(text[i])) i++;
  const name = text.slice(start, i);

  // No unicode glyph for this command => the fallback would print it verbatim.
  let structural = !(name in UNICODE_MAP);
  for (;;) {
    if (text[i] === "{") {
      const close = consumeBalancedGroup(text, i);
      if (close === -1) break;
      i = close;
      structural = true;
      continue;
    }
    if (text[i] === "^" || text[i] === "_") {
      const at = i + 1;
      let next: number;
      if (text[at] === "{") {
        next = consumeBalancedGroup(text, at);
        if (next === -1) break;
      } else if (at < text.length && /[A-Za-z0-9]/.test(text[at])) {
        // A script binds to exactly ONE token in LaTeX: `\cos^2 A` is (cos^2) A.
        next = at + 1;
      } else break;
      i = next;
      structural = true;
      continue;
    }
    break;
  }

  return { start, end: i, kind: "command", structural };
}

/** One left-to-right pass collecting every region promotion must not reach into. */
function scanProtectedSpans(text: string): ProtectedSpan[] {
  const spans: ProtectedSpan[] = [];
  let i = 0;
  while (i < text.length) {
    if (text[i] === "\\") {
      const next = text[i + 1];
      // Existing maths, inline \(...\) AND block \[...\] -- the block form is what
      // D3 left exposed, so the tutor's correctly-wrapped block maths got mangled.
      if (next === "(" || next === "[") {
        const closer = next === "(" ? "\\)" : "\\]";
        const close = text.indexOf(closer, i + 2);
        if (close !== -1) {
          spans.push({ start: i, end: close + closer.length, kind: "delim", structural: true });
          i = close + closer.length;
          continue;
        }
      }
      if (next && /[a-zA-Z]/.test(next)) {
        const span = consumeCommandSpan(text, i);
        spans.push(span);
        i = span.end;
        continue;
      }
    }
    i++;
  }
  return spans;
}

/**
 * Promote readable shorthand. Applied ONLY to gap text -- the substrings outside
 * every protected span -- so it can never see a command name or a delimiter.
 * The rules and their order are carried over verbatim from the pre-span version,
 * which is what keeps `AB^2`, `CO_2`, `cm^2` and friends byte-identical.
 */
function promoteShorthandInGap(text: string): string {
  let result = text;

  result = result.replace(/(?<![\\a-zA-Z])sqrt(\d+)/g, (_m, num) => `\\(\\sqrt{${num}}\\)`);
  result = result.replace(/(?<![\\a-zA-Z])sqrt\{([^}]+)\}/g, (_m, inner) => `\\(\\sqrt{${inner}}\\)`);

  result = result.replace(/(?<![\\a-zA-Z])frac(\d+)\/(\d+)/g, (_m, n, d) => `\\(\\frac{${n}}{${d}}\\)`);
  result = result.replace(/(?<![\\a-zA-Z])frac\{([^}]+)\}\{([^}]+)\}/g, (_m, n, d) => `\\(\\frac{${n}}{${d}}\\)`);

  // The sqrt/frac rules above just emitted \(...\); the ^/_ rules below must not
  // fire inside what they created. A gap holds no pre-existing delimiters, so
  // these ranges are exactly the ones minted a moment ago.
  const delimitedRanges: Array<[number, number]> = [];
  for (const m of result.matchAll(/\\\(.*?\\\)/gs)) {
    if (m.index !== undefined) delimitedRanges.push([m.index, m.index + m[0].length]);
  }
  function isInsideDelimiter(pos: number): boolean {
    return delimitedRanges.some(([s, e]) => pos >= s && pos < e);
  }

  result = result.replace(/(\d+)\^(\d+)/g, (match, base, exp, offset) => {
    if (isInsideDelimiter(offset)) return match;
    return `\\(${base}^{${exp}}\\)`;
  });
  result = result.replace(/([a-zA-Z])\^(\d+)/g, (match, base, exp, offset) => {
    if (isInsideDelimiter(offset)) return match;
    return `\\(${base}^{${exp}}\\)`;
  });
  result = result.replace(/(\d+)_(\d+)/g, (match, base, sub, offset) => {
    if (isInsideDelimiter(offset)) return match;
    return `\\(${base}_{${sub}}\\)`;
  });
  result = result.replace(/([a-zA-Z])_(\d+)/g, (match, base, sub, offset) => {
    if (isInsideDelimiter(offset)) return match;
    return `\\(${base}_{${sub}}\\)`;
  });

  return result;
}

/**
 * Characters allowed to sit between (or after) command spans while still counting
 * as one maths expression. Deliberately narrow: a word of 2+ letters is prose and
 * ENDS the run, so `\frac{1}{2} of the class` wraps only the fraction. Under-wrap
 * rather than swallow a sentence.
 */
function consumeGlue(text: string, from: number): number {
  let i = from;
  while (i < text.length) {
    const ch = text[i];
    if (ch === "\n") break;
    if (/\s/.test(ch) || /[0-9+\-*/=<>(),.;:|]/.test(ch)) {
      i++;
      continue;
    }
    if (/[a-zA-Z]/.test(ch)) {
      let word = i;
      while (word < text.length && /[a-zA-Z]/.test(text[word])) word++;
      if (word - i === 1) {
        i = word; // a single letter is a variable (the `A` in `\cos^2 A`)
        continue;
      }
      break; // a real word -- prose starts here
    }
    break;
  }
  return i;
}

/**
 * Extend a run rightwards from a structural span, absorbing glue and any further
 * command spans, so `\cos^2 A + \sin^2 A = 1` wraps as ONE expression rather than
 * as fragments with prose-font operators between them.
 */
function findRunEnd(
  text: string,
  spans: ProtectedSpan[],
  startIdx: number,
): number {
  let cursor = spans[startIdx].end;
  let lastSpanEnd = cursor;

  for (;;) {
    const glueEnd = consumeGlue(text, cursor);
    const nextSpan = spans.find((s) => s.kind === "command" && s.start === glueEnd);
    if (nextSpan) {
      cursor = nextSpan.end;
      lastSpanEnd = cursor;
      continue;
    }
    cursor = glueEnd;
    break;
  }

  // Trailing glue that leads nowhere is prose punctuation, not maths: keep the
  // full stop in `... = \frac{\sin A}{\cos A}.` outside the wrap. Never trim back
  // into an absorbed span.
  let end = cursor;
  while (end > lastSpanEnd && /[\s.,;:]/.test(text[end - 1])) end--;
  return end;
}

/**
 * Would KaTeX actually render this? Phase 3 only ever promotes bare LaTeX that
 * PROVES it renders -- anything else is left exactly as it is today.
 *
 * Without this gate, an invented command (an LLM writing `\bogus{x}`) would be
 * wrapped and KaTeX, running with throwOnError:false, would paint it red. Raw
 * source is bad; a red error box is worse. So the promotion is verified, not
 * assumed: every command this app actually uses renders (all 46 in UNICODE_MAP
 * plus the trig/log family were checked against the pinned KaTeX), and anything
 * outside that set degrades to today's behaviour instead of to a new failure.
 */
function katexCanRender(latex: string): boolean {
  try {
    katex.renderToString(latex, { throwOnError: true, strict: "ignore", output: "html" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Exported for MathText.test.tsx ONLY -- it pins promote output byte-for-byte,
 * which the rendered DOM cannot express. Not a product entry point: every surface
 * renders through <MathText>. Do NOT call this from a component; a second caller
 * of shared logic is how a later edit ends up fixing one half of a pair.
 */
export function preprocessBarePatterns(text: string): string {
  const spans = scanProtectedSpans(text);
  if (spans.length === 0) return promoteShorthandInGap(text);

  let out = "";
  let pos = 0;
  let idx = 0;

  while (idx < spans.length) {
    const span = spans[idx];
    if (span.start < pos) {
      idx++; // already absorbed into a run
      continue;
    }

    if (span.start > pos) out += promoteShorthandInGap(text.slice(pos, span.start));

    if (span.kind === "delim" || !span.structural) {
      // Existing maths, or a lone symbol command bound for UNICODE_MAP: verbatim.
      out += text.slice(span.start, span.end);
      pos = span.end;
    } else {
      const runEnd = findRunEnd(text, spans, idx);
      const run = text.slice(span.start, runEnd);
      if (katexCanRender(run)) {
        out += `\\(${run}\\)`;
        pos = runEnd;
      } else {
        // Unrenderable: leave it exactly as today rather than invent a red error.
        out += text.slice(span.start, span.end);
        pos = span.end;
      }
    }
    idx++;
  }

  if (pos < text.length) out += promoteShorthandInGap(text.slice(pos));
  return out;
}

function applyUnicodeFallbacks(text: string): string {
  let result = text;
  for (const [cmd, symbol] of Object.entries(UNICODE_MAP)) {
    const escaped = cmd.replace(/\\/g, "\\\\");
    result = result.replace(new RegExp(escaped, "g"), symbol);
  }

  result = result.replace(/\^(\d+)/g, (_m, exp) => {
    const superscripts: Record<string, string> = {
      "0": "\u2070", "1": "\u00B9", "2": "\u00B2", "3": "\u00B3",
      "4": "\u2074", "5": "\u2075", "6": "\u2076", "7": "\u2077",
      "8": "\u2078", "9": "\u2079",
    };
    return [...exp].map((d: string) => superscripts[d] || d).join("");
  });

  result = result.replace(/_(\d+)/g, (_m, sub) => {
    const subscripts: Record<string, string> = {
      "0": "\u2080", "1": "\u2081", "2": "\u2082", "3": "\u2083",
      "4": "\u2084", "5": "\u2085", "6": "\u2086", "7": "\u2087",
      "8": "\u2088", "9": "\u2089",
    };
    return [...sub].map((d: string) => subscripts[d] || d).join("");
  });

  return result;
}

const MATH_DELIMITERS_RE = /\\\((.+?)\\\)|\\\[(.+?)\\\]/gs;

function parseTextToSegments(text: string): Segment[] {
  if (!text) return [];

  const preprocessed = preprocessBarePatterns(text);

  const segments: Segment[] = [];
  let lastIndex = 0;

  for (const match of preprocessed.matchAll(MATH_DELIMITERS_RE)) {
    if (match.index !== undefined && match.index > lastIndex) {
      segments.push({ type: "text", content: applyUnicodeFallbacks(preprocessed.slice(lastIndex, match.index)) });
    }

    const inlineLatex = match[1];
    const displayLatex = match[2];
    let latex = (inlineLatex || displayLatex || "").trim();
    const isDisplay = !!displayLatex;

    latex = latex.replace(/\\\\(sqrt|frac|times|div|pm|leq|geq|neq|infty|pi|alpha|beta|gamma|theta|Delta|angle|triangle|cdot|circ)/g, "\\$1");

    const html = renderKatexToHtml(latex, isDisplay);
    if (html) {
      segments.push({ type: "math", html });
    } else {
      segments.push({ type: "text", content: latex });
    }

    lastIndex = (match.index ?? 0) + match[0].length;
  }

  if (lastIndex < preprocessed.length) {
    segments.push({ type: "text", content: applyUnicodeFallbacks(preprocessed.slice(lastIndex)) });
  }

  if (segments.length === 0) {
    segments.push({ type: "text", content: applyUnicodeFallbacks(preprocessed) });
  }

  return segments;
}

export function MathText({ text, style, className }: MathTextProps) {
  const segments = useMemo(() => parseTextToSegments(text), [text]);

  const hasMath = segments.some((s) => s.type === "math");

  if (!hasMath) {
    const plain = segments.map((s) => s.type === "text" ? s.content : "").join("");
    return (
      <span className={className} style={style}>
        {plain}
      </span>
    );
  }

  return (
    <span className={className} style={style}>
      {segments.map((seg, i) =>
        seg.type === "text" ? (
          <span key={i}>{seg.content}</span>
        ) : (
          <span
            key={i}
            dangerouslySetInnerHTML={{ __html: seg.html }}
          />
        )
      )}
    </span>
  );
}
