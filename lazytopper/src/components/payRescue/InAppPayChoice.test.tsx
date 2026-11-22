import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const onboarding = vi.hoisted(() => vi.fn());
vi.mock("../../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../analytics/analytics")>();
  return { ...actual, trackOnboardingEvent: onboarding };
});

import InAppPayChoice, {
  INAPP_CHOICE_CHROME_LABEL,
  INAPP_CHOICE_COPIED_IOS,
  INAPP_CHOICE_COPIED_OTHER,
  inAppChoiceSurface,
} from "./InAppPayChoice";
import { currentInAppPayChoice, iosSafariSupported, inAppChoiceUrl } from "../../utils/inAppPay";
import { readBuyResume } from "../packs/PacksShop";

const UA = {
  igAndroid: "Mozilla/5.0 (Linux; Android 13; SM-A546E Build/TP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36 Instagram 310.0.0.37.109 Android",
  igIos17: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21C62 Instagram 310.0.0.37.109",
  fbIos16: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/20G75 [FBAN/FBIOS;FBAV/450.0.0.38.108;FBDV/iPhone12,1]",
  fbAndroid: "Mozilla/5.0 (Linux; Android 12; Pixel 6 Build/SD1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/119.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/450.0.0.38.108;]",
  chrome: "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
  safari: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
};
const HREF = "https://www.lazytopper.com/packs?utm_source=instagram&utm_campaign=c1&fbclid=zz&gclid=gg";
const setUa = (ua: string) => Object.defineProperty(navigator, "userAgent", { value: ua, configurable: true });

beforeEach(() => onboarding.mockReset());
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("INAPP-PAY-CHOICE-1 detection matrix (real navigator.userAgent)", () => {
  it.each([
    ["Instagram Android", UA.igAndroid, "instagram", "android"],
    ["Instagram iOS", UA.igIos17, "instagram", "ios"],
    ["Facebook iOS", UA.fbIos16, "facebook", "ios"],
    ["Facebook Android", UA.fbAndroid, "facebook", "android"],
  ])("%s -> option shown", (_n, ua, app, platform) => {
    setUa(ua);
    expect(currentInAppPayChoice()).toEqual({ app, platform });
    render(<InAppPayChoice buy={{ kind: "pass" }} href={HREF} />);
    expect(screen.getByTestId("inapp-pay-choice")).toBeTruthy();
  });
  it.each([["normal Chrome", UA.chrome], ["normal Safari", UA.safari]])("%s -> nothing", (_n, ua) => {
    setUa(ua);
    expect(currentInAppPayChoice()).toBeNull();
    render(<InAppPayChoice buy={{ kind: "pass" }} href={HREF} />);
    expect(screen.queryByTestId("inapp-pay-choice")).toBeNull();
    expect(onboarding).not.toHaveBeenCalled();
  });
  it("kill switch hides it, and so does the INAPP-PAY-1 one", () => {
    setUa(UA.igAndroid);
    vi.stubEnv("VITE_INAPP_PAY_CHOICE_DISABLED", "1");
    render(<InAppPayChoice buy={{ kind: "pass" }} href={HREF} />);
    expect(screen.queryByTestId("inapp-pay-choice")).toBeNull();
    cleanup();
    vi.unstubAllEnvs();
    vi.stubEnv("VITE_INAPP_PAY_DISABLED", "1");
    render(<InAppPayChoice buy={{ kind: "pass" }} href={HREF} />);
    expect(screen.queryByTestId("inapp-pay-choice")).toBeNull();
  });
});

