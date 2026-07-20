// DesktopPracticePage — ALIVENESS guard.
//
// Why this file exists: #492 shipped the hub with `opacity: 0.65` on the mode-
// card <article> whenever no topic was picked. Because that opacity sits on the
// card itself it multiplied every descendant — the accent stripe, the icon tile,
// the chips — so the whole "How to practise" section arrived greyed out.
//
// EVERY existing gate passed green on that build: tsc, both matrices, and all
// three routing tests. Routing tests prove the URLs; nothing proved the cards
// were actually VISIBLE. This is the visual analogue of the #490 lesson — a test
// has to reproduce the production condition, which here is the ARRIVAL state:
// signed-out, no topic selected, nothing clicked.
//
// jsdom does not composite, so this cannot prove the page "looks right" — that
// stays the owner's eye. It proves the specific, recurring, machine-checkable
// property: nothing dims the cards, and each still renders its accent at rest.

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { setMatchMediaMatches } from "../../test/setup";

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: null, loading: false }),
}));
vi.mock("../../services/mistakeLogService", () => ({ getMistakeLogs: async () => [] }));
vi.mock("../../services/firebaseClient", () => ({ firestoreDb: null }));

import DesktopPracticePage from "./DesktopPracticePage";

afterEach(cleanup);

/** The arrival state: no topic picked, so the Quick Practice and Worksheet
 *  CTAs are still gated. This is exactly the state #492 shipped dimmed. */
async function renderOnArrival() {
  setMatchMediaMatches(true);
  await act(async () => {
    render(
      <MemoryRouter initialEntries={["/practice-hub"]}>
        <Routes>
          <Route path="/practice-hub" element={<DesktopPracticePage />} />
          <Route path="*" element={<div />} />
        </Routes>
      </MemoryRouter>,
    );
  });
}

/** An inline opacity is "dimming" only if it is set AND below 1. */
function dimming(el: HTMLElement): number | null {
  const raw = el.style.opacity;
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n < 1 ? n : null;
}

describe("Practice hub aliveness (guards the #492 grey-out class)", () => {
  it("no mode card is dimmed on arrival, and all four are consistent", async () => {
    await renderOnArrival();
    const cards = Array.from(
      document.querySelectorAll<HTMLElement>(".lt-mode-card"),
    );
    expect(cards).toHaveLength(4);

    for (const card of cards) {
      const title = card.querySelector("h3")?.textContent ?? "(untitled)";
      expect(
        dimming(card),
        `mode card "${title}" is dimmed on arrival — this is the #492 regression`,
      ).toBeNull();
    }

    // #492 was also PATCHY: Predicted and Full Test always have a `to`, so two
    // cards rendered full-strength beside two dimmed ones. Assert uniformity so
    // a half-dimmed section cannot come back either.
    const opacities = new Set(cards.map((c) => c.style.opacity || "(unset)"));
    expect(
      opacities.size,
      `mode cards disagree on opacity: ${[...opacities].join(", ")}`,
    ).toBe(1);
  }, 30000);

  it("every mode card renders its accent stripe at rest", async () => {
    await renderOnArrival();
    const cards = Array.from(
      document.querySelectorAll<HTMLElement>(".lt-mode-card"),
    );

    const accents = cards.map((card) => {
      const title = card.querySelector("h3")?.textContent ?? "(untitled)";
      const stripe = card.querySelector<HTMLElement>("span[aria-hidden]");
      expect(stripe, `mode card "${title}" has no accent stripe`).not.toBeNull();
      expect(stripe!.style.background, `stripe on "${title}" has no colour`).toBeTruthy();
      // Deliberately a floor, not an equality: a slightly translucent stripe is
      // a legitimate design choice (the v6 prototype itself uses opacity .9).
      // What must never happen is the stripe being faded out of sight.
      const stripeOpacity = stripe!.style.opacity ? Number(stripe!.style.opacity) : 1;
      expect(
        stripeOpacity,
        `stripe on "${title}" is faded to ${stripeOpacity}`,
      ).toBeGreaterThanOrEqual(0.8);
      return stripe!.style.background;
    });

    // Four DISTINCT accents — green / sky / violet / rose. Asserting identity
    // rather than a count: a build that painted every stripe the same colour
    // would still "have four stripes".
    expect(new Set(accents).size).toBe(4);
  }, 30000);

  it("the scope card is not dimmed and keeps its navy→green top accent", async () => {
    await renderOnArrival();
    const scopeCard = screen.getByLabelText("What to work on");
    expect(dimming(scopeCard as HTMLElement)).toBeNull();

    const stripe = scopeCard.querySelector<HTMLElement>("span[aria-hidden]");
    expect(stripe).not.toBeNull();
    expect(stripe!.style.background).toContain("linear-gradient");
  }, 30000);

  it("the gated CTA still prompts — and is still inert (the gate is not styling)", async () => {
    await renderOnArrival();
    // Gated: a non-button span with no navigation handler. If this ever becomes
    // a <button>, the routing gate has been lost to a styling change.
    const prompts = Array.from(
      document.querySelectorAll<HTMLElement>(".lt-mode-card span[aria-disabled]"),
    );
    expect(prompts.length).toBeGreaterThan(0);
    for (const p of prompts) {
      expect(p.tagName).toBe("SPAN");
      expect(p.textContent).toMatch(/pick a topic/i);
    }
  }, 30000);
});
