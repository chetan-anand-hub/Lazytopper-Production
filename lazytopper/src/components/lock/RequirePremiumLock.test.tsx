/**
 * LOCK-SELL-1 (owner, 4 Nov 2026) - the full-page Premium lock (RequirePremium) leads with the Board Pass and its star features;
 * Basic is ONE quiet "Continue with Basic". Matrix: {Answer Checker, Worksheet marking, Ask the tutor} x {trial-eligible, trial ended}
 * x {pack owner, not} x {payments on, off}. Plus: the exit, the price from config, CSS classes only, no refund wording.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

const S = vi.hoisted(() => ({
  trialStartDate: null as string | null,
  packs: "none" as "none" | "chapter",
}));

vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: { uid: "u-lock" }, loading: false }) }));
vi.mock("../../hooks/useSubscription", () => ({
  useSubscription: () => ({
    isPremium: false,
    isTrialExpired: Boolean(S.trialStartDate),
    startTrial: vi.fn(),
    hydrated: true,
    status: { tier: "free", plan: "none", trialStartDate: S.trialStartDate, trialEndDate: null, premiumSince: null },
  }),
}));
vi.mock("../../services/packs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/packs")>();
  return {
    ...actual,
    fetchMyPacks: () =>
      Promise.resolve({
        packs:
          S.packs === "chapter"
            ? [{ packId: "pack_chapter:triangles", sku: "pack_chapter", target: "triangles", pricePaidInr: 49, paidAt: 1_000 }]
            : [],
        licensee: { name: "", email: "" },
        boardPassCredit: null,
      }),
  };
});
vi.mock("../UpgradeModal", () => ({ UpgradeModal: ({ open }: { open: boolean }) => (open ? <div>PLANS_MODAL</div> : null) }));
vi.mock("../../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../analytics/analytics")>();
  return { ...actual, trackNamedEvent: vi.fn(), trackPaywallAction: vi.fn() };
});

import { RequirePremium } from "../auth/RequireAuth";
import { resetOwnedPacksCache } from "../packs/useOwnedPacks";
import { boardPassFoundingLabel, boardPassFromLine, boardPassPriceDisplay } from "../../config/pricing";
import { CONTINUE_WITH_BASIC, lockHeadline } from "./lockCopy";
import { LOCK_TICKS } from "./lockTicks";

function Where() {
  const l = useLocation();
  return <div data-testid="where">{l.pathname}</div>;
}

async function mount(featureLabel: string, entries: string[] = ["/check-improve?x=1"], index?: number) {
  const utils = render(
    <MemoryRouter initialEntries={entries} initialIndex={index}>
      <Routes>
        <Route
          path="/check-improve"
          element={
            <RequirePremium featureLabel={featureLabel}>
              <div>CHILD</div>
            </RequirePremium>
          }
        />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
  for (let i = 0; i < 6; i += 1) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
  }
  // The card's details and the credential line load in their own chunk (PERF-3); a cold first import can take a while.
  await screen.findByTestId("lock-ticks", undefined, { timeout: 10_000 });
  await screen.findByTestId("founder-badge", undefined, { timeout: 10_000 });
  return utils;
}

beforeEach(() => {
  vi.stubEnv("VITE_PACKS_ENABLED", "1");
  S.trialStartDate = null;
  S.packs = "none";
  resetOwnedPacksCache();
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  window.history.replaceState(null, "");
});

const FEATURES = [
  { label: "Answer Checker", title: "Answer Checker comes with the Board Pass" },
  { label: "Worksheet marking", title: "Worksheet marking comes with the Board Pass" },
  { label: "Ask the tutor", title: "The AI tutor comes with the Board Pass" },
] as const;

describe("LOCK-SELL-1 - the lock sells the Board Pass (feature x trial x pack owner x payments)", () => {
  for (const f of FEATURES) {
    for (const trial of ["trial-eligible", "trial ended"] as const) {
      for (const owner of [false, true]) {
        for (const payments of [true, false]) {
          it(`${f.label} · ${trial} · ${owner ? "pack owner" : "no pack"} · payments ${payments ? "on" : "off"}`, async () => {
            vi.stubEnv("VITE_PAYMENTS_ENABLED", payments ? "1" : "");
            S.trialStartDate = trial === "trial ended" ? "2026-10-01T00:00:00.000Z" : null;
            S.packs = owner ? "chapter" : "none";
            const { container } = await mount(f.label);

            // Headline names the feature and the Board Pass.
            const title = screen.getByTestId("lock-title");
            expect(title.textContent).toBe(f.title);
            expect(lockHeadline(f.label)).toBe(f.title);

            // The pack-owner line (PACK-OWNER-GATES-1) sits on top when it applies; never otherwise.
            if (owner) {
              const line = await screen.findByTestId("pack-owner-line");
              expect(line.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
            } else {
              expect(screen.queryByTestId("pack-owner-line")).toBeNull();
            }

            // The Board Pass card: ticks in order, Answer Checker first.
            const ticks = Array.from(screen.getByTestId("lock-ticks").querySelectorAll("li"));
            expect(ticks.map((li) => li.getAttribute("data-tick"))).toEqual(LOCK_TICKS.map((t) => t.id));
            expect(ticks[0].textContent).toContain("Answer Checker");
            expect(ticks[1].textContent).toContain("Mistake Intelligence");
            expect(ticks[2].textContent).toContain("AI tutor");

            // Price and lines from config, never typed.
            expect(screen.getByTestId("lock-amount").textContent).toBe(boardPassPriceDisplay());
            expect(screen.getByTestId("lock-price").textContent).toMatch(/once · till your boards \([A-Z][a-z]{2} \d{4}\)/);
            expect(screen.getByTestId("lock-from-line").textContent).toBe(boardPassFromLine());
            const founding = boardPassFoundingLabel();
            if (founding) expect(screen.getByTestId("lock-founding-badge").textContent).toBe(founding);
            else expect(screen.queryByTestId("lock-founding-badge")).toBeNull();

            // The trial button only where it showed before (trial-eligible), explicit tap only.
            const trialBtn = screen.queryByRole("button", { name: "Start my free 7-day trial" });
            if (trial === "trial-eligible") expect(trialBtn).not.toBeNull();
            else expect(trialBtn).toBeNull();

            // Pay goes where it went before; payments off keeps today's honest control (no Pay that cannot work).
            if (payments) {
              const pay = await screen.findByTestId("paywall-pay");
              expect(pay.getAttribute("href")).toBe(`/pricing?source=lock&returnTo=${encodeURIComponent("/check-improve?x=1")}`);
              if (trialBtn) expect(trialBtn.compareDocumentPosition(pay) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
            } else {
              expect(screen.queryByTestId("paywall-pay")).toBeNull();
              const control = trial === "trial-eligible" ? "See plans instead" : "Unlock Full Access";
              fireEvent.click(screen.getByRole("button", { name: control }));
              expect(screen.getByText("PLANS_MODAL")).toBeTruthy();
            }

            // Basic is one quiet link at the bottom; the "Free on Basic" list is gone.
            expect(screen.queryByTestId("basic-free-list")).toBeNull();
            expect(container.textContent).not.toContain("Free on Basic");
            const basic = screen.getByTestId("lock-continue-basic");
            expect(basic.textContent).toBe(CONTINUE_WITH_BASIC);
            const lock = screen.getByTestId("premium-lock");
            const controls = lock.querySelectorAll("button, a");
            expect(controls[controls.length - 1]).toBe(basic);

            // The credential line, exactly; no refund wording; CSS classes only.
            expect(lock.textContent).toContain("Made by an IITian (IIT Kanpur)");
            expect(lock.textContent).not.toMatch(/refund/i);
            expect(lock.querySelectorAll("[style]").length).toBe(0);
            expect(screen.queryByText("CHILD")).toBeNull();
          });
        }
      }
    }
  }
});

describe("LOCK-SELL-1 - 'Continue with Basic' exits", () => {
  it("with no in-app history: Home ('/')", async () => {
    await mount("Answer Checker");
    fireEvent.click(screen.getByTestId("lock-continue-basic"));
    expect(screen.getByTestId("where").textContent).toBe("/");
  });

  it("with in-app history (router idx > 0): back to where the student came from", async () => {
    window.history.replaceState({ idx: 1 }, "");
    await mount("Answer Checker", ["/practice", "/check-improve?x=1"], 1);
    fireEvent.click(screen.getByTestId("lock-continue-basic"));
    expect(screen.getByTestId("where").textContent).toBe("/practice");
  });

  it("other gate labels keep their own name in the headline; no label reads 'This feature'", () => {
    expect(lockHeadline("Exam Simulation")).toBe("Exam Simulation comes with the Board Pass");
    expect(lockHeadline("The AI tutor")).toBe("The AI tutor comes with the Board Pass");
    expect(lockHeadline(undefined)).toBe("This feature comes with the Board Pass");
  });
});
