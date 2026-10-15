import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

const { cloudHas, localRows, onboarding, bank } = vi.hoisted(() => ({
  cloudHas: vi.fn(),
  localRows: vi.fn(),
  onboarding: vi.fn(),
  bank: {
    startHereAvailability: vi.fn(),
    pickStartHereSet: vi.fn(),
  },
}));
vi.mock("../../services/sessionRecords", () => ({ cloudHasAnySessionRecord: cloudHas, loadLocalSessionRecords: localRows }));
vi.mock("../../analytics/analytics", () => ({ trackOnboardingEvent: onboarding }));
vi.mock("./startHereBank", () => bank);

import StartHereCard from "./StartHereCard";
import { START_HERE_COPY, START_HERE_DISMISSED_KEY, START_HERE_SUBJECT_HINT_KEY } from "./startHereModel";

/**
 * START-HERE-1 §2.1 / §2.2 — who sees the card, "Not now", the picker, the events.
 * The bank half is replaced by a stub (its own file tests the real bank).
 */
let location = "";
function Probe() {
  const l = useLocation();
  location = `${l.pathname}${l.search}`;
  return null;
}

const AVAIL = {
  Maths: { "real-numbers": { mcq: 20, ar: 0 }, polynomials: { mcq: 0, ar: 0 } },
  Science: { electricity: { mcq: 25, ar: 10 } },
};

const tree = (uid: string | null = "u1") => (
    <MemoryRouter initialEntries={["/practice-hub"]}>
      <Probe />
      <Routes>
        <Route path="*" element={<StartHereCard uid={uid} surface="practice_hub" returnTo="/practice-hub" />} />
      </Routes>
    </MemoryRouter>
);
const mount = (uid: string | null = "u1") => render(tree(uid));
const calls = (name: string) => onboarding.mock.calls.filter((c) => c[0] === name);
const card = () => screen.queryByTestId("start-here-card");

beforeEach(() => {
  window.sessionStorage.clear();
  cloudHas.mockReset();
  localRows.mockReset().mockReturnValue([]);
  onboarding.mockReset();
  bank.startHereAvailability.mockReset();
  bank.pickStartHereSet.mockReset();
  bank.startHereAvailability.mockImplementation(async (subject: "Maths" | "Science") => AVAIL[subject]);
  bank.pickStartHereSet.mockResolvedValue(["a", "b", "c", "d", "e"]);
  location = "";
});
afterEach(cleanup);

