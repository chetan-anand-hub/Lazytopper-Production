/**
 * PACKS-ENTRY-1 — the entry links (the download wall's are in components/limits/limits.test.tsx: it reads the clock) to /packs, the query contract, and the one-request-per-session reader.
 * MUTATIONS: drop the flag check in any entry -> that entry's "flag off" test RED; put the pack link before the
 * Board Pass actions -> "ordered after" RED; make loadOwnsAnyPack skip the cache -> "one request" RED.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, useLocation } from "react-router-dom";

const authState = vi.hoisted(() => ({ user: null as null | { uid: string; displayName?: string; email?: string }, logout: vi.fn(async () => {}) }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: authState.user, logout: authState.logout }) }));
vi.mock("../../hooks/useSubscription", () => ({
  useSubscription: () => ({ tier: "free", isTrialActive: false, isPremium: false, isTrialExpired: false, daysLeftInTrial: 0 }),
}));
const fetchMyPacksMock = vi.hoisted(() => vi.fn());
vi.mock("../../services/packs", async (orig) => ({ ...(await orig<typeof import("../../services/packs")>()), fetchMyPacks: fetchMyPacksMock }));
const subTier = vi.hoisted(() => ({ tier: "free" as "free" | "trial" | "premium" }));
vi.mock("../../services/subscriptionService", async (orig) => ({
  ...(await orig<typeof import("../../services/subscriptionService")>()),
  loadSubscription: () => ({ tier: subTier.tier }),
}));
vi.mock("../../analytics/analytics", async (orig) => ({ ...(await orig<typeof import("../../analytics/analytics")>()), sendAnalyticsHit: vi.fn() }));

import * as analytics from "../../analytics/analytics";
import { ACTIVITY_EVENTS } from "../../services/activityClient";
import { PACK_PRICE_INR, isPacksClientEnabled } from "../../services/packs";
import { ACTIVITY_TOPIC_SLUGS } from "../../services/activityPages";
import { MOCK_PACK_PRICE_INR, packOfferFor } from "./packOffer";
import { chapterFromLocation, CHAPTER_PACK_PRICE_INR, isPacksEntryEnabled, packsHref, readPacksQuery } from "./packEntry";
import PacksStrip from "../../components/pricing/PacksStrip";
import { loadOwnsAnyPack, resetMyPacksCacheForTests, useOwnsAnyPack } from "./myPacksCache";
import PublicLegalFooter from "../../components/ux/PublicLegalFooter";
import SettingsModal from "../../components/account/SettingsModal";
import { MobileAccountMenu } from "../../components/mobile/MobileAccountMenu";
import { Note } from "../../components/notes/Note";
import { ensureAllNoteSpecs, getNoteSpecForTopic } from "../../components/notes/noteSpecRegistry";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

await ensureAllNoteSpecs();
const track = analytics.sendAnalyticsHit as unknown as ReturnType<typeof vi.fn>;
const FLAG_ON = () => vi.stubEnv("VITE_PACKS_ENABLED", "1");
const FLAG_OFF = () => vi.stubEnv("VITE_PACKS_ENABLED", "");

beforeEach(() => {
  authState.user = { uid: "u1", displayName: "Asha", email: "a@b.in" };
  fetchMyPacksMock.mockReset();
  resetMyPacksCacheForTests();
  track.mockClear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

function Where() {
  const l = useLocation();
  return <div data-testid="where">{`${l.pathname}${l.search}${l.hash}`}</div>;
}

const NONE = { chapter: null, mock: null, pack: null, subject: null, view: null };
describe("packEntry helpers", () => {
  it("packsHref: chapter, hash, and unknown slugs dropped", () => {
    expect(packsHref()).toBe("/pricing#packs");
    expect(packsHref({ chapter: "triangles" })).toBe("/pricing?chapter=triangles#packs");
    expect(packsHref({ chapter: "not-a-chapter" })).toBe("/pricing#packs");
    expect(packsHref({ chapter: null, hash: "my-packs" })).toBe("/packs#my-packs");
    expect(packsHref({ mock: "science" })).toBe("/pricing?mock=science#packs");
    expect(packsHref({ mock: "history" as never })).toBe("/pricing#packs");
    expect(packsHref({ chapter: "circles", mock: "maths" })).toBe("/pricing?chapter=circles#packs");
  });
  it("readPacksQuery reads pack / subject / view, ignores utm_*, and treats junk or repeats as absent", () => {
      for (const p of ["chapter", "mock", "subject", "bundle"]) expect(readPacksQuery(`?pack=${p}`)).toEqual({ ...NONE, pack: p });
    expect(readPacksQuery("?pack=other")).toEqual(NONE);
    expect(readPacksQuery("?pack=mock&pack=bundle")).toEqual(NONE);
    expect(readPacksQuery("?subject=science")).toEqual({ ...NONE, subject: "science" });
    expect(readPacksQuery("?subject=art")).toEqual(NONE);
    expect(readPacksQuery("?subject=maths&subject=science")).toEqual(NONE);
    expect(readPacksQuery("?view=sample")).toEqual({ ...NONE, view: "sample" });
    expect(readPacksQuery("?view=full")).toEqual(NONE);
    expect(readPacksQuery("?view=sample&view=sample")).toEqual(NONE);
    expect(readPacksQuery("?utm_source=google&utm_term=cbse&pack=subject&subject=maths&view=sample&utm_campaign=x")).toEqual({
      ...NONE,
      pack: "subject",
      subject: "maths",
      view: "sample",
    });
  });
  it("readPacksQuery round-trips every slug and refuses junk / repeated values", () => {
    for (const s of ACTIVITY_TOPIC_SLUGS) expect(readPacksQuery(new URL(packsHref({ chapter: s }), "http://x").search)).toEqual({ chapter: s, mock: null, pack: null, subject: null, view: null });
    expect(readPacksQuery("")).toEqual({ ...NONE });
    expect(readPacksQuery("?mock=maths")).toEqual({ ...NONE, mock: "maths" });
    expect(readPacksQuery("?mock=art")).toEqual({ ...NONE });
    expect(readPacksQuery("?chapter=drop-table")).toEqual({ ...NONE });
    expect(readPacksQuery("?chapter=triangles&chapter=circles")).toEqual({ ...NONE });
  });
  it("chapterFromLocation reads a slug from the path or a topic query, else null", () => {
    expect(chapterFromLocation("/notes/triangles")).toBe("triangles");
    expect(chapterFromLocation("/practice/10/maths", "?topic=circles&x=1")).toBe("circles");
    expect(chapterFromLocation("/me", "")).toBeNull();
  });
  it("the price copy and the flag agree with the pack catalogue / isPacksClientEnabled", () => {
    expect(CHAPTER_PACK_PRICE_INR).toBe(PACK_PRICE_INR.pack_chapter);
    expect(MOCK_PACK_PRICE_INR).toBe(PACK_PRICE_INR.pack_mock);
    for (const v of ["1", "", "0", "true"]) {
      vi.stubEnv("VITE_PACKS_ENABLED", v);
      expect(isPacksEntryEnabled()).toBe(isPacksClientEnabled());
    }
    expect(isPacksEntryEnabled()).toBe(false);
  });
  it("pack_entry_click is in the client list, the server list and the admin labels", () => {
    const here = path.dirname(fileURLToPath(import.meta.url));
    expect(ACTIVITY_EVENTS).toContain("pack_entry_click");
    expect(readFileSync(path.resolve(here, "../../../server/routes/studentActivity.cjs"), "utf8")).toContain("'pack_entry_click'");
    expect(readFileSync(path.resolve(here, "../../pages/admin/activityDetailModel.ts"), "utf8")).toContain("pack_entry_click:");
  });
});

describe("(b) notes", () => {
  const mount = (slug: string) =>
    render(
      <MemoryRouter>
        <Note spec={getNoteSpecForTopic(slug)!} />
      </MemoryRouter>,
    );
  it("flag on: a card after the note content and before the footnote, for every chapter note; trigonometry names both chapters; click fires notes", async () => {
    FLAG_ON();
    for (const slug of ACTIVITY_TOPIC_SLUGS) {
      if (!getNoteSpecForTopic(slug)) continue;
      const { container, unmount } = mount(slug);
      const card = await screen.findByTestId("note-pack-link", {}, { timeout: 8000 });
      expect(container.querySelectorAll('[data-testid="note-pack-link"]').length, slug).toBe(1);
      expect(card.querySelector("a")!.getAttribute("href")).toBe(`/pricing?chapter=${slug}#packs`);
      expect(card.textContent).toContain("Worked solutions · ₹49 · yours to keep");
      expect(card.textContent).toContain("See the Chapter Pack");
      const foot = container.querySelector(".lt-note__footnote")!;
      expect(card.compareDocumentPosition(foot) & Node.DOCUMENT_POSITION_FOLLOWING, slug).toBeTruthy();
      unmount();
    }
    mount("trigonometry");
    expect((await screen.findByTestId("note-pack-link", {}, { timeout: 8000 })).textContent).toContain("Practise every Trigonometry (Ch 8 + Ch 9) question on paper");
    cleanup();
    mount("triangles");
    const card = await screen.findByTestId("note-pack-link", {}, { timeout: 8000 });
    expect(card.textContent).toContain("Practise every Triangles question on paper");
    fireEvent.click(card.querySelector("a")!);
    expect(track).toHaveBeenCalledWith("event", { name: "pack_entry_click", data: { from: "notes" } });
  });
  it("flag off: nothing in the markup, and the server render (prerender) is unchanged", async () => {
    FLAG_OFF();
    const { container } = mount("triangles");
    await act(async () => {});
    expect(container.querySelector('[data-testid="note-pack-link"]')).toBeNull();
    cleanup();
    const ssr = renderToStaticMarkup(<MemoryRouter><Note spec={getNoteSpecForTopic("triangles")!} /></MemoryRouter>);
    expect(ssr).not.toMatch(/href="\/packs[?#"]/);
  });
});

describe("(c) footers", () => {
  it("public footer: flag on -> PDF packs link to /packs, click fires footer; flag off -> absent", async () => {
    FLAG_ON();
    render(<MemoryRouter><PublicLegalFooter /></MemoryRouter>);
    const a = await screen.findByRole("link", { name: "PDF packs" }, { timeout: 8000 });
    expect(a.getAttribute("href")).toBe("/pricing#packs");
    fireEvent.click(a);
    expect(track).toHaveBeenCalledWith("event", { name: "pack_entry_click", data: { from: "footer" } });
    cleanup();
    FLAG_OFF();
    render(<MemoryRouter><PublicLegalFooter /></MemoryRouter>);
    await act(async () => {});
    expect(screen.queryByRole("link", { name: "PDF packs" })).toBeNull();
  });
});

describe("(d) My packs", () => {
  const owned = { packs: [{ packId: "pack_chapter:triangles", sku: "pack_chapter", target: "triangles", pricePaidInr: 49, paidAt: 1, orderId: "o" }], licensee: { name: "A", email: "a@b.in" } };
  it("cached reader: one request per session however many opens; no request when the flag is off; failure is retried, not cached", async () => {
    FLAG_ON();
    fetchMyPacksMock.mockResolvedValue(owned);
    const [a, b] = await Promise.all([loadOwnsAnyPack("u1"), loadOwnsAnyPack("u1")]);
    expect([a, b]).toEqual([true, true]);
    expect(await loadOwnsAnyPack("u1")).toBe(true);
    expect(fetchMyPacksMock).toHaveBeenCalledTimes(1);
    resetMyPacksCacheForTests();
    fetchMyPacksMock.mockReset();
    fetchMyPacksMock.mockRejectedValueOnce(new Error("x")).mockResolvedValueOnce({ packs: [], licensee: { name: "", email: "" } });
    expect(await loadOwnsAnyPack("u2")).toBeNull();
    expect(await loadOwnsAnyPack("u2")).toBe(false);
    expect(await loadOwnsAnyPack("u2")).toBe(false);
    expect(fetchMyPacksMock).toHaveBeenCalledTimes(2);
    resetMyPacksCacheForTests();
    fetchMyPacksMock.mockReset();
    FLAG_OFF();
    expect(await loadOwnsAnyPack("u3")).toBe(false);
    expect(fetchMyPacksMock).not.toHaveBeenCalled();
  });
  it("the hook does nothing until active", async () => {
    FLAG_ON();
    fetchMyPacksMock.mockResolvedValue(owned);
    const { result, rerender } = renderHook(({ active }) => useOwnsAnyPack("u1", active), { initialProps: { active: false } });
    await act(async () => {});
    expect(fetchMyPacksMock).not.toHaveBeenCalled();
    expect(result.current).toBe(false);
    rerender({ active: true });
    await waitFor(() => expect(result.current).toBe(true));
    expect(fetchMyPacksMock).toHaveBeenCalledTimes(1);
  });
  it("mobile menu: row only when a pack is owned, lazily on open; click goes to /packs#my-packs and fires account", async () => {
    FLAG_ON();
    fetchMyPacksMock.mockResolvedValue(owned);
    render(<MemoryRouter initialEntries={["/me"]}><MobileAccountMenu /><Where /></MemoryRouter>);
    expect(fetchMyPacksMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Open account menu" }));
    const item = await screen.findByRole("menuitem", { name: "My packs" });
    fireEvent.click(item);
    expect(screen.getByTestId("where").textContent).toBe("/packs#my-packs");
    expect(track).toHaveBeenCalledWith("event", { name: "pack_entry_click", data: { from: "account" } });
    cleanup();
    resetMyPacksCacheForTests();
    fetchMyPacksMock.mockResolvedValue({ packs: [], licensee: { name: "", email: "" } });
    render(<MemoryRouter initialEntries={["/me"]}><MobileAccountMenu /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Open account menu" }));
    await waitFor(() => expect(fetchMyPacksMock).toHaveBeenCalled());
    expect(screen.queryByRole("menuitem", { name: "My packs" })).toBeNull();
    cleanup();
    resetMyPacksCacheForTests();
    FLAG_OFF();
    fetchMyPacksMock.mockClear();
    render(<MemoryRouter initialEntries={["/me"]}><MobileAccountMenu /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Open account menu" }));
    expect(screen.queryByRole("menuitem", { name: "My packs" })).toBeNull();
    expect(fetchMyPacksMock).not.toHaveBeenCalled();
  });
  it("settings: My packs row only when owned; click closes, goes to /packs#my-packs, fires account", async () => {
    FLAG_ON();
    fetchMyPacksMock.mockResolvedValue(owned);
    const onClose = vi.fn();
    render(<MemoryRouter initialEntries={["/me"]}><SettingsModal open onClose={onClose} onOpenSignInMethods={() => {}} /><Where /></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: "My packs" }));
    expect(onClose).toHaveBeenCalled();
    expect(screen.getByTestId("where").textContent).toBe("/packs#my-packs");
    expect(track).toHaveBeenCalledWith("event", { name: "pack_entry_click", data: { from: "account" } });
    cleanup();
    resetMyPacksCacheForTests();
    fetchMyPacksMock.mockResolvedValue({ packs: [], licensee: { name: "", email: "" } });
    render(<MemoryRouter><SettingsModal open onClose={() => {}} onOpenSignInMethods={() => {}} /></MemoryRouter>);
    await waitFor(() => expect(fetchMyPacksMock).toHaveBeenCalled());
    expect(screen.queryByTestId("settings-my-packs")).toBeNull();
  });
});

describe("paid Premium sees no pack offers (owner ruling 25 Oct 19:54)", () => {
  const setTier = (tier: "premium" | "trial" | "free") => {
    subTier.tier = tier;
  };
  beforeEach(() => setTier("free"));
  const surfaces = async (flag: boolean) => {
    const out: Record<string, boolean> = {};
    const r1 = render(<MemoryRouter><PublicLegalFooter /></MemoryRouter>);
    await act(async () => { await new Promise((r) => setTimeout(r, 300)); });
    out.footer = !!screen.queryByRole("link", { name: "PDF packs" });
    r1.unmount();
    const r2 = render(<MemoryRouter><Note spec={getNoteSpecForTopic("triangles")!} /></MemoryRouter>);
    await act(async () => { await new Promise((r) => setTimeout(r, 300)); });
    out.notes = !!screen.queryByTestId("note-pack-link");
    r2.unmount();
    const r3 = render(<MemoryRouter><PacksStrip /></MemoryRouter>);
    out.pricing = !!screen.queryByTestId("pricing-packs-strip");
    r3.unmount();
    void flag;
    return out;
  };
  it("basic and trial: footer, notes card and pricing section shown", async () => {
    FLAG_ON();
    for (const tier of ["free", "trial"] as const) {
      setTier(tier);
      expect(await surfaces(true), tier).toEqual({ footer: true, notes: true, pricing: true });
    }
  });
  it("paid premium: footer and notes offers stay hidden; the /pricing packs section is uniform (PRICING-ONE-1) and shows", async () => {
    FLAG_ON();
    setTier("premium");
    expect(await surfaces(true)).toEqual({ footer: false, notes: false, pricing: true });
  });
  it("paid premium who owns a pack still gets My packs (re-download access)", async () => {
    FLAG_ON();
    setTier("premium");
    fetchMyPacksMock.mockResolvedValue({ packs: [{ packId: "pack_chapter:triangles", sku: "pack_chapter", target: "triangles", pricePaidInr: 49, paidAt: 1, orderId: "o" }], licensee: { name: "A", email: "a@b.in" } });
    render(<MemoryRouter><MobileAccountMenu /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Open account menu" }));
    expect(await screen.findByRole("menuitem", { name: "My packs" })).toBeTruthy();
  });
  it("signed out: shown (the visitor default)", async () => {
    FLAG_ON();
    authState.user = null;
    expect((await surfaces(true)).footer).toBe(true);
  });
});

describe("PACK-LINKS-1 packOfferFor", () => {
  it("one chapter -> Chapter Pack; a subject alone -> Mock Pack; anything else -> plain /packs", () => {
    expect(packOfferFor({ chapters: ["triangles"] })).toEqual({ label: "Chapter Pack ₹49 →", priceLabel: "₹49", href: "/pricing?chapter=triangles#packs" });
    expect(packOfferFor({ subject: "maths", kind: "mock" })).toEqual({ label: "Mock Pack ₹99 →", priceLabel: "₹99", href: "/pricing?mock=maths#packs" });
    expect(packOfferFor({ chapters: [], subject: "science" }).href).toBe("/pricing?mock=science#packs");
    expect(packOfferFor({ chapters: ["triangles", "circles"] }).href).toBe("/pricing#packs");
    expect(packOfferFor({ chapters: ["not-a-chapter"] }).label).toBe("PDF packs from ₹49 →");
    expect(packOfferFor().href).toBe("/pricing#packs");
  });
  it("kind decides when both a chapter and a subject are given", () => {
    expect(packOfferFor({ chapters: ["triangles"], subject: "maths", kind: "mock" }).href).toBe("/pricing?mock=maths#packs");
    expect(packOfferFor({ chapters: ["triangles"], subject: "maths", kind: "chapter" }).href).toBe("/pricing?chapter=triangles#packs");
  });
});
