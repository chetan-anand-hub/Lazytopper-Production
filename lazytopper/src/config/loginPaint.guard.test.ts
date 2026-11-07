import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import * as paint from "../../scripts/seo/loginPaint";
import {
  BACK_HOME_TEXT,
  BACK_LANDING_TEXT,
  DOOR_PRICING_BASE,
  EMAIL_CODE_SLOT_HTML,
  LOCAL_AUTH_KEY,
  PAINT_ATTR,
  PAINT_DIR,
  PAINT_PATHS,
  PAINT_READY_CLASS,
  type LoginPaintEnv,
  applyLoginPaint,
  buildLoginPaintPage,
  clockWindowAt,
  decideLoginPaint,
  emailCodeFlagOn,
  loginPaintConfig,
  loginPaintScript,
  markTopLevel,
  paintFragmentPathFor,
  pricingInstants,
  withEmailCodeSlot,
  withoutEmailCodeSlot,
} from "../../scripts/seo/loginPaint";
import { PRERENDERED_DIR, SPA_SHELL, applyPaintShells, verifyPaintPages } from "../../scripts/seo/applyPrerendered";
import { safeSigninRedirect, withSigninRedirect } from "../services/freeCheckClient";
import { inAppBrowser } from "../utils/inAppBrowser";
import { SIGNIN_INTENT_KEY, readSigninIntent } from "../services/signinIntent";
import { sitemapPaths } from "./sitemapUrls";

/**
 * GUARD — SPEED-LOGIN-1, `/login` paints from static HTML (`scripts/seo/loginPaint.ts`).
 *
 * The capture job's PARITY CHECK proves, in a real browser, that the shipped script leaves on screen
 * exactly React's first commit for every case in its matrix. This file pins what that check cannot
 * see in a browser: that the decision's inputs are read the way the app reads them (the sign-in
 * intent, the redirect helpers, the keys), that every `off` condition is a superset of the condition
 * it stands in for, and that the built page carries what a safe paint page needs.
 *
 * Clock-free: every time is an argument.
 */

const NOW = 1_794_500_000_000; // a fixed instant; every clock read in this suite is pinned to it
const CLOCK = { from: NOW - 1000, until: NOW + 1000 };
const ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36";
const WINDOWS =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
const helpers = { inApp: inAppBrowser, safe: safeSigninRedirect, withRedirect: withSigninRedirect };

function env(over: Partial<LoginPaintEnv> = {}): LoginPaintEnv {
  return {
    search: "",
    intentRaw: null,
    localAuthRaw: null,
    historyUsr: null,
    userAgent: ANDROID,
    standalone: false,
    narrow: true,
    wide: false,
    now: NOW,
    ...over,
  };
}
const mobile = loginPaintConfig("mobile", CLOCK);
const desktop = loginPaintConfig("desktop", CLOCK);

describe("the copies and constants are the app's own", () => {
  it("safeSigninRedirect / withSigninRedirect copies equal freeCheckClient's, source for source and on fixtures", () => {
    const norm = (f: { toString(): string }) => f.toString().replace(/\s+/g, " ");
    expect(norm(paint.safeSigninRedirect)).toBe(norm(safeSigninRedirect));
    expect(norm(paint.withSigninRedirect)).toBe(norm(withSigninRedirect));
    for (const raw of [null, "", "/x", " /x ", "//evil", "/a\\b", "javascript:x", "/ok?x=1&y=/z", "https://e.com"]) {
      expect(paint.safeSigninRedirect(raw)).toBe(safeSigninRedirect(raw));
      expect(paint.withSigninRedirect(DOOR_PRICING_BASE, paint.safeSigninRedirect(raw))).toBe(
        withSigninRedirect(DOOR_PRICING_BASE, safeSigninRedirect(raw)),
      );
    }
  });

  it("keys and copy match their sources", () => {
    const src = (p: string) => readFileSync(resolve(__dirname, "..", p), "utf8");
    expect(src("context/AuthContext.tsx")).toContain(`const LOCAL_AUTH_KEY = "${LOCAL_AUTH_KEY}";`);
    expect(mobile.intentKey).toBe(SIGNIN_INTENT_KEY);
    expect(src("pages/Login.tsx")).toContain(`isStartTrial ? "${BACK_LANDING_TEXT}" : "${BACK_HOME_TEXT}"`);
    expect(src("components/auth/OfferStrip.tsx")).toContain(`"${DOOR_PRICING_BASE}"`);
    expect(src("services/emailCodeFlag.ts")).toContain("/^(1|true|on|yes)$/i.test(");
    expect(emailCodeFlagOn(" On ")).toBe(true);
    expect(emailCodeFlagOn("0")).toBe(false);
    expect(emailCodeFlagOn(undefined)).toBe(false);
  });
});

