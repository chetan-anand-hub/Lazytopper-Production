import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import TrueAiCostCard, { sumWindow, windowsFor, type TrueAiCostResponse } from "./TrueAiCostCard";

const DATA: TrueAiCostResponse = {
  ok: true,
  generatedAtMs: Date.UTC(2026, 10, 26, 6),
  todayKey: "2026-11-26",
  usdInr: 88,
  usdInrIsDefault: true,
  days: [
    { day: "2026-11-26", recorded: true, calls: 3, costInr: 5.5, unknownUsageCalls: 1, byWorkload: { tutor: { calls: 3, costInr: 5.5, unknownUsageCalls: 1 } } },
    { day: "2026-11-25", recorded: false },
    { day: "2026-11-24", recorded: true, calls: 2, costInr: 4, unknownUsageCalls: 0, byWorkload: { tutor: { calls: 2, costInr: 4, unknownUsageCalls: 0 } } },
    { day: "2026-10-31", recorded: true, calls: 9, costInr: 100, unknownUsageCalls: 0, byWorkload: {} },
  ],
};

describe("TrueAiCostCard", () => {
  it("windows: today / last 7 days / this month, unrecorded days are not counted as zero-recorded", () => {
    const w = windowsFor(DATA);
    expect(w.today.costInr).toBe(5.5);
    expect(w.week.costInr).toBe(9.5);
    expect(w.month.costInr).toBe(9.5);
    expect(w.month.recordedDays).toBe(2);
    expect(sumWindow(DATA.days, () => false).recordedDays).toBe(0);
  });

  it("windows are by calendar date across a month boundary; an unrecorded today is 'No record yet'", async () => {
    const data: TrueAiCostResponse = {
      ...DATA,
      todayKey: "2026-12-01",
      days: [
        { day: "2026-12-01", recorded: false },
        { day: "2026-11-30", recorded: true, calls: 1, costInr: 7, byWorkload: {} },
        { day: "2026-11-25", recorded: true, calls: 1, costInr: 3, byWorkload: {} },
        { day: "2026-11-24", recorded: true, calls: 1, costInr: 100, byWorkload: {} },
      ],
    };
    const w = windowsFor(data);
    expect(w.today.recordedDays).toBe(0);
    expect(w.week.costInr).toBe(10); // 25 Nov..1 Dec; 24 Nov is outside
    expect(w.month.recordedDays).toBe(0);
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(data), { status: 200 })));
    render(<TrueAiCostCard getToken={async () => "t"} />);
    fireEvent.click(screen.getByRole("button", { name: /load true ai cost/i }));
    await waitFor(() => expect(screen.getByTestId("tc-total")).toBeTruthy());
    expect(screen.queryByTestId("tc-empty")).toBeNull();
    const cells = screen.getByTestId("tc-total").querySelectorAll("td");
    expect(cells[1].textContent).toMatch(/No record yet/);
    expect(cells[1].textContent).not.toMatch(/₹0\.00/);
    vi.unstubAllGlobals();
  });

  it("loads on request only, shows the split, and never writes", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(DATA), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<TrueAiCostCard getToken={async () => "t"} />);
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /load true ai cost/i }));
    await waitFor(() => expect(screen.getByTestId("tc-total")).toBeTruthy());
    expect(screen.getByTestId("tc-work-tutor")).toBeTruthy();
    expect(screen.getByTestId("tc-unknown").textContent).toContain("1");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/admin/ai-cost-daily?days=31");
    expect(init.method).toBeUndefined();
    vi.unstubAllGlobals();
  });

  it("shows a refusal for a non-admin", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 403 })));
    render(<TrueAiCostCard getToken={async () => "t"} />);
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(screen.getByTestId("tc-refused").textContent).toMatch(/not authorised/i));
    vi.unstubAllGlobals();
  });
});
