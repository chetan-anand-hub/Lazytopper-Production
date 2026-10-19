// SHW-2 (owner ruling, Oct 2026) - the Start-here choices are SEGMENTED CONTROLS, not CTA-looking pills.
//
//   * subject and question type are each ONE radiogroup; every option is role="radio" + aria-checked;
//   * arrow keys move the choice (and focus) like any radio group; only the checked option is tabbable;
//   * the checked option is a light fill + a check mark, NEVER the Start button's green or class;
//   * type options carry a second line ("5 Qs" / "5 Qs" / "1 Q") and one helper line under the control;
//   * the Start button is the only solid-green control and its label follows the choice;
//   * under 360 px of container width the type control stacks (lt-shc-seg--stacked);
//   * the SAME control in the focused first-run dialog.

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup, fireEvent, screen, waitFor, within, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { setMatchMediaMatches } from "../../test/setup";

const { cloudHas, localRows, onboarding, bank, auth, AVAIL } = vi.hoisted(() => ({
  AVAIL: {
    Maths: { "real-numbers": { mcq: 20, ar: 0, written: 4 } },
    Science: { electricity: { mcq: 25, ar: 10, written: 3 } },
  },
  auth: { currentUser: null as null | { uid: string; metadata: { creationTime?: string } } },
  cloudHas: vi.fn(),
  localRows: vi.fn(),
  onboarding: vi.fn(),
  bank: { startHereAvailability: vi.fn(), pickStartHereSet: vi.fn() },
}));
vi.mock("../../services/sessionRecords", () => ({ cloudHasAnySessionRecord: cloudHas, loadLocalSessionRecords: localRows }));
vi.mock("../../analytics/analytics", () => ({ trackOnboardingEvent: onboarding }));
vi.mock("./startHereBank", () => bank);
vi.mock("./startHereAvailability.generated", () => ({ START_HERE_AVAILABILITY: AVAIL }));
vi.mock("../../services/firebaseClient", () => ({ authClient: auth }));

import StartHereCard from "./StartHereCard";
import { resetZeroGradedCacheForTests } from "./zeroGraded";

const GREEN = /hsl\(\s*152\s*,\s*55%\s*,\s*45%\s*\)|rgb\(\s*52\s*,\s*178\s*,\s*119\s*\)/i;

async function mount(focus = false) {
  cloudHas.mockResolvedValue(false);
  render(
    <MemoryRouter initialEntries={["/practice-hub"]}>
      <StartHereCard uid="u-seg" surface="practice_hub" returnTo="/practice-hub" focus={focus} />
    </MemoryRouter>,
  );
  await waitFor(() => expect(screen.queryByTestId("start-here-card")).not.toBeNull());
  if (!focus) fireEvent.click(screen.getByTestId("start-here-start"));
  // START-HERE-ONE-TAP-1: the picker under test is behind "Change chapter or question type".
  fireEvent.click(await screen.findByTestId(focus ? "start-here-focus-change" : "start-here-change"));
}

/** The injected rule for the checked option, from the page's own <style>. */
function checkedRule(): string {
  const css = Array.from(document.querySelectorAll("style")).map((s) => s.textContent ?? "").join("\n");
  return /\.lt-shc-seg-opt\[aria-checked="true"\]\s*\{[^}]*\}/.exec(css)?.[0] ?? "";
}

beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
  resetZeroGradedCacheForTests();
  cloudHas.mockReset();
  localRows.mockReset().mockReturnValue([]);
  onboarding.mockReset();
  bank.pickStartHereSet.mockReset();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  setMatchMediaMatches(false);
});

