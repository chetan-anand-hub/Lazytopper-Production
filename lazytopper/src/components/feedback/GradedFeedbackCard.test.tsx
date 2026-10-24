import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor, act } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { FeedbackPrompt } from "./FeedbackPrompt";
import { GRADED_THANKS_MS } from "./GradedFeedbackCard";
import type { GradedFeedbackContext } from "./gradedFeedbackFlow";
import { __resetMascotHostsForTests, noteMascotHost } from "../guide/mascotPresence";

/**
 * FEEDBACK-2 — the card. Every answer -> its buttons; every button -> the router's navigate with the
 * exact URL; Back / Close / Escape never lose the student; the note is a plain form and its words go
 * ONLY to onSaveNote.
 */

afterEach(() => {
  cleanup();
  __resetMascotHostsForTests();
});

function makeCtx(over: Partial<GradedFeedbackContext> = {}): GradedFeedbackContext {
  return {
    navigate: vi.fn(),
    surface: "worksheet",
    showMissed: null,
    subject: "maths",
    topicKey: "real-numbers",
    chapter: "Real Numbers",
    difficulty: null,
    firstWrongTutor: null,
    chapterTutorTo: "/tutor/10/Maths/real-numbers?source=scorecard&returnTo=%2Fpractice%2F10%2Fmaths",
    returnTo: "/practice/10/maths",
    writtenGradedEver: false,
    ...over,
  };
}

function setup(over: { flow?: GradedFeedbackContext | null; withZiggy?: boolean; save?: () => Promise<boolean> } = {}) {
  const flow = over.flow === undefined ? makeCtx() : over.flow;
  const p = {
    onAnswer: vi.fn(),
    onDismiss: vi.fn(),
    onDone: vi.fn(),
    onNext: vi.fn(),
    onSaveNote: vi.fn(over.save ?? (() => Promise.resolve(true))),
  };
  render(<FeedbackPrompt moment="after_graded" flow={flow} withZiggy={over.withZiggy ?? true} {...p} />);
  return { flow, ...p };
}
const tap = (id: string) => fireEvent.click(screen.getByTestId(id));

describe("FEEDBACK-2 card · step 1", () => {
  it("'Was this useful?' with four one-tap answers in the ruled order, and Ziggy beside it", () => {
    setup();
    expect(screen.getByText("Was this useful?")).toBeInTheDocument();
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(["×", "Yes", "Too easy", "Too hard", "Not really"]);
    expect(screen.getByTestId("feedback-prompt").getAttribute("data-ziggy")).toBe("1");
    expect(screen.getByTestId("feedback-prompt").getAttribute("aria-modal")).toBe("false"); // no scrim, no trap
  });

  it("plain card (mascots hidden / another mascot on screen): the same words and buttons, no character", () => {
    setup({ withZiggy: false });
    expect(screen.getByTestId("feedback-prompt").getAttribute("data-ziggy")).toBe("0");
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(["×", "Yes", "Too easy", "Too hard", "Not really"]);
    tap("feedback-opt-yes");
    expect(screen.getByTestId("feedback-line").textContent).toBe("Nice! Let's keep going.");
    expect(screen.getByTestId("feedback-go-more")).toBeInTheDocument();
  });

  it("× records a dismiss (not an answer) and closes; Escape does the same", () => {
    const a = setup();
    tap("feedback-x");
    expect(a.onDismiss).toHaveBeenCalledTimes(1);
    expect(a.onAnswer).not.toHaveBeenCalled();
    expect(a.onDone).toHaveBeenCalledTimes(1);
    cleanup();
    const b = setup();
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(b.onDismiss).toHaveBeenCalledTimes(1);
    expect(b.onDone).toHaveBeenCalledTimes(1);
  });

  it("Escape closes only the card — the scorecard's own window listener never hears it", () => {
    const onWindowKey = vi.fn();
    window.addEventListener("keydown", onWindowKey);
    setup();
    fireEvent.keyDown(document.body, { key: "Escape" });
    window.removeEventListener("keydown", onWindowKey);
    expect(onWindowKey).not.toHaveBeenCalled();
  });
});