describe("decideLoginPaint", () => {
  it("the ordinary door, and its two patches", () => {
    expect(decideLoginPaint(env(), mobile, helpers)).toMatchObject({ kind: "door", backText: BACK_HOME_TEXT, pricingHref: DOOR_PRICING_BASE });
    expect(decideLoginPaint(env({ search: "?reason=start-trial&redirect=%2Fnotes%2Fx" }), mobile, helpers)).toMatchObject({
      kind: "door",
      backText: BACK_LANDING_TEXT,
      pricingHref: `${DOOR_PRICING_BASE}&redirect=%2Fnotes%2Fx`,
    });
    // An unsafe redirect is dropped exactly as OfferStrip drops it.
    expect(decideLoginPaint(env({ search: "?redirect=https%3A%2F%2Fevil.com" }), mobile, helpers).pricingHref).toBe(DOOR_PRICING_BASE);
  });

  /**
   * ★ CONSTRAINT 2 — the Google return trip. Login shows SigningInScreen iff readSigninIntent() returns a
   * record. So: no record -> door; record readSigninIntent accepts -> signing-in; any other record -> off.
   * The door is NEVER shown while a record exists.
   */
  it("intent: door only with no record; signing-in exactly when readSigninIntent accepts; otherwise off", () => {
    const base = { v: 1, method: "google", target: "/", explicitTarget: null, from: null, startTrial: false, guestPayClaim: false, guestPayExisting: false };
    const records: Array<string> = [
      JSON.stringify({ ...base, at: NOW }),
      JSON.stringify({ ...base, at: NOW - 29 * 60_000 }),
      JSON.stringify({ ...base, at: NOW - 30 * 60_000 }),
      JSON.stringify({ ...base, at: NOW - 30 * 60_000 - 1 }),
      JSON.stringify({ ...base, at: NOW + 60_000 }),
      JSON.stringify({ ...base, at: NOW + 60_001 }),
      JSON.stringify({ ...base, v: 2, at: NOW }),
      JSON.stringify({ ...base, method: "phone", at: NOW }),
      JSON.stringify({ ...base, at: String(NOW) }),
      JSON.stringify({ ...base }),
      "null",
      "{",
      "",
      "[]",
    ];
    for (const raw of records) {
      sessionStorage.setItem(SIGNIN_INTENT_KEY, raw);
      const app = readSigninIntent(NOW);
      const d = decideLoginPaint(env({ intentRaw: raw }), mobile, helpers);
      expect(d.kind, raw).toBe(app ? "signing-in" : "off");
      expect(d.kind, raw).not.toBe("door");
    }
    sessionStorage.removeItem(SIGNIN_INTENT_KEY);
    expect(readSigninIntent(NOW)).toBeNull();
    expect(decideLoginPaint(env({ intentRaw: null }), mobile, helpers).kind).toBe("door");
  });

  it("variant: the phone capture needs the phone layout; the desktop one a wide, non-phone client", () => {
    expect(decideLoginPaint(env({ narrow: false, wide: true }), mobile, helpers).kind).toBe("off");
    expect(decideLoginPaint(env({ narrow: true, wide: false, userAgent: WINDOWS }), mobile, helpers).kind).toBe("door");
    expect(decideLoginPaint(env({ narrow: false, wide: true, userAgent: WINDOWS }), desktop, helpers).kind).toBe("door");
    expect(decideLoginPaint(env({ narrow: true, wide: false, userAgent: WINDOWS }), desktop, helpers).kind).toBe("off");
    // isPhoneClient's UA test: a wide client with a phone UA is phone-first, which the desktop capture is not.
    for (const ua of [ANDROID, "x iPhone y", "x iPod y", "x Mobile y"]) {
      expect(decideLoginPaint(env({ narrow: false, wide: true, userAgent: ua }), desktop, helpers).kind, ua).toBe("off");
    }
    // Neither query matching (a fractional width, or no matchMedia) is off for both.
    expect(decideLoginPaint(env({ narrow: false, wide: false }), mobile, helpers).kind).toBe("off");
    expect(decideLoginPaint(env({ narrow: false, wide: false, userAgent: WINDOWS }), desktop, helpers).kind).toBe("off");
  });

  it("every other first-frame input that is not captured is off (a superset, never a guess)", () => {
    const off = (over: Partial<LoginPaintEnv>) => decideLoginPaint(env(over), mobile, helpers);
    expect(off({ userAgent: `${ANDROID} Instagram 350.0` })).toMatchObject({ kind: "off", reason: "in-app" });
    expect(off({ userAgent: "Mozilla/5.0 (Linux; Android 14; wv) AppleWebKit Chrome/1 Mobile Safari/537.36" }).kind).toBe("off");
    expect(off({ localAuthRaw: "{}" }).kind).toBe("off");
    for (const usr of [{ phoneFirst: true }, { guestPayPhone: "9876543210" }, { guestPayExisting: true }, "x", 3]) {
      expect(off({ historyUsr: usr }).kind).toBe("off");
    }
    expect(off({ historyUsr: { from: "/notes/x" } }).kind).toBe("door");
    for (const search of ["?method=phone", "?finish=link&mode=signIn&oobCode=x", "?mode=x", "?oobCode=1"]) {
      expect(off({ search }).kind, search).toBe("off");
    }
    for (const search of ["?redirect=%2Fpricing%3Fbuy%3Dboard_pass", "?redirect=%2Fpacks%3Fbuy%3Dpack_chapter%26t%3Dx", "?redirect=%2Fx%3FBUY%3D1"]) {
      expect(off({ search }).kind, search).toBe("off");
    }
  });

  it("clock: off outside the window the capture was taken in", () => {
    expect(decideLoginPaint(env({ now: CLOCK.from - 1 }), mobile, helpers).kind).toBe("off");
    expect(decideLoginPaint(env({ now: CLOCK.from }), mobile, helpers).kind).toBe("door");
    expect(decideLoginPaint(env({ now: CLOCK.until }), mobile, helpers).kind).toBe("off");
  });

  it("clockWindowAt brackets now between the pricing instants", () => {
    const instants = pricingInstants();
    expect(instants.length).toBeGreaterThanOrEqual(3);
    const t = instants[1];
    expect(clockWindowAt(t, instants)).toEqual({ from: t, until: instants[2] });
    expect(clockWindowAt(t - 1, instants)).toEqual({ from: instants[0], until: t });
    expect(clockWindowAt(instants[instants.length - 1] + 1, instants).until).toBe(Number.MAX_SAFE_INTEGER);
  });
});

