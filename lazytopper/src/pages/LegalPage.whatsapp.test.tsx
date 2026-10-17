import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
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
    const link = screen.getByRole("link", { name: "+91 97145 68948" });
    expect(link.getAttribute("href")).toBe("https://wa.me/919714568948");
    expect(link.getAttribute("target")).toBe("_blank");
    // the email line is still there
    expect(screen.getAllByRole("link", { name: "support@lazytopper.com" }).length).toBeGreaterThan(0);
  });
});
