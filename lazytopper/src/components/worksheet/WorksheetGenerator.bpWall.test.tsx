// FAIRUSE-TS-OWNER-1 (owner 24 Nov 2026 23:11 "fix it thoroughly for both Board Pass owners and Test Series owners") - on the
// REAL worksheet generator: a Board Pass holder is never shown the trial worksheet wall, even while the usage view is still a
// trial one (just paid: a cached verdict). A trial account keeps the wall (worksheets are never a Test Series paper).

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { PersistedWorksheet } from "../../services/worksheetSessionStore";

const USER = { uid: "student-1", isLocalSession: false, email: "s@x.com" };
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: USER, loading: false }) }));
vi.mock("../../hooks/useSubjectContext", () => ({ useSubjectContext: () => ({ subject: "Maths" }) }));
vi.mock("../auth/RequireAuth", () => ({
  RequirePremium: ({ children }: { children: React.ReactNode }) => children,
  RequireAuth: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("./WorksheetGradePanel", () => ({
  default: (props: { ws: PersistedWorksheet }) => <div data-testid="grade-panel">{props.ws.code}</div>,
}));
const sub = vi.hoisted(() => ({ tier: "trial" as "trial" | "premium" }));
vi.mock("../../hooks/useSubscription", () => ({
  useSubscription: () => ({
    tier: sub.tier, isPremium: true, isTrialActive: sub.tier === "trial", isTrialExpired: false, daysLeftInTrial: 5,
    status: { tier: sub.tier, plan: sub.tier === "premium" ? "pass_till_boards" : "trial_7day" },
    hydrated: true, startTrial: () => {}, upgradeToPremium: () => {},
  }),
}));
vi.mock("../../ai/paidCallHeaders", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../ai/paidCallHeaders")>();
  return { ...actual, paidCallHeaders: async () => ({ "X-Lazytopper-Uid": "student-1", Authorization: "Bearer tok" }) };
});
vi.mock("../../services/firebaseClient", () => ({ firestoreDb: {} }));
vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, ...path: string[]) => ({ path: path.join("/") }),
  setDoc: vi.fn(async () => {}),
  getDoc: vi.fn(async () => ({ exists: () => false, data: () => undefined, metadata: { fromCache: false } })),
  deleteDoc: vi.fn(async () => {}),
}));
vi.mock("../../services/sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/sessionRecords")>();
  return { ...actual, getSessionRecordsFromCloud: async () => [] };
});

import WorksheetGenerator from "./WorksheetGenerator";
import { __resetUsageClientForTests } from "../../services/usageClient";

const RESET = new Date(Date.now() + 5 * 86400000).toISOString();
const SPENT_TRIAL = {
  enforced: true, tier: "trial",
  trial: { checksLeftToday: 5, chapterTestsLeftToday: 1, mocksLeft: 1, worksheetsLeft: 0, resets: { checks: RESET, chapterTests: RESET, mocks: RESET, worksheets: RESET } },
  premium: null,
};

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  __resetUsageClientForTests();
  vi.stubGlobal("fetch", vi.fn(async (url: string) =>
    String(url).includes("/api/usage/me") ? new Response(JSON.stringify(SPENT_TRIAL), { status: 200 }) : new Response("{}", { status: 404 })));
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

async function generate() {
  render(
    <MemoryRouter initialEntries={["/practice/worksheets?subject=Maths&scope=topic&topic=real-numbers"]}>
      <WorksheetGenerator />
    </MemoryRouter>,
  );
  await waitFor(() => expect(screen.queryByText("Loading questions…")).toBeNull(), { timeout: 60000 });
  fireEvent.click(screen.getAllByRole("button", { name: /Preview worksheet/i })[0]);
  const gen = await screen.findByRole("button", { name: /Generate worksheet/ });
  await new Promise((r) => setTimeout(r, 300)); // the usage snapshot lands first
  fireEvent.click(gen);
}

describe("FAIRUSE-TS-OWNER-1 · worksheet generator", () => {
  it("★★ Board Pass holder with a STALE trial usage view (week's worksheet spent): generates, no wall", async () => {
    sub.tier = "premium";
    await generate();
    await waitFor(() => expect(screen.queryByRole("button", { name: /Generate worksheet/ })).toBeNull());
    expect(screen.queryByTestId("fair-use-limit-panel")).toBeNull();
  }, 90000);

  it("★ CONTROL: a trial account keeps the weekly worksheet wall", async () => {
    sub.tier = "trial";
    await generate();
    expect((await screen.findByTestId("fair-use-limit-panel")).textContent).toContain("worksheet");
  }, 90000);

  it("★ kill switch VITE_FAIRUSE_TS_OWNER_EXEMPT_DISABLED=1: the stale view walls the Board Pass holder exactly as before", async () => {
    vi.stubEnv("VITE_FAIRUSE_TS_OWNER_EXEMPT_DISABLED", "1");
    sub.tier = "premium";
    await generate();
    expect(await screen.findByTestId("fair-use-limit-panel")).toBeTruthy();
  }, 90000);
});
