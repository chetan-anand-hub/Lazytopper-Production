import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

import {
  CHECK_IMPROVE_PATH,
  CI_ALLOWED_PARAMS,
  CI_DEMO_PLACEHOLDER_HTML,
  CI_LOCAL_ALLOW,
  PAINT_STATE_ATTR,
  ROUTE_END,
  ROUTE_FALLBACK_HTML,
  ROUTE_START,
  type CiPaintEnv,
  buildCheckImprovePaintPage,
  checkImprovePaintConfig,
  checkImprovePaintCss,
  composeRouteShell,
  decideCheckImprovePaint,
  routeRegionOf,
  withoutRouteTemplates,
} from "../../scripts/seo/checkImprovePaint";
import { PAINT_ATTR, PAINT_PATHS, PAINT_PRESSED_CLASS, PAINT_READY_CLASS, PAINT_ROUTE_KINDS } from "../../scripts/seo/loginPaint";
import { inAppBrowser } from "../utils/inAppBrowser";
import { STATIC_ATTR, withStaticRouteRegion } from "../../scripts/seo/checkImprovePaint";
import { emailCodeFlagOn } from "../../scripts/seo/loginPaint";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { SPA_SHELL, applyPaintShells, verifyPaintPages } from "../../scripts/seo/applyPrerendered";
import { paintFragmentPathFor, PAINT_DIR } from "../../scripts/seo/loginPaint";
import { CI_FIRST_STARTER, CI_LADDER_SEEN_KEY, ciFirstCardExpectation, firstCardProblems, setPaintGreeting, withNeutralGreeting } from "../../scripts/seo/checkImprovePaint";
import { LADDER_SEEN_KEY } from "../components/ciDemo/ladderVisit";
import { fixedStarter } from "../components/ciDemo/oneMinuteStarters";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LadderHeldMark, LadderVerdictReserve } from "../components/ciDemo/LadderTapParts";
import { CI_PARITY_CASES } from "../../scripts/seo/captureStaticBodies";

/**
 * GUARD — SPEED-CI-1, the Answer Checker's paint shell (`scripts/seo/checkImprovePaint.ts`).
 *
 * The capture's parity matrix proves in a real browser that the static state equals React's first commit
 * for the cases it runs. This file pins the rest: every "blank on doubt" condition, that the allowlists
 * name keys and parameters the app really uses, the composition, and the shipped script's behaviour.
 * Clock-free: every time is an argument (or a stubbed Date.now).
 */

const NOW = 1_794_500_000_000;
const CLOCK = { from: NOW - 1000, until: NOW + 1000 };
const ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36";
const WINDOWS =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
const helpers = { inApp: inAppBrowser };
const mobile = checkImprovePaintConfig("mobile", CLOCK);
const desktop = checkImprovePaintConfig("desktop", CLOCK);

function env(over: Partial<CiPaintEnv> = {}): CiPaintEnv {
  return {
    search: "",
    sessionKeys: [],
    local: [],
    historyUsr: null,
    userAgent: ANDROID,
    standalone: false,
    narrow: true,
    wide: false,
    coarse: true,
    now: NOW,
    ...over,
  };
}
const kind = (over: Partial<CiPaintEnv>, config = mobile) => decideCheckImprovePaint(env(over), config, helpers).kind;

describe("the route is registered", () => {
  it("/check-improve is a paint path with one state, and never advertised", () => {
    expect(PAINT_PATHS).toContain(CHECK_IMPROVE_PATH);
    expect(PAINT_ROUTE_KINDS[CHECK_IMPROVE_PATH]).toEqual(["door"]);
    expect(PAINT_ROUTE_KINDS["/login"]).toEqual(["door", "signing-in"]);
  });
});

