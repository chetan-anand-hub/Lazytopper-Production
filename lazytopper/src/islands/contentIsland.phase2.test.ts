import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve as resolvePath } from "node:path";
import { setMatchMediaMatches } from "../test/setup";
import {
  APP_ONLY_REGIONS,
  FOOTER_UNWATCHED_PATHS,
  FOOTER_PACKS_HREF,
  LOGIN_BUTTON_STYLE,
  loginHrefFor,
  nav,
  NCERT_HUB_SUBJECT_KEY,
  TRACKED_LINK,
  __resetIslandForTests,
  appViewRequested,
  boot,
  variantMismatch,
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

describe("every width — a capture that does not fit the window's layout hands over to the app at once", () => {
  it("desktop capture below 1024 px, or phone capture at 1024 px and up (useIsDesktop's switch)", () => {
    expect(variantMismatch("desktop", false)).toBe(true); // a desktop browser at 1023 px
    expect(variantMismatch("mobile", true)).toBe(true); // a tablet in landscape
    expect(variantMismatch("desktop", true)).toBe(false);
    expect(variantMismatch("mobile", false)).toBe(false);
    expect(variantMismatch("", true)).toBe(false); // an older build's tag: phase-1 behaviour
  });

  it("at boot", async () => {
    const at = async (variant: string, width: number) => {
      setMatchMediaMatches(width >= 1024); // the app's (min-width: 1024px)
      await bootAt("/cbq-class-10/electricity");
      document.head.innerHTML = ISLAND_TAG.replace("data-lt-island=", `data-lt-variant="${variant}" data-lt-island=`);
      __resetIslandForTests();
      await boot();
      return state();
    };
    expect(await at("desktop", 1023)).toBe("upgrading");
    expect(await at("mobile", 1024)).toBe("upgrading");
    expect(await at("mobile", 768)).toBe("island");
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

describe("a <details> open at the upgrade (CBQ explanations, the hub's chapter lists)", () => {
  it("the hidden copy's own toggle events are not the visitor's: a held tap completes without the 6 s find stall", async () => {
    await bootAt("/ncert-class-10");
    document.querySelector("main")?.insertAdjacentHTML(
      "beforeend",
      '<details class="lt-nb__all"><summary>All 14 Maths chapters</summary><ol><li>x</li></ol></details>',
    );
    const live = document.querySelector("details.lt-nb__all") as HTMLDetailsElement;
    live.open = true;
    live.dispatchEvent(new Event("toggle")); // the visitor opened it (jsdom fires no toggle by itself)
    const pick = document.querySelector("a.lt-nb__allch") as HTMLElement;
    pick.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 })); // held: curtain up
    const root = document.getElementById("root") as HTMLElement;
    const copy = root.querySelector("details.lt-nb__all") as HTMLDetailsElement;
    copy.dispatchEvent(new Event("toggle")); // what Chrome fires for an inserted <details open>
    const own = (el: Element) => ((el as unknown as Record<string, unknown>)["__reactFiber$t"] = {});
    (root as unknown as Record<string, unknown>)["__reactContainer$t"] = {};
    for (const el of root.querySelectorAll("template, details, a, select, button")) own(el);
    const clicked: string[] = [];
    (root.querySelector("a.lt-nb__allch") as HTMLElement).addEventListener("click", (e) => {
      e.preventDefault();
      clicked.push("pick");
    });
    const t0 = Date.now();
    await vi.waitFor(() => expect(state()).toBe("app"), { timeout: 9000, interval: 50 });
    expect(Date.now() - t0).toBeLessThan(4000);
    expect(clicked).toEqual(["pick"]);
    expect(copy.open).toBe(true);
  }, 12_000);
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

  it("CBQ navbar: the island shows App.tsx's signed-out 'Log in' at every width, stays an island, and the button logs in", async () => {
    const go = vi.spyOn(nav, "go").mockImplementation(() => undefined);
    for (const width of [360, 1280]) {
      setMatchMediaMatches(width >= 1024); // the app's (min-width: 1024px); the capture is the matching variant
      window.history.replaceState(null, "", "/cbq-class-10/electricity?utm_source=x");
      __resetIslandForTests();
      document.head.innerHTML = ISLAND_TAG;
      document.body.innerHTML =
        '<div id="root"><div class="navbar"><a href="/">LazyTopper</a><div style="display: flex; align-items: center; gap: 10px;"></div></div><main></main></div>';
      await boot();
      await new Promise((r) => setTimeout(r, 2200)); // past onIdle's fallback: no idle hand-over for the navbar
      expect(`${width}:${state()}`).toBe(`${width}:island`);
      const button = document.querySelector(".navbar > div:last-child > button") as HTMLButtonElement;
      expect(button.outerHTML).toBe(`<button type="button" style="${LOGIN_BUTTON_STYLE}" data-lt-island-login="">Log in</button>`);
      expect(button.textContent).toBe("Log in");
      const event = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
      button.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
      expect(go).toHaveBeenLastCalledWith(loginHrefFor(window.location));
      expect(loginHrefFor(window.location)).toBe("/login?redirect=%2Fcbq-class-10%2Felectricity%3Futm_source%3Dx");
    }
  }, 12_000);

  it("a visitor with an auth record never gets the island's Log in (the app at once, as today)", async () => {
    window.localStorage.setItem("lazytopper.auth.local.v1", JSON.stringify({ uid: "u" }));
    window.history.replaceState(null, "", "/cbq-class-10/electricity");
    __resetIslandForTests();
    document.head.innerHTML = ISLAND_TAG;
    document.body.innerHTML = '<div id="root"><div class="navbar"><a href="/">LazyTopper</a><div></div></div></div>';
    await boot();
    expect(state()).toBe("upgrading");
    expect(document.querySelector("[data-lt-island-login]")).toBeNull();
  });

  it("footer 'PDF packs' after 'For parents': NCERT Hub only, flag on, and only while the footer is below the fold", async () => {
    const page = '<div id="root"><main></main><footer class="lt-public-legal"><a href="/for-parents">For parents</a><a href="/legal/privacy">Privacy</a></footer></div>';
    let footerTop = 2000;
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
      const top = this.matches("footer") ? footerTop : 0;
      return { top, bottom: top, left: 0, right: 0, width: 0, height: 0, x: 0, y: top, toJSON: () => ({}) } as DOMRect;
    });
    const run = async (path = "/ncert-class-10") => {
      window.history.replaceState(null, "", path);
      __resetIslandForTests();
      document.head.innerHTML = ISLAND_TAG;
      document.body.innerHTML = page;
      await boot();
      return [...document.querySelectorAll("footer a")].map((a) => `${a.textContent}=${a.getAttribute("href")}`);
    };
    const plain = ["For parents=/for-parents", "Privacy=/legal/privacy"];
    expect(await run()).toEqual(plain); // flag off: the app shows no link either
    vi.stubEnv("VITE_PACKS_ENABLED", "1");
    expect(await run()).toEqual(["For parents=/for-parents", `PDF packs=${FOOTER_PACKS_HREF}`, "Privacy=/legal/privacy"]);
    expect(FOOTER_PACKS_HREF).toBe("/pricing#packs"); // PublicLegalFooter's default: the hub passes no packsHref
    // A CBQ / solutions footer carries the page's own href (/pricing?chapter=<bank>#packs): left to the app, which loads first.
    expect(await run("/cbq-class-10/electricity")).toEqual(plain);
    // In view (desktop hub, footer in the 800-px viewport): inserting would reflow a visible row; the app adds it.
    footerTop = 500;
    expect(await run()).toEqual(plain);
    footerTop = 2000;
    // The app's link is a tracked /pricing link: held and replayed, so the app sends its pack_entry click.
    await run();
    const link = [...document.querySelectorAll("footer a")].find((a) => a.textContent === "PDF packs") as HTMLElement;
    const event = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
    link.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(state()).toBe("upgrading");
    vi.unstubAllEnvs();
  });

  it("#1640 B1: a held link whose app twin never renders in time (lazy chunk delayed) still lands on its URL", async () => {
    const go = vi.spyOn(nav, "go").mockImplementation(() => undefined);
    window.history.replaceState(null, "", "/ncert-class-10");
    __resetIslandForTests();
    document.head.innerHTML = ISLAND_TAG;
    document.body.innerHTML =
      '<div id="root"><template data-lt-route="start"></template><main><p>x</p></main><footer class="lt-public-legal"><a href="/pricing#packs">PDF packs</a></footer></div>';
    await boot();
    const link = document.querySelector("footer a") as HTMLElement;
    link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 })); // held: curtain up
    const root = document.getElementById("root") as HTMLElement;
    root.querySelector("footer a")?.remove(); // the app's footer link is still in its lazy chunk
    (root as unknown as Record<string, unknown>)["__reactContainer$t"] = {};
    for (const el of root.querySelectorAll("template, main, footer")) (el as unknown as Record<string, unknown>)["__reactFiber$t"] = {};
    await vi.waitFor(() => expect(state()).toBe("app"), { timeout: 12_000, interval: 100 });
    expect(go).toHaveBeenCalledWith(new URL("/pricing#packs", window.location.href).href);
    expect(document.querySelectorAll(".lt-island-busy").length).toBe(0);
  }, 15_000);

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
  it("App.tsx's signed-out Log in button: same target and the same style, property for property", () => {
    const app = read("App.tsx");
    const at = app.indexOf("navigate(`/login?redirect=${encodeURIComponent(isSafeInternalPath(");
    expect(at).toBeGreaterThan(0);
    const block = app.slice(at, app.indexOf("Log in", at));
    const camel: Record<string, string> = {
      border: '"1px solid var(--bg-card-border)"', borderRadius: "12", background: '"var(--bg-card)"', color: '"var(--text-muted)"',
      fontWeight: "800", fontSize: '"0.78rem"', padding: '"6px 14px"', cursor: '"pointer"', textTransform: '"uppercase"', letterSpacing: '"0.3px"',
    };
    for (const [prop, value] of Object.entries(camel)) expect(block).toContain(`${prop}: ${value}`);
    expect(block.match(/^\s+[a-zA-Z]+: /gm)?.length).toBe(Object.keys(camel).length); // no property the island lacks
    for (const css of ["1px solid var(--bg-card-border)", "12px", "var(--bg-card)", "var(--text-muted)", "800", "0.78rem", "6px 14px", "pointer", "uppercase", "0.3px"]) {
      expect(LOGIN_BUTTON_STYLE).toContain(css);
    }
  });

  it("the footer's PDF packs link: PublicLegalFooter default href, after 'For parents', behind the same flag", () => {
    const footer = read("components/ux/PublicLegalFooter.tsx");
    expect(footer).toContain(`packsHref = "${FOOTER_PACKS_HREF}"`);
    expect(footer.indexOf("<PacksEntry kind=\"footer-link\"")).toBeGreaterThan(footer.indexOf('<Link to="/for-parents">For parents</Link>'));
    expect(read("lib/packs/PacksFooterLink.tsx")).toMatch(/>\s*PDF packs\s*<\/Link>/);
    expect(read("lib/packs/packEntryLazy.tsx")).toContain('String(import.meta.env.VITE_PACKS_ENABLED ?? "").trim() === "1"');
  });

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
