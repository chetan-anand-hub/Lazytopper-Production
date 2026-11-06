import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  boardPassPriceDisplay,
  boardPassPriceLine,
  FOUNDING_OFFER_BADGE,
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

// BUY-PATH-1 (the buy-intent lead line; tests at the end of this file).
import OfferStripStatic, { TRIAL_LEAD, buyIntentLine, readBuyIntent } from "./OfferStrip";
import { BOARD_PASS_NAME } from "../../config/pricing";
import { packDescription, packPriceLabel } from "../../services/packs";
import { packChapterLabel } from "../../lib/packs/packLabels";

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
  vi.useRealTimers();
  vi.doUnmock("../../config/pricing");
  vi.resetModules();
});

/**
 * Re-import the module graph with the clock pinned inside or outside the founding window.
 *
 * A partial mock over `importActual` — never a hand-written price table — so the
 * prices under test are the REAL published ones. A stubbed price would make
 * every assertion below a tautology about the stub.
 */
async function loadWithOffer(open: boolean) {
  vi.resetModules();
  // PRICING-1 — the offer is the CALENDAR's answer, read at render. Pin "now" (Date only) to a
  // real instant on the wanted side of the close: 25 Oct 2026 is open, 5 Dec 2026 is closed. The
  // prices are the REAL published ones, never a stub.
  vi.useFakeTimers({
    now: new Date(open ? "2026-10-25T06:30:00.000Z" : "2026-12-05T10:00:00+05:30"),
    toFake: ["Date"],
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

/** Collapse whitespace so assertions do not depend on JSX line breaks. The <style> block is not copy. */
function flat(el: Element | null | undefined): string {
  if (!el) return "";
  const clone = el.cloneNode(true) as Element;
  clone.querySelectorAll("style").forEach((n) => n.remove());
  return (clone.textContent ?? "").replace(/\s+/g, " ").trim();
}

// ---------------------------------------------------------------------------
// 1 · PRICE-FIXED-1 (31 Oct 2026): the strip names the Board Pass ONLY, on every date
// ---------------------------------------------------------------------------

describe("the Board Pass line (the same on every date)", () => {
  for (const [label, open] of [["before the old founding close", true], ["after the old founding close", false]] as const) {
    it(`${label}: the Board Pass fixed price, no month price, no founding badge, nothing struck`, async () => {
      const strip = await renderStrip(open);
      const text = flat(strip);
      expect(flat(strip.querySelector(".lt-offer-strip-body"))).toBe(
        // GST-EXCL-1: the closed case is after the 7 Nov 2026 GST cut-off - the tag reads "+ GST".
        `Board Pass: ${open ? "₹1,917" : "₹2,499 + GST"} \u2014 one payment till your boards. Upgrade whenever you like.`,
      );
      expect([...new Set(text.match(/₹[\d,]+/g))]).toEqual([boardPassPriceDisplay().replace(" + GST", "")]);
      expect(text).not.toMatch(/599|999|for a month|locked|20%|save/i);
      // The Founding member offer label shows before the deadline only (owner, 21:20 IST 31 Oct 2026).
      if (open) expect(screen.getByTestId("lt-offer-founding-label")).toHaveTextContent("Founding member offer");
      else expect(screen.queryByTestId("lt-offer-founding-label")).toBeNull();
      expect(screen.queryByTestId("lt-offer-founding-badge")).toBeNull();
      expect(strip.querySelector("s"), "nothing is struck").toBeNull();
      expect(strip.querySelector(".lt-offer-strip-note")).toBeNull();
      // PARENTS-CTA-1 (owner, 2026-10-19): no seat-count sentence.
      expect(text).not.toMatch(/\bfirst\s+\d+\s+students\b/i);
    });
  }

  it("CONTROL - the same queries find the Board Pass line (the absences above are about real copy)", async () => {
    const strip = await renderStrip(true);
    expect(flat(strip)).toContain(boardPassPriceLine());
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
    expect(flat(strip)).toContain(boardPassPriceDisplay());
  });
});

// ---------------------------------------------------------------------------
// 4 · ★★ NEVER A COUNT — in either state
// ---------------------------------------------------------------------------

/**
 * A remaining-seats claim: a number attached to scarcity language.
 *
 * Deliberately NOT `/\d/` — the strip carries prices, which are digits, and a
 * true claim about the OFFER. (The old seat-count sentence was removed by
 * PARENTS-CTA-1.) What is forbidden is a claim about DEMAND:
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

    // …and does not fire on the offer copy that IS honest.
    expect(FOUNDING_OFFER_BADGE).not.toMatch(REMAINING_COUNT);
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
    // TRIAL-ON-SIGNUP-1b (owner addendum, wave B-6): the shared general line, word for word; PRICE-FIXED-1:
    // it names the Board Pass, its figure imported from config/pricing, never typed.
    expect(flat(panel)).toBe(
      `Try Premium free for 7 days — no card needed. After that, keep free Basic or get the Board Pass: ${boardPassPriceLine()}.`,
    );
    expect(flat(panel).toLowerCase()).not.toContain("then paid");
    expect(flat(panel).toLowerCase()).not.toContain("upgrade anytime");
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
    expect(within(strip).queryByTestId("lt-offer-founding-badge")).toBeNull();
    expect(flat(strip)).toContain(boardPassPriceDisplay());

    // "See plans" goes to the existing pricing page, not a modal.
    const link = within(strip).getByRole("link", { name: /see plans/i });
    expect(link.getAttribute("href")).toBe("/pricing?source=login");

    // ★★ THIS ASSERTION IS REPLACED, NOT DELETED — NAME-1 v2.
    //
    // It used to read, via compareDocumentPosition:
    //     "the strip must sit AFTER the primary action in document order, or it
    //      is offering terms the student has already acted on."
    //
    // That rule was calibrated for a strip INSIDE the auth card, where sitting
    // above the buttons would physically interrupt the form. The page is now two
    // columns, and the full offer lives in the brand column — so document order
    // stopped being reading order, and the old rule would have failed a sound
    // layout while still passing a regressed one (a strip dropped at the very
    // top of the auth card, above the methods, follows nothing and would have
    // been caught only by accident).
    //
    // What it was actually protecting, stated directly:
    //     THE OFFER MUST NEVER RENDER BETWEEN THE PRIMARY ACTION AND THE TOP OF
    //     THE ACTION COLUMN.
    // True on desktop (it is not in that column at all) and on mobile (it is
    // below the card), and it survives the next layout change.
    const actionColumn = strip.closest(".lt-login-gate");
    expect(
      actionColumn,
      "the full offer must not live in the action column at all — it belongs in the brand panel",
    ).toBeNull();

    // CONTROL — the query CAN find that column, so the null above is a fact
    // about the strip and not about a renamed class.
    expect(
      screen
        .getByRole("button", { name: /Continue with email/ })
        .closest(".lt-login-gate"),
      "control: the method buttons ARE inside the action column",
    ).not.toBeNull();
  });

  it("★ the MOBILE mirror sits below the whole card, never between the methods", async () => {
    // The compact variant is the one that does live in the auth column, so the
    // replaced rule is enforced against it directly: it must follow the last
    // primary action, which is what keeps it out of the middle of the form.
    await renderLogin(true);

    const mobile = screen.getByTestId("lt-offer-strip-mobile");
    const lastPrimaryAction = screen.getByRole("button", { name: /Continue with email/ });
    expect(
      lastPrimaryAction.compareDocumentPosition(mobile) & Node.DOCUMENT_POSITION_FOLLOWING,
      "the compact offer must render after the primary action",
    ).toBeTruthy();

    // ★ IT CARRIES NO FOUNDING OFFER. The free-Basic line reduces the anxiety that
    // makes a student abandon signup; the founding rate sells. On a phone, where
    // the offer competes with the form itself, only the first earns its space.
    // TRIAL-ON-SIGNUP-1b (owner addendum, wave B-6) — the after-trial line now names
    // the price a student pays after the trial (MONTHLY_INLINE), so that is the ONE
    // figure the mirror may carry: no badge, no struck list price, nothing else.
    expect([...new Set(flat(mobile).match(/₹[\d,]+/g))]).toEqual([boardPassPriceDisplay()]);
    expect(mobile.querySelector("s")).toBeNull();
    expect(within(mobile).queryByTestId("lt-offer-founding-badge")).toBeNull();
    // CONTROL — the full block carries a price too, so the absences mean something.
    expect(flat(screen.getByTestId("lt-offer-strip"))).toMatch(/₹/);
  });

  it("renders inside the sign-in page with the offer CLOSED", async () => {
    await renderLogin(false);

    const strip = screen.getByTestId("lt-offer-strip");
    expect(flat(strip)).toContain(boardPassPriceLine());
    expect(within(strip).queryByTestId("lt-offer-founding-badge")).toBeNull();
  });
});

/* BUY-PATH-1 - the login offer strip names the purchase a sign-in interrupted ("Sign in to finish buying <product> · <price>"),
   from the price constants / the pack catalogue; otherwise the trial line, without the word "full" (the trial is metered). */
const loginWith = (redirect: string | null, variant: "panel" | "mobile" = "panel") =>
  render(
    <MemoryRouter initialEntries={[redirect === null ? "/login" : `/login?redirect=${encodeURIComponent(redirect)}`]}>
      <OfferStripStatic variant={variant} />
    </MemoryRouter>,
  );

describe("readBuyIntent", () => {
  it("reads the Board Pass one-tap link and the pack resume links", () => {
    expect(readBuyIntent("/pricing?buy=board_pass")).toEqual({ kind: "pass" });
    expect(readBuyIntent("/packs?buy=pack_cbq&t=science")).toEqual({ kind: "pack", sku: "pack_cbq", target: "science" });
    expect(readBuyIntent("/pricing?buy=pack_bundle&from=ads")).toEqual({ kind: "pack", sku: "pack_bundle", target: undefined });
  });
  it("CONTROL: anything else is no intent (other page, unknown sku, repeated param, unsafe redirect, none)", () => {
    expect(readBuyIntent("/dashboard?buy=board_pass")).toBeNull();
    expect(readBuyIntent("/packs?buy=board_pass")).toBeNull();
    expect(readBuyIntent("/pricing?buy=not_a_pack")).toBeNull();
    expect(readBuyIntent("/pricing?buy=board_pass&buy=board_pass")).toBeNull();
    expect(readBuyIntent("https://evil.example/pricing?buy=board_pass")).toBeNull();
    expect(readBuyIntent("//evil.example/pricing?buy=board_pass")).toBeNull();
    expect(readBuyIntent("/pricing")).toBeNull();
    expect(readBuyIntent(null)).toBeNull();
  });
});

describe("OfferStrip lead line", () => {
  it("no buy intent: the trial line, without the word 'full', in both variants", () => {
    loginWith(null);
    expect(screen.getByTestId("lt-offer-lead").textContent).toBe(TRIAL_LEAD);
    expect(TRIAL_LEAD).toBe("7-day trial, then free Basic");
    cleanup();
    loginWith("/dashboard", "mobile");
    expect(screen.getByTestId("lt-offer-lead").textContent).toBe(TRIAL_LEAD);
    expect(document.body.textContent).not.toMatch(/full trial/i);
  });

  it("Board Pass intent: 'Sign in to finish buying Board Pass · <price from pricing.ts>', not the trial line", () => {
    loginWith("/pricing?buy=board_pass");
    const lead = screen.getByTestId("lt-offer-lead");
    expect(lead.textContent).toBe(buyIntentLine(BOARD_PASS_NAME, boardPassPriceDisplay()));
    expect(lead.textContent).toBe(`Sign in to finish buying Board Pass · ${boardPassPriceDisplay()}`);
    expect(lead).toHaveAttribute("data-buying", "true");
  });

  it("pack intent: the pack's catalogue name and price (CBQ, chapter, bundle)", async () => {
    loginWith("/packs?buy=pack_cbq&t=science", "mobile");
    expect(await screen.findByText(buyIntentLine(packDescription("pack_cbq", "science"), packPriceLabel("pack_cbq")))).toBeTruthy();
    cleanup();
    loginWith("/packs?buy=pack_chapter&t=real-numbers");
    expect(
      await screen.findByText(buyIntentLine(packDescription("pack_chapter", "real-numbers", packChapterLabel("real-numbers")), packPriceLabel("pack_chapter"))),
    ).toBeTruthy();
    cleanup();
    loginWith("/pricing?buy=pack_bundle");
    expect(await screen.findByText(buyIntentLine(packDescription("pack_bundle", undefined), packPriceLabel("pack_bundle")))).toBeTruthy();
  });

  it("CONTROL: a pack intent with an invalid target, or a sku not in PACK_SKUS, falls back to the trial line", async () => {
    loginWith("/packs?buy=pack_cbq&t=history");
    expect(await screen.findByText(TRIAL_LEAD)).toBeTruthy();
    cleanup();
    loginWith("/packs?buy=pack_free&t=maths");
    expect(await screen.findByText(TRIAL_LEAD)).toBeTruthy();
  });
});
