import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

/**
 * FREE-TS-WEEKLY (owner ruling 27 Nov 2026, 13:14 IST) - Basic and trial accounts open ONLY Test Series papers, 3 a rolling week
 * signed in (1 signed out); an ordinary paper shows the upgrade wall; resumes and re-opens never count; Board Pass holders and Test
 * Series owners are unchanged; VITE_FREE_TS_WEEKLY_DISABLED=1 restores the daily behaviour exactly.
 */
type TestUser = { uid: string } | null;
let currentUser: TestUser = null;
let tier: "free" | "trial" | "premium" = "free";
let hydrated = true;
let cloudConfirmed = true;
let ownerState: "owner" | "not-owner" | "unknown" = "not-owner";
let resuming = false;
const mintOpen = vi.fn(async (_k: string) => ({ refused: false, resetAt: null as string | null }));

vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: currentUser, loading: false }) }));
vi.mock("../../hooks/useSubscription", () => ({
  useSubscription: () => ({
    tier,
    isPremium: tier !== "free",
    isTrialActive: tier === "trial",
    isTrialExpired: false,
    daysLeftInTrial: 0,
    status: { tier },
    hydrated,
    cloudConfirmed,
  }),
}));
vi.mock("./paperCapOwner", () => ({
  readTestSeriesOwner: () => Promise.resolve(ownerState === "owner"),
  readTestSeriesOwnerState: () => Promise.resolve(ownerState),
  isKnownTestSeriesOwner: () => false,
}));
vi.mock("../../services/limitsClient", () => ({ mintOpen: (k: string) => mintOpen(k) }));
vi.mock("../../lib/papers/resumablePaper", async (orig) => {
  const real = await orig<typeof import("../../lib/papers/resumablePaper")>();
  return { ...real, isResumingSavedPaper: () => resuming };
});

const PAPER = "the paper body";
const CT = (k: number) => `/chapter-test/10/Maths/real-numbers?series=1${k > 1 ? `&paper=${k}` : ""}`;
const ORDINARY = "/chapter-test/10/Maths/real-numbers";
const FM1 = "/full-mock/10/Maths?paper=1";
const STORE = "lazytopper.freeTsWeekly";

async function load() {
  return await import("./MockViewGate");
}

/** Mount the gate at `url`, wait until it has decided (paper or any wall), return the screen text. */
async function visit(url: string): Promise<{ rendered: boolean; text: string }> {
  const { MockViewGate } = await load();
  const view = render(
    <MemoryRouter initialEntries={[url]}>
      <MockViewGate>
        <div>{PAPER}</div>
      </MockViewGate>
    </MemoryRouter>,
  );
  await waitFor(() => {
    const t = document.body.textContent || "";
    expect(t).not.toContain("Loading...");
    expect(t).not.toBe(""); // a lazy wall is still loading
  });
  const out = { rendered: screen.queryByText(PAPER) !== null, text: document.body.textContent || "" };
  view.unmount();
  return out;
}

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  localStorage.clear();
  sessionStorage.clear();
  currentUser = null;
  tier = "free";
  hydrated = true;
  cloudConfirmed = true;
  ownerState = "not-owner";
  resuming = false;
  mintOpen.mockClear();
  mintOpen.mockImplementation(async () => ({ refused: false, resetAt: null }));
});
afterEach(cleanup);

