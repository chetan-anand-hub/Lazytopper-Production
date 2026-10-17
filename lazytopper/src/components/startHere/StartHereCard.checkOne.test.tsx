import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const { cloudHas, localRows, onboarding, bank, auth, AVAIL } = vi.hoisted(() => ({
  AVAIL: {
    Maths: { "real-numbers": { mcq: 20, ar: 0 } },
    Science: { electricity: { mcq: 25, ar: 10 } },
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

import StartHereCard, { START_HERE_CHECK_ONE_COPY } from "./StartHereCard";
import { resetZeroGradedCacheForTests } from "./zeroGraded";
import { START_HERE_COPY, START_HERE_FOCUS_NOT_NOW_PREFIX } from "./startHereModel";

/**
 * ACTIVATION-2 A — on /check-improve the focused first-run surface leads with "Check one answer"
 * (closes the takeover, hands control to the page); the 5-question practice is the secondary
 * link; closing the takeover also hides the inline card on this page. Every other page (no
 * `checkOneAnswer` prop) keeps the practice picker exactly as before.
 */
const mount = (checkOneAnswer?: () => void, surface: "check_improve" | "practice_hub" = "check_improve") =>
  render(
    <MemoryRouter initialEntries={["/check-improve"]}>
      <Routes>
        <Route
          path="*"
          element={<StartHereCard uid="u1" surface={surface} returnTo="/check-improve" focus checkOneAnswer={checkOneAnswer} />}
        />
      </Routes>
    </MemoryRouter>,
  );
const calls = (name: string) => onboarding.mock.calls.filter((c) => c[0] === name);

beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
  resetZeroGradedCacheForTests();
  cloudHas.mockReset().mockResolvedValue(false);
  localRows.mockReset().mockReturnValue([]);
  onboarding.mockReset();
  auth.currentUser = null;
});
afterEach(cleanup);

describe("ACTIVATION-2 A — Start here on Check & Improve", () => {
  it("leads with 'Check one answer' and the honest free-check copy (no picker up front)", async () => {
    mount(vi.fn());
    const dlg = await screen.findByTestId("start-here-focus");
    expect(screen.getByTestId("start-here-focus-check-one").textContent).toBe("Check one answer");
    expect(dlg.textContent).toContain(START_HERE_CHECK_ONE_COPY.body);
    expect(screen.queryByTestId("start-here-focus-subject-maths")).toBeNull();
    expect(screen.getByTestId("start-here-focus-practise").textContent).toBe("or practise 5 questions");
  });

  it("'Check one answer' closes the takeover, hides the inline card here, and hands off to the page", async () => {
    const onCheck = vi.fn();
    mount(onCheck);
    fireEvent.click(await screen.findByTestId("start-here-focus-check-one"));
    expect(onCheck).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("start-here-focus")).toBeNull();
    expect(screen.queryByTestId("start-here-card")).toBeNull();
  });

  it("the ✕ also hides the inline card on this page (it used to stay up under the closed takeover)", async () => {
    mount(vi.fn());
    fireEvent.click(await screen.findByTestId("start-here-focus-close"));
    await waitFor(() => expect(screen.queryByTestId("start-here-focus")).toBeNull());
    expect(screen.queryByTestId("start-here-card")).toBeNull();
    // the E3 "offered at most twice" memory still counts the close
    expect(window.localStorage.getItem(START_HERE_FOCUS_NOT_NOW_PREFIX + "u1")).toBe("1");
  });

  it("'or practise 5 questions' opens the existing practice picker in place", async () => {
    mount(vi.fn());
    fireEvent.click(await screen.findByTestId("start-here-focus-practise"));
    expect(await screen.findByTestId("start-here-focus-subject-maths")).toBeTruthy();
    expect(within(screen.getByTestId("start-here-focus")).getByText(START_HERE_COPY.body)).toBeTruthy();
  });

  it("start_here_shown keeps its name and surface, plus variant=check_one", async () => {
    mount(vi.fn());
    await screen.findByTestId("start-here-focus");
    expect(calls("start_here_shown")).toContainEqual(["start_here_shown", { surface: "check_improve_focus", variant: "check_one" }]);
  });

  it("CONTROL: without checkOneAnswer (every other page) the takeover is the practice picker, unchanged", async () => {
    mount(undefined, "practice_hub");
    await screen.findByTestId("start-here-focus");
    expect(screen.queryByTestId("start-here-focus-check-one")).toBeNull();
    expect(screen.getByTestId("start-here-focus-subject-maths")).toBeTruthy();
    expect(calls("start_here_shown")).toContainEqual(["start_here_shown", { surface: "practice_hub_focus" }]);
    fireEvent.click(screen.getByTestId("start-here-focus-close"));
    await waitFor(() => expect(screen.queryByTestId("start-here-focus")).toBeNull());
    expect(screen.getByTestId("start-here-card")).toBeTruthy();
  });
});
