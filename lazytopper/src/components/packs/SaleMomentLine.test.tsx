// SALE-MOMENT-1 - the buying line at the moment of value: who sees it, what it names, where it goes, what it counts.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const H = vi.hoisted(() => ({
  user: { uid: "u1" } as { uid: string } | null,
  tier: "free" as string,
  trialStart: null as string | null,
  owned: [] as Array<{ packId: string }>,
  fail: false,
  listeners: [] as Array<(uid: string, cloud: unknown) => void>,
  fetch: vi.fn(),
  track: vi.fn(),
}));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: H.user, loading: false }) }));
vi.mock("../../services/subscriptionService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/subscriptionService")>();
  return {
    ...actual,
    loadSubscription: () => ({ tier: H.tier, plan: "none", trialStartDate: H.trialStart, trialEndDate: null, premiumSince: null }),
    onSubscriptionHydrated: (cb: (uid: string, cloud: unknown) => void) => {
      H.listeners.push(cb);
      return () => {
        H.listeners = H.listeners.filter((l) => l !== cb);
      };
    },
  };
});
vi.mock("../../services/packs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/packs")>();
  return {
    ...actual,
    fetchMyPacks: () => {
      H.fetch();
      return H.fail ? Promise.reject(new Error("request failed: 500")) : Promise.resolve({ packs: H.owned, licensee: { name: "", email: "" }, boardPassCredit: null });
    },
  };
});
vi.mock("../../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../analytics/analytics")>();
  return { ...actual, trackSaleMoment: (...a: unknown[]) => H.track(...a), sendAnalyticsHit: vi.fn() };
});

import { boardPassFoundingLabel } from "../../config/pricing";
import { PACK_PRICE_INR } from "../../services/packs";
import { boardPassCtaLabel, boardPassPriceNow } from "../pricing/boardPassOffer";
import SaleMoment from "./SaleMomentLazy";
import { resetOwnedPacksCache } from "./useOwnedPacks";

