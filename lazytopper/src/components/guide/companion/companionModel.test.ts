/**
 * COMPANION-1 — the pure rules, pinned at their boundaries (the bounds, not just a number in prose):
 * 23:00 / 05:00 IST, the 30-minute session, < 40 %, +10 points, 3 days away, 3 days in 7, milestones
 * once each (one badge), the official-date countdown, the stage (one character at a time) and the
 * device memory. Every rule takes `now`; nothing here reads the clock.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  COMPANION_KEY_PREFIX,
  COMPANION_PRIORITY,
  COMPANION_SESSION_KEY,
  DAY_MS,
  __resetCompanionForTests,
  achievedMilestones,
  activeMsFor,
  activeSessionAfter,
  activeSessionMs,
  cachedExamDate,
  claimStage,
  isLateNightQuietPath,
  istDayIndex,
  milestoneCrossings,
  noteActivity,
  readActiveSession,
  companionScoreMoment,
  countdownDue,
  daysToBoards,
  improvementOf,
  isLateNightIst,
  isLowScore,
  lateNightDue,
  marksFor,
  milestoneToShow,
  nightKey,
  otherMascotOnScreen,
  pickHomeMoment,
  practiceDaysThisWeek,
  previousSameScore,
  previousSeen,
  readMarks,
  releaseStage,
  rhythmDue,
  scorePct,
  stageHolder,
  warmUpPath,
  welcomeBackDue,
  writeMarks,
  type CompanionMarks,
} from "./companionModel";
import { GUIDE_PREVIEW_KEY, guideAccountTag } from "../guideVariant";
import { __resetMascotHostsForTests, noteMascotHost, subscribeMascotHosts } from "../mascotPresence";

/** An instant from an IST wall-clock time (IST = UTC+05:30). */
const ist = (y: number, mo: number, d: number, h: number, mi = 0) => Date.UTC(y, mo - 1, d, h, mi) - 330 * 60_000;
const MIN = 60_000;
const EMPTY: CompanionMarks = { m: [], wb: null, r: null, c: null, n: null, s: null };

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  __resetCompanionForTests();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("6 · late night, 23:00–05:00 IST, a session past 30 minutes, once a night", () => {
  it("★ the window's boundaries: 22:59 out, 23:00 in, 04:59 in, 05:00 out", () => {
    expect(isLateNightIst(ist(2026, 10, 20, 22, 59))).toBe(false);
    expect(isLateNightIst(ist(2026, 10, 20, 23, 0))).toBe(true);
    expect(isLateNightIst(ist(2026, 10, 21, 4, 59))).toBe(true);
    expect(isLateNightIst(ist(2026, 10, 21, 5, 0))).toBe(false);
    expect(isLateNightIst(ist(2026, 10, 21, 12, 0))).toBe(false);
  });

  it("★ one night = one key: 23:00 and the next 04:59 share it; 05:00 starts another day", () => {
    expect(nightKey(ist(2026, 10, 20, 23, 0))).toBe(nightKey(ist(2026, 10, 21, 4, 59)));
    expect(nightKey(ist(2026, 10, 21, 5, 0))).not.toBe(nightKey(ist(2026, 10, 21, 4, 59)));
    expect(nightKey(ist(2026, 10, 21, 23, 0))).toBe(nightKey(ist(2026, 10, 20, 23, 0)) + 1);
  });

  it("★ the ACTIVE session must be LONGER than 30 minutes; shown once per night", () => {
    const now = ist(2026, 10, 20, 23, 40);
    expect(lateNightDue({ now, activeMs: 30 * MIN, lastNight: null })).toBe(false);
    expect(lateNightDue({ now, activeMs: 31 * MIN, lastNight: null })).toBe(true);
    expect(lateNightDue({ now, activeMs: 0, lastNight: null })).toBe(false);
    expect(lateNightDue({ now, activeMs: 60 * MIN, lastNight: nightKey(now) })).toBe(false);
    // the next night it may show again
    expect(lateNightDue({ now: now + DAY_MS, activeMs: 60 * MIN, lastNight: nightKey(now) })).toBe(true);
    // daytime, however long the session: never
    expect(lateNightDue({ now: ist(2026, 10, 21, 12, 0), activeMs: 300 * MIN, lastNight: null })).toBe(false);
  });

  it("★ active time, not tab-open time: activity extends; > 20 idle minutes starts afresh", () => {
    const t0 = ist(2026, 10, 20, 22, 50);
    let s = activeSessionAfter(null, "aaaa0001", t0);
    s = activeSessionAfter(s, "aaaa0001", t0 + 15 * MIN);
    s = activeSessionAfter(s, "aaaa0001", t0 + 35 * MIN); // 20 min gap exactly: still the same session
    expect(s.start).toBe(t0);
    expect(activeSessionMs(s, "aaaa0001", t0 + 40 * MIN)).toBe(40 * MIN);
    // idle more than 20 minutes → 0, and the next activity starts a NEW session
    expect(activeSessionMs(s, "aaaa0001", t0 + 35 * MIN + 20 * MIN + 1)).toBe(0);
    const fresh = activeSessionAfter(s, "aaaa0001", t0 + 35 * MIN + 20 * MIN + 1);
    expect(fresh.start).toBe(t0 + 55 * MIN + 1);
  });

  it("★ keyed to the account: a sign-out / sign-in in the same tab starts fresh", () => {
    const t0 = ist(2026, 10, 20, 22, 50);
    noteActivity("student-a", t0);
    noteActivity("student-a", t0 + 15 * MIN);
    noteActivity("student-a", t0 + 32 * MIN);
    expect(activeMsFor("student-a", t0 + 33 * MIN)).toBe(33 * MIN);
    expect(activeMsFor("student-b", t0 + 33 * MIN)).toBe(0);
    noteActivity("student-b", t0 + 33 * MIN);
    expect(activeMsFor("student-b", t0 + 34 * MIN)).toBe(MIN);
    expect(activeMsFor("student-a", t0 + 34 * MIN)).toBe(0);
    // stored as the 8-hex tag, never the uid; a reload keeps it
    expect(window.sessionStorage.getItem(COMPANION_SESSION_KEY)).not.toContain("student-b");
    __resetCompanionForTests();
    expect(readActiveSession()?.u).toBe(guideAccountTag("student-b"));
  });

  it("★ quiet routes: tests, papers, Quick Practice / worksheets, Check & Improve — not Home or Me", () => {
    for (const p of ["/chapter-test/10/Maths/polynomials", "/full-mock/10/Maths", "/mock-paper/x", "/practice/10/Maths", "/practice/worksheets", "/check-improve"]) {
      expect(isLateNightQuietPath(p), p).toBe(true);
    }
    for (const p of ["/", "/browse", "/me", "/practice-hub", "/topic/10/maths/polynomials"]) expect(isLateNightQuietPath(p), p).toBe(false);
  });
});

