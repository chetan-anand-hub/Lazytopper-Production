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

  const segments: Segment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(MATH_DELIMITERS_RE)) {
    if (match.index !== undefined && match.index > lastIndex) {
      segments.push({ type: "text", content: applyUnicodeFallbacks(text.slice(lastIndex, match.index)) });
    }

    const inlineLatex = match[1];
    const displayLatex = match[2];
    const latex = (inlineLatex || displayLatex || "").trim();
    const isDisplay = !!displayLatex;

    const html = renderKatexToHtml(latex, isDisplay);
    if (html) {
      segments.push({ type: "math", html });
    } else {
      segments.push({ type: "text", content: latex });
    }

    lastIndex = (match.index ?? 0) + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", content: applyUnicodeFallbacks(text.slice(lastIndex)) });
  }

  if (segments.length === 0) {
    segments.push({ type: "text", content: applyUnicodeFallbacks(text) });
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

export function renderMathInText(text: string): string {
  return applyUnicodeFallbacks(text);
}