describe("INAPP-PAY-CHOICE-1 per platform", () => {
  it("Android: Chrome intent for this exact item; attribution + via=inapp; event on tap", () => {
    render(<InAppPayChoice inApp={{ app: "instagram", platform: "android" }} href={HREF} surface="packs" buy={{ kind: "pack", sku: "pack_cbq", target: "maths" }} sourceParams={[]} />);
    const a = screen.getByTestId("inapp-pay-choice-chrome") as HTMLAnchorElement;
    expect(a.textContent).toBe(INAPP_CHOICE_CHROME_LABEL);
    const href = a.getAttribute("href")!;
    expect(href.startsWith("intent://www.lazytopper.com/packs?")).toBe(true);
    for (const k of ["buy=pack_cbq", "t=maths", "utm_source=instagram", "utm_campaign=c1", "fbclid=zz", "gclid=gg", "via=inapp"]) expect(href).toContain(k);
    expect(screen.queryByTestId("inapp-pay-choice-copy")).toBeNull();
    expect(onboarding).toHaveBeenCalledWith("inapp_pay_choice_shown", { app: "instagram", platform: "android", surface: "packs" });
    fireEvent.click(a);
    expect(onboarding).toHaveBeenCalledWith("inapp_pay_open_external", { app: "instagram", platform: "android", surface: "packs" });
  });
  it("iOS 17+: Safari link + Copy; copy puts the https link on the clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<InAppPayChoice inApp={{ app: "instagram", platform: "ios" }} userAgent={UA.igIos17} href={HREF} surface="packs" buy={{ kind: "pass" }} sourceParams={[]} />);
    const a = screen.getByTestId("inapp-pay-choice-safari") as HTMLAnchorElement;
    expect(a.getAttribute("href")!.startsWith("x-safari-https://www.lazytopper.com/board-pass?")).toBe(true);
    expect(a.getAttribute("href")).toContain("buy=board_pass");
    fireEvent.click(screen.getByTestId("inapp-pay-choice-copy"));
    await waitFor(() => expect(screen.getByTestId("inapp-pay-choice-notice").textContent).toBe(INAPP_CHOICE_COPIED_IOS));
    expect(writeText.mock.calls[0][0]).toMatch(/^https:\/\/www\.lazytopper\.com\/board-pass\?.*buy=board_pass.*via=inapp/);
    expect(onboarding).toHaveBeenCalledWith("inapp_pay_copy_link", { app: "instagram", platform: "ios", surface: "packs" });
  });
  it("iOS < 17: copy only, no Safari button", () => {
    render(<InAppPayChoice inApp={{ app: "facebook", platform: "ios" }} userAgent={UA.fbIos16} href={HREF} buy={{ kind: "pass" }} sourceParams={[]} />);
    expect(screen.queryByTestId("inapp-pay-choice-safari")).toBeNull();
    expect(screen.getByTestId("inapp-pay-choice-copy")).toBeTruthy();
    expect(iosSafariSupported(UA.fbIos16)).toBe(false);
    expect(iosSafariSupported("iPhone no version")).toBe(false);
    expect(iosSafariSupported(UA.igIos17)).toBe(true);
  });
  it("other platform: Copy payment link only", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<InAppPayChoice inApp={{ app: "other", platform: "other" }} href={HREF} buy={{ kind: "pass" }} sourceParams={[]} />);
    expect(screen.queryByTestId("inapp-pay-choice-chrome")).toBeNull();
    expect(screen.queryByTestId("inapp-pay-choice-safari")).toBeNull();
    fireEvent.click(screen.getByTestId("inapp-pay-choice-copy"));
    await waitFor(() => expect(screen.getByTestId("inapp-pay-choice-notice").textContent).toBe(INAPP_CHOICE_COPIED_OTHER));
  });
});

describe("INAPP-PAY-CHOICE-1 the link reopens the same item, carries attribution, holds no PII", () => {
  const q = (u: string) => new URL(u).search;
  it("pack sku / target resolve through the shop's own ?buy= reader", () => {
    const cbq = inAppChoiceUrl("https://www.lazytopper.com/cbq-packs", { kind: "pack", sku: "pack_cbq", target: "science" })!;
    expect(readBuyResume(q(cbq))).toEqual({ sku: "pack_cbq", target: "science" });
    const ts = inAppChoiceUrl("https://www.lazytopper.com/test-series?from=test-series", { kind: "pack", sku: "test_series" })!;
    expect(readBuyResume(q(ts))).toEqual({ sku: "test_series", target: undefined });
    expect(new URL(ts).searchParams.get("from")).toBe("test-series"); // the page's own `from` is never overwritten
    expect(new URL(ts).pathname).toBe("/test-series");
  });
  it("Board Pass: /pricing and /board-pass keep their page; For Parents hands over to /board-pass", () => {
    expect(new URL(inAppChoiceUrl("https://www.lazytopper.com/pricing", { kind: "pass" })!).searchParams.get("buy")).toBe("board_pass");
    expect(new URL(inAppChoiceUrl("https://www.lazytopper.com/board-pass", { kind: "pass" })!).pathname).toBe("/board-pass");
    const fp = new URL(inAppChoiceUrl("https://www.lazytopper.com/for-parents?utm_source=ig", { kind: "pass" })!);
    expect(fp.pathname).toBe("/board-pass");
    expect(fp.searchParams.get("buy")).toBe("board_pass");
    expect(fp.searchParams.get("utm_source")).toBe("ig");
  });
  it("stored first-touch utm is added only when the URL lacks it; click-id values and other keys are never added", () => {
    const u = new URL(
      inAppChoiceUrl("https://www.lazytopper.com/packs?utm_source=ig", { kind: "pass" }, [
        ["utm_source", "other"],
        ["utm_campaign", "camp"],
        ["lt_clk", "fbclid"],
        ["gclid", "SECRET"],
        ["email", "a@b.com"],
        ["utm_medium", "has space"],
      ])!,
    );
    expect(u.searchParams.get("utm_source")).toBe("ig");
    expect(u.searchParams.get("utm_campaign")).toBe("camp");
    expect(u.searchParams.get("lt_clk")).toBe("fbclid");
    expect(u.searchParams.has("gclid")).toBe(false);
    expect(u.searchParams.has("email")).toBe(false);
    expect(u.searchParams.has("utm_medium")).toBe(false);
    expect(u.searchParams.get("via")).toBe("inapp");
  });
  it("a non-http(s) page gives no link; surface slugs", () => {
    expect(inAppChoiceUrl("javascript:alert(1)", { kind: "pass" })).toBeNull();
    expect(inAppChoiceSurface("/cbq-packs")).toBe("cbq_packs");
    expect(inAppChoiceSurface("/test-series/")).toBe("test_series");
    expect(inAppChoiceSurface("/for-parents")).toBe("for_parents");
  });
});
