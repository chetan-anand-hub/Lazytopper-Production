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
import { isNextMidnight, m7DialogLine } from "./m7Copy";
import { inGuideArm as momentsInGuideArm } from "../moments/moments";
import { __removeMascotsToastForTests } from "../moments/mascotsToast";
import { MASCOTS_HIDDEN_KEY, __resetMascotsForTests, hideMascots } from "../mascotsMute";
import { GUIDE_PREVIEW_KEY, __setGuideAbForTests, guideFocusOpen } from "../guideVariant";
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
    });
    expect(M7_COPY.still).toBe("Notes, Topic Hub, Exam Trends and NCERT solutions still work. Reading them never uses your limit.");
    // No Premium line of Byte's: the panel's own lead already carries it (no repeat, no pressure).
    expect(strings(M7_COPY).join(" ")).not.toMatch(/Premium removes/);
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
    // IMPQ-RENAME-1 (#1102, owner rulings D2/D116): the public wording never claims to know an
    // upcoming paper — "patterns to practise, not the 2027 paper". The line describes the button.
    const hpq = TRENDS_COPY.items.find((i) => i.key === "hpq")?.line ?? "";
    expect(hpq).toBe(
      "Important Qs opens this chapter's Important Questions page: board-pattern questions built from 10 years of CBSE papers. Patterns, not the actual paper.",
    );
    expect(hpq).not.toMatch(/predict|2027|highly probable|will come|guarantee/i);
    // Byte's own closing tip — no second character, no Ziggy name anywhere in the card's copy.
    expect(TRENDS_COPY.tip).toBe("My tip: pick one Must-crack chapter today and finish it. Small steps add up.");
    expect([...strings(TRENDS_COPY), ...strings(POP_COPY)].join(" ")).not.toMatch(/ziggy/i);
    // Learn opens /topic-hub/:slug (App.tsx path="/topic-hub/:topicName", no RequirePremium): no Premium caveat.
    expect(TRENDS_COPY.items.find((i) => i.key === "learn")?.line).toBe("Opens this chapter's Topic Hub, where you learn it concept by concept.");
  });
});

describe("GUIDE-PAGES-1 M7 · Byte's lines come from the panel's own data", () => {
  const trial = (scope: LimitState["scope"], resetAt: string | null): LimitState => ({ tier: "trial", scope, resetAt, window: null, allowance: 5 });
  // Fixed clocks (IST = UTC+5:30). Thu 22 Oct 2026, 9:00 pm IST.
  const THU_9PM_IST = Date.parse("2026-10-22T15:30:00.000Z");
  // Mon 19 Oct 2026, 10:00 am IST.
  const MON_10AM_IST = Date.parse("2026-10-19T04:30:00.000Z");

  it("trial, reset at the NEXT midnight (under 24 h away) → 'after midnight' and the still-works line", () => {
    const l = m7Lines(trial("checks", "2026-10-22T18:30:00.000Z"), "12:00 am on Fri 23 Oct", THU_9PM_IST);
    expect(l).toEqual({
      hit: "Your answer checks for today are used up. It comes back after midnight.",
      still: M7_COPY.still,
    });
  });

  it("★ weekly mock used Monday, reset Sun 00:00 IST (days away) → NO 'after midnight'; the day is named", () => {
    const sundayMidnightIst = "2026-10-24T18:30:00.000Z"; // 00:00 IST Sun 25 Oct
    const l = m7Lines(trial("full-mock", sundayMidnightIst), "12:00 am on Sun 25 Oct", MON_10AM_IST);
    expect(l.hit).not.toContain("after midnight");
    expect(l.hit).toBe("Your full mock allowance for this week is used up. It comes back at 12:00 am on Sun 25 Oct.");
    expect(isNextMidnight(sundayMidnightIst, MON_10AM_IST)).toBe(false);
    expect(isNextMidnight("2026-10-22T18:30:00.000Z", THU_9PM_IST)).toBe(true);
    expect(isNextMidnight("2026-10-22T18:30:00.000Z", Date.parse("2026-10-22T19:00:00.000Z"))).toBe(false); // already past
  });

  it("trial weekly, not midnight → the panel's own time; no resetAt → no reset sentence (never guessed)", () => {
    expect(m7Lines(trial("full-mock", "2026-10-25T09:00:00.000Z"), "2:30 pm on Sun 25 Oct", MON_10AM_IST).hit).toBe(
      "Your full mock allowance for this week is used up. It comes back at 2:30 pm on Sun 25 Oct.",
    );
    expect(m7Lines(trial("worksheet", null), "", MON_10AM_IST).hit).toBe("Your worksheet allowance for this week is used up.");
  });

  it("premium → its window", () => {
    const l = m7Lines({ tier: "premium", scope: "checks", resetAt: "2026-10-22T10:00:00.000Z", window: "fiveHour" }, "3:30 pm", THU_9PM_IST);
    expect(l.hit).toBe("You've reached Premium's 5-hour fair-use limit. It comes back at 3:30 pm.");
  });
});

