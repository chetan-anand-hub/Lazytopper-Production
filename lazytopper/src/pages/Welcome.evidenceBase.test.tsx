import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import Welcome from "./Welcome";
import { PRICE_MONTHLY_LIST_DISPLAY } from "../config/pricing";

/**
 * [FU-LANDING-FABRICATED-FIGURES] — the landing page states no figure it cannot
 * measure. THE DOCTRINE IS UNCHANGED; ITS SUBJECT MOVED IN LANDING-MERGE-1, AND
 * THIS FILE WAS REWRITTEN BY REASONING RATHER THAN BECAUSE IT WENT RED.
 *
 * ★ WHAT THIS FILE USED TO GUARD, AND WHY IT COULD NOT SIMPLY BE KEPT.
 * WELCOME-FIGURES-1 found the old landing rendering a full set of invented
 * measurements — "92%" against Real Numbers, a 76% progress ring, "Accuracy 78%",
 * "Rank Top 12%", "+18% this month", four subject-strength percentages, a session
 * frozen at 08:34 with 12/20 answered. The owner's deliverable was to blank the
 * VALUES while keeping the layout, and to tag every figure-bearing stage "Sample".
 * This file asserted that tag on all three such stages, plus a control that the bar
 * widths survived so the fix could not quietly become a redesign.
 *
 * ⚠ EVERY ONE OF THOSE ASSERTIONS NAMED A PREVIEW CARD — ExamTrendsCard,
 * PracticeCard, ProgressCard — AND THE MERGE DELETES ALL FOUR CARDS. The new page
 * is marketing, not a product tour: it shows one question and three ways to lose
 * marks on it. There is no progress ring, no accuracy figure, no rank, no bar.
 *
 * ★★ SO THE "Sample" TAG IS NOT REPLACED — IT IS NO LONGER OWED, and that is the
 * better outcome rather than a loophole. The tag existed to mark invented figures as
 * not-real. Its honest equivalent on a page that renders no such figures is that the
 * figures are gone, not a label pointing at nothing. Re-pointing the old assertion at
 * some surviving element would have been a red-test fix wearing the old test's name.
 *
 * ⚠ AND THE GUARD IS NOT DROPPED WITH IT. Deleting this file would have let the
 * no-fake-data rule stop guarding the front door entirely — the exact silent failure
 * this lane was told to avoid. The new page does carry numbers, so the doctrine
 * re-homes onto them:
 *   1. THE THREE STUDENT DIAGNOSES (1/3, 2½/3, 2/3). Illustrative, and the owner
 *      ruled the prototype's copy ships verbatim. They are framed by "One question ·
 *      Trigonometry · 3 marks" — one question's marks, not a product claim. What must
 *      never appear beside them is a PRODUCT-PERFORMANCE claim, which is what the old
 *      fabricated set actually was.
 *   2. THE PRICE. The prototype shipped "₹1,999/mo", a figure appearing nowhere in
 *      src/config/pricing.ts (list 999, founding 599). The prototype's own header says
 *      this figure MUST match /app/pricing or stop. It did not match. A price is the
 *      one number here a student may act on, so it is read from the config.
 *
 * The page reads no auth state at all, so this file needs no useAuth mock.
 */

afterEach(() => cleanup());

function renderWelcome() {
  return render(
    <MemoryRouter>
      <Welcome />
    </MemoryRouter>,
  );
}

/**
 * ★ The page's VISIBLE text. `container.textContent` INCLUDES the inline <style>
 * block, which is a text node — reading it raw makes a text assertion fire against
 * the stylesheet rather than the page. jsdom implements no innerText, so the style
 * elements are removed from a clone instead. (The original of this file learned this
 * the hard way against `conic-gradient(... 0 76% ...)`.)
 */
function visibleText(container: HTMLElement): string {
  const clone = container.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("style").forEach((el) => el.remove());
  return clone.textContent ?? "";
}

