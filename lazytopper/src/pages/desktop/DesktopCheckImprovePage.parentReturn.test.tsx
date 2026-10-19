/**
 * PARENTS-CTA-1 — the "← Back to parents page" link on /check-improve, rendered.
 *
 * Shown ONLY when the visitor arrived with `?from=for_parents` (or earlier in this tab);
 * never in the tutor overlay; never for anyone else. Navigation only: the link goes to
 * /for-parents. Auth and the subscription are stubbed exactly as the sibling page tests do.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
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
    startTrial: () => {},
    upgradeToPremium: () => {},
    status: { tier: "free", plan: "none", trialStartDate: null, trialEndDate: null, premiumSince: null },
  },
  storageThrows: false,
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
// Only the back link's OWN storage is made to throw (the rest of the page has its own
// storage handling, which is not this lane's).
vi.mock("../../lib/parentReturn", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/parentReturn")>();
  const boom = () => {
    throw new Error("SecurityError");
  };
  return {
    ...actual,
    tabStorage: () => (H.storageThrows ? { getItem: boom, setItem: boom } : actual.tabStorage()),
  };
});

import DesktopCheckImprovePage from "./DesktopCheckImprovePage";
import { PARENT_RETURN_KEY } from "../../lib/parentReturn";

function renderAt(entry: string, props: { overlay?: { onClose: () => void } } = {}) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/check-improve" element={<DesktopCheckImprovePage {...props} />} />
        <Route path="/for-parents" element={<div data-testid="parents-probe">PARENTS</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

/** Wait until the page has rendered real content, so an absence check is not vacuous. */
async function settled(r: ReturnType<typeof renderAt>) {
  await waitFor(() => expect(r.container.textContent?.trim().length ?? 0).toBeGreaterThan(0));
}

beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
  // The real parent case: signed out, the free check on (as in production).
  vi.stubEnv("VITE_FREE_CHECK_ENABLED", "true");
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  window.sessionStorage.clear();
  H.storageThrows = false;
});

describe("PARENTS-CTA-1 — /check-improve back link to the parents page", () => {
  it("renders with ?from=for_parents, links to /for-parents, and remembers the flag for the tab", async () => {
    renderAt("/check-improve?from=for_parents&utm_source=for_parents");
    const link = await screen.findByTestId("ci-parent-return");
    expect(link.textContent).toBe("← Back to parents page");
    expect(link.getAttribute("href")).toBe("/for-parents");
    expect(window.sessionStorage.getItem(PARENT_RETURN_KEY)).toBe("1");
    expect(window.localStorage.getItem(PARENT_RETURN_KEY)).toBeNull();
    fireEvent.click(link);
    expect(await screen.findByTestId("parents-probe")).toBeTruthy();
  });

  it("is absent without the flag (a plain visit, and a parent_share WhatsApp visit)", async () => {
    await settled(renderAt("/check-improve"));
    expect(screen.queryByTestId("ci-parent-return")).toBeNull();
    cleanup();
    await settled(renderAt("/check-improve?utm_source=parent_share&utm_medium=whatsapp"));
    expect(screen.queryByTestId("ci-parent-return")).toBeNull();
    expect(window.sessionStorage.getItem(PARENT_RETURN_KEY)).toBeNull();
  });

  it("survives a reload of the tab without the query string", async () => {
    renderAt("/check-improve?from=for_parents");
    cleanup();
    renderAt("/check-improve");
    expect(await screen.findByTestId("ci-parent-return")).toBeTruthy();
  });

  it("never renders inside the tutor overlay", async () => {
    H.sub.isPremium = true;
    H.auth = { user: { uid: "u1", email: null, phoneNumber: "+919000000000", displayName: null }, loading: false };
    try {
      await settled(renderAt("/check-improve?from=for_parents", { overlay: { onClose: () => {} } }));
      expect(screen.queryByTestId("ci-parent-return")).toBeNull();
    } finally {
      H.sub.isPremium = false;
      H.auth = { user: null, loading: false };
    }
  });

  it("does not break the page when sessionStorage throws", async () => {
    H.storageThrows = true;
    renderAt("/check-improve?from=for_parents");
    expect(await screen.findByTestId("ci-parent-return")).toBeTruthy();
    cleanup();
    await settled(renderAt("/check-improve"));
    expect(screen.queryByTestId("ci-parent-return")).toBeNull();
  });
});
