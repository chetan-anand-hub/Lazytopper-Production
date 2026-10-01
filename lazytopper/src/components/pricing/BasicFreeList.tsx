import { MONTHLY_INLINE } from "../../config/pricing";

/**
 * TRIAL-ON-SIGNUP-1 · T4 — the Basic (free) plan's feature list, ONE source.
 *
 * `FREE_FEATURES` moved here VERBATIM from PricingPage.tsx (no wording change): the
 * Pricing page's Basic card still renders every row of it exactly as before, and every
 * Premium lock renders the `included` rows under "Free on Basic:" through
 * `BasicFreeList`. One array, so the lock can never promise something Pricing does not
 * (or the reverse).
 *
 * Styling is class-based (a scoped <style> block, the FreeCheckPanels convention) — no
 * inline style objects in a new component.
 */

/**
 * TRIAL-ON-SIGNUP-1b — THE after-trial wording, ONE source (owner addendum, wave B-6, word
 * for word). The owner found "…then free Basic, upgrade anytime. No card needed." read as
 * "never pay", so every trial line now names what happens after the trial: keep free Basic,
 * or upgrade to Premium at its real price.
 *
 * The price is `MONTHLY_INLINE`, IMPORTED from config/pricing.ts — never typed here (no
 * rupee figure, never a slash-month form: OR-P6). Every surface that states the trial
 * (the free-check panels, the sign-in strip, the Premium lock, the Home tutor card) builds
 * its line from these fields, so the price and the wording cannot drift between them.
 *
 * WHY HERE: this module has no other import, so homeDestinations (whose import graph must
 * stay firebase-free) and freeCheckClient (node-safe) can both import it.
 */
const TRIAL_TRY_LINE = "Try Premium free for 7 days — no card needed.";
const TRIAL_AFTER_LINE = `After that, keep free Basic or upgrade to Premium at ${MONTHLY_INLINE}.`;

export const TRIAL_WORDING = {
  /** First sentence of the general line. */
  tryLine: TRIAL_TRY_LINE,
  /** Second sentence of the general line; also closes the T2 confirmation. */
  afterLine: TRIAL_AFTER_LINE,
  /** The general line (where a full sentence fits). */
  generalLine: `${TRIAL_TRY_LINE} ${TRIAL_AFTER_LINE}`,
  /** The short fragment, for a surface where a full sentence does not fit. */
  shortFragment: `then free Basic, or Premium at ${MONTHLY_INLINE}.`,
  /** The link label to /pricing, wherever the UI is clickable. */
  seePlans: "See plans →",
} as const;

export const FREE_FEATURES = [
  { label: "Browse Home, Exam Trends, and topic surfaces", included: true },
  { label: "Practice picker and limited practice", included: true },
  { label: "Limited worksheet generation", included: true },
  { label: "Basic topic insights", included: true },
  { label: "Solution Checker / Check & Improve", included: false },
  { label: "Deep Mistake Intelligence", included: false },
  { label: "Full mocks and predicted-question execution", included: false },
  { label: "Richer Me / Progress recommendations", included: false },
];

/** Only what Basic really includes — a lock lists what is FREE, never what is not. */
export const BASIC_FREE_LABELS: readonly string[] = FREE_FEATURES.filter(f => f.included).map(f => f.label);

export const BASIC_FREE_HEADING = "Free on Basic:";

const BASIC_FREE_CSS = `
.lt-basic-free {
  box-sizing: border-box;
  max-width: 340px;
  margin: 0 auto 20px;
  padding: 12px 16px;
  text-align: left;
  border: 1px solid hsl(150, 40%, 86%);
  border-radius: 12px;
  background: hsl(150, 35%, 96%);
  color: hsl(220, 25%, 12%);
}
.lt-basic-free__title {
  margin: 0 0 6px;
  font-size: 0.88rem;
  font-weight: 700;
}
.lt-basic-free__list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.lt-basic-free__item {
  margin: 4px 0 0;
  font-size: 0.86rem;
  line-height: 1.45;
}
.lt-basic-free__tick {
  margin-right: 6px;
  color: hsl(152, 55%, 32%);
  font-weight: 700;
}
@media (max-width: 480px) {
  .lt-basic-free { max-width: none; margin: 0 0 18px; }
}
`;

/** "Free on Basic:" + the included Basic rows, for every Premium lock. */
export function BasicFreeList() {
  return (
    <div className="lt-basic-free" data-testid="basic-free-list">
      <style>{BASIC_FREE_CSS}</style>
      <p className="lt-basic-free__title">{BASIC_FREE_HEADING}</p>
      <ul className="lt-basic-free__list" aria-label="Free on Basic">
        {BASIC_FREE_LABELS.map(label => (
          <li key={label} className="lt-basic-free__item">
            <span className="lt-basic-free__tick" aria-hidden="true">✓</span>
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
