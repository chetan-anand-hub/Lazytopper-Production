// TS-NAV-2 (owner, 25 Nov 2026) — ONE name per paper on a Test Series CHAPTER paper (P9: the setup h1 is generic, but the result
// title, "Saved as ..." and the saved record used the student's personal "Real Numbers · Test #N"). A NEW sitting of series paper k
// is saved as "Real Numbers · Paper k" (the picker's words); the code is unchanged; a non-series chapter test keeps "Test #N";
// kill switch VITE_TS_NAV2_DISABLED restores the personal name.
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "student-1", isLocalSession: false, email: "s@x.com" }, loading: false }),
}));
vi.mock("../hooks/useSubscription", () => ({
  useSubscription: () => ({
    tier: "premium", isPremium: true, isTrialActive: false, isTrialExpired: false, daysLeftInTrial: 0,
    status: { tier: "premium", plan: "pass_till_boards" }, hydrated: true, startTrial: () => {}, upgradeToPremium: () => {},
  }),
}));
vi.mock("../services/firebaseClient", () => ({ firestoreDb: null }));
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: () => {} }));
vi.mock("../services/packs", async (orig) => ({ ...(await orig<typeof import("../services/packs")>()), fetchMyPacks: async () => ({ packs: [], licensee: { name: "", email: "" }, boardPassCredit: null }) }));
vi.mock("../components/usage/useFairUse", () => ({
  useFairUse: () => ({ limit: null, clearLimit: () => {}, noteGraded: () => {}, handleRefusal: async () => false, blockPaperStart: () => false }),
}));
vi.mock("../components/testSeries/WrittenCheckGate", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../components/testSeries/WrittenCheckGate")>()),
  useSeriesPaperAccess: () => true,
  useSeriesAccess: () => ({ canCheck: true, canDownload: true, checking: false, failed: false, ownsSeries: false, status: null, retry: () => undefined }),
  useBoardPassHolder: () => true,
}));

import ChapterTestPage from "./ChapterTestPage";
import { loadLocalSessionRecords } from "../services/sessionRecords";

async function sitAndSubmit(entry: string) {
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/chapter-test/:grade/:subject/:topicKey" element={<ChapterTestPage />} />
      </Routes>
    </MemoryRouter>,
  );
  fireEvent.click(await screen.findByRole("button", { name: /Start the test/ }, { timeout: 60000 }));
  await waitFor(() => expect(document.querySelector(".lt-ct__exit")).not.toBeNull());
  fireEvent.click(document.querySelector(".lt-ct__exit") as HTMLElement);
  fireEvent.click(await screen.findByRole("button", { name: /Submit now/ }));
  let rec: ReturnType<typeof loadLocalSessionRecords>[number] | undefined;
  await waitFor(() => {
    const all = loadLocalSessionRecords("student-1").filter((r) => r.surface === "chapter-test");
    expect(all).toHaveLength(1);
    rec = all[0];
  });
  return rec!;
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ enforced: false }), { status: 200 })));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("TS-NAV-2 · one name per paper on a series chapter paper", () => {
  it("series paper 2: the result title and the NEW record read 'Real Numbers · Paper 2'; the code keeps its CT pattern", async () => {
    const rec = await sitAndSubmit("/chapter-test/10/Maths/real-numbers?series=1&paper=2");
    expect(rec.title).toBe("Real Numbers · Paper 2");
    expect(rec.id).toMatch(/^CT-M-[A-Z]+-\d{2}$/);
    expect(document.body.textContent).toContain("Real Numbers · Paper 2");
    expect(document.body.textContent).not.toMatch(/Real Numbers · Test #\d/);
  }, 300000);

  it("a non-series chapter test is unchanged: 'Real Numbers · Test #1'", async () => {
    const rec = await sitAndSubmit("/chapter-test/10/Maths/real-numbers");
    expect(rec.title).toBe("Real Numbers · Test #1");
  }, 300000);

  it("kill switch VITE_TS_NAV2_DISABLED: the series paper keeps the personal name", async () => {
    vi.stubEnv("VITE_TS_NAV2_DISABLED", "1");
    const rec = await sitAndSubmit("/chapter-test/10/Maths/real-numbers?series=1&paper=2");
    expect(rec.title).toBe("Real Numbers · Test #1");
  }, 300000);
});