describe("decideCheckImprovePaint — door only when the first frame is predictable", () => {
  it("a clean first visit: door at each width", () => {
    expect(kind({})).toBe("door");
    expect(kind({ narrow: false, wide: true, coarse: false, userAgent: WINDOWS }, desktop)).toBe("door");
  });

  it("ad attribution parameters are fine; every other parameter is off", () => {
    expect(kind({ search: "?utm_source=google&utm_medium=cpc&utm_campaign=x&gclid=1&gad_source=1&fbclid=2&lt_clk=1" })).toBe("door");
    for (const search of ["?review=AB12", "?from=for_parents", "?upload=1", "?paper=x", "?ref=abc", "?q=1", "?utm_source=x&mode=y"]) {
      expect(kind({ search }), search).toBe("off");
    }
  });

  it("a parent's share link (cameFromSharedLink) is off, in any case", () => {
    expect(kind({ search: "?utm_source=parent_share" })).toBe("off");
    expect(kind({ search: "?utm_source=PARENT_SHARE" })).toBe("off");
    expect(kind({ search: "?utm_medium=Share" })).toBe("off");
  });

  it("ANY sessionStorage key is off (drafts, the ladder marker, the visit source, the sign-in intent)", () => {
    for (const key of ["lazytopper.visitSource", "lt.signinIntent", "lazytopper.ladderQuestion", "anything"]) {
      expect(kind({ sessionKeys: [key] }), key).toBe("off");
    }
  });

  it("every sign-in trace in localStorage is off; only a plain signed-out visit's keys are allowed", () => {
    for (const key of [
      "lazytopper.progress.active_uid.v1",
      "firebase:authUser:key:[DEFAULT]",
      "lazytopper.auth.local.v1",
      "lazytopper.subscription.v1:u1",
      "ltFreeCheck.used.v1",
    ]) {
      expect(kind({ local: [[key, "x"]] }), key).toBe("off");
    }
    const plain = Object.keys(CI_LOCAL_ALLOW).map((k) => [k, (CI_LOCAL_ALLOW[k] ?? ["anything"])[0]] as [string, string]);
    expect(kind({ local: plain })).toBe("door");
    expect(kind({ local: [["lazytopper.theme", "dark"]] })).toBe("off");
    expect(kind({ local: [["vibeMode", "zombie"]] })).toBe("off");
    expect(kind({ local: [["lazytopper.smartLearning.stats.v1", '{"x":1}']] })).toBe("off");
  });

  it("width and pointer must match the served capture (useIsDesktop, useCoarsePointer)", () => {
    expect(kind({ narrow: false, wide: true })).toBe("off");
    expect(kind({ coarse: false })).toBe("off");
    expect(kind({ narrow: true, wide: false, coarse: false, userAgent: WINDOWS }, desktop)).toBe("off");
    expect(kind({ narrow: false, wide: true, coarse: true, userAgent: WINDOWS }, desktop)).toBe("off");
    expect(kind({ narrow: false, wide: false })).toBe("off");
  });

  it("in-app browsers, router state and the clock window are off", () => {
    expect(kind({ userAgent: `${ANDROID} Instagram 350.0` })).toBe("off");
    expect(kind({ historyUsr: { from: "/x" } })).toBe("off");
    expect(kind({ now: CLOCK.until })).toBe("off");
    expect(kind({ now: CLOCK.from - 1 })).toBe("off");
  });
});

describe("the allowlists name what the app really uses", () => {
  const SRC = resolve(__dirname, "..");
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) files.push(p);
    }
  };
  walk(SRC);
  const source = files.map((f) => readFileSync(f, "utf8")).join("\n");

  it("every allowed localStorage key is written by app code", () => {
    for (const key of Object.keys(CI_LOCAL_ALLOW)) {
      const quoted = new RegExp(`["'\`]${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/:smartLearning:anonymous$/, "")}`);
      expect(quoted.test(source), key).toBe(true);
    }
  });

  it("the shared-link rule and the media queries match their sources", () => {
    const moments = readFileSync(join(SRC, "components/guide/moments/moments.tsx"), "utf8");
    expect(moments).toContain('=== "parent_share"');
    expect(moments).toContain('=== "share"');
    expect(readFileSync(join(SRC, "components/upload/PageTray.tsx"), "utf8")).toContain('COARSE_POINTER_QUERY = "(pointer: coarse)"');
    expect(readFileSync(join(SRC, "hooks/useIsDesktop.ts"), "utf8")).toContain('"(min-width: 1024px)"');
    expect(CI_ALLOWED_PARAMS).not.toContain("review");
  });

  it("RouteFallback in App.tsx is the 'Loading...' card the composition replaces", () => {
    const app = readFileSync(join(SRC, "App.tsx"), "utf8");
    const fallback = app.slice(app.indexOf("function RouteFallback()"), app.indexOf("function RouteFallback()") + 600);
    expect(fallback).toContain('minHeight: "50vh"');
    expect(fallback).toContain(">Loading...</h3>");
    expect(ROUTE_FALLBACK_HTML).toContain("Loading...</h3>");
  });

  it("the demo card's placeholder is still CiDemoCard's fallback (the static keeps it: its question is random)", () => {
    const card = readFileSync(join(SRC, "components/ciDemo/CiDemoCard.tsx"), "utf8");
    expect(card).toContain('className="ci-demo-ph" data-testid="ci-demo-placeholder" aria-hidden="true"');
    expect(CI_DEMO_PLACEHOLDER_HTML).toContain('data-testid="ci-demo-placeholder"');
  });
});

const F =
  '<div style="padding-bottom: 60px;"><div class="lt-routenav lt-routenav--page" aria-hidden="true"><div class="lt-routenav__row lt-routenav__row--ghost"></div></div>' +
  `${ROUTE_FALLBACK_HTML}</div><div data-lt-bottomnav=""><button>Home</button></div>`;
