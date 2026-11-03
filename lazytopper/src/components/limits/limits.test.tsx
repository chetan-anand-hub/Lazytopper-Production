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
  return { ...actual, trackDownload: vi.fn(), trackPaywallAction: vi.fn(), sendAnalyticsHit: vi.fn() };
});
const authState: { user: { uid: string } | null } = { user: { uid: "stu-1" } };
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: authState.user, loading: false }) }));
const subState = { isPremium: false, tier: "free", touched: 0 };
// PACKS-CONVERT-1 review fix 1: the wall's matching pack reads the student's owned packs (server) before offering one.
const ownedState = vi.hoisted(() => ({ packs: [] as Array<{ packId: string; sku: string; target: string }>, fail: false }));
vi.mock("../../services/packs", async (orig) => ({
  ...(await orig<typeof import("../../services/packs")>()),
  fetchMyPacks: async () => {
    if (ownedState.fail) throw new Error("down");
    return { packs: ownedState.packs, licensee: null, boardPassCredit: null };
  },
}));
vi.mock("../../hooks/useSubscription", () => ({ useSubscription: () => { subState.touched += 1; const tier = subState.isPremium ? "premium" : subState.tier; return { isPremium: tier === "premium" || tier === "trial", status: { tier } }; } }));
vi.mock("../../ai/paidCallHeaders", () => ({
  paidJsonHeaders: async () => (authState.user ? { "Content-Type": "application/json", "X-Lazytopper-Uid": authState.user.uid, Authorization: "Bearer t" } : { "Content-Type": "application/json" }),
}));

import * as analytics from "../../analytics/analytics";
import { useLimitedDownload } from "../../hooks/useLimitedDownload";
import {
  getLimitsSummary,
  MINT_TIMEOUT_MS,
  mintDownload,
  practiceSetPaperKey,
  refreshLimitsSummary,
  resetLimitsSummaryForTests,
} from "../../services/limitsClient";
import DownloadLimitWall from "./DownloadLimitWall";
import { resetOwnedPacksCache } from "../packs/useOwnedPacks";
import LimitChip from "./LimitChip";
import { blockedWallCopy, chipText, FIRST_FREE_CHIP, SIGNED_OUT_CHIP, wallOfferLines } from "./limitsCopy";

const track = analytics.trackDownload as unknown as ReturnType<typeof vi.fn>;
const here = path.dirname(fileURLToPath(import.meta.url));
const NOW = Date.parse("2026-11-02T06:00:00Z");

function jsonRes(status: number, body: unknown): Response {
  return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) } as unknown as Response;
}

