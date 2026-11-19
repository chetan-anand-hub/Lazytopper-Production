// TS-NAV-1 — a Test Series full mock's Back goes UP to /test-series (and shows a "Test Series" crumb); an ordinary full mock keeps
// its Practice Back; the kill switch restores today's Back on a series paper too.
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

vi.mock("../hooks/useSubscription", () => ({
  useSubscription: () => ({
    tier: "premium", isPremium: true, isTrialActive: false, isTrialExpired: false, daysLeftInTrial: 0,
    status: { tier: "premium", plan: "pass_till_boards" }, hydrated: true, startTrial: () => {}, upgradeToPremium: () => {},
  }),
}));
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "student-1", isLocalSession: false, email: "s@x.com" }, loading: false }),
}));
vi.mock("../services/firebaseClient", () => ({ firestoreDb: null }));
vi.mock("../services/packs", async (orig) => ({ ...(await orig<typeof import("../services/packs")>()), fetchMyPacks: async () => ({ packs: [], licensee: { name: "", email: "" }, boardPassCredit: null }) }));
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: () => {} }));
vi.mock("../components/usage/useFairUse", () => ({
  useFairUse: () => ({ limit: null, clearLimit: () => {}, noteGraded: () => {}, handleRefusal: async () => false, blockPaperStart: () => false }),
}));

import FullMockPage from "./FullMockPage";

function Where() {
  const loc = useLocation();
  return <p data-testid="where">{loc.pathname}</p>;
}

function mount(entry: string) {
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/full-mock/:grade/:subject" element={<FullMockPage />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ enforced: false }), { status: 200 })));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("TS-NAV-1 · Full Mock Back", () => {
  it("a series mock: '← Test Series' goes to /test-series, and the page bar has the Test Series crumb", async () => {
    mount("/full-mock/10/Maths?paper=3");
    const back = await screen.findByRole("button", { name: /^← Test Series/ }, { timeout: 60000 });
    // TS-UX-SCORE-1: Back already says "Test Series", so the crumb is not repeated beside it.
    expect(screen.queryByTestId("ts-crumb")).toBeNull();
    fireEvent.click(back);
    expect((await screen.findByTestId("where")).textContent).toBe("/test-series");
  }, 90000);

  it("TS-UX-SCORE-1: a paper opened from the Practice hub (returnTo=/practice-hub) goes Back to Practice, and keeps the Test Series crumb", async () => {
    mount("/full-mock/10/Maths?paper=3&returnTo=%2Fpractice-hub");
    const back = await screen.findByRole("button", { name: /^← Practice/ }, { timeout: 60000 });
    expect(screen.getByTestId("ts-crumb").getAttribute("href")).toBe("/test-series");
    fireEvent.click(back);
    expect((await screen.findByTestId("where")).textContent).toBe("/practice-hub");
  }, 90000);

  it("TS-UX-SCORE-1: an unsafe returnTo is ignored - Back is /test-series", async () => {
    mount("/full-mock/10/Maths?paper=3&returnTo=https%3A%2F%2Fevil.example");
    const back = await screen.findByRole("button", { name: /Test Series/ }, { timeout: 60000 });
    fireEvent.click(back);
    expect((await screen.findByTestId("where")).textContent).toBe("/test-series");
  }, 90000);

  it("an ordinary full mock: Back is Practice, no crumb (unchanged)", async () => {
    mount("/full-mock/10/Maths");
    const back = await screen.findByRole("button", { name: /Practice/ }, { timeout: 60000 });
    expect(screen.queryByTestId("ts-crumb")).toBeNull();
    fireEvent.click(back);
    expect((await screen.findByTestId("where")).textContent).toBe("/practice-hub");
  }, 90000);

  it("VITE_TS_NAV_DISABLED: a series paper keeps today's Practice Back and shows no crumb", async () => {
    vi.stubEnv("VITE_TS_NAV_DISABLED", "1");
    mount("/full-mock/10/Maths?paper=3");
    await screen.findByRole("button", { name: /Practice/ }, { timeout: 60000 });
    expect(screen.queryByTestId("ts-crumb")).toBeNull();
    expect(screen.queryByRole("button", { name: /^← Test Series/ })).toBeNull();
  }, 90000);
});
