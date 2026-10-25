/**
 * PACKS-LIMIT-1 — the client forwards a paper's coverage with the mint and treats `packOwned` as success.
 * MUTATIONS: drop `cover` from the mint body -> "forwards cover" RED; treat packOwned as blocked -> "success" RED;
 * drop the cover argument at any call site -> "call sites pass coverage" RED.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

vi.mock("../../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../analytics/analytics")>();
  return { ...actual, trackDownload: vi.fn(), trackPaywallAction: vi.fn() };
});
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: { uid: "stu-1" }, loading: false }) }));
vi.mock("../../hooks/useSubscription", () => ({ useSubscription: () => ({ isPremium: false, status: { tier: "free" } }) }));
vi.mock("../../ai/paidCallHeaders", () => ({
  paidJsonHeaders: async () => ({ "Content-Type": "application/json", "X-Lazytopper-Uid": "stu-1", Authorization: "Bearer t" }),
}));

import * as analytics from "../../analytics/analytics";
import { useLimitedDownload } from "../../hooks/useLimitedDownload";
import { worksheetCover } from "../worksheet/WorksheetGenerator";
import { mintDownload, resetLimitsSummaryForTests } from "../../services/limitsClient";

const here = path.dirname(fileURLToPath(import.meta.url));
const jsonRes = (status: number, body: unknown) =>
  ({ ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) }) as unknown as Response;
const mints = (f: ReturnType<typeof vi.fn>) => f.mock.calls.filter((c) => String(c[0]).endsWith("/limits/download"));
const bodyOf = (f: ReturnType<typeof vi.fn>, i = 0) => JSON.parse(String((mints(f)[i][1] as RequestInit).body));

beforeEach(() => {
  vi.stubEnv("VITE_LIMITS_ENABLED", "1");
  resetLimitsSummaryForTests();
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("mintDownload cover", () => {
  it("forwards cover when given; sends today's exact body when not", async () => {
    const f = vi.fn().mockResolvedValue(jsonRes(200, { ok: true, counted: true, free: false, remaining: 0, limit: 1, resetAt: null }));
    vi.stubGlobal("fetch", f);
    await mintDownload("worksheet", "k1", true, { chapters: ["triangles"] });
    expect(bodyOf(f, 0)).toEqual({ kind: "worksheet", paperKey: "k1", cover: { chapters: ["triangles"] } });
    await mintDownload("full-mock", "k2", true, { subject: "maths" });
    expect(bodyOf(f, 1).cover).toEqual({ subject: "maths" });
    await mintDownload("worksheet", "k3", true);
    expect(bodyOf(f, 2)).toEqual({ kind: "worksheet", paperKey: "k3" });
  });
  it("packOwned is an ok result and does not refresh the chip summary", async () => {
    const f = vi.fn().mockResolvedValue(jsonRes(200, { ok: true, counted: false, free: false, reused: false, packOwned: true, limit: 1, used: null }));
    vi.stubGlobal("fetch", f);
    const r = await mintDownload("chapter-test", "k", true, { chapters: ["circles"] });
    expect(r).toMatchObject({ status: "ok", counted: false, packOwned: true });
    expect(f).toHaveBeenCalledTimes(1); // no summary refresh follows
  });
});

describe("useLimitedDownload.guard cover", () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => <MemoryRouter>{children}</MemoryRouter>;
  it("forwards cover to the mint; a packOwned reply lets the download proceed with no wall", async () => {
    const f = vi.fn().mockResolvedValue(jsonRes(200, { ok: true, counted: false, free: false, packOwned: true, limit: 1 }));
    vi.stubGlobal("fetch", f);
    const { result } = renderHook(() => useLimitedDownload(), { wrapper });
    let ok = false;
    await act(async () => { ok = await result.current.guard("chapter-test", "ct-1", { chapters: ["triangles"] }); });
    expect(ok).toBe(true);
    expect(result.current.wall).toBeNull();
    expect(bodyOf(f).cover).toEqual({ chapters: ["triangles"] });
    expect(analytics.trackDownload).toHaveBeenCalledWith("chapter-test", "start");
  });
  it("an old caller with no cover is unchanged", async () => {
    const f = vi.fn().mockResolvedValue(jsonRes(200, { ok: true, counted: true, free: false, remaining: 0, limit: 1, resetAt: null }));
    vi.stubGlobal("fetch", f);
    const { result } = renderHook(() => useLimitedDownload(), { wrapper });
    await act(async () => { await result.current.guard("worksheet", "w"); });
    expect(bodyOf(f)).toEqual({ kind: "worksheet", paperKey: "w" });
  });
});

describe("★ call sites pass coverage", () => {
  const src = (rel: string) => readFileSync(path.join(here, "..", "..", rel), "utf8");
  it("worksheet, chapter test (x2), full mock (x2)", () => {
    expect(src("components/worksheet/WorksheetGenerator.tsx")).toMatch(/guardDownload\("worksheet", generated\.worksheetId, worksheetCover\(generated\.questions\)\)/);
    expect(src("pages/ChapterTestPage.tsx").match(/guardDownload\("chapter-test", paper\.worksheetId, chapterCover\(topicKey\)\)/g)?.length).toBe(2);
    expect(src("pages/FullMockPage.tsx").match(/guardDownload\("full-mock", paperForExport\.worksheetId, \{ subject: sessionSubject \}\)/g)?.length).toBe(2);
  });
});

describe("worksheetCover (F1)", () => {
  it("resolves every question's chapter; any unresolvable key (or no questions) sends no cover", () => {
    expect(worksheetCover([{ topicKey: "triangles" }, { topicKey: "triangles" }, { topicKey: "circles" }])?.chapters.sort()).toEqual(["circles", "triangles"]);
    expect(worksheetCover([{ topicKey: "triangles" }, { topicKey: "" }])).toBeUndefined();
    expect(worksheetCover([{ topicKey: "triangles" }, { topicKey: "   " }])).toBeUndefined();
    expect(worksheetCover([])).toBeUndefined();
  });
});