describe("START-HERE-1 · who sees the card (§2.1)", () => {
  it("★★ a signed-in account with ZERO graded results sees it, with the owner's copy", async () => {
    cloudHas.mockResolvedValue(false);
    mount();
    await waitFor(() => expect(card()).not.toBeNull());
    expect(card()!.textContent).toContain(START_HERE_COPY.kicker);
    expect(card()!.textContent).toContain(START_HERE_COPY.body);
    expect(screen.getByTestId("start-here-start").textContent).toBe("Start");
    expect(screen.getByTestId("start-here-not-now").textContent).toBe("Not now");
  });

  it("★★ it hides once there is a graded result: local rows answer at once with NO cloud call", async () => {
    localRows.mockReturnValue([{ id: "r1" }]);
    mount();
    await new Promise((r) => setTimeout(r, 0));
    expect(card()).toBeNull();
    expect(cloudHas).not.toHaveBeenCalled();
    expect(calls("start_here_shown")).toHaveLength(0);
  });

  it("★★ no local rows but the cloud holds one (a returning student on a fresh device): no card", async () => {
    cloudHas.mockResolvedValue(true);
    mount();
    await waitFor(() => expect(cloudHas).toHaveBeenCalledWith("u1"));
    await new Promise((r) => setTimeout(r, 0));
    expect(card()).toBeNull();
  });

  it("★★ BLOCKER GUARD: a cloud read that cannot tell (null) on an empty device is silence, never the card", async () => {
    cloudHas.mockResolvedValue(null);
    mount();
    await waitFor(() => expect(cloudHas).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
    expect(card()).toBeNull();
    expect(calls("start_here_shown")).toHaveLength(0);
  });

  it("★ signed-out: nothing renders and nothing is read (signed-out pages are unchanged)", async () => {
    const { container } = mount(null);
    await new Promise((r) => setTimeout(r, 0));
    expect(card()).toBeNull();
    expect(container.innerHTML).toBe("");
    expect(cloudHas).not.toHaveBeenCalled();
    expect(localRows).not.toHaveBeenCalled();
  });

  it("★ hydration is a third state: nothing renders while the read is in flight, and a failed read is silence", async () => {
    let resolve: (v: boolean | null) => void = () => undefined;
    cloudHas.mockReturnValue(new Promise((r) => (resolve = r)));
    mount();
    await new Promise((r) => setTimeout(r, 0));
    expect(card()).toBeNull(); // in flight: not the card
    resolve(false);
    await waitFor(() => expect(card()).not.toBeNull());
    cleanup();
    cloudHas.mockRejectedValue(new Error("offline"));
    mount();
    await new Promise((r) => setTimeout(r, 0));
    expect(card()).toBeNull(); // an unreadable history is not evidence of a first session
  });
});

describe("START-HERE-1 · \"Not now\" is session-scoped (§2.1)", () => {
  it("★★ hides it for the rest of the session, fires start_here_dismissed once, and it returns on the next visit", async () => {
    cloudHas.mockResolvedValue(false);
    mount();
    await waitFor(() => expect(card()).not.toBeNull());
    fireEvent.click(screen.getByTestId("start-here-not-now"));
    expect(card()).toBeNull();
    expect(calls("start_here_dismissed")).toEqual([["start_here_dismissed", { surface: "practice_hub" }]]);
    expect(window.localStorage.getItem(START_HERE_DISMISSED_KEY)).toBeNull();
    // Same session, a later mount (another page): still hidden.
    cleanup();
    mount();
    await new Promise((r) => setTimeout(r, 0));
    expect(card()).toBeNull();
    // The next visit (a new tab/session = empty sessionStorage): it returns, once.
    cleanup();
    window.sessionStorage.clear();
    mount();
    await waitFor(() => expect(card()).not.toBeNull());
  });

  it("start_here_shown fires once per mount, however many times it re-renders", async () => {
    cloudHas.mockResolvedValue(false);
    const { rerender } = mount();
    await waitFor(() => expect(card()).not.toBeNull());
    rerender(tree());
    rerender(tree());
    fireEvent.click(screen.getByTestId("start-here-start"));
    expect(calls("start_here_shown")).toEqual([["start_here_shown", { surface: "practice_hub" }]]);
  });
});

describe("START-HERE-1 · the picker (§2.2)", () => {
  async function open() {
    cloudHas.mockResolvedValue(false);
    mount();
    await waitFor(() => expect(card()).not.toBeNull());
    fireEvent.click(screen.getByTestId("start-here-start"));
  }

  it("★★ with a Maths ad hint, Maths is pre-selected; Quick 5 is the default type", async () => {
    window.sessionStorage.setItem(START_HERE_SUBJECT_HINT_KEY, "Maths");
    await open();
    expect(screen.getByTestId("start-here-subject-maths").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("start-here-subject-science").getAttribute("aria-pressed")).toBe("false");
    const select = (await screen.findByTestId("start-here-chapter")) as HTMLSelectElement;
    expect(select.value).toBe("real-numbers");
    expect((screen.getByTestId("start-here-qtype-mcq") as HTMLInputElement).checked).toBe(true);
  });

  it("★★ an unknown landing: nothing is pre-selected and the card ASKS", async () => {
    await open();
    expect(screen.getByTestId("start-here-subject-maths").getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByTestId("start-here-subject-science").getAttribute("aria-pressed")).toBe("false");
    expect(screen.queryByTestId("start-here-chapter")).toBeNull();
    expect((screen.getByTestId("start-here-go") as HTMLButtonElement).disabled).toBe(true);
  });

  it("★ a chapter without CBQ MCQs reads 'coming soon' and cannot be picked", async () => {
    window.sessionStorage.setItem(START_HERE_SUBJECT_HINT_KEY, "Maths");
    await open();
    const select = (await screen.findByTestId("start-here-chapter")) as HTMLSelectElement;
    const soon = Array.from(select.options).find((o) => o.value === "polynomials")!;
    expect(soon.textContent).toContain("coming soon");
    expect(soon.disabled).toBe(true);
  });

  it("★ only the question types the chapter really has are offered (A-R only when it has them)", async () => {
    window.sessionStorage.setItem(START_HERE_SUBJECT_HINT_KEY, "Maths");
    await open();
    await screen.findByTestId("start-here-chapter");
    expect(screen.queryByTestId("start-here-qtype-ar")).toBeNull(); // real-numbers: no A-R in this stub
    fireEvent.click(screen.getByTestId("start-here-subject-science"));
    await screen.findByTestId("start-here-qtype-ar");
    expect(screen.getByTestId("start-here-qtype-mcq")).toBeInTheDocument();
  });

  it("★★ Start opens Quick Practice on the picked five, fires start_here_start once, with slug params only", async () => {
    await open();
    fireEvent.click(screen.getByTestId("start-here-subject-science"));
    await screen.findByTestId("start-here-chapter");
    fireEvent.click(screen.getByTestId("start-here-qtype-ar"));
    fireEvent.click(screen.getByTestId("start-here-go"));
    await waitFor(() => expect(location).toMatch(/^\/practice\/10\/Science\?/));
    const q = new URLSearchParams(location.split("?")[1]);
    expect(q.get("topic")).toBe("electricity");
    expect(q.get("focusBankIds")).toBe("a,b,c,d,e");
    expect(q.get("strictFocus")).toBe("true");
    expect(q.get("count")).toBe("5");
    expect(q.get("src")).toBe("start_here");
    expect(q.get("qt")).toBe("ar");
    expect(bank.pickStartHereSet.mock.calls[0][0]).toMatchObject({ subject: "Science", chapter: "electricity", qtype: "ar" });
    expect(calls("start_here_start")).toEqual([["start_here_start", { subject: "science", chapter: "electricity", qtype: "ar" }]]);
  });

  it("★ if five questions cannot be lined up it says so and stays; no start event, no navigation", async () => {
    bank.pickStartHereSet.mockResolvedValue(["a", "b"]);
    await open();
    fireEvent.click(screen.getByTestId("start-here-subject-science"));
    await screen.findByTestId("start-here-chapter");
    fireEvent.click(screen.getByTestId("start-here-go"));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(location).toBe("/practice-hub");
    expect(calls("start_here_start")).toHaveLength(0);
  });
});