const DOOR =
  '<div style="padding-bottom: 60px;"><main class="lt-login-page"><style>.lt-login-page{}</style><h2>Sign in to LazyTopper</h2>' +
  '<div class="lt-doors"><button type="button" class="lt-method">Continue with phone</button>' +
  '<button type="button" class="lt-method">Continue with email</button></div>' +
  '<a class="lt-offer-strip-link" href="/pricing?source=login">See plans</a>' +
  '<a class="lt-login-back-link" href="/">&lt;- Back to home</a></main></div><div data-lt-bottomnav=""><button>Home</button></div>';
const SIGNING =
  '<div style="padding-bottom: 60px;"><main class="lt-signing-in"><p class="lt-signing-in__title" role="status"></p>' +
  '<p class="lt-signing-in__sub">Taking you back to where you were.</p></main></div>';

describe("markTopLevel / the email-code slot", () => {
  it("marks every top-level element and nothing inside", () => {
    const marked = markTopLevel(DOOR, "door");
    expect(marked.match(new RegExp(`${PAINT_ATTR}="door"`, "g"))).toHaveLength(2);
    const holder = document.createElement("div");
    holder.innerHTML = marked;
    expect(Array.from(holder.children).every((el) => el.getAttribute(PAINT_ATTR) === "door")).toBe(true);
    expect(holder.querySelectorAll(`[${PAINT_ATTR}]`)).toHaveLength(2);
  });

  it("refuses a top-level text node (it could not be removed by attribute)", () => {
    expect(() => markTopLevel(`hello${DOOR}`, "door")).toThrow(/top-level text/);
  });

  it("inserts the slot right after the email door iff the flag is on, and is idempotent", () => {
    const on = withEmailCodeSlot(DOOR, true);
    expect(on).toContain(`Continue with email</button>${EMAIL_CODE_SLOT_HTML}</div>`);
    expect(withEmailCodeSlot(on, true)).toBe(on);
    expect(withEmailCodeSlot(on, false)).toBe(DOOR);
    expect(withoutEmailCodeSlot(on)).toBe(DOOR);
    expect(() => withEmailCodeSlot("<div></div>", true)).toThrow(/exactly one/);
  });
});

