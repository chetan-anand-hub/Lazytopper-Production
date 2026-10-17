import { describe, it, expect, afterEach } from "vitest";

import {
  isOverlayOpen,
  shouldShowWhatsAppFab,
  whatsAppContextFor,
  whatsAppHref,
  whatsAppMessageFor,
} from "./whatsappContact";

/**
 * WA-CONTACT-1 — the floating WhatsApp button's route table, its prefilled message and
 * the overlay check. Clock-free.
 */

const SHOWN: readonly string[] = [
  "/",
  "/browse",
  "/practice-hub",
  "/exam-trends",
  "/topic-hub",
  "/topic-hub/triangles",
  "/topic-hub/10/Maths",
  "/topic-hub/10/Maths/triangles",
  "/notes/trigonometry",
  "/ncert-class-10",
  "/ncert-solutions/triangles",
  "/ncert-exemplar/triangles",
  "/cbse/class-10",
  "/highly-probable",
  "/highly-probable/10/Maths",
  "/me",
  "/for-parents",
  "/welcome",
  "/pricing",
  "/pricing/",
  "/contact",
  "/legal/privacy",
  "/legal/refund",
  "/check-your-answer",
];

const HIDDEN: readonly string[] = [
  "/chapter-test/10/Maths/triangles",
  "/full-mock/10/Science",
  "/tutor/10/Maths",
  "/tutor/10/Maths/trigonometry",
  "/u/3f9a0c1b2d4e5f60718293a4b5c6d7e8",
  "/login",
  "/login/finish",
  "/sign-up",
  "/sign-up/verify",
  "/onboarding",
  "/intent",
  "/admin/funnel",
  "/admin/students",
  "/teacher",
  "/practice/10/Maths",
  "/practice/10/Science",
  "/check-improve",
  "/practice/worksheets",
  "/practice/worksheets/ready",
  "/weak-area-practice",
  "/exam-simulation",
  "/mock-paper/sample-paper-2026",
  "/something-new",
  // look-alikes of shown families must not match
  "/mex",
  "/contact-us",
  "/notesx/a",
  "/legalese",
];

describe("shouldShowWhatsAppFab — the route table", () => {
  it.each(SHOWN)("shows on %s", (p) => {
    expect(shouldShowWhatsAppFab(p)).toBe(true);
  });
  it.each(HIDDEN)("hides on %s", (p) => {
    expect(shouldShowWhatsAppFab(p)).toBe(false);
  });
});

describe("the prefilled message", () => {
  it("names the chapter when the URL's slug is a registry chapter", () => {
    expect(whatsAppContextFor("/notes/trigonometry")).toMatch(/Trigonometry/);
    expect(whatsAppContextFor("/topic-hub/triangles")).toBe("Triangles");
    expect(whatsAppContextFor("/topic-hub/10/Maths/triangles")).toBe("Triangles");
    expect(whatsAppContextFor("/ncert-solutions/triangles")).toBe("Triangles");
  });

  it("falls back to a fixed page name, never the raw URL text", () => {
    expect(whatsAppContextFor("/notes/zz-not-a-chapter-123")).toBe("the Notes");
    expect(whatsAppContextFor("/topic-hub/10/Maths/Ab3dEf9GhIjKlMnOpQrStUvWxYz1")).toBe("the Topic Hub");
    expect(whatsAppContextFor("/practice-hub")).toBe("the Practice page");
    expect(whatsAppContextFor("/")).toBe("the Home page");
    expect(whatsAppContextFor("/highly-probable/10/Science")).toBe("Science Important Questions");
    expect(whatsAppContextFor("/notes/%E0%A4%")).toBe("the Notes"); // malformed escape
  });

  it("starts with the owner's greeting", () => {
    expect(whatsAppMessageFor("/practice-hub")).toBe("Hi LazyTopper, I have a doubt about the Practice page");
  });
});

describe("whatsAppHref — the wa.me URL", () => {
  it("is the founder's number with the message URL-encoded", () => {
    const href = whatsAppHref("Hi LazyTopper, I have a doubt about Triangles & Circles?");
    expect(href).toBe(
      "https://wa.me/919714568948?text=Hi%20LazyTopper%2C%20I%20have%20a%20doubt%20about%20Triangles%20%26%20Circles%3F",
    );
    const text = new URL(href).searchParams.get("text");
    expect(text).toBe("Hi LazyTopper, I have a doubt about Triangles & Circles?");
  });
});

describe("isOverlayOpen", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    document.body.style.overflow = "";
  });

  it("CONTROL: a plain page has no overlay", () => {
    document.body.innerHTML = "<main><button>x</button></main>";
    expect(isOverlayOpen(document)).toBe(false);
  });

  it("an aria-modal dialog (the scorecard, sheets) counts", () => {
    document.body.innerHTML = '<div role="dialog" aria-modal="true">scorecard</div>';
    expect(isOverlayOpen(document)).toBe(true);
  });

  it("an open <dialog> counts", () => {
    document.body.innerHTML = "<dialog open>hi</dialog>";
    expect(isOverlayOpen(document)).toBe(true);
  });

  it("a body scroll-lock counts", () => {
    document.body.style.overflow = "hidden";
    expect(isOverlayOpen(document)).toBe(true);
  });
});
