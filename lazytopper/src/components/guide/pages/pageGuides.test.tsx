/**
 * GUIDE-PAGES-1 — the shared pieces: the three copy tables (exact, ≤ 22 words a line, no "½"), M7's
 * lines from the panel's own data, the "?" door (first visit opens once per DEVICE, then on demand),
 * "Hide mascots", reduced motion, the admin preview, the guide arm only, and the analytics ids.
 * The page wiring is pinned by ./pageGuides.mounts.test.tsx.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, act, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { setMatchMediaMatches } from "../../../test/setup";

const { onboarding, auth } = vi.hoisted(() => ({
  onboarding: vi.fn(),
  auth: { currentUser: { uid: "u1", isAnonymous: false } as { uid: string; isAnonymous: boolean } | null },
}));
vi.mock("../../../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../analytics/analytics")>();
  return { ...actual, trackOnboardingEvent: onboarding };
});
vi.mock("../../../services/firebaseClient", () => ({
  authClient: {
    get currentUser() {
      return auth.currentUser;
    },
    onAuthStateChanged: () => () => {},
  },
}));

import {
  LimitByte,
  PAGE_GUIDE_SEEN_PREFIX,
  PageGuide,
  __resetGuideUidForTests,
  __resetPageGuidesForTests,
  inGuideArm,
} from "./pageGuides";
import { ENTRY_COPY, M7_COPY, POP_COPY, TRENDS_COPY, m7Lines } from "./pageGuidesChunk";
import { inGuideArm as momentsInGuideArm } from "../moments/moments";
import { __removeMascotsToastForTests } from "../moments/mascotsToast";
import { MASCOTS_HIDDEN_KEY, __resetMascotsForTests, hideMascots } from "../mascotsMute";
import { GUIDE_PREVIEW_KEY, __setGuideAbForTests } from "../guideVariant";
import type { LimitState } from "../../usage/fairUseGate";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// vitest runs with cwd = lazytopper/ (css ?raw imports are stubbed to "" under the test config).
const readCss = (rel: string) => readFileSync(resolve(process.cwd(), "src/components/guide/pages", rel), "utf8");
const doorCss = readCss("pageGuidesDoor.css");
const popCss = readCss("pageGuides.css");

const REDUCED = "(prefers-reduced-motion: reduce)";
const motion = (reduced: boolean) => setMatchMediaMatches((q) => (q === REDUCED ? reduced : false));
const calls = (name: string) => onboarding.mock.calls.filter((c) => c[0] === name);
const lines = () => screen.getAllByTestId("page-guide-line").map((n) => n.textContent);

/** Every string in a copy table, flattened. */
function strings(v: unknown): string[] {
  if (typeof v === "string") return [v];
  if (Array.isArray(v)) return v.flatMap(strings);
  if (v && typeof v === "object") return Object.values(v).flatMap(strings);
  return [];
}
const words = (s: string) => s.trim().split(/\s+/).length;

beforeEach(() => {
  window.localStorage.clear();
  __resetMascotsForTests();
  __resetPageGuidesForTests();
  __resetGuideUidForTests();
  auth.currentUser = { uid: "u1", isAnonymous: false };
  onboarding.mockReset();
  motion(false);
  __setGuideAbForTests(true, "guide");
});
afterEach(() => {
  cleanup();
  __removeMascotsToastForTests();
  __setGuideAbForTests(null);
});

describe("GUIDE-PAGES-1 · the copy tables (owner review)", () => {
  it("every line is ≤ 22 words and never uses '½'", () => {
    const all = [...strings(M7_COPY), ...strings(ENTRY_COPY), ...strings(TRENDS_COPY), ...strings(POP_COPY)];
    expect(all.length).toBeGreaterThan(30);
    for (const s of all) {
      expect(words(s), s).toBeLessThanOrEqual(22);
      expect(s, s).not.toContain("½");
      expect(s, s).not.toMatch(/₹|hurry|last chance|only today|limited time/i);
    }
  });

  it("M7 table, word for word", () => {
    expect(M7_COPY.trialHit).toEqual({
      checks: "Your answer checks for today are used up.",
      "chapter-test": "Your chapter test allowance for today is used up.",
      "full-mock": "Your full mock allowance for this week is used up.",
      worksheet: "Your worksheet allowance for this week is used up.",
      tutor: "Your Tutor messages for today are used up.",
      "more-like-this": "Your new practice questions for today are used up.",
    });
    expect(M7_COPY.still).toBe("Notes, Topic Hub, Exam Trends and NCERT solutions still work. Reading them never uses your limit.");
    expect(M7_COPY.premiumLine).toBe("Premium removes the trial's daily and weekly limits. A fair-use limit still applies.");
    // Never claims that worksheets are free: a worksheet GRADE is metered (fairUse.cjs GRADE_WORKSHEET_PATH).
    expect(M7_COPY.still).not.toMatch(/worksheet/i);
  });

  it("entry table: Section A / objective is 0 or full; papers are written on paper and uploaded", () => {
    expect(ENTRY_COPY.ws_entry.page.how).toMatch(/Section A answers score full marks or zero/);
    for (const c of [ENTRY_COPY.ct_entry.page, ENTRY_COPY.ct_entry.chooser, ENTRY_COPY.fm_entry.page]) {
      expect(c.how).toMatch(/full or zero/);
      expect(c.how).toMatch(/Write the rest on paper, upload, and get step-marked\./);
    }
    expect(ENTRY_COPY.fm_entry.page.first).toBe("First, keep 3 hours free. It's always timed, and your answers are saved if you're interrupted.");
  });

  it("Exam Trends table: one line per part the page really renders (no PYQ / CBQ claims — the page has none)", () => {
    expect(TRENDS_COPY.items.map((i) => i.key)).toEqual([
      "bands", "marks", "tier", "expect", "hpq", "learn", "notes", "select", "weightage", "guide",
    ]);
    expect(strings(TRENDS_COPY).join(" ")).not.toMatch(/\bPYQ|\bCBQ/);
  });
});