const C =
  `<div style="padding-bottom: 60px;">${ROUTE_START}<div class="phone-shell"><h1 style="font-family: Fraunces, serif">Answer Checker</h1>` +
  `<a class="x" href="/pricing">Plans</a><a class="marks" href="/check-your-answer">How marks are given</a><textarea class="lt-eq__textarea"></textarea>` +
  `<button type="button">Check</button></div>${ROUTE_END}</div><div data-lt-bottomnav=""><button>Home</button></div>`;

describe("composition", () => {
  it("F with its RouteFallback replaced by C's route region (marks kept)", () => {
    const out = composeRouteShell(F, C);
    expect(out).not.toContain("Loading...");
    expect(out).toContain(`${ROUTE_START}<div class="phone-shell">`);
    expect(out).toContain(`${ROUTE_END}</div><div data-lt-bottomnav="">`);
    expect(out).toContain("lt-routenav--page");
    expect(routeRegionOf(C).startsWith(ROUTE_START) && routeRegionOf(C).endsWith(ROUTE_END)).toBe(true);
  });

  it("refuses anything but exactly one fallback and one route region", () => {
    expect(() => composeRouteShell(F + ROUTE_FALLBACK_HTML, C)).toThrow(/exactly one RouteFallback/);
    expect(() => composeRouteShell(F.replace(ROUTE_FALLBACK_HTML, ""), C)).toThrow(/exactly one RouteFallback/);
    expect(() => composeRouteShell(F, C.replace(ROUTE_START, ""))).toThrow(/no route marks/);
    expect(() => composeRouteShell(F, C.replace(ROUTE_START, ROUTE_START + ROUTE_START))).toThrow(/more than one/);
  });

  it("withoutRouteTemplates ignores only what renders nothing", () => {
    expect(withoutRouteTemplates(`a${ROUTE_START}b<template data-lt-route="prerendered"></template>c${ROUTE_END}<i data-lt-paint="door">d</i>`)).toBe("abc<i>d</i>");
  });
});

const SHELL =
  '<!doctype html><html lang="en-IN"><head><meta charset="UTF-8" />' +
  '<meta name="viewport" content="width=device-width, initial-scale=1.0" />' +
  '<link rel="canonical" href="https://www.lazytopper.com/" /><meta name="robots" content="noindex,follow" />' +
  '<script type="module" crossorigin src="/assets/index-AAAAAAAA.js"></script></head><body><div id="root"></div></body></html>';

describe("the page", () => {
  it("theme, head CSS before any stylesheet, the route CSS inlined, the static state marked, the script right after #root", () => {
    const html = buildCheckImprovePaintPage(SHELL, composeRouteShell(F, C), mobile, [{ file: "DesktopCheckImprovePage-AAAAAAAA.css", css: ".ci{}" }]);
    expect(html).toContain('<html lang="en-IN" data-theme="light">');
    expect(html.indexOf("<style data-lt-paint-css>")).toBeLessThan(html.indexOf('<link rel="canonical"'));
    expect(html).toContain('<style data-lt-inline="DesktopCheckImprovePage-AAAAAAAA.css">.ci{}</style></head>');
    expect(html).toContain(`<div id="root"><div ${PAINT_ATTR}="door" style="padding-bottom: 60px;">`);
    expect(html).toContain('</div><script data-lt-paint-script>');
    expect(html).toContain('<meta name="robots" content="noindex,follow" />');
  });

  it("the RouteNav placeholder is hidden at phone width only (static + prerendered fallback)", () => {
    expect(checkImprovePaintCss("mobile")).toContain(".lt-routenav--page:has(+ template[data-lt-route=\"prerendered\"])");
    expect(checkImprovePaintCss("desktop")).not.toContain("lt-routenav");
    expect(checkImprovePaintCss("desktop")).toContain(`html:not(.${PAINT_READY_CLASS}) #root>[${PAINT_ATTR}]{display:none!important}`);
  });
});

/** Load a built page into jsdom and run its script. */
function runPage(html: string, setup: () => void = () => {}): HTMLElement {
  const m = html.match(/<div id="root">([\s\S]*)<\/div><script data-lt-paint-script>([\s\S]*?)<\/script>/);
  if (!m) throw new Error("no root + script");
  document.documentElement.className = "";
  document.documentElement.removeAttribute(PAINT_STATE_ATTR);
  document.body.innerHTML = `<div id="root">${m[1]}</div>`;
  setup();
  new Function(m[2])();
  return document.getElementById("root") as HTMLElement;
}

