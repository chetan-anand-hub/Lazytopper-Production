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
import { PREMIUM_PLUS } from "../../config/pricingCompare";
import TutorErrorView from "../../pages/tutor/TutorErrorView";
import { boardPassOffer } from "../pricing/boardPassOffer";
import { predictCbseExamDate } from "../../services/cbseExamDate";
import { boardPassPriceDisplay } from "../../config/pricing";
import FairUseLimitPanel from "../usage/FairUseLimitPanel";
import { limitCopy, limitFromRefusal, type LimitState } from "../usage/fairUseGate";
import { isPremiumRequiredRefusal, isTrialLimitRefusal, paperPackLine, type PaperPackLine } from "../limits/limitsCopy";

// PRICING-1 — the sheet reads the student's own founding flag; the hook is stubbed so these tests
// need no auth provider, and each test sets what the "student" is.
const subState = vi.hoisted(() => ({
  foundingMember: undefined as boolean | undefined,
  tier: "free" as string,
  trialStartDate: null as string | null,
  hydrated: true,
  uid: "u1" as string,
}));
vi.mock("../../hooks/useSubscription", () => ({
  useSubscription: () => ({
    hydrated: subState.hydrated,
    status: { foundingMember: subState.foundingMember, tier: subState.tier, trialStartDate: subState.trialStartDate },
  }),
}));
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: subState.uid ? { uid: subState.uid } : null, loading: false }),
}));
const trialSvc = vi.hoisted(() => ({ activateTrial: vi.fn() }));
vi.mock("../../services/subscriptionService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/subscriptionService")>();
  return {
    ...actual,
    activateTrial: trialSvc.activateTrial,
  };
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  subState.foundingMember = undefined;
  subState.tier = "free";
  subState.trialStartDate = null;
  subState.hydrated = true;
  subState.uid = "u1";
  trialSvc.activateTrial.mockClear();
});

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
  it("sells exactly the benefit list /pricing shows for Premium (one shared source)", () => {
    renderSheet();
    for (const item of PREMIUM_PLUS) expect(screen.getByText(item.label)).toBeInTheDocument();
    expect(document.querySelectorAll(".lt-upsheet__list li")).toHaveLength(PREMIUM_PLUS.length);
  });

  it.each(["Unlimited Mock Tests", "Exam Simulation", "Chapter Hub (AI Tutor)", "Weak Area Practice"])(
    "the dated gate-table label %s is gone from the sheet",
    (old) => {
      renderSheet();
      expect(screen.queryByText(old)).toBeNull();
    },
  );

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
  it("CONTROL — the same query DOES find a live benefit", () => {
    renderSheet();
    expect(screen.getByText("Your AI tutor that knows your chapters, your mistakes, your pace")).toBeInTheDocument();
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
  /** ★ ASSERTION 5. MUTATION: delete the "Continue with Basic" exit ⇒ RED. */
  it("'Continue with Basic' closes the sheet and does NOT navigate", () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter initialEntries={["/practice?topic=light"]}>
        <UpgradeSheet featureLabel="Checking your answer" onClose={onClose} />
        <LocationProbe />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Continue with Basic" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("loc")).toHaveTextContent("/practice?topic=light");
  });

  /** LOCK-SELL-1 (owner, 4 Nov 2026): Basic is ONE quiet way out at the bottom, after the Board Pass - not a rival button. */
  it("'Continue with Basic' is the quiet dismiss, the last control in the sheet", () => {
    renderSheet();
    const basic = screen.getByRole("button", { name: "Continue with Basic" });
    expect(basic.tagName).toBe("BUTTON");
    expect(basic).toHaveClass("lt-upsheet__dismiss");
    expect(screen.queryByRole("button", { name: "Keep using Basic" })).toBeNull();
    const buttons = screen.getByTestId("upgrade-sheet").querySelectorAll("button");
    expect(buttons[buttons.length - 1]).toBe(basic);
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

  it("the backdrop is the same exit as 'Continue with Basic'", () => {
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
  /** ASSERTION 10. MUTATION: type the price as a literal in the component => the pricing guard goes RED. */
  it("renders the Board Pass price from pricing.ts, never a literal - and no month price", () => {
    renderSheet();
    const sheet = screen.getByTestId("upgrade-sheet-board-pass");
    expect(sheet.textContent).toContain(boardPassPriceDisplay());
    expect(boardPassPriceDisplay()).toContain("\u20B9");
    expect(document.querySelector(".lt-upsheet")?.textContent ?? "").not.toMatch(/599|999|for a month/);
  });

  it("PRICE-FIXED-1 - the Board Pass price follows the DATE (1,917 then 2,499), whatever the founding state", () => {
    for (const [now, founding, price] of [
      ["2026-10-25T06:30:00Z", undefined, "\u20B91,917"],
      ["2026-12-01T00:00:00+05:30", undefined, "\u20B92,499"],
      ["2026-12-05T10:00:00+05:30", true, "\u20B92,499"],
      ["2026-12-05T10:00:00+05:30", false, "\u20B92,499"],
    ] as const) {
      vi.useFakeTimers({ now: new Date(now), toFake: ["Date"] });
      subState.foundingMember = founding;
      renderSheet();
      expect(screen.getByTestId("upgrade-sheet-board-pass").textContent).toContain(price);
      expect(document.querySelector(".lt-upsheet")?.textContent ?? "").not.toMatch(/599|999|for a month/);
      cleanup();
      vi.useRealTimers();
    }
  });

  it("names the feature that was blocked, not one string for every surface", () => {
    renderSheet({ featureLabel: "The AI tutor" });
    expect(screen.getByText("The AI tutor is a Premium feature")).toBeInTheDocument();
    cleanup();
    renderSheet({ featureLabel: "Checking your answer" });
    expect(screen.getByText("Checking your answer is a Premium feature")).toBeInTheDocument();
  });

  // LOCK-SELL-1 (owner, 4 Nov 2026): the sheet no longer markets Basic - the "You keep Basic free, always ..." box is gone.
  it("does not list what Basic keeps (the Board Pass leads; Basic is the quiet exit only)", () => {
    renderSheet();
    expect(screen.queryByText(/Basic free, always/)).toBeNull();
    expect(screen.getByTestId("upgrade-sheet-board-pass")).toBeInTheDocument();
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

describe("ASK-COPY-1: title and trial-first lead", () => {
  it("a Basic student keeps the true statement", () => {
    subState.trialStartDate = "2026-10-01T00:00:00.000Z";
    renderSheet({ featureLabel: "The AI tutor" });
    expect(screen.getByRole("heading", { name: "The AI tutor is a Premium feature" })).toBeInTheDocument();
  });

  it("a TRIAL student is not told it is a Premium feature - the title names what the pass keeps", () => {
    subState.tier = "trial";
    subState.trialStartDate = "2026-10-20T00:00:00.000Z";
    renderSheet({ featureLabel: "Your full marks breakdown" });
    expect(screen.getByRole("heading", { name: "Keep your full marks breakdown after your free week" })).toBeInTheDocument();
    expect(screen.queryByText(/is a Premium feature/)).toBeNull();
    expect(screen.getByTestId("upgrade-sheet")).toHaveAttribute("aria-label", "Keep your full marks breakdown after your free week");
  });

  it("an eligible account (never had a trial) sees the trial FIRST, Board Pass second; the tap starts it once and closes", () => {
    const { onClose } = renderSheet();
    const trial = screen.getByTestId("start-trial-cta");
    expect(trial).toHaveTextContent("Start your free 7-day trial");
    expect(trial.compareDocumentPosition(screen.getByTestId("upgrade-sheet-board-pass")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(trialSvc.activateTrial).not.toHaveBeenCalled(); // never on mount
    fireEvent.click(trial);
    fireEvent.click(trial);
    expect(trialSvc.activateTrial).toHaveBeenCalledTimes(1);
    expect(trialSvc.activateTrial).toHaveBeenCalledWith("u1");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("not offered while the record is unknown (not hydrated), to a used/running trial, or to Premium", () => {
    subState.hydrated = false;
    renderSheet();
    expect(screen.queryByTestId("start-trial-cta")).toBeNull();
    cleanup();
    subState.hydrated = true;
    subState.trialStartDate = "2026-10-01T00:00:00.000Z";
    renderSheet();
    expect(screen.queryByTestId("start-trial-cta")).toBeNull();
    cleanup();
    subState.trialStartDate = null;
    subState.tier = "premium";
    renderSheet();
    expect(screen.queryByTestId("start-trial-cta")).toBeNull();
  });

  it("a signed-out visitor leads with the trial, and the tap goes to sign-in (never starts anything)", () => {
    subState.uid = "";
    render(
      <MemoryRouter initialEntries={["/practice?topic=light"]}>
        <UpgradeSheet featureLabel="Checking your answer" onClose={() => {}} />
        <LocationProbe />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByTestId("start-trial-cta"));
    expect(trialSvc.activateTrial).not.toHaveBeenCalled();
    expect(screen.getByTestId("loc")).toHaveTextContent("/login?reason=start-trial&redirect=");
  });
});

/* ASK-COPY-1 - the tutor's 402 card (its actions are this sheet). Lives here, with the sheet's
   mocks, because it reads the same clock for the Board Pass price. */
describe("ASK-COPY-1: tutor 402 card", () => {
  const PREMIUM = { kind: "premium" as const, message: "server words that must not replace the approved copy" };
  function showCard() {
    const onRetry = vi.fn();
    render(
      <MemoryRouter initialEntries={["/tutor?q=1"]}>
        <TutorErrorView state={PREMIUM} onRetry={onRetry} selfHref="/tutor?q=1" />
      </MemoryRouter>,
    );
    return onRetry;
  }

  it("Basic: title and body are the approved words, price computed from the Board Pass quote", () => {
    subState.trialStartDate = "2026-10-01T00:00:00.000Z";
    showCard();
    const price = boardPassOffer(new Date(), predictCbseExamDate("10")).priceDisplay;
    expect(price).toMatch(/^₹/);
    expect(screen.getByText("Want to know why you lost this mark?")).toBeInTheDocument();
    expect(
      screen.getByText(
        `The tutor walks you through this exact question, step by step. It comes with the Board Pass: ${price} once, till your boards.`,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/part of Premium/)).toBeNull();
    expect(screen.queryByText(/server words/)).toBeNull();
    expect(screen.queryByTestId("start-trial-cta")).toBeNull(); // had a trial: never a second
  });

  it("Basic: the action is the shared UpgradeSheet", () => {
    subState.trialStartDate = "2026-10-01T00:00:00.000Z";
    showCard();
    expect(screen.queryByTestId("upgrade-sheet")).toBeNull();
    fireEvent.click(screen.getByTestId("tutor-see-board-pass"));
    expect(screen.getByTestId("upgrade-sheet")).toBeInTheDocument();
    expect(screen.getByTestId("upgrade-sheet-board-pass")).toBeInTheDocument();
  });

  it("trial-eligible: leads with the free week before the Board Pass, starts it only on the tap, then asks again", () => {
    const onRetry = showCard();
    const trial = screen.getByTestId("start-trial-cta");
    expect(trial).toHaveTextContent("Start your free 7-day trial");
    expect(trial.compareDocumentPosition(screen.getByTestId("tutor-see-board-pass")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(trialSvc.activateTrial).not.toHaveBeenCalled();
    fireEvent.click(trial);
    expect(trialSvc.activateTrial).toHaveBeenCalledWith("u1");
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("no trial offer before the record is known, or to a Premium account", () => {
    subState.hydrated = false;
    showCard();
    expect(screen.queryByTestId("start-trial-cta")).toBeNull();
    cleanup();
    subState.hydrated = true;
    subState.tier = "premium";
    showCard();
    expect(screen.queryByTestId("start-trial-cta")).toBeNull();
  });
});

/* ══ PAPER-WALLS-1 ══ */
const on = () => vi.stubEnv("VITE_PACKS_ENABLED", "1");
const bp = () => {
  const o = boardPassOffer(new Date(), predictCbseExamDate("10"));
  return `${o.title}${o.priceDisplay ? ` ${o.priceDisplay}` : ""}`;
};

describe("paperPackLine", () => {
  it("picks the right pack and href", () => {
    on();
    expect(paperPackLine("chapter-test", { chapters: ["triangles"] })).toMatchObject({ label: "Chapter Pack", priceLabel: "₹49", href: "/pricing?chapter=triangles#packs" });
    expect(paperPackLine("worksheet", { chapters: ["triangles", "triangles"] })?.href).toBe("/pricing?chapter=triangles#packs");
    expect(paperPackLine("full-mock", { subject: "science" })).toMatchObject({ label: "Mock Pack", priceLabel: "₹99", href: "/pricing?mock=science#packs" });
    expect(paperPackLine("worksheet", { chapters: ["triangles", "electricity"] })).toMatchObject({ label: "PDF packs", priceLabel: "", href: "/pricing#packs" });
    expect(paperPackLine("full-mock", {})?.href).toBe("/pricing#packs");
  });
  it("carries the Mock Pack subject", () => {
    on();
    expect(paperPackLine("full-mock", { subject: "maths" })?.subject).toBe("maths");
    expect(paperPackLine("chapter-test", { chapters: ["triangles"] })?.subject).toBeUndefined();
  });
  it("is null while the pack links are off", () => {
    vi.stubEnv("VITE_PACKS_ENABLED", "");
    expect(paperPackLine("chapter-test", { chapters: ["triangles"] })).toBeNull();
  });
  it("reads refusals by name", () => {
    expect(isPremiumRequiredRefusal({ name: "PremiumRequiredError" })).toBe(true);
    expect(isPremiumRequiredRefusal(new Error("x"))).toBe(false);
    expect(isTrialLimitRefusal({ name: "FairUseLimitError", kind: "trial_limit" })).toBe(true);
    expect(isTrialLimitRefusal({ name: "FairUseLimitError", kind: "usage_limit" })).toBe(false);
  });
});

describe("UpgradeSheet pack line", () => {
  const pack: PaperPackLine = { label: "Mock Pack", priceLabel: "₹99", href: "/pricing?mock=maths#packs", subject: "maths" };
  const mount = (p?: PaperPackLine | null) =>
    render(
      <MemoryRouter>
        <UpgradeSheet featureLabel="Grading your full mock" pack={p} onClose={() => {}} />
      </MemoryRouter>,
    );

  it("shows the Board Pass first and the pack link second", () => {
    mount(pack);
    const bpEl = screen.getByTestId("upgrade-sheet-board-pass");
    const packEl = screen.getByTestId("upgrade-sheet-pack");
    expect(bpEl.compareDocumentPosition(packEl) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(packEl.textContent).toBe("Maths Mock Pack ₹99 — 8 full board mocks, printed with answer keys →");
    expect(packEl.querySelector("a")?.getAttribute("href")).toBe("/pricing?mock=maths#packs");
  });
  it("SALE-MOMENT-2: names the pack the paper wall was given (Mock, Chapter) and keeps the generic line for plain", () => {
    on();
    for (const [line, text, href] of [
      [paperPackLine("full-mock", { subject: "maths" }), "Maths Mock Pack ₹99 — 8 full board mocks, printed with answer keys →", "/pricing?mock=maths#packs"],
      [paperPackLine("full-mock", { subject: "science" }), "Science Mock Pack ₹99 — 8 full board mocks, printed with answer keys →", "/pricing?mock=science#packs"],
      [paperPackLine("chapter-test", { chapters: ["triangles"] }), "Chapter Pack ₹49 — printed questions with answer keys →", "/pricing?chapter=triangles#packs"],
      [paperPackLine("worksheet", { chapters: ["triangles", "electricity"] }), "Not ready for the Board Pass yet? Try our PDF packs from ₹49 — printed questions with answer keys, no marking →", "/pricing#packs"],
    ] as const) {
      mount(line);
      const el = screen.getByTestId("upgrade-sheet-pack");
      expect(el.textContent).toBe(text);
      expect(el.querySelector("a")?.getAttribute("href")).toBe(href);
      cleanup();
    }
  });
  it("PACK-BASIC-ONLY-1: shown to Basic and trial students; hidden for paid Premium and when unhydrated", () => {
    for (const [tier, trialStartDate, hydrated, shown] of [
      ["free", "2026-01-01T00:00:00.000Z", true, true],
      ["free", null, true, true],
      ["trial", "2026-10-27T00:00:00.000Z", true, true],
      ["premium", null, true, false],
      ["free", null, false, false],
    ] as const) {
      subState.tier = tier;
      subState.trialStartDate = trialStartDate;
      subState.hydrated = hydrated;
      mount(pack);
      expect(screen.getByTestId("upgrade-sheet-board-pass")).toBeInTheDocument(); // control: the sheet rendered
      expect(screen.queryByTestId("upgrade-sheet-pack") !== null, `${tier}/${trialStartDate}/${hydrated}`).toBe(shown);
      cleanup();
    }
  });
  it("shows no pack line without a pack, or to paid Premium", () => {
    mount(null);
    expect(screen.queryByTestId("upgrade-sheet-pack")).toBeNull();
    cleanup();
    subState.tier = "premium";
    mount(pack);
    expect(screen.queryByTestId("upgrade-sheet-pack")).toBeNull();
    expect(screen.getByTestId("upgrade-sheet-board-pass")).toBeInTheDocument(); // the control: the sheet did render
  });
});

describe("FairUseLimitPanel on a trial paper refusal", () => {
  const limit: LimitState = { tier: "trial", scope: "chapter-test", resetAt: null, window: null, allowance: 1 };
  const pack = { label: "Chapter Pack", priceLabel: "₹49", href: "/pricing?chapter=triangles#packs" };
  const mount = (l: LimitState, p: typeof pack | null) =>
    render(
      <MemoryRouter>
        <FairUseLimitPanel limit={l} pack={p} />
      </MemoryRouter>,
    );

  it("PACK-BASIC-ONLY-1: a trial refusal shows the Board Pass first, then the pack line with the new wording", () => {
    mount(limit, pack);
    const bpEl = screen.getByTestId("fair-use-board-pass");
    expect(bpEl.textContent).toContain(bp());
    const packEl = screen.getByTestId("fair-use-pack-line");
    expect(bpEl.compareDocumentPosition(packEl) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(packEl.textContent).toContain("Not ready for the Board Pass yet? Try our PDF packs from ₹49 — printed questions with answer keys, no marking →");
    expect(packEl.querySelector("a")?.getAttribute("href")).toBe("/pricing#packs");
  });
  it("PACK-BASIC-ONLY-1: also shown in the trial daily-checks dialog", () => {
    mount({ tier: "trial", scope: "checks", resetAt: "2026-10-29T00:00:00.000Z", window: "day", allowance: 3 }, pack);
    expect(screen.getByTestId("fair-use-pack-line")).toBeInTheDocument();
  });
  it("a premium fair-use refusal shows neither", () => {
    mount({ tier: "premium", scope: "chapter-test", resetAt: null, window: "day" }, pack);
    expect(screen.getByTestId("fair-use-limit-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("fair-use-board-pass")).toBeNull();
    expect(screen.queryByTestId("fair-use-pack-line")).toBeNull();
  });
});

describe("7-day trial refusal copy", () => {
  it("says this week, not today, when the server named the week window", () => {
    const week: LimitState = { tier: "trial", scope: "checks", resetAt: null, window: "week", allowance: 5 };
    const c = limitCopy(week);
    expect(c.lead).toContain("this week's");
    expect(c.lead).not.toContain("today");
    expect(c.tail).toBe("Premium removes the weekly limit.");
    expect(limitCopy({ ...week, window: null }).lead).toContain("today's"); // control
  });
  it("limitFromRefusal carries the window for a trial refusal", () => {
    const snap = { tier: "trial", enforced: true, trial: null } as never;
    const out = limitFromRefusal({ kind: "trial_limit", remaining: null, resetAt: null, window: "week" }, snap, "worksheet");
    expect(out?.window).toBe("week");
  });
});
