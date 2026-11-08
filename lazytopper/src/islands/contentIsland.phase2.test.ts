import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve as resolvePath } from "node:path";
import {
  APP_ONLY_REGIONS,
  FOOTER_UNWATCHED_PATHS,
  NCERT_HUB_SUBJECT_KEY,
  TRACKED_LINK,
  __resetIslandForTests,
  appViewRequested,
  boot,
} from "./contentIsland";

/**
 * SPEED-ISLANDS-2 — the island on Important Questions, the CBQ chapter pages and the NCERT Hub. Their controls are
 * the app's (React state the markup cannot replay by itself), so the island's job there is: never a dead control
 * (dropdowns are recorded and replayed into the app, the hub's in-place chapter links are held), never the wrong
 * view (a URL or stored choice the app would honour boots the app at once), and the app before any price.
 */

const SRC = resolvePath(__dirname, "..");
const read = (rel: string) => readFileSync(resolvePath(SRC, rel), "utf8");

const ISLAND_TAG =
  '<script type="module" src="/assets/contentIsland-AAAAAAAA.js" data-lt-island="" data-lt-app-entry="/assets/index-BBBBBBBB.js" data-lt-app-preloads=""></script>';
const appScript = () => document.head.querySelector<HTMLScriptElement>('script[src="/assets/index-BBBBBBBB.js"]');
const state = () => document.documentElement.getAttribute("data-lt-island");

/** Shaped like the served Important Questions page (HighlyProbableQuestions.tsx) and the NCERT Hub (NcertBooksPage.tsx). */
const PAGE = `
<div id="root"><main><template data-lt-route="start"></template>
  <label for="hpq-topic-filter">Topic:</label>
  <select id="hpq-topic-filter"><option value="all">All topics</option><option value="Circles">Circles</option><option value="Triangles">Triangles</option></select>
  <div data-hpq-question="q1"><button type="button">Check my answer</button><button>Practice similar</button></div>
  <ol class="lt-nb__alllist"><li class="lt-nb__allrow"><a class="lt-nb__allch" href="/ncert-class-10?subject=maths&amp;ch=real-numbers">Ch 1 Real Numbers</a>
    <span class="lt-nb__alllinks"><a id="notes" href="/notes/real-numbers">Notes</a></span></li></ol>
  <div class="lt-show-all"><button type="button" class="lt-show-all__btn">Show all solutions</button></div>
</main></div>`;

async function bootAt(url: string): Promise<void> {
  __resetIslandForTests();
  window.history.replaceState(null, "", url);
  document.head.innerHTML = ISLAND_TAG;
  document.body.innerHTML = PAGE;
  document.documentElement.removeAttribute("data-lt-island");
  window.requestAnimationFrame = (cb: FrameRequestCallback) => window.setTimeout(() => cb(0), 0);
  await boot();
}

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  __resetIslandForTests();
  vi.restoreAllMocks();
  window.localStorage.clear();
  window.history.replaceState(null, "", "/");
});

describe("a view only the app can show boots the app at once", () => {
  const none = () => null;
  it("NCERT Hub: ?subject= / ?ch= / ?read=, the legacy #maths / #science, or a stored Science pick", () => {
    const at = (search: string, hash = "", stored: string | null = null) =>
      appViewRequested({ pathname: "/ncert-class-10", search, hash }, () => stored);
    expect(at("")).toBe(false);
    expect(at("?gclid=abc&utm_source=google")).toBe(false); // ad and campaign tags are not a view
    expect(at("?subject=science")).toBe(true);
    expect(at("?subject=maths")).toBe(true); // the breadcrumb differs from the served one
    expect(at("?ch=triangles")).toBe(true);
    expect(at("?read=jemh106")).toBe(true);
    expect(at("", "#science")).toBe(true);
    expect(at("", "#Maths")).toBe(true);
    expect(at("", "#somewhere")).toBe(false);
    expect(at("", "", "science")).toBe(true);
    expect(at("", "", "maths")).toBe(false); // the served view
    expect(
      appViewRequested({ pathname: "/ncert-class-10", search: "", hash: "" }, () => {
        throw new Error("blocked storage");
      }),
    ).toBe(false);
  });

  it("Important Questions: a ?topic= filter (the Exam Trends deep link); 'all' is the served view", () => {
    const at = (search: string) => appViewRequested({ pathname: "/highly-probable/10/Maths", search, hash: "" }, none);
    expect(at("")).toBe(false);
    expect(at("?topic=all")).toBe(false);
    expect(at("?topic=Circles")).toBe(true);
  });

  it("CBQ chapter pages read nothing but the path", () => {
    expect(appViewRequested({ pathname: "/cbq-class-10/electricity", search: "?topic=x&subject=y", hash: "#science" }, () => "science")).toBe(false);
  });

  it("at boot: the hub with a stored Science pick loads the app straight away; without one it stays an island", async () => {
    await bootAt("/ncert-class-10");
    expect(state()).toBe("island");
    expect(appScript()).toBeNull();
    window.localStorage.setItem(NCERT_HUB_SUBJECT_KEY, "science");
    await bootAt("/ncert-class-10");
    expect(state()).toBe("upgrading");
    expect(appScript()).not.toBeNull();
  });

  it("at boot: an Important Questions topic link loads the app straight away", async () => {
    await bootAt("/highly-probable/10/Maths?topic=Circles");
    expect(state()).toBe("upgrading");
  });
});

