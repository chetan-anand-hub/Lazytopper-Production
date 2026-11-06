import { describe, it, expect } from "vitest";
import { inAppBrowser, uaClass } from "./inAppBrowser";
import {
  chromeIntentUrl,
  chromeSigninHandoffUrl,
  isAndroidInAppBrowser,
  isAndroidUserAgent,
  isIosUserAgent,
} from "./inAppBrowserLinks";

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
  // AUTH-SIGNAL-1. VERBATIM from https://whatmyuseragent.com/apps/youtube (joined segments):
  youtubeAndroidVerbatim:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36 com.google.android.youtube/2.4.4(Linux; Android 13; SM-S901B) gzip",
  youtubeIpadVerbatim:
    "Mozilla/5.0 (iPad; CPU OS 10_3_4 like Mac OS X) AppleWebKit/603.3.8 (KHTML, like Gecko) Version/13.0.1 Mobile/14G61 Safari/604.1 com.google.ios.youtube/20.31.6 (iPad; CPU OS 10_3_4 like Mac OS)",
  // CONSTRUCTED by appending the same package token to an ordinary WebView / Safari user agent:
  youtubeAndroidWebview:
    "Mozilla/5.0 (Linux; Android 13; SM-S901B; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/118.0.0.0 Mobile Safari/537.36 com.google.android.youtube/19.12.35",
  youtubeIphone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1 com.google.ios.youtube/20.38.4 (iPhone16,2; U; CPU iOS 17_0 like Mac OS X)",
  // iOS WKWebView with no app token: no Version/ and no Safari/ (mobiForge, "Webviews and User-Agent strings").
  iosBareWebview:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
  chromeIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/118.0.5993.69 Mobile/15E148 Safari/604.1",
  firefoxIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/118.0 Mobile/15E148 Safari/605.1.15",
  samsungInternet:
    "Mozilla/5.0 (Linux; Android 13; SAMSUNG SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36",
  firefoxAndroid: "Mozilla/5.0 (Android 13; Mobile; rv:118.0) Gecko/118.0 Firefox/118.0",
  ipadSafari:
    "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
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

describe("AUTH-SIGNAL-1 detection additions", () => {
  const cases: Array<[string, keyof typeof UA, ReturnType<typeof inAppBrowser>]> = [
    ["YouTube Android, verbatim sample", "youtubeAndroidVerbatim", "youtube"],
    ["YouTube iPad, verbatim sample", "youtubeIpadVerbatim", "youtube"],
    ["YouTube Android WebView", "youtubeAndroidWebview", "youtube"],
    ["YouTube iPhone", "youtubeIphone", "youtube"],
    ["bare iOS WKWebView", "iosBareWebview", "other-webview"],
    ["Chrome on iOS keeps Safari/", "chromeIos", null],
    ["Firefox on iOS keeps Safari/", "firefoxIos", null],
    ["iPad Safari", "ipadSafari", null],
    ["Samsung Internet", "samsungInternet", null],
    ["Firefox Android", "firefoxAndroid", null],
  ];
  it.each(cases)("%s", (_label, key, expected) => {
    expect(inAppBrowser(UA[key])).toBe(expected);
  });
});

describe("uaClass", () => {
  const cases: Array<[keyof typeof UA, string]> = [
    ["youtubeAndroidVerbatim", "inapp_youtube"],
    ["youtubeAndroidWebview", "inapp_youtube"],
    ["youtubeIphone", "inapp_youtube"],
    ["youtubeIpadVerbatim", "inapp_youtube"],
    ["instagramAndroid", "inapp_instagram"],
    ["instagramIos", "inapp_instagram"],
    ["facebookAndroid", "inapp_facebook"],
    ["facebookIos", "inapp_facebook"],
    ["messenger", "inapp_facebook"],
    ["androidWebview", "android_webview"],
    ["line", "android_webview"],
    ["iosBareWebview", "ios_webview"],
    ["linkedin", "ios_webview"],
    ["snapchat", "ios_webview"],
    ["chromeAndroid", "chrome_android"],
    ["desktopChrome", "desktop"],
    ["safariIos", "other"],
    ["chromeIos", "other"],
    ["samsungInternet", "other"],
    ["firefoxAndroid", "other"],
  ];
  it.each(cases)("%s -> %s", (key, expected) => {
    expect(uaClass(UA[key])).toBe(expected);
  });
  it("empty or missing input is other", () => {
    expect(uaClass("")).toBe("other");
    expect(uaClass(null)).toBe("other");
    expect(uaClass(undefined)).toBe("other");
  });
});

