import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { writeFbcCookieOnce } from "./metaClickId";

const originalLocation = window.location;
function setLocation(url: string): void {
  const u = new URL(url);
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: { href: u.href, origin: u.origin, hostname: u.hostname, pathname: u.pathname, search: u.search, hash: u.hash },
  });
}
function clearCookies(): void {
  for (const c of document.cookie.split(";")) {
    const name = c.split("=")[0].trim();
    if (name) document.cookie = `${name}=; max-age=0; path=/`;
  }
}

describe("META-ATTRIB-1 _fbc cookie", () => {
  beforeEach(clearCookies);
  afterEach(() => {
    Object.defineProperty(window, "location", { configurable: true, writable: true, value: originalLocation });
    clearCookies();
  });

  it("writes fb.1.<ms>.<fbclid> from ?fbclid= when no _fbc exists", () => {
    setLocation("http://localhost/welcome?utm_source=meta&fbclid=IwAR_abc-123");
    const before = Date.now();
    writeFbcCookieOnce();
    const m = /(?:^|;\s*)_fbc=fb\.1\.(\d+)\.IwAR_abc-123/.exec(document.cookie);
    expect(m).not.toBeNull();
    expect(Number(m![1])).toBeGreaterThanOrEqual(before);
  });

  it("never overwrites an existing _fbc", () => {
    document.cookie = "_fbc=fb.1.111.original; path=/";
    setLocation("http://localhost/welcome?fbclid=other");
    writeFbcCookieOnce();
    expect(document.cookie).toContain("_fbc=fb.1.111.original");
    expect(document.cookie).not.toContain("other");
  });

  it("writes nothing without an fbclid, or with a malformed one", () => {
    setLocation("http://localhost/welcome?utm_source=meta");
    writeFbcCookieOnce();
    setLocation("http://localhost/welcome?fbclid=a%20b;evil");
    writeFbcCookieOnce();
    expect(document.cookie).not.toContain("_fbc");
  });

  it("sets Secure, SameSite=Lax, path=/, 90 days and the .lazytopper.com domain on that host", () => {
    const sets: string[] = [];
    const desc = Object.getOwnPropertyDescriptor(Document.prototype, "cookie")!;
    Object.defineProperty(document, "cookie", { configurable: true, get: () => "", set: (v: string) => void sets.push(v) });
    try {
      setLocation("https://www.lazytopper.com/welcome?fbclid=abc");
      writeFbcCookieOnce();
      setLocation("https://preview.example.dev/welcome?fbclid=abc");
      writeFbcCookieOnce();
    } finally {
      delete (document as unknown as Record<string, unknown>).cookie;
      Object.defineProperty(Document.prototype, "cookie", desc);
    }
    expect(sets[0]).toMatch(/^_fbc=fb\.1\.\d+\.abc; path=\/; max-age=7776000; SameSite=Lax; Secure; domain=\.lazytopper\.com$/);
    expect(sets[1]).not.toContain("domain=");
  });
});
