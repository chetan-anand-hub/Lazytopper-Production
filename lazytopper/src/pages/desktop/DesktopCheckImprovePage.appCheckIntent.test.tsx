/**
 * BANK-SPLIT-1 PR-2 (T1) — App Check / reCAPTCHA is warmed on the visitor's FIRST INTENT,
 * not on mount.
 *
 * Live baseline (ffc586c0): a signed-out visit to /app/check-improve downloaded reCAPTCHA
 * (~985 KB decoded / ~424 KB transferred) before any interaction, because the page called
 * ensureFreeCheckAppCheck() in a mount effect. Now the warm-up fires when the visitor
 * focuses the answer box or opens the camera / file picker. A request made with no intent
 * at all is still attested (freeCheckClient.appCheckOnRequest.test.ts).
 *
 * Mutation this file turns RED: re-adding the warm-up on mount.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

const H = vi.hoisted(() => ({
  auth: { user: null as null | Record<string, unknown>, loading: false },
  sub: {
    isPremium: false,
    isTrialExpired: false,
    hydrated: true,
    tier: "free",
    isTrialActive: false,
    daysLeftInTrial: 0,
    startTrial: vi.fn(),
    upgradeToPremium: vi.fn(),
    status: { tier: "free", plan: "none", trialStartDate: null, trialEndDate: null, premiumSince: null },
  },
  ensure: vi.fn(),
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => H.auth,
}));
vi.mock("../../hooks/useSubscription", () => ({
  useSubscription: () => H.sub,
}));
vi.mock("../../hooks/useFreeCheckReturn", () => ({
  useFreeCheckReturn: () => "none",
}));
vi.mock("../../services/freeCheckClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/freeCheckClient")>();
  return { ...actual, ensureFreeCheckAppCheck: (...a: unknown[]) => H.ensure(...a) };
});

import DesktopCheckImprovePage from "./DesktopCheckImprovePage";

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/check-improve"]}>
      <Routes>
        <Route path="/check-improve" element={<DesktopCheckImprovePage />} />
        <Route path="/login" element={<div data-testid="login-probe">LOGIN</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

/** Let every mount effect and pending microtask run. */
async function settle() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 20));
  });
}

beforeEach(() => {
  window.localStorage.clear();
  H.auth = { user: null, loading: false };
  H.ensure.mockReset().mockResolvedValue(null);
  vi.stubEnv("VITE_FREE_CHECK_ENABLED", "true");
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("T1 — the App Check warm-up waits for the visitor's first intent", () => {
  it("★ signed-out free check: NOTHING is warmed on mount", async () => {
    renderPage();
    expect(await screen.findByLabelText("Type the question")).toBeInTheDocument();
    await settle();
    expect(H.ensure).not.toHaveBeenCalled();
  });

  it("typing the QUESTION is not an intent; focusing the ANSWER box warms it", async () => {
    renderPage();
    const q = await screen.findByLabelText("Type the question");
    fireEvent.change(q, { target: { value: "Find the 10th term of the AP 3, 7, 11." } });
    await settle();
    expect(H.ensure).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Type answer" }));
    await settle();
    expect(H.ensure).not.toHaveBeenCalled();
    const answer = screen.getByLabelText("Type your answer");
    act(() => {
      answer.focus();
    });
    expect(H.ensure).toHaveBeenCalled();
  });

  it("opening the answer file picker warms it", async () => {
    renderPage();
    await screen.findByLabelText("Type the question");
    fireEvent.click(screen.getByRole("button", { name: "Upload image" }));
    await settle();
    expect(H.ensure).not.toHaveBeenCalled();
    const input = document.querySelector('input[type="file"][accept="image/jpeg,image/png,application/pdf"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    fireEvent.click(input);
    expect(H.ensure).toHaveBeenCalled();
  });

  it("a signed-in student (not the free check) never warms App Check", async () => {
    H.auth = { user: { uid: "u1", email: null, phoneNumber: "+919000000000", displayName: null }, loading: false };
    H.sub.isPremium = true;
    try {
      renderPage();
      await settle();
      const answerTab = screen.queryByRole("button", { name: "Type answer" });
      if (answerTab) {
        fireEvent.click(answerTab);
        act(() => {
          screen.getByLabelText("Type your answer").focus();
        });
      }
      expect(H.ensure).not.toHaveBeenCalled();
    } finally {
      H.sub.isPremium = false;
    }
  });
});
