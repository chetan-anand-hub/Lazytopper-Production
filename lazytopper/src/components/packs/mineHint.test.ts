/**
 * BRIDGE-PANEL-1 round 3 - the device height hint and the STATIC page's inline script (run here as the browser would while parsing):
 * it reserves the hinted height only for this browser's last signed-in account at this width, hands the decision to React, and
 * reserves nothing for a signed-out visitor, another account, a stale or junk hint.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ACTIVE_UID_KEY, MINE_HINT_KEY, MINE_HINT_SCRIPT, MINE_SKELETON_PX, clearMineHint, readMineHint, staticMineHandover, writeMineHint, writeMineOwner } from "./mineHint";

const W = 360;
function runStaticScript(): HTMLDivElement {
  document.body.innerHTML = '<div class="lt-packs__mineslot"></div>';
  const slot = document.body.firstElementChild as HTMLDivElement;
  const script = document.createElement("script");
  document.body.appendChild(script);
  Object.defineProperty(document, "currentScript", { value: script, configurable: true });
  // eslint-disable-next-line no-new-func
  new Function(MINE_HINT_SCRIPT)();
  Object.defineProperty(document, "currentScript", { value: null, configurable: true });
  return slot;
}

beforeEach(() => {
  localStorage.clear();
  delete window.__ltMineHint;
  Object.defineProperty(window, "innerWidth", { value: W, configurable: true });
  Object.defineProperty(window, "innerHeight", { value: 780, configurable: true });
});
afterEach(() => {
  document.body.innerHTML = "";
});

describe("readMineHint / writeMineHint", () => {
  it("per account, per width; a new account replaces the old one; junk and stale hints are ignored", () => {
    const now = 1_800_000_000_000;
    writeMineHint("u1", 360, 812.4, now);
    writeMineHint("u1", 1280, 560, now);
    expect(readMineHint("u1", 360, now)).toBe(812);
    expect(readMineHint("u1", 1280, now)).toBe(560);
    expect(readMineHint("u1", 412, now)).toBe(MINE_SKELETON_PX);
    expect(readMineHint("u2", 360, now)).toBeNull();
    expect(readMineHint("u1", 360, now + 61 * 24 * 3600 * 1000)).toBeNull();
    writeMineHint("u2", 360, 300, now);
    expect(readMineHint("u1", 1280, now)).toBeNull();
    writeMineHint("u2", 360, 99999, now);
    expect(readMineHint("u2", 360, now)).toBe(300);
    localStorage.setItem(MINE_HINT_KEY, "{bad json");
    expect(readMineHint("u2", 360, now)).toBeNull();
    writeMineHint("u3", 360, 400, now);
    clearMineHint();
    expect(localStorage.getItem(MINE_HINT_KEY)).toBeNull();
  });
  it("PACKS-FIRSTBUY-1: ownership known, no height yet at this width -> the SKELETON's height (not a screen); an existing height is kept", () => {
    const now = 1_800_000_000_000;
    writeMineOwner("u1", now);
    expect(readMineHint("u1", 360, now)).toBe(MINE_SKELETON_PX);
    writeMineHint("u1", 360, 900, now);
    writeMineOwner("u1", now);
    expect(readMineHint("u1", 360, now)).toBe(900);
    expect(readMineHint("u2", 360, now)).toBeNull();
  });
  it("stores only a layout hint: account id, time, heights - nothing about packs, passes or prices", () => {
    writeMineHint("u1", 360, 700, 1);
    expect(Object.keys(JSON.parse(localStorage.getItem(MINE_HINT_KEY) || "{}")).sort()).toEqual(["h", "t", "u"]);
  });
});

describe("MINE_HINT_SCRIPT (the static page)", () => {
  it("last signed-in account has a hint for this width -> the slot gets that min-height and React gets the hand-over", () => {
    localStorage.setItem(ACTIVE_UID_KEY, "u1");
    writeMineHint("u1", W, 733, Date.now());
    const slot = runStaticScript();
    expect(slot.style.minHeight).toBe("733px");
    expect(staticMineHandover()).toEqual({ u: "u1", px: 733 });
  });
  it("PACKS-FIRSTBUY-1: ownership known but no height at this width -> the skeleton's height, in step with readMineHint", () => {
    localStorage.setItem(ACTIVE_UID_KEY, "u1");
    writeMineHint("u1", 1280, 500, Date.now());
    expect(runStaticScript().style.minHeight).toBe(`${MINE_SKELETON_PX}px`);
    expect(staticMineHandover()).toEqual({ u: "u1", px: MINE_SKELETON_PX });
    expect(readMineHint("u1", W, Date.now())).toBe(MINE_SKELETON_PX);
  });
  it("PACKS-FIRSTBUY-1: the fallback is bounded - above zero and well under a 360x640 phone screen (no blank screenful)", () => {
    expect(MINE_SKELETON_PX).toBeGreaterThan(0);
    Object.defineProperty(window, "innerHeight", { value: 640, configurable: true });
    expect(MINE_SKELETON_PX).toBeLessThan(window.innerHeight * 0.6);
  });
  it("signed out (no active account), another account, or a stale hint -> nothing reserved, no hand-over", () => {
    writeMineHint("u1", W, 733, Date.now());
    expect(runStaticScript().style.minHeight).toBe("");
    localStorage.setItem(ACTIVE_UID_KEY, "u2");
    expect(runStaticScript().style.minHeight).toBe("");
    localStorage.setItem(ACTIVE_UID_KEY, "u1");
    localStorage.setItem(MINE_HINT_KEY, JSON.stringify({ u: "u1", t: Date.now() - 90 * 24 * 3600 * 1000, h: { [String(W)]: 700 } }));
    expect(runStaticScript().style.minHeight).toBe("");
    expect(staticMineHandover()).toBeNull();
  });
  it("PACKS-TIDY-1: a /packs#my-packs link with no hint holds ONE short line for its panel (a class on the slot); nothing without the hash", () => {
    window.location.hash = "#my-packs";
    expect(runStaticScript().className).toContain("lt-packs__mineslot--note");
    expect(staticMineHandover()).toBeNull();
    window.location.hash = "";
    expect(runStaticScript().className).not.toContain("lt-packs__mineslot--note");
  });
  it("broken storage never throws", () => {
    localStorage.setItem(ACTIVE_UID_KEY, "u1");
    localStorage.setItem(MINE_HINT_KEY, "{oops");
    expect(() => runStaticScript()).not.toThrow();
  });
});

describe("PACKS-FIRSTBUY-1: the captured static pages carry exactly this script (no stale one-screen copy)", () => {
  it("prerendered /packs (mobile + desktop) contain MINE_HINT_SCRIPT verbatim", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    for (const f of ["prerendered/packs.html", "prerendered/__desktop/packs.html"]) {
      const html = readFileSync(resolve(process.cwd(), f), "utf8");
      expect(html.includes(MINE_HINT_SCRIPT), f).toBe(true);
      expect(html.includes("p=d.innerHeight"), f).toBe(false);
    }
  });
});
