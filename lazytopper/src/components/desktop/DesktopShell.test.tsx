import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

/**
 * DesktopShell — rail contents + header stacking contract (PR-B2).
 *
 * This suite is the OTHER HALF of the PR-B1 trade: the blanket ban on editing
 * DesktopShell.tsx was lifted (check_improve_convergence_acceptance.mjs:482 is
 * now a comment), and DesktopShell had NEITHER a ban NOR a test. These pin the
 * two things the ban was implicitly protecting — the rail's contents, and the
 * fact that the shell chrome paints above page content.
 *
 * The shell reads auth/subscription via context hooks and mounts
 * MistakeIntelCard, which pulls firebase through mistakeLogService. All three
 * are mocked so this renders as a hermetic unit test.
 */
const authState = vi.hoisted(() => ({
  user: null as null | { uid: string; displayName?: string; email?: string },
  logout: vi.fn(async () => {}),
}));
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: authState.user, logout: authState.logout }),
}));
vi.mock("../../hooks/useSubscription", () => ({
  useSubscription: () => ({
    tier: "free",
    isTrialActive: false,
    isPremium: false,
    isTrialExpired: false,
    daysLeftInTrial: 0,
  }),
}));
// Sidebar Mistake Intel block — firebase-backed, and not under test here.
vi.mock("./MistakeIntelCard", () => ({
  MistakeIntelCard: () => <div data-testid="mistake-intel-card" />,
}));

import { DesktopShell } from "./DesktopShell";

afterEach(() => {
  cleanup();
  authState.user = null; // never leak signed-in state into a later test
});

function renderShell() {
  return render(
    <MemoryRouter>
      <DesktopShell>
        <div data-testid="page-content">page</div>
      </DesktopShell>
    </MemoryRouter>,
  );
}

function signIn() {
  authState.user = { uid: "test-uid", displayName: "Asha Rao", email: "asha@example.com" };
}

/** Every rail entry, in rendered order, as [label, href|null]. */
function railEntries(): Array<[string, string | null]> {
  const nav = document.querySelector("nav");
  if (!nav) throw new Error("rail <nav> not found");
  return Array.from(nav.children).map((el) => [
    el.textContent?.trim() ?? "",
    el.getAttribute("href"),
  ]);
}

describe("DesktopShell rail — the five routed destinations (anti-regression)", () => {
  it("renders the five existing items, in order, with their existing destinations", () => {
    signIn();
    renderShell();

    const routed = railEntries().filter(([, href]) => href !== null);
    expect(routed).toEqual([
      ["Home", "/"],
      ["Exam Trends", "/exam-trends"],
      ["Practice", "/practice-hub"],
      ["Check & Improve", "/check-improve"],
      ["Me / Progress", "/me"],
    ]);
  });

  it("keeps the signed-out Home redirect to /browse", () => {
    renderShell(); // signed out

    const routed = railEntries().filter(([, href]) => href !== null);
    expect(routed[0]).toEqual(["Home", "/browse"]);
    // The other four are unaffected by auth state.
    expect(routed.slice(1).map(([, href]) => href)).toEqual([
      "/exam-trends",
      "/practice-hub",
      "/check-improve",
      "/me",
    ]);
  });
});

