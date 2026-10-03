/**
 * FRICTION-FIX-1 · F4 + F5 (panel side).
 *
 * F4 (FU-TRIAL-WORDING-SEE-PLANS-FREECHECK) — "See plans →" to /pricing in the 'used'
 * panel and the R9 trial offer. Mounted under the app's ALWAYS-PRESENT outer router — the
 * same <BrowserRouter basename="/app"> main.tsx wraps everything in — and asserted by
 * OUTCOME: the href the student gets, and the route a click lands on. The CONTROL case
 * renders a link with a typed `/app/` prefix in the same harness and shows it doubles the
 * basename, so this harness can tell a router-relative link from a hard-coded one.
 *
 * F5 — "Check my next answer" on the T2 confirmation clears the sign-up marker (and its
 * sessionStorage mirror) before handing control back to the page.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import type { ReactElement } from "react";

vi.mock("../../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../analytics/analytics")>();
  return { ...actual, trackNamedEvent: vi.fn() };
});

const marker = vi.hoisted(() => ({ clear: vi.fn() }));
vi.mock("../../services/newAccountTrial", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/newAccountTrial")>();
  return {
    ...actual,
    clearTrialStartedAtSignUp: () => {
      marker.clear();
      actual.clearTrialStartedAtSignUp();
    },
  };
});

import {
  FreeCheckTrialConfirmation,
  FreeCheckTrialOffer,
  FreeCheckUsedPanel,
} from "./FreeCheckPanels";
import { SIGNUP_TRIAL_MARKER_PREFIX } from "../../services/newAccountTrial";

/** The app's outer router, exactly as main.tsx mounts it, with the page under its route. */
function mountInApp(ui: ReactElement) {
  window.history.pushState({}, "", "/app/check-improve");
  return render(
    <BrowserRouter basename="/app">
      <Routes>
        <Route path="/check-improve" element={ui} />
        <Route path="/pricing" element={<p>PRICING PAGE</p>} />
      </Routes>
    </BrowserRouter>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  marker.clear.mockReset();
});
afterEach(() => {
  cleanup();
  window.history.pushState({}, "", "/");
});

const PANELS: Array<[string, () => ReactElement, string]> = [
  ["the 'used' panel", () => <FreeCheckUsedPanel />, "free-check-used-see-plans"],
  [
    "the R9 trial offer",
    () => <FreeCheckTrialOffer endsOn="10 October 2026" onStartTrial={vi.fn()} onMaybeLater={vi.fn()} />,
    "free-check-offer-see-plans",
  ],
];

describe("F4 — 'See plans →' under the app's outer router", () => {
  for (const [name, make, testId] of PANELS) {
    it(`${name}: the link reads 'See plans →' and points at /app/pricing (basename once)`, () => {
      mountInApp(make());
      const link = screen.getByTestId(testId);
      expect(link.textContent).toBe("See plans →");
      expect(link.getAttribute("href")).toBe("/app/pricing");
    });

    it(`${name}: a click lands on the /pricing route`, () => {
      mountInApp(make());
      fireEvent.click(screen.getByTestId(testId));
      expect(screen.getByText("PRICING PAGE")).toBeInTheDocument();
      expect(window.location.pathname).toBe("/app/pricing");
    });
  }

  it("CONTROL — a typed /app/ prefix in this harness doubles the basename (the defect it would catch)", () => {
    mountInApp(
      <Link to="/app/pricing" data-testid="control-link">
        See plans →
      </Link>,
    );
    expect(screen.getByTestId("control-link").getAttribute("href")).toBe("/app/app/pricing");
  });

  it("the panels' source types no /app/ prefix", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const src = readFileSync(resolve(process.cwd(), "src/components/checkimprove/FreeCheckPanels.tsx"), "utf8");
    expect(src).not.toMatch(/["'`]\/app\//);
  });
});

describe("F5 — continuing past the confirmation clears the sign-up marker", () => {
  it("'Check my next answer' clears the marker (memory + this tab's sessionStorage), then continues", () => {
    window.sessionStorage.setItem(`${SIGNUP_TRIAL_MARKER_PREFIX}u-new`, "1");
    window.sessionStorage.setItem("unrelated.key", "keep");
    const onContinue = vi.fn();
    mountInApp(<FreeCheckTrialConfirmation endsOn="10 October 2026" onContinue={onContinue} />);
    expect(marker.clear).not.toHaveBeenCalled(); // mounting clears nothing
    fireEvent.click(screen.getByRole("button", { name: "Check my next answer" }));
    expect(marker.clear).toHaveBeenCalledTimes(1);
    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(window.sessionStorage.getItem(`${SIGNUP_TRIAL_MARKER_PREFIX}u-new`)).toBeNull();
    expect(window.sessionStorage.getItem("unrelated.key")).toBe("keep");
  });
});
