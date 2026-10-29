import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

/** PACK-LINKS-1 — the paper-open cap walls lead with the Board Pass and end with the matching pack link. */
let trialExpired = false;
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: { uid: "u1" }, loading: false }) }));
vi.mock("../../hooks/useSubscription", () => ({
  useSubscription: () => ({ tier: "free", isPremium: false, isTrialActive: false, isTrialExpired: trialExpired, daysLeftInTrial: 0, status: { tier: "free" } }),
}));

import { MockViewGate } from "./MockViewGate";
import { SIGNED_IN_DAILY_MOCK_LIMIT } from "../../config/mockViewLimits";

const gate = (path: string) => (
  <MemoryRouter initialEntries={[path]}>
    <MockViewGate><div>paper</div></MockViewGate>
  </MemoryRouter>
);

/** Spends the day's allowance through real visits (the gate counts per mount), then shows the wall. */
async function wallAt(path: string) {
  for (let i = 0; i < SIGNED_IN_DAILY_MOCK_LIMIT; i++) render(gate(path)).unmount();
  render(gate(path));
  return screen.findByTestId("paper-cap-ask");
}

const SLOW = { timeout: 5000 };

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  trialExpired = false;
  vi.stubEnv("VITE_PACKS_ENABLED", "1");
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe.each([
  ["Basic cap wall", false],
  ["trial-ended wall", true],
])("%s", (_name, expired) => {
  it("Board Pass price first, month pass second, Mock Pack link last on a Full Mock", async () => {
    trialExpired = expired;
    const ask = await wallAt("/full-mock/10/maths");
    const pack = await screen.findByRole("link", { name: "Mock Pack ₹99 →" }, SLOW);
    const links = Array.from(ask.querySelectorAll("a"));
    expect(links[0].getAttribute("data-testid")).toBe("paper-cap-boardpass");
    expect(links[0].textContent).toMatch(/^Board Pass/);
    expect(links[0].textContent).toMatch(/₹\d/);
    expect(links[0].getAttribute("href")).toMatch(/^\/pricing\?source=paper-cap&returnTo=/);
    expect(links[1].getAttribute("data-testid")).toBe("paper-cap-month");
    expect(pack.getAttribute("href")).toBe("/pricing?mock=maths#packs");
    expect(links[links.length - 1]).toBe(pack);
  });
  it("Chapter Test -> Chapter Pack of that chapter; other route -> plain /packs", async () => {
    trialExpired = expired;
    await wallAt("/chapter-test/10/maths/triangles");
    expect((await screen.findByRole("link", { name: "Chapter Pack ₹49 →" }, SLOW)).getAttribute("href")).toBe("/pricing?chapter=triangles#packs");
    cleanup();
    localStorage.clear();
    await wallAt("/mock-paper/some-paper");
    expect((await screen.findByRole("link", { name: "PDF packs from ₹49 →" }, SLOW)).getAttribute("href")).toBe("/pricing#packs");
  });
});
