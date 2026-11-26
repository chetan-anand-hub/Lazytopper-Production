/**
 * INAPP-STUCK-1 - Android in-app browser where Chrome did not open: "Copy payment link" becomes the PRIMARY action (+ one-line note),
 * "Pay in Chrome" stays as a retry; not stuck / iOS / kill switch = today's DOM; `inapp_pay_open_external_stuck` fires once.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

const onboarding = vi.hoisted(() => vi.fn());
vi.mock("../../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../analytics/analytics")>();
  return { ...actual, trackOnboardingEvent: onboarding };
});

import InAppPayChoice, { resetInAppPayChoiceShown } from "./InAppPayChoice";
import { INAPP_STUCK_COPY_NOTE, inAppWatchChromeTap, resetInAppPayFirst } from "../../utils/inAppPayFirst";

const IG_ANDROID = "Mozilla/5.0 (Linux; Android 13; SM-A546E Build/TP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36 Instagram 310.0.0.37.109 Android";
const IG_IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21C62 Instagram 310.0.0.37.109";
const HREF = "https://www.lazytopper.com/packs?utm_source=instagram&utm_campaign=c1";
const setUa = (ua: string) => Object.defineProperty(navigator, "userAgent", { value: ua, configurable: true });
const stuckEvents = () => onboarding.mock.calls.filter((c) => c[0] === "inapp_pay_open_external_stuck");

beforeEach(() => {
  vi.useFakeTimers();
  onboarding.mockReset();
  resetInAppPayChoiceShown();
  resetInAppPayFirst();
  setUa(IG_ANDROID);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

const tapChromeAndWait = () => {
  fireEvent.click(screen.getByTestId("inapp-pay-choice-chrome"));
  act(() => {
    vi.advanceTimersByTime(2600);
  });
};

describe("INAPP-STUCK-1", () => {
  it("not stuck (Android): today's DOM - Chrome link, no Copy, no note", () => {
    render(<InAppPayChoice buy={{ kind: "pass" }} href={HREF} />);
    expect(screen.getByTestId("inapp-pay-choice-chrome")).toBeTruthy();
    expect(screen.queryByTestId("inapp-pay-choice-copy")).toBeNull();
    expect(screen.queryByTestId("inapp-pay-choice-stuck-note")).toBeNull();
  });

  it("a Chrome tap whose page stays visible 2.5 s -> Copy is the FIRST action with the note; Chrome stays as retry", () => {
    render(<InAppPayChoice buy={{ kind: "pass" }} href={HREF} surface="packs" />);
    tapChromeAndWait();
    const box = screen.getByTestId("inapp-pay-choice");
    expect((box.firstElementChild as HTMLElement).getAttribute("data-testid")).toBe("inapp-pay-choice-copy");
    expect(screen.getByTestId("inapp-pay-choice-stuck-note").textContent).toBe(INAPP_STUCK_COPY_NOTE);
    expect(screen.getByTestId("inapp-pay-choice-chrome")).toBeTruthy();
    expect(stuckEvents()).toHaveLength(1);
    expect(stuckEvents()[0][1]).toEqual({ app: "instagram", platform: "android", surface: "packs" });
  });

  it("a Chrome tap that leaves the page (hidden) -> no stuck UI, no event", () => {
    render(<InAppPayChoice buy={{ kind: "pass" }} href={HREF} />);
    const vis = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    tapChromeAndWait();
    vis.mockRestore();
    expect(screen.queryByTestId("inapp-pay-choice-copy")).toBeNull();
    expect(stuckEvents()).toHaveLength(0);
  });

  it("the event fires once however many retries stay visible", () => {
    render(<InAppPayChoice buy={{ kind: "pass" }} href={HREF} />);
    tapChromeAndWait();
    tapChromeAndWait();
    tapChromeAndWait();
    expect(stuckEvents()).toHaveLength(1);
  });

  it("Copy writes the SAME https URL the hop uses (?buy=, utm_*, via=inapp) and reuses inapp_pay_copy_link", async () => {
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<InAppPayChoice buy={{ kind: "pass" }} href={HREF} sourceParams={[]} />);
    const intent = screen.getByTestId("inapp-pay-choice-chrome").getAttribute("href") ?? "";
    tapChromeAndWait();
    await act(async () => {
      fireEvent.click(screen.getByTestId("inapp-pay-choice-copy"));
    });
    const copied = (writeText.mock.calls[0] as unknown as [string])[0];
    expect(copied).toContain("buy=");
    expect(copied).toContain("utm_source=instagram");
    expect(copied).toContain("via=inapp");
    expect(intent).toContain(encodeURIComponent(copied));
    expect(onboarding.mock.calls.some((c) => c[0] === "inapp_pay_copy_link")).toBe(true);
  });

  it("the hop's own stuck detection (inAppWatchChromeTap seam) also fires the event once and shows Copy first", () => {
    render(<InAppPayChoice buy={{ kind: "pass" }} href={HREF} />);
    act(() => {
      inAppWatchChromeTap("packs");
      vi.advanceTimersByTime(2600);
    });
    expect(screen.getByTestId("inapp-pay-choice").firstElementChild?.getAttribute("data-testid")).toBe("inapp-pay-choice-copy");
    expect(stuckEvents()).toHaveLength(1);
  });

  it("iOS is unchanged: Copy is the same secondary button, no stuck note, no stuck event", () => {
    setUa(IG_IOS);
    render(<InAppPayChoice buy={{ kind: "pass" }} href={HREF} />);
    expect(screen.queryByTestId("inapp-pay-choice-stuck-note")).toBeNull();
    expect(screen.getByTestId("inapp-pay-choice-copy").className).toBe("lt-pay-choice__btn");
    act(() => {
      inAppWatchChromeTap("packs");
      vi.advanceTimersByTime(2600);
    });
    expect(screen.queryByTestId("inapp-pay-choice-stuck-note")).toBeNull();
    expect(screen.getByTestId("inapp-pay-choice-copy").className).toBe("lt-pay-choice__btn");
  });

  it("kill switch VITE_INAPP_STUCK_COPY_DISABLED=1: today's behaviour, no Copy on Android, no event", () => {
    vi.stubEnv("VITE_INAPP_STUCK_COPY_DISABLED", "1");
    render(<InAppPayChoice buy={{ kind: "pass" }} href={HREF} />);
    tapChromeAndWait();
    expect(screen.queryByTestId("inapp-pay-choice-copy")).toBeNull();
    expect(screen.queryByTestId("inapp-pay-choice-stuck-note")).toBeNull();
    expect(stuckEvents()).toHaveLength(0);
  });
});
