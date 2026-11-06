// @vitest-environment node
/**
 * GUARD — SPEED-SITE-2a: the shell routes (served by `__shell.html`, never prerendered) preload the chunks that
 * left the entry. Without this, /login fetched Login only after the entry chunk had run (Lighthouse mobile LCP
 * 2.86 -> 3.67 s on the first build of 2a).
 */
import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { SHELL_ROUTE_CHUNKS, shellPreloadScript } from "../../scripts/seo/applyPrerendered";

const SHELL = '<html><head><script type="module" crossorigin src="/assets/index-AAAAAAAA.js"></script></head><body><div id="root"></div></body></html>';
const ASSETS: Record<string, string> = {
  "index-AAAAAAAA.js": 'import"./vendor-BBBBBBBB.js";const l=()=>import("./Login-LLLLLLLL.js");',
  "vendor-BBBBBBBB.js": "export const v=1;",
  "Login-LLLLLLLL.js": 'import{v}from"./vendor-BBBBBBBB.js";import{o}from"./OfferStrip-OOOOOOOO.js";export default 1;',
  "OfferStrip-OOOOOOOO.js": "export const o=1;",
  "SignUpPage-SSSSSSSS.js": 'import"./Login-LLLLLLLL.js";export default 2;',
  "DesktopCheckImprovePage-CCCCCCCC.js": "export default 3;",
  "DesktopShell-DDDDDDDD.js": "export const DesktopShell=1;",
};

function withAssets<T>(fn: (dir: string) => T): T {
  const out = mkdtempSync(join(tmpdir(), "shell-preload-"));
  const dir = join(out, "assets");
  mkdirSync(dir, { recursive: true });
  for (const [f, c] of Object.entries(ASSETS)) writeFileSync(join(dir, f), c, "utf8");
  try {
    return fn(dir);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
}

/** Run the inline script against a fake document and return the hrefs it would preload. */
function run(script: string, pathname: string, desktop = false): string[] {
  const added: Array<{ rel: string; href: string; crossOrigin: string | null }> = [];
  const document = {
    createElement: () => ({ rel: "", href: "", crossOrigin: null as string | null }),
    head: { appendChild: (l: { rel: string; href: string; crossOrigin: string | null }) => added.push(l) },
  };
  const window = { matchMedia: () => ({ matches: desktop }) };
  runInNewContext(script.replace(/^<script>|<\/script>$/g, ""), { document, window, location: { pathname } });
  for (const l of added) {
    expect(l.rel).toBe("modulepreload");
    expect(l.crossOrigin).toBe(""); // anonymous, like the module script, so the preload is reused
  }
  return added.map((l) => l.href);
}

describe("SPEED-SITE-2a shellPreloadScript", () => {
  it("covers /login, /sign-up and /check-improve", () => {
    expect(SHELL_ROUTE_CHUNKS.map((r) => r.modules.join("+"))).toEqual(["Login", "SignUpPage", "DesktopCheckImprovePage"]);
  });

  it("/login preloads Login + its static deps, minus what the entry already loads", () => {
    withAssets((dir) => {
      const script = shellPreloadScript(dir, SHELL);
      expect(run(script, "/login")).toEqual(["/assets/Login-LLLLLLLL.js", "/assets/OfferStrip-OOOOOOOO.js"]);
      expect(run(script, "/login/phone")).toEqual(["/assets/Login-LLLLLLLL.js", "/assets/OfferStrip-OOOOOOOO.js"]);
      expect(run(script, "/sign-up")).toEqual(["/assets/SignUpPage-SSSSSSSS.js", "/assets/Login-LLLLLLLL.js", "/assets/OfferStrip-OOOOOOOO.js"]);
    });
  });

  it("/check-improve preloads its page; at desktop width the shell too", () => {
    withAssets((dir) => {
      const script = shellPreloadScript(dir, SHELL);
      expect(run(script, "/check-improve")).toEqual(["/assets/DesktopCheckImprovePage-CCCCCCCC.js"]);
      expect(run(script, "/check-improve", true)).toEqual(["/assets/DesktopCheckImprovePage-CCCCCCCC.js", "/assets/DesktopShell-DDDDDDDD.js"]);
    });
  });

  it("every other shell path preloads nothing (no data spent on code the page does not use)", () => {
    withAssets((dir) => {
      const script = shellPreloadScript(dir, SHELL);
      for (const p of ["/me", "/practice/10/Maths", "/loginx", "/check-improve/x", "/u/abc"]) expect(run(script, p), p).toEqual([]);
    });
  });

  it("a renamed or missing route chunk fails the build (never a silent 404 preload)", () => {
    withAssets((dir) => {
      rmSync(join(dir, "Login-LLLLLLLL.js"));
      expect(() => shellPreloadScript(dir, SHELL)).toThrow(/Login/);
    });
  });
});
