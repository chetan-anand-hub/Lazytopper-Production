import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

/**
 * AUTH-2 — the first session.
 *
 * ★ EVERY "ABSENT" ASSERTION HERE IS PAIRED WITH A CONTROL THAT RENDERS THE
 * THING. `queryBy… → null` passes just as happily when the component is broken
 * or a testid was renamed, so a bare negative proves nothing.
 */

// ── The graded-activity signal, under test control ──────────────────────────
// `getSessionRecordsFromCloud` is local-first then cloud-merged, so the ONLY
// way to exercise the hydration window is to hold the promise open.
const sessions = vi.hoisted(() => ({
  /** Resolved value for the next read. */
  records: [] as unknown[],
  /** When set, the read blocks on this instead of resolving. */
  gate: null as null | { promise: Promise<unknown[]>; resolve: (v: unknown[]) => void },
  reads: 0,
}));

vi.mock("../../services/sessionRecords", () => ({
  getSessionRecordsFromCloud: vi.fn(async () => {
    sessions.reads += 1;
    if (sessions.gate) return sessions.gate.promise;
    return sessions.records;
  }),
}));

// Home pages read auth + subscription via context hooks.
const authState = vi.hoisted(() => ({
  user: null as null | { uid: string; displayName?: string | null; email?: string },
  logout: vi.fn(async () => {}),
}));
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: authState.user, logout: authState.logout }),
}));
vi.mock("../../hooks/useSubscription", () => ({
  useSubscription: () => ({
    tier: "free",
    isTrialActive: false,
    isPremium: false,
    isTrialExpired: false,
    daysLeftInTrial: 0,
  }),
}));
// DesktopHome's own MI read — pinned empty so the MI empty state is what renders.
vi.mock("../../services/mistakeLogService", () => ({
  getMistakeLogs: vi.fn(async () => []),
}));

import FirstSession from "./FirstSession";
import DesktopHome from "../../pages/desktop/DesktopHome";
import MobileHome from "../../pages/app/MobileHome";

/** A graded session record — only `length > 0` is load-bearing here. */
const ONE_RECORD = [{ id: "QP-M-TRIG-001", gradedAt: 1 }];

function openGate() {
  let resolve!: (v: unknown[]) => void;
  const promise = new Promise<unknown[]>((r) => {
    resolve = r;
  });
  sessions.gate = { promise, resolve };
  return sessions.gate;
}

