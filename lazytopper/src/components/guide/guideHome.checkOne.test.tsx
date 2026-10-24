import { useRef } from "react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup, fireEvent, screen, waitFor, act, within } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { setMatchMediaMatches } from "../../test/setup";

const { cloudHas, localRows, onboarding, assigned, bank, auth } = vi.hoisted(() => ({
  auth: { currentUser: null as null | { uid: string; metadata: { creationTime?: string } } },
  cloudHas: vi.fn(),
  localRows: vi.fn(),
  onboarding: vi.fn(),
  assigned: vi.fn(),
  bank: { startHereAvailability: vi.fn(), pickStartHereSet: vi.fn() },
}));
vi.mock("../../services/sessionRecords", () => ({ cloudHasAnySessionRecord: cloudHas, loadLocalSessionRecords: localRows }));
vi.mock("../../analytics/analytics", () => ({ trackOnboardingEvent: onboarding, trackGuideVariantAssigned: assigned }));
vi.mock("../startHere/startHereBank", () => bank);
vi.mock("../../services/firebaseClient", () => ({ authClient: auth }));

import StartHereCard, { StartHereFocusView, StartHereView, useStartHere } from "../startHere/StartHereCard";
import { START_HERE_DISMISSED_KEY, START_HERE_FOCUS_CLOSED_KEY, CHECK_ONE_HANDOVER_KEY } from "../startHere/startHereModel";
import { resetZeroGradedCacheForTests } from "../startHere/zeroGraded";
import { __resetGuideVariantSentForTests, __setGuideAbForTests } from "./guideVariant";

/**
 * LOGIN-HOME-1 rule 3 — on HOME (the page a new account now lands on) Byte's first option is
 * "Check one answer", and because Home has no question box of its own (no `onCheckOne`) the tap
 * must OPEN /check-improve.
 */
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

/** Check & Improve as the page mounts Byte: the full-screen focus guide + inline guide + chip, with a question box. */
function CheckImproveStub({ uid }: { uid: string }) {
  const boxRef = useRef<HTMLTextAreaElement | null>(null);
  return (
    <>
      <StartHereCard uid={uid} surface="check_improve" returnTo="/check-improve" focus checkOneAnswer={() => boxRef.current?.focus()} />
      <textarea ref={boxRef} aria-label="Type the question" />
      <Link to="/">back to home</Link>
    </>
  );
}
function HomeToCheckImprove({ uid }: { uid: string }) {
  return (
    <MemoryRouter initialEntries={["/"]}>
      <Probe />
      <Routes>
        <Route path="/check-improve" element={<CheckImproveStub uid={uid} />} />
        <Route
          path="*"
          element={
            <>
              <Link to="/check-improve">plain link to Check and Improve</Link>
              <HomeHarness uid={uid} />
            </>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
  resetZeroGradedCacheForTests();
  __resetGuideVariantSentForTests();
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

describe("LOGIN-HOME-1 · Byte on Home", () => {
  it("★★ 'Check one answer' leads (rank 1), 5 quick questions is second, and the tap opens /check-improve", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Probe />
        <HomeHarness uid="u1" />
      </MemoryRouter>,
    );
    const first = (await screen.findAllByTestId("guide-opt-check_one"))[0];
    expect(first.getAttribute("data-rank")).toBe("1");
    expect(screen.getAllByTestId("guide-opt-quick")[0].getAttribute("data-rank")).toBe("2");
    fireEvent.click(first);
    await waitFor(() => expect(location).toBe("/check-improve"));
  });

  const shownCount = () => onboarding.mock.calls.filter((c) => c[0] === "guide_shown").length;
  const expectNoByteAsking = async () => {
    expect(await screen.findByLabelText("Type the question")).toBeTruthy();
    await act(async () => new Promise((r) => setTimeout(r, 60)));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByTestId("start-here-focus")).toBeNull();
    expect(screen.queryByTestId("byte-guide-inline")).toBeNull();
    expect(screen.queryByTestId("guide-chip")).toBeNull();
    expect(screen.queryAllByTestId("guide-opt-check_one")).toHaveLength(0);
  };

  it("★★ FULL-SCREEN guide on Home (motion not reduced): the tap still navigates after the cheer, and Check & Improve opens with NO second Byte and no extra shown event", async () => {
    render(<HomeToCheckImprove uid="u1" />);
    const focus = await screen.findByTestId("start-here-focus");
    const tap = within(focus).getByTestId("guide-opt-check_one");
    await waitFor(() => expect(shownCount()).toBeGreaterThan(0));
    const shownOnHome = shownCount();
    fireEvent.click(tap);
    expect(window.sessionStorage.getItem(CHECK_ONE_HANDOVER_KEY)).not.toBeNull();
    expect(location).toBe("/"); // the cheer is still running: Byte was NOT closed early
    await waitFor(() => expect(location).toBe("/check-improve"), { timeout: 2000 });
    await expectNoByteAsking();
    expect(shownCount()).toBe(shownOnHome);
    expect(window.sessionStorage.getItem(CHECK_ONE_HANDOVER_KEY)).toBeNull(); // consumed on arrival
    // Nothing was dismissed on Home's behalf.
    expect(window.sessionStorage.getItem(START_HERE_DISMISSED_KEY)).toBeNull();
    expect(window.sessionStorage.getItem(START_HERE_FOCUS_CLOSED_KEY)).toBeNull();
  });

  it("★★ the CHIP's reopened sheet (motion not reduced): the tap navigates, and Check & Improve opens with no second Byte", async () => {
    window.sessionStorage.setItem(START_HERE_FOCUS_CLOSED_KEY, "1");
    window.sessionStorage.setItem(START_HERE_DISMISSED_KEY, "1");
    render(<HomeToCheckImprove uid="u1" />);
    fireEvent.click(await screen.findByTestId("guide-chip-open"));
    const tap = (await screen.findAllByTestId("guide-opt-check_one"))[0];
    fireEvent.click(tap);
    await waitFor(() => expect(location).toBe("/check-improve"), { timeout: 2000 });
    await expectNoByteAsking();
  });

  it("★★ backing out keeps Byte: Home shows him again (inline), and a later plain visit to Check & Improve in the same tab behaves as today", async () => {
    render(<HomeToCheckImprove uid="u1" />);
    fireEvent.click(within(await screen.findByTestId("start-here-focus")).getByTestId("guide-opt-check_one"));
    await waitFor(() => expect(location).toBe("/check-improve"), { timeout: 2000 });
    await expectNoByteAsking();
    fireEvent.click(screen.getByText("back to home"));
    await waitFor(() => expect(location).toBe("/"));
    expect((await screen.findAllByTestId("guide-opt-check_one")).length).toBeGreaterThan(0); // Byte is back on Home
    // A second, ordinary arrival (no tap on Byte): the handover was consumed, so the focus guide is as today.
    fireEvent.click(screen.getByText("plain link to Check and Improve"));
    await waitFor(() => expect(location).toBe("/check-improve"));
    expect(await screen.findByTestId("start-here-focus")).toBeTruthy();
  });
});
