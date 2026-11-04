/**
 * PAY-ACCOUNT-1 item 6 - every Pay / Buy (the Board Pass and every pack) opens the SAME "Who will use it?" sheet, so the
 * pay-first account flow is one flow everywhere. A source-level guard: both hosts lazy-load the ONE CheckoutSheet module,
 * PassCheckout's Board Pass Pay opens it, and every PacksShop buy path (signed-out tap, signed-in tap, the one-tap entry
 * from a landing / sample link) sets the same `who` state that mounts it. A second sheet or a buy path that bypasses it
 * turns this red.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = resolve(__dirname, "../..");
const read = (rel: string) => readFileSync(join(SRC, rel), "utf8");
const SHEET_IMPORT = /lazy\(\(\) => import\("\.\.\/checkoutWho\/CheckoutSheet"\)\)/;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

describe("one sheet behind every Pay / Buy", () => {
  it("PassCheckout and PacksShop lazy-load the SAME CheckoutSheet module", () => {
    expect(read("components/pricing/PassCheckout.tsx")).toMatch(SHEET_IMPORT);
    expect(read("components/packs/PacksShop.tsx")).toMatch(SHEET_IMPORT);
    // PARENTS-PAY-1: the /for-parents host lazy-loads the same module too.
    expect(read("components/parents/ParentBoardPassSheet.tsx")).toMatch(SHEET_IMPORT);
  });

  it("PassCheckout: the Board Pass Pay opens the sheet before any checkout", () => {
    const src = read("components/pricing/PassCheckout.tsx");
    expect(src).toMatch(/if \(who && passType === "till_boards" && !opts\.fromWho\) \{\s*setWhoOpen\(true\);\s*return;/);
    expect(src).toMatch(/\{who && whoOpen && \(/);
  });

  it("PacksShop: the signed-out tap, the signed-in tap and the one-tap entry all set the sheet's state", () => {
    const src = read("components/packs/PacksShop.tsx");
    expect(src).toMatch(/if \(whoEnabled\) \{\s*setWho\(\{ sku, target \}\);\s*return;/);
    expect(src).toMatch(/if \(whoEnabled && !opts\.fromWho\) \{\s*setWho\(/);
    expect(src).toMatch(/if \(whoEnabled\) setWho\(\{ sku: want\.sku, target: want\.target \}\);/);
    expect(src).toMatch(/<CheckoutSheet/);
  });

  it("no other module mounts a CheckoutSheet (one sheet, not two)", () => {
    const hosts = walk(SRC)
      .filter((f) => !f.includes(`${join("components", "checkoutWho")}`))
      .filter((f) => /<CheckoutSheet\b/.test(readFileSync(f, "utf8")))
      .map((f) => f.slice(SRC.length + 1).split("\\").join("/"))
      .sort();
    // PARENTS-PAY-1: /for-parents mounts the SAME sheet for the Board Pass (audience="parent"); still one sheet component, three hosts.
    expect(hosts).toEqual(["components/packs/PacksShop.tsx", "components/parents/ParentBoardPassSheet.tsx", "components/pricing/PassCheckout.tsx"]);
  });
});
