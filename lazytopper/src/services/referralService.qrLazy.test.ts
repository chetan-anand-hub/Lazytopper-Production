// PERF-2 PR-B2 — `qrcode` (~10 KB gz) is drawn on demand, not shipped in the entry chunk.
//   (a) referralService has no STATIC import of qrcode (a static one would put it back in the entry
//       graph: main.tsx -> App.tsx -> referralService);
//   (b) generateQRDataUrl still returns a real PNG data URL, by the dynamic import;
//   (c) CONTROL: the detector in (a) fires on a file that does import it statically.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const staticQrcodeImport = (src: string): boolean => /^import\s[^;]*from\s+["']qrcode["']/m.test(src);

describe("referralService: qrcode on demand", () => {
  it("(a) no static qrcode import; one dynamic import", () => {
    const src = readFileSync(resolve(__dirname, "referralService.ts"), "utf8");
    expect(staticQrcodeImport(src)).toBe(false);
    expect(src).toContain('await import("qrcode")');
  });

  it("(b) generateQRDataUrl returns a PNG data URL", async () => {
    const { generateQRDataUrl } = await import("./referralService");
    const url = await generateQRDataUrl("https://www.lazytopper.com/check-improve", 120);
    expect(url).toMatch(/^data:image\/png;base64,/);
    expect(url.length).toBeGreaterThan(200);
  });

  it("(c) CONTROL: the detector fires on a static import", () => {
    expect(staticQrcodeImport('import QRCode from "qrcode";\nexport const x = 1;')).toBe(true);
    expect(staticQrcodeImport('const q = (await import("qrcode")).default;')).toBe(false);
  });
});
