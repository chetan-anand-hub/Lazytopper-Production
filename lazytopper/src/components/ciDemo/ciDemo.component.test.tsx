/**
 * CI-SOFT-1 — the card, rendered: pick → mark (red pen, fake timers) → result; reduced motion = the
 * final frame at once; hidden mascots / a refused budget = the same card and copy with no drawing;
 * "Check my own answer" hands the page the sample; × closes. Display only: no grader is mocked
 * because none is reachable from this card.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { setMatchMediaMatches } from "../../test/setup";

const H = vi.hoisted(() => ({ track: vi.fn() }));
vi.mock("../../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../analytics/analytics")>();
  return { ...actual, trackNamedEvent: (...a: unknown[]) => H.track(...a) };
});

import CiDemoChunk from "./ciDemoChunk";
import { CI_DEMO_COPY, CI_DEMO_SAMPLES } from "./ciDemoSamples";
import { __resetMascotBudgetForTests, __setMascotBudgetForTests } from "../guide/mascotBudget";
import { __resetMascotsForTests, hideMascots } from "../guide/mascotsMute";

const noop = () => {};
/** Real timers (no fake clock: this suite must stay out of the date-sensitive manifest): a 25 ms pen step. */
const STEP = 25;
function card(over: Partial<React.ComponentProps<typeof CiDemoChunk>> = {}) {
  return render(<CiDemoChunk onClose={noop} onCheckOwn={noop} onJumpToOwn={noop} signedOut stepMs={STEP} {...over} />);
}
const view = () => screen.getByTestId("ci-demo").getAttribute("data-view");
const line = () => screen.getByTestId("ci-demo-line").textContent;
const names = () => H.track.mock.calls.map((c) => c[0]);
/** Wait until Byte's line is `text` (the pen has reached that step). */
async function until(text: string | undefined) {
  await waitFor(() => expect(line()).toBe(text), { timeout: 2000 });
}

beforeEach(() => {
  window.sessionStorage.clear();
  __resetMascotsForTests();
  __resetMascotBudgetForTests();
  H.track.mockReset();
  setMatchMediaMatches(false);
});
afterEach(() => {
  cleanup();
  setMatchMediaMatches(false);
  __resetMascotBudgetForTests();
  __resetMascotsForTests();
});

describe("CI-SOFT-1 card — PICK", () => {
  it("shows L1 + L2, three tiles (no subject hint → circ, polyConcept, elec) and the own-answer link", () => {
    card();
    expect(view()).toBe("pick");
    expect(line()).toBe(CI_DEMO_COPY.l1);
    expect(screen.getByText(CI_DEMO_COPY.l2)).toBeInTheDocument();
    expect(screen.getByTestId("ci-demo-tile-circ")).toBeInTheDocument();
    expect(screen.getByTestId("ci-demo-tile-polyConcept")).toBeInTheDocument();
    expect(screen.getByTestId("ci-demo-tile-elec")).toBeInTheDocument();
    expect(screen.getByTestId("ci-demo-own-link")).toBeInTheDocument();
    expect(names()).toEqual(["ci_demo_shown"]);
  });

  it("a Science landing hint offers the Science trio", () => {
    window.sessionStorage.setItem("lazytopper.startHereSubject", "Science");
    card();
    for (const k of ["elec", "chem", "light"]) expect(screen.getByTestId(`ci-demo-tile-${k}`)).toBeInTheDocument();
  });

  it("the own-answer link jumps to the question box and the card stays", () => {
    const onJumpToOwn = vi.fn();
    card({ onJumpToOwn });
    fireEvent.click(screen.getByTestId("ci-demo-own-link"));
    expect(onJumpToOwn).toHaveBeenCalledTimes(1);
    expect(view()).toBe("pick");
  });

  it("× closes", () => {
    const onClose = vi.fn();
    card({ onClose });
    fireEvent.click(screen.getByTestId("ci-demo-close"));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(names()).toContain("ci_demo_close");
  });
});