describe("SHW-2 · segmented controls on the inline card", () => {
  it("★★ subject and type are radiogroups of role=radio options with aria-checked", async () => {
    await mount();
    const subject = screen.getByRole("radiogroup", { name: "Subject" });
    const maths = screen.getByTestId("start-here-subject-maths");
    expect(maths.getAttribute("role")).toBe("radio");
    expect(maths.getAttribute("aria-checked")).toBe("false");
    expect(within(subject).getAllByRole("radio")).toHaveLength(2);
    fireEvent.click(screen.getByTestId("start-here-subject-science"));
    expect(screen.getByTestId("start-here-subject-science").getAttribute("aria-checked")).toBe("true");
    const type = screen.getByRole("radiogroup", { name: "Question type" });
    const radios = within(type).getAllByRole("radio");
    expect(radios.map((r) => r.getAttribute("data-testid"))).toEqual([
      "start-here-qtype-mcq",
      "start-here-qtype-ar",
      "start-here-qtype-written",
    ]);
    expect(radios.map((r) => r.getAttribute("aria-checked"))).toEqual(["true", "false", "false"]);
    expect(radios.map((r) => r.getAttribute("tabindex"))).toEqual(["0", "-1", "-1"]);
  });

  it("★★ labels with a second line: Tap answer / Assertion–Reason / Written, 5 Qs / 5 Qs / 1 Q", async () => {
    await mount();
    fireEvent.click(screen.getByTestId("start-here-subject-science"));
    const text = (id: string) => screen.getByTestId(id).textContent;
    expect(text("start-here-qtype-mcq")).toContain("Tap answer");
    expect(text("start-here-qtype-mcq")).toContain("5 Qs");
    expect(text("start-here-qtype-ar")).toContain("Assertion–Reason");
    expect(text("start-here-qtype-ar")).toContain("5 Qs");
    expect(text("start-here-qtype-written")).toContain("Written");
    expect(text("start-here-qtype-written")).toContain("1 Q");
    expect(text("start-here-qtype-written")).not.toContain("1 Qs");
  });

  it("★★ arrow keys move the choice and focus; Home/End jump; wraps around", async () => {
    await mount();
    fireEvent.click(screen.getByTestId("start-here-subject-science"));
    const mcq = screen.getByTestId("start-here-qtype-mcq");
    fireEvent.keyDown(mcq, { key: "ArrowRight" });
    const ar = screen.getByTestId("start-here-qtype-ar");
    expect(ar.getAttribute("aria-checked")).toBe("true");
    expect(document.activeElement).toBe(ar);
    fireEvent.keyDown(ar, { key: "ArrowDown" });
    expect(screen.getByTestId("start-here-qtype-written").getAttribute("aria-checked")).toBe("true");
    fireEvent.keyDown(screen.getByTestId("start-here-qtype-written"), { key: "ArrowRight" });
    expect(screen.getByTestId("start-here-qtype-mcq").getAttribute("aria-checked")).toBe("true");
    fireEvent.keyDown(screen.getByTestId("start-here-qtype-mcq"), { key: "ArrowLeft" });
    expect(screen.getByTestId("start-here-qtype-written").getAttribute("aria-checked")).toBe("true");
    fireEvent.keyDown(screen.getByTestId("start-here-qtype-written"), { key: "Home" });
    expect(screen.getByTestId("start-here-qtype-mcq").getAttribute("aria-checked")).toBe("true");
    fireEvent.keyDown(screen.getByTestId("start-here-qtype-mcq"), { key: "End" });
    expect(screen.getByTestId("start-here-qtype-written").getAttribute("aria-checked")).toBe("true");
    // Subject group too.
    fireEvent.keyDown(screen.getByTestId("start-here-subject-science"), { key: "ArrowLeft" });
    expect(screen.getByTestId("start-here-subject-maths").getAttribute("aria-checked")).toBe("true");
    expect(document.activeElement).toBe(screen.getByTestId("start-here-subject-maths"));
  });

  it("★★ the checked option is NEVER the CTA: not the Start class, not the Start green; a check mark shows", async () => {
    await mount();
    fireEvent.click(screen.getByTestId("start-here-subject-science"));
    for (const id of ["start-here-subject-science", "start-here-qtype-mcq"]) {
      const el = screen.getByTestId(id);
      expect(el.getAttribute("aria-checked")).toBe("true");
      expect(el.className).not.toMatch(/lt-shc-go|lt-shc-chip/);
      expect(el.getAttribute("style") ?? "").not.toMatch(GREEN);
      expect(el.querySelector(".lt-shc-seg-check")).not.toBeNull();
    }
    expect(screen.getByTestId("start-here-qtype-ar").querySelector(".lt-shc-seg-check")).toBeNull();
    const rule = checkedRule();
    expect(rule).not.toBe("");
    expect(rule).not.toMatch(GREEN);
    // The Start button stays the one solid-green control.
    expect(screen.getByTestId("start-here-go").className).toBe("lt-shc-go");
  });

  it("★★ one helper line describes the selected type; the Start label follows the choice", async () => {
    await mount();
    fireEvent.click(screen.getByTestId("start-here-subject-science"));
    const help = () => screen.getByTestId("start-here-qtype-help").textContent;
    expect(help()).toBe("Tap the right option – 5 board MCQs, about 2 min.");
    expect(screen.getByTestId("start-here-go").textContent).toBe("Start 5 questions");
    fireEvent.click(screen.getByTestId("start-here-qtype-ar"));
    expect(help()).toBe("Assertion and reason – 5 board questions.");
    expect(screen.getByTestId("start-here-go").textContent).toBe("Start 5 questions");
    fireEvent.click(screen.getByTestId("start-here-qtype-written"));
    expect(help()).toBe(
      "One written board question – type your answer, it is marked like the board (uses 1 of today's checks).",
    );
    expect(screen.getByTestId("start-here-go").textContent).toBe("Start 1 written question");
    expect(screen.getAllByTestId("start-here-qtype-help")).toHaveLength(1);
  });

  it("★ CONTROL: start_here_start params are unchanged (plus START-HERE-ONE-TAP-1 mode=picker)", async () => {
    bank.pickStartHereSet.mockResolvedValue(["a", "b", "c", "d", "e"]);
    await mount();
    fireEvent.click(screen.getByTestId("start-here-subject-science"));
    fireEvent.click(screen.getByTestId("start-here-qtype-ar"));
    fireEvent.click(screen.getByTestId("start-here-go"));
    await waitFor(() =>
      expect(onboarding.mock.calls.filter((c) => c[0] === "start_here_start")).toEqual([
        ["start_here_start", { subject: "science", chapter: "electricity", qtype: "ar", mode: "picker" }],
      ]),
    );
  });

  it("★★ under 360 px of container width the type control stacks; at 360+ it does not", async () => {
    let cb: ((entries: Array<{ contentRect: { width: number } }>) => void) | null = null;
    class RO {
      constructor(fn: (entries: Array<{ contentRect: { width: number } }>) => void) {
        cb = fn;
      }
      observe() {}
      disconnect() {}
      unobserve() {}
    }
    vi.stubGlobal("ResizeObserver", RO);
    await mount();
    fireEvent.click(screen.getByTestId("start-here-subject-science"));
    const group = () => screen.getByRole("radiogroup", { name: "Question type" });
    expect(group().className).not.toContain("lt-shc-seg--stacked");
    act(() => cb?.([{ contentRect: { width: 340 } }]));
    expect(group().className).toContain("lt-shc-seg--stacked");
    act(() => cb?.([{ contentRect: { width: 360 } }]));
    expect(group().className).not.toContain("lt-shc-seg--stacked");
  });
});

describe("SHW-2 · the same control in the focused first-run dialog", () => {
  it("★★ radiogroups, aria-checked, never the CTA, Start label follows the choice", async () => {
    setMatchMediaMatches(true);
    await mount(true);
    const dlg = await screen.findByTestId("start-here-focus");
    expect(within(dlg).getByRole("radiogroup", { name: "Subject" })).toBeInTheDocument();
    fireEvent.click(within(dlg).getByTestId("start-here-focus-subject-science"));
    const written = within(dlg).getByTestId("start-here-focus-qtype-written");
    expect(written.getAttribute("role")).toBe("radio");
    fireEvent.click(written);
    expect(written.getAttribute("aria-checked")).toBe("true");
    expect(written.className).not.toMatch(/lt-shc-go|lt-shc-chip/);
    expect(within(dlg).getByTestId("start-here-focus-go").textContent).toBe("Start 1 written question");
    expect(within(dlg).getByTestId("start-here-focus-qtype-help").textContent).toContain("One written board question");
  });
});