describe("1 & 3 · the scorecard's numbers", () => {
  it("★ low score is STRICTLY below 40%", () => {
    expect(isLowScore(scorePct(39, 100))).toBe(true);
    expect(isLowScore(scorePct(40, 100))).toBe(false);
    expect(isLowScore(scorePct(0, 10))).toBe(true);
    expect(isLowScore(scorePct(5, 0))).toBe(false); // nothing to divide → nothing shown
    expect(scorePct(-1, 10)).toBeNull();
  });

  it("★ improvement needs +10 whole points; the words use the same numbers as the rule", () => {
    expect(improvementOf(50, 59)).toBeNull();
    expect(improvementOf(50, 60)).toEqual({ from: 50, to: 60 });
    expect(improvementOf(null, 90)).toBeNull();
    expect(companionScoreMoment(35, 20)).toEqual({ moment: "improve", from: 20, to: 35 }); // celebrated even below 40
    expect(companionScoreMoment(35, 30)).toEqual({ moment: "lowScore" });
    expect(companionScoreMoment(70, 65)).toBeNull();
  });

  it("previous score: same surface AND same single chapter, graded, earlier — else none", () => {
    const rec = (id: string, surface: "chapter-test" | "worksheet", topic: string[], at: number, a: number, t: number, status: "graded" | "partial" = "graded") => ({
      id, surface, topicKeys: topic, gradedAt: at, marksAwarded: a, marksTotal: t, status,
    });
    const rows = [
      rec("a", "chapter-test", ["polynomials"], 100, 10, 40),
      rec("b", "chapter-test", ["polynomials"], 200, 20, 40),
      rec("c", "worksheet", ["polynomials"], 250, 40, 40),
      rec("d", "chapter-test", ["triangles"], 260, 40, 40),
      rec("e", "chapter-test", ["polynomials"], 270, 40, 40, "partial"),
    ];
    expect(previousSameScore(rows, { surface: "chapter-test", topicKey: "polynomials", gradedAt: 300, id: "x" })).toBe(50);
    expect(previousSameScore(rows, { surface: "chapter-test", topicKey: "polynomials", gradedAt: 150 })).toBe(25);
    expect(previousSameScore(rows, { surface: "chapter-test", topicKey: "polynomials", gradedAt: 100 })).toBeNull();
    expect(previousSameScore(rows, { surface: "full-mock", topicKey: "polynomials", gradedAt: 300 })).toBeNull();
  });
});

