// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, relative, sep } from "node:path";

import { MAX_BATCH_UPLOADS } from "./gradingLimits";

/**
 * GUARD — TYPED-1's exported batch cap.
 *
 * It pins TWO properties, and neither is provable by reading `gradingLimits.ts`:
 *
 *  1. ★★ THE NUMBER DOES NOT DRIFT FROM THE SERVER. The cap is now written in two
 *     places — `server/routes/checkSolution.cjs` (which ENFORCES it) and
 *     `src/config/gradingLimits.ts` (which merely TELLS the UI). Two copies of one
 *     number is a drift hazard, and a client promising a cap the server does not
 *     honour is worse than no client cap at all. This reads the server file and
 *     fails on disagreement. THE SERVER IS THE AUTHORITY.
 *
 *  2. ★★ THE HOME IS SAFE. The cap deliberately does NOT live in `src/ai/aiClient.ts`
 *     — three suites `vi.mock` that module with a partial factory, so a VALUE export
 *     there resolves to `undefined` under them. This asserts nothing mocks
 *     `src/config/`, WITH A CONTROL proving the same scan does find the aiClient
 *     mocks. A scan that finds nothing because it cannot see is indistinguishable
 *     from one that finds nothing because there is nothing.
 */

const ROOT = process.cwd(); // lazytopper/
const SRC_ROOT = resolve(ROOT, "src");
const SERVER_ROUTE = resolve(ROOT, "server", "routes", "checkSolution.cjs");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "dist") continue;
    const abs = join(dir, entry);
    if (statSync(abs).isDirectory()) out.push(...walk(abs));
    else if (/\.(ts|tsx)$/.test(abs)) out.push(abs);
  }
  return out;
}

const rel = (abs: string) => relative(ROOT, abs).split(sep).join("/");

describe("gradingLimits — the exported batch cap", () => {
  it("★★ matches the server's MAX_BATCH_UPLOADS exactly — the server is the authority", () => {
    const src = readFileSync(SERVER_ROUTE, "utf8");
    const m = src.match(/const\s+MAX_BATCH_UPLOADS\s*=\s*(\d+)\s*;/);
    expect(
      m,
      "server/routes/checkSolution.cjs no longer declares `const MAX_BATCH_UPLOADS = <n>;` — " +
        "the client cap has lost the thing it mirrors, so fix this guard rather than deleting it",
    ).toBeTruthy();
    expect(Number(m![1])).toBe(MAX_BATCH_UPLOADS);
  });

  it("★ the server's refusal MESSAGE is built FROM the constant, so it cannot say a different number", () => {
    // If the 400 text ever hard-codes "12" instead of interpolating the constant,
    // the two could disagree while this file's first assertion still passed.
    const src = readFileSync(SERVER_ROUTE, "utf8");
    expect(src).toMatch(/Too many answer photos in one grade — send at most ' \+ MAX_BATCH_UPLOADS/);
    expect(src).toMatch(/uploads\.length > MAX_BATCH_UPLOADS/);
  });

  it("★ is a positive integer — a client hint the UI can actually count against", () => {
    expect(Number.isInteger(MAX_BATCH_UPLOADS)).toBe(true);
    expect(MAX_BATCH_UPLOADS).toBeGreaterThan(0);
  });

  it("★★ NOTHING vi.mocks src/config — which is the whole reason the cap lives here", () => {
    const offenders: string[] = [];
    const aiClientMockers: string[] = [];
    for (const abs of walk(SRC_ROOT)) {
      const text = readFileSync(abs, "utf8");
      for (const call of text.match(/vi\.mock\(\s*["'][^"']+["']/g) || []) {
        const target = call.replace(/^vi\.mock\(\s*["']/, "");
        if (/(^|\/)config\//.test(target) || /gradingLimits/.test(target)) offenders.push(`${rel(abs)} → ${target}`);
        if (/aiClient/.test(target)) aiClientMockers.push(`${rel(abs)} → ${target}`);
      }
    }
    // ★ CONTROL FIRST. The same scan, the same regex, over the same tree MUST find
    // the aiClient mocks. Without this, a zero above proves only that the matcher
    // is dead — the exact silent no-op this project keeps paying for.
    expect(
      aiClientMockers.length,
      "the scan found NO vi.mock of aiClient — the matcher is broken, so the zero below means nothing",
    ).toBeGreaterThan(0);
    expect(offenders, `something now mocks src/config: ${offenders.join(", ")}`).toEqual([]);
  });
});
