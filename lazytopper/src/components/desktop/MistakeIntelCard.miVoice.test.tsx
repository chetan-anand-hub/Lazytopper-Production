// @vitest-environment jsdom
/**
 * MistakeIntelCard × MI-VOICE-1 — the character row, driven through the REAL card over the
 * SAME mocked cloud streams as MistakeIntelCard.contract.test.tsx (the real read model).
 *
 * Pins, table-driven over every state:
 *   - guide arm: the row sits ABOVE the card's existing text, with the state's pose and line,
 *     and EVERY number in the line is one the card itself prints below it;
 *   - the card's own text, numbers and links are untouched (guide card minus the row ===
 *     the control card, byte for byte);
 *   - control arm: byte-identical to the card with the split off (today's card);
 *   - loading / error / signed-out: no character.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, configure, cleanup } from "@testing-library/react";
configure({ asyncUtilTimeout: 8000 });
import { MemoryRouter } from "react-router-dom";

const h = vi.hoisted(() => ({
  user: { uid: "u1" } as { uid: string } | null,
  entries: [] as unknown[],
  attempts: [] as unknown[],
  complete: true,
  hydrated: 1,
}));
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: h.user, loading: false, mistakeLogsHydrated: h.hydrated }),
}));
vi.mock("../../services/mistakeLogService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../services/mistakeLogService")>()),
  getMistakeLogHistoryFromCloud: async () => ({ entries: h.entries, complete: h.complete }),
}));
vi.mock("../../services/practiceInsights", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../services/practiceInsights")>()),
  getAttemptsFromCloud: async () => h.attempts,
}));
vi.mock("../../services/sessionRecords", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../services/sessionRecords")>()),
  getSessionRecordsFromCloud: async () => [],
  getAllSessionPerQuestionFromCloud: async () => [],
}));
const track = vi.hoisted(() => vi.fn());
vi.mock("../../analytics/analytics", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../analytics/analytics")>()),
  trackOnboardingEvent: track,
}));

import { MistakeIntelCard, miVoiceInputFor, type MiCardViewState } from "./MistakeIntelCard";
import type { MistakeLogEntry } from "../../services/mistakeLogService";
import type { PracticeAttempt } from "../../services/practiceInsights";
import { resetMeHomeMemo } from "../../services/meHomeSummary";
import { __setGuideAbForTests, type GuideVariant } from "../guide/guideVariant";
import { __resetMiVoiceShownForTests } from "../guide/mi/miVoiceShown";
import { miVoiceFor } from "../guide/mi/miVoiceModel";

const counts = (c: Partial<Record<"conceptual" | "calculation" | "silly" | "presentation", number>>) => ({
  conceptual: 0, calculation: 0, silly: 0, presentation: 0, ...c,
});
const v2 = (m: Record<string, number>) => ({
  marksLostByType: { conceptual: 0, calculation: 0, silly: 0, presentation: 0, unattempted: 0, untyped: 0, ...m },
  marksLostByTypeVersion: 1,
});
let seq = 0;
const entry = (marksLost: number, c: Parameters<typeof counts>[0], extra: Record<string, unknown> = {}) =>
  ({ id: `e${++seq}`, timestamp: new Date().toISOString(), topic: "Real Numbers", subject: "Maths", marksLost, mistakeCounts: counts(c), ...extra }) as unknown as MistakeLogEntry;
const attempt = (mode: string, agoMs = 1000) =>
  ({ mode, subject: "maths", topicKey: "real-numbers", marksScored: 1, marksAvailable: 2, timestamp: Date.now() - agoMs }) as unknown as PracticeAttempt;
const spread = (mode: string) => [0.2, 0.4, 20, 30, 50, 70, 100, 130].map((hr) => attempt(mode, hr * 60 * 60 * 1000));

let uidSeq = 0;
/** A fresh tab and a fresh account for every render (the card's read is memoised per tab). */
function renderCard(arm: GuideVariant | "off") {
  resetMeHomeMemo();
  if (h.user) h.user = { uid: `u${++uidSeq}` };
  if (arm === "off") __setGuideAbForTests(false);
  else __setGuideAbForTests(true, arm);
  return render(<MemoryRouter><MistakeIntelCard /></MemoryRouter>);
}

/** Wait until the card has left its loading line. */
async function settled(): Promise<void> {
  await waitFor(() => expect(screen.queryByText(/Looking for recent mistake patterns/)).toBeNull());
}

/**
 * Review F10 — the event needs a laid-out, intersecting row. jsdom has neither layout nor
 * IntersectionObserver, so both are stubbed: every observed row is laid out and intersects.
 */
class VisibleIO {
  private cb: (e: Array<{ isIntersecting: boolean; target: Element }>) => void;
  constructor(cb: (e: Array<{ isIntersecting: boolean; target: Element }>) => void) {
    this.cb = cb;
  }
  observe(target: Element) {
    queueMicrotask(() => this.cb([{ isIntersecting: true, target }]));
  }
  disconnect() {}
  unobserve() {}
}
const realOffsetParent = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetParent");
beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", VisibleIO);
  Object.defineProperty(HTMLElement.prototype, "offsetParent", { configurable: true, get() { return this.parentElement; } });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ width: 194, height: 56, top: 0, left: 0, right: 194, bottom: 56, x: 0, y: 0, toJSON: () => ({}) } as DOMRect);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  if (realOffsetParent) Object.defineProperty(HTMLElement.prototype, "offsetParent", realOffsetParent);
});

