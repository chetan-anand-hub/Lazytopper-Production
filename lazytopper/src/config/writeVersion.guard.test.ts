// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { VERSION_FILE, resolveCommitSha, versionMarker } from "../../scripts/seo/writeVersion";

/**
 * GUARD — SEARCHPING-2 S1: every build publishes `/app/version.json` = `{"sha": "<commit>"}`
 * and nothing else. `search-ping` waits on exactly this file before telling search engines a
 * release is live, so a wrong SHA, an extra field or a build that skips the step all break it.
 */

const SHA = "7152ef06e8eb8fb25ebf11a80725996538690bc2";

describe("writeVersion — the release marker", () => {
  it("is exactly {\"sha\": \"<40-hex>\"} — no other field", () => {
    const marker = versionMarker(SHA);
    expect(JSON.parse(marker)).toEqual({ sha: SHA });
    expect(Object.keys(JSON.parse(marker))).toEqual(["sha"]);
  });

  it("normalises case and whitespace", () => {
    expect(JSON.parse(versionMarker(` ${SHA.toUpperCase()}\n`))).toEqual({ sha: SHA });
  });

  it("refuses anything that is not a full commit SHA", () => {
    for (const bad of ["", "7152ef06", `${SHA}0`, "not-a-sha-not-a-sha-not-a-sha-not-a-sha!"]) {
      expect(() => versionMarker(bad), bad).toThrow(/not a full 40-character commit SHA/);
    }
  });

  it("is served at /app/version.json (the file name inside the /app/ build)", () => {
    expect(VERSION_FILE).toBe("version.json");
  });
});

describe("writeVersion — where the SHA comes from", () => {
  it("Vercel's VERCEL_GIT_COMMIT_SHA wins over the checkout's HEAD", () => {
    expect(resolveCommitSha({ VERCEL_GIT_COMMIT_SHA: SHA }, () => "f".repeat(40))).toBe(SHA);
  });

  it("without it, the checkout's `git rev-parse HEAD`", () => {
    expect(resolveCommitSha({}, () => `${SHA}\n`)).toBe(SHA);
    expect(resolveCommitSha({ VERCEL_GIT_COMMIT_SHA: "  " }, () => SHA)).toBe(SHA);
  });

  it("★ with neither, the build FAILS rather than publish a marker it cannot back", () => {
    expect(() => resolveCommitSha({}, () => null)).toThrow(/no commit SHA/);
  });
});

describe("writeVersion — wired into every build", () => {
  it("`pnpm run build` runs writeVersion.ts after vite build", () => {
    const pkg = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };
    const steps = pkg.scripts.build.split("&&").map((step) => step.trim());
    const vite = steps.indexOf("vite build");
    const version = steps.indexOf("tsx scripts/seo/writeVersion.ts");
    expect(vite).toBeGreaterThanOrEqual(0);
    expect(version).toBeGreaterThan(vite);
  });
});