describe("the shipped script (jsdom)", () => {
  const page = (variant: "mobile" | "desktop" = "mobile") =>
    buildCheckImprovePaintPage(SHELL, composeRouteShell(F, C), checkImprovePaintConfig(variant, { from: 0, until: Number.MAX_SAFE_INTEGER }), []);
  let restoreMedia: () => void = () => {};
  function media(narrow: boolean, coarse: boolean) {
    const original = window.matchMedia;
    window.matchMedia = ((q: string) => ({
      matches: q.includes("pointer") ? coarse : q.includes("max-width") ? narrow : !narrow,
    })) as unknown as typeof window.matchMedia;
    restoreMedia = () => {
      window.matchMedia = original;
    };
  }
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    localStorage.clear();
    sessionStorage.clear();
  });
  afterEach(() => {
    restoreMedia();
    vi.restoreAllMocks();
    document.body.innerHTML = "";
    document.documentElement.className = "";
    document.documentElement.removeAttribute(PAINT_STATE_ATTR);
    localStorage.clear();
    sessionStorage.clear();
    delete (document as unknown as { fonts?: unknown }).fonts;
  });

  it("door: everything kept, ready, state recorded; a tap is swallowed and shown pressed", () => {
    media(true, true);
    const root = runPage(page());
    expect(root.children).toHaveLength(2);
    expect(document.documentElement.classList.contains(PAINT_READY_CLASS)).toBe(true);
    expect(document.documentElement.getAttribute(PAINT_STATE_ATTR)).toBe("door");
    const link = root.querySelector("a.x") as HTMLAnchorElement;
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    link.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(link.classList.contains(PAINT_PRESSED_CLASS)).toBe(true);
    expect(link.getAttribute("aria-busy")).toBe("true");
  });

  it("off on doubt (a session key, a sign-in trace, a wrong pointer): the root is EMPTY — today's shell", () => {
    media(true, true);
    expect(runPage(page(), () => sessionStorage.setItem("lazytopper.visitSource", "{}")).innerHTML).toBe("");
    expect(document.documentElement.getAttribute(PAINT_STATE_ATTR)).toBe("off");
    expect(document.documentElement.classList.contains(PAINT_READY_CLASS)).toBe(false);
    sessionStorage.clear();
    expect(runPage(page(), () => localStorage.setItem("lazytopper.progress.active_uid.v1", "u1")).innerHTML).toBe("");
    localStorage.clear();
    restoreMedia();
    media(true, false);
    expect(runPage(page()).innerHTML).toBe("");
  });

  it("the tap guard removes itself once React's nodes replace the static ones", async () => {
    media(true, true);
    const removed: unknown[] = [];
    const original = document.removeEventListener.bind(document);
    document.removeEventListener = ((type: string, fn: EventListener, opts?: boolean) => {
      removed.push([type, opts]);
      return original(type, fn, opts);
    }) as typeof document.removeEventListener;
    try {
      const root = runPage(page());
      while (root.firstChild) root.removeChild(root.firstChild);
      root.appendChild(document.createElement("main"));
      await new Promise((r) => setTimeout(r, 0));
      expect(removed).toContainEqual(["click", true]);
      expect(removed).toContainEqual(["focusin", true]);
    } finally {
      document.removeEventListener = original;
    }
  });

  it("the Fraunces re-insert happens while static, never once React is in #root", async () => {
    media(true, true);
    let resolveLoad!: (faces: unknown[]) => void;
    Object.defineProperty(document, "fonts", {
      value: { load: () => new Promise<unknown[]>((r) => (resolveLoad = r)) },
      configurable: true,
    });
    const root = runPage(page());
    const h1 = root.querySelector("h1");
    resolveLoad([{}]);
    await new Promise((r) => setTimeout(r, 0));
    expect(root.querySelector("h1")).not.toBe(h1);
    expect(root.querySelector("h1")?.outerHTML).toBe(h1?.outerHTML);

    // React already rendered into the root while a static node remains: no swap.
    const root2 = runPage(page());
    const h1b = root2.querySelector("h1");
    root2.appendChild(document.createElement("main"));
    resolveLoad([{}]);
    await new Promise((r) => setTimeout(r, 0));
    expect(root2.querySelector("h1")).toBe(h1b);
  });
});

