// UI-E2E-2 (5a) — THE EMULATOR SWITCH IS SET IN ONE FILE ONLY.
//
// services/firebaseClient.ts and services/firestoreSdk.ts connect Firebase Auth and Firestore to
// the LOCAL emulator when the build-time flag is "1". It exists for the signed-in real-browser
// suite and nothing else, so exactly one tracked file may set it:
// lazytopper/tests/e2e/buildEnv.signedIn.json. Any other file that assigns it — an .env file, a
// workflow, vite `define`, a script, Phase 1's buildEnv.json — fails here, by name. (It must never
// be set in Vercel or Railway either; that is outside the repo, so the build itself refuses:
// scripts/ops/e2e_emulator_absent.mjs, the last step of `pnpm run build`.)
//
// Markdown is not scanned: prose cannot set an environment variable. The scanner is PURE and
// proven on fixtures below (a matcher nobody proved can fire is not a guard).
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

// Built from parts so this file's own text is not a hit.
const FLAG = ["VITE", "E2E", "FIREBASE", "EMULATOR"].join("_");
const REPO = path.resolve(__dirname, "..", "..", "..");
const ALLOWED_SETTER = "lazytopper/tests/e2e/buildEnv.signedIn.json";
const PRODUCT_READERS = ["lazytopper/src/services/firebaseClient.ts", "lazytopper/src/services/firestoreSdk.ts"];

/** An ASSIGNMENT of the flag in any syntax a repo file could use: KEY=, KEY:, "KEY":, ['KEY'] =, export KEY=. Not ===/==. */
export function setsFlag(text: string, flag = FLAG): boolean {
  const re = new RegExp(`${flag}["'\\]]*\\s*(?::|=(?!=))`);
  return text.split(/\r?\n/).some((line) => re.test(line));
}

function trackedFiles(): string[] {
  const out = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { cwd: REPO, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return out.split("\0").filter(Boolean);
}

const TEXT_EXT = /\.(?:[cm]?[jt]sx?|json|ya?ml|toml|sh|ps1|env|cfg|ini|html)$|(?:^|\/)\.env[^/]*$|(?:^|\/)Dockerfile[^/]*$|(?:^|\/)Procfile$/;

describe("UI-E2E-2 — the emulator flag's setter scanner (fixtures)", () => {
  it.each([
    [`${FLAG}=1`],
    [`export ${FLAG}=1`],
    [`  ${FLAG}: "1"`],
    [`"${FLAG}": "1",`],
    [`process.env["${FLAG}"] = "1";`],
    [`define: { "import.meta.env.${FLAG}": '"1"' }`],
  ])("flags an assignment: %s", (line) => {
    expect(setsFlag(line)).toBe(true);
  });

  it.each([
    [`if (import.meta.env.${FLAG} === "1") {`],
    [`const on = env.${FLAG} == "1";`],
    [`// the flag ${FLAG} is read here`],
  ])("does not flag a read: %s", (line) => {
    expect(setsFlag(line)).toBe(false);
  });
});

describe("UI-E2E-2 — the emulator flag in the repo", () => {
  const files = trackedFiles();

  it("the scan sees the repo (vacuity control)", () => {
    expect(files).toContain(ALLOWED_SETTER);
    expect(files).toContain("lazytopper/tests/e2e/buildEnv.json");
    expect(files.filter((f) => TEXT_EXT.test(f)).length).toBeGreaterThan(1000);
  });

  it(`no tracked file except ${ALLOWED_SETTER} sets it`, () => {
    const setters = files
      .filter((f) => TEXT_EXT.test(f) && f !== ALLOWED_SETTER)
      .filter((f) => {
        let text: string;
        try {
          text = readFileSync(path.join(REPO, f), "utf8");
        } catch {
          return false; // deleted in the working tree
        }
        return text.includes(FLAG) && setsFlag(text);
      });
    expect(setters).toEqual([]);
  });

  it("buildEnv.signedIn.json is buildEnv.json plus the flag, nothing else", () => {
    const read = (f: string) => JSON.parse(readFileSync(path.join(REPO, f), "utf8")) as { env: Record<string, string> };
    const phase1 = read("lazytopper/tests/e2e/buildEnv.json").env;
    const signedIn = read(ALLOWED_SETTER).env;
    expect(phase1[FLAG]).toBeUndefined();
    expect(signedIn).toEqual({ ...phase1, [FLAG]: "1" });
  });

  it("the product code only ever compares it to \"1\" on import.meta.env (so a normal build drops the block)", () => {
    for (const f of PRODUCT_READERS) {
      const lines = readFileSync(path.join(REPO, f), "utf8").split(/\r?\n/).filter((l) => l.includes(FLAG));
      expect(lines, f).toHaveLength(1);
      expect(lines[0].trim(), f).toBe(`if (import.meta.env.${FLAG} === "1") {`);
    }
  });
});