function renderIn(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

beforeEach(() => {
  sessions.records = [];
  sessions.gate = null;
  sessions.reads = 0;
  authState.user = { uid: "test-uid", displayName: "Asha Rao", email: "asha@example.com" };
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ── 1 · A zero-attempt student sees the start card ─────────────────────────
describe("1 · the start card appears for a zero-attempt student", () => {
  it("renders the instruction, not a dashboard", async () => {
    renderIn(<FirstSession uid="test-uid" />);

    const card = await screen.findByTestId("first-session-card");
    expect(card).toHaveTextContent("Check one answer, and I'll know where you're losing marks.");
    expect(card).toHaveTextContent(
      "Pick a chapter you're working on, solve one question on paper, and photograph it.",
    );

    // ★ ONE next action, routed to the EXISTING Check & Improve surface with the
    // same source attribution every other Home card already appends.
    const cta = screen.getByTestId("first-session-cta");
    expect(cta).toHaveTextContent("Check my first answer");
    expect(cta.getAttribute("href")).toBe("/check-improve?source=home&returnTo=%2F");
  });

  it("says what already works on day one — Exam Trends and Practice", async () => {
    renderIn(<FirstSession uid="test-uid" />);

    const dayOne = await screen.findByTestId("first-session-day-one");
    expect(dayOne).toHaveTextContent("both work right now, with no history needed");
    expect(screen.getByTestId("first-session-trends").getAttribute("href")).toBe(
      "/exam-trends?source=home&returnTo=%2F",
    );
    expect(screen.getByTestId("first-session-practice").getAttribute("href")).toBe(
      "/practice-hub?source=home&returnTo=%2F",
    );
  });

  it("invents nothing — no counts, no progress, no percentages", async () => {
    renderIn(<FirstSession uid="test-uid" />);
    const card = await screen.findByTestId("first-session-card");
    expect(card.textContent ?? "").not.toMatch(/\d+\s*%/);
    expect(card.textContent ?? "").not.toMatch(/\b\d+\s*(marks|questions|attempts|days)\b/i);
  });
});

// ── 2 · A student WITH attempts does not — with a CONTROL ──────────────────
describe("2 · the start card is withheld once there is graded activity", () => {
  it("CONTROL: zero records → the card IS rendered", async () => {
    sessions.records = [];
    renderIn(<FirstSession uid="test-uid" />);
    expect(await screen.findByTestId("first-session-card")).toBeTruthy();
  });

  it("★ one graded record → the card is NOT rendered", async () => {
    sessions.records = ONE_RECORD;
    renderIn(<FirstSession uid="test-uid" />);

    // Wait for the read to actually complete, so this is not merely the
    // hydration window being observed.
    await waitFor(() => expect(sessions.reads).toBe(1));
    await Promise.resolve();
    expect(screen.queryByTestId("first-session-card")).toBeNull();
  });

  it("CONTROL: a signed-out visitor never sees it, and a signed-in one does", async () => {
    const { unmount } = renderIn(<FirstSession uid={null} />);
    expect(screen.queryByTestId("first-session-card")).toBeNull();
    expect(sessions.reads).toBe(0); // no uid → no read at all
    unmount();

    renderIn(<FirstSession uid="test-uid" />);
    expect(await screen.findByTestId("first-session-card")).toBeTruthy();
  });
});

// ── 3+4 · The name prompt is DEFERRED — asserted as an intentional absence ──
//
// §3 of the spec asked for a "What should I call you?" prompt. It is NOT
// shipped: `AuthContextType` exposes no `displayName` write path, and adding one
// breaks `AuthContext.passwordReset.test.tsx` (exact-equality key pin) plus ~20
// `vi.mock` factories. See [FU-AUTH-NAME-PROMPT].
//
// This is pinned so the omission is a RECORDED DECISION, not a silent gap: if
// someone later adds the prompt they must delete this test and say why.
describe("3+4 · the name prompt is deliberately absent (see [FU-AUTH-NAME-PROMPT])", () => {
  it("no name prompt renders for a student WITHOUT a displayName", async () => {
    authState.user = { uid: "test-uid", displayName: null };
    renderIn(<FirstSession uid="test-uid" />);

    // CONTROL: the card itself IS rendered, so the negative below is not vacuous.
    expect(await screen.findByTestId("first-session-card")).toBeTruthy();
    expect(screen.queryByText(/What should I call you\?/i)).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("nor for a Google student who already has one", async () => {
    authState.user = { uid: "test-uid", displayName: "Asha Rao" };
    renderIn(<FirstSession uid="test-uid" />);
    expect(await screen.findByTestId("first-session-card")).toBeTruthy();
    expect(screen.queryByText(/What should I call you\?/i)).toBeNull();
  });
});

// ── 5 · The MI panel says what it is waiting for, not zeroes ───────────────
describe("5 · Mistake Intelligence shows a waiting message, never hollow zeroes", () => {
  it("DesktopHome: em-dash placeholders and an explicit waiting message", async () => {
    renderIn(<DesktopHome />);
    const mi = await screen.findByTestId("home-mi-card");

    expect(mi).toHaveTextContent("Your mistake patterns will show here");
    expect(mi).toHaveTextContent("Built from your real attempts");
    expect(mi).toHaveTextContent("Practise a set to see your mistakes.");

    // ★ THE ANTI-ZERO ASSERTION. A panel of zeroes reads as "you have scored
    // nothing" rather than "there is nothing yet" — different messages to an
    // anxious student. Each of the four buckets must carry the placeholder.
    const buckets = screen.getAllByTestId("home-mi-bucket");
    expect(buckets).toHaveLength(4);
    for (const b of buckets) {
      const n = b.querySelector(".lt-n")?.textContent?.trim();
      expect(n).toBe("—");
      expect(n).not.toBe("0");
    }
  });

  it("MobileHome: same contract on the signed-in empty state", async () => {
    renderIn(<MobileHome />);
    const mi = await screen.findByTestId("mobile-home-mistake-panel");

    expect(mi).toHaveTextContent("Your mistake patterns will show here");
    const buckets = screen.getAllByTestId("mobile-home-mi-bucket");
    expect(buckets).toHaveLength(4);
    for (const b of buckets) {
      const n = b.querySelector(".lt-n")?.textContent?.trim();
      expect(n).toBe("—");
      expect(n).not.toBe("0");
    }
  });
});

// ── 6 · Renders on BOTH Home pages ─────────────────────────────────────────
describe("6 · the start card is wired into both Home pages", () => {
  it("DesktopHome renders it for a zero-attempt student, and withholds it otherwise", async () => {
    sessions.records = [];
    const first = renderIn(<DesktopHome />);
    expect(await screen.findByTestId("first-session-card")).toBeTruthy();
    first.unmount();
    cleanup();

    // ★ CONTROL PAIR — same page, same mount, one record.
    sessions.reads = 0;
    sessions.records = ONE_RECORD;
    renderIn(<DesktopHome />);
    await waitFor(() => expect(sessions.reads).toBe(1));
    await waitFor(() => expect(screen.queryByTestId("home-mi-card")).not.toBeNull());
    expect(screen.queryByTestId("first-session-card")).toBeNull();
  });

  it("MobileHome renders it for a zero-attempt student, and withholds it otherwise", async () => {
    sessions.records = [];
    const first = renderIn(<MobileHome />);
    expect(await screen.findByTestId("first-session-card")).toBeTruthy();
    first.unmount();
    cleanup();

    sessions.reads = 0;
    sessions.records = ONE_RECORD;
    renderIn(<MobileHome />);
    await waitFor(() => expect(sessions.reads).toBe(1));
    await waitFor(() => expect(screen.queryByTestId("mobile-home")).not.toBeNull());
    expect(screen.queryByTestId("first-session-card")).toBeNull();
  });

  it("it does NOT displace Home's own furniture on either page", async () => {
    renderIn(<DesktopHome />);
    expect(await screen.findByTestId("first-session-card")).toBeTruthy();
    expect(screen.getAllByTestId("home-hero")).toHaveLength(3); // + 1 tutor button
    expect(screen.getByTestId("home-hero-tutor")).toBeTruthy();
    expect(screen.getAllByTestId("home-quick-tile")).toHaveLength(4);
  });
});

// ── 7 · ★ HYDRATION — the condition that decides whether this PR is honest ──
//
// A returning student mid-hydration has NO local records yet but may have cloud
// records. Deciding "zero attempts" before the read completes would greet them
// as brand new. The component is TRI-state: "loading" renders nothing.
describe("7 · behaviour during hydration", () => {
  it("★ renders NOTHING while the graded-history read is still in flight", async () => {
    const gate = openGate();
    renderIn(<FirstSession uid="test-uid" />);

    // The read has started...
    await waitFor(() => expect(sessions.reads).toBe(1));
    // ...and nothing is on screen while it is open.
    expect(screen.queryByTestId("first-session-card")).toBeNull();

    // ★ CONTROL: the SAME mount renders the card the moment the read completes
    // empty — so the null above is the hydration gate, not a broken component.
    gate.resolve([]);
    expect(await screen.findByTestId("first-session-card")).toBeTruthy();
  });

  it("★ a returning student is never flashed the card — the read resolves non-empty", async () => {
    const gate = openGate();
    renderIn(<FirstSession uid="test-uid" />);
    await waitFor(() => expect(sessions.reads).toBe(1));
    expect(screen.queryByTestId("first-session-card")).toBeNull();

    gate.resolve(ONE_RECORD);
    await waitFor(() => expect(sessions.reads).toBe(1));
    await Promise.resolve();
    expect(screen.queryByTestId("first-session-card")).toBeNull();
  });

  it("a uid change re-enters the hydration window rather than reusing the verdict", async () => {
    sessions.records = [];
    const { rerender } = renderIn(<FirstSession uid="test-uid" />);
    expect(await screen.findByTestId("first-session-card")).toBeTruthy();

    // Switch accounts with the read held open — the previous account's "none"
    // must not carry over to an account whose history is unknown.
    openGate();
    rerender(
      <MemoryRouter>
        <FirstSession uid="other-uid" />
      </MemoryRouter>,
    );
    expect(screen.queryByTestId("first-session-card")).toBeNull();
  });

  it("an unreadable history stays silent rather than greeting a returning student as new", async () => {
    const mod = await import("../../services/sessionRecords");
    vi.mocked(mod.getSessionRecordsFromCloud).mockRejectedValueOnce(new Error("offline"));

    renderIn(<FirstSession uid="test-uid" />);
    await waitFor(() => expect(mod.getSessionRecordsFromCloud).toHaveBeenCalled());
    await Promise.resolve();
    expect(screen.queryByTestId("first-session-card")).toBeNull();

    // CONTROL: the very next successful empty read DOES render it.
    cleanup();
    renderIn(<FirstSession uid="test-uid" />);
    expect(await screen.findByTestId("first-session-card")).toBeTruthy();
  });
});
