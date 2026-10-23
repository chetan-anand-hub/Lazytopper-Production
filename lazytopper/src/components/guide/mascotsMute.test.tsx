/**
 * MOMENTS-1 PART 0 — "Hide mascots" hides Byte and Ziggy on EVERY character surface of this device
 * and falls back to the plain (control) content; Undo / the /me switch bring them back. The A/B arm
 * and its analytics are unchanged by hiding. The device key is registered in studentDataMap.
 *
 * Surfaces pinned here: the Start-here Byte card (inline) + M2's bubble, the MI voice row, the /me
 * switch. Ziggy on the first scorecard (lazyGuide.ZiggyFirstResult) and the public peek
 * (PublicPeek.tsx) carry the same one-line `mascotsHidden` render guard; both decide on the clock
 * (first-result window / preview expiry), so a test of them must sit on the CI clock list
 * (scripts/testClock, outside this lane) — FU-MOMENTS-MUTE-CLOCK-TESTS. Every MOMENTS-1 moment is
 * pinned in moments/moments.test.tsx.
 */
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup, fireEvent, screen, act, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { setMatchMediaMatches } from "../../test/setup";

const { cloudHas, localRows, onboarding, assigned, bank, auth, AVAIL } = vi.hoisted(() => ({
  AVAIL: {
    Maths: { "real-numbers": { mcq: 20, ar: 6 } },
    Science: { electricity: { mcq: 25, ar: 10 } },
  },
  auth: { currentUser: null as null | { uid: string; isAnonymous: boolean; metadata: { creationTime?: string } } },
  cloudHas: vi.fn(),
  localRows: vi.fn(),
  onboarding: vi.fn(),
  assigned: vi.fn(),
  bank: { startHereAvailability: vi.fn(), pickStartHereSet: vi.fn() },
}));
vi.mock("../../services/sessionRecords", () => ({ cloudHasAnySessionRecord: cloudHas, loadLocalSessionRecords: localRows }));
vi.mock("../../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../analytics/analytics")>();
  return { ...actual, trackOnboardingEvent: onboarding, trackGuideVariantAssigned: assigned };
});
vi.mock("../startHere/startHereBank", () => bank);
vi.mock("../startHere/startHereAvailability.generated", () => ({ START_HERE_AVAILABILITY: AVAIL }));
vi.mock("../../services/firebaseClient", () => ({ authClient: auth }));

import StartHereCard from "../startHere/StartHereCard";
import { resetZeroGradedCacheForTests } from "../startHere/zeroGraded";
import { __resetGuideVariantSentForTests, __setGuideAbForTests, guideVariantFor } from "./guideVariant";
import { GuideMomentSlot } from "./moments/moments";
import { MASCOTS_HIDDEN_KEY, __resetMascotsForTests, hideMascots, mascotsHidden } from "./mascotsMute";
import { __removeMascotsToastForTests } from "./moments/mascotsToast";
import { MiVoiceRow } from "./mi/MiVoiceRow";
import MascotsSetting from "./MascotsSetting";
import { STUDENT_DATA_MAP } from "../../services/studentDataMap";

const calls = (name: string) => onboarding.mock.calls.filter((c) => c[0] === name);
const flush = () => act(async () => new Promise((r) => setTimeout(r, 0)));

const card = () =>
  render(
    <MemoryRouter initialEntries={["/practice-hub"]}>
      <Routes>
        <Route path="*" element={<StartHereCard uid="u1" surface="practice_hub" returnTo="/practice-hub" />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
  __resetMascotsForTests();
  resetZeroGradedCacheForTests();
  __resetGuideVariantSentForTests();
  cloudHas.mockReset().mockResolvedValue(false);
  localRows.mockReset().mockReturnValue([]);
  onboarding.mockReset();
  assigned.mockReset();
  bank.pickStartHereSet.mockReset().mockResolvedValue(["a", "b", "c", "d", "e"]);
  auth.currentUser = null;
  setMatchMediaMatches(false);
  __setGuideAbForTests(true, "guide");
});
afterEach(() => {
  cleanup();
  __removeMascotsToastForTests();
  __setGuideAbForTests(null);
});