describe("FEEDBACK-2 card · one character on screen at a time", () => {
  it("Ziggy steps aside the moment another mascot (the scorecard's own) appears, and the flow carries on unchanged", () => {
    setup();
    expect(screen.getByTestId("feedback-prompt").getAttribute("data-ziggy")).toBe("1");
    const other = document.createElement("span");
    document.body.appendChild(other);
    act(() => noteMascotHost(other, true));
    expect(screen.getByTestId("feedback-prompt").getAttribute("data-ziggy")).toBe("0");
    tap("feedback-opt-yes");
    expect(screen.getByTestId("feedback-go-more")).toBeInTheDocument();
    act(() => noteMascotHost(other, false)); // the other one leaves: he is back
    expect(screen.getByTestId("feedback-prompt").getAttribute("data-ziggy")).toBe("1");
    other.remove();
  });

  it("the budget is told once, when Ziggy is actually drawn — never for a plain card", () => {
    const shown = vi.fn();
    const base = { onAnswer: vi.fn(), onDismiss: vi.fn(), onDone: vi.fn(), onNext: vi.fn(), onSaveNote: vi.fn() };
    render(<FeedbackPrompt moment="after_graded" flow={makeCtx()} withZiggy onZiggyShown={shown} {...base} />);
    tap("feedback-opt-yes");
    tap("feedback-close");
    expect(shown).toHaveBeenCalledTimes(1);
    cleanup();
    const plain = vi.fn();
    render(<FeedbackPrompt moment="after_graded" flow={makeCtx()} withZiggy={false} onZiggyShown={plain} {...base} />);
    expect(plain).not.toHaveBeenCalled();
  });
});

