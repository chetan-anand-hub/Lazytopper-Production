// SEO-SELL-2 - the Important Questions page: the signed-out subject CBQ card + Board Pass link and the Exam practice strip; a signed-in student sees no new card.
// MUTATION: render the card for a signed-in student -> the pin is RED; remove the strip -> RED.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const H = vi.hoisted(() => ({
  user: { uid: "u1" } as { uid: string } | null,
  tier: "trial",
  owned: [] as Array<{ packId: string }>,
  listeners: [] as Array<(uid: string, cloud: unknown) => void>,
  track: vi.fn(),
}));
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: () => {} }));
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: H.user, loading: false }) }));
vi.mock("../services/subscriptionService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/subscriptionService")>();
  return {
    ...actual,
    loadSubscription: () => ({ tier: H.tier, plan: "none", trialStartDate: H.tier === "free" ? null : "2026-10-30T00:00:00.000Z", trialEndDate: null, premiumSince: null }),
    onSubscriptionHydrated: (cb: (uid: string, cloud: unknown) => void) => {
      H.listeners.push(cb);
      return () => {
        H.listeners = H.listeners.filter((l) => l !== cb);
      };
    },
  };
});
vi.mock("../services/packs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/packs")>();
  return { ...actual, fetchMyPacks: () => Promise.resolve({ packs: H.owned, licensee: { name: "", email: "" }, boardPassCredit: null }) };
});
vi.mock("../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../analytics/analytics")>();
  return {
    ...actual,
    trackSaleMoment: (...a: unknown[]) => H.track(...a),
  };
});
import HighlyProbableQuestions from "./HighlyProbableQuestions";
import { resetOwnedPacksCache } from "../components/packs/useOwnedPacks";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/highly-probable/:grade/:subject" element={<HighlyProbableQuestions />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.stubEnv("VITE_PACKS_ENABLED", "1");
  vi.stubEnv("VITE_PAYMENTS_ENABLED", "1");
  window.sessionStorage.clear();
  H.user = null;
  H.tier = "free";
  H.owned = [];
  H.listeners = [];
  H.track.mockClear();
  resetOwnedPacksCache();
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("Important Questions page - SEO-SELL-2", () => {
  it("signed out: the subject CBQ card with the Board Pass link, then the strip, after the offers block", async () => {
    renderAt("/highly-probable/10/Science");
    const card = await screen.findByTestId("cbq-pack-card", {}, { timeout: 8000 });
    expect(screen.getByTestId("cbq-pack-card-link").getAttribute("href")).toBe("/cbq-packs?subject=science");
    expect(screen.getByTestId("cbq-pack-card-boardpass").getAttribute("href")).toBe("/pricing");
    const strip = screen.getByTestId("exam-practice-strip");
    expect(card.compareDocumentPosition(strip) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const offers = screen.getByTestId("offers-summary");
    expect(offers.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
  it("flag off: no card; the strip stays", async () => {
    vi.stubEnv("VITE_PACKS_ENABLED", "");
    renderAt("/highly-probable/10/Maths");
    await screen.findByTestId("exam-practice-strip", {}, { timeout: 8000 });
    expect(screen.queryByTestId("cbq-pack-card")).toBeNull();
  });
  it("PIN: a signed-in student gets no new card (their offers block is unchanged); the plain-link strip is the only addition", async () => {
    H.user = { uid: "u1" };
    H.tier = "trial";
    renderAt("/highly-probable/10/Maths");
    await screen.findByTestId("exam-practice-strip", {}, { timeout: 8000 });
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByTestId("cbq-pack-card")).toBeNull();
  });
});
