import { STEPS_LOCKED_CSS } from "./stepsLockedCss";

/**
 * PRACTICE-HONESTY-1 — the note shown IN PLACE of "Show steps" while a question's
 * solution steps are locked. Steps unlock once the student has answered the question
 * (picked an MCQ option, saved working, or had working checked) or finished the
 * session. The copy is the owner's, verbatim; the styling is class-driven (no inline
 * style), dimmed, with a lock glyph that is hidden from screen readers. A host with no
 * session to finish (Predicted Questions) passes its own accurate `copy`.
 */
export const STEPS_LOCKED_COPY =
  "Try it first: answer this question (or finish the session) to see the steps.";

/**
 * HPQ-CLS-1 - the rules once per page, in the BODY (a prerendered host renders this so its first paint is styled).
 */
export function StepsLockedStyleInline() {
  return <style data-testid="steps-locked-css">{STEPS_LOCKED_CSS}</style>;
}

export function StepsLockedNote({ copy = STEPS_LOCKED_COPY }: { copy?: string }) {
  return (
    <>
      {/* React 19 hoists this to <head> once per page, however many notes render (client-rendered hosts). */}
      <style href="lt-steps-locked" precedence="lt-component">
        {STEPS_LOCKED_CSS}
      </style>
      <StepsLockedNoteBody copy={copy} />
    </>
  );
}

function StepsLockedNoteBody({ copy }: { copy: string }) {
  return (
    <p className="lt-steps-locked" data-testid="steps-locked-note">
      <span className="lt-steps-locked__icon" aria-hidden="true">{"\u{1F512}"}</span>
      <span>{copy}</span>
    </p>
  );
}
