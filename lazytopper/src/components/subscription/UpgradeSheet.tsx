/**
 * UpgradeSheet — what a student sees when they meet a Premium boundary.
 *
 * ★★ THE PRINCIPLE: a student should learn the boundary, not bounce off it.
 * A paywall is the single most fragile moment in the product. This component
 * exists because the one that came before it got three things wrong, all three
 * found by the owner using the deployed product rather than by any gate:
 *
 *  1. IT SOLD SURFACES THAT DO NOT EXIST. `UpgradeModal` renders
 *     `getPremiumFeatureList()`, which listed every premium gate entry — including
 *     Smart Study Planner, Daily Focus Mix, Full Analytics Dashboard, Parent
 *     Dashboard and Predicted Questions, none of which the product ships. That is
 *     fabrication with a price attached. Fixed at the SOURCE (`featureGates.ts`),
 *     so the old modal is fixed too; this component simply reads the corrected
 *     list and never keeps a copy of its own.
 *     [FU-UPGRADE-MODAL-SELLS-RETIRED-FEATURES]
 *
 *  2. IT HAD ONE EXIT. "Choose Plan", and nothing else. ★ A paywall with one exit
 *     teaches a student the product is over. Two exits teach them what they still
 *     have — so "Keep using Basic" is a real, equally-weighted button, not a
 *     subdued dismissal link. [FU-UPGRADE-MODAL-NO-BASIC-EXIT]
 *
 *  3. IT READ AS AN ERROR. The old modal puts "Your free trial has ended" in red
 *     on pink, and GATE-1's (correct, kind) server copy landed in SolutionChecker's
 *     error-red box. ★ A LOCKED FEATURE IS NOT A MISTAKE THE STUDENT MADE. Nothing
 *     on this path is error-red; the treatment is the offer strip's green.
 *     [FU-GATE-COPY-STILL-READS-AS-ERROR]
 *
 * ★ PRICE. Every figure comes from `MONTHLY_INLINE` in `config/pricing.ts`. Never a
 * literal — `MONTHLY_INLINE` is hard-bound to the founding rate while the cohort is
 * open, so a typed "₹599" becomes silently wrong the day `FOUNDING_OFFER_OPEN`
 * flips. `pricing.guard.test.ts` forbids a price literal under `src/`.
 *
 * ★ NO `style={{}}`. Styling is a `<style>` block plus class names, following
 * `OfferStrip.tsx` — the in-repo precedent for a self-contained styled component.
 * That keeps the component to ONE new file and honours the standing "CSS classes,
 * not inline style objects in new components" rule at the same time.
 *
 * ⚠ MOUNT ONLY WHEN OPEN. This component calls `useNavigate`/`useLocation`, so it
 * must not be mounted by a parent that renders outside a router. Callers render it
 * conditionally (`{open && <UpgradeSheet .../>}`) rather than passing `open={false}`
 * — see the "not mounted when closed" test.
 */

import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getPremiumFeatureList } from "../../services/featureGates";
import { MONTHLY_INLINE } from "../../config/pricing";

export interface UpgradeSheetProps {
  /** What the student was trying to do, in their words. Names the blocked feature. */
  featureLabel: string;
  /**
   * ISO date the trial ended, when the server told us. ★ Rendered ONLY when known —
   * a guessed date on a payment surface is worse than no date at all.
   */
  trialEndedAt?: string | null;
  /** "Keep using Basic", the backdrop, Escape, and the close control all land here. */
  onClose: () => void;
}

/**
 * Bottom sheet under 1024px, small centred modal at or above it. Never a full-page
 * redirect — ★ the sheet must never leave the page the student was on, because the
 * work they were doing is the thing they are afraid of losing.
 */
const UPGRADE_SHEET_CSS = `
  .lt-upsheet__scrim {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: rgba(9, 22, 40, 0.55);
    display: flex;
    align-items: flex-end;
    justify-content: center;
  }
  .lt-upsheet {
    width: 100%;
    max-width: 460px;
    background: var(--lt-surface, #ffffff);
    border-radius: 20px 20px 0 0;
    padding: 20px 20px 24px;
    box-shadow: 0 -8px 32px rgba(9, 22, 40, 0.18);
    max-height: 88vh;
    overflow-y: auto;
  }
  .lt-upsheet__grip {
    width: 40px;
    height: 4px;
    border-radius: 999px;
    background: rgba(73, 98, 127, 0.28);
    margin: 0 auto 14px;
  }
  .lt-upsheet__title {
    margin: 0 0 4px;
    font-size: 1.08rem;
    font-weight: 800;
    color: var(--lt-ink, #0f2743);
    line-height: 1.35;
  }
  /* ★ The trial line. NEUTRAL — deliberately not red, not pink, not a warning
     triangle. It states a fact about a date; it does not report a fault. */
  .lt-upsheet__trial {
    margin: 0 0 16px;
    font-size: 0.86rem;
    color: var(--lt-muted, #49627f);
  }
  /* ★ The offer block. Green-bordered, matching OfferStrip — the treatment the
     product already uses to say "here is something good", never "something broke". */
  .lt-upsheet__offer {
    border-radius: 14px;
    padding: 14px;
    color: var(--lt-green-dark, #0b8f50);
    background: rgba(22, 185, 106, 0.1);
    border: 1px solid rgba(22, 185, 106, 0.24);
    margin-bottom: 14px;
  }
  .lt-upsheet__price {
    font-size: 1.02rem;
    font-weight: 800;
    margin: 0 0 8px;
  }
  .lt-upsheet__list {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .lt-upsheet__list li {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 3px 0;
    font-size: 0.86rem;
  }
  .lt-upsheet__tick { font-weight: 800; }
  .lt-upsheet__cta,
  .lt-upsheet__basic {
    width: 100%;
    border-radius: 14px;
    padding: 13px 16px;
    font-size: 0.95rem;
    font-weight: 800;
    cursor: pointer;
    display: block;
  }
  .lt-upsheet__cta {
    background: var(--lt-green, #16b96a);
    border: 1px solid var(--lt-green-dark, #0b8f50);
    color: #ffffff;
    margin-bottom: 14px;
  }
  /* ★ "Keep using Basic" is a REAL CHOICE, not a dismissal. Full width, real
     button, same weight and padding as the paid CTA — only the fill differs, so
     it reads as the second of two options rather than as "no thanks". */
  .lt-upsheet__basic {
    background: var(--lt-surface, #ffffff);
    border: 1.5px solid rgba(73, 98, 127, 0.35);
    color: var(--lt-ink, #0f2743);
  }
  .lt-upsheet__keep {
    border-radius: 14px;
    padding: 12px 14px;
    background: rgba(73, 98, 127, 0.07);
    border: 1px solid rgba(73, 98, 127, 0.16);
    font-size: 0.84rem;
    color: var(--lt-muted, #49627f);
    line-height: 1.5;
    margin-bottom: 12px;
  }
  .lt-upsheet__keep strong { color: var(--lt-ink, #0f2743); }

  /* Desktop: a small centred modal. useIsDesktop is a 1024px breakpoint, so the
     sheet uses the same boundary rather than inventing a second one. */
  @media (min-width: 1024px) {
    .lt-upsheet__scrim { align-items: center; }
    .lt-upsheet { border-radius: 20px; max-width: 420px; }
    .lt-upsheet__grip { display: none; }
  }
`;