describe("rule b on the phase-2 pages", () => {
  it("a dropdown choice loads the app and is replayed into the app's select (its onChange fires)", async () => {
    await bootAt("/highly-probable/10/Maths");
    const select = document.getElementById("hpq-topic-filter") as HTMLSelectElement;
    select.value = "Triangles";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    expect(state()).toBe("upgrading");
    expect(select.classList.contains("lt-island-busy")).toBe(true);
    // The curtain is up: #root is the fresh copy React renders into. Play React: own it, and listen for onChange.
    const root = document.getElementById("root") as HTMLElement;
    expect(root.hasAttribute("data-lt-island-hidden")).toBe(true);
    const appSelect = root.querySelector("#hpq-topic-filter") as HTMLSelectElement;
    const seen: string[] = [];
    appSelect.addEventListener("change", () => seen.push(appSelect.value));
    const own = (el: Element) => ((el as unknown as Record<string, unknown>)["__reactFiber$t"] = {});
    (root as unknown as Record<string, unknown>)["__reactContainer$t"] = {};
    own(root.querySelector("template") as Element);
    own(appSelect);
    await vi.waitFor(() => expect(state()).toBe("app"), { timeout: 8000, interval: 50 });
    expect(seen).toEqual(["Triangles"]);
    expect(appSelect.value).toBe("Triangles");
    expect(document.querySelectorAll(".lt-island-busy, #lt-island-curtain").length).toBe(0);
  }, 10_000);

  it("a choice the app does not offer is left alone (never a guessed filter)", async () => {
    await bootAt("/highly-probable/10/Maths");
    const select = document.getElementById("hpq-topic-filter") as HTMLSelectElement;
    select.value = "Circles";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    const root = document.getElementById("root") as HTMLElement;
    const appSelect = root.querySelector("#hpq-topic-filter") as HTMLSelectElement;
    appSelect.querySelector('option[value="Circles"]')?.remove();
    const seen: string[] = [];
    appSelect.addEventListener("change", () => seen.push(appSelect.value));
    (root as unknown as Record<string, unknown>)["__reactContainer$t"] = {};
    for (const el of [root.querySelector("template"), appSelect]) (el as unknown as Record<string, unknown>)["__reactFiber$t"] = {};
    await vi.waitFor(() => expect(state()).toBe("app"), { timeout: 8000, interval: 50 });
    expect(seen).toEqual([]);
  }, 10_000);

  it("the hub's in-place chapter link is held for the app (it picks the chapter without a reload); its other links navigate", async () => {
    await bootAt("/ncert-class-10");
    const pick = document.querySelector("a.lt-nb__allch") as HTMLElement;
    const event = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
    pick.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(state()).toBe("upgrading");
    const notes = document.getElementById("notes") as HTMLElement;
    const plain = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
    notes.dispatchEvent(plain);
    expect(plain.defaultPrevented).toBe(false);
  });

  it("an app-owned button (Check my answer, Practice similar) is held, never swallowed", async () => {
    await bootAt("/highly-probable/10/Maths");
    const btn = [...document.querySelectorAll("button")].find((b) => b.textContent === "Practice similar") as HTMLElement;
    const event = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
    btn.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(btn.classList.contains("lt-island-busy")).toBe(true);
    expect(appScript()).not.toBeNull();
  });

  it("the app-only regions include the CBQ pack card and the end of the Important Questions list", () => {
    expect(APP_ONLY_REGIONS).toEqual(expect.arrayContaining(["section.lt-cbqs__cta--pack", "div.lt-show-all"]));
    expect(TRACKED_LINK).toContain("a.lt-nb__allch");
  });
});

