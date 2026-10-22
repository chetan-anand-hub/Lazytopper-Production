/**
 * MOMENTS-1 M2 (owner ruling, 22 Oct) — Byte's "5 quick questions" moment plays only on the SERVER's
 * zero-graded answer. When the cloud cannot answer, GUIDE-1 still shows the Byte card on its
 * account-age fallback (unchanged, not this lane), but the pick is GUIDE-1's plain cheer: no M2
 * pose, no "Hide mascots", no guide_moment_shown.
 */
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup, fireEvent, screen, act, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { setMatchMediaMatches } from "../../test/setup";

const { cloudHas, localRows, onboarding, assigned, bank, auth, AVAIL } = vi.hoisted(() => ({
  AVAIL: { Maths: { "real-numbers": { mcq: 20, ar: 6 } }, Science: { electricity: { mcq: 25, ar: 10 } } },
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
vi.mock("./startHereBank", () => bank);
vi.mock("./startHereAvailability.generated", () => ({ START_HERE_AVAILABILITY: AVAIL }));
vi.mock("../../services/firebaseClient", () => ({ authClient: auth }));

import StartHereCard from "./StartHereCard";
import { START_HERE_RETRY_MS, resetZeroGradedCacheForTests } from "./zeroGraded";
import { __resetGuideVariantSentForTests, __setGuideAbForTests } from "../guide/guideVariant";
import { __resetMascotsForTests } from "../guide/mascotsMute";

const UID = "sh-m2";
const card = () =>
  render(
    <MemoryRouter initialEntries={["/practice-hub"]}>
      <Routes>
        <Route path="*" element={<StartHereCard uid={UID} surface="practice_hub" returnTo="/practice-hub" />} />
      </Routes>
    </MemoryRouter>,
  );
const m2Events = () => onboarding.mock.calls.filter((c) => c[0] === "guide_moment_shown");

beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
  __resetMascotsForTests();
  resetZeroGradedCacheForTests();
  __resetGuideVariantSentForTests();
  localRows.mockReset().mockReturnValue([]);
  onboarding.mockReset();
  assigned.mockReset();
  bank.pickStartHereSet.mockReset().mockResolvedValue(["a", "b", "c", "d", "e"]);
  // a brand-new account (created now): GUIDE-1's fallback shows the card when the cloud cannot answer
  auth.currentUser = { uid: UID, isAnonymous: false, metadata: { creationTime: new Date().toUTCString() } };
  setMatchMediaMatches(false);
  __setGuideAbForTests(true, "guide");
});
afterEach(() => {
  cleanup();
  __setGuideAbForTests(null);
});

describe("MOMENTS-1 M2 · server-confirmed only", () => {
  it("★★ the server says zero graded → the M2 moment (point, Hide mascots, guide_moment_shown m2)", async () => {
    cloudHas.mockResolvedValue(false);
    card();
    fireEvent.click(await screen.findByTestId("guide-opt-quick"));
    expect(screen.getByTestId("blob-byte").getAttribute("data-pose")).toBe("point");
    expect(screen.getByTestId("mascots-hide")).toBeTruthy();
    expect(m2Events()).toEqual([["guide_moment_shown", { moment: "m2" }]]);
  });

  it("★★ the cloud CANNOT answer (Byte shown on the account-age fallback) → no M2: plain cheer, no Hide, no event", async () => {
    cloudHas.mockResolvedValue(null);
    card();
    const quick = await screen.findByTestId("guide-opt-quick", {}, { timeout: START_HERE_RETRY_MS + 3000 });
    await act(async () => {});
    fireEvent.click(quick);
    expect(screen.getByTestId("guide-line").textContent).toBe("Great pick! Tap a subject to start.");
    expect(screen.getByTestId("blob-byte").getAttribute("data-pose")).toBe("cheer");
    expect(screen.queryByTestId("mascots-hide")).toBeNull();
    expect(m2Events()).toEqual([]);
  });

  it("graded work only in the cloud → no Byte card at all (GUIDE-1), so no M2", async () => {
    cloudHas.mockResolvedValue(true);
    card();
    await waitFor(() => expect(cloudHas).toHaveBeenCalled());
    await act(async () => {});
    expect(screen.queryByTestId("guide-opt-quick")).toBeNull();
    expect(m2Events()).toEqual([]);
  });
});
