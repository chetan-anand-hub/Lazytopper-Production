// FAIRUSE-TS-OWNER-1 - the pure decision "is the trial paper wall for this student?" and the panel's Board Pass line for a
// Test Series owner (the upgrade, never the full price).

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { paperWallVerdict, type PaperWallVerdict } from "./fairUseGate";
import FairUseLimitPanel, { TS_OWNER_BOARD_PASS_LINE } from "./FairUseLimitPanel";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

const base = { disabled: false, paidPremium: false, seriesPaper: true, ownsSeries: false, checking: false, failed: false };

describe("paperWallVerdict", () => {
  const cases: Array<[string, Partial<typeof base>, PaperWallVerdict]> = [
    ["Board Pass holder, fresh paper", { paidPremium: true, seriesPaper: false }, "exempt"],
    ["Board Pass holder, series paper", { paidPremium: true }, "exempt"],
    ["Test Series owner, series paper", { ownsSeries: true }, "exempt"],
    ["Test Series owner, FRESH paper -> today's check", { ownsSeries: true, seriesPaper: false }, "check"],
    ["series paper, ownership still loading", { checking: true }, "wait"],
    ["series paper, ownership read failed", { failed: true }, "unconfirmed"],
    ["fresh paper, ownership loading -> today's check", { seriesPaper: false, checking: true }, "check"],
    ["non-owner, series paper", {}, "check"],
    ["kill switch: owner", { disabled: true, ownsSeries: true }, "check"],
    ["kill switch: Board Pass holder", { disabled: true, paidPremium: true }, "check"],
  ];
  for (const [name, over, want] of cases) {
    it(name, () => expect(paperWallVerdict({ ...base, ...over })).toBe(want));
  }
});

const LIMIT = { tier: "trial" as const, scope: "full-mock" as const, resetAt: new Date(Date.now() + 86400000).toISOString(), window: null, allowance: 1 };

describe("FairUseLimitPanel · tsOwner", () => {
  it("a Test Series owner reads 'Upgrade to the Board Pass →' - no figure", () => {
    render(<MemoryRouter><FairUseLimitPanel limit={LIMIT} tsOwner /></MemoryRouter>);
    const line = screen.getByTestId("fair-use-board-pass");
    expect(line.textContent).toBe(TS_OWNER_BOARD_PASS_LINE);
    expect(line.textContent).not.toMatch(/₹|\d/);
  });

  it("everyone else keeps today's priced Board Pass line", () => {
    render(<MemoryRouter><FairUseLimitPanel limit={LIMIT} /></MemoryRouter>);
    expect(screen.getByTestId("fair-use-board-pass").textContent).not.toBe(TS_OWNER_BOARD_PASS_LINE);
  });

  it("kill switch VITE_FAIRUSE_TS_OWNER_EXEMPT_DISABLED=1: the owner gets today's line", () => {
    vi.stubEnv("VITE_FAIRUSE_TS_OWNER_EXEMPT_DISABLED", "1");
    render(<MemoryRouter><FairUseLimitPanel limit={LIMIT} tsOwner /></MemoryRouter>);
    expect(screen.getByTestId("fair-use-board-pass").textContent).not.toBe(TS_OWNER_BOARD_PASS_LINE);
  });
});
