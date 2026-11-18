import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const onboarding = vi.hoisted(() => vi.fn());
vi.mock("../../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../analytics/analytics")>();
  return { ...actual, trackOnboardingEvent: onboarding, trackNamedEvent: vi.fn(), trackPaywallAction: vi.fn() };
});
vi.mock("../../services/parentPay", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/parentPay")>();
  return { ...actual, isParentPayClientEnabled: () => false };
});

import InAppPayRescue, { INAPP_RESCUE_CHROME_LABEL, INAPP_RESCUE_COPIED, INAPP_RESCUE_HEADING } from "./InAppPayRescue";
import PayRescueCard, { PAY_RESCUE_HEADING } from "./PayRescueCard";

const HREF = "https://www.lazytopper.com/packs?utm_source=instagram&fbclid=zz";
const ANDROID = { app: "instagram", platform: "android" } as const;
const IOS = { app: "facebook", platform: "ios" } as const;

beforeEach(() => onboarding.mockReset());
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("INAPP-PAY-1 InAppPayRescue", () => {
  it("renders nothing outside an in-app browser", () => {
    render(<InAppPayRescue inApp={null} href={HREF} />);
    expect(screen.queryByTestId("inapp-pay-rescue")).toBeNull();
    expect(onboarding).not.toHaveBeenCalled();
  });
  it("Android: Chrome intent keeps the query + ?buy=, events fire", () => {
    render(<InAppPayRescue inApp={ANDROID} href={HREF} buy={{ kind: "pack", sku: "pack_cbq", target: "maths" }} />);
    expect(screen.getByText(INAPP_RESCUE_HEADING)).toBeTruthy();
    const a = screen.getByTestId("pay-rescue-open-chrome") as HTMLAnchorElement;
    expect(a.textContent).toBe(INAPP_RESCUE_CHROME_LABEL);
    expect(a.getAttribute("href")).toContain("intent://www.lazytopper.com/packs?");
    expect(a.getAttribute("href")).toContain("buy=pack_cbq");
    expect(a.getAttribute("href")).toContain("fbclid=zz");
    expect(onboarding).toHaveBeenCalledWith("inapp_pay_rescue_shown", { app: "instagram" });
    fireEvent.click(a);
    expect(onboarding).toHaveBeenCalledWith("inapp_pay_rescue_open_browser", { app: "instagram" });
  });
  it("iOS: instruction + Copy link, no intent link", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<InAppPayRescue inApp={IOS} href={HREF} buy={{ kind: "pass" }} />);
    expect(screen.queryByTestId("pay-rescue-open-chrome")).toBeNull();
    expect(screen.getByText(/Open in browser/)).toBeTruthy();
    fireEvent.click(screen.getByTestId("pay-rescue-copy-link"));
    await waitFor(() => expect(screen.getByText(INAPP_RESCUE_COPIED)).toBeTruthy());
    expect(writeText.mock.calls[0][0]).toContain("buy=board_pass");
    expect(onboarding).toHaveBeenCalledWith("inapp_pay_rescue_copy_link", { app: "facebook" });
  });
});

describe("INAPP-PAY-1 css", () => {
  it("the note wraps a long link and the Chrome link has a focus ring", () => {
    const css = readFileSync(resolve(process.cwd(), "src/components/payRescue/payRescue.css"), "utf8");
    expect(/\.lt-pay-rescue__note\s*\{[^}]*overflow-wrap:\s*anywhere/.test(css)).toBe(true);
    expect(css).toContain(".lt-pay-rescue a:focus-visible");
  });
});

describe("INAPP-PAY-1 in the PayRescueCard (after a closed / failed sheet)", () => {
  it("in-app: new heading + Chrome link above the existing Try again", () => {
    render(<PayRescueCard kind="pack" inApp={ANDROID} href={HREF} buy={{ kind: "pack", sku: "pack_bundle" }} onRetry={() => {}} onClose={() => {}} />);
    expect(screen.getByText(INAPP_RESCUE_HEADING)).toBeTruthy();
    expect(screen.getByTestId("pay-rescue-open-chrome")).toBeTruthy();
    expect(screen.getByTestId("pay-rescue-retry")).toBeTruthy();
    expect(onboarding).toHaveBeenCalledWith("inapp_pay_rescue_shown", { app: "instagram" });
  });
  it("in-app pass shows even when the parent hand-off is off", () => {
    render(<PayRescueCard kind="pass" inApp={ANDROID} href={HREF} buy={{ kind: "pass" }} onRetry={() => {}} onClose={() => {}} />);
    expect(screen.getByTestId("pay-rescue-open-chrome")).toBeTruthy();
  });
  it("normal browser: today's card, no in-app event (pass with parent-pay off is still nothing)", () => {
    const { container } = render(<PayRescueCard kind="pack" inApp={null} onRetry={() => {}} onClose={() => {}} />);
    expect(screen.getByText(PAY_RESCUE_HEADING)).toBeTruthy();
    expect(container.querySelector("[data-testid=pay-rescue-open-chrome]")).toBeNull();
    expect(onboarding).not.toHaveBeenCalled();
    cleanup();
    const pass = render(<PayRescueCard kind="pass" inApp={null} onRetry={() => {}} onClose={() => {}} />);
    expect(pass.container.innerHTML).toBe("");
  });
  it("kill switch: with VITE_INAPP_PAY_DISABLED=1 the detected value is null even on an in-app UA", () => {
    vi.stubEnv("VITE_INAPP_PAY_DISABLED", "1");
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (Linux; Android 13; SM-S911B; wv) AppleWebKit/537.36 Chrome/118.0.0.0 Mobile Safari/537.36 Instagram 309.1.0.41.113 Android",
    );
    render(<PayRescueCard kind="pack" onRetry={() => {}} onClose={() => {}} />);
    expect(screen.getByText(PAY_RESCUE_HEADING)).toBeTruthy();
    vi.restoreAllMocks();
  });
});
