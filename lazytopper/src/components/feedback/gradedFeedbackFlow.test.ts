import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  CHECK_IMPROVE_PATH,
  FEEDBACK_NOTE_MAX,
  GRADED_FEEDBACK_COPY,
  NOT_REALLY_REASONS,
  PRACTICE_HUB_PATH,
  buildGradedFeedbackContextInput,
  chapterFromGuideTarget,
  cleanNoteText,
  difficultyFromSearch,
  firstWrongTutorHop,
  nextStepFor,
  notReallyOutcome,
  practicePath,
  stepDown,
  stepUp,
  type DifficultyStep,
  type GradedFeedbackContext,
} from "./gradedFeedbackFlow";

/**
 * FEEDBACK-2 — the pure half: every answer -> its buttons (and the omissions), every button -> the
 * exact URL (difficulty step included), and every destination is a real router path.
 */

function ctx(over: Partial<GradedFeedbackContext> = {}): GradedFeedbackContext {
  return {
    navigate: vi.fn(),
    surface: "chapter-test",
    subject: "maths",
    topicKey: "real-numbers",
    chapter: "Real Numbers",
    difficulty: null,
    showMissed: null,
    firstWrongTutor: null,
    chapterTutorTo: "/tutor/10/Maths/real-numbers?source=scorecard&returnTo=%2Fpractice%2F10%2Fmaths",
    returnTo: "/practice/10/maths",
    writtenGradedEver: false,
    ...over,
  };
}
const labels = (c: GradedFeedbackContext, a: "yes" | "too_easy" | "too_hard") => nextStepFor(a, c).buttons.map((b) => b.label);
const tos = (c: GradedFeedbackContext, a: "yes" | "too_easy" | "too_hard") => nextStepFor(a, c).buttons.map((b) => b.to);

describe("FEEDBACK-2 · Yes", () => {
  it("5 more on the chapter at the SAME difficulty, plus Check a written answer only when never written", () => {
    expect(labels(ctx(), "yes")).toEqual(["5 more on Real Numbers", "Check a written answer"]);
    expect(tos(ctx(), "yes")).toEqual(["/practice/10/maths?topic=real-numbers&count=5", CHECK_IMPROVE_PATH]);
    // same difficulty: a known one is carried over, unchanged
    expect(tos(ctx({ difficulty: "Hard" }), "yes")[0]).toBe("/practice/10/maths?topic=real-numbers&count=5&difficulty=Hard");
    expect(nextStepFor("yes", ctx()).line).toBe("Nice! Let's keep going.");
  });

  it("omits Check a written answer once a written answer was graded, when unknown, and on Check & Improve itself (controls above show it)", () => {
    expect(labels(ctx({ writtenGradedEver: true }), "yes")).toEqual(["5 more on Real Numbers"]);
    expect(labels(ctx({ writtenGradedEver: null }), "yes")).toEqual(["5 more on Real Numbers"]);
    expect(labels(ctx({ surface: "check-improve" }), "yes")).toEqual(["5 more on Real Numbers"]);
  });

  it("Quick Practice never offers Check a written answer (owner ruling 23 Oct), whatever the history says", () => {
    expect(labels(ctx({ surface: "quick-practice", writtenGradedEver: false }), "yes")).toEqual(["5 more on Real Numbers"]);
    expect(labels(ctx({ surface: "worksheet", writtenGradedEver: false }), "yes")).toEqual(["5 more on Real Numbers", "Check a written answer"]);
  });

  it("no single chapter -> Choose a chapter (the hub), never a random chapter", () => {
    const c = ctx({ subject: null, topicKey: null, chapter: null, chapterTutorTo: null });
    expect(labels(c, "yes")).toEqual(["Choose a chapter", "Check a written answer"]);
    expect(labels({ ...c, surface: "quick-practice" }, "yes")).toEqual(["Choose a chapter"]);
    expect(tos(c, "yes")[0]).toBe(PRACTICE_HUB_PATH);
    expect(nextStepFor("yes", c).buttons[0].action).toBe("picker");
  });

  it("a known chapter without a display name still gets a real button", () => {
    expect(labels(ctx({ chapter: null }), "yes")[0]).toBe("5 more questions");
  });
});