describe("DesktopShell rail — the Tutor entry (PR-B2)", () => {
  // ── ASSERTION 2 (mutation-tested) ──────────────────────────────────────
  // Pins the design decision from the spec §1: the Tutor entry opens a modal,
  // so it must NOT be a navigating link. A NavLink with a placeholder `to`
  // would render a real anchor a student can middle-click into a dead route.
  it("sits at rank 2 and is a button, NOT a navigating link", () => {
    signIn();
    renderShell();

    const entries = railEntries();
    expect(entries[1][0]).toBe("Tutor");

    const tutor = screen.getByRole("button", { name: "Tutor" });
    expect(tutor.tagName).toBe("BUTTON");
    // The load-bearing half: no href anywhere on it, and it is not an anchor.
    expect(tutor.hasAttribute("href")).toBe(false);
    expect(entries[1][1]).toBeNull();
    expect(document.querySelector("nav a[href='/tutor']")).toBeNull();
  });

  it("is visually indistinguishable from its routed neighbours at rest", () => {
    signIn();
    renderShell();

    const tutor = screen.getByRole("button", { name: "Tutor" });
    const neighbour = screen.getByRole("link", { name: "Exam Trends" });

    // Prove the instrument before trusting the comparison: if jsdom resolved
    // these to "" the loop below would pass vacuously on two empty strings.
    expect(getComputedStyle(neighbour).fontSize).toBe("14px");
    expect(getComputedStyle(neighbour).fontWeight).toBe("500");
    expect(getComputedStyle(tutor).fontSize).toBe("14px");

    // The shared treatment: both render from navItemStyle(), so the resting
    // values must match exactly rather than approximately.
    for (const prop of [
      "display",
      "align-items",
      "gap",
      "padding",
      "border-radius",
      "font-size",
      "font-weight",
      "color",
      "background-color",
    ] as const) {
      expect(getComputedStyle(tutor).getPropertyValue(prop)).toBe(
        getComputedStyle(neighbour).getPropertyValue(prop),
      );
    }
  });

  it("opens the picker on activation and closes it again", () => {
    signIn();
    renderShell();

    expect(screen.queryByTestId("tutor-picker")).toBeNull();

    const tutor = screen.getByRole("button", { name: "Tutor" });
    expect(tutor).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(tutor);
    expect(screen.getByTestId("tutor-picker")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tutor" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );

    // Close via the picker's own dismiss control.
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(screen.queryByTestId("tutor-picker")).toBeNull();
    expect(screen.getByRole("button", { name: "Tutor" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("reads as active ONLY while the picker is open", () => {
    signIn();
    renderShell();

    const resting = getComputedStyle(screen.getByRole("button", { name: "Tutor" }));
    const restingWeight = resting.fontWeight;
    const restingBg = resting.backgroundColor;

    fireEvent.click(screen.getByRole("button", { name: "Tutor" }));

    const open = getComputedStyle(screen.getByRole("button", { name: "Tutor" }));
    expect(open.fontWeight).not.toBe(restingWeight);
    expect(open.backgroundColor).not.toBe(restingBg);
    // The active treatment is the rail's own, not an invented one.
    expect(open.fontWeight).toBe("600");
  });

  // The shell passes auth state DOWN as a prop. homeDestinations' whole import
  // graph must stay firebase-free (its §"THE FIREBASE-FREE RULE"), which is the
  // only reason a non-Home surface can mount the picker at all.
  it("passes isSignedIn through — the signed-out picker routes via /login", () => {
    renderShell(); // signed out

    fireEvent.click(screen.getByRole("button", { name: "Tutor" }));

    // Signed-out composes a login round-trip that returns to the chosen chapter;
    // signed-in would go straight to /tutor. Asserting the rendered gate note
    // proves the prop arrived without reaching into the picker's internals.
    expect(screen.getByTestId("tutor-picker-gate-note")).toHaveTextContent(
      /Log in to open your tutor/i,
    );
  });

  it("signed-in gets the premium/trial framing, not the login one", () => {
    signIn();
    renderShell();

    fireEvent.click(screen.getByRole("button", { name: "Tutor" }));

    const note = screen.getByTestId("tutor-picker-gate-note");
    expect(note).not.toHaveTextContent(/Log in to open your tutor/i);
    expect(note).toHaveTextContent(/7-day trial/i);
  });
});

describe("DesktopShell header — stacking contract ([FU-HUB-DROPDOWN-ZINDEX])", () => {
  // ── ASSERTION 4 (mutation-tested) ──────────────────────────────────────
  // The header's backdrop-filter creates a stacking context. Without a position
  // AND a z-index of its own it painted in the non-positioned layer, so every
  // positioned element in <main> covered it and the account dropdown inside was
  // trapped. Asserted as COMPUTED values, never a match on style text.
  it("carries a position and a z-index so the dropdown escapes", () => {
    signIn();
    renderShell();

    const header = document.querySelector("header");
    expect(header).not.toBeNull();

    const style = getComputedStyle(header!);
    // A z-index only takes effect on a positioned element — both halves are
    // load-bearing, so both are asserted.
    expect(style.position).not.toBe("static");
    expect(style.zIndex).not.toBe("auto");
    expect(style.zIndex).not.toBe("");

    const z = Number(style.zIndex);
    expect(Number.isFinite(z)).toBe(true);

    // FLOOR: above the highest z-index used by page content anywhere in the app
    // (Worksheets.tsx:484, z-index 30; every other content value is <= 20), and
    // so above the `z-index: auto` positioned cards that caused the reported bug.
    expect(z).toBeGreaterThan(30);

    // CEILING: below `.command-palette-backdrop` (styles.css:6505, z-index 50)
    // — the palette this header's own search box opens — and therefore below
    // the tutor overlays (60) and the 9998-10000 full-screen band, all of which
    // must keep covering the header.
    expect(z).toBeLessThan(50);
  });

  it("still creates the context the account dropdown lives in", () => {
    signIn();
    renderShell();

    // The dropdown is unchanged at zIndex 50 INSIDE the header's context; the
    // fix moved the header, not the menu. If a later edit "fixes" the menu
    // instead, this pins that the header is still the positioned ancestor.
    fireEvent.click(screen.getByRole("button", { name: "Open account menu" }));
    const menu = screen.getByRole("menu", { name: "Account menu" });
    expect(menu.closest("header")).not.toBeNull();
    expect(getComputedStyle(menu).zIndex).toBe("50");
  });

  it("keeps the picker OUTSIDE the header, where its own z-index still works", () => {
    signIn();
    renderShell();

    fireEvent.click(screen.getByRole("button", { name: "Tutor" }));
    const picker = screen.getByTestId("tutor-picker");

    // The header is a containing block for position:fixed descendants (via
    // backdrop-filter) and now has z-index 25 — mounting the overlay inside it
    // would break its full-viewport geometry and trap it under the palette.
    expect(picker.closest("header")).toBeNull();
    expect(picker.closest("nav")).toBeNull();
  });
});
