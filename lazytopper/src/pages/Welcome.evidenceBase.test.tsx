import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// [FU-EVIDENCE-BASE-CLAIM-INCONSISTENT] — the landing page must not show a competing
// "evidence base" number. The ExamTrends preview card's caption sat above a DECORATIVE
// 5-row grid (years 2024–2020, dot colours from index arithmetic — no real weightage),
// yet read "Last 5 years pattern" — a stray number competing with "ten years of papers"
// stated elsewhere. Owner ruling: drop the number → "Board paper pattern".
//
// This reads the RENDERED landing page (not a re-stated constant): it renders the real
// Welcome and asserts against the actual DOM. Reverting Welcome.tsx:1867 back to
// "Last 5 years pattern" turns BOTH tests red (mutation-verified) — the whole point.
//
// A landing-page visitor is signed out; useAuth is the page's only non-router dependency.
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: null }) }));

import Welcome from "./Welcome";

afterEach(() => cleanup());

function renderWelcome() {
  return render(
    <MemoryRouter>
      <Welcome />
    </MemoryRouter>,
  );
}

describe("Welcome — ExamTrends caption carries no competing evidence-base number", () => {
  it("renders the numberless 'Board paper pattern' caption", () => {
    renderWelcome();
    expect(screen.getByText("Board paper pattern")).toBeInTheDocument();
  });

  it("renders NO 'Last 5 years' number claim on the live landing surface", () => {
    renderWelcome();
    // Matches "Last 5 years pattern" and any "last 5 years" / "5 years pattern" variant.
    expect(screen.queryByText(/last\s*5\s*years|5\s*years\s*pattern/i)).toBeNull();
  });
});
