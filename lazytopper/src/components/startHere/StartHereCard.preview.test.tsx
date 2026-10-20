import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup, fireEvent, screen, act, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { setMatchMediaMatches } from "../../test/setup";

const { cloudHas, localRows, onboarding, assigned, bank, auth, AVAIL } = vi.hoisted(() => ({
  AVAIL: {
    Maths: { "real-numbers": { mcq: 20, ar: 6 } },
    Science: { electricity: { mcq: 25, ar: 10 } },
  },
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

import StartHereCard, { StartHereFocusView, StartHereView, useStartHere, type StartHereState } from "./StartHereCard";
import { resetZeroGradedCacheForTests } from "./zeroGraded";
import { START_HERE_DISMISSED_KEY } from "./startHereModel";
import {
  GUIDE_PREVIEW_KEY,
  GUIDE_VARIANT_SENT_PREFIX,
  __resetGuideVariantSentForTests,
  __setGuideAbForTests,
} from "../guide/guideVariant";

/**
 * PREVIEW-1 — what the admin preview changes on the Start-here pages. The split is ON (as in
 * production) with NO forced arm, so the arm comes from the stored preview exactly as it would
 * on the owner's browser.
 */
const FAR = 4_102_444_800_000; // a fixed far-future `until`
const preview = (arm: "guide" | "control") => window.localStorage.setItem(GUIDE_PREVIEW_KEY, JSON.stringify({ arm, until: FAR }));
const graded = () => localRows.mockReturnValue([{ id: "r1", status: "graded" }]);
const GUIDE_EVENTS = ["guide_shown", "guide_option", "guide_dismissed", "guide_reopened", "ziggy_reaction"];
const guideCalls = () => onboarding.mock.calls.filter((c) => GUIDE_EVENTS.includes(c[0] as string));
const calls = (name: string) => onboarding.mock.calls.filter((c) => c[0] === name);
const flush = () => act(async () => new Promise((r) => setTimeout(r, 0)));

const mount = (uid: string | null = "u1") =>
  render(
    <MemoryRouter initialEntries={["/practice-hub"]}>
      <StartHereCard uid={uid} surface="practice_hub" returnTo="/practice-hub" />
    </MemoryRouter>,
  );

let seen: StartHereState | null = null;
function Probe({ uid }: { uid: string | null }) {
  seen = useStartHere(uid);
  return null;
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
  seen = null;
  setMatchMediaMatches(false);
  __setGuideAbForTests(true);
});
afterEach(() => {
  cleanup();
  __setGuideAbForTests(null);
});

describe("PREVIEW-1 · visibility rule", () => {
  it("★★ with NO preview the rule is byte-identical to today: uid && graded === 'none' && !dismissed", async () => {
    const cases: Array<{ uid: string | null; hasGraded: boolean; dismissed: boolean }> = [];
    for (const uid of [null, "u1"]) for (const hasGraded of [false, true]) for (const dismissed of [false, true]) cases.push({ uid, hasGraded, dismissed });
    for (const c of cases) {
      cleanup();
      window.sessionStorage.clear();
      resetZeroGradedCacheForTests();
      localRows.mockReturnValue(c.hasGraded ? [{ id: "r1" }] : []);
      if (c.dismissed) window.sessionStorage.setItem(START_HERE_DISMISSED_KEY, "1");
      render(<Probe uid={c.uid} />);
      await flush();
      const today = !!c.uid && !c.hasGraded && !c.dismissed;
      expect(seen!.visible, JSON.stringify(c)).toBe(today);
      expect(seen!.eligible, JSON.stringify(c)).toBe(!!c.uid && !c.hasGraded);
    }
    expect(window.localStorage.getItem(GUIDE_PREVIEW_KEY)).toBeNull();
  });

  it("★★ with a preview ONLY the graded rule relaxes: signed-out and 'Not now' still hide it", async () => {
    preview("guide");
    graded();
    render(<Probe uid="u1" />);
    await flush();
    expect(seen!.visible).toBe(true);
    cleanup();
    render(<Probe uid={null} />);
    await flush();
    expect(seen!.visible).toBe(false);
    cleanup();
    window.sessionStorage.setItem(START_HERE_DISMISSED_KEY, "1");
    render(<Probe uid="u1" />);
    await flush();
    expect(seen!.visible).toBe(false);
    expect(seen!.eligible).toBe(true); // the chip's audience, as for a zero-graded student today
  });

  it("an EXPIRED preview changes nothing (and is removed)", async () => {
    window.localStorage.setItem(GUIDE_PREVIEW_KEY, JSON.stringify({ arm: "guide", until: 1 }));
    graded();
    mount();
    await flush();
    expect(screen.queryByTestId("byte-guide-inline")).toBeNull();
    expect(screen.queryByTestId("start-here-card")).toBeNull();
    expect(window.localStorage.getItem(GUIDE_PREVIEW_KEY)).toBeNull();
  });
});

describe("PREVIEW-1 · Show Byte", () => {
  it("★★ Byte shows on an account WITH graded results, with the 'Admin preview' pill; NO guide event and NO arm report", async () => {
    preview("guide");
    graded();
    mount();
    expect(await screen.findByTestId("byte-guide-inline")).toBeTruthy();
    expect(screen.getByTestId("guide-admin-preview").textContent).toBe("Admin preview");
    await flush();
    expect(guideCalls()).toEqual([]);
    expect(calls("start_here_shown")).toHaveLength(0); // guide arm: today's card is not shown
    expect(assigned).not.toHaveBeenCalled();
    expect(Object.keys(window.localStorage).some((k) => k.startsWith(GUIDE_VARIANT_SENT_PREFIX))).toBe(false);
  });

  it("★ dismiss is unchanged: × closes for the tab (today's key), the chip reopens Byte — still silent, still with the pill", async () => {
    preview("guide");
    graded();
    mount();
    fireEvent.click(await screen.findByTestId("guide-close"));
    expect(window.sessionStorage.getItem(START_HERE_DISMISSED_KEY)).toBe("1");
    fireEvent.click(await screen.findByTestId("guide-chip-open"));
    expect(await screen.findByTestId("byte-guide-sheet")).toBeTruthy();
    expect(screen.getByTestId("guide-admin-preview")).toBeTruthy();
    expect(guideCalls()).toEqual([]);
  });

  it("★ a tapped option is still not counted (guide_option suppressed) but the option works", async () => {
    preview("guide");
    graded();
    mount();
    fireEvent.click(await screen.findByTestId("guide-opt-quick"));
    expect(screen.getByTestId("start-here-ready")).toBeTruthy();
    expect(guideCalls()).toEqual([]);
  });

  it("the focused surface (Home) also shows Byte with the pill under preview", async () => {
    preview("guide");
    graded();
    function Home() {
      const s = useStartHere("u1");
      return (
        <>
          <StartHereView surface="home" returnTo="/" state={s} />
          <StartHereFocusView uid="u1" surface="home" returnTo="/" state={s} />
        </>
      );
    }
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );
    const focus = await screen.findByTestId("start-here-focus");
    expect(focus.getAttribute("data-arm")).toBe("guide");
    await waitFor(() => expect(focus.querySelector("[data-testid='guide-admin-preview']")).toBeTruthy());
    expect(guideCalls()).toEqual([]);
  });

  it("no preview (guide arm by the test seam): NO pill", async () => {
    __setGuideAbForTests(true, "guide");
    mount();
    expect(await screen.findByTestId("byte-guide-inline")).toBeTruthy();
    expect(screen.queryByTestId("guide-admin-preview")).toBeNull();
  });
});

describe("PREVIEW-1 · Show control", () => {
  it("★★ today's Start-here card shows on a graded account; today's start_here_shown still fires; NO guide_shown, NO arm report", async () => {
    preview("control");
    graded();
    mount();
    expect(await screen.findByTestId("start-here-card")).toBeTruthy();
    expect(screen.queryByTestId("byte-guide-inline")).toBeNull();
    await waitFor(() => expect(calls("start_here_shown")).toEqual([["start_here_shown", { surface: "practice_hub" }]]));
    expect(guideCalls()).toEqual([]);
    expect(assigned).not.toHaveBeenCalled();
  });

  it("signed out with a preview set: nothing at all", async () => {
    preview("control");
    mount(null);
    await flush();
    expect(screen.queryByTestId("start-here-card")).toBeNull();
    expect(onboarding).not.toHaveBeenCalled();
  });
});