describe("PART 0 · the Start-here Byte card", () => {
  it("★★ M2 — '5 quick questions': Byte POINTS and says the owner's line, with a Hide mascots button; guide_moment_shown m2", async () => {
    card();
    fireEvent.click(await screen.findByTestId("guide-opt-quick"));
    expect(screen.getByTestId("guide-line").textContent).toBe("Great pick! Tap a subject to start.");
    expect(screen.getByTestId("blob-byte").getAttribute("data-pose")).toBe("point");
    expect(screen.getByTestId("mascots-hide").textContent).toBe("Hide mascots");
    expect(calls("guide_moment_shown")).toEqual([["guide_moment_shown", { moment: "m2" }]]);
  });

  it("★★ Hide mascots → the guide arm sees TODAY's card (control content) + the snackbar; Undo → Byte is back", async () => {
    card();
    fireEvent.click(await screen.findByTestId("guide-opt-quick"));
    fireEvent.click(screen.getByTestId("mascots-hide"));
    expect(window.localStorage.getItem(MASCOTS_HIDDEN_KEY)).toBe("1");
    expect(screen.queryByTestId("byte-guide-inline")).toBeNull();
    expect(screen.queryByTestId("blob-byte")).toBeNull();
    expect(screen.getByTestId("start-here-card")).toBeTruthy();
    expect(screen.getByTestId("mascots-toast").textContent).toContain("Mascots hidden. Turn them back on in Me.");
    expect(calls("mascots_hidden")).toEqual([["mascots_hidden", {}]]);

    fireEvent.click(screen.getByTestId("mascots-undo"));
    expect(await screen.findByTestId("byte-guide-inline")).toBeTruthy();
    expect(screen.queryByTestId("start-here-card")).toBeNull();
    expect(calls("mascots_shown")).toEqual([["mascots_shown", {}]]);
  });

  it("★★ hidden does NOT change the arm or its analytics: guide_shown still says variant guide, no start_here_shown", async () => {
    window.localStorage.setItem(MASCOTS_HIDDEN_KEY, "1");
    card();
    expect(await screen.findByTestId("start-here-card")).toBeTruthy();
    expect(screen.queryByTestId("byte-guide-inline")).toBeNull();
    await flush();
    expect(calls("guide_shown")).toEqual([["guide_shown", { surface: "practice_hub", variant: "guide", intent: "default" }]]);
    expect(calls("start_here_shown")).toEqual([]);
    expect(assigned).not.toHaveBeenCalled(); // GUIDE-ALL-1: the arm is no longer reported
  });

  it("CONTROL: the control arm is untouched by the switch (today's card either way)", async () => {
    __setGuideAbForTests(true, "control");
    card();
    expect(await screen.findByTestId("start-here-card")).toBeTruthy();
    expect(screen.queryByTestId("mascots-hide")).toBeNull();
  });
});

describe("PART 0 · the MI voice row", () => {
  it("★ shown with the mascots on; hidden → no row (the card's own text is unchanged)", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    render(<MiVoiceRow uid="u1" input={{ kind: "no-data" }} hydrated />);
    expect(screen.getByTestId("mi-voice")).toBeTruthy();
    act(() => hideMascots());
    expect(screen.queryByTestId("mi-voice")).toBeNull();
    vi.unstubAllGlobals();
  });
});

