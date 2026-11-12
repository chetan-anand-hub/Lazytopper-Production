// @vitest-environment jsdom
/**
 * SELFPAY-ATTACH-1 (C) - the welcome banner shows ONLY when the entitlement is really there (the param alone shows nothing), is
 * dismissible, removes the param with replace, and the gate renders nothing without the param.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";

const mockAuth = vi.hoisted(() => ({ user: { uid: "u1" } as null | { uid: string } }));
const mockSub = vi.hoisted(() => ({ status: {} as Record<string, unknown>, hydrated: true }));
const packs = vi.hoisted(() => ({ mine: vi.fn() }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => mockAuth }));
vi.mock("../../hooks/useSubscription", () => ({ useSubscription: () => mockSub }));
vi.mock("../../services/packs", () => ({ fetchMyPacks: () => packs.mine() }));

import WelcomeBannerGate, { readWelcome } from "./WelcomeBannerGate";
import WelcomeBanner from "./WelcomeBanner";

let where = "";
function Probe() {
  const l = useLocation();
  where = `${l.pathname}${l.search}${l.hash}`;
  return null;
}
const mount = (entry: string) =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Probe />
      <WelcomeBannerGate />
    </MemoryRouter>,
  );

const NOW = new Date("2026-11-12T00:00:00.000Z");
const FUTURE = "2027-02-20T00:00:00.000Z";
beforeEach(() => {
  // Date pinned (the banner compares the pass end with "now"); no real clock is read.
  vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
  vi.clearAllMocks();
  mockAuth.user = { uid: "u1" };
  mockSub.hydrated = true;
  mockSub.status = { tier: "premium", plan: "pass_till_boards", passEnd: FUTURE };
  packs.mine.mockResolvedValue({ packs: [{ packId: "pack_cbq:maths" }] });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("WelcomeBanner", () => {
  it("readWelcome: only the two known values", () => {
    expect(readWelcome("?welcome=board_pass")).toBe("board_pass");
    expect(readWelcome("?welcome=pack&x=1")).toBe("pack");
    for (const bad of ["", "?welcome=", "?welcome=premium", "?welcome=board_pass%20x"]) expect(readWelcome(bad)).toBeNull();
  });

  it("no param: nothing at all", () => {
    mount("/");
    expect(screen.queryByTestId("welcome-banner")).toBeNull();
  });

  it("board pass really active: the banner, the param removed (replace), dismissible", async () => {
    mount("/?welcome=board_pass&x=1");
    expect((await screen.findByTestId("welcome-banner")).textContent).toContain("Your Board Pass is active ✓Till your boards. Every feature is open.");
    await waitFor(() => expect(where).toBe("/?x=1"));
    fireEvent.click(screen.getByLabelText("Dismiss"));
    expect(screen.queryByTestId("welcome-banner")).toBeNull();
  });

  it("the param alone shows nothing when there is no real Board Pass (free, expired, not hydrated, signed out) - and is cleaned up later", async () => {
    for (const status of [{ tier: "free", plan: "none", passEnd: null }, { tier: "premium", plan: "pass_till_boards", passEnd: "2020-01-01T00:00:00.000Z" }, { tier: "premium", plan: "pass_month", passEnd: FUTURE }]) {
      mockSub.status = status;
      const c = mount("/?welcome=board_pass");
      await act(async () => undefined);
      expect(screen.queryByTestId("welcome-banner")).toBeNull();
      c.unmount();
    }
    mockSub.status = { tier: "premium", plan: "pass_till_boards", passEnd: FUTURE };
    mockSub.hydrated = false;
    mount("/?welcome=board_pass");
    await act(async () => undefined);
    expect(screen.queryByTestId("welcome-banner")).toBeNull();
    cleanup();
    mockSub.hydrated = true;
    mockAuth.user = null;
    mount("/?welcome=board_pass");
    await act(async () => undefined);
    expect(screen.queryByTestId("welcome-banner")).toBeNull();
  });

  it("gives up quietly (param removed, still no banner) when nothing real shows up", async () => {
    mockSub.status = { tier: "free", plan: "none", passEnd: null };
    render(
      <MemoryRouter initialEntries={["/?welcome=board_pass"]}>
        <Probe />
        <WelcomeBanner kind="board_pass" giveUpMs={30} />
      </MemoryRouter>,
    );
    await waitFor(() => expect(where).toBe("/"));
    expect(screen.queryByTestId("welcome-banner")).toBeNull();
  });

  it("pack: shown only when the server lists an owned pack", async () => {
    mount("/packs?from=pay&welcome=pack#my-packs");
    expect((await screen.findByTestId("welcome-banner")).textContent).toContain("Your pack is ready ✓Download it below.");
    await waitFor(() => expect(where).toBe("/packs?from=pay#my-packs"));
    cleanup();
    vi.useFakeTimers({ now: NOW });
    packs.mine.mockResolvedValue({ packs: [] });
    mount("/packs?welcome=pack");
    await act(async () => { await vi.advanceTimersByTimeAsync(12_000); });
    expect(screen.queryByTestId("welcome-banner")).toBeNull();
  });
});
