import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import ResultsScorecard from "./ResultsScorecard";
import type { ScorecardVariant } from "./scorecardVariants";
import { FX_CI_SINGLE, FX_FOUR_TYPES, FX_GREAT, FX_LOW, FX_OBJECTIVE_ONLY, FX_PENDING } from "../../test/shareFixtures";

/**
 * SHARE-CARD-1 - "Share result" on the ONE shared scorecard, so every grading surface gets it.
 * The share sheet is a lazy chunk; it is mocked here, which is also the proof the scorecard does
 * not load it (or the card / rig / html-to-image behind it) until the tap.
 */
const { sheetProps } = vi.hoisted(() => ({ sheetProps: vi.fn() }));
vi.mock("./share/ShareSheet", () => ({
  default: (p: { variant: ScorecardVariant; onClose: () => void }) => {
    sheetProps(p);
    return <div data-testid="share-sheet-mock" />;
  },
}));

afterEach(() => {
  cleanup();
  sheetProps.mockClear();
});

const shareButton = () => screen.queryByRole("button", { name: /share result/i });

describe("ResultsScorecard - Share result on every graded surface", () => {
  const surfaces: Array<[string, ScorecardVariant]> = [
    ["Check & Improve - single question", FX_CI_SINGLE],
    ["Check & Improve - multi-question upload", FX_PENDING],
    ["Worksheet", FX_FOUR_TYPES],
    ["Chapter Test", FX_GREAT],
    ["Full Mock", FX_LOW],
    ["Quick Practice", FX_OBJECTIVE_ONLY],
  ];
  it.each(surfaces)("%s shows the button", (_name, v) => {
    render(<ResultsScorecard variant={v} onClose={() => {}} />);
    expect(shareButton()).not.toBeNull();
  });

  it("only the Quick Practice guest host opts out (hideShare) - no other host hides it", () => {
    const root = resolve(__dirname, "../..");
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const n of readdirSync(dir)) {
        const p = join(dir, n);
        if (statSync(p).isDirectory()) walk(p);
        // (ResultsScorecard.tsx itself only documents the prop.)
        else if (/\.tsx$/.test(n) && !/\.test\.tsx$/.test(n) && n !== "ResultsScorecard.tsx") {
          const src = readFileSync(p, "utf8");
          for (const m of src.matchAll(/hideShare=\{([^}]*)\}/g)) hits.push(`${n}:${m[1]}`);
        }
      }
    };
    walk(root);
    expect(hits).toEqual(["PracticePage.tsx:isGuest"]);
  });
});

describe("ResultsScorecard - Share result visibility", () => {
  it("not on the all-pending state", () => {
    render(<ResultsScorecard variant={{ ...FX_PENDING, allPending: { title: "We couldn't read any answers", detail: "x" } }} onClose={() => {}} />);
    expect(shareButton()).toBeNull();
  });
  it("not on an attempts-only (ungraded) hero", () => {
    render(
      <ResultsScorecard
        variant={{ ...FX_OBJECTIVE_ONLY, score: { kind: "attempts", attempted: 2, ofN: 5, mcqAnswered: 0, mcqCorrect: 0 } }}
        onClose={() => {}}
      />,
    );
    expect(shareButton()).toBeNull();
  });
  it("not on the signed-out Check & Improve preview", () => {
    render(
      <ResultsScorecard
        variant={{ ...FX_PENDING, actions: [{ label: "Sign up free to save this", tag: "Save", tone: "secondary", onClick: () => {} }] }}
        onClose={() => {}}
      />,
    );
    expect(shareButton()).toBeNull();
  });
  it("not when the host opts out (hideShare)", () => {
    render(<ResultsScorecard variant={FX_FOUR_TYPES} onClose={() => {}} hideShare />);
    expect(shareButton()).toBeNull();
  });
});

describe("ResultsScorecard - the tap opens the lazy share sheet", () => {
  it("the sheet is not loaded until the tap; then it gets the variant; the scorecard stays open", async () => {
    const onClose = vi.fn();
    render(<ResultsScorecard variant={FX_FOUR_TYPES} onClose={onClose} />);
    expect(screen.queryByTestId("share-sheet-mock")).toBeNull();
    expect(sheetProps).not.toHaveBeenCalled();
    fireEvent.click(shareButton() as HTMLElement);
    await waitFor(() => expect(screen.getByTestId("share-sheet-mock")).toBeInTheDocument());
    expect(sheetProps).toHaveBeenCalledWith(expect.objectContaining({ variant: FX_FOUR_TYPES }));
    expect(onClose).not.toHaveBeenCalled();
  });
});