describe("FEEDBACK-2 · Too easy -> one step UP", () => {
  const up = (d: DifficultyStep | null) => nextStepFor("too_easy", ctx({ difficulty: d })).buttons.map((b) => [b.label, b.to]);
  it("Easy -> Medium, Medium -> Hard, unknown -> Hard", () => {
    expect(up("Easy")).toEqual([["Try 5 harder ones", "/practice/10/maths?topic=real-numbers&count=5&difficulty=Medium"]]);
    expect(up("Medium")).toEqual([["Try 5 harder ones", "/practice/10/maths?topic=real-numbers&count=5&difficulty=Hard"]]);
    expect(up(null)).toEqual([["Try 5 harder ones", "/practice/10/maths?topic=real-numbers&count=5&difficulty=Hard"]]);
  });
  it("at Hard -> HOTS (Practice supports ?style=hots), labelled honestly", () => {
    expect(up("Hard")).toEqual([["Try 5 HOTS questions", "/practice/10/maths?topic=real-numbers&count=5&difficulty=Hard&style=hots"]]);
  });
  it("Ziggy's line, and no other button", () => {
    expect(nextStepFor("too_easy", ctx()).line).toBe("Let's level up.");
    expect(nextStepFor("too_easy", ctx()).buttons).toHaveLength(1);
  });
  it("no chapter -> Choose a chapter", () => {
    expect(labels(ctx({ subject: null, topicKey: null }), "too_easy")).toEqual(["Choose a chapter"]);
  });
  it("stepUp / stepDown are one step", () => {
    expect(stepUp("Easy")).toEqual({ difficulty: "Medium", hots: false });
    expect(stepUp("Hard")).toEqual({ difficulty: "Hard", hots: true });
    expect(stepDown("Hard")).toBe("Medium");
    expect(stepDown("Medium")).toBe("Easy");
    expect(stepDown("Easy")).toBeNull();
  });
});

describe("FEEDBACK-2 · Too hard -> one step DOWN, and the tutor", () => {
  it("Hard -> Medium, Medium -> Easy, unknown -> Easy; tutor second", () => {
    const d = (x: DifficultyStep | null) => tos(ctx({ difficulty: x }), "too_hard")[0];
    expect(d("Hard")).toBe("/practice/10/maths?topic=real-numbers&count=5&difficulty=Medium");
    expect(d("Medium")).toBe("/practice/10/maths?topic=real-numbers&count=5&difficulty=Easy");
    expect(d(null)).toBe("/practice/10/maths?topic=real-numbers&count=5&difficulty=Easy");
    expect(labels(ctx(), "too_hard")).toEqual(["Try 5 easier ones", "Ask the tutor about it"]);
    expect(nextStepFor("too_hard", ctx()).line).toBe("Same here sometimes.");
  });
  it("at Easy there is no easier set: only the tutor is offered", () => {
    expect(labels(ctx({ difficulty: "Easy" }), "too_hard")).toEqual(["Ask the tutor about it"]);
  });
  it("the tutor goes to the FIRST wrong question through the host's own hop when it has one, else the chapter", () => {
    const hop = vi.fn();
    const c = ctx({ firstWrongTutor: hop });
    const t = nextStepFor("too_hard", c).buttons.find((b) => b.id === "tutor")!;
    expect(t.to).toBeNull();
    t.run();
    expect(hop).toHaveBeenCalledTimes(1);
    expect(c.navigate).not.toHaveBeenCalled();
    const c2 = ctx();
    const t2 = nextStepFor("too_hard", c2).buttons.find((b) => b.id === "tutor")!;
    t2.run();
    expect(c2.navigate).toHaveBeenCalledWith(c2.chapterTutorTo);
  });
  it("no question and no chapter -> no tutor button (never a vague one)", () => {
    expect(labels(ctx({ subject: null, topicKey: null, chapterTutorTo: null }), "too_hard")).toEqual([]);
  });
});