describe("CI-SOFT-1 card — MARK then RESULT (the red pen, one step every 1.8 s)", () => {
  it("L3 label + question, L4, then a step per tick, then the circled total, then the result", async () => {
    card();
    fireEvent.click(screen.getByTestId("ci-demo-tile-circ"));
    const s = CI_DEMO_SAMPLES.circ;
    expect(view()).toBe("mark");
    expect(screen.getByTestId("ci-demo-label").textContent).toBe(CI_DEMO_COPY.l3);
    expect(screen.getByTestId("ci-demo-paper-col").textContent).toContain(s.questionText);
    expect(line()).toBe(CI_DEMO_COPY.l4);
    expect(screen.queryByTestId("ci-demo-mark-0")).toBeNull();

    await until(s.steps[0].say);
    expect(screen.getByTestId("ci-demo-mark-0").textContent).toBe("✗ 0");
    await until(s.steps[1].say);
    expect(screen.getByTestId("ci-demo-mark-1").textContent).toBe("✓ ½");
    await until(s.steps[2].say);
    expect(screen.queryByTestId("ci-demo-total-paper")).toBeNull();
    await until(s.steps[3].say);
    expect(screen.getByTestId("ci-demo-mark-3").textContent).toBe("✗ 0");
    await until(s.summary);
    expect(screen.getByTestId("ci-demo-total-paper").textContent).toBe("1 / 2");

    fireEvent.click(screen.getByTestId("ci-demo-see-result"));
    expect(view()).toBe("result");
    expect(line()).toBe(CI_DEMO_COPY.l9);
    expect(names()).toEqual(["ci_demo_shown", "ci_demo_pick", "ci_demo_result"]);
  });

  it("the pen does not hurry: nothing is marked before the first step is due", () => {
    card({ stepMs: 60_000 });
    fireEvent.click(screen.getByTestId("ci-demo-tile-circ"));
    expect(screen.queryByTestId("ci-demo-mark-0")).toBeNull();
    expect(line()).toBe(CI_DEMO_COPY.l4);
  });

  it("Skip to result shows the full result at once", () => {
    card();
    fireEvent.click(screen.getByTestId("ci-demo-tile-polyConcept"));
    fireEvent.click(screen.getByTestId("ci-demo-skip"));
    expect(view()).toBe("result");
    expect(screen.getByTestId("ci-demo-total").textContent).toBe("1 / 2");
    expect(screen.getAllByRole("listitem").length).toBeGreaterThan(4);
  });

  it("Watch again restarts the pen", async () => {
    card();
    fireEvent.click(screen.getByTestId("ci-demo-tile-circ"));
    await until(CI_DEMO_SAMPLES.circ.steps[1].say);
    expect(screen.queryByTestId("ci-demo-mark-1")).not.toBeNull();
    fireEvent.click(screen.getByTestId("ci-demo-again"));
    expect(screen.queryByTestId("ci-demo-mark-0")).toBeNull();
    expect(line()).toBe(CI_DEMO_COPY.l4);
  });

  it("unmounting stops the pen (no state update after unmount)", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const { unmount } = card();
    fireEvent.click(screen.getByTestId("ci-demo-tile-circ"));
    unmount();
    await new Promise((r) => setTimeout(r, STEP * 3));
    expect(err).not.toHaveBeenCalled();
    err.mockRestore();
  });
});

describe("CI-SOFT-1 card — RESULT", () => {
  function toResult(tile = "circ") {
    const utils = card();
    fireEvent.click(screen.getByTestId(`ci-demo-tile-${tile}`));
    fireEvent.click(screen.getByTestId("ci-demo-skip"));
    return utils;
  }

  it("total, source line, every scheme step with awarded / max, and the product's three groups", () => {
    toResult("circ");
    const s = CI_DEMO_SAMPLES.circ;
    expect(screen.getByText(`${s.paper} · Marked against the CBSE marking scheme`)).toBeInTheDocument();
    const steps = screen.getByTestId("ci-demo-steps").textContent as string;
    for (const st of s.steps) expect(steps).toContain(st.point);
    expect(steps).toContain("0 / ½");
    expect(steps).toContain("½ / ½");
    expect(steps).toContain("Presentation");
    expect(steps).toContain("Calculation slip");
    // The real scorecard block, heading and group wording included.
    const groups = screen.getByTestId("ci-demo-groups").textContent as string;
    expect(groups).toContain("Where your marks went");
    expect(groups).toContain("Marks to gain — the quickest wins");
    expect(groups).toContain("Marks to gain — you already know this");
    expect(groups).toContain(s.takeaway);
    expect(screen.getByTestId("grade-marks-lost")).toBeInTheDocument();
  });

  it("the carried-over line has no second chip but its note, and the block sums to the marks lost", () => {
    toResult("polyConcept");
    const rows = screen.getByTestId("ci-demo-steps").querySelectorAll("li");
    expect(rows[3].textContent).toContain("Follows from the line above. Not counted as a second mistake.");
    expect(rows[3].querySelector(".ci-demo__tag")).toBeNull();
    expect(rows[2].textContent).toContain("Concept gap");
    const groups = screen.getByTestId("ci-demo-groups").textContent as string;
    expect(groups).toContain("Knowledge gap");
    expect(groups).toContain("1 mark");
  });

  it("signed-out sub-line says first check free; signed-in does not", () => {
    toResult();
    expect(screen.getByTestId("ci-demo-check-own").textContent).toContain("Type it or snap a photo · first check free");
    cleanup();
    card({ signedOut: false });
    fireEvent.click(screen.getByTestId("ci-demo-tile-circ"));
    fireEvent.click(screen.getByTestId("ci-demo-skip"));
    const t = screen.getByTestId("ci-demo-check-own").textContent as string;
    expect(t).toContain("Type it or snap a photo");
    expect(t).not.toContain("first check free");
  });

  it("Check my own answer hands the page the sample's bank row, its marks and its label", () => {
    const onCheckOwn = vi.fn();
    card({ onCheckOwn });
    fireEvent.click(screen.getByTestId("ci-demo-tile-circ"));
    fireEvent.click(screen.getByTestId("ci-demo-skip"));
    fireEvent.click(screen.getByTestId("ci-demo-check-own"));
    const s = CI_DEMO_SAMPLES.circ;
    expect(onCheckOwn).toHaveBeenCalledWith({
      bankId: s.bankId,
      text: `${s.questionText} [2]`,
      label: "CBSE board question (2024) · Circles",
    });
    expect(names()).toContain("ci_demo_check_own");
  });

  it("Mark another goes to the next unwatched sample and wraps", () => {
    card();
    fireEvent.click(screen.getByTestId("ci-demo-tile-circ"));
    fireEvent.click(screen.getByTestId("ci-demo-skip"));
    fireEvent.click(screen.getByTestId("ci-demo-another"));
    expect(view()).toBe("mark");
    expect(screen.getByTestId("ci-demo-paper-col").textContent).toContain(CI_DEMO_SAMPLES.polyConcept.questionText);
    fireEvent.click(screen.getByTestId("ci-demo-skip"));
    fireEvent.click(screen.getByTestId("ci-demo-another"));
    expect(screen.getByTestId("ci-demo-paper-col").textContent).toContain(CI_DEMO_SAMPLES.elec.questionText);
    expect(names().filter((n) => n === "ci_demo_another")).toHaveLength(2);
  });
});

