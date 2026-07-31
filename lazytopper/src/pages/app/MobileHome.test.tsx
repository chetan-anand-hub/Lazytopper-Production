import fs from "node:fs";
import path from "node:path";

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, renderHook, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { setMatchMediaMatches } from "../../test/setup";

// MobileHome reads auth/subscription via context hooks. Mock them so the unit
// test renders deterministically.
//
// NOTE: /browse is terminal at mobile width for signed-in students TOO — mobile
// "/" redirects them here (App.tsx RootEntry + the /browse route), so BOTH auth
// states are reachable here. PR-A2 made the difference load-bearing: signed-out
// gets the labelled SAMPLE panel, signed-in gets the honest empty state. The
// auth mock is therefore mutable, defaulting to signed-out.
const authState = vi.hoisted(() => ({
  user: null as null | { uid: string; displayName?: string; email?: string },
  logout: vi.fn(async () => {}),
}));
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: authState.user, logout: authState.logout }),
}));
// MobileAccountMenu (PR-A2) additionally reads tier + daysLeftInTrial.
// AUTH-2-FU: made MUTABLE — the values it defaults to are byte-identical to the
// fixed object it replaces, so every pre-existing test sees exactly what it saw
// before. Mutability exists for ONE reason: the header status pill has to be
// exercised in a state where it MUST render, or "no 'Signed in' pill" would be
// a vacuous negative that also passes when the header stops rendering at all.
const FREE_SUBSCRIPTION = {
  tier: "free",
  isTrialActive: false,
  isPremium: false,
  isTrialExpired: false,
  daysLeftInTrial: 0,
};
const subscriptionState = vi.hoisted(() => ({
  value: {
    tier: "free",
    isTrialActive: false,
    isPremium: false,
    isTrialExpired: false,
    daysLeftInTrial: 0,
  } as {
    tier: string;
    isTrialActive: boolean;
    isPremium: boolean;
    isTrialExpired: boolean;
    daysLeftInTrial: number;
  },
}));
vi.mock("../../hooks/useSubscription", () => ({
  useSubscription: () => subscriptionState.value,
}));

import MobileHome from "./MobileHome";
import MobileShell from "../../components/mobile/MobileShell";
import { useIsDesktop } from "../../hooks/useIsDesktop";

afterEach(() => {
  cleanup();
  authState.user = null; // never leak signed-in state into a later test
  subscriptionState.value = { ...FREE_SUBSCRIPTION }; // nor trial/premium state
});

function renderMobileHome() {
  return render(
    <MemoryRouter>
      <MobileHome />
    </MemoryRouter>,
  );
}

function signIn() {
  authState.user = { uid: "test-uid", displayName: "Asha Rao", email: "asha@example.com" };
}

/** The <style> block MobileHome injects — geometry is asserted against its text
 *  because jsdom does not lay out, so a computed box would be meaningless. */
function mobileHomeCss(): string {
  return Array.from(document.querySelectorAll("style"))
    .map((s) => s.textContent ?? "")
    .find((t) => t.includes(".lt-mhome-card")) ?? "";
}