describe("Welcome — the landing page states no figure it cannot measure", () => {
  // ★★ THE CONTROL COMES FIRST, AND IT IS NOT DECORATION. Every assertion below is a
  // NEGATIVE one, and a negative assertion is vacuously true against a page that
  // failed to render. That is not hypothetical here: when the merge deleted the four
  // preview cards, two of this file's old negative assertions kept PASSING while
  // proving nothing, because the elements they searched no longer existed. Pin the
  // figure-bearing content as PRESENT before asserting what it does not say.
  it("★ CONTROL — the three illustrative diagnoses really do render", () => {
    renderWelcome();
    expect(screen.getByText("Aarav")).toBeInTheDocument();
    expect(screen.getByText("Diya")).toBeInTheDocument();
    expect(screen.getByText("Kabir")).toBeInTheDocument();
    // Their scores are the page's only non-price numbers; assert the rendered ones,
    // so "no fabricated claim" below is being asserted about a populated page.
    expect(screen.getByText("1/3")).toBeInTheDocument();
    expect(screen.getByText("2½/3")).toBeInTheDocument();
    expect(screen.getByText("2/3")).toBeInTheDocument();
  });

  it("★ CONTROL — and they are framed as ONE question's marks, not a product result", () => {
    // The frame is what makes the scores honest. Drop this line and three bare
    // fractions sit on the page with nothing saying what they measure.
    renderWelcome();
    expect(screen.getByText(/One question.*Trigonometry.*3 marks/)).toBeInTheDocument();
  });

  it("★★ renders NO product-performance claim of any kind", () => {
    const { container } = renderWelcome();
    const text = visibleText(container);
    // The exact shapes WELCOME-FIGURES-1 removed, plus the generic claim forms a
    // marketing page drifts toward.
    const FORBIDDEN = [
      /\bAccuracy\b/i,
      /\bRank\b/i,
      /\btop\s*\d+\s*%/i,
      /\b\d+\s*%\s*(this month|improvement|more marks)/i,
      /\b\d+\s*(students|toppers)\b/i,
      /\bguaranteed\b/i,
    ];
    for (const pattern of FORBIDDEN) {
      expect(text, `the landing page makes a performance claim matching ${pattern}`).not.toMatch(
        pattern,
      );
    }
  });

  it("★★ CONTROL — that matcher can fire: it catches a claim injected into the same text", () => {
    // Without this, the block above passes just as happily against a broken regex set
    // or an empty string. Prove the instrument detects what it screens for.
    const { container } = renderWelcome();
    const poisoned = visibleText(container) + " Accuracy 78% — Rank Top 12%";
    expect(poisoned).toMatch(/\bAccuracy\b/i);
    expect(poisoned).toMatch(/\btop\s*\d+\s*%/i);
  });
});

describe("Welcome — the price is read from the pricing config, never typed", () => {
  it("shows exactly the configured list monthly price", () => {
    renderWelcome();
    // Asserted against the imported constant, not a literal: if pricing.ts moves this
    // test moves with it, and the landing cannot silently disagree with /app/pricing.
    // A hardcoded expectation here would recreate the drift it is meant to catch.
    expect(screen.getByText(PRICE_MONTHLY_LIST_DISPLAY)).toBeInTheDocument();
  });

  it("★ CONTROL — the prototype's 1,999 figure is NOT on the page", () => {
    // The specific wrong number this lane caught. The prototype's header said to stop
    // if it did not match /app/pricing; it did not. This stops it being pasted back in
    // by a future edit working from the prototype file.
    const { container } = renderWelcome();
    expect(visibleText(container)).not.toMatch(/1,?999/);
  });
});

describe("Welcome — no trial is promised anywhere", () => {
  // ⚠ §2.4. `startTrial()` has exactly one production caller, a button inside the
  // premium gate (RequireAuth.tsx:74). A new account is signed-in FREE, not trial.
  // "Free to start" is true; "free for 7 days" beside a sign-up button would be a
  // promise the product does not keep — the fake-trial-activation the doctrine
  // forbids, told the other way round.
  it("renders no 7-day / trial promise in any CTA subtext", () => {
    const { container } = renderWelcome();
    const text = visibleText(container);
    expect(text).not.toMatch(/\btrial\b/i);
    expect(text).not.toMatch(/7[\s-]?day/i);
  });

  it("★ CONTROL — the CTA subtext that SHOULD be there is present, twice", () => {
    // Otherwise the absence above is satisfied by a page with no subtext at all.
    renderWelcome();
    expect(screen.getAllByText("Free to start. One-tap sign-up, no card.")).toHaveLength(2);
  });
});
