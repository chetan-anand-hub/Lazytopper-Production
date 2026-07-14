# EQUATION_INPUT_API_CONTRACT — shared math input/render for consuming lanes

**Owner-approved. Authoritative API + serialization contract for `<EquationInput>` / `<EquationRender>`.**
Written by the equation-widget lane so the **tutor Stage-2 lane** (and any future consumer) can drop the
input control into its composer **without reshaping**. One writer per file — the tutor lane owns
`TutorPage.tsx`; this lane owns `src/components/equation/**`. This file is the interface between them.

Source of truth in code: `lazytopper/src/components/equation/` (`EquationInput.tsx`, `index.ts`).

---

## Import

```ts
import { EquationInput, EquationRender } from "<...>/components/equation";
// from src/pages/tutor/TutorPage.tsx that is: "../../components/equation"
```

- `EquationInput` — the answer-entry control (controlled textarea + math palette + live preview).
- `EquationRender` — **the app's existing `<MathText>` re-exported under a symmetric name.** It is NOT a
  second renderer. Every display surface (graded views, print docs, tutor turns) already renders through
  MathText, so a serialized string renders identically everywhere. Do **not** fork a parallel renderer.

## `<EquationInput>` props (drop-in for a controlled `<textarea>`)

```ts
interface EquationInputProps {
  value: string;                     // the serialized answer string (controlled)
  onChange: (value: string) => void; // emits the full serialized string on every edit
  placeholder?: string;
  disabled?: boolean;
  rows?: number;                     // textarea row count (parity with the textarea it replaces)
  className?: string;                // optional extra class on the wrapper for layout
  ariaLabel?: string;               // accessible label for the textarea
}
```

Swap rule: replace `<textarea value={x} onChange={e => setX(e.target.value)} .../>` with
`<EquationInput value={x} onChange={setX} .../>`. Note `onChange` takes the **string**, not the event.

## The one canonical serialization (what `value` contains, verbatim what the grader receives)

- **Prose with inline `\(...\)` and block `\[...\]` LaTeX.** This is the app's existing MathText grammar.
- **No math typed → plain prose**, byte-identical to a bare textarea (anti-regression).
- The string flows to the grader **unchanged** (`checkSolution.cjs` embeds the student answer verbatim).
  The grader already reads this grammar in production (bank `solutionSteps` are authored in it and injected
  as the marking scheme), so a serialized answer grades on equal footing with the plain equivalent —
  proven by `scripts/ops/equation_grader_compat_harness.mjs` (semantics/prose/no-fabrication invariants)
  + one owner live-verify. **Do not** invent a second grammar (no `$...$`), and **never modify the grader**
  — the format adapts to it.

## For the tutor lane specifically

1. **Composer input:** use `<EquationInput>` where the tutor composer currently uses its controlled
   textarea. The serialized string it produces is the same grammar the tutor already renders.
2. **Rendering tutor turns:** the tutor lane is (separately) routing turns through `<MathText>` and emitting
   `\(...\)` — **the same grammar as this contract**, so `EquationInput` output drops in cleanly. Use
   `EquationRender` (= MathText) for any new render site for naming symmetry, or MathText directly.
3. **Do not reshape** the props or the string contract. If the tutor needs something more (e.g. a submit-on-
   enter behavior), wrap `EquationInput` in the composer — do not fork the component or its grammar.

## Non-negotiables carried by the component (so consumers inherit them)

- Product grammar (light, green `hsl(152,55%,45%)`, Inter/Fraunces) — the palette + preview are themed to
  product tokens; 360px is first-class (compact collapsible symbol drawer, not a wide toolbar).
- Captures input only — computes/solves nothing (anti-fabrication).
- Existing plain-text answers keep grading unchanged (anti-regression).
