// ALL-AI-METERING-1 (DECISION 29d) - the free-tier More-like-this note renders the owner copy and a
// working internal trial link; no reset time, no error code.
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MoreLikeThisPremiumNote from "./MoreLikeThisPremiumNote";

describe("MoreLikeThisPremiumNote", () => {
  it("★★ shows the approved sentence and a 'Start free trial' link to /pricing (no /app prefix)", () => {
    render(
      <MemoryRouter>
        <MoreLikeThisPremiumNote onDismiss={() => {}} />
      </MemoryRouter>,
    );
    expect(screen.getByText("More practice like this is part of Premium. Try it free for 7 days.")).toBeTruthy();
    const link = screen.getByRole("link", { name: "Start free trial" });
    expect(link.getAttribute("href")).toBe("/pricing");
    expect(document.body.textContent ?? "").not.toMatch(/premium_required|resets|midnight/i);
  });
});
