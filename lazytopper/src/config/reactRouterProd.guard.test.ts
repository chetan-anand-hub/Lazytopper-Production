// @vitest-environment node
/**
 * SPEED-RR-PROD-1 (7 Nov 2026) — production builds resolve react-router's `dist/production` build.
 *
 * react-router 7's `exports` map sends every condition to `dist/development/`, so without the
 * vite.config.ts `resolve.alias` the shipped bundle carried the development build. These cases pin:
 *   1. a production config aliases EXACTLY `react-router` and `react-router/dom`, to files that exist;
 *   2. those production files differ from the development ones only in the dev-warnings flag, so the
 *      alias cannot change routing behaviour (if an upgrade ever makes them diverge, this goes red and
 *      someone must re-check before shipping);
 *   3. a non-production config (vite dev) keeps the development build and its warnings.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

type Alias = { find: RegExp; replacement: string };

async function loadConfig(nodeEnv: string): Promise<Alias[]> {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = nodeEnv;
  vi.resetModules();
  try {
    const config = (await import("../../vite.config")).default;
    return (config.resolve?.alias ?? []) as Alias[];
  } finally {
    process.env.NODE_ENV = previous;
  }
}

/** The file with chunk-hash file names normalised, so dev and prod builds can be compared. */
const normalised = (file: string): string => readFileSync(file, "utf8").replace(/chunk-[A-Z0-9]{8}/g, "chunk-X");

/** The `./chunk-*.mjs` files an ESM file imports, resolved next to it. */
const chunksOf = (file: string): string[] =>
  [...readFileSync(file, "utf8").matchAll(/from "\.\/(chunk-[A-Z0-9]{8}\.mjs)"/g)].map((m) => join(dirname(file), m[1]));

afterEach(() => {
  vi.resetModules();
});

describe("vite.config.ts resolve.alias for react-router (SPEED-RR-PROD-1)", () => {
  it("production: aliases exactly react-router and react-router/dom to existing dist/production files", async () => {
    const alias = await loadConfig("production");
    expect(alias).toHaveLength(2);
    const [root, dom] = alias;
    expect(root.find.test("react-router")).toBe(true);
    expect(dom.find.test("react-router/dom")).toBe(true);
    for (const other of ["react-router-dom", "react-router/internal", "react-router/internal/react-server-client", "react-router/dom/x"]) {
      expect(alias.some((a) => a.find.test(other)), other).toBe(false);
    }
    expect(root.replacement).toMatch(/[\\/]react-router[\\/]dist[\\/]production[\\/]index\.mjs$/);
    expect(dom.replacement).toMatch(/[\\/]react-router[\\/]dist[\\/]production[\\/]dom-export\.mjs$/);
    expect(existsSync(root.replacement)).toBe(true);
    expect(existsSync(dom.replacement)).toBe(true);
  });

  it("production files differ from development ONLY in ENABLE_DEV_WARNINGS", async () => {
    const [root, dom] = await loadConfig("production");
    const toDev = (file: string): string => file.replace(/([\\/])production([\\/])/, "$1development$2");
    for (const prodEntry of [root.replacement, dom.replacement]) {
      expect(normalised(prodEntry)).toBe(normalised(toDev(prodEntry)));
    }
    const prodChunks = [...new Set([...chunksOf(root.replacement), ...chunksOf(dom.replacement)])].sort();
    const devChunks = [...new Set([...chunksOf(toDev(root.replacement)), ...chunksOf(toDev(dom.replacement))])].sort();
    expect(prodChunks.length).toBeGreaterThan(0);
    const prodText = prodChunks.map(normalised).join("\n");
    const devText = devChunks.map(normalised).join("\n");
    expect(prodText).toContain("var ENABLE_DEV_WARNINGS = false;");
    expect(devText).toContain("var ENABLE_DEV_WARNINGS = true;");
    expect(prodText).toBe(devText.replace("var ENABLE_DEV_WARNINGS = true;", "var ENABLE_DEV_WARNINGS = false;"));
  });

  it("non-production (vite dev): no alias, so dev keeps react-router's warnings", async () => {
    expect(await loadConfig("development")).toEqual([]);
  });
});
