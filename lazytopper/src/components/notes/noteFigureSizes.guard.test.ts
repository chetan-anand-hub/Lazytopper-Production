// PERF-1 F3 — every notes figure asset has its pixel size in the generated table, read from the
// file's own WebP header, so a figure <img> can carry width/height and not shift the page.

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { webpSize, renderFigureSizes } from "../../../scripts/genNoteMath";
import { getNoteAssetSize } from "./noteSpecRegistry";

const ASSETS = resolve(__dirname, "../../../../notes/assets");

function webps(dir: string, prefix = ""): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? webps(join(dir, e.name), `${prefix}${e.name}/`) : e.name.endsWith(".webp") ? [`${prefix}${e.name}`] : [],
  );
}

describe("noteFigureSizes table", () => {
  const files = webps(ASSETS);
  const table = JSON.parse(readFileSync(resolve(__dirname, "noteFigureSizes.generated.json"), "utf8")) as Record<string, [number, number]>;

  it("has one entry per asset and matches a fresh read of every file's header", () => {
    expect(files.length).toBeGreaterThan(60);
    expect(Object.keys(table).sort()).toEqual([...files].sort());
    expect(readFileSync(resolve(__dirname, "noteFigureSizes.generated.json"), "utf8")).toBe(renderFigureSizes());
    for (const f of files) {
      const [w, h] = webpSize(readFileSync(join(ASSETS, f)));
      expect(table[f], f).toEqual([w, h]);
      expect(getNoteAssetSize(f)).toEqual({ width: w, height: h });
    }
  });

  it("CONTROL: an unknown asset has no size and a corrupted header is rejected", () => {
    expect(getNoteAssetSize("nope/none.webp")).toBeNull();
    expect(getNoteAssetSize(null)).toBeNull();
    expect(() => webpSize(Buffer.from("not a webp file at all, not even close"))).toThrow();
  });
});
