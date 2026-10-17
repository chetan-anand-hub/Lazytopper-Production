import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const tracked: string[] = [];
vi.mock("../analytics/analytics", () => ({
  trackWhatsAppContactTap: (placement: string) => {
    tracked.push(placement);
  },
}));

import ContactPage from "./ContactPage";
import { LEGAL_ENTITY_NAME } from "../config/legalEntity";

/** WA-CONTACT-1 §3 — the public /contact page. */

function page() {
  return render(
    <MemoryRouter initialEntries={["/contact"]}>
      <ContactPage />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  tracked.length = 0;
});

describe("ContactPage", () => {
  it("shows the WhatsApp number, a wa.me button and what it is for", () => {
    page();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/Contact/i);
    expect(screen.getByText("+91 97145 68948")).toBeTruthy();
    const wa = screen.getByTestId("contact-whatsapp");
    expect(wa.getAttribute("href")?.startsWith("https://wa.me/919714568948?text=")).toBe(true);
    expect(wa.getAttribute("target")).toBe("_blank");
    expect(document.body.textContent).toMatch(/doubts, questions, suggestions/i);
  });

  it("shows the support email as a mailto link", () => {
    page();
    const mail = screen.getByRole("link", { name: "support@lazytopper.com" });
    expect(mail.getAttribute("href")).toBe("mailto:support@lazytopper.com");
  });

  it("names the legal entity from config", () => {
    page();
    expect(document.body.textContent).toContain(LEGAL_ENTITY_NAME);
  });

  it("sets an SEO title and description", () => {
    page();
    expect(document.title).toMatch(/Contact/);
    expect(document.title).toMatch(/LazyTopper/);
    const desc = document.querySelector('meta[name="description"]');
    expect(desc?.getAttribute("content") ?? "").toMatch(/WhatsApp/);
  });

  it("a WhatsApp tap records placement contact_page", () => {
    page();
    act(() => {
      screen.getByTestId("contact-whatsapp").click();
    });
    expect(tracked).toEqual(["contact_page"]);
  });
});