describe("standalone (home-screen web app)", () => {
  it("the bare iOS web view UA is not an in-app browser when standalone", () => {
    expect(inAppBrowser(UA.iosBareWebview, true)).toBeNull();
    expect(uaClass(UA.iosBareWebview, true)).toBe("other");
    expect(inAppBrowser(UA.iosBareWebview, false)).toBe("other-webview");
  });
  it("named apps are still detected when standalone is true", () => {
    expect(inAppBrowser(UA.youtubeIphone, true)).toBe("youtube");
    expect(inAppBrowser(UA.instagramIos, true)).toBe("instagram");
  });
});

describe("LOGIN-FIX-1 · isAndroidInAppBrowser", () => {
  it.each([
    ["instagramAndroid", true],
    ["facebookAndroid", true],
    ["androidWebview", true],
    ["youtubeAndroidWebview", true],
    ["line", true],
    ["chromeAndroid", false], // also what a Chrome Custom Tab reports
    ["samsungInternet", false],
    ["firefoxAndroid", false],
    ["instagramIos", false],
    ["iosBareWebview", false],
    ["youtubeIphone", false],
    ["desktopChrome", false],
  ] as Array<[keyof typeof UA, boolean]>)("%s -> %s", (key, expected) => {
    expect(isAndroidInAppBrowser(UA[key])).toBe(expected);
  });
});

describe("LOGIN-FIX-1 · chromeSigninHandoffUrl keeps the safe redirect", () => {
  const decode = (intent: string | null) => {
    const m = /^intent:\/\/(.+?)#Intent;scheme=(https?);package=com\.android\.chrome;S\.browser_fallback_url=(.+);end$/.exec(intent ?? "");
    return m ? { target: m[1], scheme: m[2], fallback: decodeURIComponent(m[3]) } : null;
  };
  it("adds ?redirect=<target> when the URL does not carry it (router state does not survive the hop)", () => {
    const out = decode(chromeSigninHandoffUrl("https://lazytopper.com/login", "/check-improve?x=1"));
    expect(out).toEqual({
      target: "lazytopper.com/login?redirect=%2Fcheck-improve%3Fx%3D1",
      scheme: "https",
      fallback: "https://lazytopper.com/login?redirect=%2Fcheck-improve%3Fx%3D1",
    });
  });
  it("keeps an existing ?redirect= and the rest of the query untouched", () => {
    const out = decode(chromeSigninHandoffUrl("https://lazytopper.com/login?redirect=%2Fpacks&reason=start-trial", "/other"));
    expect(out?.target).toBe("lazytopper.com/login?redirect=%2Fpacks&reason=start-trial");
  });
  it.each(["https://evil.example/x", "//evil.example", "/\\evil", "javascript:alert(1)", "/"])(
    "never carries an unsafe or empty target (%s)",
    (target) => {
      const out = decode(chromeSigninHandoffUrl("https://lazytopper.com/login", target));
      expect(out?.target).toBe("lazytopper.com/login");
    },
  );
  it("drops an unsafe ?redirect= already on the page instead of handing it on", () => {
    const out = decode(chromeSigninHandoffUrl("https://lazytopper.com/login?redirect=https%3A%2F%2Fevil.example&reason=start-trial", "/"));
    expect(out?.target).toBe("lazytopper.com/login?reason=start-trial");
    expect(out?.fallback).toBe("https://lazytopper.com/login?reason=start-trial");
  });
  it("carries the first-touch source params, allow-listed, without touching the redirect logic", () => {
    const out = decode(
      chromeSigninHandoffUrl("https://lazytopper.com/login?redirect=https%3A%2F%2Fevil.example", "/packs", [
        ["utm_source", "youtube"],
        ["utm_campaign", "9"],
        ["lt_clk", "gclid,gbraid"],
        ["gclid", "FORGED"], // not on the allow-list: never written
        ["email", "a@b.com"], // not on the allow-list: never written
        ["utm_content", "bad value!"], // fails the charset: dropped
      ]),
    );
    expect(out?.target).toBe("lazytopper.com/login?redirect=%2Fpacks&utm_source=youtube&utm_campaign=9&lt_clk=gclid%2Cgbraid");
    expect(out?.fallback).toBe("https://lazytopper.com/login?redirect=%2Fpacks&utm_source=youtube&utm_campaign=9&lt_clk=gclid%2Cgbraid");
  });
  it("never overwrites a source param the page URL already has", () => {
    const out = decode(chromeSigninHandoffUrl("https://lazytopper.com/login?utm_source=google", "/", [["utm_source", "youtube"]]));
    expect(out?.target).toBe("lazytopper.com/login?utm_source=google");
  });
  it("stays on the page's own host", () => {
    const out = decode(chromeSigninHandoffUrl("https://lazytopper.com/login", "/x"));
    expect(out?.target.startsWith("lazytopper.com/")).toBe(true);
  });
  it("refuses garbage", () => {
    expect(chromeSigninHandoffUrl("not a url", "/x")).toBeNull();
  });
});