describe("review of #1635 — the static page is inert until the static content is gone", () => {
  const page = () =>
    buildCheckImprovePaintPage(SHELL, composeRouteShell(F, C), checkImprovePaintConfig("mobile", { from: 0, until: Number.MAX_SAFE_INTEGER }), []);
  let restore: () => void = () => {};
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    localStorage.clear();
    sessionStorage.clear();
    const original = window.matchMedia;
    window.matchMedia = ((q: string) => ({ matches: q.includes("pointer") ? true : q.includes("max-width") })) as unknown as typeof window.matchMedia;
    restore = () => {
      window.matchMedia = original;
    };
  });
  afterEach(() => {
    restore();
    vi.restoreAllMocks();
    document.body.innerHTML = "";
    document.documentElement.className = "";
    document.documentElement.removeAttribute(PAINT_STATE_ATTR);
  });
  const fire = (el: Element, type: string, init: Record<string, unknown> = {}) => {
    const event = new Event(type, { bubbles: true, cancelable: true, ...init });
    el.dispatchEvent(event);
    return event.defaultPrevented;
  };

  it("the route region's top-level nodes are marked static at build time", () => {
    const marked = withStaticRouteRegion(composeRouteShell(F, C));
    expect(marked).toContain(`${ROUTE_START}<div ${STATIC_ATTR}="" class="phone-shell">`);
    expect(marked.split(`${STATIC_ATTR}=""`)).toHaveLength(2);
  });

  it("(a) a static field can never be focused by a pointer, is blurred if focused, and takes no keys, input or paste", () => {
    const root = runPage(page());
    const area = root.querySelector("textarea") as HTMLTextAreaElement;
    expect(fire(area, "mousedown")).toBe(true);
    area.focus();
    expect(document.activeElement).not.toBe(area);
    for (const type of ["keydown", "keypress", "beforeinput", "input", "paste", "drop"]) expect(fire(area, type), type).toBe(true);
    expect(area.value).toBe("");
  });

  it("(b)+(c) the guard lives until the PRERENDERED copy is gone; React's nodes are never touched", async () => {
    const removed: string[] = [];
    const original = document.removeEventListener.bind(document);
    document.removeEventListener = ((type: string, fn: EventListener, opts?: boolean) => {
      removed.push(type);
      return original(type, fn, opts);
    }) as typeof document.removeEventListener;
    try {
      const root = runPage(page());
      // React's first commit: its own chrome, plus main.tsx's copy of the route region (attributes kept).
      const region = Array.from(root.querySelectorAll(`[${STATIC_ATTR}]`)).map((n) => n.cloneNode(true) as Element);
      while (root.firstChild) root.removeChild(root.firstChild);
      const chrome = document.createElement("div");
      const reactButton = document.createElement("button");
      chrome.appendChild(reactButton);
      const anchor = document.createElement("template");
      anchor.setAttribute("data-lt-route", "prerendered");
      chrome.appendChild(anchor);
      for (const node of region) chrome.appendChild(node);
      root.appendChild(chrome);
      await new Promise((r) => setTimeout(r, 0));
      expect(removed).toEqual([]);
      // Still static: "How marks are given" does not navigate, a tap shows pressed, the field stays inert.
      const marks = root.querySelector("a.marks") as HTMLAnchorElement;
      expect(fire(marks, "click")).toBe(true);
      expect(marks.classList.contains(PAINT_PRESSED_CLASS)).toBe(true);
      expect(fire(root.querySelector("textarea") as Element, "keydown")).toBe(true);
      // React's own node: untouched.
      expect(fire(reactButton, "click")).toBe(false);
      expect(reactButton.classList.contains(PAINT_PRESSED_CLASS)).toBe(false);
      expect(reactButton.hasAttribute("aria-busy")).toBe(false);
      // The route mounts: the prerendered copy is removed, the guard goes with it.
      for (const node of region) node.remove();
      await new Promise((r) => setTimeout(r, 0));
      expect(removed).toContain("click");
      expect(removed).toContain("keydown");
      expect(removed).toContain("focusin");
    } finally {
      document.removeEventListener = original;
    }
  });

  it("(c) before React, the marks link and every static link are swallowed with pressed feedback", () => {
    const root = runPage(page());
    const marks = root.querySelector("a.marks") as HTMLAnchorElement;
    expect(fire(marks, "click")).toBe(true);
    expect(marks.getAttribute("aria-busy")).toBe("true");
  });
});