describe("4 · milestones — once each, ONE badge at a time", () => {
  const r = (surface: string, status = "graded") => ({ surface, status, gradedAt: 1, topicKeys: [], subject: "maths" }) as never;

  it("★ the thresholds: first written (1), 10 and 50 answers checked; first Chapter Test / Full Mock", () => {
    expect(achievedMilestones({ records: [], gradedAnswers: 0 })).toEqual([]);
    expect(achievedMilestones({ records: [], gradedAnswers: 1 })).toEqual(["firstWritten"]);
    expect(achievedMilestones({ records: [], gradedAnswers: 9 })).toEqual(["firstWritten"]);
    expect(achievedMilestones({ records: [], gradedAnswers: 10 })).toEqual(["firstWritten", "answers10"]);
    expect(achievedMilestones({ records: [], gradedAnswers: 49 })).not.toContain("answers50");
    expect(achievedMilestones({ records: [], gradedAnswers: 50 })).toContain("answers50");
    expect(achievedMilestones({ records: [r("chapter-test")], gradedAnswers: 0 })).toEqual(["firstChapterTest"]);
    expect(achievedMilestones({ records: [r("chapter-test", "pending-upload")], gradedAnswers: 0 })).toEqual([]);
    expect(achievedMilestones({ records: [r("full-mock")], gradedAnswers: 0 })).toEqual(["firstFullMock"]);
    expect(achievedMilestones({ records: [r("check-improve")], gradedAnswers: 0 })).toEqual(["firstWritten"]);
  });

  it("★ several reached at once → ONE badge (the furthest) and all are marked; then never again", () => {
    expect(milestoneToShow(["firstWritten", "firstChapterTest", "answers10"], [])).toEqual({
      show: "answers10",
      mark: ["firstWritten", "firstChapterTest", "answers10"],
    });
    expect(milestoneToShow(["firstWritten", "answers10"], ["firstWritten", "answers10"])).toEqual({ show: null, mark: [] });
    expect(milestoneToShow(["firstWritten", "answers10", "answers50"], ["firstWritten", "answers10"]).show).toBe("answers50");
  });

  it("★ veterans: only a milestone CROSSED since the last Home visit is celebrated; older ones are marked silently", () => {
    const now = ist(2026, 10, 20, 18, 0);
    const lastHome = now - 2 * DAY_MS;
    const times = Array.from({ length: 10 }, (_, i) => now - 40 * DAY_MS + i * DAY_MS); // first: 40 days ago
    times[9] = now - DAY_MS; // the 10th answer: yesterday
    const crossings = milestoneCrossings([], times);
    expect(crossings.firstWritten).toBe(now - 40 * DAY_MS);
    expect(crossings.answers10).toBe(now - DAY_MS);
    expect(milestoneToShow(["firstWritten", "answers10"], [], { crossings, since: lastHome })).toEqual({
      show: "answers10",
      mark: ["firstWritten", "answers10"],
    });
    // nothing new since the last visit → no badge, everything marked
    expect(milestoneToShow(["firstWritten"], [], { crossings, since: lastHome })).toEqual({ show: null, mark: ["firstWritten"] });
    // and through the Home pick: silent marks come back to the caller
    const ancient = { records: [{ surface: "chapter-test", status: "graded", gradedAt: now - 30 * DAY_MS, topicKeys: ["x"], subject: "maths" }] as never[], gradedAnswers: 0 };
    const r = pickHomeMoment({ now, facts: ancient, attemptTimes: [now - DAY_MS / 2], prevSeen: now - DAY_MS / 2, prevHome: lastHome, marks: EMPTY, returnTo: "/" });
    expect(r.pick).toBeNull();
    expect(r.silent).toEqual(["firstChapterTest"]);
  });

  it("no Home visit recorded yet → the last day counts as 'since' (a new student's first test is news)", () => {
    const now = ist(2026, 10, 20, 18, 0);
    const today = { records: [{ surface: "chapter-test", status: "graded", gradedAt: now - 3_600_000, topicKeys: ["x"], subject: "maths" }] as never[], gradedAnswers: 0 };
    const r = pickHomeMoment({ now, facts: today, attemptTimes: [], prevSeen: null, prevHome: null, marks: EMPTY, returnTo: "/" });
    expect(r.pick?.moment).toBe("milestone");
  });
});

