import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Pins the two properties of the analytics script tag that fail SILENTLY if someone
 * "tidies" them away. Reads index.html from disk, the same way
 * src/config/head.guard.test.ts pins the canonical tags.
 *
 * ⚠ Neither property is cosmetic. Without `data-disable-auto-track`, the vendor script
 * sends a page view from `window.location` before any app code runs — double-counting
 * every first view and, on `/u/<token>`, transmitting a live capability token. Without
 * `beforeSend`, the `url` the vendor stamps on its own events carries that same token,
 * which redacting our `path` argument does not touch.
 */
const html = readFileSync(resolve(__dirname, "../../index.html"), "utf-8");

describe("index.html — the analytics script tag", () => {
  it("loads the first-party Vercel script, deferred", () => {
    expect(html).toContain('src="/_vercel/insights/script.js"');
    expect(html).toMatch(/<script defer src="\/_vercel\/insights\/script\.js"/);
  });

  it("★ disables the vendor's own auto-tracking", () => {
    expect(html).toContain('data-disable-auto-track="1"');
  });

  it("★ registers a beforeSend that redacts the QR capability token", () => {
    expect(html).toContain('window.va("beforeSend"');
    expect(html).toContain('"/u/:token"');
  });

  it("★ CONTROL — the redaction in this file actually redacts, and only what it should", () => {
    // Extract the live regex + replacement from the file itself rather than restating
    // it here: a copy in the test would pass forever after the real one was edited.
    const match = html.match(/event\.url = url\.replace\((\/.*?\/), "(.*?)"\)/);
    expect(match).not.toBeNull();
    const [, pattern, replacement] = match!;
    const body = pattern.slice(1, pattern.lastIndexOf("/"));
    const redact = (u: string) => u.split("?")[0].split("#")[0].replace(new RegExp(body), replacement);

    const token = "b".repeat(64);
    expect(redact(`https://www.lazytopper.com/u/${token}`)).toBe(
      "https://www.lazytopper.com/u/:token",
    );
    expect(redact(`https://www.lazytopper.com/u/${token}`)).not.toContain(token);
    expect(redact("https://www.lazytopper.com/login?oobCode=SECRET")).toBe(
      "https://www.lazytopper.com/login",
    );
    // …and leaves ordinary content alone, or it would answer nothing while looking safe.
    expect(redact("https://www.lazytopper.com/app/notes/electricity")).toBe(
      "https://www.lazytopper.com/app/notes/electricity",
    );
  });
});
