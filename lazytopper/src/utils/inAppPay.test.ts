import { afterEach, describe, expect, it, vi } from "vitest";
import { currentInAppPay, inAppChromeIntent, inAppPayApp, inAppPayPlatform, inAppRescueUrl } from "./inAppPay";

const UA = {
  instagramAndroid:
    "Mozilla/5.0 (Linux; Android 13; SM-S911B Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/118.0.0.0 Mobile Safari/537.36 Instagram 309.1.0.41.113 Android (33/13; 480dpi; 1080x2340; samsung; SM-S911B; dm1q; qcom; en_IN; 541635897)",
  instagramIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21A329 Instagram 309.0.0.28.114 (iPhone14,5; iOS 17_0; en_IN; en; scale=3.00; 1170x2532; 541635897)",
  facebookAndroid:
    "Mozilla/5.0 (Linux; Android 12; Redmi Note 10 Build/SKQ1.210908.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/117.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/440.0.0.37.113;]",
  facebookIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/20G75 [FBAN/FBIOS;FBAV/430.0.0.38.109;FBBV/537205765;FBDV/iPhone13,2;FBMD/iPhone;FBSN/iOS;FBSV/16.6;FBSS/3;FBID/phone;FBLC/en_US;FBOP/5]",
  chromeAndroid: "Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36",
  samsungInternet:
    "Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36",
  safariIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  desktop: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
};

afterEach(() => vi.unstubAllEnvs());

describe("INAPP-PAY-1 detection", () => {
  it("names the in-app browsers", () => {
    expect(inAppPayApp(UA.instagramAndroid)).toBe("instagram");
    expect(inAppPayApp(UA.instagramIos)).toBe("instagram");
    expect(inAppPayApp(UA.facebookAndroid)).toBe("facebook");
    expect(inAppPayApp(UA.facebookIos)).toBe("facebook");
  });
  it("is null for real browsers and empty input", () => {
    for (const ua of [UA.chromeAndroid, UA.samsungInternet, UA.safariIos, UA.desktop, "", null, undefined]) {
      expect(inAppPayApp(ua)).toBeNull();
    }
  });
  it("platform", () => {
    expect(inAppPayPlatform(UA.instagramAndroid)).toBe("android");
    expect(inAppPayPlatform(UA.facebookIos)).toBe("ios");
    expect(inAppPayPlatform(UA.desktop)).toBe("other");
  });
  it("kill switch VITE_INAPP_PAY_DISABLED=1 reports not in-app", () => {
    vi.stubEnv("VITE_INAPP_PAY_DISABLED", "1");
    expect(inAppPayApp(UA.instagramAndroid)).toBeNull();
  });
  it("currentInAppPay reads navigator.userAgent", () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(UA.instagramAndroid);
    expect(currentInAppPay()).toEqual({ app: "instagram", platform: "android" });
    vi.restoreAllMocks();
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(UA.chromeAndroid);
    expect(currentInAppPay()).toBeNull();
    vi.restoreAllMocks();
  });
});

describe("INAPP-PAY-1 rescue URL", () => {
  const page = "https://www.lazytopper.com/packs?utm_source=facebook&utm_campaign=c1&fbclid=AbC123";
  it("sets ?buy= for a pack and keeps utm / fbclid", () => {
    const u = new URL(inAppRescueUrl(page, { kind: "pack", sku: "pack_chapter", target: "ch-1" })!);
    expect(u.searchParams.get("buy")).toBe("pack_chapter");
    expect(u.searchParams.get("t")).toBe("ch-1");
    expect(u.searchParams.get("utm_source")).toBe("facebook");
    expect(u.searchParams.get("fbclid")).toBe("AbC123");
  });
  it("Board Pass uses buy=board_pass and replaces an old buy/t (never duplicated)", () => {
    const u = new URL(inAppRescueUrl("https://www.lazytopper.com/pricing?buy=pack_mock&t=x&gclid=1", { kind: "pass" })!);
    expect(u.searchParams.getAll("buy")).toEqual(["board_pass"]);
    expect(u.searchParams.has("t")).toBe(false);
    expect(u.searchParams.get("gclid")).toBe("1");
  });
  it("intent keeps host+path+query and encodes the https fallback", () => {
    const intent = inAppChromeIntent(page, { kind: "pack", sku: "pack_bundle" })!;
    expect(intent.startsWith("intent://www.lazytopper.com/packs?")).toBe(true);
    expect(intent).toContain("buy=pack_bundle");
    expect(intent).toContain("utm_source=facebook");
    expect(intent).toContain("fbclid=AbC123");
    expect(intent).toContain("#Intent;scheme=https;package=com.android.chrome;");
    const fb = /S\.browser_fallback_url=([^;]+);end$/.exec(intent)![1];
    expect(fb).not.toMatch(/[?&=:/]/);
    expect(decodeURIComponent(fb)).toBe(inAppRescueUrl(page, { kind: "pack", sku: "pack_bundle" }));
  });
  it("rejects non-http(s)", () => {
    expect(inAppRescueUrl("javascript:alert(1)")).toBeNull();
    expect(inAppChromeIntent("not a url")).toBeNull();
  });
});
