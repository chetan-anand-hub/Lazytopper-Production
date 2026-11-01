// TUTOR-STICKY-1 — the one-tap check: graded on the device, "Got it — that mark is back" on success,
// the daily-fix item cleared on success only, and silent when the bank has no honest question.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const bank = vi.hoisted(() => ({ rows: [] as unknown[] }));
vi.mock("../../data/bankChapters/loader", () => ({ ensureBankChapters: vi.fn(async () => undefined) }));
vi.mock("../../data/bankQuery", () => ({ selectBankQuestions: vi.fn(() => bank.rows) }));
vi.mock("../question/MathText", () => ({ MathText: ({ text }: { text: string }) => <span>{text}</span> }));
vi.mock("../../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../analytics/analytics")>();
  return { ...actual, trackTutorSticky: vi.fn() };
});
const fix = vi.hoisted(() => ({ state: null as unknown }));
vi.mock("./useDailyFix", () => ({ useDailyFix: () => fix.state }));

import TutorCheckCard, { CHECK_RIGHT_COPY, TutorNextFix } from "./TutorCheckCard";
import * as analytics from "../../analytics/analytics";
import { readClearedFixes, istDay } from "../../lib/tutorSticky/dailyFix";

const track = analytics.trackTutorSticky as unknown as ReturnType<typeof vi.fn>;

const row = {
  id: "Q-NEW",
  format: "MCQ",
  subtopic: "Ohm's law",
  questionText: "Which unit measures resistance?",
  options: ["volt", "ohm", "ampere", "watt"],
  answer: "ohm",
  explanation: "Resistance is measured in ohm.",
};

function mount(over: Partial<React.ComponentProps<typeof TutorCheckCard>> = {}) {
  const cb = { onOffered: vi.fn(), onAsk: vi.fn(), onResolved: vi.fn() };
  render(
    <MemoryRouter>
      <TutorCheckCard
        topicKey="electricity"
        topicLabel="Electricity"
        subject="science"
        concept="Ohm's law"
        excludeIds={[]}
        fixKey="m1"
        uid="u1"
        {...cb}
        {...over}
      />
    </MemoryRouter>,
  );
  return cb;
}

beforeEach(() => {
  localStorage.clear();
  bank.rows = [row];
});
afterEach(() => {
  cleanup();
  track.mockClear();
  fix.state = null;
});

describe("TutorCheckCard", () => {
  it("offers one similar question and says it is on the concept", async () => {
    const cb = mount();
    await screen.findByTestId("tutor-check");
    expect(screen.getByText("Quick check · Ohm's law")).toBeTruthy();
    expect(cb.onOffered).toHaveBeenCalledWith("Q-NEW");
    expect(track).toHaveBeenCalledWith("tutor_check_shown", { surface: "tutor" });
  });

  it("a right tap: 'Got it — that mark is back', counted, and the daily-fix item cleared today", async () => {
    const cb = mount();
    await screen.findByTestId("tutor-check");
    fireEvent.click(screen.getByTestId("tutor-check-opt-1"));
    expect(screen.getByTestId("tutor-check-result").textContent).toContain(CHECK_RIGHT_COPY);
    expect(cb.onResolved).toHaveBeenCalledWith(true);
    expect(track).toHaveBeenCalledWith("tutor_check_correct", { surface: "tutor" });
    expect(readClearedFixes("u1")).toEqual({ m1: istDay(Date.now()) });
    // locked once answered
    expect((screen.getByTestId("tutor-check-opt-0") as HTMLButtonElement).disabled).toBe(true);
  });

  it("a wrong tap: shows the key, never clears the fix, offers to explain", async () => {
    const cb = mount();
    await screen.findByTestId("tutor-check");
    fireEvent.click(screen.getByTestId("tutor-check-opt-0"));
    expect(screen.getByTestId("tutor-check-result").textContent).toContain("The answer is B.");
    expect(cb.onResolved).toHaveBeenCalledWith(false);
    expect(track).not.toHaveBeenCalledWith("tutor_check_correct", expect.anything());
    expect(readClearedFixes("u1")).toEqual({});
    fireEvent.click(screen.getByTestId("tutor-check-explain"));
    expect(cb.onAsk).toHaveBeenCalledWith(expect.stringContaining("Why is the answer B?"));
  });

  it("never offers the question the thread is about", async () => {
    const cb = mount({ anchorId: "Q-NEW" });
    await waitFor(() => expect(cb.onResolved).toHaveBeenCalledWith(null));
    expect(screen.queryByTestId("tutor-check")).toBeNull();
  });

  it("with no honest question it renders nothing and reports null", async () => {
    bank.rows = [];
    const cb = mount();
    await waitFor(() => expect(cb.onResolved).toHaveBeenCalledWith(null));
    expect(screen.queryByTestId("tutor-check")).toBeNull();
    expect(track).not.toHaveBeenCalled();
  });
});

describe("TutorNextFix", () => {
  const item = (key: string, done = false) => ({
    key,
    line: `Light — concept gap, 1 mark (${key})`,
    path: `/tutor/10/Science/light?fix=${key}`,
    done,
  });
  it("offers the next undone lost mark, never the current one", () => {
    fix.state = { access: "open", uid: "u1", items: [item("m1"), item("m2"), item("m3", true)] };
    render(
      <MemoryRouter>
        <TutorNextFix fixKey="m1" />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("tutor-next-fix-go").getAttribute("href")).toBe("/tutor/10/Science/light?fix=m2");
  });
  it("renders nothing when there is no next one", () => {
    fix.state = { access: "open", uid: "u1", items: [item("m1")] };
    const { container } = render(
      <MemoryRouter>
        <TutorNextFix fixKey="m1" />
      </MemoryRouter>,
    );
    expect(container.innerHTML).toBe("");
  });
});