describe("GUIDE-PAGES-1 M7 · Byte's lines come from the panel's own data", () => {
  const trial = (scope: LimitState["scope"], resetAt: string | null): LimitState => ({ tier: "trial", scope, resetAt, window: null, allowance: 5 });

  it("trial, midnight reset → 'after midnight', the still-works line and the Premium line", () => {
    const l = m7Lines(trial("checks", "2026-10-22T18:30:00.000Z"), "12:00 am on Fri 23 Oct");
    expect(l).toEqual({
      hit: "Your answer checks for today are used up. It comes back after midnight.",
      still: M7_COPY.still,
      premium: M7_COPY.premiumLine,
    });
  });

  it("trial weekly, not midnight → the panel's own time; no resetAt → no reset sentence (never guessed)", () => {
    expect(m7Lines(trial("full-mock", "2026-10-25T09:00:00.000Z"), "2:30 pm on Sun 25 Oct").hit).toBe(
      "Your full mock allowance for this week is used up. It comes back at 2:30 pm on Sun 25 Oct.",
    );
    expect(m7Lines(trial("worksheet", null), "").hit).toBe("Your worksheet allowance for this week is used up.");
  });

  it("premium → its window, and NO Premium sales line", () => {
    const l = m7Lines({ tier: "premium", scope: "checks", resetAt: "2026-10-22T10:00:00.000Z", window: "fiveHour" }, "3:30 pm");
    expect(l.hit).toBe("You've reached Premium's 5-hour fair-use limit. It comes back at 3:30 pm.");
    expect(l.premium).toBeNull();
  });
});

function Limit({ limit, when = "" }: { limit: LimitState; when?: string }) {
  return <LimitByte limit={limit} when={when} />;
}
const TRIAL_CT: LimitState = { tier: "trial", scope: "chapter-test", resetAt: null, window: null, allowance: 1 };

describe("GUIDE-PAGES-1 M7 · LimitByte", () => {
  it("guide arm: the slot is reserved at once, then Byte says the lines; guide_moment_shown m7 once", async () => {
    render(<Limit limit={TRIAL_CT} />);
    expect(screen.getByTestId("guide-m7-slot")).toBeTruthy(); // reserved before the chunk / uid
    const m = await screen.findByTestId("guide-moment-m7");
    expect(screen.getByTestId("guide-m7-hit").textContent).toBe(M7_COPY.trialHit["chapter-test"]);
    expect(screen.getByTestId("guide-m7-still").textContent).toBe(M7_COPY.still);
    expect(screen.getByTestId("guide-m7-premium").textContent).toBe(M7_COPY.premiumLine);
    expect(m.querySelector("[data-testid='blob-byte']")).toBeTruthy();
    expect(screen.getByTestId("mascots-hide")).toBeTruthy();
    await waitFor(() => expect(calls("guide_moment_shown")).toEqual([["guide_moment_shown", { moment: "m7" }]]));
  });

  it("control arm / split off / signed out → nothing at all, not even the slot", async () => {
    __setGuideAbForTests(true, "control");
    const v = render(<Limit limit={TRIAL_CT} />);
    await act(async () => {});
    expect(screen.queryByTestId("guide-m7-slot")).toBeNull();
    v.unmount();
    __setGuideAbForTests(false);
    render(<Limit limit={TRIAL_CT} />);
    expect(screen.queryByTestId("guide-m7-slot")).toBeNull();
    cleanup();
    __setGuideAbForTests(true, "guide");
    __resetGuideUidForTests();
    auth.currentUser = null;
    render(<Limit limit={TRIAL_CT} />);
    await waitFor(() => expect(screen.queryByTestId("guide-m7-slot")).toBeNull());
  });

  it("Hide mascots → none", async () => {
    window.localStorage.setItem(MASCOTS_HIDDEN_KEY, "1");
    render(<Limit limit={TRIAL_CT} />);
    await act(async () => {});
    expect(screen.queryByTestId("guide-m7-slot")).toBeNull();
    expect(screen.queryByTestId("guide-moment-m7")).toBeNull();
  });

  it("reduced motion → Byte's still pose", async () => {
    motion(true);
    render(<Limit limit={TRIAL_CT} />);
    await screen.findByTestId("guide-moment-m7");
    await waitFor(() => expect(document.querySelector("[data-testid='guide-moment-m7'] .lt-gr-still")).toBeTruthy());
  });

  it("admin preview → the pill, and no analytics", async () => {
    window.localStorage.setItem(GUIDE_PREVIEW_KEY, JSON.stringify({ arm: "guide", until: Date.now() + 60_000 }));
    __setGuideAbForTests(true, null);
    render(<Limit limit={TRIAL_CT} />);
    await screen.findByTestId("guide-moment-m7");
    expect(screen.getByTestId("guide-admin-preview").textContent).toBe("Admin preview");
    expect(calls("guide_moment_shown")).toEqual([]);
  });
});

