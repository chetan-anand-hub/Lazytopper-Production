/**
 * MY-PACKS-VISIBLE-1 - "My packs" in the desktop account dropdown and on Me / Progress.
 * MUTATIONS: show the row/card to a non-owner -> "non-owner" RED; show on a failed lookup -> "failed" RED; drop "me-card" from the
 * paid-Premium allowance in PacksEntryPoint -> "paid Premium" RED; drop the 3-name cap -> "+N more" RED.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MemoryRouter, useLocation } from "react-router-dom";

const authState = vi.hoisted(() => ({ user: null as null | { uid: string; displayName?: string; email?: string }, logout: vi.fn(async () => {}) }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: authState.user, logout: authState.logout }) }));
vi.mock("../../hooks/useSubscription", () => ({
  useSubscription: () => ({ tier: "free", isTrialActive: false, isPremium: false, isTrialExpired: false, daysLeftInTrial: 0 }),
}));
const fetchMyPacksMock = vi.hoisted(() => vi.fn());
vi.mock("../../services/packs", async (orig) => ({ ...(await orig<typeof import("../../services/packs")>()), fetchMyPacks: fetchMyPacksMock }));
const subTier = vi.hoisted(() => ({ paid: false }));
vi.mock("../../services/subscriptionService", async (orig) => ({
  ...(await orig<typeof import("../../services/subscriptionService")>()),
  loadSubscription: () => ({ tier: subTier.paid ? "premium" : "free" }),
  isPaidPremium: () => subTier.paid,
}));
vi.mock("../../analytics/analytics", async (orig) => ({ ...(await orig<typeof import("../../analytics/analytics")>()), sendAnalyticsHit: vi.fn() }));
vi.mock("../../components/desktop/MistakeIntelCard", () => ({ MistakeIntelCard: () => <div /> }));

import * as analytics from "../../analytics/analytics";
import { DesktopShell } from "../../components/desktop/DesktopShell";
import { ownedPackTitle } from "../../components/packs/PacksShop";
import { resetOwnedPacksCache } from "../../components/packs/useOwnedPacks";
import { PacksEntry } from "./packEntryLazy";
import { meCardPackTitle } from "./MyPacksMeCard";
import { resetMyPacksCacheForTests } from "./myPacksCache";

const track = analytics.sendAnalyticsHit as unknown as ReturnType<typeof vi.fn>;
const pack = (sku: string, target: string, i = 1) => ({ packId: `p${i}`, sku, target, pricePaidInr: 49, paidAt: 1 });
const mine = (packs: unknown[]) => ({ packs, licensee: { name: "", email: "a@b.in" }, boardPassCredit: null });

beforeEach(() => {
  vi.stubEnv("VITE_PACKS_ENABLED", "1");
  authState.user = { uid: "u1", displayName: "Asha", email: "a@b.in" };
  subTier.paid = false;
  fetchMyPacksMock.mockReset();
  resetMyPacksCacheForTests();
  resetOwnedPacksCache();
  track.mockClear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

function Where() {
  const l = useLocation();
  return <div data-testid="where">{`${l.pathname}${l.hash}`}</div>;
}

function openMenu() {
  render(
    <MemoryRouter initialEntries={["/practice-hub"]}>
      <DesktopShell>
        <div />
      </DesktopShell>
      <Where />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Open account menu" }));
}

describe("desktop account dropdown - My packs row", () => {
  it("owner sees it between Me / Progress and Settings; click goes to /packs#my-packs and closes the menu", async () => {
    fetchMyPacksMock.mockResolvedValue(mine([pack("pack_chapter", "real-numbers")]));
    openMenu();
    const row = await screen.findByRole("menuitem", { name: "My packs" });
    const menu = screen.getByRole("menu", { name: "Account menu" });
    expect(Array.from(menu.querySelectorAll("[role='menuitem']")).map((n) => n.textContent)).toEqual(["Me / Progress", "My packs", "Settings", "Log out"]);
    expect(row.className).toContain("lt-packs-row--desktop");
    expect(row.getAttribute("style")).toBeNull();
    fireEvent.click(row);
    expect(screen.getByTestId("where").textContent).toBe("/packs#my-packs");
    expect(screen.queryByRole("menu", { name: "Account menu" })).toBeNull();
    expect(track).toHaveBeenCalledWith("event", { name: "pack_entry_click", data: { from: "account-desktop" } });
  });

  it("non-owner sees no row", async () => {
    fetchMyPacksMock.mockResolvedValue(mine([]));
    openMenu();
    await waitFor(() => expect(fetchMyPacksMock).toHaveBeenCalled());
    expect(screen.queryByRole("menuitem", { name: "My packs" })).toBeNull();
  });

  it("failed lookup shows no row", async () => {
    fetchMyPacksMock.mockRejectedValue(new Error("boom"));
    openMenu();
    await waitFor(() => expect(fetchMyPacksMock).toHaveBeenCalled());
    expect(screen.queryByRole("menuitem", { name: "My packs" })).toBeNull();
  });

  it("flag off: no row and no request", () => {
    vi.stubEnv("VITE_PACKS_ENABLED", "");
    openMenu();
    expect(fetchMyPacksMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("menuitem", { name: "My packs" })).toBeNull();
  });
});

function renderCard() {
  return render(
    <MemoryRouter initialEntries={["/me"]}>
      <PacksEntry kind="me-card" uid="u1" />
      <Where />
    </MemoryRouter>,
  );
}

describe("Me / Progress - My packs card", () => {
  it("owner sees names (no prices, no offers) and the button goes to /packs#my-packs", async () => {
    fetchMyPacksMock.mockResolvedValue(mine([pack("pack_chapter", "real-numbers"), pack("pack_cbq", "maths", 2)]));
    renderCard();
    const card = await screen.findByTestId("me-my-packs");
    expect(card.textContent).toContain("Chapter Pack · Real Numbers");
    expect(card.textContent).toContain("Maths CBQ Pack");
    expect(card.textContent).not.toMatch(/₹|Buy|Rs\.?\s?\d/);
    fireEvent.click(screen.getByRole("button", { name: "Open My packs" }));
    expect(screen.getByTestId("where").textContent).toBe("/packs#my-packs");
    expect(track).toHaveBeenCalledWith("event", { name: "pack_entry_click", data: { from: "me-card" } });
  });

  it("shows at most 3 names then +N more", async () => {
    fetchMyPacksMock.mockResolvedValue(
      mine([pack("pack_mock", "maths", 1), pack("pack_mock", "science", 2), pack("pack_cbq", "science", 3), pack("pack_bundle", "", 4), pack("pack_subject", "maths", 5)]),
    );
    renderCard();
    const card = await screen.findByTestId("me-my-packs");
    expect(card.querySelectorAll("li")).toHaveLength(4);
    expect(card.textContent).toContain("+2 more");
    expect(card.textContent).not.toContain("Maths + Science Bundle");
  });

  it("exactly 3 packs: no +N more", async () => {
    fetchMyPacksMock.mockResolvedValue(mine([pack("pack_mock", "maths", 1), pack("pack_mock", "science", 2), pack("pack_cbq", "science", 3)]));
    renderCard();
    const card = await screen.findByTestId("me-my-packs");
    expect(card.textContent).not.toMatch(/\+\d+ more/);
  });

  it("paid Premium owners see it too", async () => {
    subTier.paid = true;
    fetchMyPacksMock.mockResolvedValue(mine([pack("pack_bundle", "")]));
    renderCard();
    expect((await screen.findByTestId("me-my-packs")).textContent).toContain("Maths + Science Bundle");
  });

  it("non-owner sees nothing", async () => {
    fetchMyPacksMock.mockResolvedValue(mine([]));
    renderCard();
    await waitFor(() => expect(fetchMyPacksMock).toHaveBeenCalled());
    expect(screen.queryByTestId("me-my-packs")).toBeNull();
  });

  it("failed lookup shows nothing", async () => {
    fetchMyPacksMock.mockRejectedValue(new Error("boom"));
    renderCard();
    await waitFor(() => expect(fetchMyPacksMock).toHaveBeenCalled());
    expect(screen.queryByTestId("me-my-packs")).toBeNull();
  });

  it("flag off: nothing and no request", () => {
    vi.stubEnv("VITE_PACKS_ENABLED", "");
    renderCard();
    expect(fetchMyPacksMock).not.toHaveBeenCalled();
    expect(screen.queryByTestId("me-my-packs")).toBeNull();
  });

  it("names agree with the packs page titles", () => {
    for (const [sku, target] of [["pack_chapter", "real-numbers"], ["pack_mock", "science"], ["pack_subject", "maths"], ["pack_cbq", "science"], ["pack_bundle", ""], ["pack_x", ""]]) {
      expect(meCardPackTitle({ sku, target })).toBe(ownedPackTitle({ sku, target }));
    }
  });

  it("Me / Progress mounts the card for a real account only, from the lazy entry", () => {
    const src = readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../pages/MeProgressPage.tsx"), "utf8");
    expect(src).toMatch(/realUid && <PacksEntry kind="me-card" uid=\{realUid\} \/>/);
    expect(src).not.toMatch(/import .*MyPacksMeCard/);
  });
});
