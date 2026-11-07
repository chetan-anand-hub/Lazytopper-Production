/**
 * SPEED-SITE-2a — which code-split components main.tsx waits for before React's first render. The rule: wait
 * for exactly what the FIRST route renders outside a prerendered route body (Login, SignUpPage, /welcome's
 * Welcome, the desktop shell around a shell route); never for anything on a mobile public page.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { firstRouteChunks } from "./App";

const names = (list: Array<{ preload: () => Promise<void> }>) =>
  list.map((c) => (c as unknown as { displayName?: string }).displayName ?? "?").sort();

describe("SPEED-SITE-2a firstRouteChunks", () => {
  it("mobile public pages wait for NOTHING (the point of the split)", () => {
    for (const p of ["/notes/real-numbers", "/packs", "/practice-hub", "/check-improve", "/pricing", "/cbq-class-10/heredity", "/topic-hub/real-numbers"]) {
      expect(names(firstRouteChunks(p, false).await), p).toEqual([]);
    }
  });

  it("auth routes wait for their page at every width", () => {
    for (const d of [false, true]) {
      expect(names(firstRouteChunks("/login", d).await)).toEqual(["Login"]);
      expect(names(firstRouteChunks("/login/phone", d).await)).toEqual(["Login"]);
      expect(names(firstRouteChunks("/sign-up", d).await)).toEqual(["SignUpPage"]);
      expect(names(firstRouteChunks("/welcome", d).await)).toEqual(["Welcome"]);
      expect(names(firstRouteChunks("/", d).await)).toEqual(d ? ["DesktopShell", "Welcome"] : ["Welcome"]);
    }
  });

  it("desktop shell routes wait for DesktopShell; non-shell desktop pages do not", () => {
    for (const p of ["/notes/real-numbers", "/practice-hub", "/check-improve", "/topic-hub/real-numbers", "/highly-probable/10/Maths"]) {
      expect(names(firstRouteChunks(p, true).await), p).toEqual(["DesktopShell"]);
    }
    for (const p of ["/pricing", "/packs", "/cbq-class-10/heredity"]) {
      expect(names(firstRouteChunks(p, true).await), p).toEqual([]);
    }
  });

  it('"/" on desktop WAITS for the shell (a returning student\'s Home is shell-wrapped once auth resolves: no blank frame)', () => {
    expect(names(firstRouteChunks("/", false).await)).toEqual(["Welcome"]);
    expect(names(firstRouteChunks("/", true).await)).toEqual(["DesktopShell", "Welcome"]);
    expect(names(firstRouteChunks("/", true).prefetch)).toEqual([]);
  });

  it("App.tsx and main.tsx no longer import Login, SignUpPage, Welcome or DesktopShell statically", () => {
    for (const file of ["App.tsx", "main.tsx"]) {
      const src = readFileSync(resolve(__dirname, file), "utf8");
      expect(src, file).not.toMatch(/^import\s+(?!type\b)[^;]*from\s+"\.\/(pages\/(Login|SignUpPage|Welcome)|components\/desktop\/DesktopShell)";/m);
    }
  });
});