describe("5 · welcome back after ≥ 3 days away, once per return", () => {
  const now = ist(2026, 10, 20, 18, 0);
  it("★ the boundary: 3 days less a minute → no; exactly 3 days → yes", () => {
    expect(welcomeBackDue({ now, prevSeen: null, lastActivity: now - 3 * DAY_MS + MIN, lastWelcomeFor: null })).toBeNull();
    expect(welcomeBackDue({ now, prevSeen: null, lastActivity: now - 3 * DAY_MS, lastWelcomeFor: null })).toBe(now - 3 * DAY_MS);
  });
  it("a recent VISIT counts as not away; a new account (no practice) is never 'missed'; once per return", () => {
    expect(welcomeBackDue({ now, prevSeen: now - DAY_MS, lastActivity: now - 10 * DAY_MS, lastWelcomeFor: null })).toBeNull();
    expect(welcomeBackDue({ now, prevSeen: now - 10 * DAY_MS, lastActivity: null, lastWelcomeFor: null })).toBeNull();
    const ref = now - 5 * DAY_MS;
    expect(welcomeBackDue({ now, prevSeen: null, lastActivity: ref, lastWelcomeFor: ref })).toBeNull();
  });
  it("the warm-up goes to Quick Practice, 5 questions, on the most recent single chapter", () => {
    const recs = [
      { surface: "worksheet", status: "graded", gradedAt: 5, topicKeys: ["triangles"], subject: "maths" },
      { surface: "check-improve", status: "graded", gradedAt: 9, topicKeys: [], subject: "science" },
      { surface: "chapter-test", status: "graded", gradedAt: 7, topicKeys: ["acids-bases-salts"], subject: "science" },
    ] as never[];
    const to = warmUpPath(recs, "/browse")!;
    expect(to.startsWith("/practice/10/Science?")).toBe(true);
    const q = new URLSearchParams(to.split("?")[1]);
    expect(q.get("topic")).toBe("acids-bases-salts");
    expect(q.get("count")).toBe("5");
    expect(q.get("returnTo")).toBe("/browse");
    expect(warmUpPath([], "/")).toBeNull();
  });
});

describe("7 · practice rhythm: 3+ distinct IST days in the last 7, at most weekly", () => {
  const now = ist(2026, 10, 20, 20, 0);
  it("★ 2 days → no; 3 days → yes; the same day twice counts once; 7+ days ago does not count", () => {
    const d = (n: number, h = 10) => ist(2026, 10, 20 - n, h);
    expect(practiceDaysThisWeek([d(0), d(0, 15), d(2)], now)).toBe(2);
    expect(practiceDaysThisWeek([d(0), d(2), d(6)], now)).toBe(3);
    expect(practiceDaysThisWeek([d(0), d(2), d(7)], now)).toBe(2);
    expect(rhythmDue({ now, days: 2, lastRhythmAt: null })).toBe(false);
    expect(rhythmDue({ now, days: 3, lastRhythmAt: null })).toBe(true);
    expect(rhythmDue({ now, days: 5, lastRhythmAt: now - 6 * DAY_MS })).toBe(false);
    expect(rhythmDue({ now, days: 5, lastRhythmAt: now - 7 * DAY_MS })).toBe(true);
  });
});

describe("8 · countdown — an official date only, weekly", () => {
  it("whole IST days to the date; past / today / malformed → nothing", () => {
    const now = ist(2027, 2, 14, 23, 30);
    expect(daysToBoards(now, "2027-02-17")).toBe(3);
    expect(daysToBoards(ist(2027, 2, 17, 0, 10), "2027-02-17")).toBeNull();
    expect(daysToBoards(now, "17-02-2027")).toBeNull();
    expect(countdownDue({ now, lastCountdownAt: null })).toBe(true);
    expect(countdownDue({ now, lastCountdownAt: now - 6 * DAY_MS })).toBe(false);
    expect(countdownDue({ now, lastCountdownAt: now - 7 * DAY_MS })).toBe(true);
  });
});

