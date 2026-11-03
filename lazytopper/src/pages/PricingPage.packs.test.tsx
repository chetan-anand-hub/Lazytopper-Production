/**
 * PRICING-B-1 — the print products on /pricing ("Option B v3"): every Buy goes through the shared pack shop's own buy path, and the
 * Maths / Science switch drives the chapter button, the one-subject rows, the CBQ "See inside", the sticky bar and the SKU + target
 * sent to checkout. Matrix: subject × {Chapter, Subject, Mock, CBQ} × {signed out, signed in, owns it, owns the other subject's,
 * owns the Bundle / a Subject Pack} × switching before / after opening the picker × deep links. The assertion every time: the
 * checkout receives the right SKU + target (signed in: `buyPack(sku, target)`; signed out: the sign-in resume path
 * `/pricing?buy=<sku>&t=<target>`), and `pack_checkout` reports the same SKU.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

vi.mock("firebase/auth", () => ({ getAdditionalUserInfo: vi.fn() }));
vi.mock("../services/activityClient", () => ({ recordActivity: vi.fn() }));

const auth = vi.hoisted(() => ({ user: null as null | { uid: string } }));
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: auth.user, loading: false }) }));
vi.mock("../components/pricing/useMonthPassAvailable", () => ({
  useMonthPassAvailable: () => false,
  fetchMonthPassAvailable: async () => false,
  resetMonthPassAvailableForTests: () => undefined,
}));

const owned = vi.hoisted(() => ({ packs: [] as Array<{ sku: string; target: string }> }));
const buyPack = vi.hoisted(() => vi.fn(async (..._a: unknown[]) => ({ status: "dismissed" as const })));
vi.mock("../services/packs", async (orig) => {
  const actual = await orig<typeof import("../services/packs")>();
  return {
    ...actual,
    isPacksClientEnabled: () => true,
    fetchMyPacks: vi.fn(async () => ({
      packs: owned.packs.map((p, i) => ({ packId: `${p.sku}:${p.target}`, sku: p.sku, target: p.target, paidAt: 1_700_000_000_000 + i })),
      licensee: { name: "Asha", email: "a@b.in" },
    })),
    buyPack,
  };
});
const tracked = vi.hoisted(() => ({ checkout: vi.fn(), event: vi.fn() }));
vi.mock("../lib/packs/packAnalytics", async (orig) => {
  const actual = await orig<typeof import("../lib/packs/packAnalytics")>();
  return { ...actual, trackPackCheckout: tracked.checkout, trackPackEvent: tracked.event, trackPackPurchase: vi.fn() };
});
vi.mock("../lib/packs/packContent", () => ({ loadChapter: async () => undefined, countChapterQuestions: () => 100, countCbqPackQuestions: () => 50 }));
// The pop-up, reduced to what the buy path needs: its sku, the chapter picker and the shop's own buy area.
vi.mock("./PackDialog", () => ({
  default: (p: { sku: string; subject: string; chapter: string; onChapter: (s: string) => void; buy: unknown }) => (
    <div role="dialog" data-testid="pack-dialog" data-sku={p.sku} data-subject={p.subject}>
      <select data-testid="pack-chapter-select" value={p.chapter} onChange={(e) => p.onChapter(e.target.value)}>
        <option value="">Choose…</option>
        <option value="real-numbers">Real Numbers</option>
        <option value="triangles">Triangles</option>
        <option value="electricity">Electricity</option>
      </select>
      {p.buy as never}
    </div>
  ),
}));

import PricingPage from "./PricingPage";
import { subjectFromReferrer, subjectFromSearch, subjectFromStored } from "../components/pricing/pricingPlansCopy";
import { subjectOfChapter } from "../services/packs";

function Where() {
  const l = useLocation();
  return <div data-testid="where">{`${l.pathname}${l.search}${l.hash}`}</div>;
}

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/pricing" element={<><PricingPage /><Where /></>} />
        <Route path="/login" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

const sku = (id: string) => screen.getByTestId(id);
const where = () => screen.getByTestId("where").textContent ?? "";
/** The sign-in resume path a signed-out Buy is sent to (inside /login?redirect=). */
const resumeOf = (w: string) => decodeURIComponent(new URLSearchParams(w.split("?")[1] ?? "").get("redirect") ?? "");

Element.prototype.scrollIntoView = vi.fn();