type DoorCase = { id: "ws_entry" | "ct_entry" | "fm_entry" | "trends_help"; step: "page" | "chooser"; first: string };
const DOORS: DoorCase[] = [
  { id: "ws_entry", step: "page", first: ENTRY_COPY.ws_entry.page.what },
  { id: "ct_entry", step: "chooser", first: ENTRY_COPY.ct_entry.chooser.what },
  { id: "ct_entry", step: "page", first: ENTRY_COPY.ct_entry.page.what },
  { id: "fm_entry", step: "page", first: ENTRY_COPY.fm_entry.page.what },
  { id: "trends_help", step: "page", first: TRENDS_COPY.intro },
];

function Door(p: DoorCase & { uid?: string | null }) {
  return (
    <MemoryRouter>
      <div data-testid="host">
        <PageGuide id={p.id} step={p.step} uid={p.uid} />
      </div>
    </MemoryRouter>
  );
}

describe("GUIDE-PAGES-1 · the '?' door: once per device, then on demand", () => {
  for (const d of DOORS) {
    it(`${d.id}/${d.step}: opens by itself on the first visit; next visit only via "?"; Got it closes`, async () => {
      const v = render(<Door {...d} />);
      const pop = await screen.findByTestId(`page-guide-pop-${d.id}`);
      expect(lines()[0]).toBe(d.first);
      // fixed card, portalled OUT of the host — it cannot push the page's content
      expect(screen.getByTestId("host").contains(pop)).toBe(false);
      expect(window.localStorage.getItem(`${PAGE_GUIDE_SEEN_PREFIX}${d.id}.${d.step}`)).toBe("1");
      // the lazy card can commit outside act(); its passive effect (the event) may land a tick later
      await waitFor(() => expect(calls("guide_moment_shown")).toEqual([["guide_moment_shown", { moment: d.id }]]));
      fireEvent.click(screen.getByTestId("page-guide-close"));
      expect(screen.queryByTestId(`page-guide-pop-${d.id}`)).toBeNull();
      v.unmount();

      // a later visit on this device: closed, the "?" is there
      __resetPageGuidesForTests();
      onboarding.mockReset();
      render(<Door {...d} />);
      const q = await screen.findByTestId(`page-guide-${d.id}-help`);
      await act(async () => {});
      expect(screen.queryByTestId(`page-guide-pop-${d.id}`)).toBeNull();
      fireEvent.click(q);
      expect(await screen.findByTestId(`page-guide-pop-${d.id}`)).toBeTruthy();
      expect(calls("guide_moment_click")).toEqual([["guide_moment_click", { moment: d.id }]]);
      await waitFor(() => expect(calls("guide_moment_shown")).toEqual([["guide_moment_shown", { moment: d.id }]]));
    });
  }

  it("Exam Trends: every item and Ziggy's one line", async () => {
    render(<Door id="trends_help" step="page" first="" />);
    await screen.findByTestId("page-guide-pop-trends_help");
    for (const it of TRENDS_COPY.items) {
      expect(screen.getByTestId(`trends-help-${it.key}`).textContent).toBe(`${it.label}${it.line}`);
    }
    expect(screen.getByTestId("page-guide-ziggy").textContent).toBe(`Ziggy ${TRENDS_COPY.ziggy}`);
  });

  it("a host-passed uid is used as is: null (signed out / local session) → nothing", async () => {
    render(<Door id="fm_entry" step="page" first="" uid={null} />);
    await act(async () => {});
    expect(screen.queryByTestId("page-guide-fm_entry")).toBeNull();
  });

  it("control arm → nothing; Hide mascots → nothing (and no marker is claimed)", async () => {
    __setGuideAbForTests(true, "control");
    const v = render(<Door id="ws_entry" step="page" first="" uid="u1" />);
    await act(async () => {});
    expect(screen.queryByTestId("page-guide-ws_entry")).toBeNull();
    v.unmount();
    __setGuideAbForTests(true, "guide");
    window.localStorage.setItem(MASCOTS_HIDDEN_KEY, "1");
    render(<Door id="ws_entry" step="page" first="" uid="u1" />);
    await act(async () => {});
    expect(screen.queryByTestId("page-guide-ws_entry")).toBeNull();
    expect(window.localStorage.getItem(`${PAGE_GUIDE_SEEN_PREFIX}ws_entry.page`)).toBeNull();
  });

  it("'Hide mascots' from the card hides the door and the card", async () => {
    render(<Door id="ct_entry" step="page" first="" uid="u1" />);
    await screen.findByTestId("page-guide-pop-ct_entry");
    fireEvent.click(screen.getByTestId("mascots-hide"));
    expect(screen.queryByTestId("page-guide-pop-ct_entry")).toBeNull();
    expect(screen.queryByTestId("page-guide-ct_entry")).toBeNull();
  });

  it("hidden while open (from elsewhere) → gone", async () => {
    render(<Door id="ct_entry" step="page" first="" uid="u1" />);
    await screen.findByTestId("page-guide-pop-ct_entry");
    act(() => hideMascots());
    expect(screen.queryByTestId("page-guide-pop-ct_entry")).toBeNull();
  });

  it("reduced motion → Byte's still pose in the card", async () => {
    motion(true);
    render(<Door id="ws_entry" step="page" first="" uid="u1" />);
    await screen.findByTestId("page-guide-pop-ws_entry");
    await waitFor(() => expect(document.querySelector("[data-testid='page-guide-pop-ws_entry'] .lt-gr-still")).toBeTruthy());
  });

  it("admin preview: opens EVERY visit (no marker written), the pill shows, analytics dropped", async () => {
    window.localStorage.setItem(GUIDE_PREVIEW_KEY, JSON.stringify({ arm: "guide", until: Date.now() + 60_000 }));
    __setGuideAbForTests(true, null);
    for (let i = 0; i < 2; i += 1) {
      render(<Door id="fm_entry" step="page" first="" uid="u1" />);
      await screen.findByTestId("page-guide-pop-fm_entry");
      expect(screen.getByTestId("guide-admin-preview")).toBeTruthy();
      cleanup();
      __resetPageGuidesForTests();
    }
    expect(window.localStorage.getItem(`${PAGE_GUIDE_SEEN_PREFIX}fm_entry.page`)).toBeNull();
    expect(onboarding).not.toHaveBeenCalled();
  });

  it("Esc closes the card", async () => {
    render(<Door id="ws_entry" step="page" first="" uid="u1" />);
    const pop = await screen.findByTestId("page-guide-pop-ws_entry");
    fireEvent.keyDown(pop, { key: "Escape" });
    expect(screen.queryByTestId("page-guide-pop-ws_entry")).toBeNull();
  });
});

describe("GUIDE-PAGES-1 · no layout shift (slot reserved / out of flow)", () => {
  it("the M7 slot is reserved by EAGER css; the card is position:fixed; the corner door is absolute", () => {
    expect(doorCss).toMatch(/\.lt-pg-m7slot\s*\{[^}]*min-height:\s*76px/);
    expect(doorCss).toMatch(/\.lt-pg-door--corner\s*\{[^}]*position:\s*absolute/);
    expect(doorCss).toMatch(/\.lt-pg-door--end, \.lt-pg-door--inline\s*\{[^}]*margin-top:\s*-4px;\s*margin-bottom:\s*-4px/);
    expect(popCss).toMatch(/\.lt-pg-pop\s*\{[^}]*position:\s*fixed/);
    expect(popCss).toMatch(/prefers-reduced-motion: reduce\)\s*\{\s*\.lt-pg__bub\s*\{\s*animation:\s*none/);
  });

  it("inGuideArm here equals the moments rule", () => {
    for (const arm of ["guide", "control"] as const) {
      __setGuideAbForTests(true, arm);
      expect(inGuideArm("u1")).toBe(momentsInGuideArm("u1"));
      expect(inGuideArm(null)).toBe(false);
    }
  });
});