const mount = (props: Partial<React.ComponentProps<typeof SaleMoment>> = {}) =>
  render(
    <MemoryRouter>
      <SaleMoment surface="worksheet" chapterSlug="trigonometry" subject="maths" chapterName="Trigonometry" {...props} />
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.stubEnv("VITE_PACKS_ENABLED", "1");
  H.user = { uid: "u1" };
  H.tier = "trial";
  H.trialStart = "2026-10-30T00:00:00.000Z";
  H.owned = [];
  H.fail = false;
  H.listeners = [];
  H.fetch.mockClear();
  H.track.mockClear();
  resetOwnedPacksCache();
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("who sees it", () => {
  it("a trial student sees the chapter's pack, deep-linked, with the catalogue price", async () => {
    mount();
    const a = await screen.findByTestId("sale-moment-pack");
    expect(a).toHaveTextContent(`Trigonometry Chapter Pack ₹${PACK_PRICE_INR.pack_chapter} — printed questions with answer keys`);
    expect(a).toHaveAttribute("href", "/packs?chapter=trigonometry");
    expect(screen.queryByTestId("sale-moment-boardpass")).toBeNull(); // the scorecard has its own Board Pass line
  });
  it("Basic (trial over) sees it too", async () => {
    H.tier = "free";
    mount();
    expect(await screen.findByTestId("sale-moment-pack")).toBeInTheDocument();
  });
  it("paid Premium / Board Pass never sees it and never even asks the server", async () => {
    H.tier = "premium";
    mount();
    await act(async () => {});
    expect(screen.queryByTestId("sale-moment")).toBeNull();
    expect(H.fetch).not.toHaveBeenCalled();
    expect(H.track).not.toHaveBeenCalled();
  });
  it("a stale cached Basic status that hydrates to Premium never shows the row", async () => {
    H.tier = "free";
    H.trialStart = null; // the empty cache a not-yet-hydrated paid student has: it must not be treated as Basic
    mount();
    await act(async () => {
      H.listeners.forEach((l) => l("u1", { tier: "premium", plan: "none", trialStartDate: null, trialEndDate: null, premiumSince: "2026-11-01T00:00:00.000Z" }));
    });
    await act(async () => {});
    expect(screen.queryByTestId("sale-moment")).toBeNull();
    expect(H.track).not.toHaveBeenCalled();
    expect(H.fetch).not.toHaveBeenCalled();
  });
  it("a signed-out visitor sees it too, with no ownership read, no status read and the same events", async () => {
    H.user = null;
    mount({ surface: "ladder", withBoardPass: true });
    const a = await screen.findByTestId("sale-moment-pack");
    expect(a).toHaveAttribute("href", "/packs?chapter=trigonometry");
    expect(screen.getByTestId("sale-moment-boardpass")).toBeInTheDocument();
    expect(H.fetch).not.toHaveBeenCalled();
    expect(H.track).toHaveBeenCalledWith("sale_moment_shown", { surface: "ladder", offer: "pack_chapter" });
  });
  it("the packs switch being off shows nothing", async () => {
    vi.stubEnv("VITE_PACKS_ENABLED", "");
    mount();
    await act(async () => {});
    expect(screen.queryByTestId("sale-moment")).toBeNull();
    expect(H.fetch).not.toHaveBeenCalled();
  });
  it("a never-trialled Basic account waits until the status is known (no flash for a paid student)", async () => {
    H.tier = "free";
    H.trialStart = null;
    mount();
    await act(async () => {});
    expect(screen.queryByTestId("sale-moment")).toBeNull();
  });
});

describe("competency (CBQ) questions get the Board CBQ Pack", () => {
  it("offers pack_cbq for the subject, with the owner's copy and a bold price", async () => {
    mount({ cbq: true });
    const a = await screen.findByTestId("sale-moment-pack");
    expect(a).toHaveAttribute("href", "/packs?pack=cbq&subject=maths");
    expect(a).toHaveTextContent(`Board CBQ Pack ₹${PACK_PRICE_INR.pack_cbq} \u2014 chapter-wise competency questions, explained step by step \u2192`);
    expect(a.querySelector("strong")?.textContent).toBe(`₹${PACK_PRICE_INR.pack_cbq}`);
    expect(H.track).toHaveBeenCalledWith("sale_moment_shown", { surface: "worksheet", offer: "pack_cbq" });
  });
  it("hidden for a student who owns that subject's CBQ Pack, but not for one who owns only the Subject Pack", async () => {
    H.owned = [{ packId: "pack_subject:maths" }, { packId: "pack_bundle:all" }];
    mount({ cbq: true });
    expect(await screen.findByTestId("sale-moment-pack")).toBeInTheDocument();
    cleanup();
    resetOwnedPacksCache();
    H.owned = [{ packId: "pack_cbq:maths" }];
    mount({ cbq: true });
    await waitFor(() => expect(H.fetch).toHaveBeenCalledTimes(2));
    await act(async () => {});
    expect(screen.queryByTestId("sale-moment")).toBeNull();
  });
});

describe("it is a visible row, not a small link", () => {
  it("is a block-level tappable row with an icon and a bold price", async () => {
    mount();
    const a = await screen.findByTestId("sale-moment-pack");
    expect(a.className).toBe("lt-sm__pack");
    expect(a.querySelector("svg[aria-hidden='true']")).not.toBeNull();
    expect(a.querySelector("strong")).toHaveTextContent(`₹${PACK_PRICE_INR.pack_chapter}`);
  });
});

describe("ownership: when unsure, never sell", () => {
  it.each([
    ["the chapter pack itself", ["pack_chapter:trigonometry"]],
    ["the Subject Pack that covers it", ["pack_subject:maths"]],
    ["the Bundle", ["pack_bundle:all"]],
  ])("hidden for a student who owns %s", async (_n, ids) => {
    H.owned = ids.map((packId) => ({ packId }));
    mount();
    await waitFor(() => expect(H.fetch).toHaveBeenCalled());
    await act(async () => {});
    expect(screen.queryByTestId("sale-moment")).toBeNull();
    expect(H.track).not.toHaveBeenCalled();
  });
  it("another chapter's pack does not hide it", async () => {
    H.owned = [{ packId: "pack_chapter:triangles" }];
    mount();
    expect(await screen.findByTestId("sale-moment-pack")).toBeInTheDocument();
  });
  it("a failed ownership read hides it", async () => {
    H.fail = true;
    mount();
    await waitFor(() => expect(H.fetch).toHaveBeenCalled());
    await act(async () => {});
    expect(screen.queryByTestId("sale-moment")).toBeNull();
  });
  it("the plain fallback (nothing specific known) names the cheapest pack and goes to the packs strip; only a Bundle owner is spared", async () => {
    mount({ chapterSlug: null, subject: null });
    const a = await screen.findByTestId("sale-moment-pack");
    expect(a).toHaveTextContent(`PDF packs from ₹${PACK_PRICE_INR.pack_chapter}`);
    expect(a).toHaveAttribute("href", "/pricing#packs");
    cleanup();
    resetOwnedPacksCache();
    H.owned = [{ packId: "pack_bundle:all" }];
    mount({ chapterSlug: null, subject: null });
    await waitFor(() => expect(H.fetch).toHaveBeenCalled());
    await act(async () => {});
    expect(screen.queryByTestId("sale-moment")).toBeNull();
  });
});

describe("the ladder variant carries the Board Pass too", () => {
  it("shows the pack and the Board Pass with its price and the Founding member label", async () => {
    mount({ surface: "ladder", withBoardPass: true });
    await screen.findByTestId("sale-moment-pack");
    const pass = screen.getByTestId("sale-moment-boardpass");
    expect(pass).toHaveTextContent(boardPassCtaLabel(boardPassPriceNow()));
    expect(pass).toHaveAttribute("href", "/pricing");
    const founding = boardPassFoundingLabel();
    if (founding) expect(pass).toHaveTextContent(founding);
    expect(pass.textContent).not.toMatch(/599|999|save|%/i);
  });
});

describe("events", () => {
  it("sale_moment_shown fires once with the surface and the pack SKU; taps carry the offer", async () => {
    const { rerender } = mount({ surface: "ladder", withBoardPass: true });
    const pack = await screen.findByTestId("sale-moment-pack");
    expect(H.track).toHaveBeenCalledTimes(1);
    expect(H.track).toHaveBeenCalledWith("sale_moment_shown", { surface: "ladder", offer: "pack_chapter" });
    rerender(
      <MemoryRouter>
        <SaleMoment surface="ladder" chapterSlug="trigonometry" subject="maths" withBoardPass />
      </MemoryRouter>,
    );
    expect(H.track.mock.calls.filter((c) => c[0] === "sale_moment_shown")).toHaveLength(1);
    fireEvent.click(pack);
    expect(H.track).toHaveBeenLastCalledWith("sale_moment_tap", { surface: "ladder", offer: "pack_chapter" });
    fireEvent.click(screen.getByTestId("sale-moment-boardpass"));
    expect(H.track).toHaveBeenLastCalledWith("sale_moment_tap", { surface: "ladder", offer: "board_pass" });
  });
});
