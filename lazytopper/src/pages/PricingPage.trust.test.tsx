/**
 * TRUST-1 - /pricing: the testimonial sits directly under the Board Pass card, Pay is the only primary
 * action (payments on), the trial keeps its destination as a text-style button, and the other-boards
 * waitlist is folded at the very bottom. Also /packs carries the same video.
 */
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: null, loading: false }) }));

import PricingPage from "./PricingPage";

beforeEach(() => {
  vi.useFakeTimers({ now: new Date("2026-11-03T06:30:00.000Z"), toFake: ["Date"] });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

const renderPage = () => render(<MemoryRouter><PricingPage /></MemoryRouter>);

describe("TRUST-1 - /pricing", () => {
  it("the video follows the Board Pass card and precedes Basic, with the agreed heading", () => {
    const { container } = renderPage();
    const ladder = container.querySelector(".lt-pricing-ladder")!;
    const kids = Array.from(ladder.children);
    const premium = kids.findIndex((k) => k.id === "lt-premium-card");
    const video = kids.findIndex((k) => k.classList.contains("lt-pricing-video"));
    const basic = kids.findIndex((k) => k.classList.contains("lt-pricing-card--basic"));
    expect(premium).toBe(0);
    expect(video).toBeGreaterThan(premium);
    expect(basic).toBeGreaterThan(video);
    expect(screen.getByRole("heading", { name: "Where did his ½ mark go?" })).toBeTruthy();
    expect(container.querySelector('[data-testid="testimonial-video"]')).not.toBeNull();
    // facade only: nothing from YouTube before the tap
    expect(container.querySelector("iframe")).toBeNull();
    const srcs = Array.from(container.querySelectorAll("[src]")).map((e) => e.getAttribute("src") ?? "");
    expect(srcs.filter((v) => /youtube|ytimg|google/i.test(v))).toEqual([]);
    expect(container.innerHTML).not.toMatch(/\bour student/i);
  });

  it("payments on: the trial is a text-style button (not primary) with the same label", () => {
    vi.stubEnv("VITE_PAYMENTS_ENABLED", "1");
    renderPage();
    const trial = screen.getByRole("button", { name: "Start 7-day trial" });
    expect(trial.className).toContain("lt-pricing-cta--text");
    expect(trial.className).not.toContain("lt-pricing-cta--primary");
  });

  it("payments off: there is no Pay, so the trial stays the primary action", () => {
    renderPage();
    const trial = screen.getByRole("button", { name: "Start 7-day trial" });
    expect(trial.className).toContain("lt-pricing-cta--primary");
  });

  it("the waitlist is folded behind 'Other boards? Join the waitlist', last in the page body", () => {
    const { container } = renderPage();
    const d = container.querySelector('[data-testid="pricing-otherboards"]') as HTMLDetailsElement;
    expect(d).not.toBeNull();
    expect(d.open).toBe(false);
    expect(d.querySelector("summary")!.textContent).toBe("Other boards? Join the waitlist");
    expect(d.querySelector(".lt-pricing-waitlist")).not.toBeNull();
    const body = container.querySelector(".lt-pricing-body")!;
    expect(body.lastElementChild).toBe(d);
  });
});