describe("MobileHome (mobile /browse layout — Home redesign PR-A)", () => {
  it("renders the four SHARED hero cards in SPEC §2 journey order", () => {
    setMatchMediaMatches(false); // mobile
    renderMobileHome();

    const dests = screen.getAllByTestId("mobile-home-destination");
    expect(dests).toHaveLength(4);

    expect(dests[0]).toHaveTextContent("See what's likely");
    expect(dests[1]).toHaveTextContent("Ask your tutor");
    expect(dests[2]).toHaveTextContent("Practise it");
    expect(dests[3]).toHaveTextContent("Check my answer");

    // Each card carries its accent icon.
    for (const d of dests) {
      expect(d.querySelector("svg")).not.toBeNull();
    }
  });

  it("★ no longer ships mobile's duplicate destination", () => {
    // BEFORE the redesign this page hardcoded its own inventory and shipped a
    // duplicate: "What scores most" AND "What's likely in 2027" both resolved
    // to /exam-trends. It now renders the shared PRIMARY_CARDS, so every
    // navigating card has a distinct destination.
    setMatchMediaMatches(false);
    renderMobileHome();

    const hrefs = screen
      .getAllByTestId("mobile-home-destination")
      .map((d) => d.getAttribute("href"))
      .filter((h): h is string => h !== null);

    expect(hrefs).toHaveLength(3); // the tutor card is a button, not a link
    expect(new Set(hrefs).size).toBe(3);
  });

  it("routes each navigating destination to a canonical Home route", () => {
    setMatchMediaMatches(false);
    renderMobileHome();
    const dests = screen.getAllByTestId("mobile-home-destination");
    const hrefs = dests.map((d) => d.getAttribute("href"));

    expect(hrefs[0]).toContain("/exam-trends");
    // The tutor card opens the pop-card — it has no destination of its own,
    // because the tutor URL needs a subject + chapter first.
    expect(hrefs[1]).toBeNull();
    expect(hrefs[2]).toContain("/practice-hub");
    expect(hrefs[3]).toContain("/check-improve");

    // No legacy lookalikes.
    for (const h of hrefs) {
      if (h === null) continue;
      expect(h).not.toMatch(/\/dashboard|\/profile|^\/trends|^\/practice(\?|$)/);
    }
  });

  // Scope note: this asserts the mobile card is WIRED to the shared picker and
  // shows the signed-out framing. The navigation contract itself (that a
  // logged-out pick goes to /login and never to /tutor) is proven exhaustively
  // in homeDestinations.test.tsx — don't restate it here and imply more.
  it("the tutor card opens the shared pop-card with the signed-out gate note", () => {
    setMatchMediaMatches(false);
    renderMobileHome();

    expect(screen.queryByTestId("tutor-picker")).toBeNull();
    fireEvent.click(screen.getAllByTestId("mobile-home-destination")[1]);

    const picker = screen.getByTestId("tutor-picker");
    expect(picker).toBeInTheDocument();
    // Signed out — the footer must promise the return trip, not premium.
    expect(screen.getByTestId("tutor-picker-gate-note")).toHaveTextContent(
      /Log in to open your tutor/i,
    );
  });

  // ── PR-A2: the SAMPLE Mistake-Intelligence panel ──────────────────────
  //
  // PR-A removed this panel by over-reading spec §4's "real data only". The
  // rule bans presenting invented numbers as the student's OWN; a panel
  // explicitly badged a sample is a demonstration. Mobile /browse is a
  // conversion surface, so a signed-out visitor must see what MI produces.

  it("★ SIGNED-OUT renders the SAMPLE mistake-intelligence panel", () => {
    setMatchMediaMatches(false);
    renderMobileHome();

    expect(screen.getByTestId("mobile-home-mistake-panel")).toBeInTheDocument();
    expect(screen.getByText(/not just the wrong answer/i)).toBeInTheDocument();
    expect(screen.getByText(/Most marks lost: Trigonometry, conceptual/i)).toBeInTheDocument();
    expect(screen.getByTestId("mobile-home-mi-sample-cta")).toHaveTextContent(
      /Start free — find my reasons/i,
    );

    // Four semantic buckets, restyled into PR-A's MI grammar.
    const buckets = screen.getAllByTestId("mobile-home-mi-bucket");
    expect(buckets).toHaveLength(4);
    expect(buckets.map((b) => b.textContent)).toEqual([
      "45%Conceptual",
      "30%Calculation",
      "15%Silly mistake",
      "10%Presentation",
    ]);
  });

  it("★★ the SAMPLE LABEL is present and SCOPES the sample figures", () => {
    // The label is what makes this honest — without it the panel IS a
    // fabrication. It must exist AND must contain the numbers it qualifies,
    // so a reader cannot see the figures without seeing the badge.
    setMatchMediaMatches(false);
    renderMobileHome();

    const label = screen.getByTestId("mobile-home-mistake-sample-label");
    expect(label).toBeInTheDocument();
    expect(label).toHaveTextContent(/sample/i);
    expect(label).toHaveTextContent(/Sample · what your report looks like/i);

    // Containment: the badge and every sample bucket share one ancestor block.
    const scope = label.closest(".lt-mhome-sample");
    expect(scope).not.toBeNull();
    for (const bucket of screen.getAllByTestId("mobile-home-mi-bucket")) {
      expect(scope!.contains(bucket)).toBe(true);
    }
    // And the read-out sits inside that same scope.
    expect(scope!.textContent).toMatch(/Most marks lost/i);
  });

  it("★ SIGNED-IN does NOT render the sample — it keeps the honest empty state", () => {
    setMatchMediaMatches(false);
    signIn();
    renderMobileHome();

    expect(screen.queryByTestId("mobile-home-mistake-sample-label")).toBeNull();
    expect(screen.queryByText(/Most marks lost: Trigonometry, conceptual/i)).toBeNull();
    expect(screen.queryByTestId("mobile-home-mi-sample-cta")).toBeNull();

    // PR-A's empty state, unchanged: a dash where a real count would go.
    expect(screen.getByText("Your mistake patterns will show here")).toBeInTheDocument();
    expect(screen.getByText(/Built from your real attempts — never guessed/i)).toBeInTheDocument();
    expect(screen.getByText("Practise a set to see your mistakes.")).toBeInTheDocument();

    const buckets = screen.getAllByTestId("mobile-home-mi-bucket");
    expect(buckets).toHaveLength(4);
    expect(buckets.map((b) => b.textContent)).toEqual([
      "—Conceptual",
      "—Calculation",
      "—Silly mistake",
      "—Presentation",
    ]);
    // No invented counts anywhere in the signed-in card.
    for (const b of buckets) {
      expect(b.textContent).not.toMatch(/\d/);
    }
  });

  it("★ carries NO 'Ask the tutor about these' CTA on the MI card", () => {
    // Deliberately omitted (SPEC §4): MistakeLogEntry spans many topics while
    // buildTutorPath needs exactly one, so there is no single honest target.
    setMatchMediaMatches(false);
    renderMobileHome();
    expect(screen.queryByText(/ask the tutor about these/i)).toBeNull();
  });

  it("collapses the quick links into a tap-to-open list", () => {
    setMatchMediaMatches(false);
    renderMobileHome();

    const links = screen.getAllByTestId("mobile-home-quick-link");
    expect(links).toHaveLength(4);
    // Worksheets stay reachable after the hero card retired.
    const hrefs = links.map((l) => l.getAttribute("href") ?? "");
    expect(hrefs.some((h) => h.includes("/practice/worksheets"))).toBe(true);
  });

  it("does NOT show a resume strip for a signed-out visitor", () => {
    setMatchMediaMatches(false);
    renderMobileHome();
    expect(screen.queryByTestId("mobile-home-resume")).toBeNull();
  });

  it("renders exactly ONE brand bar (its own locked-design header)", () => {
    // The global public navbar is suppressed on mobile /browse (see
    // isMobileSelfChromedRoute), so MobileHome must carry a single brand bar.
    // There is no MobileShell wrapper and no account-avatar menu on this route.
    setMatchMediaMatches(false);
    renderMobileHome();
    expect(screen.getAllByText("LazyTopper")).toHaveLength(1);
  });
});

