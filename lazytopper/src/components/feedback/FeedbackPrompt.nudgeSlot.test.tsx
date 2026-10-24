import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { FeedbackPrompt } from "./FeedbackPrompt";
import { FEEDBACK_NUDGE_KIND } from "./feedbackBudget";
import { APPEARANCE_PRIORITY, __resetMascotBudgetForTests, __setMascotBudgetForTests, noteShown, requestAppearance, unpromptedShownCount } from "../guide/mascotBudget";
import { __resetMascotsForTests } from "../guide/mascotsMute";

// Ziggy's chunk never arrives in this file: the card is up, his slot is RESERVED but he is not drawn yet.
vi.mock("./FeedbackZiggy", () => new Promise(() => {}));

/** FEEDBACK-NUDGE-1 - the slot accounting while his drawing is still on its way. */
beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
  __resetMascotsForTests();
  __resetMascotBudgetForTests();
  __setMascotBudgetForTests(true);
  for (const k of ["a", "b"]) {
    requestAppearance(k, APPEARANCE_PRIORITY.explainer);
    noteShown(k);
  }
});
afterEach(() => {
  cleanup();
  __resetMascotBudgetForTests();
  __resetMascotsForTests();
});

function renderCard() {
  return render(<FeedbackPrompt moment="trial_end" withZiggy onAnswer={vi.fn()} onDismiss={vi.fn()} onDone={vi.fn()} />);
}

describe("FEEDBACK-NUDGE-1 - the budget slot", () => {
  it("is reserved while he is on his way (a placeholder holds his place) and is not spent", () => {
    renderCard();
    expect(screen.getByTestId("feedback-prompt").querySelector(".lt-fbg__z")).not.toBeNull(); // the placeholder
    expect(screen.queryByTestId("blob-ziggy")).toBeNull();
    expect(unpromptedShownCount()).toBe(2);
    expect(requestAppearance("probe#1", APPEARANCE_PRIORITY.companion)).toBe(false); // the third slot is held
  });

  it("closing before he is drawn gives the slot back and spends nothing", () => {
    const view = renderCard();
    expect(requestAppearance("probe#1", APPEARANCE_PRIORITY.companion)).toBe(false);
    view.unmount();
    expect(requestAppearance("probe#2", APPEARANCE_PRIORITY.companion)).toBe(true);
    expect(unpromptedShownCount()).toBe(2);
  });

  it("is companion priority: a first-time explainer takes the held slot from him", () => {
    renderCard();
    expect(requestAppearance("moment:m5#9", APPEARANCE_PRIORITY.explainer)).toBe(true);
    expect(FEEDBACK_NUDGE_KIND).toBe("feedback:nudge");
  });
});