describe("CI-SOFT-1 card — reduced motion, wide layout, mascots", () => {
  it("prefers-reduced-motion: the final frame at once, no pen", () => {
    setMatchMediaMatches((q) => q.includes("prefers-reduced-motion"));
    card();
    fireEvent.click(screen.getByTestId("ci-demo-tile-circ"));
    expect(screen.getByTestId("ci-demo-total-paper").textContent).toBe("1 / 2");
    expect(line()).toBe(CI_DEMO_SAMPLES.circ.summary);
  });

  it("at desktop width MARK and RESULT are one layout: the scorecard is dimmed until the total, then it is the result", async () => {
    setMatchMediaMatches((q) => q.includes("min-width: 1024px"));
    card();
    fireEvent.click(screen.getByTestId("ci-demo-tile-circ"));
    expect(screen.getByTestId("ci-demo-score").className).toContain("ci-demo__score--dim");
    await waitFor(() => expect(view()).toBe("result"), { timeout: 2000 });
    expect(screen.getByTestId("ci-demo-score").className).not.toContain("ci-demo__score--dim");
    expect(screen.getByTestId("ci-demo-check-own")).toBeInTheDocument();
  });

  it("with the budget granting: ONE Byte, drawn, and it marks while the pen runs", async () => {
    __setMascotBudgetForTests(true);
    card();
    await act(async () => {});
    expect(screen.getByTestId("ci-demo-byte").getAttribute("data-drawn")).toBe("1");
    fireEvent.click(screen.getByTestId("ci-demo-tile-circ"));
    expect(screen.getByTestId("ci-demo-byte").getAttribute("data-pose")).toBe("marking");
    expect(document.querySelectorAll('[data-testid="ci-demo-byte"]')).toHaveLength(1);
  });

  it("hidden mascots: the same card and copy, no drawing", async () => {
    hideMascots();
    card();
    await act(async () => {});
    expect(screen.getByTestId("ci-demo-byte").getAttribute("data-drawn")).toBe("0");
    expect(line()).toBe(CI_DEMO_COPY.l1);
    fireEvent.click(screen.getByTestId("ci-demo-tile-circ"));
    expect(line()).toBe(CI_DEMO_COPY.l4);
  });

  it("budget refused (three kinds already shown): the same card and copy, no drawing", async () => {
    __setMascotBudgetForTests(true);
    window.sessionStorage.setItem("lazytopper.mascotBudget", JSON.stringify({ v: 1, shown: ["a", "b", "c"] }));
    card();
    await act(async () => {});
    expect(screen.getByTestId("ci-demo-byte").getAttribute("data-drawn")).toBe("0");
    expect(line()).toBe(CI_DEMO_COPY.l1);
  });
});
