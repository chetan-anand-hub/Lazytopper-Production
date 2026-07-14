import { useCallback, useRef, useState } from "react";
import { MathText } from "../question/MathText";
import "./equation.css";

/**
 * <EquationInput> — the shared answer-entry control for typed subjective solutions.
 *
 * A controlled textarea (prose-native — CBSE answers are prose with occasional math)
 * PLUS a compact, collapsible symbol palette that inserts FRIENDLY, READABLE math tokens
 * at the cursor, with a live KaTeX preview (via the app's existing <MathText>). It is a
 * DROP-IN replacement for a controlled <textarea>: same value/onChange contract.
 *
 * WHY FRIENDLY TOKENS (not raw \(...\) LaTeX): a Class-10 student edits the text they see.
 * <MathText> already auto-promotes human-readable shorthand — `x^2`→x², `sqrt{...}`/`sqrt5`→√,
 * `frac{a}{b}`/`frac1/2`→fraction, `a_1`→subscript, and unicode symbols (π, ≤, ±, °) pass
 * through — so the palette inserts THOSE. The student sees editable, readable text
 * (`5x^2 - (3+k)x + 7 = 0`) that renders as proper math in the preview below — no scary
 * `\(...\)` delimiters, no empty `^{}` wrappers.
 *
 * SERIALIZATION (the one canonical format, shared with <MathText>/<EquationRender>): prose
 * with the readable math shorthand above (and, still supported, inline \(...\) / block
 * \[...\] LaTeX from other producers such as the tutor). No math typed → plain prose, so an
 * answer with no math is byte-identical to today's textarea (anti-regression). The grader
 * reads this grammar in production (bank solutionSteps are authored in it), so a serialized
 * answer grades on equal footing with the plain equivalent — proven by the grader-compat
 * harness + owner live-verify. The grader is never modified; the format adapts to it.
 *
 * The widget captures input only — it computes/solves nothing (anti-fabrication).
 */

export interface EquationInputProps {
  /** The serialized answer string (prose + readable math shorthand). Controlled. */
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

// Template markers (control chars -- guaranteed absent from student text):
//   SEL   -- where the current selection is placed (dropped if the template has none)
//   CARET -- where the caret lands after insertion
const SEL = String.fromCharCode(2);
const CARET = String.fromCharCode(1);

interface SymKey {
  /** Button face. */
  label: string;
  /**
   * Readable token to insert, with optional SEL/CARET markers. These are the EXACT
   * shorthand <MathText> auto-promotes (x^2, sqrt{...}, frac{a}{b}, a_1) or plain unicode
   * symbols — never raw \(...\) LaTeX.
   */
  tpl: string;
  /** Accessible name. */
  title: string;
  /** Render the face in the sans/word style (for sin, cos...). */
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
      // Selecting a base then tapping wraps it (x -> x^2); with no selection the token is
      // inserted after the caret so the preceding character becomes the base (5x| -> 5x^2).
      { label: "x²", tpl: `${SEL}^2${CARET}`, title: "Power / squared" },
      { label: "x₁", tpl: `${SEL}_1${CARET}`, title: "Subscript" },
      { label: "√", tpl: `sqrt{${SEL}${CARET}}`, title: "Square root" },
      { label: "a⁄b", tpl: `frac{${SEL}}{${CARET}}`, title: "Fraction" },
      { label: "±", tpl: "±", title: "Plus-minus" },
      { label: "×", tpl: "×", title: "Multiply" },
      { label: "÷", tpl: "÷", title: "Divide" },
      { label: "·", tpl: "·", title: "Dot" },
    ],
  },
  {
    label: "Relations",
    keys: [
      { label: "≤", tpl: "≤", title: "Less than or equal" },
      { label: "≥", tpl: "≥", title: "Greater than or equal" },
      { label: "≠", tpl: "≠", title: "Not equal" },
      { label: "≈", tpl: "≈", title: "Approximately" },
      { label: "→", tpl: "→", title: "Arrow" },
      { label: "⇒", tpl: "⇒", title: "Implies" },
      { label: "∴", tpl: "∴", title: "Therefore" },
      { label: "°", tpl: "°", title: "Degree" },
    ],
  },
  {
    label: "Greek",
    keys: [
      { label: "π", tpl: "π", title: "Pi" },
      { label: "θ", tpl: "θ", title: "Theta" },
      { label: "α", tpl: "α", title: "Alpha" },
      { label: "β", tpl: "β", title: "Beta" },
      { label: "Δ", tpl: "Δ", title: "Delta" },
      { label: "λ", tpl: "λ", title: "Lambda" },
      { label: "μ", tpl: "μ", title: "Mu" },
    ],
  },
  {
    label: "Symbols",
    keys: [
      { label: "Σ", tpl: "Σ", title: "Summation" },
      { label: "∞", tpl: "∞", title: "Infinity" },
      { label: "∫", tpl: "∫", title: "Integral" },
      { label: "∏", tpl: "∏", title: "Product" },
    ],
  },
  {
    label: "Functions",
    keys: [
      { label: "sin", tpl: `sin(${SEL}${CARET})`, title: "Sine", word: true },
      { label: "cos", tpl: `cos(${SEL}${CARET})`, title: "Cosine", word: true },
      { label: "tan", tpl: `tan(${SEL}${CARET})`, title: "Tangent", word: true },
      { label: "log", tpl: `log(${SEL}${CARET})`, title: "Log", word: true },
      { label: "ln", tpl: `ln(${SEL}${CARET})`, title: "Natural log", word: true },
    ],
  },
  {
    label: "Brackets",
    keys: [
      { label: "( )", tpl: `(${SEL}${CARET})`, title: "Parentheses" },
      { label: "[ ]", tpl: `[${SEL}${CARET}]`, title: "Square brackets" },
    ],
  },
];

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

// Signals that the value carries renderable math (drives the preview): the readable
// shorthand MathText promotes (x^2, a_1, sqrt{, frac{), any inline/block LaTeX from other
// producers, or a unicode math symbol.
const MATH_SIGNAL = /\\\(|\\\[|\^\d|_\d|sqrt\{|frac\{|[×÷±·≤≥≠≈→⇒∴∞πθαβγΔλμΣ∫∏°√]/;

function hasMathMarkup(value: string): boolean {
  return MATH_SIGNAL.test(value);
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

      // Insert the readable token as-is (no \(...\) wrapping): the selection becomes the
      // base/radicand/numerator, or -- with no selection -- the token is placed at the caret
      // so the preceding character serves as the base. No orphaned or empty wrappers.
      const built = buildInsertion(tpl, selection);
      const next = value.slice(0, start) + built.text + value.slice(end);
      onChange(next);

      // Restore focus + caret after the controlled re-render.
      const caretPos = start + built.caret;
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
          Add fractions, powers, roots, {"π"} — stays readable, previews below.
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