beforeEach(() => {
  auth.user = null;
  owned.packs = [];
  buyPack.mockClear();
  tracked.checkout.mockClear();
  tracked.event.mockClear();
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

async function settle() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

describe("the subject the packs follow — pure helpers", () => {
  it("URL: t (subject or chapter) > subject > mock > chapter; unknown / repeated = absent; utm ignored", () => {
    expect(subjectFromSearch("?t=science")).toBe("science");
    expect(subjectFromSearch("?buy=pack_chapter&t=electricity")).toBe(subjectOfChapter("electricity"));
    expect(subjectFromSearch("?subject=science&pack=mock")).toBe("science");
    expect(subjectFromSearch("?mock=science")).toBe("science");
    expect(subjectFromSearch("?chapter=electricity")).toBe("science");
    expect(subjectFromSearch("?t=maths&subject=science")).toBe("maths");
    expect(subjectFromSearch("?t=science&t=maths")).toBeNull();
    expect(subjectFromSearch("?t=history&utm_source=x")).toBeNull();
    expect(subjectFromSearch("")).toBeNull();
  });

  it("referrer: same site only, a subject segment or a chapter slug", () => {
    const o = "https://www.lazytopper.com";
    expect(subjectFromReferrer(`${o}/cbq-class-10/science/electricity`, o)).toBe("science");
    expect(subjectFromReferrer(`${o}/highly-probable/10/Science`, o)).toBe("science");
    expect(subjectFromReferrer(`${o}/notes/real-numbers`, o)).toBe("maths");
    expect(subjectFromReferrer(`${o}/for-parents`, o)).toBeNull();
    expect(subjectFromReferrer("https://evil.example/science", o)).toBeNull();
    expect(subjectFromReferrer("not a url", o)).toBeNull();
  });

  it("stored context: the app's own key, read only", () => {
    expect(subjectFromStored(JSON.stringify({ grade: "10", subject: "Science" }))).toBe("science");
    expect(subjectFromStored("{bad")).toBeNull();
    expect(subjectFromStored(null)).toBeNull();
  });
});

describe("default subject on the page", () => {
  it("Maths with no hint; ?t=science preselects Science everywhere it shows", async () => {
    renderAt("/pricing");
    expect(sku("pricing-subject-maths").getAttribute("aria-pressed")).toBe("true");
    expect(sku("pricing-choose-chapter").textContent).toBe("Choose a Maths chapter · ₹49");
    cleanup();
    renderAt("/pricing?t=science#packs");
    expect(sku("pricing-subject-science").getAttribute("aria-pressed")).toBe("true");
    expect(sku("pricing-choose-chapter").textContent).toBe("Choose a Science chapter · ₹49");
    expect(screen.getByTestId("pricing-row-pack_subject").textContent).toContain("Science Subject Pack · ₹199");
    expect(screen.getByTestId("pricing-row-pack_mock").textContent).toContain("Science Mock Pack · ₹99");
  });

  it("the student's last-used subject (after mount) when the URL names none; never over the URL", async () => {
    localStorage.setItem("lazytopper.lastSubjectContext", JSON.stringify({ grade: "10", subject: "Science" }));
    renderAt("/pricing");
    await settle();
    expect(sku("pricing-subject-science").getAttribute("aria-pressed")).toBe("true");
    cleanup();
    renderAt("/pricing?t=maths");
    await settle();
    expect(sku("pricing-subject-maths").getAttribute("aria-pressed")).toBe("true");
  });
});

type Product = "chapter" | "subject" | "mock" | "cbq";
const CHAPTER_OF = { maths: "real-numbers", science: "electricity" } as const;

/** Tap the product's Buy for the CURRENT subject (the chapter picks the subject's sample chapter in the pop-up). */
async function tapBuy(product: Product, subject: "maths" | "science") {
  if (product === "chapter") {
    fireEvent.click(sku("pricing-choose-chapter"));
    fireEvent.change(await screen.findByTestId("pack-chapter-select"), { target: { value: CHAPTER_OF[subject] } });
    fireEvent.click(screen.getByTestId("packs-buy-pack_chapter"));
    return;
  }
  if (product === "cbq") {
    fireEvent.click(sku(`pricing-buy-pack_cbq-${subject}`));
    return;
  }
  fireEvent.click(sku(`pricing-buy-pack_${product}`));
}

const expectedTarget = (p: Product, s: "maths" | "science") => (p === "chapter" ? CHAPTER_OF[s] : s);

describe("checkout receives the right SKU + target — signed out (sign-in resume) and signed in (buyPack)", () => {
  for (const subject of ["maths", "science"] as const) {
    for (const product of ["chapter", "subject", "mock", "cbq"] as const) {
      it(`${product} · ${subject} · signed out -> /login?redirect=/pricing?buy=pack_${product}&t=…`, async () => {
        renderAt("/pricing");
        if (subject === "science") fireEvent.click(sku("pricing-subject-science"));
        await tapBuy(product, subject);
        await waitFor(() => expect(where()).toMatch(/^\/login/));
        expect(resumeOf(where())).toBe(`/pricing?buy=pack_${product}&t=${expectedTarget(product, subject)}`);
        expect(tracked.checkout).toHaveBeenCalledTimes(1);
        expect(tracked.checkout.mock.calls[0][0].sku).toBe(`pack_${product}`);
        expect(buyPack).not.toHaveBeenCalled();
      });

      it(`${product} · ${subject} · signed in -> buyPack(pack_${product}, ${expectedTarget(product, subject)})`, async () => {
        auth.user = { uid: "u1" };
        renderAt("/pricing");
        await settle();
        if (subject === "science") fireEvent.click(sku("pricing-subject-science"));
        await tapBuy(product, subject);
        await waitFor(() => expect(buyPack).toHaveBeenCalledTimes(1));
        expect(buyPack.mock.calls[0][0]).toBe(`pack_${product}`);
        expect(buyPack.mock.calls[0][1]).toBe(expectedTarget(product, subject));
        expect(tracked.checkout.mock.calls[0][0].sku).toBe(`pack_${product}`);
      });
    }
  }

  it("Bundle: signed out -> /pricing?buy=pack_bundle; signed in -> buyPack(pack_bundle, undefined)", async () => {
    renderAt("/pricing");
    fireEvent.click(sku("pricing-buy-pack_bundle"));
    await waitFor(() => expect(where()).toMatch(/^\/login/));
    expect(resumeOf(where())).toBe("/pricing?buy=pack_bundle");
    cleanup();
    auth.user = { uid: "u1" };
    renderAt("/pricing");
    await settle();
    fireEvent.click(sku("pricing-buy-pack_bundle"));
    await waitFor(() => expect(buyPack).toHaveBeenCalledTimes(1));
    expect(buyPack.mock.calls[0].slice(0, 2)).toEqual(["pack_bundle", undefined]);
  });

  it("switching AFTER opening the chapter picker: the chapter chosen in the picker is what is bought", async () => {
    auth.user = { uid: "u1" };
    renderAt("/pricing");
    await settle();
    fireEvent.click(sku("pricing-choose-chapter"));
    fireEvent.click(sku("pricing-subject-science"));
    expect(sku("pricing-choose-chapter").textContent).toBe("Choose a Science chapter · ₹49");
    fireEvent.change(await screen.findByTestId("pack-chapter-select"), { target: { value: "electricity" } });
    fireEvent.click(screen.getByTestId("packs-buy-pack_chapter"));
    await waitFor(() => expect(buyPack).toHaveBeenCalledTimes(1));
    expect(buyPack.mock.calls[0].slice(0, 2)).toEqual(["pack_chapter", "electricity"]);
  });

  it("switching between taps re-targets the one-subject rows (Maths, then Science)", async () => {
    auth.user = { uid: "u1" };
    renderAt("/pricing");
    await settle();
    fireEvent.click(sku("pricing-buy-pack_subject"));
    await waitFor(() => expect(buyPack).toHaveBeenCalledTimes(1));
    expect(buyPack.mock.calls[0].slice(0, 2)).toEqual(["pack_subject", "maths"]);
  });
});

describe("owned states (the shop's own ownership read: a pack covered by a Subject Pack or the Bundle counts)", () => {
  async function asOwner(packs: Array<{ sku: string; target: string }>, url = "/pricing") {
    auth.user = { uid: "u1" };
    owned.packs = packs;
    renderAt(url);
    await settle();
    await settle();
  }

  it("owns the Maths CBQ: Maths shows 'You own this', Science still sells", async () => {
    await asOwner([{ sku: "pack_cbq", target: "maths" }]);
    await screen.findByTestId("pricing-owned-pack_cbq-maths");
    expect(screen.queryByTestId("pricing-buy-pack_cbq-maths")).toBeNull();
    expect(screen.getByTestId("pricing-buy-pack_cbq-science")).toBeTruthy();
  });

  it("owns the Bundle: the Bundle and BOTH subjects' Subject + Mock rows say owned; the CBQ Packs still sell (not in the Bundle)", async () => {
    await asOwner([{ sku: "pack_bundle", target: "all" }]);
    await screen.findByTestId("pricing-owned-pack_bundle");
    for (const s of ["maths", "science"] as const) {
      fireEvent.click(sku(`pricing-subject-${s}`));
      expect(screen.getByTestId(`pricing-owned-pack_subject-${s}`)).toBeTruthy();
      expect(screen.getByTestId(`pricing-owned-pack_mock-${s}`)).toBeTruthy();
    }
    expect(screen.getByTestId("pricing-buy-pack_cbq-maths")).toBeTruthy();
    expect(screen.getByTestId("pricing-buy-pack_cbq-science")).toBeTruthy();
  });

  it("owns the Maths Subject Pack: Maths Subject + Mock owned; switching to Science sells Science", async () => {
    await asOwner([{ sku: "pack_subject", target: "maths" }]);
    await screen.findByTestId("pricing-owned-pack_subject-maths");
    expect(screen.getByTestId("pricing-owned-pack_mock-maths")).toBeTruthy();
    fireEvent.click(sku("pricing-subject-science"));
    expect(screen.getByTestId("pricing-buy-pack_subject")).toBeTruthy();
    expect(screen.getByTestId("pricing-buy-pack_mock")).toBeTruthy();
    fireEvent.click(sku("pricing-buy-pack_mock"));
    await waitFor(() => expect(buyPack).toHaveBeenCalledTimes(1));
    expect(buyPack.mock.calls[0].slice(0, 2)).toEqual(["pack_mock", "science"]);
  });

  it("owns the OTHER subject's Mock Pack: this subject's Mock still sells", async () => {
    await asOwner([{ sku: "pack_mock", target: "science" }]);
    await waitFor(() => expect(screen.getByTestId("pricing-buy-pack_mock")).toBeTruthy());
    fireEvent.click(sku("pricing-buy-pack_mock"));
    await waitFor(() => expect(buyPack).toHaveBeenCalledTimes(1));
    expect(buyPack.mock.calls[0].slice(0, 2)).toEqual(["pack_mock", "maths"]);
  });
});

describe("deep links into /pricing keep working", () => {
  it("?buy=pack_cbq&t=science (signed in) resumes the Science CBQ checkout once and strips the params; the switch follows it", async () => {
    auth.user = { uid: "u1" };
    renderAt("/pricing?buy=pack_cbq&t=science&utm_source=x");
    await waitFor(() => expect(buyPack).toHaveBeenCalledTimes(1));
    expect(buyPack.mock.calls[0].slice(0, 2)).toEqual(["pack_cbq", "science"]);
    await waitFor(() => expect(where()).toBe("/pricing?utm_source=x"));
    expect(sku("pricing-subject-science").getAttribute("aria-pressed")).toBe("true");
  });

  it("?buy=pack_chapter&t=real-numbers (signed in) resumes the chapter checkout", async () => {
    auth.user = { uid: "u1" };
    renderAt("/pricing?buy=pack_chapter&t=real-numbers");
    await waitFor(() => expect(buyPack).toHaveBeenCalledTimes(1));
    expect(buyPack.mock.calls[0].slice(0, 2)).toEqual(["pack_chapter", "real-numbers"]);
  });

  it("?chapter=electricity#packs opens the Chapter Pack pop-up on that chapter, with Science preselected", async () => {
    renderAt("/pricing?chapter=electricity#packs");
    const dlg = await screen.findByTestId("pack-dialog");
    expect(dlg.getAttribute("data-sku")).toBe("pack_chapter");
    expect((screen.getByTestId("pack-chapter-select") as HTMLSelectElement).value).toBe("electricity");
    expect(sku("pricing-subject-science").getAttribute("aria-pressed")).toBe("true");
  });

  it("?chapter=triangles#packs (notes pages) opens the Chapter Pack picker preselected on Triangles, Maths switch", async () => {
    renderAt("/pricing?chapter=triangles#packs");
    const dlg = await screen.findByTestId("pack-dialog");
    expect(dlg.getAttribute("data-sku")).toBe("pack_chapter");
    expect((screen.getByTestId("pack-chapter-select") as HTMLSelectElement).value).toBe("triangles");
    expect(sku("pricing-subject-maths").getAttribute("aria-pressed")).toBe("true");
  });

  it("?pack=bundle / ?pack=cbq&subject=science (Ads sitelinks) open that pack's pop-up", async () => {
    renderAt("/pricing?pack=bundle");
    expect((await screen.findByTestId("pack-dialog")).getAttribute("data-sku")).toBe("pack_bundle");
    cleanup();
    renderAt("/pricing?pack=cbq&subject=science");
    const dlg = await screen.findByTestId("pack-dialog");
    expect(dlg.getAttribute("data-sku")).toBe("pack_cbq");
    expect(dlg.getAttribute("data-subject")).toBe("science");
    expect(sku("pricing-subject-science").getAttribute("aria-pressed")).toBe("true");
  });

  it("?buy=pack_cbq&t=maths signed out (pay-by-phone off): sign-in, then the same resume path on /pricing", async () => {
    renderAt("/pricing?buy=pack_cbq&t=maths");
    fireEvent.click(sku("pricing-buy-pack_cbq-maths"));
    await waitFor(() => expect(where()).toMatch(/^\/login/));
    expect(resumeOf(where())).toBe("/pricing?buy=pack_cbq&t=maths");
  });

  it("?from=for_parents#cbq: the way back to the parents page sits in the CBQ card that #cbq lands on", async () => {
    renderAt("/pricing?from=for_parents#cbq");
    const back = screen.getByTestId("parent-return-cbq");
    expect(back.closest("#cbq")).not.toBeNull();
    expect(back.getAttribute("href")).toBe("/for-parents");
  });

  it("?mock=science#packs opens the Mock Pack pop-up on Science", async () => {
    renderAt("/pricing?mock=science#packs");
    const dlg = await screen.findByTestId("pack-dialog");
    expect(dlg.getAttribute("data-sku")).toBe("pack_mock");
    expect(dlg.getAttribute("data-subject")).toBe("science");
  });

  it("#packs and #cbq land on elements that exist and are re-asserted after late content (300 / 900 ms); #my-packs is the shop's own", async () => {
    for (const hash of ["#packs", "#cbq"]) {
      (Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>).mockClear();
      renderAt(`/pricing${hash}`);
      const target = document.getElementById(hash.slice(1));
      expect(target, hash).not.toBeNull();
      const spy = Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>;
      expect(spy.mock.instances.some((el) => el === target), hash).toBe(true);
      const first = spy.mock.calls.length;
      await act(async () => {
        await new Promise((r) => setTimeout(r, 950));
      });
      expect(spy.mock.calls.length, `${hash} re-asserted`).toBeGreaterThan(first);
      cleanup();
    }
    auth.user = { uid: "u1" };
    owned.packs = [{ sku: "pack_cbq", target: "maths" }];
    renderAt("/pricing#my-packs");
    await waitFor(() => expect(document.getElementById("my-packs")).not.toBeNull());
  });

  it("pack_view is sent once with surface 'pricing'", async () => {
    renderAt("/pricing");
    await settle();
    const views = tracked.event.mock.calls.filter((c) => c[0] === "pack_view");
    expect(views).toEqual([["pack_view", undefined, "pricing"]]);
  });

  it("'See inside + free sample page' opens the shop's pop-up: the Bundle's, and the CBQ for the selected subject", async () => {
    renderAt("/pricing?t=science");
    fireEvent.click(sku("pricing-see-cbq"));
    let dlg = await screen.findByTestId("pack-dialog");
    expect(dlg.getAttribute("data-sku")).toBe("pack_cbq");
    expect(dlg.getAttribute("data-subject")).toBe("science");
    cleanup();
    renderAt("/pricing");
    fireEvent.click(sku("pricing-see-bundle"));
    dlg = await screen.findByTestId("pack-dialog");
    expect(dlg.getAttribute("data-sku")).toBe("pack_bundle");
  });
});

describe("the Board Pass Pay path and its events", () => {
  it("payments on: Pay is PassCheckout's own button inside the tracked buy area; signed out it goes to sign-in and returns to /pricing", async () => {
    vi.stubEnv("VITE_PAYMENTS_ENABLED", "1");
    renderAt("/pricing");
    const area = screen.getByTestId("pricing-passes");
    const pay = area.querySelector<HTMLButtonElement>(".lt-pricing-pay--boards")!;
    expect(pay.textContent).toBe("Pay ₹1,917 once till your boards".replace("₹1,917", pay.textContent!.match(/₹[\d,]+/)![0]));
    fireEvent.click(pay);
    await waitFor(() => expect(where()).toMatch(/^\/login/));
    expect(resumeOf(where())).toBe("/pricing");
  });

  it("?buy=board_pass signed out (pay-by-phone off) goes to sign-in and resumes on /pricing?buy=board_pass", async () => {
    vi.stubEnv("VITE_PAYMENTS_ENABLED", "1");
    renderAt("/pricing?buy=board_pass&utm_source=email");
    await waitFor(() => expect(where()).toMatch(/^\/login/));
    expect(resumeOf(where())).toBe("/pricing?buy=board_pass");
  });
});