/**
 * ★★ THE FIREBASE-FREE BOUNDARY
 *
 * The entire reason a SAMPLE panel exists on this surface is that MobileHome
 * must not pull a firebase-booting module into the mobile chunk (our audience is
 * phone-first). A grep of this one file would not catch it — the risk is a
 * TRANSITIVE import three hops down. So walk the real static import graph.
 *
 * If this ever goes red, the fix is NOT to loosen the test: it means something
 * on the mobile Home path started booting firebase. See [FU-MOBILE-MI-REAL-DATA].
 */
describe("MobileHome import graph — firebase-free by construction", () => {
  // vitest's jsdom transform does not give a file: import.meta.url, so anchor
  // on the project root (vitest root === lazytopper/). The existsSync
  // assertions below double as a guard against this path silently drifting.
  const SRC = path.resolve(process.cwd(), "src");
  const ENTRY = path.join(SRC, "pages/app/MobileHome.tsx");
  const EXTS = [".ts", ".tsx", ".js", ".jsx"];

  function resolve(spec: string, fromFile: string): string | null {
    if (!spec.startsWith(".")) return null; // bare specifier — handled separately
    const base = path.resolve(path.dirname(fromFile), spec);
    for (const c of [base, ...EXTS.map((e) => base + e), ...EXTS.map((e) => path.join(base, "index" + e))]) {
      if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
    }
    return null;
  }

  /** Every module reachable from MobileHome, plus every bare package it pulls. */
  function walk(entry: string) {
    const files = new Set<string>();
    const bare = new Set<string>();
    const queue = [entry];
    while (queue.length) {
      const file = queue.pop()!;
      if (files.has(file)) continue;
      files.add(file);
      const src = fs.readFileSync(file, "utf8");
      // `import x from "y"`, `export * from "y"`, and dynamic `import("y")`.
      const specs = [
        ...src.matchAll(/(?:^|\n)\s*(?:import|export)[\s\S]*?from\s+["']([^"']+)["']/g),
        ...src.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g),
        ...src.matchAll(/(?:^|\n)\s*import\s+["']([^"']+)["']/g),
      ].map((m) => m[1]);
      for (const s of specs) {
        const r = resolve(s, file);
        if (r) queue.push(r);
        else if (!s.startsWith(".")) bare.add(s);
      }
    }
    return { files, bare };
  }

  /** The specifiers MobileHome.tsx itself declares (direct imports only). */
  function directImports(file: string): string[] {
    const src = fs.readFileSync(file, "utf8");
    return [
      ...src.matchAll(/(?:^|\n)\s*(?:import|export)[\s\S]*?from\s+["']([^"']+)["']/g),
      ...src.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g),
    ].map((m) => m[1]);
  }

  const DATA_LAYER =
    /(^@?firebase(\/|$))|firebaseClient|mistakeLogService|mistakeInsightsService|studentCloudStore|studentProgressStore/;

  it("★ MobileHome.tsx imports NO mistake-data or firebase module DIRECTLY", () => {
    expect(fs.existsSync(ENTRY)).toBe(true); // path did not drift
    const specs = directImports(ENTRY);

    // Sanity: we actually parsed imports (not a vacuously empty list).
    expect(specs.length).toBeGreaterThan(3);
    expect(specs.some((s) => s.includes("homeDestinations"))).toBe(true);

    expect(specs.filter((s) => DATA_LAYER.test(s))).toEqual([]);
  });

  it("CONTROL: the scanner detects a planted data-layer import", () => {
    // A green result above means nothing unless this check can go red.
    const planted = [...directImports(ENTRY), "../../services/mistakeLogService"];
    expect(planted.filter((s) => DATA_LAYER.test(s))).toEqual([
      "../../services/mistakeLogService",
    ]);
  });

  it("characterisation: firebase ALREADY arrives transitively — pre-existing, not from this file", () => {
    // ★ CORRECTION TO A LONG-STANDING PREMISE.
    //
    // MobileHome's doc comment used to claim the page "stays firebase-free".
    // It does not, and never did: AuthContext and useSubscription both reach
    // firestore — and AuthContext reaches mistakeLogService ITSELF. Verified by
    // walking the real graph, on trunk, before PR-A2 changed anything.
    //
    // Consequences, recorded here so they are not forgotten:
    //   1. The SAMPLE panel's honesty rests on its LABEL, not on a bundle
    //      boundary. That is why the label is the load-bearing part.
    //   2. [FU-MOBILE-MI-REAL-DATA]'s bundle argument is void — reading real
    //      logs here would add NO new module to the mobile chunk. The FU should
    //      be re-scoped as a product/UX decision, not a bundle one.
    //
    // This test asserts the CURRENT TRUTH. If someone genuinely severs the
    // boundary later, it will fail loudly and force this comment to be updated
    // rather than letting a false claim persist in the codebase.
    const { files, bare } = walk(ENTRY);
    expect([...bare].some((s) => /^@?firebase(\/|$)/.test(s))).toBe(true);
    expect([...files].some((f) => path.basename(f) === "mistakeLogService.ts")).toBe(true);

    // ...and it arrives via auth/subscription, NOT via anything Home added.
    const ownSpecs = directImports(ENTRY);
    expect(ownSpecs.filter((s) => DATA_LAYER.test(s))).toEqual([]);
  });
});

