import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  FOUNDING_COHORT_COPY,
  FOUNDING_LABEL,
  PERIOD_ANNUAL_LABEL,
  PERIOD_MONTHLY_LABEL,
  PRICE_ANNUAL_LIST_DISPLAY,
  PRICE_MONTHLY_FOUNDING_DISPLAY,
  PRICE_MONTHLY_LIST_DISPLAY,
} from "../../config/pricing";

/**
 * OfferStrip — the auth surface finally says what the student is joining.
 *
 * `SignUpPage.tsx` has ZERO matches for price, trial, founding, free or ₹, so
 * every student converts blind today. These tests pin the two things that make
 * the fix honest rather than merely present: every figure traces to
 * `src/config/pricing.ts`, and NO remaining-seats count is ever rendered.
 *
 * ★ Every absence assertion below is paired with a CONTROL that renders (or
 *   matches) the thing. `queryBy… → null` and `not.toMatch(…)` pass just as
 *   happily when the component is broken, the testid was renamed, or the regex
 *   itself is a typo — so each one is proved live before it is trusted.
 */

// Login mounts the strip; its own dependencies are irrelevant to this lane.
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({
    user: null,
    signInWithGoogle: vi.fn(),
    signInWithEmailPassword: vi.fn(),
    sendPasswordReset: vi.fn(),
    initPhoneRecaptcha: vi.fn(),
    sendPhoneOtp: vi.fn(),
    verifyPhoneOtp: vi.fn(),
  }),
}));
vi.mock("../../services/uxTelemetry", () => ({ trackUxEvent: vi.fn() }));
vi.mock("../../services/referralService", () => ({ creditPendingReferral: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.doUnmock("../../config/pricing");
  vi.resetModules();
});

/**
 * Re-import the module graph with `FOUNDING_OFFER_OPEN` forced.
 *
 * A partial mock over `importActual` — never a hand-written price table — so the
 * prices under test are the REAL published ones. A stubbed price would make
 * every assertion below a tautology about the stub.
 */
async function loadWithOffer(open: boolean) {
  vi.resetModules();
  vi.doMock("../../config/pricing", async () => {
    const actual =
      await vi.importActual<typeof import("../../config/pricing")>("../../config/pricing");
    return { ...actual, FOUNDING_OFFER_OPEN: open };
  });
  const { default: OfferStrip } = await import("./OfferStrip");
  const { default: Login } = await import("../../pages/Login");
  return { OfferStrip, Login };
}

async function renderStrip(open: boolean) {
  const { OfferStrip } = await loadWithOffer(open);
  render(
    <MemoryRouter>
      <OfferStrip />
    </MemoryRouter>,
  );
  return screen.getByTestId("lt-offer-strip");
}

async function renderLogin(open: boolean) {
  const { Login } = await loadWithOffer(open);
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  );
}

/** Collapse whitespace so assertions do not depend on JSX line breaks. */
function flat(el: Element | null | undefined): string {
  return (el?.textContent ?? "").replace(/\s+/g, " ").trim();
}

// ---------------------------------------------------------------------------
// 1 · Offer OPEN
// ---------------------------------------------------------------------------

