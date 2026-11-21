import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import LegalPage from "./LegalPage";

/** WA-CONTACT-1 §4 — every legal page's "Contact us" block carries the WhatsApp line. */

afterEach(() => cleanup());

describe.each(["privacy", "terms", "refund"])("LegalPage /legal/%s", (slug) => {
  it("has the WhatsApp number in the contact block, linking to wa.me in a new tab", () => {
    render(
      <MemoryRouter initialEntries={[`/legal/${slug}`]}>
        <Routes>
          <Route path="/legal/:slug" element={<LegalPage />} />
        </Routes>
      </MemoryRouter>,
    );
    const line = screen.getByTestId("legal-whatsapp");
    expect(line.textContent).toMatch(/doubts, questions or suggestions/i);
    // Scoped to the contact line: the refund page also links the number inside its PDF/CBQ pack sections.
    const link = within(line).getByRole("link", { name: "+91 97145 68948" });
    expect(link.getAttribute("href")).toBe("https://wa.me/919714568948");
    expect(link.getAttribute("target")).toBe("_blank");
    // every WhatsApp link on the page is the same safe wa.me form
    for (const a of screen.getAllByRole("link", { name: "+91 97145 68948" })) {
      expect(a.getAttribute("href")).toBe("https://wa.me/919714568948");
      expect(a.getAttribute("target")).toBe("_blank");
      expect(a.getAttribute("rel")).toContain("noopener");
    }
    // the email line is still there
    expect(screen.getAllByRole("link", { name: "support@lazytopper.com" }).length).toBeGreaterThan(0);
  });
});