describe("PART 0 · the way back on /me", () => {
  it("★★ guide arm: a switch, on; tap → hidden everywhere; tap again → shown", async () => {
    render(<MascotsSetting uid="u1" />);
    // REVIEW F5: one switch under a "Mascots" heading on /me (the nav's "Me"), not a "Settings" page
    expect(screen.getByRole("heading", { name: "Mascots" })).toBeTruthy();
    expect(screen.queryByText("Settings")).toBeNull();
    const sw = screen.getByTestId("mascots-switch");
    expect(sw.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(sw);
    expect(mascotsHidden()).toBe(true);
    expect(screen.getByTestId("mascots-switch").getAttribute("aria-checked")).toBe("false");
    fireEvent.click(screen.getByTestId("mascots-switch"));
    expect(mascotsHidden()).toBe(false);
  });

  it("control arm with nothing hidden: nothing at all (today's page); hidden on the device: the switch shows, off", async () => {
    __setGuideAbForTests(true, "control");
    const view = render(<MascotsSetting uid="u1" />);
    expect(screen.queryByTestId("mascots-setting")).toBeNull();
    act(() => hideMascots());
    await waitFor(() => expect(screen.getByTestId("mascots-switch").getAttribute("aria-checked")).toBe("false"));
    view.unmount();
  });
});

describe("GUIDE-ALL-1 · every student gets the guide, and 'Hide mascots' still hides every character", () => {
  /** A uid the retired A/B put in CONTROL — the case GUIDE-ALL-1 changes. */
  const exControl = () => Array.from({ length: 60 }, (_, i) => `ga1-${i}`).find((u) => guideVariantFor(u) === "control")!;
  const cardFor = (uid: string) =>
    render(
      <MemoryRouter initialEntries={["/practice-hub"]}>
        <Routes>
          <Route path="*" element={<StartHereCard uid={uid} surface="practice_hub" returnTo="/practice-hub" />} />
        </Routes>
      </MemoryRouter>,
    );

  it("★★ an ex-control uid (no forced arm, as in production) now sees Byte on the Start-here card", async () => {
    __setGuideAbForTests(true); // the guide on, nothing forced: resolveGuideVariant decides
    const uid = exControl();
    cardFor(uid);
    expect(await screen.findByTestId("byte-guide-inline")).toBeTruthy();
    expect(screen.queryByTestId("start-here-card")).toBeNull();
  });

  // The admin preview "Show control" → the plain card (split on, nothing forced) is pinned in
  // startHere/StartHereCard.preview.test.tsx "PREVIEW-1 · Show control" (a date-sensitive suite).

  it("★★ hidden on the device → no Byte, no MI voice, no moment, the /me switch shows OFF — for that same student", async () => {
    __setGuideAbForTests(true);
    const uid = exControl();
    window.localStorage.setItem(MASCOTS_HIDDEN_KEY, "1");
    vi.stubGlobal("IntersectionObserver", undefined);
    cardFor(uid);
    expect(await screen.findByTestId("start-here-card")).toBeTruthy();
    expect(screen.queryByTestId("byte-guide-inline")).toBeNull();
    expect(screen.queryByTestId("blob-byte")).toBeNull();
    cleanup();
    render(<MiVoiceRow uid={uid} input={{ kind: "no-data" }} hydrated />);
    expect(screen.queryByTestId("mi-voice")).toBeNull();
    cleanup();
    const slot = render(<GuideMomentSlot show moment="m6" step="unread" />);
    await flush();
    expect(slot.container.innerHTML).toBe("");
    cleanup();
    render(<MascotsSetting uid={uid} />);
    expect(screen.getByTestId("mascots-switch").getAttribute("aria-checked")).toBe("false");
    vi.unstubAllGlobals();
  });
});

describe("PART 0 · the device key is registered", () => {
  it("studentDataMap's device entry lists lazytopper.mascotsHidden as a device preference", () => {
    const local = STUDENT_DATA_MAP.find((l) => l.id === "local-storage")!;
    expect(local.holds).toContain("`lazytopper.mascotsHidden`");
    expect(local.holds).toMatch(/never premium or trial state/);
    expect(MASCOTS_HIDDEN_KEY).toBe("lazytopper.mascotsHidden");
    expect(local.holds).toContain("`lazytopper.m11Shown.<tag>`");
  });
});
