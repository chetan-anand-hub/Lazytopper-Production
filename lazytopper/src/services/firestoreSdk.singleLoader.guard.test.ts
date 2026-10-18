// PERF-3 re-review MUST-FIX A — ONE SDK LOADER. `services/firestoreSdk.ts` is the only file in
// lazytopper/src that may LOAD `firebase/firestore`. Any other value import of it — a static
// `import { … } from "firebase/firestore"` or a dynamic `import("firebase/firestore")` — either
// puts the whole SDK back in the entry chunk (static) or, after the facade has recovered from a
// failed chunk through `?retry=<n>`, reaches a DIFFERENT module than the facade's: Chromium
// replays the cached failure, Firefox evaluates a second SDK instance whose functions reject the
// facade's refs. Either way a feature silently stops syncing for the tab.
//
// Type-only imports (`import type …`, `typeof import("firebase/firestore")`) load nothing and are
// allowed. The scanner is PURE and driven by fixtures below, so its blind spots are shown, not
// assumed (a matcher nobody proved can fire is not a guard).
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const SRC = path.resolve(__dirname, "..");
const ALLOWED = new Set([path.join(SRC, "services", "firestoreSdk.ts")]);
/** Test-only support code (vitest setupFiles: the facade stand-in imports the suite's SDK MOCK).
 *  It never ships; everything else under src/ is product code and is scanned. */
const TEST_SUPPORT_DIR = path.join(SRC, "test");
const SDK = String.raw`["']firebase\/firestore["']`;

/** Every place `text` LOADS the Firestore SDK (type-only forms excluded). */
export function sdkLoadsIn(text: string): string[] {
  const found: string[] = [];
  // Comments cannot load anything; strip them first (block, then line comments).
  const code = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
  // Static value import / re-export: `import x from`, `import { a } from`, `import * as`,
  // `import "…"`, `export { … } from`, `export * from` — but not `import type` / `export type`.
  const staticRe = new RegExp(String.raw`(^|[;\n])\s*(import|export)\s+(?!type\b)(?:[^;]*?\bfrom\s*)?` + SDK, "g");
  for (const m of code.matchAll(staticRe)) found.push(`static ${m[2]}: ${m[0].trim().slice(0, 80)}`);
  // Dynamic import — but not the type query `typeof import("firebase/firestore")`.
  const dynamicRe = new RegExp(String.raw`(typeof\s+)?\bimport\s*\(\s*` + SDK + String.raw`\s*\)`, "g");
  for (const m of code.matchAll(dynamicRe)) if (!m[1]) found.push(`dynamic: ${m[0]}`);
  return found;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry !== "node_modules" && full !== TEST_SUPPORT_DIR) walk(full, out);
    } else if (/\.(ts|tsx|js|jsx|mjs)$/.test(entry) && !/\.test\.|\.spec\./.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe("PERF-3: one Firestore SDK loader (services/firestoreSdk.ts)", () => {
  it("no non-test file under src/ other than firestoreSdk.ts loads firebase/firestore", () => {
    const offenders = walk(SRC)
      .filter((f) => !ALLOWED.has(f))
      .flatMap((f) => sdkLoadsIn(readFileSync(f, "utf8")).map((hit) => `${path.relative(SRC, f)}: ${hit}`));
    expect(offenders).toEqual([]);
  });

  it("CONTROL: the walk really covers product code (it reaches the 18 migrated Firestore modules)", () => {
    const files = walk(SRC).map((f) => path.relative(SRC, f).replace(/\\/g, "/"));
    for (const f of ["services/sessionRecords.ts", "services/adaptivePracticeEngine.ts", "components/papers/paperDownloadRecord.ts"]) {
      expect(files).toContain(f);
    }
    expect(files.some((f) => f.startsWith("test/"))).toBe(false);
  });

  it("CONTROL: firestoreSdk.ts itself IS a loader (the scanner sees the real import)", () => {
    expect(sdkLoadsIn(readFileSync(path.join(SRC, "services", "firestoreSdk.ts"), "utf8")).length).toBeGreaterThan(0);
  });

  it("★ catches every value-import form (fixtures)", () => {
    for (const src of [
      `import { doc, setDoc } from "firebase/firestore";`,
      `import {\n  collection,\n  getDocs,\n} from "firebase/firestore";`,
      `import * as fs from 'firebase/firestore';`,
      `import "firebase/firestore";`,
      `export { doc } from "firebase/firestore";`,
      `export * from "firebase/firestore";`,
      `const { setDoc } = await import("firebase/firestore");`,
      `const fs = await import( "firebase/firestore" );`,
      `x(); import { a, type B } from "firebase/firestore";`,
    ]) {
      expect(sdkLoadsIn(src), src).not.toEqual([]);
    }
  });

  it("★★ REJECTS the forms that load nothing (fixtures)", () => {
    for (const src of [
      `import type { Firestore } from "firebase/firestore";`,
      `import type {\n  QueryConstraint,\n} from "firebase/firestore";`,
      `export type FirestoreSdk = typeof import("firebase/firestore");`,
      `// const { setDoc } = await import("firebase/firestore");`,
      `/* import { doc } from "firebase/firestore"; */`,
      `import { doc } from "firebase/firestore-lite-wrapper";`,
      `const s = "see https://firebase.google.com/docs";`,
    ]) {
      expect(sdkLoadsIn(src), src).toEqual([]);
    }
  });
});
