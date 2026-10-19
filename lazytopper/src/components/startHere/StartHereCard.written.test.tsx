// START-HERE-WRITTEN - the third question type on the Start-here card: "Written: 1 board question".
//
//   * Science only: hidden for Maths even if the map carried a count;
//   * hidden for a Science chapter with 0 written CBQ items;
//   * Start picks ONE id and opens Quick Practice's exact-set path with count=1 and qt=written;
//   * CONTROL: the MCQ start is unchanged (five ids, count=5).
//
// The bank half is a stub (startHereBank.test.ts tests the real bank and the generated map).

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

const { cloudHas, localRows, onboarding, bank, auth, AVAIL } = vi.hoisted(() => ({
  AVAIL: {
    // A Maths count is present ON PURPOSE: the card must still hide the type for Maths.
    Maths: { "real-numbers": { mcq: 20, ar: 0, written: 4 } },
    Science: {
      electricity: { mcq: 25, ar: 10, written: 3 },
      heredity: { mcq: 20, ar: 0, written: 0 },
    },
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

let location = "";
function Probe() {
  const l = useLocation();
  // eslint-disable-next-line react-hooks/globals -- test probe records the router location
  location = `${l.pathname}${l.search}`;
  return null;
}

async function openPicker() {
  cloudHas.mockResolvedValue(false);
  render(
    <MemoryRouter initialEntries={["/practice-hub"]}>
      <Probe />
      <Routes>
        <Route path="*" element={<StartHereCard uid="u1" surface="practice_hub" returnTo="/practice-hub" />} />
      </Routes>
    </MemoryRouter>,
  );
  await waitFor(() => expect(screen.queryByTestId("start-here-card")).not.toBeNull());
  fireEvent.click(screen.getByTestId("start-here-start"));
  fireEvent.click(screen.getByTestId("start-here-change")); // START-HERE-ONE-TAP-1: picker behind "Change…"
}

beforeEach(() => {
  window.sessionStorage.clear();
  resetZeroGradedCacheForTests();
  cloudHas.mockReset();
  localRows.mockReset().mockReturnValue([]);
  onboarding.mockReset();
  bank.pickStartHereSet.mockReset();
  location = "";
});
afterEach(cleanup);

describe("START-HERE-WRITTEN · the written chip", () => {
  // SHW-2 (Oct 2026): the type is a segmented-control option - "Written" + "1 Q", and the
  // "(uses 1 of today's checks)" note moved to the helper line under the control.
  it("Science chapter with written items: the option shows with the owner's copy; Quick 5 stays the default", async () => {
    await openPicker();
    fireEvent.click(screen.getByTestId("start-here-subject-science"));
    const chip = screen.getByTestId("start-here-qtype-written");
    expect(chip.textContent).toBe("Written1 Q");
    expect(chip.tagName).toBe("BUTTON");
    expect(chip.getAttribute("aria-checked")).toBe("false");
    expect(screen.getByTestId("start-here-qtype-mcq").getAttribute("aria-checked")).toBe("true");
    fireEvent.click(chip);
    expect(screen.getByTestId("start-here-qtype-help").textContent).toContain("(uses 1 of today's checks)");
  });

  it("hidden for Maths, even when the map carries a written count", async () => {
    await openPicker();
    fireEvent.click(screen.getByTestId("start-here-subject-maths"));
    expect(screen.getByTestId("start-here-qtype-mcq")).toBeInTheDocument();
    expect(screen.queryByTestId("start-here-qtype-written")).toBeNull();
  });

  it("hidden for a Science chapter with 0 written items", async () => {
    await openPicker();
    fireEvent.click(screen.getByTestId("start-here-subject-science"));
    fireEvent.click(await screen.findByTestId("start-here-chapter"));
    const picker = await screen.findByTestId("start-here-chapter-picker");
    const select = within(picker).getByLabelText("Chapter") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "heredity" } });
    fireEvent.click(screen.getByTestId("start-here-chapter-picker-open"));
    expect(screen.getByTestId("start-here-chapter").getAttribute("data-chapter")).toBe("heredity");
    expect(screen.getByTestId("start-here-qtype-mcq")).toBeInTheDocument();
    expect(screen.queryByTestId("start-here-qtype-written")).toBeNull();
  });

  it("Start on the written type: ONE id, Quick Practice's exact-set path with count=1 and qt=written", async () => {
    bank.pickStartHereSet.mockResolvedValue(["LTG-S-ELEC-9"]);
    await openPicker();
    fireEvent.click(screen.getByTestId("start-here-subject-science"));
    fireEvent.click(screen.getByTestId("start-here-qtype-written"));
    expect(screen.getByTestId("start-here-go").textContent).toBe("Start 1 written question"); // SHW-2 label
    fireEvent.click(screen.getByTestId("start-here-go"));
    await waitFor(() => expect(location).toMatch(/^\/practice\/10\/Science\?/));
    const q = new URLSearchParams(location.split("?")[1]);
    expect(q.get("topic")).toBe("electricity");
    expect(q.get("focusBankIds")).toBe("LTG-S-ELEC-9");
    expect(q.get("strictFocus")).toBe("true");
    expect(q.get("count")).toBe("1");
    expect(q.get("src")).toBe("start_here");
    expect(q.get("qt")).toBe("written");
    expect(bank.pickStartHereSet.mock.calls[0][0]).toMatchObject({ subject: "Science", chapter: "electricity", qtype: "written" });
    expect(onboarding.mock.calls.filter((c) => c[0] === "start_here_start")).toEqual([
      ["start_here_start", { subject: "science", chapter: "electricity", qtype: "written", mode: "picker" }],
    ]);
  });

  it("no written question could be lined up: it says so and stays (no event, no navigation)", async () => {
    bank.pickStartHereSet.mockResolvedValue([]);
    await openPicker();
    fireEvent.click(screen.getByTestId("start-here-subject-science"));
    fireEvent.click(screen.getByTestId("start-here-qtype-written"));
    fireEvent.click(screen.getByTestId("start-here-go"));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(location).toBe("/practice-hub");
    expect(onboarding.mock.calls.filter((c) => c[0] === "start_here_start")).toHaveLength(0);
  });

  it("CONTROL: the MCQ start is unchanged (five ids, count=5, qt=mcq)", async () => {
    bank.pickStartHereSet.mockResolvedValue(["a", "b", "c", "d", "e"]);
    await openPicker();
    fireEvent.click(screen.getByTestId("start-here-subject-science"));
    expect(screen.getByTestId("start-here-go").textContent).toBe("Start 5 questions");
    fireEvent.click(screen.getByTestId("start-here-go"));
    await waitFor(() => expect(location).toMatch(/^\/practice\/10\/Science\?/));
    const q = new URLSearchParams(location.split("?")[1]);
    expect(q.get("count")).toBe("5");
    expect(q.get("qt")).toBe("mcq");
    expect(q.get("focusBankIds")).toBe("a,b,c,d,e");
  });
});