/**
 * PR-A2 ADD 1 — the practice-hub "side and edge" colour treatment.
 *
 * Colour lives in the SPINE and the BORDER; the body is a neutral gradient.
 * #520 declared the ::before spine but never gave it a background, so
 * HOME_ACCENTS.spine was defined and never consumed — the accent side had never
 * rendered at all. That is what made the cards read lifeless.
 */
describe("Home cards — accent spine + accent edge (colour only)", () => {
  it("(a) every card carries its accent as spine / line / hover tones", () => {
    setMatchMediaMatches(false);
    renderMobileHome();

    const cards = screen.getAllByTestId("mobile-home-destination");
    expect(cards).toHaveLength(4);

    // Tones ride as inline custom properties; the CSS consumes them.
    const tones = cards.map((c) => ({
      spine: c.style.getPropertyValue("--lt-spine").trim(),
      line: c.style.getPropertyValue("--lt-line").trim(),
      accent: c.style.getPropertyValue("--lt-accent").trim(),
    }));
    for (const t of tones) {
      expect(t.spine).not.toBe("");
      expect(t.line).not.toBe("");
      expect(t.accent).not.toBe("");
    }
    // Four DISTINCT accents, in the shipped order: amber, green, navy, red.
    expect(new Set(tones.map((t) => t.spine)).size).toBe(4);
    expect(tones[0].spine).toBe("hsl(38, 80%, 52%)");   // Exam Trends — amber
    expect(tones[1].spine).toBe("hsl(152, 55%, 45%)");  // Tutor — green
    expect(tones[2].spine).toBe("hsl(222, 47%, 24%)");  // Practice — navy
    expect(tones[3].spine).toBe("hsl(0, 60%, 52%)");    // Check & Improve — red

    const css = mobileHomeCss();
    // The spine is actually PAINTED (the #520 defect: declared, never coloured).
    expect(css).toMatch(/\.lt-mhome-card::before\s*\{[^}]*background:\s*var\(--lt-spine\)/);
    // The edge is the accent line at rest and the full accent on hover.
    expect(css).toMatch(/\.lt-mhome-card\s*\{[^}]*border:\s*1px solid var\(--lt-line\)/);
    expect(css).toMatch(/\.lt-mhome-card:hover\s*\{[^}]*border-color:\s*var\(--lt-accent\)/);
    // Body is the NEUTRAL vertical gradient, not an accent tint.
    expect(css).toMatch(/\.lt-mhome-card\s*\{[^}]*linear-gradient\(180deg[^)]*\)/);
  });

  it("★ (b) card GEOMETRY is unchanged from c8dab29 — colour only", () => {
    // A resized card is a regression. These are the exact values #520 shipped;
    // the colour treatment must not have touched any of them.
    setMatchMediaMatches(false);
    renderMobileHome();
    const css = mobileHomeCss();

    expect(css).toMatch(/\.lt-mhome-card\s*\{[^}]*border-radius:\s*16px/);
    expect(css).toMatch(/\.lt-mhome-card\s*\{[^}]*padding:\s*14px/);
    // Carousel placement: card width, snap and the 14px bleed.
    expect(css).toMatch(/flex:\s*0 0 calc\(100% - 26px\)/);
    expect(css).toMatch(/scroll-snap-type:\s*x mandatory/);
    expect(css).toMatch(/margin:\s*0 -14px/);
    expect(css).toMatch(/padding:\s*2px 14px 12px/);
    expect(css).toMatch(/gap:\s*12px/);

    // Dots still track four cards.
    expect(document.querySelectorAll(".lt-mhome-dots span")).toHaveLength(4);
  });
});

