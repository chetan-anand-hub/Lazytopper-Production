// TS-NAV-1 — a Test Series chapter paper's Back goes UP to /test-series (and shows a "Test Series" crumb); every other chapter test
// keeps the Topic Hub Back it has today; the kill switch restores today's Back on a series paper too.
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

import ChapterTestPage from "./ChapterTestPage";

function Where() {
  const loc = useLocation();
  return <p data-testid="where">{loc.pathname}</p>;
}

function mount(entry: string) {
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/chapter-test/:grade/:subject/:topicKey" element={<ChapterTestPage />} />
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

describe("TS-NAV-1 · Chapter Test Back", () => {
  it("a series paper: '← Back to Test Series' goes to /test-series, and the page bar has the Test Series crumb", async () => {
    mount("/chapter-test/10/Maths/real-numbers?series=1");
    const back = await screen.findByRole("button", { name: /Back to Test Series/ }, { timeout: 60000 });
    // TS-UX-SCORE-1: Back already says "Test Series", so the crumb is not repeated beside it.
    expect(screen.queryByTestId("ts-crumb")).toBeNull();
    fireEvent.click(back);
    expect((await screen.findByTestId("where")).textContent).toBe("/test-series");
  }, 90000);

  it("TS-UX-SCORE-1: a paper opened from the Practice hub (returnTo=/practice-hub) goes Back to Practice, and keeps the Test Series crumb", async () => {
    mount("/chapter-test/10/Maths/real-numbers?series=1&returnTo=%2Fpractice-hub");
    const back = await screen.findByRole("button", { name: /Back to Practice/ }, { timeout: 60000 });
    expect(screen.getByTestId("ts-crumb").getAttribute("href")).toBe("/test-series");
    fireEvent.click(back);
    expect((await screen.findByTestId("where")).textContent).toBe("/practice-hub");
  }, 90000);

  it("TS-UX-SCORE-1: an unsafe returnTo is ignored - Back is /test-series", async () => {
    mount("/chapter-test/10/Maths/real-numbers?series=1&returnTo=https%3A%2F%2Fevil.example");
    const back = await screen.findByRole("button", { name: /Test Series/ }, { timeout: 60000 });
    fireEvent.click(back);
    expect((await screen.findByTestId("where")).textContent).toBe("/test-series");
  }, 90000);

  it("a non-series chapter test: Back is the Topic Hub, no crumb (unchanged)", async () => {
    mount("/chapter-test/10/Maths/real-numbers");
    const back = await screen.findByRole("button", { name: /Topic Hub/ }, { timeout: 60000 });
    expect(screen.queryByTestId("ts-crumb")).toBeNull();
    fireEvent.click(back);
    expect((await screen.findByTestId("where")).textContent).toBe("/topic-hub/10/maths/real-numbers");
  }, 90000);

  it("VITE_TS_NAV_DISABLED: a series paper keeps today's Topic Hub Back and shows no crumb", async () => {
    vi.stubEnv("VITE_TS_NAV_DISABLED", "1");
    mount("/chapter-test/10/Maths/real-numbers?series=1");
    await screen.findByRole("button", { name: /Topic Hub/ }, { timeout: 60000 });
    expect(screen.queryByTestId("ts-crumb")).toBeNull();
    expect(screen.queryByRole("button", { name: /Back to Test Series/ })).toBeNull();
  }, 90000);
});