export function UpgradeSheet({ featureLabel, trialEndedAt, onClose }: UpgradeSheetProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const sheetRef = useRef<HTMLDivElement>(null);

  // Escape closes, exactly like "Keep using Basic" — same call, so the two exits
  // cannot drift apart.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    sheetRef.current?.focus();
  }, []);

  // ★ Read, never restate. The list is whatever `featureGates.ts` currently says is
  // both premium AND shipped. A retired surface cannot appear here without first
  // being un-retired in the gate table, which is the point.
  const premiumFeatures = getPremiumFeatureList();

  const handleSeePlans = () => {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    navigate(`/pricing?source=upgrade-sheet&returnTo=${encodeURIComponent(returnTo)}`);
  };

  const trialLine = formatTrialEnded(trialEndedAt);

  return (
    <div
      className="lt-upsheet__scrim"
      onClick={onClose}
      data-testid="upgrade-sheet-scrim"
    >
      <style>{UPGRADE_SHEET_CSS}</style>
      <div
        className="lt-upsheet"
        role="dialog"
        aria-modal="true"
        aria-label={`${featureLabel} is a Premium feature`}
        tabIndex={-1}
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
        data-testid="upgrade-sheet"
      >
        <div className="lt-upsheet__grip" />

        {/* ★ Names the feature the student was actually blocked on — passed in by the
            caller, never one hardcoded string for every surface. */}
        <h2 className="lt-upsheet__title">{featureLabel} is a Premium feature</h2>

        {/* ★ Only when the server told us. No date is better than a guessed one. */}
        {trialLine && <p className="lt-upsheet__trial">{trialLine}</p>}

        <div className="lt-upsheet__offer">
          {/* ★ From pricing.ts. Never a literal. */}
          <p className="lt-upsheet__price">Premium — {MONTHLY_INLINE} · everything unlocked</p>
          <ul className="lt-upsheet__list">
            {premiumFeatures.map((f) => (
              <li key={f.id}>
                <span className="lt-upsheet__tick" aria-hidden="true">✓</span>
                {f.label}
              </li>
            ))}
          </ul>
        </div>

        <button type="button" className="lt-upsheet__cta" onClick={handleSeePlans}>
          See plans
        </button>

        {/* ★ NAME WHAT BASIC KEEPS, not what Premium withholds. And "Nothing you've
            done is locked" stays — a student's real fear at a paywall is losing
            their own work, and it is the sentence that answers it. */}
        <div className="lt-upsheet__keep">
          You keep <strong>Basic free, always</strong> — Exam Trends, the full question
          bank, Practice, and your progress. Nothing you&rsquo;ve done is locked.
        </div>

        <button type="button" className="lt-upsheet__basic" onClick={onClose}>
          Keep using Basic
        </button>
      </div>
    </div>
  );
}

/**
 * "Your trial ended on 9 August." — or nothing at all.
 *
 * ★ Returns null for absent AND unparseable input. The alternative, rendering
 * "Invalid Date" or falling back to today, puts a wrong date on a payment surface.
 * Silence is the honest failure mode here.
 */
export function formatTrialEnded(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const day = d.getDate();
  const month = d.toLocaleString("en-GB", { month: "long" });
  return `Your trial ended on ${day} ${month}.`;
}

/**
 * Turn the server's feature CODE into something a fifteen-year-old reads.
 *
 * ★ The sheet must name the capability that was actually blocked, so the label is
 * DERIVED from the 402 payload rather than hardcoded per surface. Unknown codes fall
 * back to a true, generic phrase instead of leaking `check_solution` at a student —
 * the same defect GATE-1's typed error exists to prevent.
 */
const PREMIUM_FEATURE_LABELS: Record<string, string> = {
  check_solution: "Checking your answer",
  mentor: "The AI tutor",
  step_solution: "Step-by-step solutions",
};

export function labelForFeature(code: string | undefined | null): string {
  if (!code) return "This";
  return PREMIUM_FEATURE_LABELS[code] || "This";
}

export default UpgradeSheet;