const SHELL =
  '<!doctype html><html lang="en-IN"><head><meta charset="UTF-8" />' +
  '<meta name="viewport" content="width=device-width, initial-scale=1.0" />' +
  '<link rel="canonical" href="https://www.lazytopper.com/" /><meta name="robots" content="noindex,follow" />' +
  '<script type="module" crossorigin src="/assets/index-AAAAAAAA.js"></script></head><body><div id="root"></div></body></html>';

/** Load a built page into this jsdom document and run its shipped script, as a browser would. */
function runPage(html: string, setup: () => void = () => {}): HTMLElement {
  const root = html.match(/<div id="root">([\s\S]*)<\/div><script data-lt-paint-script>([\s\S]*?)<\/script>/);
  if (!root) throw new Error("no root + script in the built page");
  document.documentElement.className = "";
  document.body.innerHTML = `<div id="root">${root[1]}</div>`;
  setup();
  new Function(root[2])();
  return document.getElementById("root") as HTMLElement;
}

describe("buildLoginPaintPage + the shipped script (jsdom)", () => {
  // The shipped script reads the clock; the test supplies it (clock-free suite).
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(NOW);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
    document.documentElement.className = "";
    sessionStorage.clear();
    window.history.replaceState(null, "", "/");
  });

  // jsdom has no matchMedia; the shipped script treats that as neither width — so give it one.
  function withWidth(narrow: boolean, fn: () => void) {
    const original = window.matchMedia;
    window.matchMedia = ((q: string) => ({ matches: q.includes("max-width") ? narrow : !narrow })) as unknown as typeof window.matchMedia;
    try {
      fn();
    } finally {
      window.matchMedia = original;
    }
  }

  const page = (config = loginPaintConfig("mobile", { from: 0, until: Number.MAX_SAFE_INTEGER })) =>
    buildLoginPaintPage(SHELL, { door: DOOR, signingIn: SIGNING }, config, true);

  it("the page: theme, hiding CSS before any stylesheet, both states, the script right after #root, head untouched", () => {
    const html = page();
    expect(html).toContain('<html lang="en-IN" data-theme="light">');
    expect(html.indexOf("<style data-lt-paint-css>")).toBeLessThan(html.indexOf("<link rel=\"canonical\""));
    expect(html).toContain(`html:not(.${PAINT_READY_CLASS}) #root>[${PAINT_ATTR}]{display:none!important}`);
    expect(html).toContain('</div><script data-lt-paint-script>');
    expect(html).toContain('<meta name="robots" content="noindex,follow" />');
    expect(html).toContain(EMAIL_CODE_SLOT_HTML);
  });

  it("door: keeps only the door, marks ready, and swallows taps on the static nodes", () => {
    withWidth(true, () => {
      const root = runPage(page());
      expect(Array.from(root.children).map((c) => c.getAttribute(PAINT_ATTR))).toEqual(["door", "door"]);
      expect(document.documentElement.classList.contains(PAINT_READY_CLASS)).toBe(true);
      const button = root.querySelector("button") as HTMLButtonElement;
      let reached = false;
      root.addEventListener("click", () => (reached = true));
      const event = new MouseEvent("click", { bubbles: true, cancelable: true });
      button.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
      expect(reached).toBe(false);
    });
  });

  // SPEED-LOGIN-2 — once Fraunces is ready, the static Fraunces text is re-inserted (a new node painted in
  // the web font before React), so React's identical node is never a larger, later LCP.
  const FRAUNCES = "font-family: Fraunces, &quot;Fraunces Fallback&quot;, Georgia, serif";
  const DOOR_H1 = DOOR.replace(
    '<h2>Sign in to LazyTopper</h2>',
    `<h1 class="lt-login-title" style="${FRAUNCES}">Sign in when your work needs saving.</h1><h2 style="${FRAUNCES}">Sign in to LazyTopper</h2>`,
  );
  const pageH1 = () =>
    buildLoginPaintPage(SHELL, { door: DOOR_H1, signingIn: SIGNING }, loginPaintConfig("mobile", { from: 0, until: Number.MAX_SAFE_INTEGER }), false);
  function withFonts(faces: unknown[], fn: (loads: string[]) => Promise<void>) {
    const loads: string[] = [];
    const fonts = { load: (d: string) => { loads.push(d); return Promise.resolve(faces); } };
    Object.defineProperty(document, "fonts", { value: fonts, configurable: true });
    return fn(loads).finally(() => {
      delete (document as unknown as { fonts?: unknown }).fonts;
    });
  }

  it("font ready: every static element whose own text is in Fraunces is replaced by an identical clone; nothing else moves", async () => {
    await withFonts([{}], async (loads) => {
      let root!: HTMLElement;
      let h1Before!: Element, h2Before!: Element, linkBefore!: Element;
      withWidth(true, () => {
        root = runPage(pageH1());
        h1Before = root.querySelector("h1")!;
        h2Before = root.querySelector("h2")!;
        linkBefore = root.querySelector("a.lt-offer-strip-link")!;
      });
      const htmlBefore = root.innerHTML;
      await new Promise((r) => setTimeout(r, 0));
      expect(loads).toEqual(["700 1em Fraunces"]);
      expect(root.querySelector("h1")).not.toBe(h1Before);
      expect(root.querySelector("h2")).not.toBe(h2Before);
      expect(root.querySelector("a.lt-offer-strip-link")).toBe(linkBefore);
      expect(root.innerHTML).toBe(htmlBefore);
    });
  });

  it("font NOT available (no faces), or React already took over: nothing is re-inserted", async () => {
    await withFonts([], async () => {
      let root!: HTMLElement;
      let h1!: Element;
      withWidth(true, () => {
        root = runPage(pageH1());
        h1 = root.querySelector("h1")!;
      });
      await new Promise((r) => setTimeout(r, 0));
      expect(root.querySelector("h1")).toBe(h1);
    });
    let resolveLoad!: (faces: unknown[]) => void;
    const fonts = { load: () => new Promise<unknown[]>((r) => (resolveLoad = r)) };
    Object.defineProperty(document, "fonts", { value: fonts, configurable: true });
    try {
      let root!: HTMLElement;
      withWidth(true, () => {
        root = runPage(pageH1());
      });
      // React's createRoot clears #root and renders its own (unmarked) H1.
      while (root.firstChild) root.removeChild(root.firstChild);
      const reactH1 = document.createElement("h1");
      reactH1.setAttribute("style", "font-family: Fraunces, serif");
      reactH1.textContent = "Sign in when your work needs saving.";
      root.appendChild(reactH1);
      resolveLoad([{}]);
      await new Promise((r) => setTimeout(r, 0));
      expect(root.firstChild).toBe(reactH1);
    } finally {
      delete (document as unknown as { fonts?: unknown }).fonts;
    }
  });

  it("React's first commit already in #root (even with a static node left): the font swap does NOTHING", async () => {
    let resolveLoad!: (faces: unknown[]) => void;
    const fonts = { load: () => new Promise<unknown[]>((r) => (resolveLoad = r)) };
    Object.defineProperty(document, "fonts", { value: fonts, configurable: true });
    try {
      let root!: HTMLElement;
      withWidth(true, () => {
        root = runPage(pageH1());
      });
      const staticH1 = root.querySelector("h1")!;
      // React has rendered into the root while a static node is still there.
      const reactNode = document.createElement("div");
      reactNode.textContent = "React";
      root.appendChild(reactNode);
      resolveLoad([{}]);
      await new Promise((r) => setTimeout(r, 0));
      expect(root.querySelector("h1")).toBe(staticH1);
    } finally {
      delete (document as unknown as { fonts?: unknown }).fonts;
    }
  });

  it("a throw mid-swap stops it: no unhandled error, swapped nodes stay swapped, the rest stay as they are", async () => {
    const errors: unknown[] = [];
    const onRejection = (e: PromiseRejectionEvent) => errors.push(e.reason);
    window.addEventListener("unhandledrejection", onRejection);
    await withFonts([{}], async () => {
      let root!: HTMLElement;
      let h1!: Element, h2!: Element;
      withWidth(true, () => {
        root = runPage(pageH1());
        h1 = root.querySelector("h1")!;
        h2 = root.querySelector("h2")!;
      });
      // The second clone throws.
      const original = Element.prototype.cloneNode;
      let calls = 0;
      Element.prototype.cloneNode = function (this: Element, deep?: boolean) {
        calls += 1;
        if (calls === 2) throw new Error("boom");
        return original.call(this, deep);
      } as typeof Element.prototype.cloneNode;
      try {
        await new Promise((r) => setTimeout(r, 0));
      } finally {
        Element.prototype.cloneNode = original;
      }
      expect(root.querySelector("h1")).not.toBe(h1);
      expect(root.querySelector("h2")).toBe(h2);
      expect(root.querySelectorAll("h1")).toHaveLength(1);
      expect(root.querySelectorAll("h2")).toHaveLength(1);
      expect(document.documentElement.classList.contains(PAINT_READY_CLASS)).toBe(true);
    });
    await new Promise((r) => setTimeout(r, 0));
    window.removeEventListener("unhandledrejection", onRejection);
    expect(errors).toEqual([]);
  });

  it("refreshWebFontText: outermost own-text element only, inside the static nodes only", () => {
    const root = document.createElement("div");
    root.innerHTML =
      `<div ${PAINT_ATTR}="door"><p style="font-family: Fraunces, serif">a <b>b</b></p><p style="font-family: system-ui">c</p>` +
      `<span style="font-family: 'Fraunces'">d</span></div><h1 style="font-family: Fraunces">React</h1>`;
    document.body.appendChild(root);
    const outsider = root.querySelector("h1");
    expect(paint.refreshWebFontText(root, PAINT_ATTR, "Fraunces")).toBe(2);
    expect(root.querySelector("h1")).toBe(outsider);
    root.remove();
  });

  it("the Login page's own serif stacks all carry the metric-matched fallback", () => {
    const login = readFileSync(resolve(__dirname, "../pages/Login.tsx"), "utf8");
    const stacks = login.match(/font-family:\s*['"]?Fraunces['"]?[^;]*;/g) ?? [];
    expect(stacks.length).toBeGreaterThan(3);
    for (const stack of stacks) expect(stack, stack).toMatch(/Fraunces Fallback/);
  });

  it("a tapped static control is shown pressed (class + aria-busy, paint-only CSS), never navigates", () => {
    withWidth(true, () => {
      const root = runPage(page());
      const link = root.querySelector("a.lt-offer-strip-link") as HTMLAnchorElement;
      const event = new MouseEvent("click", { bubbles: true, cancelable: true });
      link.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
      expect(link.classList.contains(paint.PAINT_PRESSED_CLASS)).toBe(true);
      expect(link.getAttribute("aria-busy")).toBe("true");
      // Untapped controls are untouched.
      expect(root.querySelectorAll(`.${paint.PAINT_PRESSED_CLASS}`)).toHaveLength(1);
    });
    // The pressed rule changes paint only: no property that can move a box.
    const rule = paint.LOGIN_PAINT_CSS.match(new RegExp(`\\.${paint.PAINT_PRESSED_CLASS}\\{([^}]*)\\}`))?.[1] ?? "";
    expect(rule.split(";").map((d) => d.split(":")[0].trim()).filter(Boolean).sort()).toEqual(["cursor", "opacity"]);
  });

  it("once React has replaced the static nodes, the tap guard removes itself", async () => {
    const removed: unknown[] = [];
    const original = document.removeEventListener.bind(document);
    document.removeEventListener = ((type: string, fn: EventListener, opts?: boolean) => {
      removed.push([type, opts]);
      return original(type, fn, opts);
    }) as typeof document.removeEventListener;
    try {
      let root: HTMLElement | null = null;
      withWidth(true, () => {
        root = runPage(page());
      });
      // Still static: nothing removed.
      await new Promise((r) => setTimeout(r, 0));
      expect(removed).toEqual([]);
      // React's createRoot clears #root and renders its own (unmarked) nodes.
      const r = root as unknown as HTMLElement;
      while (r.firstChild) r.removeChild(r.firstChild);
      const reactButton = document.createElement("button");
      r.appendChild(reactButton);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(removed).toEqual([["click", true]]);
      const event = new MouseEvent("click", { bubbles: true, cancelable: true });
      reactButton.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
    } finally {
      document.removeEventListener = original;
    }
  });

  it("door + ?reason=start-trial&redirect: the two details patched", () => {
    withWidth(true, () => {
      window.history.replaceState(null, "", "/login?reason=start-trial&redirect=%2Fnotes%2Fx");
      const root = runPage(page());
      expect(root.querySelector("a.lt-login-back-link")?.textContent).toBe(BACK_LANDING_TEXT);
      expect(root.querySelector("a.lt-offer-strip-link")?.getAttribute("href")).toBe("/pricing?source=login&redirect=%2Fnotes%2Fx");
    });
  });

  it("Google return: only the signing-in state, NO sign-in button anywhere", () => {
    withWidth(true, () => {
      const root = runPage(page(), () =>
        sessionStorage.setItem(SIGNIN_INTENT_KEY, JSON.stringify({ v: 1, method: "google", target: "/", at: NOW })),
      );
      expect(Array.from(root.children).map((c) => c.getAttribute(PAINT_ATTR))).toEqual(["signing-in"]);
      expect(root.textContent).not.toMatch(/Continue with|Sign in to/);
      expect(document.documentElement.classList.contains(PAINT_READY_CLASS)).toBe(true);
    });
  });

  it("off (stale intent, wrong width, buy intent, no matchMedia): the root is EMPTY — exactly the shell served today", () => {
    withWidth(true, () => {
      const stale = runPage(page(), () => sessionStorage.setItem(SIGNIN_INTENT_KEY, '{"v":1,"method":"google","at":1}'));
      expect(stale.innerHTML).toBe("");
      expect(document.documentElement.classList.contains(PAINT_READY_CLASS)).toBe(false);
    });
    withWidth(false, () => expect(runPage(page()).innerHTML).toBe(""));
    withWidth(true, () => {
      window.history.replaceState(null, "", "/login?redirect=%2Fpricing%3Fbuy%3Dboard_pass");
      expect(runPage(page()).innerHTML).toBe("");
    });
    expect(runPage(page()).innerHTML).toBe("");
  });

  it("a patch target missing: off, never a half-patched door", () => {
    const root = document.createElement("div");
    root.innerHTML = markTopLevel(DOOR.replace('class="lt-login-back-link"', 'class="x"'), "door");
    const d = decideLoginPaint(env({ now: 5 }), loginPaintConfig("mobile", { from: 0, until: 10 }), helpers);
    expect(applyLoginPaint(root, d, loginPaintConfig("mobile", { from: 0, until: 10 }))).toBe("off");
    expect(root.innerHTML).toBe("");
  });

  it("the shipped script never closes its own <script> element", () => {
    expect(loginPaintScript(mobile)).not.toMatch(/<\/script>[\s\S]+$/);
  });
});