beforeEach(() => {
  h.hydrated = 1;
  h.user = { uid: "u0" };
  h.entries = [];
  h.attempts = [];
  h.complete = true;
  track.mockClear();
  __resetMiVoiceShownForTests();
  try {
    window.sessionStorage.clear();
  } catch {
    /* jsdom */
  }
});
afterEach(() => {
  cleanup();
  __setGuideAbForTests(null);
});

interface Case {
  name: string;
  setup: () => void;
  state: string;
  kind: "ziggy" | "byte";
  pose: string;
  line: string;
  bagLabel?: number;
}

const CASES: Case[] = [
  {
    name: "no-data",
    setup: () => undefined,
    state: "no_data",
    kind: "ziggy",
    pose: "detective",
    line: "No clues yet. Check one answer and I'll start looking.",
  },
  {
    name: "with-data below Me's gate (namesWeakness false)",
    setup: () => {
      h.entries = [entry(2, { conceptual: 1 }, v2({ conceptual: 2 }))];
      h.attempts = [attempt("graded"), attempt("graded")];
    },
    state: "thin",
    kind: "ziggy",
    pose: "detective",
    line: "I need a few more clues before I can spot a pattern.",
  },
  {
    name: "untyped (MCQ marks on the table, no type)",
    setup: () => {
      h.attempts = spread("mcq");
    },
    state: "untyped",
    kind: "ziggy",
    pose: "bag",
    line: "8 marks waiting for me.",
    bagLabel: 8,
  },
  {
    name: "top loss Careless",
    setup: () => {
      h.entries = [entry(2, { calculation: 2 }, v2({ calculation: 2 }))];
      h.attempts = spread("graded");
    },
    state: "careless",
    kind: "ziggy",
    pose: "oops",
    line: "Oops! These were slips, not the method. 2 marks to win back.",
  },
  {
    name: "top loss Knowledge gap",
    setup: () => {
      h.entries = [entry(3, { conceptual: 2 }, v2({ conceptual: 3 }))];
      h.attempts = spread("graded");
    },
    state: "knowledge",
    kind: "ziggy",
    pose: "confused",
    line: "3 marks went where I didn't get the idea yet.",
  },
  {
    name: "top loss Exam technique",
    setup: () => {
      h.entries = [entry(2, { presentation: 2 }, v2({ presentation: 2 }))];
      h.attempts = spread("graded");
    },
    state: "technique",
    kind: "byte",
    pose: "technique",
    line: "On these, the working was right. 2 marks went on what the examiner checks.",
  },
];

const NUMBERS = /\d+(?:\.\d+)?/g;

