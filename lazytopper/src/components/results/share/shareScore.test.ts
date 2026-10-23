import { describe, it, expect, vi } from "vitest";
import { shareFilename, openWhatsAppLink, pickShareMethod, shareNative, type ShareNavigator } from "./shareScore";

const SHARE_FILENAME = shareFilename("story");

/** SHARE-SCORE-1 - native OS sheet when the browser can share FILES, else download + wa.me. */
const png = () => new File([new Uint8Array([137, 80, 78, 71])], SHARE_FILENAME, { type: "image/png" });

describe("pickShareMethod", () => {
  it("native when navigator.canShare({files}) is true and share exists", () => {
    const nav: ShareNavigator = { canShare: vi.fn(() => true), share: vi.fn(async () => {}) };
    expect(pickShareMethod(nav, png())).toBe("native");
    expect(nav.canShare).toHaveBeenCalledWith({ files: [expect.any(File)] });
  });
  it("whatsapp_link when canShare says no to files (desktop Chrome)", () => {
    expect(pickShareMethod({ canShare: () => false, share: async () => {} }, png())).toBe("whatsapp_link");
  });
  it("whatsapp_link when there is no canShare / no share / no navigator", () => {
    expect(pickShareMethod({ share: async () => {} }, png())).toBe("whatsapp_link");
    expect(pickShareMethod({ canShare: () => true }, png())).toBe("whatsapp_link");
    expect(pickShareMethod(undefined, png())).toBe("whatsapp_link");
  });
  it("whatsapp_link when canShare throws", () => {
    expect(
      pickShareMethod({ canShare: () => { throw new TypeError("no"); }, share: async () => {} }, png()),
    ).toBe("whatsapp_link");
  });
});

describe("shareNative", () => {
  it("shares the PNG file with the text", async () => {
    const share = vi.fn(async () => {});
    await expect(shareNative({ share }, png(), "hello")).resolves.toBe("shared");
    expect(share).toHaveBeenCalledWith({ files: [expect.any(File)], text: "hello" });
  });
  it("a dismissed sheet is a cancel, not an error", async () => {
    const share = vi.fn(async () => { throw new DOMException("x", "AbortError"); });
    await expect(shareNative({ share }, png(), "t")).resolves.toBe("cancelled");
  });
  it("lost user activation asks for one more tap", async () => {
    const share = vi.fn(async () => { throw new DOMException("x", "NotAllowedError"); });
    await expect(shareNative({ share }, png(), "t")).resolves.toBe("needs-tap");
  });
  it("any other failure is reported as failed", async () => {
    const share = vi.fn(async () => { throw new Error("boom"); });
    await expect(shareNative({ share }, png(), "t")).resolves.toBe("failed");
  });
});

describe("openWhatsAppLink", () => {
  it("opens wa.me with the encoded text in a new tab, cuts the opener, reports true", () => {
    const win = { opener: {} as unknown };
    const open = vi.fn(() => win);
    expect(openWhatsAppLink("I scored 3/5 in Light & Optics", open)).toBe(true);
    expect(open).toHaveBeenCalledWith(`https://wa.me/?text=${encodeURIComponent("I scored 3/5 in Light & Optics")}`, "_blank");
    expect(win.opener).toBeNull();
  });
  it("a blocked popup (null) or a throwing open reports false", () => {
    expect(openWhatsAppLink("t", () => null)).toBe(false);
    expect(openWhatsAppLink("t", () => { throw new Error("blocked"); })).toBe(false);
  });
});
