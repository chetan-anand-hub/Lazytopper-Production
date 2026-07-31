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

  it("says what already works on day one — Exam Trends", async () => {
    renderIn(<FirstSession uid="test-uid" />);

    const dayOne = await screen.findByTestId("first-session-day-one");
    expect(dayOne).toHaveTextContent("works right now, with no history needed");
    expect(screen.getByTestId("first-session-trends").getAttribute("href")).toBe(
      "/exam-trends?source=home&returnTo=%2F",
    );
  });

  // ── ASSERTION 5 · BOTH doors, and the mutation that proves it ────────────
  //
  // ★ Mistake Intelligence is fed by FIVE surfaces (recordMistake has five
  // callers), so a single CTA would describe the product wrongly. M3 for this
  // lane is "drop the secondary CTA" — it goes red here.
  it("★ offers BOTH CTAs — check an answer, or practise a set", async () => {
    renderIn(<FirstSession uid="test-uid" />);
    await screen.findByTestId("first-session-card");

    const primary = screen.getByTestId("first-session-cta");
    expect(primary).toHaveTextContent("Check my first answer");
    expect(primary.getAttribute("href")).toBe("/check-improve?source=home&returnTo=%2F");

    const secondary = screen.getByTestId("first-session-practice");
    expect(secondary).toHaveTextContent("Or practise a set");
    expect(secondary.getAttribute("href")).toBe("/practice-hub?source=home&returnTo=%2F");
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
  // AUTH-2-FU §3: MI and the first-session card now share ONE slot, so the MI
  // empty state is what a student WITH graded attempts but no logged mistakes
  // sees. `records = ONE_RECORD` puts the page in exactly that state.
  it("DesktopHome: em-dash placeholders and an explicit waiting message", async () => {
    sessions.records = ONE_RECORD;
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
    sessions.records = ONE_RECORD;
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

// ── 8 · ★★ ONE CARD, ONE SLOT (AUTH-2-FU §3) ───────────────────────────────
//
// THE DEFECT THIS LANE EXISTS TO FIX. AUTH-2 mounted the first-session card
// ABOVE Home's empty Mistake-Intelligence state, so a zero-attempt student was
// told the same thing twice, in two cards, on one screen.
//
// ★ THESE ASSERT A COUNT, NOT AN EXISTENCE. `getByTestId(...)` is satisfied by
// one card whether or not a second is stacked above it; only a count can see
// the defect. M1 for this lane — re-render the MI card alongside the
// first-session card — turns these red and nothing else in the suite.
function homeCardCount(): number {
  return (
    screen.queryAllByTestId("first-session-card").length +
    screen.queryAllByTestId("home-mi-card").length +
    screen.queryAllByTestId("mobile-home-mistake-panel").length
  );
}

describe("8 · exactly ONE first-session / MI card, in ONE position", () => {
  it("★ DesktopHome · zero attempts → count is 1, and it is the first-session card", async () => {
    sessions.records = [];
    renderIn(<DesktopHome />);
    await screen.findByTestId("first-session-card");
    await waitFor(() => expect(sessions.reads).toBe(1));

    expect(homeCardCount()).toBe(1);
    expect(screen.queryByTestId("home-mi-card")).toBeNull();
  });

  it("★ DesktopHome · with attempts → count is STILL 1, now the MI card", async () => {
    sessions.records = ONE_RECORD;
    renderIn(<DesktopHome />);
    await screen.findByTestId("home-mi-card");
    await waitFor(() => expect(sessions.reads).toBe(1));

    expect(homeCardCount()).toBe(1);
    expect(screen.queryByTestId("first-session-card")).toBeNull();
  });

  it("★ MobileHome · zero attempts → count is 1, and it is the first-session card", async () => {
    sessions.records = [];
    renderIn(<MobileHome />);
    await screen.findByTestId("first-session-card");
    await waitFor(() => expect(sessions.reads).toBe(1));

    expect(homeCardCount()).toBe(1);
    expect(screen.queryByTestId("mobile-home-mistake-panel")).toBeNull();
  });

  it("★ MobileHome · with attempts → count is STILL 1, now the MI card", async () => {
    sessions.records = ONE_RECORD;
    renderIn(<MobileHome />);
    await screen.findByTestId("mobile-home-mistake-panel");
    await waitFor(() => expect(sessions.reads).toBe(1));

    expect(homeCardCount()).toBe(1);
    expect(screen.queryByTestId("first-session-card")).toBeNull();
  });

  // ── SAME SLOT, not merely "one of each somewhere on the page" ────────────
  //
  // ★ A count alone cannot tell "replaced the empty state" from "replaced
  // something else and deleted MI". This pins the POSITION: whichever card
  // renders, it is the SAME DOM position — between the hero grid and the quick
  // strip on desktop, and between the hero dots and the quick links on mobile.
  it("★ DesktopHome · both states occupy the SAME slot — after the heroes, before the quick strip", async () => {
    sessions.records = [];
    const zero = renderIn(<DesktopHome />);
    const firstCard = await screen.findByTestId("first-session-card");
    const heroZero = screen.getAllByTestId("home-hero")[0];
    const quickZero = screen.getAllByTestId("home-quick-tile")[0];
    // Node.DOCUMENT_POSITION_FOLLOWING === 4
    expect(heroZero.compareDocumentPosition(firstCard) & 4).toBe(4);
    expect(firstCard.compareDocumentPosition(quickZero) & 4).toBe(4);
    zero.unmount();
    cleanup();

    sessions.reads = 0;
    sessions.records = ONE_RECORD;
    renderIn(<DesktopHome />);
    const miCard = await screen.findByTestId("home-mi-card");
    const heroSome = screen.getAllByTestId("home-hero")[0];
    const quickSome = screen.getAllByTestId("home-quick-tile")[0];
    expect(heroSome.compareDocumentPosition(miCard) & 4).toBe(4);
    expect(miCard.compareDocumentPosition(quickSome) & 4).toBe(4);
  });

  it("★ MobileHome · both states occupy the SAME slot — after the heroes, before the quick links", async () => {
    sessions.records = [];
    const zero = renderIn(<MobileHome />);
    const firstCard = await screen.findByTestId("first-session-card");
    const heroZero = screen.getAllByTestId("mobile-home-destination")[0];
    const quickZero = screen.getAllByTestId("mobile-home-quick-link")[0];
    expect(heroZero.compareDocumentPosition(firstCard) & 4).toBe(4);
    expect(firstCard.compareDocumentPosition(quickZero) & 4).toBe(4);
    zero.unmount();
    cleanup();

    sessions.reads = 0;
    sessions.records = ONE_RECORD;
    renderIn(<MobileHome />);
    const miCard = await screen.findByTestId("mobile-home-mistake-panel");
    const heroSome = screen.getAllByTestId("mobile-home-destination")[0];
    const quickSome = screen.getAllByTestId("mobile-home-quick-link")[0];
    expect(heroSome.compareDocumentPosition(miCard) & 4).toBe(4);
    expect(miCard.compareDocumentPosition(quickSome) & 4).toBe(4);
  });

  // ── ASSERTION 2 · the greeting is not on the page body any more ──────────
  //
  // It moved INLINE into DesktopShell's header (§1/§2). This page must not
  // render a second one — DesktopShell.test.tsx owns the positive assertion
  // that the header carries it.
  // ★ CONTROL: the page IS rendered (the heroes prove it), so the negative is
  // not the vacuous pass of a page that failed to mount.
  it("★ DesktopHome renders NO greeting of its own — the header owns it now", async () => {
    sessions.records = ONE_RECORD;
    renderIn(<DesktopHome />);
    await screen.findByTestId("home-mi-card");

    expect(screen.getAllByTestId("home-hero").length).toBeGreaterThan(0); // CONTROL
    expect(screen.queryByText(/Good (morning|afternoon|evening)/)).toBeNull();
    // The card's other two elements went with it.
    expect(screen.queryByText(/CBSE · Maths & Science/)).toBeNull();
    expect(screen.queryByText(/^Signed in$/)).toBeNull();
  });
});
