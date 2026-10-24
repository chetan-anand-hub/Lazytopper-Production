// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * GUARD — the preload net in `index.html`.
 *
 * Vite's preload helper fires a cancelable `vite:preloadError` when a lazy route's
 * stylesheet fails, and rethrows only if nobody cancelled it. The rethrow is what
 * sends a student to "Something went wrong — Reload App". The inline head script in
 * `index.html` cancels it for CSS failures only.
 *
 * WHAT THIS FILE ASSERTS, and why each one matters:
 *   - the listener script exists
 *   - it sits BEFORE the module script. Presence alone is not enough: the same script
 *     placed after `<script type="module">` would pass a presence check and still be
 *     registered too late, which is the failure mode that matters.
 *   - it calls `preventDefault()` — without it the listener only watches the crash
 *   - it is scoped to CSS failures. A failed JS chunk import reaches the same event,
 *     and cancelling that would hand React.lazy an undefined module.
 *   - no global `error` / `unhandledrejection` handler rides along with it
 */

const ROOT = process.cwd(); // vitest runs with cwd = lazytopper/
const INDEX_HTML = resolve(ROOT, "index.html");

/** Every inline classic `<script>` (no `src`, no `type`), with its offset in the file. */
export function inlineClassicScripts(html: string): { body: string; index: number }[] {
  return [...html.matchAll(/<script>([\s\S]*?)<\/script>/gi)].map((m) => ({
    body: m[1],
    index: m.index ?? -1,
  }));
}

/** The inline script(s) that register the `vite:preloadError` listener. */
export function preloadNetScripts(html: string): { body: string; index: number }[] {
  return inlineClassicScripts(html).filter((s) =>
    /addEventListener\(\s*["']vite:preloadError["']/.test(s.body),
  );
}

/** Offset of the app's module entry script, or -1. */
export function moduleScriptIndex(html: string): number {
  return html.search(/<script\s+type="module"/i);
}

const html = readFileSync(INDEX_HTML, "utf8");

/** The ASSET-RELOAD-1 entry-script net: an inline script reloading on a failed /assets module script. */
function isAssetReloadNet(body: string): boolean {
  return /addEventListener\(\s*["']error["']/.test(body) && body.includes("lazytopper.chunkReloadAt");
}

describe("preload net — a dropped stylesheet does not kill the page", () => {
  const nets = preloadNetScripts(html);
  const net = nets[0];

  it("names its subject on every run, green included", () => {
    // eslint-disable-next-line no-console
    console.log(
      `PRELOAD_NET_SCOPE: file=index.html bytes=${html.length} ` +
        `inline_scripts=${inlineClassicScripts(html).length} nets=${nets.length} ` +
        `net_at=${net?.index ?? -1} module_at=${moduleScriptIndex(html)} ` +
        `head_end_at=${html.indexOf("</head>")}`,
    );
    expect(html.length, "index.html read as empty — every assertion below would be vacuous")
      .toBeGreaterThan(0);
    expect(moduleScriptIndex(html), "no <script type=\"module\"> in index.html").toBeGreaterThan(-1);
  });

  it("has exactly one inline vite:preloadError listener", () => {
    expect(
      nets.length,
      `expected exactly one inline <script> registering vite:preloadError, found ${nets.length}`,
    ).toBe(1);
  });

  it("registers it in <head>, BEFORE the module script", () => {
    expect(net, "no preload net script").toBeDefined();
    expect(
      net!.index,
      `the preload net (at ${net!.index}) must come before <script type="module"> ` +
        `(at ${moduleScriptIndex(html)}); after it, the listener is registered too late`,
    ).toBeLessThan(moduleScriptIndex(html));
    expect(net!.index, "the preload net must be inside <head>").toBeLessThan(html.indexOf("</head>"));
  });

  it("cancels the event with preventDefault()", () => {
    expect(net, "no preload net script").toBeDefined();
    expect(net!.body).toMatch(/\.preventDefault\(\s*\)/);
  });

  it("only cancels CSS preload failures, and warns naming the failure", () => {
    expect(net, "no preload net script").toBeDefined();
    // Vite's own message for a stylesheet that failed: `Unable to preload CSS for ${url}`.
    expect(net!.body).toContain("Unable to preload CSS for ");
    expect(net!.body).toMatch(/console\.warn\([^)]*message/);
  });

  it("adds no global error or unhandledrejection handler", () => {
    for (const s of inlineClassicScripts(html)) {
      // ASSET-RELOAD-1: the one sanctioned capture-phase `error` listener is pinned below.
      if (isAssetReloadNet(s.body)) continue;
      expect(s.body).not.toMatch(/["']unhandledrejection["']|["']error["']\s*,|window\.onerror/);
    }
  });
});

describe("ASSET-RELOAD-1 — a failed entry script reloads once instead of leaving a blank page", () => {
  const nets = inlineClassicScripts(html).filter((s) => isAssetReloadNet(s.body));
  const net = nets[0];

  it("exists exactly once, inside <head>, BEFORE the module script", () => {
    expect(nets.length).toBe(1);
    expect(net!.index).toBeLessThan(moduleScriptIndex(html));
    expect(net!.index).toBeLessThan(html.indexOf("</head>"));
  });

  it("listens in the capture phase (resource errors do not bubble)", () => {
    expect(net!.body).toMatch(/\},\s*true\s*\)\s*;/);
  });

  it("reacts only to module scripts under this origin's /assets/", () => {
    expect(net!.body).toMatch(/tagName\s*!==\s*"SCRIPT"/);
    expect(net!.body).toMatch(/type\s*!==\s*"module"/);
    expect(net!.body).toContain('window.location.origin + "/assets/"');
  });

  it("is guarded: one reload per 60 s via sessionStorage, no reload when storage throws", () => {
    expect(net!.body).toContain("60000");
    expect(net!.body).toMatch(/catch\s*\(\w+\)\s*\{\s*return;/);
  });

  it("overwrites the cached response with cache: reload, then reloads", () => {
    expect(net!.body).toMatch(/fetch\(src,\s*\{\s*cache:\s*"reload"/);
    expect(net!.body).toContain("window.location.reload()");
  });

  it("uses the same storage key and window as src/lib/chunkReload.ts", () => {
    const ts = readFileSync(resolve(ROOT, "src/lib/chunkReload.ts"), "utf8");
    expect(ts).toContain('CHUNK_RELOAD_KEY = "lazytopper.chunkReloadAt"');
    expect(ts).toContain("CHUNK_RELOAD_WINDOW_MS = 60_000");
  });
});
