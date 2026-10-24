import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { CardChunkGuard, FeedbackPrompt } from "./FeedbackPrompt";

/**
 * PERF-3 - the graded card is its own chunk: it loads on demand through the REAL lazyWithRetry, and a chunk
 * that will not load shows nothing instead of crashing the page.
 */
afterEach(cleanup);

describe("FeedbackPrompt - the graded card is a lazy chunk", () => {
  it("renders the card once its chunk has loaded (the real lazy path)", async () => {
    render(
      <FeedbackPrompt
        moment="after_graded"
        flow={null}
        withZiggy={false}
        onAnswer={vi.fn()}
        onDismiss={vi.fn()}
        onDone={vi.fn()}
      />,
    );
    expect(await screen.findByTestId("feedback-prompt")).toBeInTheDocument();
    expect(screen.getByText("Was this useful?")).toBeInTheDocument();
  });

  it("a chunk that fails to load shows nothing, does not crash, and tells the host to clean up", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const onFail = vi.fn();
    function Boom(): never {
      throw new Error("Failed to fetch dynamically imported module: /assets/GradedFeedbackCard.js");
    }
    const view = render(
      <div data-testid="page">
        <CardChunkGuard onFail={onFail}>
          <Boom />
        </CardChunkGuard>
        still here
      </div>,
    );
    expect(onFail).toHaveBeenCalledTimes(1);
    expect(view.getByTestId("page").textContent).toBe("still here");
    err.mockRestore();
  });

  it("the other moments (paywall) never touch the graded chunk", () => {
    render(<FeedbackPrompt moment="paywall" onAnswer={vi.fn()} onDismiss={vi.fn()} onDone={vi.fn()} />);
    expect(screen.queryByText("Was this useful?")).toBeNull();
  });
});