describe("offer OPEN", () => {
  it("renders the founding price AND the struck-through list price", async () => {
    const strip = await renderStrip(true);
    const text = flat(strip);

    expect(text).toContain(`${PRICE_MONTHLY_FOUNDING_DISPLAY} ${PERIOD_MONTHLY_LABEL}`);
    expect(screen.getByTestId("lt-offer-founding-badge")).toHaveTextContent(FOUNDING_LABEL);

    // The list price must be struck, and it must be the LIST price that is
    // struck — not the founding one. `<s>` carries "not what you pay" natively;
    // asserting the tag is what separates a real strike from a price merely
    // printed twice.
    const struck = strip.querySelector("s");
    expect(struck, "the list price must render inside <s>").not.toBeNull();
    expect(flat(struck)).toBe(`${PRICE_MONTHLY_LIST_DISPLAY} ${PERIOD_MONTHLY_LABEL}`);
    expect(flat(struck)).not.toContain(PRICE_MONTHLY_FOUNDING_DISPLAY);

    // The cohort claim, read from the module rather than retyped — a literal
    // here would keep passing after the cohort size moved.
    expect(text).toContain(FOUNDING_COHORT_COPY);
  });

  it("scopes the permanence claim to an ACTIVE SUBSCRIPTION, never to published prices", async () => {
    const strip = await renderStrip(true);
    const text = flat(strip).toLowerCase();

    // #548's finding: the board year moved ₹4,999 → ₹5,999 one day apart, so a
    // claim about PUBLISHED prices is unsupportable. Same eight phrasings the
    // pricing page is pinned against.
    for (const overreach of [
      "we do not raise anyone's price",
      "we never raise anyone's price",
      "we will never raise",
      "price will never change",
      "prices never change",
      "price never rises",
      "locked forever",
      "lifetime price",
    ]) {
      expect(
        text,
        `overbroad price promise in the offer strip: "${overreach}"`,
      ).not.toContain(overreach);
    }

    // CONTROL for the absence above: the scoped claim IS present, so this test
    // is checking the wording rather than an empty string.
    expect(text).toContain("locked for as long as you stay subscribed");
  });
});

// ---------------------------------------------------------------------------
// 2 · Offer CLOSED
// ---------------------------------------------------------------------------

