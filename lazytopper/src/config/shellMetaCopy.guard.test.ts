/**
 * COPY-START-FREE-1 - the shell's link-preview copy (og:description / twitter:description, which /check-improve and every
 * non-prerendered route share) must never say "Start free." for the product: it is a 7-day free trial.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const html = readFileSync(path.join(process.cwd(), "index.html"), "utf8");
const content = (tag: string): string => {
  const m = html.match(new RegExp(`${tag}"\\s+content="([^"]*)"`));
  return m?.[1] ?? "";
};

describe("COPY-START-FREE-1 - shell link-preview copy", () => {
  it.each(['property="og:description', 'name="twitter:description'])("%s ends with the 7-day free trial line, not 'Start free.'", (attr) => {
    const c = content(attr);
    expect(c.length).toBeGreaterThan(0);
    expect(c.endsWith("Start your 7-day free trial.")).toBe(true);
    expect(c).not.toMatch(/Start free\./);
  });
});
