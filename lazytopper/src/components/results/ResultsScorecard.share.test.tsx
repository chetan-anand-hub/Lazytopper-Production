import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import ResultsScorecard from "./ResultsScorecard";
import type { ScorecardVariant } from "./scorecardVariants";

/**
 * SHARE-SCORE-1 - "Share my score" on the ONE shared scorecard. Synthetic variants only
 * (scorecardVariants imported for TYPES). The image pipeline is a lazy module; it is mocked
 * here, which is also the proof the scorecard does not load it until the tap.
 */
const { runScoreShare } = vi.hoisted(() => ({ runScoreShare: vi.fn(async () => ({ outcome: "downloaded" as const })) }));
vi.mock("./share/runScoreShare", () => ({ runScoreShare }));

afterEach(() => {
  cleanup();
  runScoreShare.mockClear();
});

function variant(over: Partial<ScorecardVariant> = {}): ScorecardVariant {
  return {
    surface: "check-improve",
    title: "Check & Improve paper",
    subtitle: "Triangles · CI-M-TR-01 · graded just now",
    score: { kind: "marks", awarded: 12, total: 20 },
    actions: [{ label: "Read my graded answer sheet", tag: "Sheet", tone: "primary", onClick: () => {} }],
    ...over,
  };
}

const shareButton = () => screen.queryByRole("button", { name: /share my score/i });

describe("ResultsScorecard - Share my score visibility", () => {
  it("shows on a graded marks scorecard", () => {
    render(<ResultsScorecard variant={variant()} onClose={() => {}} />);
    expect(shareButton()).not.toBeNull();
  });

  it("not on the all-pending state", () => {
    render(<ResultsScorecard variant={variant({ allPending: { title: "We couldn't read any answers", detail: "x" } })} onClose={() => {}} />);
    expect(shareButton()).toBeNull();
  });

  it("not on an attempts-only (ungraded) hero", () => {
    render(
      <ResultsScorecard
        variant={variant({ surface: "quick-practice", score: { kind: "attempts", attempted: 2, ofN: 5, mcqAnswered: 0, mcqCorrect: 0 } })}
        onClose={() => {}}
      />,
    );
    expect(shareButton()).toBeNull();
  });

  it("not on the signed-out Check & Improve preview", () => {
    render(
      <ResultsScorecard
        variant={variant({ actions: [{ label: "Sign up free to save this", tag: "Save", tone: "secondary", onClick: () => {} }] })}
        onClose={() => {}}
      />,
    );
    expect(shareButton()).toBeNull();
  });

  it("not when the host opts out (hideShare)", () => {
    render(<ResultsScorecard variant={variant()} onClose={() => {}} hideShare />);
    expect(shareButton()).toBeNull();
  });

  it("desktop tap (no file share): opens wa.me in the tap, then hands the variant to the lazy pipeline", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    const onClose = vi.fn();
    const v = variant();
    render(<ResultsScorecard variant={v} onClose={onClose} />);
    fireEvent.click(shareButton() as HTMLElement);
    expect(open).toHaveBeenCalledTimes(1);
    const [url, target] = open.mock.calls[0] as [string, string];
    expect(target).toBe("_blank");
    expect(decodeURIComponent(url.replace("https://wa.me/?text=", ""))).toBe(
      "I scored 12/20 in Triangles on LazyTopper. Try it: https://www.lazytopper.com/?utm_source=whatsapp&utm_medium=share&utm_campaign=scorecard",
    );
    await waitFor(() => expect(runScoreShare).toHaveBeenCalledTimes(1));
    // A blocked popup (null) is not a share: the pipeline is told so and counts nothing.
    expect(runScoreShare).toHaveBeenCalledWith(v, expect.objectContaining({ method: "whatsapp_link", linkOpened: false }));
    expect(onClose).not.toHaveBeenCalled();
    open.mockRestore();
  });

  it("desktop tap: a window that really opened is reported as linkOpened, with its opener cut", async () => {
    const win = { opener: {} as unknown } as unknown as Window;
    const open = vi.spyOn(window, "open").mockReturnValue(win);
    render(<ResultsScorecard variant={variant()} onClose={() => {}} />);
    fireEvent.click(shareButton() as HTMLElement);
    await waitFor(() => expect(runScoreShare).toHaveBeenCalledTimes(1));
    expect(runScoreShare).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ linkOpened: true }));
    expect((win as unknown as { opener: unknown }).opener).toBeNull();
    open.mockRestore();
  });

  it("native: a second-tap failure (not a cancel) still downloads the PNG", async () => {
    const file = new File([new Uint8Array([1])], "lazytopper-score.png", { type: "image/png" });
    runScoreShare.mockResolvedValueOnce({ outcome: "needs-tap", file } as never);
    const share = vi.fn(async () => { throw new Error("share target crashed"); });
    const nav = navigator as unknown as { canShare?: unknown; share?: unknown };
    nav.canShare = () => true;
    nav.share = share;
    const createObjectURL = vi.fn(() => "blob:lt-share");
    const revokeObjectURL = vi.fn();
    const origCreate = URL.createObjectURL;
    const origRevoke = URL.revokeObjectURL;
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    try {
      render(<ResultsScorecard variant={variant()} onClose={() => {}} />);
      fireEvent.click(shareButton() as HTMLElement);
      const ready = await screen.findByRole("button", { name: /image ready/i });
      fireEvent.click(ready);
      await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(createObjectURL).toHaveBeenCalledWith(file));
      expect(click).toHaveBeenCalledTimes(1);
    } finally {
      delete nav.canShare;
      delete nav.share;
      URL.createObjectURL = origCreate;
      URL.revokeObjectURL = origRevoke;
      click.mockRestore();
    }
  });
});
