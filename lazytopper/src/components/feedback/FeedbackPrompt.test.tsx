import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { FeedbackPrompt, FEEDBACK_THANKS_MS } from "./FeedbackPrompt";
import { FEEDBACK_COPY, FEEDBACK_REASONS } from "./feedbackPromptModel";

/**
 * FEEDBACK-1 — the card itself: one-tap dismiss (three ways), one-tap answer, a thank-you
 * with no upsell, and never blocking the page (no scrim, not modal).
 */

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function renderPrompt() {
  const onAnswer = vi.fn();
  const onDismiss = vi.fn();
  const onDone = vi.fn();
  render(<FeedbackPrompt onAnswer={onAnswer} onDismiss={onDismiss} onDone={onDone} />);
  return { onAnswer, onDismiss, onDone };
}

describe("FeedbackPrompt", () => {
  it("shows the title, the six reasons and a No thanks — and no text box", () => {
    renderPrompt();
    expect(screen.getByText(FEEDBACK_COPY.title)).toBeInTheDocument();
    for (const r of FEEDBACK_REASONS) expect(screen.getByRole("button", { name: r.label })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: FEEDBACK_COPY.close })).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("never blocks: it is a non-modal dialog with no scrim behind it", () => {
    renderPrompt();
    const card = screen.getByTestId("feedback-prompt");
    expect(card).toHaveAttribute("aria-modal", "false");
    expect(document.querySelector(".lt-upsheet__scrim, [class*='scrim']")).toBeNull();
    expect(card.getAttribute("style")).toBeNull();
  });

  it.each([
    ["No thanks", () => fireEvent.click(screen.getByTestId("feedback-no-thanks"))],
    ["the corner ×", () => fireEvent.click(screen.getByTestId("feedback-x"))],
    ["Escape", () => fireEvent.keyDown(document, { key: "Escape" })],
  ])("%s dismisses in ONE tap: onDismiss once, onDone once, no answer", (_label, act1) => {
    const { onAnswer, onDismiss, onDone } = renderPrompt();
    act1();
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onAnswer).not.toHaveBeenCalled();
  });

  it("one tap on a reason answers with its code and shows the thank-you, which has no upsell", () => {
    vi.useFakeTimers();
    const { onAnswer, onDismiss, onDone } = renderPrompt();
    fireEvent.click(screen.getByTestId("feedback-opt-ask_parents"));
    expect(onAnswer).toHaveBeenCalledWith("ask_parents");
    expect(onAnswer).toHaveBeenCalledTimes(1);
    const thanks = screen.getByTestId("feedback-thanks");
    expect(thanks).toHaveTextContent(FEEDBACK_COPY.thanks);
    const card = screen.getByTestId("feedback-prompt");
    expect(card.textContent).not.toMatch(/plan|premium|upgrade|₹|pay/i);
    expect(screen.queryByRole("link")).toBeNull();
    // A second tap anywhere cannot answer twice or count a dismiss.
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(FEEDBACK_THANKS_MS);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("Something else is a plain reason (code other), with no free-text field", () => {
    const { onAnswer } = renderPrompt();
    fireEvent.click(screen.getByTestId("feedback-opt-other"));
    expect(onAnswer).toHaveBeenCalledWith("other");
    expect(screen.queryByRole("textbox")).toBeNull();
  });
});
