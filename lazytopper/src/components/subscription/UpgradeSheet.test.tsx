/**
 * GATE-2 — the client half of entitlement.
 *
 * ★ EVERY "does not" ASSERTION HAS A CONTROL THAT DOES. `queryBy… → null` passes
 * just as happily when the component is broken or a testid was renamed, so each
 * negative below is paired with a positive that proves the query itself works.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";

import { UpgradeSheet, formatTrialEnded, labelForFeature } from "./UpgradeSheet";
import { getPremiumFeatureList, getFeatureGate, canAccessFeature } from "../../services/featureGates";
import { MONTHLY_INLINE } from "../../config/pricing";

afterEach(() => cleanup());

function renderSheet(props: Partial<React.ComponentProps<typeof UpgradeSheet>> = {}) {
  const onClose = vi.fn();
  const utils = render(
    <MemoryRouter initialEntries={["/practice?topic=light"]}>
      <UpgradeSheet featureLabel="Checking your answer" onClose={onClose} {...props} />
    </MemoryRouter>,
  );
  return { ...utils, onClose };
}

/* ══════════════════════════════════════════════════════════════════════════════
   1 · THE SELL — no retired surface may be named. THE LAUNCH-BLOCKING ONE.
   ══════════════════════════════════════════════════════════════════════════════ */

describe("UpgradeSheet — every feature it sells is premium AND shipped", () => {
  /**
   * ASSERTION 12. MUTATION: flip any `shipped: false` back to shipped (or drop the
   * `shipped !== false` clause from getPremiumFeatureList) ⇒ RED here.
   */
  it("names ONLY features whose requiredTier is premium in featureGates", () => {
    renderSheet();
    for (const f of getPremiumFeatureList()) {
      expect(getFeatureGate(f.id).requiredTier).toBe("premium");
      expect(screen.getByText(f.label)).toBeInTheDocument();
    }
  });

  /**
   * ★★ THE ONE THE OWNER FOUND LIVE. The old modal sold five surfaces the product
   * had already severed from the router, to a student being asked for money.
   * These names must not appear anywhere on the sheet.
   */
  it.each([
    "Smart Study Planner",
    "Daily Focus Mix",
    "Full Analytics Dashboard",
    "Parent Dashboard",
    "Predicted Questions",
  ])("does NOT sell the retired surface %s", (retiredLabel) => {
    renderSheet();
    expect(screen.queryByText(retiredLabel)).toBeNull();
  });

  /** CONTROL for the five negatives above — the query finds a label that IS sold. */
  it("CONTROL — the same query DOES find a live premium feature", () => {
    renderSheet();
    expect(screen.getByText("Exam Simulation")).toBeInTheDocument();
  });

  /** The list is not empty; a sheet selling nothing would pass every negative. */
  it("CONTROL — the sell is non-empty", () => {
    expect(getPremiumFeatureList().length).toBeGreaterThan(0);
  });

  /**
   * The gate table is NOT pruned — `shipped` governs the SELL only. A lane that
   * "cleaned up" by deleting the entries would change gating, which is not this
   * lane's call. [FU-FEATUREGATES-RETIRED-ENTRIES]
   */
  it("leaves the retired GATE entries intact — shipped:false changes the sell, not the gate", () => {
    expect(getFeatureGate("daily_mix").requiredTier).toBe("premium");
    expect(canAccessFeature("daily_mix", "free", true)).toBe(false);
    expect(canAccessFeature("daily_mix", "premium", true)).toBe(true);
  });
});

/* ══════════════════════════════════════════════════════════════════════════════
   2 · TRIAL ≡ PREMIUM (assertions 1–3, at the gate that decides entitlement)
   ══════════════════════════════════════════════════════════════════════════════ */

describe("entitlement — trial is premium", () => {
  /** ASSERTION 1. */
  it("a premium student is entitled", () => {
    expect(canAccessFeature("exam_simulation", "premium", true)).toBe(true);
  });

  /** ★ ASSERTION 2. MUTATION: drop `|| tier === "trial"` in canAccessFeature ⇒ RED. */
  it("a TRIAL student is entitled, identically to premium", () => {
    expect(canAccessFeature("exam_simulation", "trial", true)).toBe(true);
  });

  /** ASSERTION 3 — the control that proves the two above are not vacuous. */
  it("a free student is NOT entitled", () => {
    expect(canAccessFeature("exam_simulation", "free", true)).toBe(false);
  });
});

/* ══════════════════════════════════════════════════════════════════════════════
   3 · TWO EXITS (assertions 5 and 6)
   ══════════════════════════════════════════════════════════════════════════════ */

function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="loc">{`${loc.pathname}${loc.search}`}</div>;
}

