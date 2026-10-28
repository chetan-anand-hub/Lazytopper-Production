// ACTIVATION-1 - "Try one board question now (2 min)": the Start-here ready state's lead button.
// ONE typed Science board question through the existing written path; one click event, coarse slugs only.

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

const { cloudHas, localRows, onboarding, bank, auth, AVAIL } = vi.hoisted(() => ({
  AVAIL: {
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

async function openReady(hint?: string) {
  cloudHas.mockResolvedValue(false);
  if (hint) window.sessionStorage.setItem("lazytopper.startHereSubject", hint);
  render(
    <MemoryRouter initialEntries={["/"]}>
      <Probe />
      <Routes>
        <Route path="*" element={<StartHereCard uid="u1" surface="home" returnTo="/" />} />
      </Routes>
    </MemoryRouter>,
  );
  await waitFor(() => expect(screen.queryByTestId("start-here-card")).not.toBeNull());
  fireEvent.click(screen.getByTestId("start-here-start"));
}

beforeEach(() => {
  resetZeroGradedCacheForTests();
  window.sessionStorage.clear();
  localRows.mockReturnValue([]);
  bank.pickStartHereSet.mockReset();
  onboarding.mockReset();
  location = "";
});
afterEach(cleanup);

describe("ACTIVATION-1 · Try one board question now", () => {
  it("leads the ready state with the typed-question button, ahead of the MCQ buttons", async () => {
    await openReady();
    const ready = screen.getByTestId("start-here-ready");
    expect(ready.firstElementChild).toBe(screen.getByTestId("start-here-try-one"));
    expect(screen.getByTestId("start-here-try-one").textContent).toBe("Try one board question now (2 min)");
    expect(screen.getByTestId("start-here-try-one").getAttribute("data-chapter")).toBe("electricity");
  });

  it("tap -> ONE written Science id, the exact-set practice link, and one activation_card_click (slugs only)", async () => {
    bank.pickStartHereSet.mockResolvedValue(["sci-q-1"]);
    await openReady();
    fireEvent.click(screen.getByTestId("start-here-try-one"));
    await waitFor(() => expect(location).toContain("/practice"));
    expect(bank.pickStartHereSet).toHaveBeenCalledWith(expect.objectContaining({ subject: "Science", chapter: "electricity", qtype: "written" }));
    expect(location).toContain("qt=written");
    expect(location).toContain("count=1");
    const clicks = onboarding.mock.calls.filter((c) => c[0] === "activation_card_click");
    expect(clicks).toHaveLength(1);
    expect(clicks[0][1]).toEqual({ subject: "science", chapter: "electricity", qtype: "written" });
  });

  it("not offered to a Maths-hinted student; the MCQ button is unchanged", async () => {
    await openReady("Maths");
    expect(screen.queryByTestId("start-here-try-one")).toBeNull();
    expect(screen.getByTestId("start-here-one-tap-maths").className).toBe("lt-shc-go");
  });

  it("when the question cannot be lined up: an honest note, no click event, buttons usable again", async () => {
    bank.pickStartHereSet.mockResolvedValue([]);
    await openReady();
    fireEvent.click(screen.getByTestId("start-here-try-one"));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/board question/));
    expect(onboarding.mock.calls.filter((c) => c[0] === "activation_card_click")).toHaveLength(0);
    expect((screen.getByTestId("start-here-try-one") as HTMLButtonElement).disabled).toBe(false);
  });
});
