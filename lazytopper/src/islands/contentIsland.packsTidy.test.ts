import { afterEach, describe, expect, it, vi } from "vitest";
import { __resetIslandForTests, appViewRequested, boot, describe as describeControl, nav, replayRadios, resolve, RADIO_REPLAY_ATTR, TWIN_ATTR } from "./contentIsland";

/**
 * PACKS-TIDY-2 (owner, 11 Nov 2026) - the island's three additive changes for /packs:
 *  1. `/packs#cbq` replaces itself with /cbq-packs at boot (the CBQ block moved there); nothing else redirects.
 *  2. /packs with a subject in the URL (?subject= / ?mock= / ?chapter=) gets the app at once (the served view is Maths).
 *  3. a radio switch changed on the static page (opted in with RADIO_REPLAY_ATTR) loads the app and is replayed into it, so a held Buy
 *     lands on the Buy of the subject the visitor chose (the Buy boxes' twin keys do not name the subject). Radios that are not opted
 *     in (/cbq-packs) are not recorded: that page behaves exactly as before.
 */
const ISLAND_TAG =
  '<script type="module" src="/assets/contentIsland-AAAAAAAA.js" data-lt-island="" data-lt-app-entry="/assets/index-BBBBBBBB.js" data-lt-app-preloads=""></script>';
const own = (el: Element | null) => {
  if (el) (el as unknown as Record<string, unknown>)["__reactFiber$t"] = {};
};
const appScript = () => document.head.querySelector('script[src="/assets/index-BBBBBBBB.js"]');
const none = () => null;

const SWITCH = (attr: string, name: string) => `
  <div ${attr}><div role="radiogroup">
    <label><input type="radio" name="${name}" value="maths" checked></label>
    <label><input type="radio" name="${name}" value="science"></label>
  </div></div>`;

async function bootAt(url: string, body: string): Promise<void> {
  __resetIslandForTests();
  window.history.replaceState(null, "", url);
  document.head.innerHTML = ISLAND_TAG;
  document.body.innerHTML = body;
  window.requestAnimationFrame = (cb: FrameRequestCallback) => window.setTimeout(() => cb(0), 0);
  await boot();
}

afterEach(() => {
  __resetIslandForTests();
  vi.restoreAllMocks();
  window.history.replaceState(null, "", "/");
  document.body.innerHTML = "";
  document.head.innerHTML = "";
});

describe("PACKS-TIDY-2 island: /packs#cbq", () => {
  it("replaces /packs#cbq with /cbq-packs (subject + utm kept) before wiring anything", async () => {
    const replace = vi.spyOn(nav, "replace").mockImplementation(() => undefined);
    await bootAt("/packs?subject=science&utm_source=google#cbq", "<main></main>");
    expect(replace).toHaveBeenCalledWith("/cbq-packs?subject=science&utm_source=google");
    expect(document.documentElement.getAttribute("data-lt-island")).not.toBe("island");
    expect(appScript()).toBeNull();
  });

  it("never redirects another hash, another page, or a ?buy= link (that checkout opens on /packs)", async () => {
    const replace = vi.spyOn(nav, "replace").mockImplementation(() => undefined);
    for (const url of ["/packs", "/packs#my-packs", "/cbq-packs#cbq", "/packs?buy=pack_cbq&t=maths#cbq"]) {
      await bootAt(url, "<main></main>");
    }
    expect(replace).not.toHaveBeenCalled();
  });
});

describe("PACKS-TIDY-2 island: /packs views", () => {
  it("?subject= / ?mock= / ?chapter= load the app at once; tracking params still do not", () => {
    const at = (search: string) => appViewRequested({ pathname: "/packs", search, hash: "" }, none);
    expect(at("?subject=science")).toBe(true);
    expect(at("?mock=science")).toBe(true);
    expect(at("?chapter=light-reflection-and-refraction")).toBe(true);
    expect(at("?utm_source=google&gclid=abc")).toBe(false);
    expect(at("")).toBe(false);
  });
});

describe("PACKS-TIDY-2 island: the opted-in radio switch", () => {
  it("a static Science tap loads the app and is replayed into the app's switch; a held Buy then resolves to the app's Buy in the same twin box", async () => {
    await bootAt(
      "/packs?utm_source=google",
      `${SWITCH(RADIO_REPLAY_ATTR, "lt-ss-packs-subject")}
       <div ${TWIN_ATTR}="pk-buy-subject"><button>Maths Subject Pack · ₹199 + GST</button></div>
       <div id="root"></div>`,
    );
    const sci = document.querySelector('input[value="science"]') as HTMLInputElement;
    sci.checked = true;
    sci.dispatchEvent(new Event("change", { bubbles: true }));
    expect(appScript()).not.toBeNull(); // the app is on its way
    const held = describeControl(document.querySelector(`[${TWIN_ATTR}] button`) as Element);
    expect(held.twin).toBe("pk-buy-subject");

    // The app renders its own switch (Maths, its default) and Buy box; React owns them.
    const root = document.getElementById("root") as HTMLElement;
    root.innerHTML = `${SWITCH(RADIO_REPLAY_ATTR, "lt-ss-packs-subject")}<div ${TWIN_ATTR}="pk-buy-subject"><div class="lt-ptb"><button>Buy Maths ₹235</button></div></div>`;
    const appSci = root.querySelector('input[value="science"]') as HTMLInputElement;
    const box = root.querySelector(`[${TWIN_ATTR}]`) as HTMLElement;
    for (const el of [...root.querySelectorAll("input"), box, box.querySelector("button")]) own(el);
    const picked = vi.fn(() => {
      // the app's onChange: its Buy follows the switch
      (box.querySelector("button") as HTMLElement).textContent = "Buy Science ₹235";
    });
    appSci.addEventListener("click", picked);
    replayRadios();
    expect(picked).toHaveBeenCalledTimes(1);
    expect(appSci.checked).toBe(true);
    replayRadios(); // idempotent: already checked
    expect(picked).toHaveBeenCalledTimes(1);
    expect(resolve(held)?.textContent).toBe("Buy Science ₹235");
  });

  it("CONTROL: a radio that is not opted in (/cbq-packs' switch) is not recorded, replayed, or a reason to load the app", async () => {
    await bootAt("/cbq-packs", `${SWITCH("data-x", "lt-ss-cbq-subject")}<div id="root"></div>`);
    const sci = document.querySelector('input[value="science"]') as HTMLInputElement;
    sci.checked = true;
    sci.dispatchEvent(new Event("change", { bubbles: true }));
    expect(appScript()).toBeNull();
    const root = document.getElementById("root") as HTMLElement;
    root.innerHTML = SWITCH("data-x", "lt-ss-cbq-subject");
    for (const el of root.querySelectorAll("input")) own(el);
    const picked = vi.fn();
    root.querySelector('input[value="science"]')?.addEventListener("click", picked);
    replayRadios();
    expect(picked).not.toHaveBeenCalled();
  });
});
