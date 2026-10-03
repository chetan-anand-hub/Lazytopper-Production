/**
 * FRICTION-FIX-1 · F3 (FU-UPGRADE-MODAL-NO-BASIC-EXIT) — the upgrade modal offers a way to
 * stay on Basic, and says what Basic includes, under the Premium list. The Premium list and
 * the plan button are unchanged.
 *
 * Mutations this file turns RED: drop the "Keep using Basic" button; point it at the plan
 * navigation instead of a close; drop <BasicFreeList /> from the modal.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, fireEvent, screen, within } from "@testing-library/react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

const H = vi.hoisted(() => ({
  sub: { isTrialExpired: false, daysLeftInTrial: 0, isTrialActive: false, tier: "free" as string },
}));
vi.mock("../hooks/useSubscription", () => ({ useSubscription: () => H.sub }));

import { UpgradeModal } from "./UpgradeModal";
import { getPremiumFeatureList } from "../services/featureGates";
import { BASIC_FREE_LABELS } from "./pricing/BasicFreeList";

function mount(onClose = vi.fn()) {
  window.history.pushState({}, "", "/app/practice");
  const utils = render(
    <BrowserRouter basename="/app">
      <Routes>
        <Route path="/practice" element={<UpgradeModal open onClose={onClose} featureLabel="Exam Simulation" />} />
        <Route path="/pricing" element={<p>PRICING PAGE</p>} />
      </Routes>
    </BrowserRouter>,
  );
  return { ...utils, onClose };
}

afterEach(() => {
  cleanup();
  H.sub = { isTrialExpired: false, daysLeftInTrial: 0, isTrialActive: false, tier: "free" };
  window.history.pushState({}, "", "/");
});

describe("F3 — 'Keep using Basic'", () => {
  it("is a button that closes the modal and navigates nowhere", () => {
    const { onClose } = mount();
    const keep = screen.getByRole("button", { name: "Keep using Basic" });
    fireEvent.click(keep);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(window.location.pathname).toBe("/app/practice");
    expect(screen.queryByText("PRICING PAGE")).toBeNull();
  });

  it("CONTROL — the plan button still goes to /pricing (so the close above is a real difference)", () => {
    const { onClose } = mount();
    fireEvent.click(screen.getByRole("button", { name: "View Plans" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(window.location.pathname).toBe("/app/pricing");
  });

  it("an expired trial still sees 'Choose Plan' AND 'Keep using Basic'", () => {
    H.sub = { isTrialExpired: true, daysLeftInTrial: 0, isTrialActive: false, tier: "free" };
    mount();
    expect(screen.getByRole("button", { name: "Choose Plan" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Keep using Basic" })).toBeInTheDocument();
  });
});

describe("F3 — the shared Basic list, under the Premium list", () => {
  it("shows 'Free on Basic:' with every included Basic row", () => {
    mount();
    const list = screen.getByTestId("basic-free-list");
    expect(list.textContent).toContain("Free on Basic:");
    for (const label of BASIC_FREE_LABELS) expect(within(list).getByText(label)).toBeInTheDocument();
  });

  it("the Premium list is unchanged and comes BEFORE the Basic list", () => {
    const { container } = mount();
    const premiumHeading = screen.getByText("Premium includes:");
    const premiumList = premiumHeading.nextElementSibling as HTMLElement;
    const rows = Array.from(premiumList.querySelectorAll("li")).map((li) => li.textContent);
    expect(rows).toEqual(getPremiumFeatureList().map((f) => `✓${f.label}`));
    const basic = screen.getByTestId("basic-free-list");
    expect(premiumList.compareDocumentPosition(basic) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // and the Basic list sits before the plan button
    const plan = within(container).getByRole("button", { name: "View Plans" });
    expect(basic.compareDocumentPosition(plan) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("the Basic list inside the always-light modal re-declares the light tokens", () => {
    const { container } = mount();
    const css = Array.from(container.querySelectorAll("style")).map((s) => s.textContent).join("\n");
    expect(css).toMatch(/\.lt-upgrade__basic\s*\{[^}]*--text:\s*#1e293b/);
    expect(screen.getByTestId("basic-free-list").closest(".lt-upgrade__basic")).not.toBeNull();
  });
});
