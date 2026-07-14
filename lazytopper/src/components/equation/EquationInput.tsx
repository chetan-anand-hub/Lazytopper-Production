import { useCallback, useRef, useState } from "react";
import { MathText } from "../question/MathText";
import "./equation.css";

/**
 * <EquationInput> — the shared answer-entry control for typed subjective solutions.
 *
 * A controlled textarea (prose-native — CBSE answers are prose with occasional math)
 * PLUS a compact, collapsible symbol palette that inserts LaTeX at the cursor, with a
 * live KaTeX preview (via the app's existing <MathText>). It is a DROP-IN replacement
 * for a controlled <textarea>: same value/onChange contract, so every consumer swaps
 * with minimal change and the serialized string flows to the grader exactly where the
 * old textarea's text did.
 *
 * SERIALIZATION (the one canonical format, shared with <MathText>/<EquationRender>):
 *   prose with inline \(...\) and block \[...\] LaTeX. No math typed -> plain prose, so
 *   an answer with no math is byte-identical to today's textarea (anti-regression). The
 *   grader already reads this grammar in production (bank solutionSteps are authored in
 *   it and injected as the marking scheme), so a serialized answer grades on equal
 *   footing with the plain equivalent -- verified by the grader-compat harness + owner
 *   live-verify. The grader is never modified; the format adapts to it.
 *
 * The widget captures input only -- it computes/solves nothing (anti-fabrication).
 */

export interface EquationInputProps {
  /** The serialized answer string (prose + inline \(...\) math). Controlled. */
  value: string;
  /** Emits the full serialized string on every edit -- drop-in for a textarea. */
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Textarea row count (parity with the textareas being replaced). */
  rows?: number;
  /** Optional extra class on the wrapper for consumer layout. */
  className?: string;
  /** Accessible label for the textarea. */
  ariaLabel?: string;
}

// Template markers (control chars -- guaranteed absent from student text / LaTeX):
//   SEL   -- where the current selection is placed (dropped if the template has none)
//   CARET -- where the caret lands after insertion
const SEL = String.fromCharCode(2);
const CARET = String.fromCharCode(1);

// Inline / block LaTeX delimiters -- the app's canonical math grammar.
const OPEN = "\\(";
const CLOSE = "\\)";

interface SymKey {
  /** Button face. */
  label: string;
  /** LaTeX template with optional SEL/CARET markers. */
  tpl: string;
  /** Accessible name. */
  title: string;
  /** Render the face in the sans/word style (for sin, cos, matrix...). */
  word?: boolean;
}

interface SymGroup {
  label: string;
  keys: SymKey[];
}

const GROUPS: SymGroup[] = [
  {
    label: "Basic",
    keys: [
      { label: "x²", tpl: `${SEL}^{${CARET}}`, title: "Power / superscript" },
      { label: "xₙ", tpl: `${SEL}_{${CARET}}`, title: "Subscript" },
      { label: "√", tpl: `\\sqrt{${SEL}${CARET}}`, title: "Square root" },
      { label: "∛", tpl: `\\sqrt[3]{${SEL}${CARET}}`, title: "Cube root" },
      { label: "a⁄b", tpl: `\\frac{${SEL}${CARET}}{}`, title: "Fraction" },
      { label: "±", tpl: "\\pm", title: "Plus-minus" },
      { label: "×", tpl: "\\times", title: "Multiply" },
      { label: "÷", tpl: "\\div", title: "Divide" },
      { label: "·", tpl: "\\cdot", title: "Dot product" },
    ],
  },
  {
    label: "Relations",
    keys: [
      { label: "≤", tpl: "\\leq", title: "Less than or equal" },
      { label: "≥", tpl: "\\geq", title: "Greater than or equal" },
      { label: "≠", tpl: "\\neq", title: "Not equal" },
      { label: "≈", tpl: "\\approx", title: "Approximately" },
      { label: "→", tpl: "\\rightarrow", title: "Arrow" },
      { label: "⇒", tpl: "\\Rightarrow", title: "Implies" },
      { label: "∴", tpl: "\\therefore", title: "Therefore" },
      { label: "°", tpl: "^{\\circ}", title: "Degree" },
    ],
  },
  {
    label: "Greek",
    keys: [
      { label: "π", tpl: "\\pi", title: "Pi" },
      { label: "θ", tpl: "\\theta", title: "Theta" },
      { label: "α", tpl: "\\alpha", title: "Alpha" },
      { label: "β", tpl: "\\beta", title: "Beta" },
      { label: "Δ", tpl: "\\Delta", title: "Delta" },
      { label: "λ", tpl: "\\lambda", title: "Lambda" },
      { label: "μ", tpl: "\\mu", title: "Mu" },
    ],
  },
  {
    label: "Calculus & big ops",
    keys: [
      { label: "Σ", tpl: `\\sum_{${CARET}}`, title: "Summation" },
      { label: "∫", tpl: `\\int ${CARET}`, title: "Integral" },
      { label: "∏", tpl: `\\prod_{${CARET}}`, title: "Product" },
      { label: "∞", tpl: "\\infty", title: "Infinity" },
    ],
  },
  {
    label: "Functions",
    keys: [
      { label: "sin", tpl: `\\sin(${CARET})`, title: "Sine", word: true },
      { label: "cos", tpl: `\\cos(${CARET})`, title: "Cosine", word: true },
      { label: "tan", tpl: `\\tan(${CARET})`, title: "Tangent", word: true },
      { label: "log", tpl: `\\log(${CARET})`, title: "Log", word: true },
      { label: "ln", tpl: `\\ln(${CARET})`, title: "Natural log", word: true },
    ],
  },
  {
    label: "Brackets & matrix",
    keys: [
      { label: "( )", tpl: `\\left(${SEL}${CARET}\\right)`, title: "Auto-size brackets" },
      { label: "[ ]", tpl: `\\left[${SEL}${CARET}\\right]`, title: "Auto-size square brackets" },
      { label: "[matrix]", tpl: `\\begin{bmatrix}${SEL}${CARET}\\end{bmatrix}`, title: "Matrix", word: true },
    ],
  },
];

