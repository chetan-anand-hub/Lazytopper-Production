// @vitest-environment jsdom
/**
 * SHW-2 (owner ruling, Oct 2026) - TYPE-FIRST DEFAULT. `defaultAnswerMode` picks only which of the two
 * always-visible answer tabs is selected at first. Undefined = today's "upload", byte-for-byte. A
 * signal that arrives late (loading -> known) may still move the tab, but never after the student
 * has touched the answer box.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

vi.mock("../../ai/aiClient", () => ({ checkSolutionImage: vi.fn() }));
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "u-dam", isLocalSession: false } }),
}));
vi.mock("../../hooks/useSubscription", () => ({
  useSubscription: () => ({
    tier: "premium", isPremium: true, isTrialActive: false, isTrialExpired: false, daysLeftInTrial: 0,
    status: { tier: "premium" }, startTrial: () => {}, upgradeToPremium: () => {},
  }),
}));
vi.mock("../../services/firebaseClient", () => ({ firestoreDb: null, firebaseConfigured: false, authClient: null, app: null }));
vi.mock("../qr/QrAnswerHandoff", () => ({ default: () => <div data-testid="qr-handoff" /> }));

import { SolutionChecker } from "./SolutionChecker";

const PROPS = { question: "Find the resistance.", marks: 3, subject: "Science", topic: "electricity", questionId: "dam-1" };
const selected = () =>
  screen.getAllByRole("tab").filter((t) => t.getAttribute("aria-selected") === "true").map((t) => t.textContent);

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("SHW-2 · SolutionChecker defaultAnswerMode", () => {
  it("★★ CONTROL: undefined -> Upload selected (today's default); both tabs present", () => {
    render(<SolutionChecker {...PROPS} />);
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Type my working", "Upload a photo"]);
    expect(selected()).toEqual(["Upload a photo"]);
  });

  it("★★ 'type' -> Type selected; both tabs still present", () => {
    render(<SolutionChecker {...PROPS} defaultAnswerMode="type" />);
    expect(screen.getAllByRole("tab")).toHaveLength(2);
    expect(selected()).toEqual(["Type my working"]);
  });

  it("★ 'upload' -> Upload selected", () => {
    render(<SolutionChecker {...PROPS} defaultAnswerMode="upload" />);
    expect(selected()).toEqual(["Upload a photo"]);
  });

  it("★★ the signal arrives late (undefined -> 'type') and the student has not touched it: Type", () => {
    const r = render(<SolutionChecker {...PROPS} />);
    expect(selected()).toEqual(["Upload a photo"]);
    r.rerender(<SolutionChecker {...PROPS} defaultAnswerMode="type" />);
    expect(selected()).toEqual(["Type my working"]);
  });

  it("★★ the student already picked a tab: a late signal never flips it", () => {
    const r = render(<SolutionChecker {...PROPS} />);
    fireEvent.click(screen.getByRole("tab", { name: "Upload a photo" }));
    r.rerender(<SolutionChecker {...PROPS} defaultAnswerMode="type" />);
    expect(selected()).toEqual(["Upload a photo"]);
  });
});