describe("FEEDBACK-2 · Not really -> what was missing", () => {
  it("four choices in order", () => {
    expect(NOT_REALLY_REASONS.map((r) => r.label)).toEqual([
      "The explanation was unclear",
      "The marks felt wrong",
      "Wrong chapter for me",
      "Something else",
    ]);
    expect(GRADED_FEEDBACK_COPY.line.not_really).toBe("What was missing?");
  });
  it("unclear -> the tutor (host hop, else chapter); with no tutor to offer it becomes a note rather than a dead end", () => {
    const hop = vi.fn();
    const a = notReallyOutcome("unclear", ctx({ firstWrongTutor: hop }));
    expect(a.kind).toBe("go");
    if (a.kind === "go") {
      a.button.run();
      expect(hop).toHaveBeenCalled();
      expect(a.button.action).toBe("tutor");
    }
    const b = notReallyOutcome("unclear", ctx());
    expect(b.kind === "go" && b.button.to).toBe(ctx().chapterTutorTo);
    expect(notReallyOutcome("unclear", ctx({ chapterTutorTo: null })).kind).toBe("note");
  });
  it("Quick Practice with a missed MCQ: Marks felt wrong opens that question (its Report issue form) and names where to tap", () => {
    const run = vi.fn();
    const out = notReallyOutcome("marks", ctx({ surface: "quick-practice", showMissed: run }));
    expect(out).toMatchObject({ kind: "missed", line: "Tap Report issue under the question." });
    if (out.kind === "missed") out.run();
    expect(run).toHaveBeenCalledTimes(1);
    // nothing missed on Quick Practice, or any other surface: the pre-labelled note
    expect(notReallyOutcome("marks", ctx({ surface: "quick-practice", showMissed: null }))).toMatchObject({ kind: "note", noteKind: "marks" });
    expect(notReallyOutcome("marks", ctx({ surface: "worksheet", showMissed: run }))).toMatchObject({ kind: "note", noteKind: "marks" });
  });

  it("marks -> the 'Marks felt wrong' note; chapter -> the Practice hub picker; something else -> the plain note", () => {
    const m = notReallyOutcome("marks", ctx());
    expect(m).toMatchObject({ kind: "note", noteKind: "marks", title: "Marks felt wrong" });
    const c = notReallyOutcome("chapter", ctx());
    expect(c.kind === "go" && [c.button.to, c.button.action]).toEqual([PRACTICE_HUB_PATH, "picker"]);
    expect(notReallyOutcome("other", ctx())).toMatchObject({ kind: "note", noteKind: "other", title: "Tell us more" });
  });
});

describe("FEEDBACK-2 · every destination is a real router path (NEVER LOST)", () => {
  const app = readFileSync(resolve(process.cwd(), "src/App.tsx"), "utf8");
  it("the route patterns the buttons use exist in App.tsx", () => {
    expect(app).toContain('path="/practice/:grade/:subject"');
    expect(app).toContain('path="/practice-hub"');
    expect(app).toContain('path="/check-improve"');
    expect(app).toContain('path="/tutor/:grade/:subject/:topicKey"');
  });
  it("every URL the flow can emit is an in-app path that matches one of them (no external URL, no window.location)", () => {
    const all: Array<string | null> = [];
    for (const difficulty of [null, "Easy", "Medium", "Hard"] as const) {
      for (const a of ["yes", "too_easy", "too_hard"] as const) all.push(...tos(ctx({ difficulty }), a));
    }
    for (const r of ["unclear", "chapter"] as const) {
      const o = notReallyOutcome(r, ctx());
      if (o.kind === "go") all.push(o.button.to);
    }
    const ok = [
      /^\/practice\/10\/(maths|science)\?topic=[a-z0-9-]+&count=5(&difficulty=(Easy|Medium|Hard))?(&style=hots)?$/,
      /^\/practice-hub$/,
      /^\/check-improve$/,
      /^\/tutor\/10\/(Maths|Science)\/[a-z0-9-]+\?/,
    ];
    expect(all.length).toBeGreaterThan(10);
    for (const to of all) {
      expect(to, String(to)).not.toBeNull();
      expect(ok.some((re) => re.test(to as string)), String(to)).toBe(true);
    }
  });
  it("the card and the flow never use window.location or document.location to move the student", () => {
    for (const f of ["GradedFeedbackCard.tsx", "gradedFeedbackFlow.ts", "FirstGradedAsk.tsx", "feedbackPromptHost.tsx"]) {
      const raw = readFileSync(resolve(process.cwd(), "src/components/feedback", f), "utf8");
      // code only: comments may NAME window.location while promising never to use it
      const src = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
      expect(src, f).not.toMatch(/(window|document)\.location|location\.(href|assign|replace)\s*=|history\.(push|replace)State/);
    }
  });
});