/** True when position `pos` sits inside an open \(...\) or \[...\] math span. */
function caretInsideMath(text: string, pos: number): boolean {
  const before = text.slice(0, pos);
  const lastOpen = Math.max(before.lastIndexOf("\\("), before.lastIndexOf("\\["));
  const lastClose = Math.max(before.lastIndexOf("\\)"), before.lastIndexOf("\\]"));
  return lastOpen > lastClose;
}

/** Build the inserted string + the caret offset within it, from a template + selection. */
function buildInsertion(tpl: string, selection: string): { text: string; caret: number } {
  // Place the selection (SEL) -- dropped if the template has none (symbol replaces selection).
  let body = tpl.includes(SEL) ? tpl.split(SEL).join(selection) : tpl;
  let caretInBody = body.indexOf(CARET);
  if (caretInBody >= 0) {
    body = body.slice(0, caretInBody) + body.slice(caretInBody + CARET.length);
  } else {
    caretInBody = body.length;
  }
  return { text: body, caret: caretInBody };
}

/** Does the value already carry inline/block math markup? (drives the preview). */
function hasMathMarkup(value: string): boolean {
  return value.includes("\\(") || value.includes("\\[");
}

export function EquationInput({
  value,
  onChange,
  placeholder,
  disabled = false,
  rows = 4,
  className,
  ariaLabel,
}: EquationInputProps) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const insert = useCallback(
    (tpl: string) => {
      const ta = taRef.current;
      const start = ta?.selectionStart ?? value.length;
      const end = ta?.selectionEnd ?? value.length;
      const selection = value.slice(start, end);

      const built = buildInsertion(tpl, selection);
      const inside = caretInsideMath(value, start);
      // Wrap in \(...\) only when NOT already inside a math span, so clicking several
      // symbols in a row builds one span rather than a chain of adjacent ones.
      const insertText = inside ? built.text : OPEN + built.text + CLOSE;
      const caretOffset = (inside ? 0 : OPEN.length) + built.caret;

      const next = value.slice(0, start) + insertText + value.slice(end);
      onChange(next);

      // Restore focus + caret after the controlled re-render.
      const caretPos = start + caretOffset;
      requestAnimationFrame(() => {
        const el = taRef.current;
        if (!el) return;
        el.focus();
        el.setSelectionRange(caretPos, caretPos);
      });
    },
    [value, onChange],
  );

  const showPreview = hasMathMarkup(value);

  return (
    <div className={className ? `lt-eq ${className}` : "lt-eq"}>
      <textarea
        ref={taRef}
        className="lt-eq__textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        aria-label={ariaLabel}
      />

      <div className="lt-eq__bar">
        <button
          type="button"
          className="lt-eq__toggle"
          onClick={() => setPaletteOpen((v) => !v)}
          disabled={disabled}
          aria-expanded={paletteOpen}
          aria-controls="lt-eq-palette"
        >
          <span className="lt-eq__toggle-caret">{paletteOpen ? "▲" : "▼"}</span>
          Insert math
        </button>
        <span className="lt-eq__hint">
          Add fractions, powers, roots, {"π"}, trig -- renders as it appears in the exam.
        </span>
      </div>

      {paletteOpen && !disabled && (
        <div className="lt-eq__palette" id="lt-eq-palette">
          {GROUPS.map((group) => (
            <div className="lt-eq__group" key={group.label}>
              <div className="lt-eq__group-label">{group.label}</div>
              <div className="lt-eq__keys">
                {group.keys.map((k) => (
                  <button
                    key={k.title}
                    type="button"
                    className={k.word ? "lt-eq__key lt-eq__key--word" : "lt-eq__key"}
                    title={k.title}
                    aria-label={k.title}
                    // Keep the textarea's selection -- prevent the button from stealing focus.
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => insert(k.tpl)}
                  >
                    {k.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showPreview && (
        <div className="lt-eq__preview">
          <span className="lt-eq__preview-label">Preview</span>
          <MathText text={value} className="lt-eq__preview-body" />
        </div>
      )}
    </div>
  );
}