describe("review of #1635 — B2: the build's free-check flag", () => {
  const made: string[] = [];
  afterEach(() => {
    for (const d of made.splice(0)) rmSync(d, { recursive: true, force: true });
  });
  function build(freeCheckOn: boolean) {
    const dir = mkdtempSync(join(tmpdir(), "lt-ci-flag-"));
    made.push(dir);
    const out = join(dir, "out");
    const art = join(dir, "prerendered");
    mkdirSync(out, { recursive: true });
    writeFileSync(join(out, SPA_SHELL), SHELL);
    for (const variant of ["mobile", "desktop"] as const) {
      for (const [path, kind] of [["/login", "door"], ["/login", "signing-in"], ["/check-improve", "door"]] as const) {
        const file = paintFragmentPathFor(art, path, kind, variant);
        mkdirSync(join(file, ".."), { recursive: true });
        writeFileSync(
          file,
          path === "/check-improve"
            ? composeRouteShell(F, C)
            : '<div><a class="lt-login-back-link" href="/">&lt;- Back to home</a><a class="lt-offer-strip-link" href="/pricing?source=login">p</a><button>Continue with email</button></div>',
        );
      }
    }
    writeFileSync(join(art, "manifest.json"), JSON.stringify({ paths: [], paintPaths: [...PAINT_PATHS] }));
    writeFileSync(join(art, PAINT_DIR, "paint.json"), JSON.stringify({ paths: [...PAINT_PATHS], clock: CLOCK }));
    applyPaintShells(out, art, { emailCodeOn: false, criticalCss: false, freeCheckOn });
    return out;
  }
  const files = ["check-improve.html", "check-improve/index.html", "__desktop/check-improve.html"];

  it("flag OFF: all three files are the plain shell (blank, today) and still exist for middleware", () => {
    const out = build(false);
    for (const f of files) expect(readFileSync(join(out, f), "utf8"), f).toBe(SHELL);
    expect(verifyPaintPages(out, ["/check-improve"], { freeCheckOn: false })).toEqual([]);
    expect(existsSync(join(out, "login.html"))).toBe(true);
  });

  it("flag ON: all three files are painted", () => {
    const out = build(true);
    for (const f of files) expect(readFileSync(join(out, f), "utf8"), f).toContain('data-lt-paint="door"');
    expect(verifyPaintPages(out, ["/check-improve"], { freeCheckOn: false }).join("\n")).toMatch(/not the plain shell/);
  });

  it("the build reads the flag with the client's own grammar", () => {
    const client = readFileSync(resolve(__dirname, "../services/freeCheckClient.ts"), "utf8");
    expect(client).toContain('/^(1|true|on|yes)$/i.test(readEnv("VITE_FREE_CHECK_ENABLED"))');
    expect(emailCodeFlagOn(" ON ")).toBe(true);
    expect(emailCodeFlagOn("0")).toBe(false);
    const apply = readFileSync(resolve(__dirname, "../../scripts/seo/applyPrerendered.ts"), "utf8");
    expect(apply).toContain("freeCheckOn = emailCodeFlagOn(viteEnv.VITE_FREE_CHECK_ENABLED)");
  });
});

/* ------------------------------------------------------------------------------------------------ *
 * SPEED-CI-2 (owner ruling 8 Nov 2026 12:10 IST) — a first-time visitor's demo card is a FIXED question, so the
 * static paint carries it; a returning visitor / a CBQ ad keeps today's placeholder; a tap on its options is kept.
 * ------------------------------------------------------------------------------------------------ */

const FIRST_CARD =
  `<section class="ci-demo ci-demo--pick" data-testid="ci-demo-preview" data-ci-first="" data-ci-bank="PYQ-S-2024-LIGHT-003">` +
  `<p class="ci-demo__ladder-q">The colour of light for which the refractive index of glass is minimum, is :</p>` +
  `<ul class="ci-demo__opts" role="list"><li><button type="button" data-testid="one-min-opt-0">Red</button></li><li><button type="button" data-testid="one-min-opt-2">Green</button></li></ul>` +
  `<button type="button" data-testid="ci-demo-close">x</button></section>`;
const C_FIRST = C.replace("<button type=\"button\">Check</button>", `<button type="button">Check</button>${FIRST_CARD}`);