beforeEach(() => {
  authState.user = { uid: "stu-1" };
  subState.isPremium = false;
  subState.tier = "free";
  subState.touched = 0;
  resetLimitsSummaryForTests();
  track.mockClear();
});
afterEach(() => {
  vi.useRealTimers();
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

describe("wall offer: the Board Pass is the only plan named (PRICE-FIXED-1)", () => {
  it("the data carries the Board Pass at its fixed price and nothing else - on both sides of the old founding close", () => {
    for (const [at, price, label] of [["2026-11-02T06:00:00Z", "₹1,917", "Founding member offer"], ["2026-12-02T06:00:00Z", "₹2,499", null]] as const) {
      const o = wallOfferLines(new Date(at));
      expect(Object.keys(o)).toEqual(["boardPass", "foundingLabel"]);
      expect(o.foundingLabel).toBe(label);
      expect(o.boardPass).toMatch(new RegExp(`^Board Pass ${price} till your boards \\(.+\\)$`));
      expect(o.boardPass).not.toMatch(/save|%|599|999|month/i);
    }
  });
  it("rendered wall: one Board Pass line, no month line, no founding line", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-02T10:00:00+05:30")); // before the founding deadline: the Board Pass is 1,917
    render(<MemoryRouter><DownloadLimitWall variant="blocked" resetAt={null} onClose={() => {}} /></MemoryRouter>);
    const lines = Array.from(screen.getByTestId("wall-offer").querySelectorAll("p")).map((p) => p.textContent || "");
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/^Founding member offer: Board Pass ₹1,917 till your boards/);
    expect(screen.queryByTestId("wall-offer-month")).toBeNull();
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
    expect(await mintDownload("worksheet", "k2", true)).toEqual({ status: "blocked", resetAt: "2026-11-09T06:00:00Z", limit: 1, tier: null });
    f.mockResolvedValueOnce(jsonRes(500, {}));
    expect((await mintDownload("worksheet", "k3", true)).status).toBe("open");
    f.mockRejectedValueOnce(new Error("net"));
    expect((await mintDownload("worksheet", "k4", true)).status).toBe("open");
    vi.stubGlobal("navigator", { onLine: false });
    f.mockRejectedValueOnce(new Error("net"));
    expect((await mintDownload("worksheet", "k5", true)).status).toBe("offline");
  });
  it("a hung server is abandoned after the timeout and the download is allowed (fail open)", async () => {
    vi.useFakeTimers();
    try {
      vi.stubEnv("VITE_LIMITS_ENABLED", "1");
      vi.stubGlobal("fetch", (_u: string, init?: { signal?: AbortSignal }) => new Promise((_res, rej) => {
        init?.signal?.addEventListener("abort", () => rej(new Error("aborted")));
      }));
      const p = mintDownload("worksheet", "k", true);
      await vi.advanceTimersByTimeAsync(MINT_TIMEOUT_MS + 10);
      expect(await p).toEqual({ status: "open" });
    } finally {
      vi.useRealTimers();
    }
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
  it("a trial student never reads Basic wording", () => {
    wrap(<DownloadLimitWall variant="blocked" resetAt="2026-11-07T10:40:00Z" tier="trial" onClose={() => {}} />);
    const text = screen.getByRole("dialog").textContent || "";
    expect(text).not.toMatch(/Basic|free download/i);
    expect(screen.getByRole("button", { name: "Maybe later" })).toBeTruthy();
  });
  it("focus is trapped: Tab from the last control wraps to the first, Shift+Tab back", () => {
    wrap(<DownloadLimitWall variant="blocked" onClose={() => {}} />);
    const buttons = screen.getAllByRole("button");
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
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

describe("LimitChip: trial students are metered by the server's word", () => {
  const counters = (o: Record<string, unknown>) => ({ metered: true, limit: 2, used: 0, remaining: 2, firstFreeAvailable: false, resetAt: null, ...o });
  it("trial: asks the server and shows the chip; paid premium asks nothing", async () => {
    vi.stubEnv("VITE_LIMITS_ENABLED", "1");
    subState.tier = "trial";
    const f = vi.fn().mockResolvedValue(jsonRes(200, { tier: "trial", enforced: true, download: counters({ used: 1, remaining: 1 }), qp: null, detailLocked: false }));
    vi.stubGlobal("fetch", f);
    render(<LimitChip />);
    expect((await screen.findByTestId("limit-chip")).textContent).toBe("1 of 2 downloads left this week");
    expect(f).toHaveBeenCalledTimes(1);
    cleanup();
    resetLimitsSummaryForTests();
    f.mockClear();
    subState.tier = "premium";
    expect(render(<LimitChip />).container.textContent).toBe("");
    expect(f).not.toHaveBeenCalled();
  });
  it("trial, server says not metered: no chip", async () => {
    vi.stubEnv("VITE_LIMITS_ENABLED", "1");
    subState.tier = "trial";
    const f = vi.fn().mockResolvedValue(jsonRes(200, { tier: "trial", enforced: true, download: counters({ metered: false, limit: null, remaining: null }), qp: null, detailLocked: false }));
    vi.stubGlobal("fetch", f);
    const { container } = render(<LimitChip />);
    await waitFor(() => expect(f).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 20));
    expect(container.textContent).toBe("");
  });
  it("flag off: nothing rendered, no request, for a trial account", async () => {
    subState.tier = "trial";
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    expect(render(<LimitChip />).container.textContent).toBe("");
    expect(f).not.toHaveBeenCalled();
  });
});

describe("useLimitedDownload.guard", () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => <MemoryRouter>{children}</MemoryRouter>;
  it("dark: true, no request, and the subscription / auth hooks are never touched", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    subState.touched = 0;
    const { result } = renderHook(() => useLimitedDownload(), { wrapper });
    expect(await result.current.guard("worksheet", () => { throw new Error("key must not be computed when dark"); })).toBe(true);
    expect(f).not.toHaveBeenCalled();
    expect(subState.touched).toBe(0);
    expect(result.current.wall).toBeNull();
  });
  it("live: blocked -> false + wall + analytics; 503 and a hung server fail open; ok -> start", async () => {
    vi.stubEnv("VITE_LIMITS_ENABLED", "1");
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    const { result } = renderHook(() => useLimitedDownload(), { wrapper });
    f.mockResolvedValueOnce(jsonRes(409, { error: "download_limit", resetAt: "2026-11-07T10:40:00Z", limit: 2, tier: "trial" }));
    let ok = true;
    await act(async () => { ok = await result.current.guard("chapter-test", "ct-1"); });
    expect(ok).toBe(false);
    expect(track).toHaveBeenCalledWith("chapter-test", "blocked");
    expect(track).toHaveBeenCalledWith("chapter-test", "wall_shown");
    expect(result.current.wall).not.toBeNull();
    f.mockResolvedValueOnce(jsonRes(503, {}));
    await act(async () => { ok = await result.current.guard("chapter-test", "ct-2"); });
    expect(ok).toBe(true);
    f.mockResolvedValueOnce(jsonRes(200, { ok: true, counted: true, free: false, remaining: 0, limit: 1, resetAt: null }));
    f.mockResolvedValue(jsonRes(200, { ok: true, tier: "free", enforced: true, download: null }));
    await act(async () => { ok = await result.current.guard("full-mock", () => "fm-1"); });
    expect(ok).toBe(true);
    expect(track).toHaveBeenCalledWith("full-mock", "start");
  });
  it("live trial: the server is asked; not metered -> true, no wall; at the limit -> false + wall; paid premium -> no request; flag off -> no request", async () => {
    vi.stubEnv("VITE_LIMITS_ENABLED", "1");
    subState.tier = "trial";
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    const { result } = renderHook(() => useLimitedDownload(), { wrapper });
    f.mockResolvedValueOnce(jsonRes(200, { ok: true, counted: false, free: false, metered: false }));
    f.mockResolvedValue(jsonRes(200, { ok: true, tier: "trial", enforced: true, download: null }));
    let ok = false;
    await act(async () => { ok = await result.current.guard("worksheet", "w-pre"); });
    expect(ok).toBe(true);
    expect(f.mock.calls.filter((c) => String(c[0]).endsWith("/limits/download")).length).toBe(1);
    expect(result.current.wall).toBeNull();
    f.mockResolvedValueOnce(jsonRes(409, { error: "download_limit", resetAt: "2026-11-07T10:40:00Z", limit: 2, tier: "trial" }));
    await act(async () => { ok = await result.current.guard("worksheet", "w-over"); });
    expect(ok).toBe(false);
    expect(result.current.wall).not.toBeNull();
    cleanup();
    f.mockClear();
    subState.tier = "premium";
    const paid = renderHook(() => useLimitedDownload(), { wrapper });
    await act(async () => { ok = await paid.result.current.guard("worksheet", "w-paid"); });
    expect(ok).toBe(true);
    expect(f).not.toHaveBeenCalled();
    cleanup();
    vi.stubEnv("VITE_LIMITS_ENABLED", "");
    subState.tier = "trial";
    const dark = renderHook(() => useLimitedDownload(), { wrapper });
    await act(async () => { ok = await dark.result.current.guard("worksheet", "w-dark"); });
    expect(ok).toBe(true);
    expect(f).not.toHaveBeenCalled();
  });
  it("live: a second tap while the first is asking is ignored (one request)", async () => {
    vi.stubEnv("VITE_LIMITS_ENABLED", "1");
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    let release: (r: Response) => void = () => {};
    f.mockReturnValueOnce(new Promise<Response>((res) => { release = res; }));
    f.mockResolvedValue(jsonRes(200, { ok: true, tier: "free", enforced: true, download: null }));
    const { result } = renderHook(() => useLimitedDownload(), { wrapper });
    let first!: Promise<boolean>;
    let second = true;
    await act(async () => {
      first = result.current.guard("worksheet", "w1");
      second = await result.current.guard("worksheet", "w1");
    });
    expect(second).toBe(false);
    await act(async () => { release(jsonRes(200, { ok: true, counted: false, free: true, remaining: 1, limit: 1, resetAt: null })); await first; });
    expect(f.mock.calls.filter((c) => String(c[0]).endsWith("/limits/download")).length).toBe(1);
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

describe("PACKS-ENTRY-1 (a) — download-limit wall pack link", () => {
  const FLAG_ON = () => vi.stubEnv("VITE_PACKS_ENABLED", "1");
  const FLAG_OFF = () => vi.stubEnv("VITE_PACKS_ENABLED", "");
  const packTrack = analytics.sendAnalyticsHit as unknown as ReturnType<typeof vi.fn>;
  beforeEach(() => packTrack.mockClear());
  const wall = (props: Partial<React.ComponentProps<typeof DownloadLimitWall>> = {}, at = "/notes/triangles") =>
    render(
      <MemoryRouter initialEntries={[at]}>
        <DownloadLimitWall variant="blocked" resetAt={null} onClose={() => {}} {...props} />
      </MemoryRouter>,
    );
  // PACKS-CONVERT-1: the wall now offers the MATCHING pack as a one-tap buy (/packs?buy=&t=), under the Board Pass actions, after
  // reading what the student already owns (lazy chunk: every assertion waits for it).
  beforeEach(() => {
    ownedState.packs = [];
    ownedState.fail = false;
    resetOwnedPacksCache();
  });
  const buyLink = async () => (await screen.findByTestId("wall-pack-buy")).querySelector("a")!;
  const own = (sku: string, target: string) => ({ packId: `${sku}:${target}`, sku, target });
  it("flag on: Board Pass actions first, then the one-tap buy of that chapter's pack; click fires download_wall", async () => {
    FLAG_ON();
    wall();
    const link = await screen.findByRole("link", { name: "Or get the Triangles Chapter Pack · ₹49" });
    expect(link.getAttribute("href")).toBe("/packs?buy=pack_chapter&t=triangles");
    const acts = document.querySelector(".lt-limit-acts")!;
    const line = screen.getByTestId("wall-pack-buy");
    expect(acts.compareDocumentPosition(line) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(link.className).toContain("lt-limit-btn--pack");
    expect(link.className).not.toContain("lt-limit-btn--primary");
    expect(screen.queryByTestId("wall-pack-link")).toBeNull(); // one pack offer, never two
    fireEvent.click(link);
    expect(packTrack).toHaveBeenCalledWith("event", { name: "pack_entry_click", data: { from: "download_wall" } });
  });
  it("chapter unknown -> the old plain packs link; explicit chapter prop wins", async () => {
    FLAG_ON();
    wall({}, "/practice-hub");
    expect((await screen.findByRole("link", { name: /PDF packs from/ })).getAttribute("href")).toBe("/pricing#packs");
    expect(screen.queryByTestId("wall-pack-buy")).toBeNull();
    cleanup();
    wall({ chapter: "circles" }, "/practice-hub");
    expect((await buyLink()).getAttribute("href")).toBe("/packs?buy=pack_chapter&t=circles");
  });
  it("Full Mock wall -> that subject's Mock Pack ₹99; a multi-topic page -> plain packs link; the trial wall gets the lighter text-button", async () => {
    FLAG_ON();
    wall({}, "/practice/10/maths/full-mock");
    expect((await buyLink()).getAttribute("href")).toBe("/packs?buy=pack_mock&t=maths");
    expect((await buyLink()).textContent).toBe("Or get the Maths Mock Pack · ₹99");
    cleanup();
    wall({}, "/worksheet");
    expect((await screen.findByRole("link", { name: /PDF packs from/ })).getAttribute("href")).toBe("/pricing#packs");
    cleanup();
    wall({ tier: "trial" }, "/notes/triangles");
    expect((await screen.findByTestId("wall-pack-buy")).className).toContain("lt-limit-pack--light");
    cleanup();
    wall({ tier: "free" }, "/notes/triangles");
    expect((await screen.findByTestId("wall-pack-buy")).className).not.toContain("--light");
  });
  it("PACK-LINKS-1: the guard's cover decides the pack, not the page address; several chapters of one subject fall back to the Subject Pack", async () => {
    FLAG_ON();
    wall({ cover: { chapters: ["circles"] } }, "/worksheet");
    expect((await buyLink()).getAttribute("href")).toBe("/packs?buy=pack_chapter&t=circles");
    cleanup();
    wall({ cover: { subject: "science" } }, "/practice-hub");
    expect((await buyLink()).getAttribute("href")).toBe("/packs?buy=pack_mock&t=science");
    cleanup();
    wall({ cover: { chapters: ["circles", "triangles"] } }, "/notes/triangles");
    expect((await buyLink()).getAttribute("href")).toBe("/packs?buy=pack_subject&t=maths");
    expect(screen.getByTestId("wall-pack-buy").getAttribute("data-fallback")).toBe("subject");
    cleanup();
    // chapters of BOTH subjects: no single matching pack -> the old plain packs link
    wall({ cover: { chapters: ["circles", "light-reflection-and-refraction"] } }, "/worksheet");
    expect((await screen.findByRole("link", { name: /PDF packs from/ })).getAttribute("href")).toBe("/pricing#packs");
  });
  it("review fix 3: a chapter paper whose chapter slugs are unknown is never offered the Mock Pack (subject pack instead)", async () => {
    FLAG_ON();
    wall({ cover: { chapters: ["not-a-chapter"], subject: "maths" } }, "/worksheet");
    expect((await buyLink()).getAttribute("href")).toBe("/packs?buy=pack_subject&t=maths");
  });
  it("a CBQ practice set (no cover) -> that subject's CBQ Pack ₹199", async () => {
    FLAG_ON();
    wall({}, "/practice?topic=triangles&style=cbq");
    expect((await buyLink()).getAttribute("href")).toBe("/packs?buy=pack_cbq&t=maths");
    expect((await buyLink()).textContent).toBe("Or get the Maths CBQ Pack · ₹199");
  });
  it("review fix 1: an owned match is never sold again - owned CBQ on a CBQ set; a chapter owned through the Bundle -> 'open My packs'", async () => {
    FLAG_ON();
    ownedState.packs = [own("pack_cbq", "maths")];
    wall({}, "/practice?topic=triangles&style=cbq");
    const owned = await screen.findByTestId("wall-pack-owned");
    expect(owned.querySelector("a")!.getAttribute("href")).toBe("/packs#my-packs");
    expect(owned.textContent).toBe("You own this pack — open My packs");
    expect(screen.queryByTestId("wall-pack-buy")).toBeNull();
    cleanup();
    resetOwnedPacksCache();
    ownedState.packs = [own("pack_bundle", "all")];
    wall({ cover: { chapters: ["circles"] } }, "/worksheet");
    expect((await screen.findByTestId("wall-pack-owned")).getAttribute("data-sku")).toBe("pack_chapter");
    expect(screen.queryByTestId("wall-pack-buy")).toBeNull();
  });
  it("review fix 1: when the ownership read fails, no specific pack is sold - the old generic link shows", async () => {
    FLAG_ON();
    ownedState.fail = true;
    wall();
    await screen.findByTestId("wall-pack-link");
    expect(screen.queryByTestId("wall-pack-buy")).toBeNull();
  });
  it("flag off, signed-out and practice variants: absent", async () => {
    FLAG_OFF();
    wall();
    await act(async () => {});
    expect(screen.queryByTestId("wall-pack-link")).toBeNull();
    cleanup();
    FLAG_ON();
    wall({ variant: "signed_out" });
    await act(async () => {});
    expect(screen.queryByTestId("wall-pack-link")).toBeNull();
    cleanup();
    wall({ flavor: "practice" });
    await act(async () => {});
    expect(screen.queryByTestId("wall-pack-link")).toBeNull();
  });
});


describe("WALL-KIND-1: the download kind beats the page address", () => {
  const FLAG_ON = () => vi.stubEnv("VITE_PACKS_ENABLED", "1");
  const wallK = (props: Partial<React.ComponentProps<typeof DownloadLimitWall>>, at: string) =>
    render(
      <MemoryRouter initialEntries={[at]}>
        <DownloadLimitWall variant="blocked" resetAt={null} onClose={() => {}} {...props} />
      </MemoryRouter>,
    );
  const link = async () => (await screen.findByTestId("wall-pack-buy")).querySelector("a")!;
  beforeEach(() => {
    ownedState.packs = [];
    ownedState.fail = false;
    resetOwnedPacksCache();
  });
  it("a CBQ set whose address has no cbq params still gets the CBQ Pack when the kind says CBQ", async () => {
    FLAG_ON();
    wallK({ kind: "practice-set", hint: { cbq: true, subject: "maths" } }, "/practice?topic=triangles");
    expect((await link()).getAttribute("href")).toBe("/packs?buy=pack_cbq&t=maths");
    cleanup();
    wallK({ kind: "practice-set", hint: { cbq: true, subject: "science" } }, "/practice");
    expect((await link()).getAttribute("href")).toBe("/packs?buy=pack_cbq&t=science");
  });
  it("a non-CBQ practice set is not offered the CBQ Pack; the address still works as fallback", async () => {
    FLAG_ON();
    wallK({ kind: "practice-set", hint: { cbq: false, subject: "maths" } }, "/practice?topic=triangles");
    expect((await link()).getAttribute("href")).toBe("/packs?buy=pack_chapter&t=triangles");
    cleanup();
    resetOwnedPacksCache();
    wallK({}, "/practice?topic=triangles&style=cbq");
    expect((await link()).getAttribute("href")).toBe("/packs?buy=pack_cbq&t=maths");
  });
  it("full mock -> Mock Pack from the kind and subject even when the address says nothing", async () => {
    FLAG_ON();
    wallK({ kind: "full-mock", hint: { subject: "science" } }, "/somewhere");
    expect((await link()).getAttribute("href")).toBe("/packs?buy=pack_mock&t=science");
    cleanup();
    resetOwnedPacksCache();
    wallK({ kind: "full-mock", cover: { subject: "maths" } }, "/somewhere");
    expect((await link()).getAttribute("href")).toBe("/packs?buy=pack_mock&t=maths");
  });
  it("the hook hands the kind and hint to the wall; PracticePage passes the CBQ flag", async () => {
    vi.stubEnv("VITE_LIMITS_ENABLED", "1");
    const f = vi.fn().mockResolvedValue(jsonRes(409, { error: "download_limit", resetAt: "2026-11-07T10:40:00Z", limit: 2, tier: "free" }));
    vi.stubGlobal("fetch", f);
    const { result } = renderHook(() => useLimitedDownload(), { wrapper: ({ children }: { children: React.ReactNode }) => <MemoryRouter initialEntries={["/practice"]}>{children}</MemoryRouter> });
    await act(async () => { await result.current.guard("practice-set", "k", undefined, { cbq: true, subject: "maths" }); });
    const w = result.current.wall as React.ReactElement<{ kind: string; hint: unknown }>;
    expect(w.props.kind).toBe("practice-set");
    expect(w.props.hint).toEqual({ cbq: true, subject: "maths" });
    const src = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "pages/PracticePage.tsx"), "utf8");
    expect(src).toMatch(/guardDownload\("practice-set",[^\n]*\{ cbq: cbqMode,/);
  });
});
