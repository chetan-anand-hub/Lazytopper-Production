/**
 * LIMITS-1 PR-2 — Quick Practice "one graded set a day", client half, plus the limitsClient
 * additions (mintQp, claimDetail) and the wall copy.
 *
 * MUTATIONS: make the record-write effect ignore qpGate.status -> "PracticePage withholds the
 * saved record" RED; treat a 500 as blocked -> "fails open" RED; ignore the flag -> "dark" RED.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

vi.mock("../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../analytics/analytics")>();
  return { ...actual, trackNamedEvent: vi.fn(), trackPaywallAction: vi.fn(), trackDownload: vi.fn() };
});
const authState: { user: { uid: string } | null } = { user: { uid: "stu-1" } };
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: authState.user, loading: false }) }));
const subState = { isPremium: false, touched: 0 };
vi.mock("./useSubscription", () => ({
  useSubscription: () => {
    subState.touched += 1;
    return { isPremium: subState.isPremium };
  },
}));
vi.mock("../ai/paidCallHeaders", () => ({
  paidJsonHeaders: async () => ({ "Content-Type": "application/json", "X-Lazytopper-Uid": "stu-1", Authorization: "Bearer t" }),
}));

import * as analytics from "../analytics/analytics";
import { blockedPracticeCopy } from "../components/limits/limitsCopy";
import { claimDetail, mintQp, resetLimitsSummaryForTests } from "../services/limitsClient";

const here = path.dirname(fileURLToPath(import.meta.url));
const NOW = Date.parse("2026-11-02T06:00:00Z");
const trackNamed = analytics.trackNamedEvent as unknown as ReturnType<typeof vi.fn>;

function jsonRes(status: number, body: unknown): Response {
  return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) } as unknown as Response;
}

async function mountGate(active: boolean, flag: "1" | "") {
  vi.resetModules();
  vi.stubEnv("VITE_LIMITS_ENABLED", flag);
  const { useQpGate } = await import("./useQpGate");
  function Probe({ on }: { on: boolean }) {
    const g = useQpGate(on, "qp-5-abc");
    return (
      <div>
        <span data-testid="status">{g.status}</span>
        {g.wall}
      </div>
    );
  }
  return render(
    <MemoryRouter>
      <Probe on={active} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  authState.user = { uid: "stu-1" };
  subState.isPremium = false;
  subState.touched = 0;
  trackNamed.mockClear();
  resetLimitsSummaryForTests();
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("wall copy: the time is the server's, nothing is invented", () => {
  it("Basic and trial wording", () => {
    const b = blockedPracticeCopy("2026-11-02T18:30:00Z", NOW);
    expect(b.title).toBe("That was today's free practice set");
    expect(b.body).toMatch(/^Your next graded set opens /);
    expect(b.body).toContain("Every question and solution is still here to read.");
    expect(blockedPracticeCopy(null, NOW, "trial").title).toBe("You've used today's graded practice sets");
    expect(`${b.title} ${b.body}`).not.toMatch(/₹|seat|hurry|expires in|Gemini|Google/i);
  });
});

describe("limitsClient: mintQp and claimDetail", () => {
  it("flag off: no request", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    expect(await mintQp("k", true)).toEqual({ status: "off" });
    expect(await claimDetail("worksheet", "k", true)).toBe(true);
    expect(f).not.toHaveBeenCalled();
  });
  it("mintQp: 200 ok, 409 qp_limit blocked, 500 / throw open, offline offline, signed out signed_out", async () => {
    vi.stubEnv("VITE_LIMITS_ENABLED", "1");
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    f.mockResolvedValueOnce(jsonRes(200, { ok: true, counted: true, free: false }));
    f.mockResolvedValueOnce(jsonRes(200, { ok: true }));
    expect(await mintQp("k", true)).toEqual({ status: "ok", counted: true, free: false });
    f.mockResolvedValueOnce(jsonRes(409, { error: "qp_limit", resetAt: "2026-11-02T18:30:00Z", limit: 1, tier: "free" }));
    expect(await mintQp("k2", true)).toEqual({ status: "blocked", resetAt: "2026-11-02T18:30:00Z", limit: 1, tier: "free" });
    f.mockResolvedValueOnce(jsonRes(500, {}));
    expect((await mintQp("k3", true)).status).toBe("open");
    f.mockRejectedValueOnce(new Error("net"));
    expect((await mintQp("k4", true)).status).toBe("open");
    expect((await mintQp("k5", false)).status).toBe("signed_out");
    vi.stubGlobal("navigator", { onLine: false });
    f.mockRejectedValueOnce(new Error("net"));
    expect((await mintQp("k6", true)).status).toBe("offline");
  });
  it("claimDetail: unlocked false is the ONLY way to a lock", async () => {
    vi.stubEnv("VITE_LIMITS_ENABLED", "1");
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    f.mockResolvedValueOnce(jsonRes(200, { unlocked: false }));
    expect(await claimDetail("worksheet", "a", true)).toBe(false);
    f.mockResolvedValueOnce(jsonRes(200, { unlocked: true }));
    expect(await claimDetail("worksheet", "a", true)).toBe(true);
    f.mockResolvedValueOnce(jsonRes(500, { unlocked: false }));
    expect(await claimDetail("worksheet", "a", true)).toBe(true);
    f.mockRejectedValueOnce(new Error("net"));
    expect(await claimDetail("worksheet", "a", true)).toBe(true);
    expect(await claimDetail("worksheet", "a", false)).toBe(true);
  });
});

describe("useQpGate", () => {
  it("blocked: pending first, then blocked with the wall; closing the wall keeps it blocked; grade_blocked is tracked once", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonRes(409, { error: "qp_limit", resetAt: "2026-11-02T18:30:00Z", limit: 1, tier: "free" })));
    await mountGate(true, "1");
    expect(screen.getByTestId("status").textContent).toBe("pending");
    const wall = await screen.findByTestId("download-wall");
    expect(wall.getAttribute("data-flavor")).toBe("practice");
    expect(screen.getByTestId("status").textContent).toBe("blocked");
    expect(wall.textContent).toContain("That was today's free practice set");
    expect(trackNamed.mock.calls.filter((c) => c[0] === "grade_blocked")).toHaveLength(1);
    fireEvent.click(screen.getByText("Keep reading the set"));
    await waitFor(() => expect(screen.queryByTestId("download-wall")).toBeNull());
    expect(screen.getByTestId("status").textContent).toBe("blocked");
  });

  it("ok: opens; the request carries only the set key", async () => {
    const f = vi.fn().mockResolvedValue(jsonRes(200, { ok: true, counted: true, free: false }));
    vi.stubGlobal("fetch", f);
    await mountGate(true, "1");
    await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("open"));
    expect(f.mock.calls[0][0]).toBe("/api/usage/limits/qp");
    expect(JSON.parse(String((f.mock.calls[0][1] as RequestInit).body))).toEqual({ paperKey: "qp-5-abc" });
  });

  it("fails open on a 500 and on a thrown fetch", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonRes(500, {})));
    await mountGate(true, "1");
    await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("open"));
    cleanup();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("net")));
    await mountGate(true, "1");
    await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("open"));
  });

  it("no request while the scorecard is not up, for premium, or for a guest", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    await mountGate(false, "1");
    expect(screen.getByTestId("status").textContent).toBe("open");
    cleanup();
    subState.isPremium = true;
    await mountGate(true, "1");
    expect(screen.getByTestId("status").textContent).toBe("open");
    cleanup();
    subState.isPremium = false;
    authState.user = null;
    await mountGate(true, "1");
    expect(screen.getByTestId("status").textContent).toBe("open");
    expect(f).not.toHaveBeenCalled();
  });

  it("DARK: flag off is always open, no request, no subscription touched", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    await mountGate(true, "");
    expect(screen.getByTestId("status").textContent).toBe("open");
    expect(f).not.toHaveBeenCalled();
    expect(subState.touched).toBe(0);
  });
});

describe("PracticePage withholds the scorecard and the saved record while the gate is not open", () => {
  const t = readFileSync(path.join(here, "..", "pages", "PracticePage.tsx"), "utf8");
  it("the record-write effect, the scorecard render and the wall are all wired to qpGate", () => {
    expect(t).toMatch(/useQpGate\(showScorecard, qpSetKey\)/);
    expect(t).toMatch(/if \(qpGate\.status !== "open"\) return;\s*\n\s*const displayed = committedPoolSelection\.displayed;/);
    expect(t).toMatch(/if \(!showScorecard \|\| qpGate\.status !== "open"\) return null;/);
    expect(t).toMatch(/\{qpGate\.wall\}/);
    expect(t).toMatch(/sessionAnswers, qpGate\.status,/);
  });
  it("per-tap MCQ right/wrong is not behind the gate (it is marked in the browser, before any scorecard)", () => {
    const i = t.indexOf("const qpGate = useQpGate");
    const before = t.slice(0, i);
    expect(before).toContain("mcqResults");
  });
});
