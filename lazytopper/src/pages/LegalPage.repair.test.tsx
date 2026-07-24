import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import LegalPage from "./LegalPage";

/**
 * LegalPage repair (Lane C) — dead contact domain removed, hard reloads removed,
 * pages reachable and cross-linked.
 */
const src = readFileSync(resolve(process.cwd(), "src/pages/LegalPage.tsx"), "utf8");

afterEach(cleanup);

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/legal/:slug" element={<LegalPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("LegalPage — no dead domain (test 3)", () => {
  it("contains zero occurrences of the never-owned lazytopper.app domain", () => {
    expect(src).not.toMatch(/lazytopper\.app/);
  });
});

describe("LegalPage — no hard reload (test 4)", () => {
  it("contains no window.location.href navigation", () => {
    expect(src).not.toMatch(/window\.location\.href/);
  });
});

describe("LegalPage — reachable, on-grammar (Lane C)", () => {
  it("surfaces the support mailto and the three policy tabs", () => {
    renderAt("/legal/privacy");

    const mail = screen.getByRole("link", { name: "support@lazytopper.com" });
    expect(mail).toHaveAttribute("href", "mailto:support@lazytopper.com");

    // Policy tab chips cross-link every slug.
    expect(screen.getAllByRole("link", { name: "Privacy Policy" })[0]).toHaveAttribute("href", "/legal/privacy");
    expect(screen.getAllByRole("link", { name: "Terms of Service" })[0]).toHaveAttribute("href", "/legal/terms");
    expect(screen.getAllByRole("link", { name: "Refund Policy" })[0]).toHaveAttribute("href", "/legal/refund");
  });

  it("Back is a button (router history), not a hard-reload anchor", () => {
    renderAt("/legal/terms");
    const back = screen.getByRole("button", { name: /Back/ });
    expect(back.tagName).toBe("BUTTON");
    expect(back).not.toHaveAttribute("href");
  });

  it("drops the legacy palette (no #58cc02, no Nunito)", () => {
    expect(src).not.toMatch(/58cc02/i);
    expect(src).not.toMatch(/Nunito/i);
  });
});