/**
 * PR-A2 ADD 2 — the account avatar on mobile Home.
 *
 * NOTE this is a NEW capability on this surface, not a restored one: /browse
 * never had an account menu. It is mounted directly (not via MobileShell)
 * because /browse is deliberately self-chromed — wrapping it would stack two
 * headers.
 */
describe("Mobile Home account avatar", () => {
  it("(c) renders for a signed-in student and opens the account menu", () => {
    setMatchMediaMatches(false);
    signIn();
    renderMobileHome();

    const avatar = screen.getByRole("button", { name: /open account menu/i });
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveTextContent("A"); // initial of "Asha Rao"
    expect(screen.queryByRole("menu")).toBeNull();

    fireEvent.click(avatar);
    const menu = screen.getByRole("menu", { name: /account menu/i });
    expect(menu).toBeInTheDocument();

    // Same functionality as every other surface.
    expect(screen.getByRole("menuitem", { name: /me \/ progress/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /manage subscription/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /log out/i })).toBeInTheDocument();

    // And it still owns exactly ONE brand bar — no shell was introduced.
    expect(screen.getAllByText("LazyTopper")).toHaveLength(1);
  });

  it("renders nothing for a signed-out visitor (bar unchanged)", () => {
    setMatchMediaMatches(false);
    renderMobileHome();
    expect(screen.queryByRole("button", { name: /open account menu/i })).toBeNull();
  });

  it("★★ (d) the dropdown is NOT trapped by a stacking context", () => {
    // [FU-HUB-DROPDOWN-ZINDEX] class of bug: a backdrop-filter / transform /
    // filter / opacity on an ancestor creates a stacking context that pins the
    // dropdown BENEATH page content, however high its z-index. Assert that no
    // ancestor between the menu and the page root creates one, and that the
    // menu outranks the hero cards.
    setMatchMediaMatches(false);
    signIn();
    renderMobileHome();
    fireEvent.click(screen.getByRole("button", { name: /open account menu/i }));

    const menu = screen.getByRole("menu", { name: /account menu/i });
    expect(Number(menu.style.zIndex)).toBeGreaterThanOrEqual(50);

    const root = screen.getByTestId("mobile-home");
    const TRAPS = ["backdropFilter", "webkitBackdropFilter", "filter", "transform", "perspective"] as const;
    for (let el: HTMLElement | null = menu.parentElement; el && el !== root.parentElement; el = el.parentElement) {
      for (const prop of TRAPS) {
        const v = (el.style as unknown as Record<string, string>)[prop];
        expect(v === undefined || v === "" || v === "none").toBe(true);
      }
      const op = el.style.opacity;
      expect(op === "" || Number(op) === 1).toBe(true);
    }

    // The hero cards are positioned but carry no competing z-index, so a
    // z-index:50 dropdown paints above them.
    for (const card of screen.getAllByTestId("mobile-home-destination")) {
      expect(card.style.zIndex === "" || Number(card.style.zIndex) < 50).toBe(true);
    }
  });
});

