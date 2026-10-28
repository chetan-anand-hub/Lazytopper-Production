import { describe, it, expect } from "vitest";
import { inAppBrowser } from "./inAppBrowser";
import { chromeIntentUrl, isAndroidUserAgent, isIosUserAgent } from "./inAppBrowserLinks";

const UA = {
  instagramAndroid:
    "Mozilla/5.0 (Linux; Android 13; SM-S911B Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/118.0.0.0 Mobile Safari/537.36 Instagram 309.1.0.41.113 Android (33/13; 480dpi; 1080x2340; samsung; SM-S911B; dm1q; qcom; en_IN; 541635897)",
  instagramIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21A329 Instagram 309.0.0.28.114 (iPhone14,5; iOS 17_0; en_IN; en; scale=3.00; 1170x2532; 541635897)",
  facebookAndroid:
    "Mozilla/5.0 (Linux; Android 12; Redmi Note 10 Build/SKQ1.210908.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/117.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/440.0.0.37.113;]",
  facebookIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/20G75 [FBAN/FBIOS;FBAV/430.0.0.38.109;FBBV/537205765;FBDV/iPhone13,2;FBMD/iPhone;FBSN/iOS;FBSV/16.6;FBSS/3;FBID/phone;FBLC/en_US;FBOP/5]",
  messenger:
    "Mozilla/5.0 (Linux; Android 11; moto g(9) plus Build/RPXS31.Q4U.89.29; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/116.0.0.0 Mobile Safari/537.36 [FB_IAB/MESSENGER;FBAV/430.0.0.20.117;]",
  linkedin:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 LinkedInApp/9.30.1234",
  snapchat:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Snapchat/12.50.0.40 (like Safari/8617.1.17.10.9, panda)",
  line: "Mozilla/5.0 (Linux; Android 13; Pixel 7 Build/TQ3A.230901.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/118.0.0.0 Mobile Safari/537.36 Line/13.18.0 LIFF",
  androidWebview:
    "Mozilla/5.0 (Linux; Android 10; SM-A515F Build/QP1A.190711.020; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/110.0.0.0 Mobile Safari/537.36",
  chromeAndroid:
    "Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36",
  safariIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  desktopChrome:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
};

describe("inAppBrowser", () => {
  it("recognises Instagram on Android and iOS", () => {
    expect(inAppBrowser(UA.instagramAndroid)).toBe("instagram");
    expect(inAppBrowser(UA.instagramIos)).toBe("instagram");
  });
  it("recognises Facebook and Messenger", () => {
    expect(inAppBrowser(UA.facebookAndroid)).toBe("facebook");
    expect(inAppBrowser(UA.facebookIos)).toBe("facebook");
    expect(inAppBrowser(UA.messenger)).toBe("facebook");
  });
  it("recognises LinkedIn, Snapchat, Line and a bare Android WebView", () => {
    expect(inAppBrowser(UA.linkedin)).toBe("other-webview");
    expect(inAppBrowser(UA.snapchat)).toBe("other-webview");
    expect(inAppBrowser(UA.line)).toBe("other-webview");
    expect(inAppBrowser(UA.androidWebview)).toBe("other-webview");
  });
  it("leaves real browsers alone", () => {
    expect(inAppBrowser(UA.chromeAndroid)).toBeNull();
    expect(inAppBrowser(UA.safariIos)).toBeNull();
    expect(inAppBrowser(UA.desktopChrome)).toBeNull();
  });
  it("is null for empty or missing input", () => {
    expect(inAppBrowser("")).toBeNull();
    expect(inAppBrowser(undefined)).toBeNull();
    expect(inAppBrowser(null)).toBeNull();
  });
  it("detects the platform", () => {
    expect(isAndroidUserAgent(UA.instagramAndroid)).toBe(true);
    expect(isAndroidUserAgent(UA.instagramIos)).toBe(false);
    expect(isIosUserAgent(UA.instagramIos)).toBe(true);
    expect(isIosUserAgent(UA.instagramAndroid)).toBe(false);
  });
});

describe("chromeIntentUrl", () => {
  it("keeps the same path and query and falls back to the https URL", () => {
    const out = chromeIntentUrl("https://lazytopper.com/login?redirect=%2Fcheck-improve&x=1");
    expect(out).toBe(
      "intent://lazytopper.com/login?redirect=%2Fcheck-improve&x=1#Intent;scheme=https;package=com.android.chrome;" +
        "S.browser_fallback_url=" +
        encodeURIComponent("https://lazytopper.com/login?redirect=%2Fcheck-improve&x=1") +
        ";end",
    );
  });
  it("refuses non-http URLs and garbage", () => {
    expect(chromeIntentUrl("javascript:alert(1)")).toBeNull();
    expect(chromeIntentUrl("not a url")).toBeNull();
  });
});
