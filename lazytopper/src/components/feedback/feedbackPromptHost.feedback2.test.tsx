import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";

const trackFeedbackEvent = vi.hoisted(() => vi.fn());
vi.mock("../../analytics/analytics", () => ({ trackFeedbackEvent }));

const auth = vi.hoisted(() => ({ currentUser: null as null | { uid: string; isAnonymous?: boolean } }));
vi.mock("../../services/firebaseClient", () => ({ authClient: auth }));

// The H3 budget adapter, driven by the tests (the real one is a no-op until MOMENTS-3 lands).
const budget = vi.hoisted(() => ({ may: vi.fn(() => true), noted: vi.fn() }));
vi.mock("./feedbackBudget", () => ({ feedbackMayAppear: budget.may, noteFeedbackShown: budget.noted }));

// The server read behind "has this account ever had a written answer graded?".
const cloudWritten = vi.hoisted(() => ({ fn: vi.fn(async (_uid: string): Promise<boolean | null> => false) }));
vi.mock("../guide/moments/writtenGradedCloud", async (orig) => ({
  ...(await orig<typeof import("../guide/moments/writtenGradedCloud")>()),
  cloudHasWrittenGraded: cloudWritten.fn,
}));

const saveNote = vi.hoisted(() => ({ fn: vi.fn(async (_n: unknown) => true) }));
vi.mock("./feedbackNotes", () => ({ saveFeedbackNote: saveNote.fn }));

// Ziggy's drawing is the rig; a stub keeps these tests about the flow.
vi.mock("./FeedbackZiggy", () => ({ default: () => <span data-testid="fb-ziggy" /> }));

import {
  GRADED_ASKED_SESSION_KEY,
  __resetFeedbackHostForTests,
  notifyFirstGradedResult,
  requestFeedbackPrompt,
} from "./feedbackPromptHost";
import { AFTER_GRADED_COOLDOWN_MS, feedbackStorageKey } from "./feedbackPromptModel";
import { FIRST_GRADED_DELAY_MS } from "./useFirstGradedFeedback";
import { MASCOTS_HIDDEN_KEY } from "../guide/mascotsMute";
import { __resetMascotHostsForTests, noteMascotHost } from "../guide/mascotPresence";
import ResultsScorecard from "../results/ResultsScorecard";
import type { ScorecardVariant } from "../results/scorecardVariants";
import type { GradedFeedbackContextInput } from "./gradedFeedbackFlow";

/**
 * FEEDBACK-2 — the host: the repeat ask, the once-per-7-days / once-per-session rules, the H3 budget,
 * hidden mascots, "never lost" navigation through the ROUTER, and the note that goes nowhere but the
 * student's own account.
 */

const card = () => document.querySelector<HTMLElement>("[data-testid='feedback-prompt']");
const DAY = 86_400_000;

function seed(uid: string, rows: Array<{ id: string; ageMs: number; surface?: string; status?: string }>): void {
  const now = Date.now();
  window.localStorage.setItem(
    `lazytopper.user.${uid}.sessionRecords.v1`,
    JSON.stringify(
      rows.map((r) => ({
        id: r.id,
        worksheetId: r.id,
        surface: r.surface ?? "quick-practice",
        title: r.id,
        subject: "maths",
        topicKeys: [],
        questionIds: [],
        marksAwarded: 1,
        marksTotal: 2,
        status: r.status ?? "graded",
        fourType: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
        sectionBreakdown: null,
        gradedAt: now - r.ageMs,
        perQuestionRef: `ws:${r.id}`,
        dedupKey: `${uid}::${r.id}`,
      })),
    ),
  );
}
/** A brand-new student: only the record the current result just wrote. */
const seedFirst = (uid: string, surface = "quick-practice") => seed(uid, [{ id: "QP-M-01", ageMs: 1500, surface }]);
/** A returning student: this result's record, and one from three days ago. */
const seedLater = (uid: string, surface = "quick-practice") =>
  seed(uid, [
    { id: "QP-M-02", ageMs: 1500, surface },
    { id: "QP-M-01", ageMs: 3 * DAY, surface },
  ]);

