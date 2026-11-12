/** PAID-SHEET-1 CSS guard: the My packs paper rows are never squeezed into half a column or broken mid-word. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(__dirname, "myPacksBridge.css"), "utf8");
const rule = (selector: string): string => {
  const at = css.indexOf(`${selector} {`);
  expect(at, `${selector} rule exists`).toBeGreaterThan(-1);
  return css.slice(at, css.indexOf("}", at));
};

describe("myPacksBridge.css - paper rows", () => {
  it("the inline variant is ONE column (the Board Pass card is rendered outside it)", () => {
    expect(rule(".lt-packs .lt-pb.lt-pb--inline")).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  });
  it("rows fill the width they are given (auto-fill, 260px), not a fixed two columns", () => {
    expect(css).toMatch(/\.lt-pb__rows \{ display: grid; grid-template-columns: repeat\(auto-fill, minmax\(260px, 1fr\)\)/);
  });
  it("label and code never break mid-word; Download never shrinks below its text", () => {
    expect(rule(".lt-packs .lt-pb__rlabel")).not.toMatch(/overflow-wrap:\s*anywhere/);
    expect(rule(".lt-packs .lt-pb__rcode")).not.toMatch(/overflow-wrap:\s*anywhere/);
    expect(rule(".lt-packs .lt-pb__rlabel")).toMatch(/overflow-wrap:\s*break-word/);
    expect(css).toMatch(/button\.lt-pb__go \{[^}]*flex: 0 0 auto;[^}]*min-width: max-content/);
  });
});