describe("MI-VOICE-1 · guide arm — each state's pose and line, above the card's own text", () => {
  for (const c of CASES) {
    it(`★ ${c.name} → ${c.kind} ${c.pose}: "${c.line}"`, async () => {
      c.setup();
      const { container } = renderCard("guide");
      const row = await screen.findByTestId("mi-voice");
      await settled();
      expect(row.getAttribute("data-state")).toBe(c.state);
      expect(row.getAttribute("data-kind")).toBe(c.kind);
      expect(row.getAttribute("data-pose")).toBe(c.pose);
      expect(screen.getByTestId("mi-voice-line").textContent).toBe(c.line);

      // ABOVE the card's existing text: the row precedes every body paragraph and link.
      const card = container.firstElementChild!;
      const body = [...card.querySelectorAll("p, a")].filter((el) => !row.contains(el));
      expect(body.length).toBeGreaterThan(0);
      for (const el of body) expect(row.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

      // ★ Every number the character says is one the card itself prints below.
      const cardText = body.map((el) => el.textContent ?? "").join(" ");
      for (const n of c.line.match(NUMBERS) ?? []) expect(cardText).toMatch(new RegExp(`(^|[^\\d.])${n.replace(".", "\\.")}([^\\d.]|$)`));

      // One character at a time; the drawing lands lazily in the fixed slot.
      const blob = await screen.findByTestId(`blob-${c.kind}`, {}, { timeout: 8000 });
      expect(blob.getAttribute("data-pose")).toBe(c.pose);
      expect(container.querySelectorAll("[data-testid^='blob-']")).toHaveLength(1);
      expect(screen.getByTestId("mi-voice-slot").contains(blob)).toBe(true);
      const bagDigits = blob.querySelectorAll(".lt-gr-bagn .lt-gr-dg").length;
      expect(bagDigits).toBe(c.bagLabel === undefined ? 0 : String(c.bagLabel).length);

      // No navigation from the character: the row holds no link and no button.
      expect(row.querySelector("a, button")).toBeNull();

      // Measurement: once per tab per state.
      await waitFor(() => expect(track).toHaveBeenCalledWith("mi_voice_shown", { state: c.state }));
      expect(track).toHaveBeenCalledTimes(1);
    });
  }

  it("★ the card's own text, numbers and links are untouched: guide card minus the row === control card", async () => {
    for (const c of CASES) {
      c.setup();
      const control = renderCard("control");
      await settled();
      const controlHtml = control.container.innerHTML;
      cleanup();

      const guide = renderCard("guide");
      const row = await screen.findByTestId("mi-voice");
      await settled();
      row.remove();
      expect(guide.container.innerHTML, c.name).toBe(controlHtml);
      cleanup();
      h.entries = [];
      h.attempts = [];
    }
  });
});

describe("MI-VOICE-1 · control arm — byte-identical to today's card", () => {
  it("★ every state: the control arm renders exactly the card with the split off, and no character", async () => {
    for (const c of CASES) {
      c.setup();
      const off = renderCard("off");
      await settled();
      const offHtml = off.container.innerHTML;
      cleanup();

      const control = renderCard("control");
      await settled();
      expect(control.container.innerHTML, c.name).toBe(offHtml);
      expect(screen.queryByTestId("mi-voice")).toBeNull();
      cleanup();
      h.entries = [];
      h.attempts = [];
    }
    expect(track).not.toHaveBeenCalled();
  });
});

describe("MI-VOICE-1 · no character where the card has no fact", () => {
  it("signed out → no character (guide arm cannot apply without a uid)", async () => {
    h.user = null;
    renderCard("guide");
    expect(await screen.findByText(/Sign in to see mistake patterns/)).toBeTruthy();
    expect(screen.queryByTestId("mi-voice")).toBeNull();
  });

  it("error (an incomplete mistake history) → no character", async () => {
    h.complete = false;
    renderCard("guide");
    expect(await screen.findByText(/Couldn.t load mistake patterns/)).toBeTruthy();
    expect(screen.queryByTestId("mi-voice")).toBeNull();
  });

  it("loading / signed-out / error map to no line (pure, over the card's own view states)", () => {
    const states: MiCardViewState[] = [{ kind: "loading" }, { kind: "signed-out" }, { kind: "error" }];
    for (const v of states) expect(miVoiceFor(miVoiceInputFor(v))).toBeNull();
  });
});

describe("MI-VOICE-1 · the projection is the card's own strings", () => {
  it("★ untyped: the line's figure is the card's formatMarks string; a fractional figure gets no sack number", () => {
    const me = (lost: number) => ({ lost }) as unknown as Extract<MiCardViewState, { kind: "untyped" }>["me"];
    const a = miVoiceFor(miVoiceInputFor({ kind: "untyped", me: me(2.5) }))!;
    expect(a.line).toBe("2.5 marks waiting for me.");
    expect(a.bagLabel).toBeUndefined();
    const b = miVoiceFor(miVoiceInputFor({ kind: "untyped", me: me(1) }))!;
    expect(b.line).toBe("1 mark waiting for me.");
    expect(b.bagLabel).toBe(1);
  });

  it("★ with-data: the amount is topLoss.amount exactly, units and all (counts stay 'mistakes')", () => {
    const v: MiCardViewState = {
      kind: "with-data",
      summary: { checkedCount: 8, totalMarksLost: 4, namesWeakness: true, topLoss: { group: "knowledge", label: "Knowledge gap", amount: "2 mistakes", basis: "counts" } },
    };
    expect(miVoiceFor(miVoiceInputFor(v))!.line).toBe("2 mistakes went where I didn't get the idea yet.");
  });

  it("with-data above the gate but no group named → the character says nothing (the card names nothing)", () => {
    const v: MiCardViewState = { kind: "with-data", summary: { checkedCount: 8, totalMarksLost: 0, namesWeakness: true, topLoss: null } };
    expect(miVoiceFor(miVoiceInputFor(v))).toBeNull();
  });
});

describe("MI-VOICE-1 · review F2 — no pre-hydration flash", () => {
  it("★ before the cloud mistake history hydrates: no row and no event; after: the right state, the event once", async () => {
    // The account HAS a careless loss in the cloud; before hydration the card may read a cold device.
    h.entries = [entry(2, { calculation: 2 }, v2({ calculation: 2 }))];
    h.attempts = spread("graded");
    h.hydrated = 0;
    const view = renderCard("guide");
    await settled();
    await new Promise((r) => setTimeout(r, 400)); // past the idle wait and any observer callback
    expect(screen.queryByTestId("mi-voice")).toBeNull();
    expect(track).not.toHaveBeenCalled();

    h.hydrated = 1;
    view.rerender(<MemoryRouter><MistakeIntelCard /></MemoryRouter>);
    const row = await screen.findByTestId("mi-voice");
    await waitFor(() => expect(row.getAttribute("data-state")).toBe("careless"));
    await waitFor(() => expect(track).toHaveBeenCalledWith("mi_voice_shown", { state: "careless" }));
    // re-renders after the hydration bump never send it again
    view.rerender(<MemoryRouter><MistakeIntelCard /></MemoryRouter>);
    await new Promise((r) => setTimeout(r, 50));
    expect(track.mock.calls.filter((c) => c[0] === "mi_voice_shown")).toHaveLength(1);
  });
});