describe("applyPaintShells / verifyPaintPages (synthetic build)", () => {
  const made: string[] = [];
  afterEach(() => {
    for (const d of made.splice(0)) rmSync(d, { recursive: true, force: true });
  });
  function synthetic(withPaint: boolean, manifestPaint: boolean) {
    const root = mkdtempSync(join(tmpdir(), "lt-paint-"));
    made.push(root);
    const out = join(root, "out");
    const art = join(root, "prerendered");
    mkdirSync(out, { recursive: true });
    mkdirSync(art, { recursive: true });
    writeFileSync(join(out, SPA_SHELL), SHELL);
    writeFileSync(join(art, "manifest.json"), JSON.stringify({ paths: [], ...(manifestPaint ? { paintPaths: ["/login"] } : {}) }));
    if (withPaint) {
      for (const variant of ["mobile", "desktop"] as const) {
        for (const [kind, html] of [["door", DOOR], ["signing-in", SIGNING]] as const) {
          const file = paintFragmentPathFor(art, "/login", kind, variant);
          mkdirSync(join(file, ".."), { recursive: true });
          writeFileSync(file, html);
        }
      }
      writeFileSync(join(art, PAINT_DIR, "paint.json"), JSON.stringify({ paths: ["/login"], clock: CLOCK }));
    }
    return { out, art };
  }

  it("writes login.html, login/index.html and __desktop/login.html, and they verify", () => {
    const { out, art } = synthetic(true, true);
    expect(applyPaintShells(out, art, { emailCodeOn: false, criticalCss: false })).toEqual({ pages: 3, paths: ["/login"] });
    for (const f of ["login.html", "login/index.html", "__desktop/login.html"]) expect(existsSync(join(out, f)), f).toBe(true);
    expect(readFileSync(join(out, "login.html"), "utf8")).toBe(readFileSync(join(out, "login/index.html"), "utf8"));
    expect(readFileSync(join(out, "login.html"), "utf8")).toContain('"variant":"mobile"');
    expect(readFileSync(join(out, "__desktop/login.html"), "utf8")).toContain('"variant":"desktop"');
    expect(verifyPaintPages(out)).toEqual([]);
  });

  it("verifyPaintPages FAILS a page that lost its noindex", () => {
    const { out, art } = synthetic(true, true);
    applyPaintShells(out, art, { emailCodeOn: false, criticalCss: false });
    const file = join(out, "login.html");
    writeFileSync(file, readFileSync(file, "utf8").replace("noindex,follow", "index,follow"));
    expect(verifyPaintPages(out).join("\n")).toMatch(/login\.html is not exactly-once noindex/);
  });

  it("pre-capture: no paint artifact and no paintPaths -> nothing written", () => {
    const { out, art } = synthetic(false, false);
    expect(applyPaintShells(out, art, { emailCodeOn: false })).toEqual({ pages: 0, paths: [] });
    expect(existsSync(join(out, "login.html"))).toBe(false);
  });

  it("a manifest that lists paintPaths without the captures FAILS (middleware would rewrite to a missing file)", () => {
    const { out, art } = synthetic(false, true);
    expect(() => applyPaintShells(out, art, { emailCodeOn: false })).toThrow(/paintPaths/);
  });
});

