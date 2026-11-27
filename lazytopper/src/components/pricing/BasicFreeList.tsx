import { VALIDITY_SHORT } from "../../config/validity";
import { boardPassPriceDisplay, boardPassPriceLine } from "../../config/pricing";
import { BASIC_PAPERS_ROW, FIRST_TEST_FREE_LINE } from "../../config/mockViewLimits";

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
 * or get the Board Pass at its fixed price.
 *
 * The price is the Board Pass's fixed price, IMPORTED from config/pricing.ts — never typed here
 * (PRICE-FIXED-1: the month price is hidden throughout; never a slash-month form: OR-P6). Every surface that states the trial
 * (the free-check panels, the sign-in strip, the Premium lock, the Home tutor card) builds
 * its line from these fields, so the price and the wording cannot drift between them.
 *
 * WHY HERE: this module imports only config/pricing and config/mockViewLimits (both
 * import-free), so homeDestinations (whose import graph must stay firebase-free) and
 * freeCheckClient (node-safe) can both import it. Never import a component from here.
 */
const TRIAL_TRY_LINE = "Try Premium free for 7 days — no card needed.";
/** PRICING-1: built at ACCESS time (the price follows the founding offer's date), never at module load. */
const trialAfterLine = () => `After that, keep free Basic or get the Board Pass: ${boardPassPriceLine()}.`;

export const TRIAL_WORDING = {
  /** First sentence of the general line. */
  tryLine: TRIAL_TRY_LINE,
  /** Second sentence of the general line; also closes the T2 confirmation. */
  get afterLine() {
    return trialAfterLine();
  },
  /** The general line (where a full sentence fits). */
  get generalLine() {
    return `${TRIAL_TRY_LINE} ${trialAfterLine()}`;
  },
  /**
   * The short fragment, for a surface where a full sentence does not fit. CHECKOUT-1 (owner ruling,
   * end of October) was reversed again by PRICE-FIXED-1 (31 Oct 2026): the month price is hidden throughout, so
   * this names the Board Pass's fixed price.
   */
  get shortFragment() {
    return `then free Basic, or the Board Pass ${boardPassPriceDisplay()}, ${VALIDITY_SHORT}.`;
  },
  /** The link label to /pricing, wherever the UI is clickable. */
  seePlans: "See plans →",
} as const;

export const FREE_FEATURES = [
  { label: "Browse Home, Exam Trends, and topic surfaces", included: true },
  { label: "Practice picker and multiple-choice practice, scored as you tap", included: true },
  { label: "Limited worksheet generation", included: true },
  { label: "Basic topic insights", included: true },
  { label: "Solution Checker / Answer Checker", included: false },
  { label: "Deep Mistake Intelligence", included: false },
  // FRICTION-FIX-1 · F2 (P7) — mock papers ARE free, within MockViewGate's daily limits,
  // which are imported (config/mockViewLimits.ts), never typed here.
  // GUEST-WALL (owner ruling 26 Nov 2026, 22:43 IST): "remove the download or checking option from basic plan". The row
  // states OPENS only (D114's "open or download ... written answers not checked" is retired), and the one free test - its
  // written answers marked (FREE_TESTS_ALLOWED = 1, owner ruling 23 Nov 2026) - is its own row.
  { label: BASIC_PAPERS_ROW, included: true },
  { label: FIRST_TEST_FREE_LINE, included: true },
  { label: "Richer Me / Progress recommendations", included: false },
];

/** Only what Basic really includes — a lock lists what is FREE, never what is not. */
export const BASIC_FREE_LABELS: readonly string[] = FREE_FEATURES.filter(f => f.included).map(f => f.label);

export const BASIC_FREE_HEADING = "Free on Basic:";

/**
 * FRICTION-FIX-1 · F2 (FU-BASIC-LIST-DARK-THEME) — the card takes the THEME TOKENS
 * (styles.css `:root` = dark, `[data-theme="light"]` = light), not a fixed light palette:
 * in the dark theme the old pale-green card with near-black text sat on a near-black page.
 * Text is `--text` on `--bg-card`; the tick is `--color-light-green` (#4ade80 dark,
 * #15803d light). A surface that is light in both themes (UpgradeModal) re-declares the
 * light tokens around this list.
 */
const BASIC_FREE_CSS = `
.lt-basic-free {
  box-sizing: border-box;
  max-width: 340px;
  margin: 0 auto 20px;
  padding: 12px 16px;
  text-align: left;
  border: 1px solid var(--bg-card-border);
  border-radius: 12px;
  background: var(--bg-card);
  color: var(--text);
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
  color: var(--color-light-green);
  font-weight: 700;
}
@media (max-width: 480px) {
  .lt-basic-free { max-width: none; margin: 0 0 18px; }
}
`;

/**
 * "Free on Basic:" + the included Basic rows, for every Premium lock. GUEST-WALL: the rows are the same with the limits on or
 * off - LIMITS-1 PR-2's limits-on papers row (a weekly download) is retired with the owner's 26 Nov ruling, so this list no
 * longer loads limitsPlanCopy at all.
 */
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