describe("FREE-TS-WEEKLY - signed-in Basic", () => {
  beforeEach(() => {
    currentUser = { uid: "u1" };
  });

  it("3 Test Series papers a week open; the 4th is refused with the weekly copy", async () => {
    expect((await visit(CT(1))).rendered).toBe(true);
    expect((await visit(CT(2))).rendered).toBe(true);
    expect((await visit(FM1)).rendered).toBe(true);
    const fourth = await visit(CT(3));
    expect(fourth.rendered).toBe(false);
    expect(fourth.text).toContain("Free accounts open 3 Test Series papers a week.");
    expect(fourth.text).not.toContain("a day");
  });

  it("re-opening the same paper is not a new open (a re-visit / resume never counts twice)", async () => {
    for (let i = 0; i < 5; i += 1) expect((await visit(CT(1))).rendered).toBe(true);
    expect((await visit(CT(2))).rendered).toBe(true);
    expect((await visit(CT(3))).rendered).toBe(true);
    expect((await visit(CT(4))).rendered).toBe(false);
  });

  it("a RESUME of a saved paper never counts and is never refused", async () => {
    resuming = true;
    for (let k = 1; k <= 5; k += 1) expect((await visit(CT(k))).rendered).toBe(true);
    expect(localStorage.getItem(`${STORE}:u1`)).toBeNull();
    expect(mintOpen).not.toHaveBeenCalled();
  });

  it("a new week resets: opens older than 7 days no longer count", async () => {
    const old = Date.now() - 8 * 24 * 60 * 60 * 1000;
    localStorage.setItem(`${STORE}:u1`, JSON.stringify([1, 2, 3].map((n) => ({ k: `TS-OLD-${n}`, at: old }))));
    expect((await visit(CT(1))).rendered).toBe(true);
    expect((await visit(CT(2))).rendered).toBe(true);
    expect((await visit(CT(3))).rendered).toBe(true);
    expect((await visit(CT(4))).rendered).toBe(false);
  });

  it("an ordinary (non-series) chapter test shows the upgrade wall - Test Series and Board Pass buttons with the total", async () => {
    const r = await visit(ORDINARY);
    expect(r.rendered).toBe(false);
    expect(r.text).toContain("Test Series");
    expect(r.text).toContain("Board Pass");
    expect(r.text).toMatch(/Pay ₹/);
    expect(localStorage.getItem(`${STORE}:u1`)).toBeNull();
  });

  it("the server's refusal (another device used the week) walls the open; its failure fails open", async () => {
    mintOpen.mockImplementationOnce(async () => ({ refused: true, resetAt: null }));
    const refused = await visit(CT(1));
    expect(refused.rendered).toBe(false);
    expect(refused.text).toContain("Test Series papers a week");
    mintOpen.mockImplementation(async () => ({ refused: false, resetAt: null }));
    expect((await visit(CT(1))).rendered).toBe(true);
  });

  it("a Test Series owner is never capped and never walled on an ordinary paper", async () => {
    ownerState = "owner";
    for (let k = 1; k <= 5; k += 1) expect((await visit(CT(k))).rendered).toBe(true);
    expect((await visit(ORDINARY)).rendered).toBe(true);
    expect(mintOpen).not.toHaveBeenCalled();
  });

  it("an unreadable ownership read fails OPEN (never walls an owner on a blip)", async () => {
    ownerState = "unknown";
    expect((await visit(ORDINARY)).rendered).toBe(true);
    for (let k = 1; k <= 5; k += 1) expect((await visit(CT(k))).rendered).toBe(true);
  });
});

describe("FREE-TS-WEEKLY - trial and Board Pass", () => {
  beforeEach(() => {
    currentUser = { uid: "u2" };
  });

  it("a TRIAL account is limited exactly like Basic (3 a week; ordinary papers walled)", async () => {
    tier = "trial";
    expect((await visit(ORDINARY)).rendered).toBe(false);
    for (let k = 1; k <= 3; k += 1) expect((await visit(CT(k))).rendered).toBe(true);
    expect((await visit(CT(4))).rendered).toBe(false);
  });

  it("a Board Pass holder is unchanged: unlimited, uncounted, no server call", async () => {
    tier = "premium";
    expect((await visit(ORDINARY)).rendered).toBe(true);
    for (let k = 1; k <= 6; k += 1) expect((await visit(CT(k))).rendered).toBe(true);
    expect(localStorage.getItem(`${STORE}:u2`)).toBeNull();
    expect(mintOpen).not.toHaveBeenCalled();
  });
});

describe("FREE-TS-WEEKLY - a signed-in student is not judged before the subscription is cloud-confirmed", () => {
  beforeEach(() => {
    currentUser = { uid: "u9" };
  });

  it("a Board Pass holder on a fresh device (status still the free default, not hydrated) sees the loading card, never the wall, and records no open", async () => {
    hydrated = false;
    const { MockViewGate } = await load();
    const view = render(
      <MemoryRouter initialEntries={[ORDINARY]}>
        <MockViewGate>
          <div>{PAPER}</div>
        </MockViewGate>
      </MemoryRouter>,
    );
    await new Promise((r) => setTimeout(r, 50));
    expect(document.body.textContent).toContain("Loading...");
    expect(document.body.textContent).not.toContain("Test Series");
    view.unmount();
    expect(localStorage.getItem(`${STORE}:u9`)).toBeNull();
    expect(mintOpen).not.toHaveBeenCalled();
  });

  it("hydrated and the cloud read FAILED: fails OPEN - the paper opens (series or ordinary), no wall, no recorded open", async () => {
    cloudConfirmed = false;
    expect((await visit(ORDINARY)).rendered).toBe(true);
    for (let k = 1; k <= 5; k += 1) expect((await visit(CT(k))).rendered).toBe(true);
    expect(localStorage.getItem(`${STORE}:u9`)).toBeNull();
    expect(mintOpen).not.toHaveBeenCalled();
  });
});

