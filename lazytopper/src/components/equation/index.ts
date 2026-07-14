// Shared equation infrastructure — one canonical grammar (\(...\) inline / \[...\] block
// LaTeX + prose), one input control, one renderer.
//
// <EquationInput>  — the answer-entry control (controlled textarea + symbol palette).
// <EquationRender> — the display renderer. This is the app's existing <MathText> under a
//   name symmetric with EquationInput; it is NOT a second renderer. Every display surface
//   (graded views, print docs, tutor) already renders through MathText, so a serialized
//   answer renders identically everywhere. Do NOT fork a parallel renderer.
export { EquationInput } from "./EquationInput";
export type { EquationInputProps } from "./EquationInput";
export { MathText as EquationRender } from "../question/MathText";