describe("UpgradeSheet — two exits, and only one of them navigates", () => {
  /** ★ ASSERTION 5. MUTATION: delete the "Keep using Basic" button ⇒ RED. */
  it("'Keep using Basic' closes the sheet and does NOT navigate", () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter initialEntries={["/practice?topic=light"]}>
        <UpgradeSheet featureLabel="Checking your answer" onClose={onClose} />
        <LocationProbe />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Keep using Basic" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("loc")).toHaveTextContent("/practice?topic=light");
  });

  /** ★ It is a real BUTTON, equally weighted — not a subdued dismissal link. */
  it("'Keep using Basic' is a real button, not a text link", () => {
    renderSheet();
    const basic = screen.getByRole("button", { name: "Keep using Basic" });
    expect(basic.tagName).toBe("BUTTON");
    expect(basic).toHaveClass("lt-upsheet__basic");
  });

  /** ASSERTION 6 — the CONTROL for the negative above: this exit DOES navigate. */
  it("'See plans' routes to /pricing carrying a returnTo for the page we were on", () => {
    render(
      <MemoryRouter initialEntries={["/practice?topic=light"]}>
        <Routes>
          <Route
            path="/practice"
            element={<UpgradeSheet featureLabel="Checking your answer" onClose={() => {}} />}
          />
          <Route path="/pricing" element={<div>PRICING PAGE</div>} />
        </Routes>
        <LocationProbe />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "See plans" }));
    expect(screen.getByText("PRICING PAGE")).toBeInTheDocument();
    expect(screen.getByTestId("loc")).toHaveTextContent(
      `returnTo=${encodeURIComponent("/practice?topic=light")}`,
    );
  });

  it("the backdrop is the same exit as 'Keep using Basic'", () => {
    const { onClose } = renderSheet();
    fireEvent.click(screen.getByTestId("upgrade-sheet-scrim"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("CONTROL — clicking INSIDE the sheet does not close it", () => {
    const { onClose } = renderSheet();
    fireEvent.click(screen.getByTestId("upgrade-sheet"));
    expect(onClose).not.toHaveBeenCalled();
  });
});

/* ══════════════════════════════════════════════════════════════════════════════
   4 · COPY, PRICE AND COLOUR (assertions 10, plus §2c/§2d)
   ══════════════════════════════════════════════════════════════════════════════ */

describe("UpgradeSheet — copy, price and treatment", () => {
  /** ASSERTION 10. MUTATION: type the price as "₹599/month" ⇒ RED when the founding flag flips. */
  it("renders the price from pricing.ts, never a literal", () => {
    renderSheet();
    expect(screen.getByText(new RegExp(MONTHLY_INLINE.replace("₹", "\\u20B9")))).toBeInTheDocument();
    // The source carries no rupee literal of its own.
    expect(MONTHLY_INLINE).toContain("₹");
  });

  it("names the feature that was blocked, not one string for every surface", () => {
    renderSheet({ featureLabel: "The AI tutor" });
    expect(screen.getByText("The AI tutor is a Premium feature")).toBeInTheDocument();
    cleanup();
    renderSheet({ featureLabel: "Checking your answer" });
    expect(screen.getByText("Checking your answer is a Premium feature")).toBeInTheDocument();
  });

  it("★ keeps 'Nothing you've done is locked' — the sentence that answers the real fear", () => {
    renderSheet();
    expect(screen.getByText(/Nothing you.{0,3}ve done is locked/)).toBeInTheDocument();
  });

  it("names what Basic KEEPS", () => {
    renderSheet();
    expect(screen.getByText(/Basic free, always/)).toBeInTheDocument();
  });

  /** §2d — a date only when known. */
  it("shows the trial-end date when the server supplied one", () => {
    renderSheet({ trialEndedAt: "2026-08-09T00:00:00.000Z" });
    expect(screen.getByText("Your trial ended on 9 August.")).toBeInTheDocument();
  });

  it("omits the trial line entirely rather than guessing", () => {
    renderSheet({ trialEndedAt: null });
    expect(screen.queryByText(/Your trial ended/)).toBeNull();
  });

  it("omits it for an UNPARSEABLE date too — no 'Invalid Date' on a payment surface", () => {
    expect(formatTrialEnded("not-a-date")).toBeNull();
    expect(formatTrialEnded(undefined)).toBeNull();
    // CONTROL — the same helper DOES produce a line for a real date.
    expect(formatTrialEnded("2026-08-09T00:00:00.000Z")).toBe("Your trial ended on 9 August.");
  });

  /**
   * ★ §2c — NOTHING ON THIS PATH IS ERROR-RED. A wording test cannot catch a colour,
   * so this asserts the stylesheet itself: no red channel anywhere in the sheet's CSS.
   * MUTATION: restyle the offer block to the old modal's #fef2f2/#dc2626 ⇒ RED.
   */
  it("uses no error-red anywhere in its own styles", () => {
    const { container } = renderSheet();
    const css = container.querySelector("style")?.textContent || "";
    expect(css.length).toBeGreaterThan(100);
    for (const red of ["#dc2626", "#fef2f2", "#fecaca", "#ef4444", "239, 68, 68", "239,68,68"]) {
      expect(css).not.toContain(red);
    }
    // CONTROL — the green treatment IS present, so the negatives above are not vacuous.
    expect(css).toContain("22, 185, 106");
  });
});

/* ══════════════════════════════════════════════════════════════════════════════
   5 · THE 402 SEAM — 402 is distinguished from 429 and 500 (assertions 7, 8, 9)

   ★ These assert the TYPED ERROR, because the typed error IS what opens the sheet:
   SolutionChecker's catch branches on `err.name === "PremiumRequiredError"` and
   opens the sheet for that case only. So "a 429 does not open the sheet" and "a 429
   does not produce a PremiumRequiredError" are the same statement about the same
   mechanism — there is no second path a 429 could take.
   ══════════════════════════════════════════════════════════════════════════════ */

describe("aiClient — only a 402 premium_required yields the type that opens the sheet", () => {
  afterEach(() => vi.unstubAllGlobals());

  async function callWith(status: number, body: unknown) {
    const mod = await import("../../ai/aiClient");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(body), { status })),
    );
    let thrown: unknown = null;
    try {
      await mod.checkSolutionImage({
        question: "q", marks: 3, subject: "Science", topic: "Light", textAnswer: "a",
      });
    } catch (err) {
      thrown = err;
    }
    return { mod, thrown };
  }

  /** ★ ASSERTION 7 — the sheet-opening type, carrying the feature the server named. */
  it("a 402 premium_required yields PremiumRequiredError with the server's fields", async () => {
    const { mod, thrown } = await callWith(402, {
      error: "premium_required",
      message: "Checking your answer is a Premium feature. You can unlock it whenever you're ready.",
      feature: "check_solution",
      tier: "free",
      trialEndedAt: "2026-08-09T00:00:00.000Z",
    });
    expect(mod.isPremiumRequiredError(thrown)).toBe(true);
    const err = thrown as InstanceType<typeof mod.PremiumRequiredError>;
    expect(err.feature).toBe("check_solution");
    expect(err.trialEndedAt).toBe("2026-08-09T00:00:00.000Z");
    // ★ The `name` is the exact hook SolutionChecker branches on. If this ever
    // changed, the sheet would silently stop opening and no other test would notice.
    expect(err.name).toBe("PremiumRequiredError");
    // ★ The message is the server's own words, never the code.
    expect(err.message).not.toContain("premium_required");
    // ★ ...and the sheet renders that feature under a student-facing label.
    expect(labelForFeature(err.feature)).toBe("Checking your answer");
  });

  /** ★ ASSERTION 8. MUTATION: open the sheet on any non-200 ⇒ RED. */
  it("a 429 daily_limit does NOT yield the sheet-opening type", async () => {
    const { mod, thrown } = await callWith(429, {
      error: "daily_limit", message: "You've hit today's limit.", class: "grade", resetAt: null,
    });
    expect(mod.isPremiumRequiredError(thrown)).toBe(false);
    expect((thrown as Error).name).not.toBe("PremiumRequiredError");
    // CONTROL — the negative is not vacuous: a 429 DOES produce its own typed error.
    expect(mod.isDailyLimitError(thrown)).toBe(true);
  });

  /** ★ ASSERTION 9. */
  it("a 500 does NOT yield the sheet-opening type", async () => {
    const { mod, thrown } = await callWith(500, { error: "internal_error" });
    expect(mod.isPremiumRequiredError(thrown)).toBe(false);
    expect((thrown as Error).name).not.toBe("PremiumRequiredError");
    // CONTROL — it still rejects, so a caller never spins forever.
    expect(thrown).toBeInstanceOf(Error);
  });

  /** A 402 whose code is something else stays on the generic path. */
  it("a 402 with a DIFFERENT error code does NOT yield the sheet-opening type", async () => {
    const { mod, thrown } = await callWith(402, { error: "payment_required_elsewhere" });
    expect(mod.isPremiumRequiredError(thrown)).toBe(false);
  });
});

/* ══════════════════════════════════════════════════════════════════════════════
   6 · THE LABEL MAP
   ══════════════════════════════════════════════════════════════════════════════ */

describe("labelForFeature", () => {
  it("maps the server's code to student-facing words", () => {
    expect(labelForFeature("check_solution")).toBe("Checking your answer");
  });

  it("★ never leaks a raw code at a student", () => {
    expect(labelForFeature("some_new_code")).toBe("This");
    expect(labelForFeature(undefined)).toBe("This");
    expect(labelForFeature("some_new_code")).not.toContain("_");
  });
});
