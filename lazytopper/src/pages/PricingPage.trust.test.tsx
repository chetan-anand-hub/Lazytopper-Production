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
  it("PRICING-B-1 phone: the video sits under 'What you get with each' with the agreed headings; a click-to-play facade", () => {
    const { container } = renderPage();
    const proof = container.querySelector('[data-testid="pricing-proof-phone"]')!;
    const what = container.querySelector('[data-testid="pricing-what-you-get"]')!;
    const faq = container.querySelector('[data-testid="pricing-faq"]')!;
    expect(what.compareDocumentPosition(proof) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(proof.compareDocumentPosition(faq) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("heading", { name: "See the Answer Checker at work" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Where did his ½ mark go?" })).toBeTruthy();
    expect(container.querySelectorAll('[data-testid="testimonial-video"]')).toHaveLength(1);
    expect(container.querySelector('[data-testid="pricing-proof-hero"]')).toBeNull();
    expect(container.querySelector("iframe")).toBeNull();
    const srcs = Array.from(container.querySelectorAll("[src]")).map((e) => e.getAttribute("src") ?? "");
    expect(srcs.filter((v) => /youtube|ytimg|google/i.test(v))).toEqual([]);
    expect(container.innerHTML).not.toMatch(/\bour student/i);
  });

  it("PRICING-B-1 desktop (>= 1024 px): the video sits in the Board Pass card, once", () => {
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: q.includes("min-width: 1024px"), media: q, addEventListener: () => undefined, removeEventListener: () => undefined }));
    const { container } = renderPage();
    const hero = container.querySelector('[data-testid="pricing-proof-hero"]')!;
    expect(hero.closest('[data-testid="pricing-board-pass"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-testid="testimonial-video"]')).toHaveLength(1);
    expect(container.querySelector('[data-testid="pricing-proof-phone"]')).toBeNull();
    vi.unstubAllGlobals();
  });

  it("payments on: the trial is a small text link (not primary) with the owner's label", () => {
    vi.stubEnv("VITE_PAYMENTS_ENABLED", "1");
    renderPage();
    const trial = screen.getByRole("button", { name: "Try the Board Pass free for 7 days" });
    expect(trial.className).toBe("lt-pp-trial");
  });

  it("payments off: there is no Pay, so the trial stays the primary action", () => {
    renderPage();
    const trial = screen.getByRole("button", { name: "Try the Board Pass free for 7 days" });
    expect(trial.className).toContain("lt-pricing-cta--primary");
  });

  it("the waitlist is folded behind 'Other boards? Join the waitlist', last in the page body", () => {
    const { container } = renderPage();
    const d = container.querySelector('[data-testid="pricing-otherboards"]') as HTMLDetailsElement;
    expect(d).not.toBeNull();
    expect(d.open).toBe(false);
    expect(d.querySelector("summary")!.textContent).toBe("Other boards? Join the waitlist");
    expect(d.querySelector(".lt-pricing-waitlist")).not.toBeNull();
    // Last in the page body (the phone sticky bar mounts after it only with payments on, and is fixed-position).
    const body = container.querySelector(".lt-pricing-body")!;
    expect(body.lastElementChild).toBe(d);
  });
});