function flowInput(over: Partial<GradedFeedbackContextInput> = {}): GradedFeedbackContextInput {
  return {
    navigate: vi.fn(),
    surface: "quick-practice",
    subject: "maths",
    topicKey: "real-numbers",
    chapter: "Real Numbers",
    difficulty: null,
    firstWrongTutor: null,
    chapterTutorTo: "/tutor/10/Maths/real-numbers?source=scorecard&returnTo=%2Fpractice%2F10%2Fmaths",
    returnTo: "/practice/10/maths",
    ...over,
  };
}
async function ask(uid: string, graded: GradedFeedbackContextInput | null = flowInput()): Promise<boolean> {
  let shown = false;
  await act(async () => {
    shown = await requestFeedbackPrompt("after_graded", { uid, graded });
  });
  return shown;
}
const tap = (id: string) => act(() => void fireEvent.click(screen.getByTestId(id)));

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  trackFeedbackEvent.mockClear();
  budget.may.mockReset().mockReturnValue(true);
  budget.noted.mockClear();
  cloudWritten.fn.mockReset().mockResolvedValue(false);
  saveNote.fn.mockClear();
  auth.currentUser = null;
  __resetMascotHostsForTests();
  __resetFeedbackHostForTests();
});

afterEach(() => {
  cleanup();
  act(() => __resetFeedbackHostForTests());
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("FEEDBACK-2 · when it is asked", () => {
  it("the FIRST graded result is asked as first_graded, with the router's context handed in", async () => {
    auth.currentUser = { uid: "u1" };
    seedFirst("u1");
    const input = flowInput();
    await act(async () => {
      notifyFirstGradedResult(input);
    });
    await act(async () => {});
    expect(card()?.getAttribute("data-moment")).toBe("first_graded");
    expect(trackFeedbackEvent).toHaveBeenCalledWith("shown", "first_graded");
    await tap("feedback-opt-yes");
    await tap("feedback-go-more");
    expect(input.navigate).toHaveBeenCalledWith("/practice/10/maths?topic=real-numbers&count=5");
    expect(trackFeedbackEvent).toHaveBeenCalledWith("reason", "first_graded", "yes");
    expect(trackFeedbackEvent).toHaveBeenCalledWith("next", "first_graded", undefined, "more");
    expect(card()).toBeNull(); // a tap on a button closes the card
  });

  it("a LATER graded result is asked as after_graded; a result with no readable record is not asked (fail closed)", async () => {
    auth.currentUser = { uid: "u2" };
    seedLater("u2");
    const input = flowInput();
    await act(async () => {
      notifyFirstGradedResult(input);
    });
    await act(async () => {});
    expect(card()?.getAttribute("data-moment")).toBe("after_graded");
    expect(JSON.parse(window.localStorage.getItem(feedbackStorageKey("u2"))!)).toEqual({ a: expect.any(Number) });
    cleanup();
    act(() => __resetFeedbackHostForTests());
    auth.currentUser = { uid: "u3" }; // control: no records at all -> nothing
    await act(async () => {
      notifyFirstGradedResult(flowInput());
    });
    await act(async () => {});
    expect(card()).toBeNull();
  });

  it("at most once per 7 days per student per device (control: it is asked again on day 7)", async () => {
    seedLater("u1");
    expect(await ask("u1")).toBe(true);
    act(() => __resetFeedbackHostForTests()); // a new session on the same device
    seedLater("u1");
    expect(await ask("u1")).toBe(false); // the device record says it was asked a moment ago
    const rec = JSON.parse(window.localStorage.getItem(feedbackStorageKey("u1"))!);
    window.localStorage.setItem(feedbackStorageKey("u1"), JSON.stringify({ a: rec.a - AFTER_GRADED_COOLDOWN_MS + 60_000 }));
    seedLater("u1");
    expect(await ask("u1")).toBe(false); // 6 days 23 h 59 m: not yet
    window.localStorage.setItem(feedbackStorageKey("u1"), JSON.stringify({ a: rec.a - AFTER_GRADED_COOLDOWN_MS - 60_000 }));
    seedLater("u1");
    expect(await ask("u1")).toBe(true);
  });

  it("never twice in one browser session, however long ago the device record says (control: a new session asks)", async () => {
    seedLater("u1");
    expect(await ask("u1")).toBe(true);
    expect(window.sessionStorage.getItem(GRADED_ASKED_SESSION_KEY)).toBe("1");
    act(() => {
      fireEvent.click(screen.getByTestId("feedback-x"));
    });
    window.localStorage.setItem(feedbackStorageKey("u1"), JSON.stringify({ a: Date.now() - 30 * DAY }));
    seedLater("u1");
    expect(await ask("u1")).toBe(false);
    act(() => __resetFeedbackHostForTests()); // the tab closed: a new browser session
    expect(window.sessionStorage.getItem(GRADED_ASKED_SESSION_KEY)).toBeNull();
    seedLater("u1");
    expect(await ask("u1")).toBe(true);
  });

  it("a destination page never gets a second card: after a button tap nothing else is asked this session", async () => {
    seedLater("u1");
    expect(await ask("u1")).toBe(true);
    await tap("feedback-opt-yes");
    await tap("feedback-go-more");
    expect(card()).toBeNull();
    for (const moment of ["after_graded", "first_graded"] as const) {
      seedLater("u1");
      await act(async () => {
        expect(await requestFeedbackPrompt(moment, { uid: "u1", graded: flowInput() })).toBe(false);
      });
    }
    expect(card()).toBeNull();
  });

  it("not while another card is open, and a signed-out visitor gets nothing", async () => {
    seedLater("u1");
    await act(async () => {
      expect(await requestFeedbackPrompt("paywall", { uid: "u1" })).toBe(true);
    });
    expect(await ask("u1")).toBe(false);
    cleanup();
    act(() => __resetFeedbackHostForTests());
    await act(async () => {
      expect(await requestFeedbackPrompt("after_graded", { graded: flowInput() })).toBe(false); // no auth user
    });
  });
});

describe("FEEDBACK-2 · H3: at most 3 unprompted mascot appearances per session", () => {
  it("the fourth appearance is blocked — and costs the student nothing (nothing is claimed)", async () => {
    let appearances = 0;
    budget.may.mockImplementation(() => appearances < 3);
    budget.noted.mockImplementation(() => void (appearances += 1));
    const shown: boolean[] = [];
    for (const uid of ["a1", "a2", "a3", "a4"]) {
      seedFirst(uid);
      await act(async () => {
        shown.push(await requestFeedbackPrompt("first_graded", { uid, graded: flowInput() }));
      });
      cleanup();
      act(() => __resetFeedbackHostForTests());
    }
    expect(shown).toEqual([true, true, true, false]);
    expect(budget.noted).toHaveBeenCalledTimes(3);
    expect(window.localStorage.getItem(feedbackStorageKey("a4"))).toBeNull(); // may be asked later
  });

  it("hidden mascots: the plain card with the same flow, not a mascot, not counted, and the budget is not even consulted", async () => {
    window.localStorage.setItem(MASCOTS_HIDDEN_KEY, "1");
    budget.may.mockReturnValue(false); // an exhausted budget does not stop a plain card
    seedLater("u1");
    expect(await ask("u1")).toBe(true);
    expect(card()?.getAttribute("data-ziggy")).toBe("0");
    expect(screen.queryByTestId("fb-ziggy")).toBeNull();
    expect(budget.may).not.toHaveBeenCalled();
    expect(budget.noted).not.toHaveBeenCalled();
    await tap("feedback-opt-too_easy"); // the same flow
    expect(screen.getByTestId("feedback-go-harder")).toBeInTheDocument();
  });

  it("another mascot already on screen (Ziggy's own scorecard reaction): the card is plain and is not counted", async () => {
    const host = document.createElement("span");
    document.body.appendChild(host);
    noteMascotHost(host, true);
    seedLater("u1");
    expect(await ask("u1")).toBe(true);
    expect(card()?.getAttribute("data-ziggy")).toBe("0");
    expect(budget.noted).not.toHaveBeenCalled();
    host.remove();
  });

  it("control: with mascots shown, the budget allowing and nothing else on screen, Ziggy is drawn and counted once", async () => {
    seedLater("u1");
    expect(await ask("u1")).toBe(true);
    expect(card()?.getAttribute("data-ziggy")).toBe("1");
    expect(await screen.findByTestId("fb-ziggy")).toBeInTheDocument();
    expect(budget.noted).toHaveBeenCalledTimes(1);
  });
});

describe("FEEDBACK-2 · 'Check a written answer' only for a student who never had one graded", () => {
  it("never written (the server says so) -> offered; written on this device -> not offered, without a network call", async () => {
    seedFirst("u1", "quick-practice");
    await act(async () => {
      expect(await requestFeedbackPrompt("first_graded", { uid: "u1", graded: flowInput() })).toBe(true);
    });
    await tap("feedback-opt-yes");
    expect(screen.getByTestId("feedback-go-written")).toBeInTheDocument();
    expect(cloudWritten.fn).toHaveBeenCalledTimes(1);
    cleanup();
    act(() => __resetFeedbackHostForTests());
    cloudWritten.fn.mockClear();
    seedFirst("u2", "worksheet");
    await act(async () => {
      expect(await requestFeedbackPrompt("first_graded", { uid: "u2", graded: flowInput() })).toBe(true);
    });
    await tap("feedback-opt-yes");
    expect(screen.queryByTestId("feedback-go-written")).toBeNull();
    expect(cloudWritten.fn).not.toHaveBeenCalled();
  });

  it("the server cannot say -> not offered (never a guess)", async () => {
    cloudWritten.fn.mockResolvedValue(null);
    seedFirst("u1");
    await act(async () => {
      expect(await requestFeedbackPrompt("first_graded", { uid: "u1", graded: flowInput() })).toBe(true);
    });
    await tap("feedback-opt-yes");
    expect(screen.queryByTestId("feedback-go-written")).toBeNull();
    expect(screen.getByTestId("feedback-go-more")).toBeInTheDocument();
  });
});

describe("FEEDBACK-2 · the note stays in the student's own account", () => {
  it("Send hands the words to the notes writer with the surface and chapter, and records only the NAME", async () => {
    seedLater("u1");
    expect(await ask("u1", flowInput({ surface: "chapter-test" }))).toBe(true);
    await tap("feedback-opt-not_really");
    await tap("feedback-why-other");
    fireEvent.change(screen.getByTestId("feedback-note-text"), { target: { value: "Please add more HOTS" } });
    await act(async () => {
      fireEvent.click(screen.getByTestId("feedback-note-send"));
    });
    expect(saveNote.fn).toHaveBeenCalledWith({
      uid: "u1",
      text: "Please add more HOTS",
      kind: "other",
      surface: "chapter-test",
      topicKey: "real-numbers",
      moment: "after_graded",
    });
    expect(trackFeedbackEvent).toHaveBeenCalledWith("next", "after_graded", undefined, "note_saved");
    expect(JSON.stringify(trackFeedbackEvent.mock.calls)).not.toContain("HOTS");
  });

  it("a note that did not save is not counted as saved", async () => {
    saveNote.fn.mockResolvedValueOnce(false);
    seedLater("u1");
    expect(await ask("u1")).toBe(true);
    await tap("feedback-opt-not_really");
    await tap("feedback-why-marks");
    fireEvent.change(screen.getByTestId("feedback-note-text"), { target: { value: "Q2" } });
    await act(async () => {
      fireEvent.click(screen.getByTestId("feedback-note-send"));
    });
    expect(trackFeedbackEvent).not.toHaveBeenCalledWith("next", "after_graded", undefined, "note_saved");
    expect(screen.getByTestId("feedback-note-failed")).toBeInTheDocument();
  });
});

describe("FEEDBACK-2 · through the real scorecard and the real router", () => {
  const variant = {
    surface: "quick-practice",
    title: "Session scorecard",
    subtitle: "now",
    score: { kind: "marks", awarded: 6, total: 10 },
    guideTarget: { to: "/practice/10/maths?topic=real-numbers&weakMode=1", chapter: "Real Numbers" },
    actions: [],
  } as unknown as ScorecardVariant;

  function Probe() {
    const l = useLocation();
    return <div data-testid="probe">{`${l.pathname}${l.search}`}</div>;
  }

  async function mountScorecard(props: { ask: boolean; entry?: string }) {
    vi.useFakeTimers();
    render(
      <MemoryRouter initialEntries={[props.entry ?? "/practice/10/maths?topic=real-numbers&difficulty=Easy"]}>
        <Probe />
        <ResultsScorecard variant={variant} onClose={() => {}} askFirstFeedback={props.ask} />
      </MemoryRouter>,
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(FIRST_GRADED_DELAY_MS + 50);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1300); // the bounded written-answer lookup
    });
  }

  it("a button moves the student with the ROUTER (the URL carries chapter + one step harder), never window.location", async () => {
    auth.currentUser = { uid: "u1" };
    seedLater("u1");
    const before = window.location.href;
    await mountScorecard({ ask: true });
    expect(card()).not.toBeNull();
    await tap("feedback-opt-too_easy");
    await tap("feedback-go-harder");
    expect(screen.getByTestId("probe").textContent).toBe("/practice/10/maths?topic=real-numbers&count=5&difficulty=Medium");
    expect(window.location.href).toBe(before);
    expect(card()).toBeNull();
  });

  it("the tutor button for a chapter result carries returnTo = the page the student was on", async () => {
    auth.currentUser = { uid: "u1" };
    seedLater("u1");
    await mountScorecard({ ask: true });
    await tap("feedback-opt-too_hard");
    await tap("feedback-go-tutor");
    const at = screen.getByTestId("probe").textContent as string;
    expect(at.startsWith("/tutor/10/Maths/real-numbers?")).toBe(true);
    expect(new URLSearchParams(at.split("?")[1]).get("returnTo")).toBe("/practice/10/maths?topic=real-numbers&difficulty=Easy");
  });

  it("no card inside the tutor overlay or on a re-open (the host's opt-in is off) — control: with the opt-in it is asked", async () => {
    auth.currentUser = { uid: "u1" };
    seedLater("u1");
    await mountScorecard({ ask: false });
    expect(card()).toBeNull();
    cleanup();
    act(() => __resetFeedbackHostForTests());
    await mountScorecard({ ask: true });
    expect(card()).not.toBeNull();
  });
});
