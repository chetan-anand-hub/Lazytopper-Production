// TUTOR-STICKY-1 — the daily-fix card: nothing without real data, a working button for Premium/trial,
// a lock + "Unlock the tutor" for Basic, ticked items after a fix.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { DailyFixItem } from "../../lib/tutorSticky/dailyFix";

const hook = vi.hoisted(() => ({ state: null as null | { items: unknown[]; access: "open" | "locked"; uid: string } }));
vi.mock("./useDailyFix", () => ({ useDailyFix: () => hook.state }));
vi.mock("../../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../analytics/analytics")>();
  return { ...actual, trackTutorSticky: vi.fn() };
});

import DailyFixCard from "./DailyFixCard";
import * as analytics from "../../analytics/analytics";

const track = analytics.trackTutorSticky as unknown as ReturnType<typeof vi.fn>;

const item = (key: string, line: string, done = false): DailyFixItem => ({
  key,
  chapterKey: "electricity",
  chapterName: "Electricity",
  subject: "Science",
  concept: null,
  questionId: null,
  type: "silly",
  marks: 0.5,
  line,
  path: `/tutor/10/Science/electricity?fix=${key}`,
  done,
});

function mount(surface: "home" | "tutor" = "home") {
  return render(
    <MemoryRouter>
      <DailyFixCard surface={surface} />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  track.mockClear();
  hook.state = null;
});

describe("DailyFixCard", () => {
  it("renders nothing without a real mistake", () => {
    hook.state = null;
    const { container } = mount();
    expect(container.innerHTML).toBe("");
    expect(track).not.toHaveBeenCalled();
  });

  it("Premium/trial: one line per lost mark and a button to the first undone one", () => {
    hook.state = {
      uid: "u1",
      access: "open",
      items: [item("m1", "Electricity — silly slip, 0.5 marks", true), item("m2", "Light — concept gap, 1 mark")],
    };
    mount();
    expect(screen.getByText("Fix 1 lost mark today")).toBeTruthy();
    expect(screen.getByText(/Electricity — silly slip, 0.5 mark/)).toBeTruthy();
    expect(screen.getByText(/· fixed/)).toBeTruthy();
    const go = screen.getByTestId("daily-fix-start");
    expect(go.getAttribute("href")).toBe("/tutor/10/Science/electricity?fix=m2");
    expect(go.textContent).toBe("Fix these with the tutor");
    expect(track).toHaveBeenCalledWith("tutor_daily_fix_shown", { surface: "home" }, expect.any(String));
    fireEvent.click(go);
    expect(track).toHaveBeenCalledWith("tutor_daily_fix_tap", { surface: "home" });
  });

  it("Basic: the real lines with a lock and 'Unlock the tutor' to /pricing, no tutor link", () => {
    hook.state = { uid: "u1", access: "locked", items: [item("m1", "Electricity — silly slip, 0.5 marks")] };
    mount();
    expect(screen.queryByTestId("daily-fix-start")).toBeNull();
    const unlock = screen.getByTestId("daily-fix-unlock");
    expect(unlock.textContent).toBe("Unlock the tutor");
    expect(unlock.getAttribute("href")).toBe("/pricing?source=daily-fix");
  });

  it("all fixed: says so and offers no button", () => {
    hook.state = { uid: "u1", access: "open", items: [item("m1", "Electricity — silly slip, 0.5 marks", true)] };
    mount("tutor");
    expect(screen.getByText("All fixed for today")).toBeTruthy();
    expect(screen.queryByTestId("daily-fix-start")).toBeNull();
    expect(screen.getByTestId("daily-fix-done")).toBeTruthy();
  });
});