/**
 * PR-A2 — the extraction must not change MobileShell.
 */
describe("MobileShell — unchanged by the MobileAccountMenu extraction", () => {
  it("(e) still renders its header with the account avatar in the right cluster", () => {
    setMatchMediaMatches(false);
    signIn();
    render(
      <MemoryRouter>
        <MobileShell title="Check &amp; Improve" subtitle="Grade your answer">
          <p>body</p>
        </MobileShell>
      </MemoryRouter>,
    );

    expect(screen.getByText("Grade your answer")).toBeInTheDocument();
    // The avatar the shell has always rendered — now via the extracted module.
    const avatar = screen.getByRole("button", { name: /open account menu/i });
    expect(avatar).toBeInTheDocument();
    fireEvent.click(avatar);
    expect(screen.getByRole("menu", { name: /account menu/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /log out/i })).toBeInTheDocument();
  });

  it("renders no avatar when signed out — the shell's pre-existing behaviour", () => {
    setMatchMediaMatches(false);
    render(
      <MemoryRouter>
        <MobileShell title="Practice">
          <p>body</p>
        </MobileShell>
      </MemoryRouter>,
    );
    expect(screen.queryByRole("button", { name: /open account menu/i })).toBeNull();
  });
});

/**
 * AUTH-2-FU §2 (owner-ruled scope EXTENSION) — the mobile brand bar used to
 * render a "Signed in" pill next to the account avatar. That is the SAME
 * redundancy this lane deleted from the desktop greeting card. Leaving it would
 * have left the two surfaces disagreeing about whether that pill is noise.
 *
 * ★ Every assertion below that something is ABSENT is paired with a CONTROL in
 * which the very same query FINDS something — otherwise a renamed pill, a
 * header that stopped rendering, or a component that threw would all pass.
 */
