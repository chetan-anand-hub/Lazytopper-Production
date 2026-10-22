/**
 * MOMENTS-1 M10 — on the REAL NCERT solutions page (signed out): only AFTER a student's "Check"
 * says the answer MATCHES does Byte peek in at the corner — "Got it right? See which step loses
 * marks. First check free." with "Check my answer" → /check-improve. The public peek's arm rule
 * (device arm); never before a matching check, never after a wrong one, never in the control arm,
 * and never while the free check is off ("First check free" must be true).
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, act, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Suspense } from "react";

vi.mock("../services/firebaseClient", () => ({ authClient: null }));

import SolutionsPage from "./SolutionsPage";
import { ensureBankChapters } from "../data/bankChapters/loader";
import { __setGuideAbForTests } from "../components/guide/guideVariant";
import { __resetSolutionMatchedForTests } from "../components/guide/moments/moments";
import { GUIDE_PUBLIC_ARM_KEY, __resetPublicArmForTests } from "../components/guide/public/publicPeekModel";
import { __resetMascotsForTests } from "../components/guide/mascotsMute";

const ROW = "tri-n-ncert-6-sa-001"; // a typed row opted in for a value verdict; key "EC = 2 cm."
const LINE = "Got it right? See which step loses marks. First check free.";

function mount() {
  return render(
    <MemoryRouter initialEntries={["/ncert-solutions/triangles"]}>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/ncert-solutions/:chapter" element={<SolutionsPage />} />
          <Route path="*" element={null} />
        </Routes>
      </Suspense>
    </MemoryRouter>,
  );
}
async function check(view: ReturnType<typeof mount>, typed: string) {
  await screen.findByTestId("ncert-solutions-page");
  const input = view.container.querySelector<HTMLInputElement>(`#ncs-in-${ROW}`)!;
  fireEvent.change(input, { target: { value: typed } });
  fireEvent.submit(input.closest("form")!);
}

beforeAll(async () => {
  await ensureBankChapters(["triangles"]);
});
beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  __resetMascotsForTests();
  __resetPublicArmForTests();
  __resetSolutionMatchedForTests();
  __setGuideAbForTests(true);
  vi.stubEnv("VITE_FREE_CHECK_ENABLED", "true");
  window.localStorage.setItem(GUIDE_PUBLIC_ARM_KEY, "guide");
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  __setGuideAbForTests(null);
});

describe("MOMENTS-1 M10 · the NCERT solutions page", () => {
  it("★★ nothing before a check; a MATCHING check → Byte peeks in with the owner's line and 'Check my answer'", async () => {
    const view = mount();
    await screen.findByTestId("ncert-solutions-page");
    await act(async () => {});
    expect(screen.queryByTestId("guide-moment-m10")).toBeNull();
    await check(view, "EC = 2 cm.");
    expect(await screen.findByText("✓ Your answer matches.")).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId("guide-moment-m10")).toBeTruthy());
    expect(screen.getByTestId("guide-moment-m10").textContent).toContain(LINE);
    expect(screen.getByTestId("guide-moment-m10-cta").getAttribute("href")).toBe("/check-improve");
    expect(screen.getByTestId("mascots-hide")).toBeTruthy();
  });

  it("★★ a WRONG check → no Byte", async () => {
    const view = mount();
    await check(view, "EC = 7 cm.");
    await screen.findByText(/Your answer: EC = 7 cm/);
    await act(async () => {});
    expect(screen.queryByTestId("guide-moment-m10")).toBeNull();
  });

  it("★★ CONTROL device arm: a matching check → no Byte", async () => {
    window.localStorage.setItem(GUIDE_PUBLIC_ARM_KEY, "control");
    const view = mount();
    await check(view, "EC = 2 cm.");
    await screen.findByText("✓ Your answer matches.");
    await act(async () => {});
    expect(screen.queryByTestId("guide-moment-m10")).toBeNull();
    expect(screen.queryByText(LINE)).toBeNull();
  });

  it("★ the free check off → 'First check free' would be untrue → no Byte", async () => {
    vi.stubEnv("VITE_FREE_CHECK_ENABLED", "");
    const view = mount();
    await check(view, "EC = 2 cm.");
    await screen.findByText("✓ Your answer matches.");
    await act(async () => {});
    expect(screen.queryByTestId("guide-moment-m10")).toBeNull();
  });
});
