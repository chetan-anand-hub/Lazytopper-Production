/**
 * PERF3-HEADROOM-1 (25 Nov 2026) - the night door is LAZY. CommandPalette sits in the entry chunk (App renders it on
 * every signed-in route), so a STATIC import of components/guide/companion/companion pulls companion.tsx +
 * companionModel.ts (~17 KB raw, ~6.5 KB gz) into the first download of every page. Measured on a production-flag
 * build: entry raw 536,938 -> 519,965, gz 170,613 -> 164,069.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const src = readFileSync(resolve(__dirname, "CommandPalette.tsx"), "utf8");
const staticCompanion = /^\s*import\s[^;]*from\s*['"][^'"]*guide\/companion\/companion['"]/m;

describe("CommandPalette - the companion night door stays out of the entry chunk", () => {
  it("never imports the companion module statically", () => {
    expect(src).not.toMatch(staticCompanion);
  });
  it("loads it with a dynamic import() under lazy(), and still mounts it in both shapes", () => {
    expect(src).toMatch(/lazy\(\(\)\s*=>\s*\n?\s*import\(['"]\.\.\/\.\.\/components\/guide\/companion\/companion['"]\)/);
    expect(src.match(/<NightDoor \/>/g)?.length).toBe(2);
  });
  it("CONTROL: the static-import matcher fires on the old line", () => {
    expect("import { CompanionNightDoor } from '../../components/guide/companion/companion';").toMatch(staticCompanion);
  });
});