describe("FEEDBACK-2 card · step 2 (every answer leads somewhere)", () => {
  it("Yes: '5 more on <chapter>' + 'Check a written answer'; tapping the first navigates with the ROUTER's navigate, records its name, closes", () => {
    const a = setup();
    tap("feedback-opt-yes");
    expect(a.onAnswer).toHaveBeenCalledWith("yes");
    expect(screen.getByTestId("feedback-line").textContent).toBe("Nice! Let's keep going.");
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(["5 more on Real Numbers", "Check a written answer", "Close"]);
    tap("feedback-go-more");
    expect((a.flow as GradedFeedbackContext).navigate).toHaveBeenCalledWith("/practice/10/maths?topic=real-numbers&count=5");
    expect(a.onNext).toHaveBeenCalledWith("more");
    expect(a.onDone).toHaveBeenCalledTimes(1);
    expect(a.onDismiss).not.toHaveBeenCalled();
  });

  it("Yes: 'Check a written answer' goes to /check-improve, and is absent once a written answer was graded", () => {
    const a = setup();
    tap("feedback-opt-yes");
    tap("feedback-go-written");
    expect((a.flow as GradedFeedbackContext).navigate).toHaveBeenCalledWith("/check-improve");
    expect(a.onNext).toHaveBeenCalledWith("written");
    cleanup();
    setup({ flow: makeCtx({ writtenGradedEver: true }) });
    tap("feedback-opt-yes");
    expect(screen.queryByTestId("feedback-go-written")).toBeNull();
  });

  it("Too easy: 'Try 5 harder ones' one step up; at Hard it is HOTS", () => {
    const a = setup({ flow: makeCtx({ difficulty: "Easy" }) });
    tap("feedback-opt-too_easy");
    expect(screen.getByTestId("feedback-line").textContent).toBe("Let's level up.");
    tap("feedback-go-harder");
    expect((a.flow as GradedFeedbackContext).navigate).toHaveBeenCalledWith("/practice/10/maths?topic=real-numbers&count=5&difficulty=Medium");
    expect(a.onNext).toHaveBeenCalledWith("harder");
    cleanup();
    const b = setup({ flow: makeCtx({ difficulty: "Hard" }) });
    tap("feedback-opt-too_easy");
    expect(screen.getByTestId("feedback-go-harder").textContent).toBe("Try 5 HOTS questions");
    tap("feedback-go-harder");
    expect((b.flow as GradedFeedbackContext).navigate).toHaveBeenCalledWith("/practice/10/maths?topic=real-numbers&count=5&difficulty=Hard&style=hots");
  });

  it("Too hard: 'Try 5 easier ones' + 'Ask the tutor about it' (the host's own hop for the first wrong question); none at Easy", () => {
    const hop = vi.fn();
    const a = setup({ flow: makeCtx({ difficulty: "Medium", firstWrongTutor: hop }) });
    tap("feedback-opt-too_hard");
    expect(screen.getByTestId("feedback-line").textContent).toBe("Same here sometimes.");
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(["Try 5 easier ones", "Ask the tutor about it", "Close"]);
    tap("feedback-go-tutor");
    expect(hop).toHaveBeenCalledTimes(1);
    expect(a.onNext).toHaveBeenCalledWith("tutor");
    expect((a.flow as GradedFeedbackContext).navigate).not.toHaveBeenCalled();
    cleanup();
    const b = setup({ flow: makeCtx({ difficulty: "Easy" }) });
    tap("feedback-opt-too_hard");
    expect(screen.queryByTestId("feedback-go-easier")).toBeNull();
    tap("feedback-go-tutor");
    expect((b.flow as GradedFeedbackContext).navigate).toHaveBeenCalledWith(makeCtx().chapterTutorTo);
  });

  it("Close on step 2 returns to the scorecard untouched: nothing navigates, no dismiss is recorded", () => {
    const a = setup();
    tap("feedback-opt-yes");
    tap("feedback-close");
    expect(a.onDone).toHaveBeenCalledTimes(1);
    expect((a.flow as GradedFeedbackContext).navigate).not.toHaveBeenCalled();
    expect(a.onDismiss).not.toHaveBeenCalled();
    cleanup();
    const b = setup();
    tap("feedback-opt-yes");
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(b.onDone).toHaveBeenCalledTimes(1);
    expect(b.onDismiss).not.toHaveBeenCalled();
  });

  it("with no flow (a host that gave no context) an answer says thanks and closes itself, as before", async () => {
    const a = setup({ flow: null });
    tap("feedback-opt-too_hard");
    expect(a.onAnswer).toHaveBeenCalledWith("too_hard");
    expect(screen.getByTestId("feedback-thanks").textContent).toBe("Thank you — this really helps us.");
    await waitFor(() => expect(a.onDone).toHaveBeenCalled(), { timeout: GRADED_THANKS_MS + 1500 });
  });
});