describe("the committed artifact", () => {
  it("has every paint capture, a record, and the manifest's paintPaths; /login is never advertised", () => {
    const manifest = JSON.parse(readFileSync(join(PRERENDERED_DIR, "manifest.json"), "utf8")) as { paintPaths?: string[] };
    expect(manifest.paintPaths).toEqual([...PAINT_PATHS]);
    const record = JSON.parse(readFileSync(join(PRERENDERED_DIR, PAINT_DIR, "paint.json"), "utf8")) as paint.PaintRecord;
    expect(record.paths).toEqual([...PAINT_PATHS]);
    expect(record.clock.from).toBeLessThan(record.clock.until);
    for (const path of PAINT_PATHS) {
      expect(sitemapPaths()).not.toContain(path);
      for (const variant of ["mobile", "desktop"] as const) {
        const door = readFileSync(paintFragmentPathFor(PRERENDERED_DIR, path, "door", variant), "utf8");
        const signing = readFileSync(paintFragmentPathFor(PRERENDERED_DIR, path, "signing-in", variant), "utf8");
        expect(door).toContain("Continue with Google");
        expect(door).not.toContain(EMAIL_CODE_SLOT_HTML);
        expect(signing).toContain("Taking you back to where you were.");
        expect(signing).not.toMatch(/Continue with|lt-method|lt-google/);
        expect(() => markTopLevel(door, "door")).not.toThrow();
        expect(() => markTopLevel(signing, "signing-in")).not.toThrow();
      }
    }
  });
});