describe("offer CLOSED", () => {
  it("renders the list prices and NO founding badge", async () => {
    const strip = await renderStrip(false);
    const text = flat(strip);

    expect(text).toContain(`${PRICE_MONTHLY_LIST_DISPLAY} ${PERIOD_MONTHLY_LABEL}`);
    expect(text).toContain(`${PRICE_ANNUAL_LIST_DISPLAY} ${PERIOD_ANNUAL_LABEL}`);
    expect(text).toContain("Upgrade whenever you like.");

    expect(screen.queryByTestId("lt-offer-founding-badge")).toBeNull();
    expect(text).not.toContain(PRICE_MONTHLY_FOUNDING_DISPLAY);
    expect(strip.querySelector("s"), "nothing is struck once the offer closes").toBeNull();
  });

  it("CONTROL — the same queries DO find the badge and the strike when the offer is open", async () => {
    // Without this, both absence assertions above would pass against a strip
    // that renders nothing at all, or one whose testid was silently renamed.
    const strip = await renderStrip(true);
    expect(screen.queryByTestId("lt-offer-founding-badge")).not.toBeNull();
    expect(strip.querySelector("s")).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 2b · The SHIPPED state — the one no mock can vouch for
// ---------------------------------------------------------------------------

describe("the flag as it actually ships", () => {
  it("ships with the founding offer OPEN", async () => {
    // Everything above forces `FOUNDING_OFFER_OPEN` through a partial mock, which
    // proves the component READS the flag but says nothing about its value. A
    // silent flip of the constant would leave all fourteen of those assertions
    // green while the live sign-in page stopped mentioning the founding rate.
    //
    // So this one renders the module UNMOCKED. Closing the cohort is therefore a
    // deliberate two-file change — the constant and this line — which is the
    // right amount of friction for a published price claim.
    vi.resetModules();
    const { FOUNDING_OFFER_OPEN } = await import("../../config/pricing");
    expect(FOUNDING_OFFER_OPEN).toBe(true);

    const { default: OfferStrip } = await import("./OfferStrip");
    render(
      <MemoryRouter>
        <OfferStrip />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("lt-offer-founding-badge")).toHaveTextContent(FOUNDING_LABEL);
  });
});

// ---------------------------------------------------------------------------
// 3 · No rupee literal in the component — every figure traced to pricing.ts
// ---------------------------------------------------------------------------

describe("no price literal lives in the component", () => {
  const OFFER_STRIP_PATH = "src/components/auth/OfferStrip.tsx";
  const source = readFileSync(resolve(process.cwd(), OFFER_STRIP_PATH), "utf8");

  /** The same two shapes `pricing.guard.test.ts` scans all of src/ for. */
  const RUPEE_LITERAL = /₹\s*\d/;
  const STRUCTURED_PRICE_LITERAL = /"?\bprice"?\s*:\s*["']?\d/;

  it(`finds no rupee-form or structured-form literal in ${OFFER_STRIP_PATH}`, () => {
    const offenders = source
      .split(/\r?\n/)
      .map((line, i) => ({ line: i + 1, text: line.trim() }))
      // Prose in the header comment may legitimately mention a figure.
      .filter(l => !/^(\/\/|\*|\/\*)/.test(l.text))
      .filter(l => RUPEE_LITERAL.test(l.text) || STRUCTURED_PRICE_LITERAL.test(l.text));

    expect(
      offenders,
      `price literals must come from src/config/pricing.ts:\n${offenders
        .map(o => `  ${OFFER_STRIP_PATH}:${o.line}  ${o.text}`)
        .join("\n")}`,
    ).toEqual([]);
  });

  it("CONTROL — the patterns fire, and the rendered strip really does show prices", async () => {
    // A clean file plus a typo'd regex looks identical to a clean file plus a
    // working one. Prove the regexes match, then prove the figures the source
    // does NOT contain are nonetheless on screen — i.e. they came from imports.
    expect(RUPEE_LITERAL.test("<span>₹599</span>")).toBe(true);
    expect(RUPEE_LITERAL.test("<span>{PRICE_MONTHLY_FOUNDING_DISPLAY}</span>")).toBe(false);
    expect(STRUCTURED_PRICE_LITERAL.test('{ price: "599" }')).toBe(true);

    expect(source).not.toContain(PRICE_MONTHLY_FOUNDING_DISPLAY);
    expect(source).not.toContain(PRICE_MONTHLY_LIST_DISPLAY);

    const strip = await renderStrip(true);
    expect(flat(strip)).toContain(PRICE_MONTHLY_FOUNDING_DISPLAY);
    expect(flat(strip)).toContain(PRICE_MONTHLY_LIST_DISPLAY);
  });
});

// ---------------------------------------------------------------------------
// 4 · ★★ NEVER A COUNT — in either state
// ---------------------------------------------------------------------------

/**
 * A remaining-seats claim: a number attached to scarcity language.
 *
 * Deliberately NOT `/\d/` — "First 200 students" is a digit, and it is a true
 * claim about the OFFER's size. What is forbidden is a claim about DEMAND:
 * "43 places left", "only 12 spots remaining", "157 seats gone".
 */
const REMAINING_COUNT =
  /\b\d+\s*(?:\w+\s+)?(?:places?|seats?|spots?|slots?|memberships?)?\s*(?:left|remaining|gone|taken|remain)\b|\b(?:only|just)\s+\d+\s+(?:places?|seats?|spots?|slots?)\b/i;

describe("★★ never a count", () => {
  it("renders no remaining-seats count when the offer is OPEN", async () => {
    const strip = await renderStrip(true);
    expect(flat(strip)).not.toMatch(REMAINING_COUNT);
  });

  it("renders no remaining-seats count when the offer is CLOSED", async () => {
    const strip = await renderStrip(false);
    expect(flat(strip)).not.toMatch(REMAINING_COUNT);
  });

  it("CONTROL — the pattern catches the phrasings it exists to forbid, and spares the true one", () => {
    // Without this the two assertions above are satisfied by any regex that
    // matches nothing, including a typo.
    for (const banned of [
      "43 places left",
      "Only 12 spots left",
      "just 7 seats remaining",
      "157 memberships gone",
      "9 remaining",
    ]) {
      expect(banned, `pattern failed to catch "${banned}"`).toMatch(REMAINING_COUNT);
    }

    // …and does not fire on the claim that IS honest, which is the whole
    // distinction: 200 is a property of the offer, not of demand.
    expect(FOUNDING_COHORT_COPY).not.toMatch(REMAINING_COUNT);
    expect("7-day full trial, then free Basic").not.toMatch(REMAINING_COUNT);
  });

  it("the component declares no seats-remaining field that could become a count", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/components/auth/OfferStrip.tsx"),
      "utf8",
    );
    const code = source
      .split(/\r?\n/)
      .filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l))
      .join("\n");
    expect(code).not.toMatch(/\b(remaining|seatsLeft|placesLeft|spotsLeft|soldCount)\b/i);
  });
});

// ---------------------------------------------------------------------------
// 5 · The after-trial line
// ---------------------------------------------------------------------------

describe("the after-trial line", () => {
  it("is present on the auth surface, and names free Basic rather than 'then paid'", async () => {
    await renderLogin(true);

    const panel = screen.getByTestId("lt-after-trial-panel");
    expect(flat(panel)).toBe(
      "After 7 days you keep free Basic — practice, exam trends and topic insights — " +
        "for as long as you like. Upgrade only if you want to.",
    );
    expect(flat(panel).toLowerCase()).not.toContain("then paid");
  });

  it("also reaches PHONE students, whose brand panel is display:none below 1024px", async () => {
    // The dark panel that carries the desktop copy is removed entirely at
    // <=1023px (pinned by Login.legalLinks.test.tsx). Without the mobile mirror
    // the single most reassuring sentence on the page would be invisible to the
    // students most likely to read "free trial" as "a card gets charged".
    await renderLogin(true);

    const mobile = screen.getByTestId("lt-after-trial-mobile");
    expect(flat(mobile)).toBe(flat(screen.getByTestId("lt-after-trial-panel")));

    const css = readFileSync(resolve(process.cwd(), "src/components/auth/OfferStrip.tsx"), "utf8");
    const wide = css.slice(0, css.indexOf("@media (max-width: 1023px)"));
    const narrow = css.slice(css.indexOf("@media (max-width: 1023px)"));
    expect(wide).toMatch(/\.lt-login-aftertrial--mobile\s*\{[^}]*display:\s*none/);
    expect(narrow).toMatch(/\.lt-login-aftertrial--mobile\s*\{[^}]*display:\s*block/);
  });
});

// ---------------------------------------------------------------------------
// 6 · The strip is actually mounted on the auth surface — both states
// ---------------------------------------------------------------------------

describe("mounted on the auth surface", () => {
  it("renders inside the sign-in page with the offer OPEN, under the primary action", async () => {
    await renderLogin(true);

    const strip = screen.getByTestId("lt-offer-strip");
    expect(within(strip).getByTestId("lt-offer-founding-badge")).toBeTruthy();
    expect(flat(strip)).toContain(PRICE_MONTHLY_FOUNDING_DISPLAY);

    // "See plans" goes to the existing pricing page, not a modal.
    const link = within(strip).getByRole("link", { name: /see plans/i });
    expect(link.getAttribute("href")).toBe("/pricing?source=login");

    // MOUNT != POSITION. The strip must sit AFTER the primary action in
    // document order, or it is offering terms the student has already acted on.
    //
    // ONE DOOR (AUTH-3): the page opens on the METHOD CHOICE, so the primary
    // action is no longer a single "Continue" submit — it is the group of three
    // method buttons. Anchoring on the LAST of them is the strongest form of
    // the same claim: the strip follows EVERY primary action, not just one.
    const lastPrimaryAction = screen.getByRole("button", { name: /Continue with email/ });
    expect(
      lastPrimaryAction.compareDocumentPosition(strip) & Node.DOCUMENT_POSITION_FOLLOWING,
      "the offer strip must render after the primary action",
    ).toBeTruthy();
  });

  it("renders inside the sign-in page with the offer CLOSED", async () => {
    await renderLogin(false);

    const strip = screen.getByTestId("lt-offer-strip");
    expect(flat(strip)).toContain(PRICE_ANNUAL_LIST_DISPLAY);
    expect(within(strip).queryByTestId("lt-offer-founding-badge")).toBeNull();
  });
});