describe("rule c on the phase-2 pages — which regions load the app before the visitor reaches them", () => {
  const observed: Element[] = [];
  beforeEach(() => {
    observed.length = 0;
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe(el: Element) {
          observed.push(el);
        }
        disconnect() {}
      },
    );
  });
  afterEach(() => vi.unstubAllGlobals());
  const FOOTER = '<footer class="lt-public-legal"><a href="/contact">Contact</a></footer>';
  const PACK = '<section class="lt-cbqs__cta lt-cbqs__cta--pack"><a href="/packs?buy=pack_cbq&amp;t=science">Buy</a></section>';

  it("a CBQ chapter page watches its pack card and its footer", async () => {
    window.history.replaceState(null, "", "/cbq-class-10/electricity");
    __resetIslandForTests();
    document.body.innerHTML = `<div id="root">${PACK}${FOOTER}</div>`;
    document.head.innerHTML = ISLAND_TAG;
    await boot();
    expect(observed.map((e) => e.className).sort()).toEqual(["lt-cbqs__cta lt-cbqs__cta--pack", "lt-public-legal"]);
  });

  it("the NCERT Hub does not watch its footer (only the lazy 'PDF packs' link, never in the markup): it stays an island", async () => {
    window.history.replaceState(null, "", "/ncert-class-10");
    __resetIslandForTests();
    document.head.innerHTML = ISLAND_TAG;
    document.body.innerHTML = `<div id="root"><main></main>${FOOTER}</div>`;
    await boot();
    expect(observed).toEqual([]);
    expect(FOOTER_UNWATCHED_PATHS).toEqual(["/ncert-class-10"]);
    expect(state()).toBe("island");
  });

  it("the Important Questions list end is watched (the app alone adds the buying block after it)", async () => {
    await bootAt("/highly-probable/10/Maths");
    expect(observed.map((e) => e.className)).toEqual(["lt-show-all"]);
  });
});

describe("PINS — the markup and app contracts the island relies on", () => {
  it("the NCERT Hub's stored-subject key, URL state and in-place chapter links", () => {
    const hub = read("pages/NcertBooksPage.tsx");
    expect(hub).toContain(`export const NCERT_HUB_SUBJECT_KEY = "${NCERT_HUB_SUBJECT_KEY}";`);
    expect(hub).toMatch(/params\.get\("read"\)/);
    expect(hub).toMatch(/params\.get\("ch"\)/);
    expect(hub).toMatch(/params\.get\("subject"\)/);
    expect(hub).toMatch(/className="lt-nb__allch"[\s\S]{0,200}onClick=/);
    expect(hub).toMatch(/id="nb-chapter"[\s\S]{0,200}onChange=/);
  });

  it("Important Questions: the ?topic= deep link, the topic select, and the buying block after the list end", () => {
    const hpq = read("pages/HighlyProbableQuestions.tsx");
    expect(hpq).toMatch(/searchParams\.get\("topic"\)/);
    expect(hpq).toMatch(/id="hpq-topic-filter"/);
    const end = hpq.indexOf('className="lt-show-all"');
    const offers = hpq.indexOf("<ImportantQsOffers ");
    expect(end).toBeGreaterThan(0);
    expect(offers).toBeGreaterThan(end);
  });

  it("the CBQ chapter page's pack card is the class the island watches", () => {
    expect(read("components/cbq/CbqCtas.tsx")).toContain('className="lt-cbqs__cta lt-cbqs__cta--pack"');
    expect(read("pages/cbq/CbqChapterPage.tsx")).toContain("<CbqPackCta ");
  });
});