describe("the Home pick and the device memory", () => {
  it("priority on Home: milestone > welcome back > rhythm", () => {
    const now = ist(2026, 10, 20, 18, 0);
    const ct = { surface: "chapter-test", status: "graded", gradedAt: now - 2 * 3_600_000, topicKeys: ["polynomials"], subject: "maths" };
    const old = { surface: "worksheet", status: "graded", gradedAt: now - 10 * DAY_MS, topicKeys: ["polynomials"], subject: "maths" };
    const a = { now, facts: { records: [ct] as never[], gradedAnswers: 0 }, attemptTimes: [], prevSeen: null, marks: EMPTY, returnTo: "/" };
    expect(pickHomeMoment(a).pick?.moment).toBe("milestone");
    const away = { ...a, facts: { records: [old] as never[], gradedAnswers: 0 } };
    expect(pickHomeMoment(away).pick?.moment).toBe("welcomeBack");
    const recent = [now - DAY_MS, now - 2 * DAY_MS, now - 3 * DAY_MS];
    expect(pickHomeMoment({ ...away, attemptTimes: recent }).pick?.moment).toBe("rhythm");
  });

  it("the exam-date read is kept for the IST day only", () => {
    const now = ist(2026, 10, 20, 18, 0);
    const x = { d: istDayIndex(now), date: "2027-02-17", src: "predicted" as const };
    expect(cachedExamDate({ ...EMPTY, x }, now)).toEqual(x);
    expect(cachedExamDate({ ...EMPTY, x }, ist(2026, 10, 21, 0, 1))).toBeNull(); // next IST day: read again
    writeMarks("u9", { x });
    expect(readMarks("u9").x).toEqual(x);
  });

  it("★ stored per account under an 8-hex tag (never the uid); the visit is recorded once per load", () => {
    writeMarks("student-uid-1", { m: ["firstWritten"], r: 5 });
    const key = COMPANION_KEY_PREFIX + guideAccountTag("student-uid-1");
    expect(window.localStorage.getItem(key)).toContain("firstWritten");
    expect(Object.keys(window.localStorage).join(" ")).not.toContain("student-uid-1");
    expect(readMarks("student-uid-1").r).toBe(5);
    expect(previousSeen("student-uid-1", 1000)).toBeNull();
    expect(previousSeen("student-uid-1", 2000)).toBeNull(); // same load: the first read is kept
    expect(readMarks("student-uid-1").s).toBe(1000);
  });

  it("an admin preview neither reads nor spends a marker", () => {
    writeMarks("u1", { m: ["firstWritten"] });
    window.localStorage.setItem(GUIDE_PREVIEW_KEY, JSON.stringify({ arm: "guide", until: Date.now() + 60_000 }));
    expect(marksFor("u1").m).toEqual([]);
    writeMarks("u1", { m: ["answers50"] });
    window.localStorage.removeItem(GUIDE_PREVIEW_KEY);
    expect(readMarks("u1").m).toEqual(["firstWritten"]);
  });
});

describe("★ one character at a time: the stage", () => {
  it("the higher priority holds the stage; releasing hands it back", () => {
    claimStage("home-rhythm", COMPANION_PRIORITY.rhythm);
    expect(stageHolder()).toBe("home-rhythm");
    claimStage("lateNight", COMPANION_PRIORITY.lateNight);
    expect(stageHolder()).toBe("lateNight");
    releaseStage("lateNight");
    expect(stageHolder()).toBe("home-rhythm");
    releaseStage("home-rhythm");
    expect(stageHolder()).toBeNull();
  });

  it("★ another REGISTERED mascot blocks (an event, not a poll); the sidebar MI voice and companion cards do not", () => {
    const heard = vi.fn();
    const off = subscribeMascotHosts(heard);
    expect(otherMascotOnScreen()).toBe(false);
    const chrome = document.createElement("span");
    chrome.className = "lt-gr-host lt-mi-voice__char";
    const own = document.createElement("span");
    own.className = "lt-gr-host lt-cmp__char";
    noteMascotHost(chrome, true);
    noteMascotHost(own, true);
    expect(otherMascotOnScreen()).toBe(false);
    const moment = document.createElement("span");
    moment.className = "lt-gr-host lt-mom__char";
    noteMascotHost(moment, true);
    expect(otherMascotOnScreen()).toBe(true);
    noteMascotHost(moment, false);
    expect(otherMascotOnScreen()).toBe(false);
    expect(heard).toHaveBeenCalledTimes(4);
    off();
    __resetMascotHostsForTests();
  });
});