function Limit({ limit, when = "", variant }: { limit: LimitState; when?: string; variant?: "inline" | "dialog" }) {
  return <LimitByte limit={limit} when={when} variant={variant} />;
}
const TRIAL_CT: LimitState = { tier: "trial", scope: "chapter-test", resetAt: null, window: null, allowance: 1 };
const m7Rows = () => document.querySelectorAll("[data-testid='guide-moment-m7'] .lt-pg-m7__say").length;

describe("GUIDE-PAGES-1 M7 · LimitByte", () => {
  it("inline: the words are there in the FIRST commit (nothing grows later); then Byte is drawn; shown m7 once", async () => {
    render(<Limit limit={TRIAL_CT} />);
    // synchronous — no await: the row and both lines exist before the chunk or the uid arrive
    expect(screen.getByTestId("guide-m7-hit").textContent).toBe(M7_COPY.trialHit["chapter-test"]);
    expect(screen.getByTestId("guide-m7-still").textContent).toBe(M7_COPY.still);
    expect(m7Rows()).toBe(2); // compact: two lines
    expect(screen.getByTestId("mascots-hide")).toBeTruthy();
    const m = screen.getByTestId("guide-moment-m7");
    expect(m.getAttribute("data-variant")).toBe("inline");
    await waitFor(() => expect(m.querySelector(".lt-pg-m7__box [data-testid='blob-byte'], .lt-pg-m7__box .lt-gr-host")).toBeTruthy());
    await waitFor(() => expect(calls("guide_moment_shown")).toEqual([["guide_moment_shown", { moment: "m7" }]]));
  });

  it("dialog: ONE companion line from the panel's own count — never a repeat of what the dialog says", () => {
    const checks: LimitState = { tier: "trial", scope: "checks", resetAt: null, window: null, allowance: 5 };
    render(<Limit limit={checks} variant="dialog" />);
    const line = screen.getByTestId("guide-m7-dialog").textContent ?? "";
    expect(line).toBe("You checked 5 answers today. Good work! Rest now, or tap through some MCQs; tapping an answer doesn't use checks.");
    expect(line).not.toMatch(/used up|after midnight|comes back|Premium/);
    expect(screen.queryByTestId("guide-m7-hit")).toBeNull();
    expect(screen.queryByTestId("guide-m7-still")).toBeNull();
    expect(m7Rows()).toBe(1);
  });

  it("m7DialogLine: the real count; 1 → singular; unknown allowance → no number (never guessed)", () => {
    const base: LimitState = { tier: "trial", scope: "checks", resetAt: null, window: null, allowance: 5 };
    expect(m7DialogLine({ ...base, allowance: 8 })).toBe(M7_COPY.dialogDone.replace("{n}", "8"));
    expect(m7DialogLine({ ...base, allowance: 1 })).toBe(M7_COPY.dialogDoneOne);
    expect(m7DialogLine({ ...base, allowance: null })).toBe(M7_COPY.dialogDoneUnknown);
    expect(m7DialogLine({ ...base, allowance: undefined })).toBe(M7_COPY.dialogDoneUnknown);
    for (const s of [M7_COPY.dialogDone.replace("{n}", "12"), M7_COPY.dialogDoneOne, M7_COPY.dialogDoneUnknown]) {
      expect(words(s), s).toBeLessThanOrEqual(22);
    }
  });

  it("control arm / split off / signed out → nothing at all", async () => {
    __setGuideAbForTests(true, "control");
    const v = render(<Limit limit={TRIAL_CT} />);
    await act(async () => {});
    expect(screen.queryByTestId("guide-moment-m7")).toBeNull();
    v.unmount();
    __setGuideAbForTests(false);
    render(<Limit limit={TRIAL_CT} />);
    expect(screen.queryByTestId("guide-moment-m7")).toBeNull();
    cleanup();
    __setGuideAbForTests(true, "guide");
    __resetGuideUidForTests();
    auth.currentUser = null;
    render(<Limit limit={TRIAL_CT} />);
    await waitFor(() => expect(screen.queryByTestId("guide-moment-m7")).toBeNull());
  });

  it("Hide mascots → none", async () => {
    window.localStorage.setItem(MASCOTS_HIDDEN_KEY, "1");
    render(<Limit limit={TRIAL_CT} />);
    await act(async () => {});
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

  it("Exam Trends: every item and Byte's own tip — ONE character in the card (no Ziggy)", async () => {
    render(<Door id="trends_help" step="page" first="" />);
    const pop = await screen.findByTestId("page-guide-pop-trends_help");
    for (const it of TRENDS_COPY.items) {
      expect(screen.getByTestId(`trends-help-${it.key}`).textContent).toBe(`${it.label}${it.line}`);
    }
    expect(screen.getByTestId("page-guide-tip").textContent).toBe(TRENDS_COPY.tip);
    expect(screen.queryByTestId("page-guide-ziggy")).toBeNull();
    expect(pop.textContent ?? "").not.toMatch(/ziggy/i);
    await waitFor(() => expect(pop.querySelectorAll(".lt-gr-host").length).toBe(1));
  });

  it("an open card is the page's one focused guide (guideFocusOpen), released on close", async () => {
    render(<Door id="ws_entry" step="page" first="" uid="u1" />);
    await screen.findByTestId("page-guide-pop-ws_entry");
    await waitFor(() => expect(guideFocusOpen()).toBe(true));
    fireEvent.click(screen.getByTestId("page-guide-close"));
    expect(guideFocusOpen()).toBe(false);
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
  it("M7's row is EAGER css with a FIXED character box; the card is position:fixed; the corner door is absolute", () => {
    expect(doorCss).toMatch(/\.lt-pg-m7\s*\{[^}]*display:\s*flex/);
    expect(doorCss).toMatch(/\.lt-pg-m7__box\s*\{[^}]*width:\s*40px;\s*height:\s*48px/);
    expect(doorCss).toMatch(/\.lt-pg-m7__say\s*\{/);
    expect(doorCss).not.toMatch(/animation/);
    expect(doorCss).toMatch(/\.lt-pg-door--corner\s*\{[^}]*position:\s*absolute/);
    expect(doorCss).toMatch(/\.lt-pg-door--end, \.lt-pg-door--inline\s*\{[^}]*margin-top:\s*-4px;\s*margin-bottom:\s*-4px/);
    expect(popCss).toMatch(/\.lt-pg-pop\s*\{[^}]*position:\s*fixed/);
    // the card never runs past the viewport: bottom offset + 16px top gap, scrolling inside
    expect(popCss).toMatch(/\.lt-pg-pop__bub\s*\{[^}]*overflow-y:\s*auto;[^}]*max-height:\s*calc\(100vh - 68px - env\(safe-area-inset-bottom, 0px\) - 16px\)/);
    expect(popCss).toMatch(/\.lt-pg-pop__bub\s*\{\s*max-height:\s*calc\(100vh - 16px - 16px\)/); // desktop: bottom 16 + top 16
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