describe("SPEED-CI-2 — the demo card in the static paint", () => {
  const demo = (over: Partial<CiPaintEnv>, config = mobile) => decideCheckImprovePaint(env(over), config, helpers).demo;

  it("the decision: the first-visit card unless the ladder was seen here or the ad is a CBQ one (then the placeholder)", () => {
    expect(demo({})).toBe("first");
    expect(demo({ narrow: false, wide: true, coarse: false, userAgent: WINDOWS }, desktop)).toBe("first");
    expect(demo({ search: "?utm_source=youtube&utm_content=sci_light" })).toBe("first");
    expect(demo({ search: "?utm_source=youtube&utm_content=a" })).toBe("first");
    expect(demo({ local: [[CI_LADDER_SEEN_KEY, "1"]] })).toBe("placeholder");
    expect(kind({ local: [[CI_LADDER_SEEN_KEY, "1"]] })).toBe("door");
    expect(kind({ local: [[CI_LADDER_SEEN_KEY, "yes"]] })).toBe("off");
    expect(demo({ search: "?utm_content=cbq_short" })).toBe("placeholder");
    expect(demo({ search: "?utm_content=CBQ_Short" })).toBe("placeholder");
    expect(demo({ search: "?utm_campaign=yt_cbq_maths" })).toBe("placeholder");
    expect(demo({ search: "?review=x" })).toBeUndefined();
  });

  it("the key is the app's own (ladderVisit.ts), and the one card serves every first-visit door", () => {
    expect(CI_LADDER_SEEN_KEY).toBe(LADDER_SEEN_KEY);
    expect(CI_LOCAL_ALLOW[LADDER_SEEN_KEY]).toEqual(["1"]);
    expect(ciFirstCardExpectation().bank).toBe(fixedStarter(null).bankId);
    expect(CI_FIRST_STARTER).toBe(fixedStarter(null).bankId);
    expect(fixedStarter("Science").bankId).toBe(fixedStarter(null).bankId);
  });

  it("firstCardProblems: exactly one first-visit card of the fixed starter, no captured placeholder", () => {
    expect(firstCardProblems(C_FIRST)).toEqual([]);
    expect(firstCardProblems(C).length).toBeGreaterThan(0);
    expect(firstCardProblems(C_FIRST + FIRST_CARD).join()).toMatch(/exactly once/);
    expect(firstCardProblems(C_FIRST.replace("PYQ-S-2024-LIGHT-003", "PYQ-M-QE-002")).join()).toMatch(/fixed starter/);
    expect(firstCardProblems(C_FIRST + CI_DEMO_PLACEHOLDER_HTML).join()).toMatch(/placeholder/);
  });

  it("the capture's parity matrix pins both card forms on real loads", () => {
    const by = (d: string) => CI_PARITY_CASES.filter((k) => k.expect === "door" && k.expectDemo === d).map((k) => k.name);
    expect(by("first").length).toBeGreaterThanOrEqual(4);
    expect(by("placeholder").length).toBeGreaterThanOrEqual(3);
    expect(CI_PARITY_CASES.filter((k) => k.expect === "door" && !k.expectDemo)).toEqual([]);
    expect(CI_PARITY_CASES.some((k) => k.search.includes("cbq") && k.expectDemo === "placeholder")).toBe(true);
    expect(CI_PARITY_CASES.some((k) => k.seed === "prior-visit" && k.expectDemo === "placeholder")).toBe(true);
  });

  describe("the shipped script (jsdom)", () => {
    const page = () =>
      buildCheckImprovePaintPage(SHELL, composeRouteShell(F, C_FIRST), checkImprovePaintConfig("mobile", { from: 0, until: Number.MAX_SAFE_INTEGER }), []);
    let original: typeof window.matchMedia;
    beforeEach(() => {
      vi.spyOn(Date, "now").mockReturnValue(NOW);
      localStorage.clear();
      sessionStorage.clear();
      original = window.matchMedia;
      window.matchMedia = ((q: string) => ({ matches: q.includes("pointer") ? true : q.includes("max-width") })) as unknown as typeof window.matchMedia;
      (window as unknown as { __ltStaticTap?: unknown }).__ltStaticTap = undefined;
    });
    afterEach(() => {
      window.matchMedia = original;
      vi.restoreAllMocks();
      document.body.innerHTML = "";
      document.documentElement.className = "";
      document.documentElement.removeAttribute(PAINT_STATE_ATTR);
      localStorage.clear();
      sessionStorage.clear();
      window.history.replaceState(null, "", "/");
    });

    it("first visit: the card stays, and a tap on an option is swallowed, pressed and REMEMBERED (× is not)", () => {
      const root = runPage(page());
      const card = root.querySelector("[data-ci-first]") as HTMLElement;
      expect(card).not.toBeNull();
      expect(root.innerHTML).not.toContain("ci-demo-placeholder");
      const close = card.querySelector('[data-testid="ci-demo-close"]') as HTMLElement;
      close.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      expect((window as unknown as { __ltStaticTap?: unknown }).__ltStaticTap).toBeUndefined();
      const opt = card.querySelector('[data-testid="one-min-opt-2"]') as HTMLElement;
      const event = new MouseEvent("click", { bubbles: true, cancelable: true });
      opt.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
      expect(opt.classList.contains(PAINT_PRESSED_CLASS)).toBe(true);
      expect((window as unknown as { __ltStaticTap?: unknown }).__ltStaticTap).toEqual({ id: "one-min-opt-2", bank: "PYQ-S-2024-LIGHT-003" });
      close.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      expect((window as unknown as { __ltStaticTap?: unknown }).__ltStaticTap).toEqual({ id: "one-min-opt-2", bank: "PYQ-S-2024-LIGHT-003" });
    });

    it("FU1: an early option tap reserves the verdict's boxes at once, exactly as the preview / ladder draw them, once", () => {
      const root = runPage(page());
      const card = root.querySelector("[data-ci-first]") as HTMLElement;
      const tap = (id: string) => (card.querySelector(`[data-testid="${id}"]`) as HTMLElement).dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      tap("ci-demo-close");
      expect(card.querySelector(".ci-demo__verdict--reserve")).toBeNull();
      tap("one-min-opt-2");
      tap("one-min-opt-0");
      const ul = card.querySelector("ul") as HTMLElement;
      expect(card.querySelectorAll(".ci-demo__verdict-mark--held")).toHaveLength(1);
      expect(card.querySelectorAll(".ci-demo__verdict--reserve")).toHaveLength(1);
      expect((ul.previousElementSibling as HTMLElement).outerHTML).toBe(renderToStaticMarkup(createElement(LadderHeldMark)));
      expect((ul.nextElementSibling as HTMLElement).outerHTML).toBe(renderToStaticMarkup(createElement(LadderVerdictReserve)));
      // FU4 (accepted): the last early tap is the one kept.
      expect((window as unknown as { __ltStaticTap?: unknown }).__ltStaticTap).toEqual({ id: "one-min-opt-0", bank: "PYQ-S-2024-LIGHT-003" });
    });

    it("a returning visitor (ladder seen) and a CBQ ad: today's placeholder, byte for byte, in the card's place", () => {
      const seen = runPage(page(), () => localStorage.setItem(LADDER_SEEN_KEY, "1"));
      expect(document.documentElement.getAttribute(PAINT_STATE_ATTR)).toBe("door");
      expect(seen.querySelector("[data-ci-first]")).toBeNull();
      expect(seen.innerHTML.split(CI_DEMO_PLACEHOLDER_HTML)).toHaveLength(2);
      expect(seen.innerHTML).toContain(`<button type="button">Check</button>${CI_DEMO_PLACEHOLDER_HTML}`);
      localStorage.clear();
      window.history.replaceState(null, "", "/check-improve?utm_source=youtube&utm_content=cbq_short");
      const cbq = runPage(page());
      expect(cbq.querySelector("[data-ci-first]")).toBeNull();
      expect(cbq.innerHTML.split(CI_DEMO_PLACEHOLDER_HTML)).toHaveLength(2);
    });
  });
});