describe("★ AUTH-2-FU · MobileHome brand bar — the redundant 'Signed in' pill is gone", () => {
  it("signed in on a free account: NO 'Signed in' pill — CONTROL: the bar and the avatar still render", () => {
    setMatchMediaMatches(false);
    signIn();
    renderMobileHome();

    // CONTROL 1 — the brand bar really did render, so the negative below is
    // not the vacuous pass of a page that failed to mount.
    expect(screen.getByText("LazyTopper")).toBeInTheDocument();
    // CONTROL 2 — the avatar, which is the thing that ALREADY says "signed in",
    // is present. The pill's whole justification is that this is redundant.
    expect(screen.getByRole("button", { name: /open account menu/i })).toBeInTheDocument();

    // THE ASSERTION.
    expect(screen.queryByText(/^Signed in$/)).toBeNull();
    expect(screen.queryByTestId("mobile-home-status-pill")).toBeNull();
  });

  it("★ CONTROL: the pill element itself is alive — a trialling student still sees 'Trial active' in that slot", () => {
    setMatchMediaMatches(false);
    signIn();
    subscriptionState.value = {
      ...FREE_SUBSCRIPTION,
      isTrialActive: true,
      daysLeftInTrial: 5,
    };
    renderMobileHome();

    const pill = screen.getByTestId("mobile-home-status-pill");
    expect(pill).toHaveTextContent("Trial active");
    // ...and it is still "Signed in"-free: the deletion removed one BRANCH, not
    // the pill. If a future edit reinstated the branch, the test above goes red.
    expect(screen.queryByText(/^Signed in$/)).toBeNull();
  });

  it("the two other informative states survive — 'Premium' and 'Trial expired' were never the redundancy", () => {
    setMatchMediaMatches(false);
    signIn();
    subscriptionState.value = { ...FREE_SUBSCRIPTION, tier: "premium", isPremium: true };
    renderMobileHome();
    expect(screen.getByTestId("mobile-home-status-pill")).toHaveTextContent("Premium");
    cleanup();

    signIn();
    subscriptionState.value = { ...FREE_SUBSCRIPTION, isTrialExpired: true };
    renderMobileHome();
    expect(screen.getByTestId("mobile-home-status-pill")).toHaveTextContent("Trial expired");
  });

  it("signed OUT is untouched — the 'Start free' call to action still occupies the slot", () => {
    setMatchMediaMatches(false);
    renderMobileHome();
    expect(screen.getByText("Start free")).toBeInTheDocument();
    expect(screen.queryByText(/^Signed in$/)).toBeNull();
  });
});

describe("Home route switch predicate (isDesktop ? DesktopHome : MobileHome)", () => {
  it("useIsDesktop returns true at desktop width and false at mobile — driving the /browse branch", () => {
    // Desktop: the /browse branch selects DesktopHome.
    setMatchMediaMatches(true);
    const desktop = renderHook(() => useIsDesktop());
    expect(desktop.result.current).toBe(true);

    // Mobile: the /browse branch selects MobileHome.
    setMatchMediaMatches(false);
    const mobile = renderHook(() => useIsDesktop());
    expect(mobile.result.current).toBe(false);
  });
});
