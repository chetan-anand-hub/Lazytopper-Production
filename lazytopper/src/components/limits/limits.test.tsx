/**
 * LIMITS-1 PR-1 — copy, client, wall, hook, and the five call sites.
 * MUTATIONS: drop a `guardDownload(` call from any site -> "each site calls the guard" RED;
 * make mintDownload ignore the flag -> "flag off makes no request" RED.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

vi.mock("../../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../analytics/analytics")>();
  return { ...actual, trackDownload: vi.fn(), trackPaywallAction: vi.fn() };
});
const authState: { user: { uid: string } | null } = { user: { uid: "stu-1" } };
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: authState.user, loading: false }) }));
const subState = { isPremium: false };
vi.mock("../../hooks/useSubscription", () => ({ useSubscription: () => ({ isPremium: subState.isPremium }) }));
vi.mock("../../ai/paidCallHeaders", () => ({
  paidJsonHeaders: async () => (authState.user ? { "Content-Type": "application/json", "X-Lazytopper-Uid": authState.user.uid, Authorization: "Bearer t" } : { "Content-Type": "application/json" }),
}));

import * as analytics from "../../analytics/analytics";
import { useLimitedDownload } from "../../hooks/useLimitedDownload";
import {
  getLimitsSummary,
  mintDownload,
  practiceSetPaperKey,
  refreshLimitsSummary,
  resetLimitsSummaryForTests,
} from "../../services/limitsClient";
import DownloadLimitWall from "./DownloadLimitWall";
import LimitChip from "./LimitChip";
import { blockedWallCopy, chipText, FIRST_FREE_CHIP, SIGNED_OUT_CHIP } from "./limitsCopy";

const track = analytics.trackDownload as unknown as ReturnType<typeof vi.fn>;
const here = path.dirname(fileURLToPath(import.meta.url));
const NOW = Date.parse("2026-11-02T06:00:00Z");

function jsonRes(status: number, body: unknown): Response {
  return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) } as unknown as Response;
}

beforeEach(() => {
  authState.user = { uid: "stu-1" };
  subState.isPremium = false;
  resetLimitsSummaryForTests();
  track.mockClear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("copy: numbers come from the server", () => {
  const base = { metered: true, limit: 2, used: 1, remaining: 1, firstFreeAvailable: false, resetAt: null };
  it("trial, basic, first free, spent, unmetered", () => {
    expect(chipText("trial", base, NOW)).toBe("1 of 2 downloads left this week");
    expect(chipText("free", { ...base, limit: 1, used: 0, remaining: 1 }, NOW)).toBe("Free download: 1 left this week");
    expect(chipText("free", { ...base, firstFreeAvailable: true }, NOW)).toBe(FIRST_FREE_CHIP);
    const spent = chipText("free", { ...base, limit: 1, used: 1, remaining: 0, resetAt: "2026-11-07T10:40:00Z" }, NOW);
    expect(spent).toMatch(/^Next free download: 4:10 pm on Sat 7 Nov$/);
    expect(chipText("free", { ...base, metered: false }, NOW)).toBeNull();
    expect(chipText("free", null, NOW)).toBeNull();
  });
  it("wall copy names the server's time, no countdown, no seat count, no rupee typed", () => {
    const c = blockedWallCopy("2026-11-07T10:40:00Z", NOW);
    expect(c.title).toBe("You've used this week's free download");
    expect(c.body).toContain("Your next free download opens 4:10 pm on Sat 7 Nov.");
    expect(`${c.title} ${c.body}`).not.toMatch(/₹|seat|left only|hurry|expires in/i);
  });
});

describe("limitsClient", () => {
  it("flag off makes no request at all", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    expect(await mintDownload("worksheet", "k", true)).toEqual({ status: "off" });
    await refreshLimitsSummary();
    expect(f).not.toHaveBeenCalled();
  });
  it("signed out: no request, status signed_out", async () => {
    vi.stubEnv("VITE_LIMITS_ENABLED", "1");
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    expect(await mintDownload("worksheet", "k", false)).toEqual({ status: "signed_out" });
    expect(f).not.toHaveBeenCalled();
  });
  it("200 ok, 409 download_limit, 500 and a thrown fetch fail open, offline is offline", async () => {
    vi.stubEnv("VITE_LIMITS_ENABLED", "1");
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    f.mockResolvedValueOnce(jsonRes(200, { ok: true, counted: true, free: false, remaining: 0, limit: 1, resetAt: "2026-11-09T06:00:00Z" }));
    f.mockResolvedValueOnce(jsonRes(200, { ok: true, tier: "free", enforced: true, download: { metered: true, limit: 1, used: 1, remaining: 0, firstFreeAvailable: false, resetAt: "2026-11-09T06:00:00Z" } }));
    expect((await mintDownload("worksheet", "k", true)).status).toBe("ok");
    await waitFor(() => expect(getLimitsSummary()?.download?.remaining).toBe(0));
    f.mockResolvedValueOnce(jsonRes(409, { error: "download_limit", resetAt: "2026-11-09T06:00:00Z", limit: 1 }));
    expect(await mintDownload("worksheet", "k2", true)).toEqual({ status: "blocked", resetAt: "2026-11-09T06:00:00Z", limit: 1 });
    f.mockResolvedValueOnce(jsonRes(500, {}));
    expect((await mintDownload("worksheet", "k3", true)).status).toBe("open");
    f.mockRejectedValueOnce(new Error("net"));
    expect((await mintDownload("worksheet", "k4", true)).status).toBe("open");
    vi.stubGlobal("navigator", { onLine: false });
    f.mockRejectedValueOnce(new Error("net"));
    expect((await mintDownload("worksheet", "k5", true)).status).toBe("offline");
  });
  it("practiceSetPaperKey is stable and order-free", () => {
    expect(practiceSetPaperKey(["b", "a", 3])).toBe(practiceSetPaperKey([3, "a", "b"]));
    expect(practiceSetPaperKey(["a"])).not.toBe(practiceSetPaperKey(["b"]));
  });
});

describe("DownloadLimitWall", () => {
  const wrap = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);
  it("blocked: dialog, server time, See plans while payments are dark, Keep using Basic closes", () => {
    const onClose = vi.fn();
    wrap(<DownloadLimitWall variant="blocked" resetAt="2026-11-07T10:40:00Z" onClose={onClose} />);
    const d = screen.getByRole("dialog");
    expect(d.textContent).toContain("You've used this week's free download");
    expect(screen.getByRole("button", { name: "See plans" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Keep using Basic" }));
    expect(onClose).toHaveBeenCalled();
  });
  it("signed out: sign-up link keeps the student on this page after login", () => {
    wrap(<DownloadLimitWall variant="signed_out" onClose={() => {}} />);
    expect(screen.getByRole("dialog").textContent).toContain("Sign up — your first download is free");
    expect(screen.getByRole("link", { name: "Sign up free" }).getAttribute("href")).toMatch(/^\/login\?redirect=/);
  });
  it("offline variant is calm", () => {
    wrap(<DownloadLimitWall variant="offline" onClose={() => {}} />);
    expect(screen.getByRole("dialog").textContent).toContain("Connect to download");
  });
});

describe("LimitChip", () => {
  it("renders nothing with the flag off or for Premium; shows signed-out invitation", () => {
    const { container } = render(<LimitChip />);
    expect(container.textContent).toBe("");
    vi.stubEnv("VITE_LIMITS_ENABLED", "1");
    subState.isPremium = true;
    expect(render(<LimitChip />).container.textContent).toBe("");
    subState.isPremium = false;
    authState.user = null;
    cleanup();
    expect(render(<LimitChip />).container.textContent).toBe(SIGNED_OUT_CHIP);
  });
});

describe("useLimitedDownload.guard", () => {
  it("flag off or premium: true with no request; blocked: false + wall + analytics; fail open: true", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    const { result, rerender } = renderHook(() => useLimitedDownload(), { wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter> });
    expect(await result.current.guard("worksheet", "k")).toBe(true);
    expect(f).not.toHaveBeenCalled();

    vi.stubEnv("VITE_LIMITS_ENABLED", "1");
    f.mockResolvedValueOnce(jsonRes(409, { error: "download_limit", resetAt: "2026-11-07T10:40:00Z", limit: 1 }));
    let ok = true;
    await act(async () => { ok = await result.current.guard("chapter-test", "ct-1"); });
    rerender();
    expect(ok).toBe(false);
    expect(track).toHaveBeenCalledWith("chapter-test", "blocked");
    expect(track).toHaveBeenCalledWith("chapter-test", "wall_shown");
    expect(result.current.wall).not.toBeNull();

    f.mockResolvedValueOnce(jsonRes(503, {}));
    await act(async () => { ok = await result.current.guard("chapter-test", "ct-2"); });
    expect(ok).toBe(true);

    f.mockResolvedValueOnce(jsonRes(200, { ok: true, counted: true, free: false, remaining: 0, limit: 1, resetAt: null }));
    f.mockResolvedValue(jsonRes(200, { ok: true, tier: "free", enforced: true, download: null }));
    await act(async () => { ok = await result.current.guard("full-mock", "fm-1"); });
    expect(ok).toBe(true);
    expect(track).toHaveBeenCalledWith("full-mock", "start");
  });
});

describe("★ every counted download site calls the guard (MOUNT != LIVE)", () => {
  const src = (rel: string) => readFileSync(path.join(here, "..", "..", rel), "utf8");
  const sites: Array<[string, string, number]> = [
    ["components/worksheet/WorksheetGenerator.tsx", 'guardDownload("worksheet"', 1],
    ["pages/ChapterTestPage.tsx", 'guardDownload("chapter-test"', 2],
    ["pages/FullMockPage.tsx", 'guardDownload("full-mock"', 2],
    ["pages/PracticePage.tsx", 'guardDownload("practice-set"', 1],
    ["pages/app/WorksheetReady.tsx", 'guardDownload("practice-set"', 1],
  ];
  it.each(sites)("%s", (file, needle, n) => {
    const s = src(file);
    expect(s.split(needle).length - 1).toBe(n);
    // the guard comes BEFORE the PDF build in the same function
    for (const m of s.matchAll(/guardDownload\("[a-z-]+"/g)) {
      const after = s.slice(m.index!, m.index! + 600);
      expect(after).toMatch(/exportWorksheetPdf|downloadWorksheet|setDownloading|setDownloadError/);
    }
  });
  it("graded reports and notes are NOT counted downloads", () => {
    for (const f of ["components/results/SurfaceHistory.tsx", "components/notes/Note.tsx", "components/worksheet/WorksheetGradePanel.tsx"]) {
      expect(src(f)).not.toMatch(/guardDownload|useLimitedDownload/);
    }
  });
  it("no inline style objects and no console.log in the new files", () => {
    for (const f of ["components/limits/LimitChip.tsx", "components/limits/DownloadLimitWall.tsx", "hooks/useLimitedDownload.tsx", "services/limitsClient.ts"]) {
      const s = src(f);
      expect(s).not.toMatch(/style=\{\{/);
      expect(s).not.toMatch(/console\.log/);
    }
  });
});