describe("SPEED-CI-2 — the desktop greeting is the device's, never the capture machine's", () => {
  const P = (t: string) => `<div><p data-testid="shell-greeting" style="margin: 0px;">${t}</p></div>`;

  it("same thresholds as DesktopShell.tsx greetingFor", () => {
    const shell = readFileSync(resolve(__dirname, "../components/desktop/DesktopShell.tsx"), "utf8");
    expect(shell).toContain('if (hour < 12) return "Good morning";');
    expect(shell).toContain('if (hour < 17) return "Good afternoon";');
    expect(shell).toContain('return "Good evening";');
    expect(shell).toContain('data-testid="shell-greeting"');
    const at = (h: number) => {
      document.body.innerHTML = P("Good morning");
      setPaintGreeting(document.body, h);
      return document.body.textContent;
    };
    expect([0, 11, 12, 16, 17, 23].map(at)).toEqual(["Good morning", "Good morning", "Good afternoon", "Good afternoon", "Good evening", "Good evening"]);
    document.body.innerHTML = P("Good morning, Asha");
    setPaintGreeting(document.body, 18);
    expect(document.body.textContent).toBe("Good morning, Asha");
    document.body.innerHTML = "";
  });

  it("the capture stores it neutral (a deterministic artifact whatever hour CI runs)", () => {
    expect(withNeutralGreeting(P("Good evening"))).toBe(P("Good morning"));
    expect(withNeutralGreeting(P("Good afternoon"))).toBe(P("Good morning"));
    expect(withNeutralGreeting(P("Good morning, Asha"))).toBe(P("Good morning, Asha"));
  });

  it("the shipped script sets the device's greeting on a door before anything paints", () => {
    const original = window.matchMedia;
    window.matchMedia = ((q: string) => ({ matches: q.includes("min-width") })) as unknown as typeof window.matchMedia;
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    vi.spyOn(Date.prototype, "getHours").mockReturnValue(15);
    try {
      const html = buildCheckImprovePaintPage(SHELL, composeRouteShell(F.replace("<div data-lt-bottomnav", `${P("Good morning")}<div data-lt-bottomnav`), C), desktop, []);
      const root = runPage(html);
      expect(document.documentElement.getAttribute(PAINT_STATE_ATTR)).toBe("door");
      expect((root.querySelector('[data-testid="shell-greeting"]') as HTMLElement).textContent).toBe("Good afternoon");
    } finally {
      window.matchMedia = original;
      vi.restoreAllMocks();
      document.body.innerHTML = "";
      document.documentElement.className = "";
      document.documentElement.removeAttribute(PAINT_STATE_ATTR);
    }
  });
});
