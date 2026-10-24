import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";

const trackFeedbackEvent = vi.hoisted(() => vi.fn());
vi.mock("../../analytics/analytics", () => ({ trackFeedbackEvent }));

const auth = vi.hoisted(() => ({ currentUser: null as null | { uid: string; isAnonymous?: boolean } }));
vi.mock("../../services/firebaseClient", () => ({ authClient: auth }));

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
import {
  __resetMascotBudgetForTests,
  __setMascotBudgetForTests,
  noteShown,
  requestAppearance,
  unpromptedShownCount,
} from "../guide/mascotBudget";
import { FeedbackPrompt } from "./FeedbackPrompt";
import { StrictMode } from "react";
import ResultsScorecard from "../results/ResultsScorecard";
import type { ScorecardVariant } from "../results/scorecardVariants";
import type { GradedFeedbackContextInput } from "./gradedFeedbackFlow";

// PERF-3: the graded card is a lazy chunk in production; these suites test the card itself, so it loads
// synchronously here (FeedbackPrompt.lazy.test.tsx pins the real lazy path and the failed-chunk guard).
vi.mock("../../lib/lazyWithRetry", async () => {
  const m = await import("./GradedFeedbackCard");
  return { lazyWithRetry: () => m.default };
});


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
    showMissed: null,
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
  __resetMascotBudgetForTests();
  __setMascotBudgetForTests(true); // the REAL director (MOMENTS-3), switched on for these suites
  cloudWritten.fn.mockReset().mockResolvedValue(false);
  saveNote.fn.mockClear();
  auth.currentUser = null;
  __resetMascotHostsForTests();
  __resetFeedbackHostForTests();
});