describe("FEEDBACK-2 card · step 3 ('Not really')", () => {
  it("'What was missing?' with four choices and Back; Back returns to the question", () => {
    const a = setup();
    tap("feedback-opt-not_really");
    expect(screen.getByTestId("feedback-line").textContent).toBe("What was missing?");
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual([
      "The explanation was unclear",
      "The marks felt wrong",
      "Wrong chapter for me",
      "Something else",
      "Back",
      "Close",
    ]);
    tap("feedback-back");
    expect(screen.getByText("Was this useful?")).toBeInTheDocument();
    expect(a.onDone).not.toHaveBeenCalled();
    // the × after coming Back is a plain close, not a dismissed-without-answering
    tap("feedback-x");
    expect(a.onDismiss).not.toHaveBeenCalled();
    expect(a.onDone).toHaveBeenCalledTimes(1);
  });

  it("Explanation unclear -> the tutor; Wrong chapter -> the hub chapter picker", () => {
    const hop = vi.fn();
    const a = setup({ flow: makeCtx({ firstWrongTutor: hop }) });
    tap("feedback-opt-not_really");
    tap("feedback-why-unclear");
    expect(hop).toHaveBeenCalledTimes(1);
    expect(a.onNext).toHaveBeenCalledWith("tutor");
    cleanup();
    const b = setup();
    tap("feedback-opt-not_really");
    tap("feedback-why-chapter");
    expect((b.flow as GradedFeedbackContext).navigate).toHaveBeenCalledWith("/practice-hub");
    expect(b.onNext).toHaveBeenCalledWith("picker");
    expect(b.onDone).toHaveBeenCalledTimes(1);
  });

  it("Marks felt wrong / Something else -> a plain 'Tell us more' form with NO Ziggy; Back returns to step 3", () => {
    setup();
    tap("feedback-opt-not_really");
    tap("feedback-why-marks");
    expect(screen.getByRole("heading", { name: "Marks felt wrong" })).toBeInTheDocument();
    expect(screen.getByTestId("feedback-prompt").getAttribute("data-ziggy")).toBe("0"); // a character never takes free text
    expect(screen.getByTestId("feedback-note-text")).toBeInTheDocument();
    tap("feedback-back");
    expect(screen.getByTestId("feedback-line").textContent).toBe("What was missing?");
    tap("feedback-why-other");
    expect(screen.getByRole("heading", { name: "Tell us more" })).toBeInTheDocument();
  });

  it("the note: max 500 characters, Send is off until there is text, and the words go ONLY to onSaveNote", async () => {
    const a = setup();
    tap("feedback-opt-not_really");
    tap("feedback-why-other");
    const box = screen.getByTestId("feedback-note-text") as HTMLTextAreaElement;
    expect(box.maxLength).toBe(500);
    expect((screen.getByTestId("feedback-note-send") as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(box, { target: { value: "  The second step was confusing  " } });
    expect((screen.getByTestId("feedback-note-send") as HTMLButtonElement).disabled).toBe(false);
    await act(async () => {
      fireEvent.click(screen.getByTestId("feedback-note-send"));
    });
    expect(a.onSaveNote).toHaveBeenCalledWith("other", "The second step was confusing");
    expect(screen.getByTestId("feedback-thanks").textContent).toBe("Thank you. Your note is saved.");
    // nothing about the words reached the answer / next-step callbacks
    expect(JSON.stringify([a.onAnswer.mock.calls, a.onNext.mock.calls, a.onDismiss.mock.calls])).not.toContain("confusing");
  });

  it("'Marks felt wrong' saves as kind 'marks'; a failed save keeps the text, says so, and can be retried", async () => {
    const save = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const a = setup({ save });
    tap("feedback-opt-not_really");
    tap("feedback-why-marks");
    fireEvent.change(screen.getByTestId("feedback-note-text"), { target: { value: "Q3 should be 2 marks" } });
    await act(async () => {
      fireEvent.click(screen.getByTestId("feedback-note-send"));
    });
    expect(screen.getByTestId("feedback-note-failed")).toBeInTheDocument();
    expect((screen.getByTestId("feedback-note-text") as HTMLTextAreaElement).value).toBe("Q3 should be 2 marks");
    await act(async () => {
      fireEvent.click(screen.getByTestId("feedback-note-send"));
    });
    expect(save).toHaveBeenNthCalledWith(1, "marks", "Q3 should be 2 marks");
    expect(save).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("feedback-thanks")).toBeInTheDocument();
    expect(a.onDone).not.toHaveBeenCalled(); // the thanks closes itself later
  });

  it("Skip closes without saving anything", () => {
    const a = setup();
    tap("feedback-opt-not_really");
    tap("feedback-why-other");
    fireEvent.change(screen.getByTestId("feedback-note-text"), { target: { value: "never mind" } });
    tap("feedback-skip");
    expect(a.onSaveNote).not.toHaveBeenCalled();
    expect(a.onDone).toHaveBeenCalledTimes(1);
  });
});

describe("FEEDBACK-2 card · phone and desktop layout (CSS pinned)", () => {
  const css = readFileSync(resolve(process.cwd(), "src/components/feedback/GradedFeedbackCard.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  it("bottom sheet of at most half the screen on a phone, scrollable; a bottom-right panel on desktop; no style={{}}", () => {
    expect(css).toMatch(/max-height: 50vh;\s*\n\s*overflow-y: auto;/);
    expect(css).toMatch(/@media \(min-width: 1024px\)[\s\S]*right: 24px/);
    expect(css).not.toMatch(/style=\{\{/);
  });
  it("every tap target is at least 44 px", () => {
    for (const cls of [".lt-fbg__opt", ".lt-fbg__link"]) {
      const block = new RegExp(`${cls.replace(".", "\\.")} \\{[^}]*min-height: 44px`).test(css);
      expect(block, cls).toBe(true);
    }
    expect(css).toMatch(/\.lt-fbg__x \{[^}]*width: 44px;[^}]*height: 44px/);
  });
});

describe("FEEDBACK-2 card · review fixes", () => {
  it("Escape in the note form goes Back to the question list and KEEPS what was typed", () => {
    const a = setup();
    tap("feedback-opt-not_really");
    tap("feedback-why-other");
    fireEvent.change(screen.getByTestId("feedback-note-text"), { target: { value: "half a thought" } });
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(screen.getByTestId("feedback-line").textContent).toBe("What was missing?");
    expect(a.onDone).not.toHaveBeenCalled();
    tap("feedback-why-other");
    expect((screen.getByTestId("feedback-note-text") as HTMLTextAreaElement).value).toBe("half a thought");
    // a DIFFERENT box starts empty
    fireEvent.keyDown(document.body, { key: "Escape" });
    tap("feedback-why-marks");
    expect((screen.getByTestId("feedback-note-text") as HTMLTextAreaElement).value).toBe("");
  });

  it("Quick Practice with a missed MCQ: Marks felt wrong opens that question, names where to tap, and hands the card off", () => {
    const showMissed = vi.fn();
    const onHandOff = vi.fn();
    const flow = makeCtx({ surface: "quick-practice", showMissed });
    render(
      <FeedbackPrompt
        moment="after_graded"
        flow={flow}
        withZiggy={false}
        onAnswer={vi.fn()}
        onDismiss={vi.fn()}
        onDone={vi.fn()}
        onNext={vi.fn()}
        onSaveNote={vi.fn()}
        onHandOff={onHandOff}
      />,
    );
    tap("feedback-opt-not_really");
    tap("feedback-why-marks");
    expect(showMissed).toHaveBeenCalledTimes(1);
    expect(onHandOff).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("feedback-thanks").textContent).toBe("Tap Report issue under the question.");
    expect(screen.queryByTestId("feedback-note-text")).toBeNull();
  });

  it("on a phone the card is drawn IN FLOW inside the scorecard's slot, not fixed over its buttons", () => {
    const slot = document.createElement("div");
    document.body.appendChild(slot);
    const mm = vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() });
    const prev = window.matchMedia;
    window.matchMedia = mm as never;
    try {
      setup({ flow: makeCtx({ getSlot: () => slot }) });
      const card = screen.getByTestId("feedback-prompt");
      expect(slot.contains(card)).toBe(true);
      expect(card.className).toContain("lt-fbg--flow");
    } finally {
      window.matchMedia = prev;
      slot.remove();
    }
  });

  it("on desktop (or with no slot) the card floats in its own panel", () => {
    const slot = document.createElement("div");
    document.body.appendChild(slot);
    const mm = vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() });
    const prev = window.matchMedia;
    window.matchMedia = mm as never;
    try {
      setup({ flow: makeCtx({ getSlot: () => slot }) });
      expect(slot.contains(screen.getByTestId("feedback-prompt"))).toBe(false);
      expect(screen.getByTestId("feedback-prompt").className).not.toContain("lt-fbg--flow");
    } finally {
      window.matchMedia = prev;
      slot.remove();
    }
  });

  it("the sidebar's always-on voice row does not count as another mascot (Ziggy stays); a real one still sends him away", () => {
    const side = document.createElement("div");
    const row = document.createElement("div");
    row.className = "lt-mi-voice";
    row.appendChild(side);
    document.body.appendChild(row);
    act(() => noteMascotHost(side, true));
    setup();
    expect(screen.getByTestId("feedback-prompt").getAttribute("data-ziggy")).toBe("1");
    const other = document.createElement("div");
    document.body.appendChild(other);
    act(() => noteMascotHost(other, true));
    expect(screen.getByTestId("feedback-prompt").getAttribute("data-ziggy")).toBe("0");
    row.remove();
    other.remove();
  });
});