describe("FREE-TS-WEEKLY - signed out", () => {
  it("1 a week: the sample opens (its start screen is not an open); Start counts it; the next paper hits the guest wall with the exact copy", async () => {
    const { claimNewPaperView, SIGNED_OUT_WALL_LINE, GUEST_PAPER_LIMIT_LINE } = await load();
    const sample = await visit(CT(1));
    expect(sample.rendered).toBe(true);
    expect(localStorage.getItem(`${STORE}:guest`)).toBeNull(); // opening the start screen did not count
    // A paper opened again from the start screen of a fresh visit is still free until Start counts it.
    expect((await visit(FM1)).rendered).toBe(true);
    // The page's Start for the sample (the gate marked the route uncounted on that visit):
    const { MockViewGate } = await load();
    const view = render(
      <MemoryRouter initialEntries={[CT(1)]}>
        <MockViewGate>
          <div>{PAPER}</div>
        </MockViewGate>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.queryByText(PAPER)).not.toBeNull());
    expect(claimNewPaperView("/chapter-test/10/Maths/real-numbers", null, false, "?series=1")).toBe(true);
    view.unmount();
    expect(localStorage.getItem(`${STORE}:guest`)).not.toBeNull();
    const next = await visit(FM1);
    expect(next.rendered).toBe(false);
    expect(next.text).toContain("Sign in to open 3 Test Series papers a week. Your first test is free, marking included.");
    expect(SIGNED_OUT_WALL_LINE).toBe("Sign in to open 3 Test Series papers a week. Your first test is free, marking included.");
    expect(GUEST_PAPER_LIMIT_LINE).toBe("You've used this week's free paper. Sign in (free) for 3 a week.");
  });

  it("signed out never exceeds signed in (1 < 3) and an ordinary paper keeps today's daily flow (crawler safety)", async () => {
    const { FREE_TS_WEEKLY_SIGNED_IN, FREE_TS_WEEKLY_SIGNED_OUT } = await import("../../config/mockViewLimits");
    expect(FREE_TS_WEEKLY_SIGNED_OUT).toBeLessThanOrEqual(FREE_TS_WEEKLY_SIGNED_IN);
    expect((await visit(ORDINARY)).rendered).toBe(true); // a fresh context always renders
  });
});

describe("FREE-TS-WEEKLY - kill switch VITE_FREE_TS_WEEKLY_DISABLED=1 restores today's behaviour exactly", () => {
  it("client: trial and Basic open an ordinary paper, the limit is the daily one, copy is the daily copy", async () => {
    vi.stubEnv("VITE_FREE_TS_WEEKLY_DISABLED", "1");
    currentUser = { uid: "u3" };
    tier = "trial";
    expect((await visit(ORDINARY)).rendered).toBe(true);
    tier = "free";
    for (let k = 1; k <= 3; k += 1) expect((await visit(CT(k))).rendered).toBe(true);
    const fourth = await visit(CT(4));
    expect(fourth.rendered).toBe(false);
    expect(fourth.text).toContain("Free accounts open 3 papers a day.");
    expect(mintOpen).not.toHaveBeenCalled();
    expect(localStorage.getItem(`${STORE}:u3`)).toBeNull();
    const { GUEST_PAPER_LIMIT_LINE, SIGNED_OUT_WALL_LINE } = await load();
    expect(GUEST_PAPER_LIMIT_LINE).toBe("You've used today's free paper. Sign in (free) for 3 a day.");
    expect(SIGNED_OUT_WALL_LINE).toBe("Sign in to open 3 papers a day. Your first test is free, marking included.");
  });
});
