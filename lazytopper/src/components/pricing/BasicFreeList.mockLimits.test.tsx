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
import { ANON_DAILY_MOCK_LIMIT, SIGNED_IN_DAILY_MOCK_LIMIT } from "../../config/mockViewLimits";

const read = (rel: string) => readFileSync(resolve(process.cwd(), rel), "utf8");
const ROW = "Mock papers: 1 a day signed out, 3 a day with a free account";

afterEach(() => cleanup());

describe("F2 — the mock-papers row, with MockViewGate loaded first", () => {
  it("MockViewGate really was evaluated before the list (the order under test)", () => {
    expect(MockViewGate).toBeTypeOf("function");
  });

  it("★ the rendered Basic list says 1 and 3 — never 'undefined'", () => {
    const { getByTestId } = render(<BasicFreeList />);
    const text = getByTestId("basic-free-list").textContent || "";
    expect(text).toContain(ROW);
    expect(text).not.toMatch(/undefined/);
  });

  it("the row is included, and the lock list carries it", () => {
    const row = FREE_FEATURES.find((f) => f.label.startsWith("Mock papers"));
    expect(row).toEqual({ label: ROW, included: true });
    expect(BASIC_FREE_LABELS).toContain(ROW);
    expect(FREE_FEATURES.some((f) => /Full mocks and predicted-question execution/.test(f.label))).toBe(false);
  });

  it("the numbers are the gate's own limits", () => {
    expect(ANON_DAILY_MOCK_LIMIT).toBe(1);
    expect(SIGNED_IN_DAILY_MOCK_LIMIT).toBe(3);
  });
});

describe("F2 — one source, no literal, no cycle", () => {
  it("config/mockViewLimits.ts imports nothing", () => {
    expect(read("src/config/mockViewLimits.ts")).not.toMatch(/^\s*import\s/m);
  });

  it("MockViewGate IMPORTS the limits and does not declare them", () => {
    const src = read("src/components/auth/MockViewGate.tsx");
    expect(src).toMatch(/import \{ ANON_DAILY_MOCK_LIMIT, SIGNED_IN_DAILY_MOCK_LIMIT \} from "\.\.\/\.\.\/config\/mockViewLimits";/);
    expect(src).not.toMatch(/\b(const|let|var)\s+(ANON|SIGNED_IN)_DAILY_MOCK_LIMIT\b/);
  });

  it("BasicFreeList imports them from the config module (never from a component) and types no 1 or 3 in the row", () => {
    const src = read("src/components/pricing/BasicFreeList.tsx");
    expect(src).toMatch(/from "\.\.\/\.\.\/config\/mockViewLimits";/);
    expect(src).not.toMatch(/from "\.\.\/auth\//);
    const at = src.indexOf("Mock papers:");
    const line = src.slice(at, src.indexOf("\n", at));
    expect(line).toContain("${ANON_DAILY_MOCK_LIMIT}");
    expect(line).toContain("${SIGNED_IN_DAILY_MOCK_LIMIT}");
    expect(line).not.toMatch(/\b[13]\b/);
  });
});
