/**
 * FREE-CHECK-1b · R12 — the privacy policy discloses reCAPTCHA Enterprise, immediately
 * after the Firebase Authentication sentence (P33), and NOT behind the flag: it is a
 * disclosure, not behaviour, so it renders with VITE_FREE_CHECK_ENABLED off.
 *
 * Mutation B9 (the sentence moved behind the flag) turns this file RED.
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

import LegalPage from "./LegalPage";

const R12 =
  "Our free answer check is protected by Google reCAPTCHA Enterprise, which sends device and interaction signals to Google to tell students from automated bots; Google's Privacy Policy and Terms of Service apply.";
const FIREBASE = "We use Firebase Authentication (Google) for secure sign-in.";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

function privacyText(): string {
  const { container } = render(
    <MemoryRouter initialEntries={["/legal/privacy"]}>
      <Routes>
        <Route path="/legal/:slug" element={<LegalPage />} />
      </Routes>
    </MemoryRouter>,
  );
  return (container.textContent ?? "").replace(/\s+/g, " ");
}

describe("R12 — the reCAPTCHA Enterprise disclosure", () => {
  it("renders with the free-check flag OFF (a disclosure, never gated)", () => {
    vi.stubEnv("VITE_FREE_CHECK_ENABLED", "");
    expect(privacyText()).toContain(R12);
  });

  it("sits IMMEDIATELY after the Firebase Authentication sentence", () => {
    expect(privacyText()).toContain(`${FIREBASE} ${R12} We do not sell your data to any third party.`);
  });

  it("appears once, and only on the privacy policy", () => {
    expect(privacyText().split(R12).length - 1).toBe(1);
    cleanup();
    const { container } = render(
      <MemoryRouter initialEntries={["/legal/terms"]}>
        <Routes>
          <Route path="/legal/:slug" element={<LegalPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(container.textContent ?? "").not.toContain("reCAPTCHA");
  });
});