describe("FEEDBACK-2 · the context built from the scorecard's variant", () => {
  const nav = vi.fn();
  const base = { navigate: nav, pathname: "/practice/10/maths", search: "?topic=real-numbers&difficulty=Easy" };

  it("reads the chapter out of every guide-target shape the six hosts use", () => {
    expect(chapterFromGuideTarget("/practice/10/maths?topic=real-numbers&weakMode=1")).toEqual({ subject: "maths", topicKey: "real-numbers" });
    expect(chapterFromGuideTarget("/practice/10/Science?topic=life-processes")).toEqual({ subject: "science", topicKey: "life-processes" });
    expect(chapterFromGuideTarget("/practice/worksheets?scope=topic&subject=science&topic=acids-bases-and-salts&mistakeAware=1")).toEqual({
      subject: "science",
      topicKey: "acids-bases-and-salts",
    });
    // several chapters / no chapter / not an in-app path -> none (never a guess)
    expect(chapterFromGuideTarget("/practice/worksheets?scope=full-subject&subject=maths")).toBeNull();
    expect(chapterFromGuideTarget("/practice/10/maths?topic=mixed:a,b")).toBeNull();
    expect(chapterFromGuideTarget("/practice/10/maths")).toBeNull();
    expect(chapterFromGuideTarget("https://evil.example/practice/10/maths?topic=x")).toBeNull();
    expect(chapterFromGuideTarget("//evil.example/practice/10/maths?topic=x")).toBeNull();
    expect(chapterFromGuideTarget(null)).toBeNull();
  });

  it("the set's REAL difficulty comes from the host's guide target, never from the URL", () => {
    const v = (difficulty: unknown) => ({
      surface: "quick-practice" as const,
      guideTarget: { to: "/practice/10/maths?topic=real-numbers&weakMode=1", chapter: "Real Numbers", difficulty } as never,
    });
    expect(buildGradedFeedbackContextInput({ ...base, variant: v("Medium") }).difficulty).toBe("Medium");
    expect(buildGradedFeedbackContextInput({ ...base, variant: v(null) }).difficulty).toBeNull();
    expect(buildGradedFeedbackContextInput({ ...base, variant: v("everything") }).difficulty).toBeNull();
    // base.search says ?difficulty=Easy: ignored.
    expect(buildGradedFeedbackContextInput({ ...base, variant: { surface: "worksheet", guideTarget: null } }).difficulty).toBeNull();
  });

  it("an Easy set + Too hard offers NO easier button; a Medium set + Too easy goes to Hard; Hard + Too easy goes to HOTS", () => {
    expect(nextStepFor("too_hard", ctx({ difficulty: "Easy" })).buttons.map((b) => b.id)).toEqual(["tutor"]);
    expect(nextStepFor("too_easy", ctx({ difficulty: "Medium" })).buttons.map((b) => b.to)).toEqual([
      "/practice/10/maths?topic=real-numbers&count=5&difficulty=Hard",
    ]);
    expect(nextStepFor("too_easy", ctx({ difficulty: "Hard" })).buttons.map((b) => b.to)).toEqual([
      "/practice/10/maths?topic=real-numbers&count=5&difficulty=Hard&style=hots",
    ]);
  });

  it("difficultyFromSearch (kept for callers that read a URL)", () => {
    expect(difficultyFromSearch("?difficulty=Hard")).toBe("Hard");
    expect(difficultyFromSearch("?difficulty=easy")).toBe("Easy");
    expect(difficultyFromSearch("?difficulty=All")).toBeNull();
    expect(difficultyFromSearch("")).toBeNull();
    expect(difficultyFromSearch(undefined)).toBeNull();
  });

  it("a result with a single chapter: subject, topic, name, difficulty, the tutor path back to THIS page, and the router's navigate", () => {
    const out = buildGradedFeedbackContextInput({
      ...base,
      variant: { surface: "quick-practice", guideTarget: { to: "/practice/10/maths?topic=real-numbers&weakMode=1", chapter: "Real Numbers" } },
    });
    expect(out).toMatchObject({ surface: "quick-practice", subject: "maths", topicKey: "real-numbers", chapter: "Real Numbers", difficulty: null, showMissed: null });
    expect(out.navigate).toBeTypeOf("function");
    expect(out.chapterTutorTo).toBe(
      `/tutor/10/Maths/real-numbers?source=scorecard&returnTo=${encodeURIComponent("/practice/10/maths?topic=real-numbers&difficulty=Easy")}`,
    );
    expect(out.returnTo).toBe("/practice/10/maths?topic=real-numbers&difficulty=Easy");
  });

  it("a multi-chapter result (no guide target) has no chapter: the flow falls back to the hub, never a random chapter", () => {
    const out = buildGradedFeedbackContextInput({ ...base, variant: { surface: "full-mock", guideTarget: null } });
    expect(out).toMatchObject({ subject: null, topicKey: null, chapter: null, chapterTutorTo: null });
    const full: GradedFeedbackContext = { ...out, writtenGradedEver: true };
    expect(nextStepFor("yes", full).buttons.map((b) => b.to)).toEqual([PRACTICE_HUB_PATH]);
  });

  it("the first question that lost marks and has a hop wins; a mark that was not lost never counts", () => {
    const a = vi.fn();
    const b = vi.fn();
    expect(
      firstWrongTutorHop({
        wrongAnswers: [{ label: "Question 2", yourAnswer: null, correctAnswer: null, steps: [], tutorAsk: { onAsk: a } }],
        gradedAnswers: [{ label: "Question 1", awarded: 0, available: 1, tutorAsk: { onAsk: b } }],
      }),
    ).toBe(a);
    expect(
      firstWrongTutorHop({ gradedAnswers: [{ label: "Question 1", awarded: 1, available: 1, tutorAsk: { onAsk: b } }] }),
    ).toBeNull();
    expect(
      firstWrongTutorHop({ gradedAnswers: [{ label: "Question 1", awarded: 0, available: 2, tutorAsk: { onAsk: b } }] }),
    ).toBe(b);
    expect(firstWrongTutorHop({})).toBeNull();
  });

  it("practicePath is null without a chapter", () => {
    expect(practicePath({ subject: null, topicKey: null })).toBeNull();
    expect(practicePath({ subject: "science", topicKey: "light" }, { difficulty: "Easy" })).toBe(
      "/practice/10/science?topic=light&count=5&difficulty=Easy",
    );
  });
});

