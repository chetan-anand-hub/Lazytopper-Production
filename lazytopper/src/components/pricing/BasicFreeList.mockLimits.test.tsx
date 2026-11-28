/**
 * FRICTION-FIX-1 · F2 (owner ruling R3) — the Basic list's mock-papers row states
 * MockViewGate's real daily limits, IMPORTED from the import-free config/mockViewLimits.ts.
 *
 * ★ THE CYCLE PIN. MockViewGate imports UpgradeModal, which imports BasicFreeList. If the
 * limits lived in MockViewGate (and BasicFreeList imported them from there), loading
 * MockViewGate FIRST evaluated the row as "Mock papers: undefined a day …" (measured in
 * this lane). This file imports MockViewGate BEFORE anything else from the app, which is
 * the order that exposed it, and asserts the rendered list says 1 and 3, never undefined.
 *
 * Mutation this file turns RED: put the two constants back into MockViewGate (declared
 * there, BasicFreeList importing them from MockViewGate).
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, cleanup } from "@testing-library/react";

vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: null, loading: false }) }));
vi.mock("../../hooks/useSubscription", () => ({ useSubscription: () => ({}) }));

// ★ MockViewGate FIRST — the evaluation order that exposed the cycle.
import { MockViewGate } from "../auth/MockViewGate";
import { BasicFreeList, BASIC_FREE_LABELS, FREE_FEATURES } from "./BasicFreeList";
import { ANON_DAILY_MOCK_LIMIT, FIRST_TEST_FREE_LINE, FREE_TS_WEEKLY_SIGNED_IN, FREE_TS_WEEKLY_SIGNED_OUT, SIGNED_IN_DAILY_MOCK_LIMIT } from "../../config/mockViewLimits";
import { FREE_TESTS_ALLOWED } from "../../lib/testSeries/seriesAccess";

const read = (rel: string) => readFileSync(resolve(process.cwd(), rel), "utf8");
// GUEST-WALL (owner ruling 26 Nov 2026, 22:43 IST) retires D114's "Open or download ... — written answers not checked": opens only.
const ROW = "Open 3 Test Series papers a week (1 when signed out)";
const FIRST = "Your first test is free, marking included.";

afterEach(() => cleanup());

describe("F2 — the mock-papers row, with MockViewGate loaded first", () => {
  it("MockViewGate really was evaluated before the list (the order under test)", () => {
    expect(MockViewGate).toBeTypeOf("function");
  });

  it("★ the rendered Basic list says 1 and 3 — never 'undefined'", () => {
    const { getByTestId } = render(<BasicFreeList />);
    const text = getByTestId("basic-free-list").textContent || "";
    expect(text).toContain(ROW);
    expect(text).toContain(FIRST);
    expect(text).not.toMatch(/undefined/);
    // GUEST-WALL: the rendered list states no download and no written-answer checking as a Basic allowance.
    expect(text).not.toMatch(/download|not checked|checking|answer check/i);
  });

  it("the row is included, and the lock list carries it", () => {
    const row = FREE_FEATURES.find((f) => f.label.startsWith("Open "));
    expect(row).toEqual({ label: ROW, included: true });
    expect(BASIC_FREE_LABELS).toContain(ROW);
    expect(BASIC_FREE_LABELS).toContain(FIRST);
    expect(FREE_FEATURES.some((f) => /download/i.test(f.label))).toBe(false);
    expect(FREE_FEATURES.some((f) => /Full mocks and predicted-question execution/.test(f.label))).toBe(false);
  });

  it("the numbers are the gate's own limits", () => {
    expect(ANON_DAILY_MOCK_LIMIT).toBe(1);
    expect(SIGNED_IN_DAILY_MOCK_LIMIT).toBe(3);
    // FREE-TS-WEEKLY (27 Nov 2026): Basic's stated allowance is the weekly Test Series one
    expect(FREE_TS_WEEKLY_SIGNED_IN).toBe(3);
    expect(FREE_TS_WEEKLY_SIGNED_OUT).toBe(1);
  });

  it("GUEST-WALL: 'Your first test is free' is true only while FREE_TESTS_ALLOWED is 1 (a change here needs a copy review)", () => {
    expect(FIRST_TEST_FREE_LINE).toBe(FIRST);
    expect(FREE_TESTS_ALLOWED).toBe(1);
  });
});

describe("F2 — one source, no literal, no cycle", () => {
  it("config/mockViewLimits.ts imports nothing", () => {
    expect(read("src/config/mockViewLimits.ts")).not.toMatch(/^\s*import\s/m);
  });

  it("MockViewGate IMPORTS the limits and does not declare them", () => {
    const src = read("src/components/auth/MockViewGate.tsx");
    expect(src).toMatch(/import \{[^}]*SIGNED_IN_DAILY_MOCK_LIMIT[^}]*\} from "\.\.\/\.\.\/config\/mockViewLimits";/);
    expect(src).not.toMatch(/\b(const|let|var)\s+(ANON|SIGNED_IN)_DAILY_MOCK_LIMIT\b/);
  });

  it("BasicFreeList imports them from the config module (never from a component) and types no 1 or 3 in the row", () => {
    const src = read("src/components/pricing/BasicFreeList.tsx");
    expect(src).toMatch(/from "\.\.\/\.\.\/config\/mockViewLimits";/);
    expect(src).not.toMatch(/from "\.\.\/auth\//);
    expect(src).toMatch(/\{ label: BASIC_PAPERS_ROW, included: true \}/);
    // the row's one source (import-free mockViewLimits.ts) interpolates the constants
    const cfg = read("src/config/mockViewLimits.ts");
    const at = cfg.indexOf("export const BASIC_PAPERS_ROW_DAILY");
    const line = cfg.slice(at, cfg.indexOf("\n", at));
    expect(line).toContain("${ANON_DAILY_MOCK_LIMIT}");
    expect(line).toContain("${SIGNED_IN_DAILY_MOCK_LIMIT}");
    expect(line).not.toMatch(/\b[13]\b/);
    // FREE-TS-WEEKLY: the weekly wording interpolates its own constants, no digit typed beside it
    const weekly = cfg.slice(cfg.indexOf("export const BASIC_PAPERS_ROW ="), cfg.indexOf("/** The compare table"));
    expect(weekly).toContain("${FREE_TS_WEEKLY_SIGNED_IN}");
    expect(weekly).toContain("${FREE_TS_WEEKLY_SIGNED_OUT}");
    expect(weekly.replace(/\$\{[A-Z_]+\}/g, "")).not.toMatch(/\b[13]\b/);
  });
});
