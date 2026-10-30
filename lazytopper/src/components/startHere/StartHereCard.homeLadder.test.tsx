// HOME-LADDER-1 - Home's Byte "Check one answer" starts the one-minute ladder (ONE-MINUTE-1's startLadder on
// /check-improve) for a signed-in, server-confirmed zero-graded student; everyone else keeps today's behaviour.
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup, fireEvent, screen, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { setMatchMediaMatches } from "../../test/setup";

const { cloudHas, localRows, onboarding, assigned, bank, auth, AVAIL } = vi.hoisted(() => ({
  AVAIL: { Science: { electricity: { mcq: 25, ar: 10, written: 3 } } },
  auth: { currentUser: null as null | { uid: string; metadata: { creationTime?: string } } },
  cloudHas: vi.fn(),
  localRows: vi.fn(),
  onboarding: vi.fn(),
  assigned: vi.fn(),
  bank: { startHereAvailability: vi.fn(), pickStartHereSet: vi.fn() },
}));
vi.mock("../../services/sessionRecords", () => ({ cloudHasAnySessionRecord: cloudHas, loadLocalSessionRecords: localRows }));
vi.mock("../../analytics/analytics", () => ({ trackOnboardingEvent: onboarding, trackGuideVariantAssigned: assigned }));
vi.mock("./startHereBank", () => bank);
vi.mock("./startHereAvailability.generated", () => ({ START_HERE_AVAILABILITY: AVAIL }));
vi.mock("../../services/firebaseClient", () => ({ authClient: auth }));

import StartHereCard, { StartHereFocusView, StartHereView, byteTryOneLauncher, useStartHere } from "./StartHereCard";
import { resetZeroGradedCacheForTests } from "./zeroGraded";
import { CHECK_ONE_HANDOVER_KEY, CHECK_ONE_LADDER_KEY } from "./startHereModel";
import { __resetGuideVariantSentForTests, __setGuideAbForTests } from "../guide/guideVariant";
import { __resetMascotBudgetForTests } from "../guide/mascotBudget";

let location = "";
function Probe() {
  const l = useLocation();
  location = `${l.pathname}${l.search}`;
  return null;
}
function HomeHarness({ uid }: { uid: string }) {
  const s = useStartHere(uid);
  return (
    <>
      <StartHereView surface="home" returnTo="/" state={s} />
      <StartHereFocusView uid={uid} surface="home" returnTo="/" state={s} />
    </>
  );
}
const flush = () => act(async () => new Promise((r) => setTimeout(r, 0)));

beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
  resetZeroGradedCacheForTests();
  __resetGuideVariantSentForTests();
  __resetMascotBudgetForTests();
  cloudHas.mockReset().mockResolvedValue(false);
  localRows.mockReset().mockReturnValue([]);
  onboarding.mockReset();
  assigned.mockReset();
  bank.pickStartHereSet.mockReset().mockResolvedValue(["a", "b", "c", "d", "e"]);
  auth.currentUser = null;
  location = "";
  setMatchMediaMatches(false);
  __setGuideAbForTests(true, "guide");
});
afterEach(() => {
  cleanup();
  __setGuideAbForTests(null);
});

describe("HOME-LADDER-1 · the launcher", () => {
  it("ladder=true navigates to /check-improve and leaves both one-shot notes (even for a Maths hint)", () => {
    window.sessionStorage.setItem("lazytopper.startHereSubject", "Maths");
    const nav = vi.fn();
    byteTryOneLauncher(nav, "/", null, true)!();
    expect(nav).toHaveBeenCalledWith("/check-improve");
    expect(window.sessionStorage.getItem(CHECK_ONE_HANDOVER_KEY)).toBe("1");
    expect(window.sessionStorage.getItem(CHECK_ONE_LADDER_KEY)).toBe("1");
  });
  it("ladder=false is today's launcher (Maths hint -> none)", () => {
    window.sessionStorage.setItem("lazytopper.startHereSubject", "Maths");
    expect(byteTryOneLauncher(vi.fn(), "/", null, false)).toBeNull();
  });
});

describe("HOME-LADDER-1 · Home -> /check-improve", () => {
  async function tapCheckOne() {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Probe />
        <Routes>
          <Route path="*" element={<HomeHarness uid="u1" />} />
        </Routes>
      </MemoryRouter>,
    );
    const opts = await screen.findAllByTestId("guide-opt-check_one");
    await flush();
    fireEvent.click(opts[opts.length - 1]);
  }

  it("zero-graded signed-in: Check one answer goes to /check-improve with the ladder note (not a written set)", async () => {
    await tapCheckOne();
    await waitFor(() => expect(location).toBe("/check-improve"), { timeout: 4000 });
    expect(window.sessionStorage.getItem(CHECK_ONE_LADDER_KEY)).toBe("1");
    expect(bank.pickStartHereSet).not.toHaveBeenCalled();
  });

  it("graded >= 1: no ladder note, old behaviour", async () => {
    cloudHas.mockResolvedValue(true);
    await tapCheckOne().catch(() => undefined);
    await flush();
    expect(window.sessionStorage.getItem(CHECK_ONE_LADDER_KEY)).toBeNull();
  });
});

describe("HOME-LADDER-1 · arrival on /check-improve", () => {
  const arrive = (checkOneAnswer: () => void) =>
    render(
      <MemoryRouter initialEntries={["/check-improve"]}>
        <Routes>
          <Route path="*" element={<StartHereCard uid="u1" surface="check_improve" returnTo="/check-improve" focus checkOneAnswer={checkOneAnswer} />} />
        </Routes>
      </MemoryRouter>,
    );
  it("with the note: the page's checkOneAnswer (startLadder) runs ONCE and the note is consumed", async () => {
    window.sessionStorage.setItem(CHECK_ONE_LADDER_KEY, "1");
    const start = vi.fn();
    const r = arrive(start);
    await flush();
    expect(start).toHaveBeenCalledTimes(1);
    expect(window.sessionStorage.getItem(CHECK_ONE_LADDER_KEY)).toBeNull();
    r.rerender(
      <MemoryRouter initialEntries={["/check-improve"]}>
        <Routes>
          <Route path="*" element={<StartHereCard uid="u1" surface="check_improve" returnTo="/check-improve" focus checkOneAnswer={start} />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(start).toHaveBeenCalledTimes(1);
  });
  it("without the note: nothing is started", async () => {
    const start = vi.fn();
    arrive(start);
    await flush();
    expect(start).not.toHaveBeenCalled();
  });
});