afterEach(() => {
  cleanup();
  __resetMascotBudgetForTests();
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

/** Spend `n` of the session's 3 unprompted slots on other appearances. */
function spendSlots(n: number): void {
  for (let i = 0; i < n; i += 1) {
    const key = `moment:m${i}#${i}`;
    requestAppearance(key, 200);
    noteShown(key);
  }
}

describe("FEEDBACK-2 · H3 (the real MOMENTS-3 budget): the character is limited, the question never is", () => {
  it("with a slot free, Ziggy draws and EXACTLY ONE slot is spent", async () => {
    seedLater("u1");
    expect(await ask("u1")).toBe(true);
    expect(card()?.getAttribute("data-ziggy")).toBe("1");
    expect(await screen.findByTestId("fb-ziggy")).toBeInTheDocument();
    expect(unpromptedShownCount()).toBe(1);
    await tap("feedback-opt-yes"); // moving between steps re-draws him: still one slot
    await tap("feedback-close");
    expect(unpromptedShownCount()).toBe(1);
  });

  it("with the budget spent, the card shows PLAIN with the same flow, is still asked and claimed, and spends nothing", async () => {
    spendSlots(3);
    seedLater("u1");
    expect(await ask("u1")).toBe(true);
    expect(card()?.getAttribute("data-ziggy")).toBe("0");
    expect(screen.queryByTestId("fb-ziggy")).toBeNull();
    expect(unpromptedShownCount()).toBe(3);
    await tap("feedback-opt-too_easy"); // the same flow, the same buttons
    expect(screen.getByTestId("feedback-go-harder")).toBeInTheDocument();
    expect(window.localStorage.getItem(feedbackStorageKey("u1"))).not.toBeNull(); // asked: claimed on the device
  });

  it("three cards in a session draw Ziggy; the fourth appearance is plain but still asks", async () => {
    const drew: Array<string | null | undefined> = [];
    for (const uid of ["a1", "a2", "a3", "a4"]) {
      seedFirst(uid);
      await act(async () => {
        expect(await requestFeedbackPrompt("first_graded", { uid, graded: flowInput() })).toBe(true);
      });
      if (card()?.getAttribute("data-ziggy") === "1") await screen.findByTestId("fb-ziggy");
      drew.push(card()?.getAttribute("data-ziggy"));
      cleanup();
      act(() => __resetFeedbackHostForTests());
    }
    expect(drew).toEqual(["1", "1", "1", "0"]);
    expect(unpromptedShownCount()).toBe(3);
  });

  it("closing the card after Ziggy drew leaves exactly the one spent slot, and nothing reserved behind it", async () => {
    const base = { onAnswer: vi.fn(), onDismiss: vi.fn(), onDone: vi.fn(), onNext: vi.fn(), onSaveNote: vi.fn() };
    const view = render(<FeedbackPrompt moment="after_graded" flow={flowInput() as never} withZiggy {...base} />);
    await screen.findByTestId("fb-ziggy");
    view.unmount();
    expect(unpromptedShownCount()).toBe(1);
    // two slots remain for others: a leaked reservation would refuse the third request
    expect(["a#1", "b#2"].map((k) => requestAppearance(k, 200))).toEqual([true, true]);
    // (a reservation released BEFORE drawing is pinned by components/guide/mascotBudget.test.tsx)
  });

  it("StrictMode's double mount does not double-count", async () => {
    const base = { onAnswer: vi.fn(), onDismiss: vi.fn(), onDone: vi.fn(), onNext: vi.fn(), onSaveNote: vi.fn() };
    render(
      <StrictMode>
        <FeedbackPrompt moment="after_graded" flow={flowInput() as never} withZiggy {...base} />
      </StrictMode>,
    );
    expect(await screen.findByTestId("fb-ziggy")).toBeInTheDocument();
    expect(unpromptedShownCount()).toBe(1);
  });

  it("hidden mascots: the plain card with the same flow, not a mascot, not counted", async () => {
    window.localStorage.setItem(MASCOTS_HIDDEN_KEY, "1");
    seedLater("u1");
    expect(await ask("u1")).toBe(true);
    expect(card()?.getAttribute("data-ziggy")).toBe("0");
    expect(screen.queryByTestId("fb-ziggy")).toBeNull();
    expect(unpromptedShownCount()).toBe(0);
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
    expect(unpromptedShownCount()).toBe(0);
    host.remove();
  });
});

describe("FEEDBACK-2 · 'Check a written answer' only for a student who never had one graded", () => {
  it("never written (the server says so) -> offered; written on this device -> not offered, without a network call", async () => {
    seedFirst("u1", "quick-practice");
    await act(async () => {
      expect(await requestFeedbackPrompt("first_graded", { uid: "u1", graded: flowInput({ surface: "chapter-test" }) })).toBe(true);
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
      expect(await requestFeedbackPrompt("first_graded", { uid: "u1", graded: flowInput({ surface: "chapter-test" }) })).toBe(true);
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
    guideTarget: { to: "/practice/10/maths?topic=real-numbers&weakMode=1", chapter: "Real Numbers", difficulty: "Easy" },
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
    // (the set was Easy, so one step up is Medium)
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

describe("FEEDBACK-2 · the card dies with the scorecard that asked", () => {
  const variant = {
    surface: "quick-practice",
    title: "Session scorecard",
    subtitle: "now",
    score: { kind: "marks", awarded: 6, total: 10 },
    guideTarget: { to: "/practice/10/maths?topic=real-numbers&weakMode=1", chapter: "Real Numbers", difficulty: "Medium" },
    actions: [],
  } as unknown as ScorecardVariant;

  function Probe() {
    const l = useLocation();
    return <div data-testid="probe">{`${l.pathname}${l.search}`}</div>;
  }
  function Page({ open, onGo }: { open: boolean; onGo?: () => void }) {
    return (
      <MemoryRouter initialEntries={["/practice/10/maths?topic=real-numbers"]}>
        <Probe />
        {open && <ResultsScorecard variant={variant} onClose={() => {}} askFirstFeedback />}
        <button type="button" data-testid="leave" onClick={onGo} />
      </MemoryRouter>
    );
  }
  const tick = (ms: number) =>
    act(async () => {
      await vi.advanceTimersByTimeAsync(ms);
    });

  it("closing the scorecard removes the card", async () => {
    auth.currentUser = { uid: "u1" };
    seedLater("u1");
    vi.useFakeTimers();
    const view = render(<Page open />);
    await tick(FIRST_GRADED_DELAY_MS + 1400);
    expect(card()).not.toBeNull();
    view.rerender(<Page open={false} />);
    await tick(10);
    expect(card()).toBeNull();
  });

  it("a slow written-answer check that finishes AFTER the scorecard closed shows nothing (and spends nothing)", async () => {
    auth.currentUser = { uid: "u1" };
    seedLater("u1");
    let release: (v: boolean | null) => void = () => {};
    cloudWritten.fn.mockReturnValue(new Promise<boolean | null>((r) => (release = r)));
    vi.useFakeTimers();
    const view = render(<Page open />);
    await tick(FIRST_GRADED_DELAY_MS + 50); // asked; waiting on the server read
    expect(card()).toBeNull();
    view.rerender(<Page open={false} />);
    await tick(10);
    await act(async () => {
      release(false);
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(card()).toBeNull();
    // the ask was not used up: the device record has no repeat-ask stamp
    const rec = JSON.parse(window.localStorage.getItem(feedbackStorageKey("u1")) ?? "{}");
    expect(rec.a).toBeUndefined();
  });

  it("a slow written-answer check that finishes after the address CHANGED (scorecard still mounted) shows nothing", async () => {
    auth.currentUser = { uid: "u1" };
    seedLater("u1");
    let release: (v: boolean | null) => void = () => {};
    cloudWritten.fn.mockReturnValue(new Promise<boolean | null>((r) => (release = r)));
    vi.useFakeTimers();
    const { useNavigate } = await import("react-router-dom");
    function Nav() {
      const nav = useNavigate();
      return <button type="button" data-testid="leave" onClick={() => nav("/practice/10/maths?topic=other")} />;
    }
    render(
      <MemoryRouter initialEntries={["/practice/10/maths?topic=real-numbers"]}>
        <Probe />
        <ResultsScorecard variant={variant} onClose={() => {}} askFirstFeedback />
        <Nav />
      </MemoryRouter>,
    );
    await tick(FIRST_GRADED_DELAY_MS + 50); // asked; waiting on the server read
    act(() => void fireEvent.click(screen.getByTestId("leave"))); // same scorecard, new address
    await tick(10);
    await act(async () => {
      release(false);
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(card()).toBeNull();
  });

  it("leaving through the scorecard's own route change leaves no card on the next page", async () => {
    auth.currentUser = { uid: "u1" };
    seedLater("u1");
    vi.useFakeTimers();
    function Leaver() {
      return (
        <MemoryRouter initialEntries={["/practice/10/maths?topic=real-numbers"]}>
          <Probe />
          <ResultsScorecard variant={variant} onClose={() => {}} askFirstFeedback />
          <Nav />
        </MemoryRouter>
      );
    }
    // A sibling that navigates WITHOUT unmounting the scorecard: only the route change should remove the card.
    const { useNavigate } = await import("react-router-dom");
    function Nav() {
      const nav = useNavigate();
      return <button type="button" data-testid="leave" onClick={() => nav("/home")} />;
    }
    render(<Leaver />);
    await tick(FIRST_GRADED_DELAY_MS + 1400);
    expect(card()).not.toBeNull();
    act(() => void fireEvent.click(screen.getByTestId("leave")));
    await tick(10);
    expect(screen.getByTestId("probe").textContent).toBe("/home");
    expect(card()).toBeNull();
  });

  it("a button that navigates leaves no card behind on the destination", async () => {
    auth.currentUser = { uid: "u1" };
    seedLater("u1");
    vi.useFakeTimers();
    render(<Page open />);
    await tick(FIRST_GRADED_DELAY_MS + 1400);
    await tap("feedback-opt-too_easy");
    await tap("feedback-go-harder");
    await tick(3000);
    expect(card()).toBeNull();
  });

  it("the always-on sidebar voice row does not turn the card plain; a real mascot in the page does", async () => {
    const row = document.createElement("div");
    row.className = "lt-mi-voice";
    const host = document.createElement("div");
    row.appendChild(host);
    document.body.appendChild(row);
    act(() => noteMascotHost(host, true));
    seedLater("u1");
    expect(await ask("u1")).toBe(true);
    expect(card()!.getAttribute("data-ziggy")).toBe("1");
    cleanup();
    act(() => __resetFeedbackHostForTests());
    seedLater("u2");
    const other = document.createElement("div");
    document.body.appendChild(other);
    act(() => noteMascotHost(other, true));
    expect(await ask("u2")).toBe(true);
    expect(card()!.getAttribute("data-ziggy")).toBe("0");
    row.remove();
    other.remove();
  });
});