describe("FEEDBACK-2 · the voice (personality guide) — one copy table", () => {
  const lines: string[] = [
    GRADED_FEEDBACK_COPY.line.yes,
    GRADED_FEEDBACK_COPY.line.too_easy,
    GRADED_FEEDBACK_COPY.line.too_hard,
    GRADED_FEEDBACK_COPY.line.not_really,
  ];
  it("companion lines: at most 18 words, at most one exclamation mark, no emoji", () => {
    for (const l of lines) {
      expect(l.split(/\s+/).length, l).toBeLessThanOrEqual(18);
      expect((l.match(/!/g) ?? []).length, l).toBeLessThanOrEqual(1);
      expect(l, l).not.toMatch(/\p{Extended_Pictographic}/u);
    }
  });
  it("no selling, no guilt, no streak pressure, no Hinglish in any word on the card", () => {
    const every = JSON.stringify(GRADED_FEEDBACK_COPY);
    expect(every).not.toMatch(/premium|upgrade|price|₹|pay\b|offer|hurry|last chance|miss(ed)? you|streak|don't give up/i);
    expect(every).not.toMatch(/\b(yaar|bhai|arre|chalo|accha|shabash|sahi|kya|abhi|bas)\b/i);
  });
  it("the note form is a plain form: its copy has no companion lines", () => {
    expect(GRADED_FEEDBACK_COPY.note.title).toBe("Tell us more");
    expect(GRADED_FEEDBACK_COPY.note.marksTitle).toBe("Marks felt wrong");
  });
  it("cleanNoteText trims, bounds to 500 and returns null for nothing", () => {
    expect(cleanNoteText("  hi  ")).toBe("hi");
    expect(cleanNoteText("   ")).toBeNull();
    expect(cleanNoteText(undefined)).toBeNull();
    expect(cleanNoteText("x".repeat(900))).toHaveLength(FEEDBACK_NOTE_MAX);
  });
});
