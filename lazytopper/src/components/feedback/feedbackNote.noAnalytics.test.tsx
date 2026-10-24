import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, fireEvent, screen } from "@testing-library/react";

vi.mock("firebase/auth", () => ({ getAdditionalUserInfo: vi.fn() }));
const recordActivity = vi.hoisted(() => vi.fn());
vi.mock("../../services/activityClient", () => ({ recordActivity }));
const auth = vi.hoisted(() => ({ currentUser: { uid: "u1" } as null | { uid: string } }));
vi.mock("../../services/firebaseClient", () => ({ authClient: auth }));
const saveNote = vi.hoisted(() => ({ fn: vi.fn(async (_n: unknown) => true) }));
vi.mock("./feedbackNotes", () => ({ saveFeedbackNote: saveNote.fn }));
vi.mock("./FeedbackZiggy", () => ({ default: () => null }));
vi.mock("../guide/moments/writtenGradedCloud", async (orig) => ({
  ...(await orig<typeof import("../guide/moments/writtenGradedCloud")>()),
  cloudHasWrittenGraded: vi.fn(async () => true),
}));

import { __resetFeedbackHostForTests, requestFeedbackPrompt } from "./feedbackPromptHost";

// PERF-3: the graded card is a lazy chunk in production; these suites test the card itself, so it loads
// synchronously here (FeedbackPrompt.lazy.test.tsx pins the real lazy path and the failed-chunk guard).
vi.mock("../../lib/lazyWithRetry", async () => {
  const m = await import("./GradedFeedbackCard");
  return { lazyWithRetry: () => m.default };
});


/**
 * FEEDBACK-2 — THE OWNER'S RULE, END TO END: free text never reaches analytics. This drives the real
 * card and the REAL analytics module (only the first-party hand-off is a spy) and listens on every
 * outgoing channel: GA4, Meta, Vercel, the first-party activity log, fetch, sendBeacon and the console.
 * The student types a note; the only thing any channel may hear is a NAME.
 */

const WORDS = "MY-PRIVATE-NOTE-9f3a";
type W = { gtag?: unknown; fbq?: unknown; va?: unknown };
const w = window as unknown as W;
const originalLocation = window.location;

beforeEach(() => {
  vi.stubEnv("BASE_URL", "/");
  // the same page-address stubs analytics.feedback.test.ts uses, so the real send path runs
  Object.defineProperty(window.navigator, "webdriver", { configurable: true, value: false });
  Object.defineProperty(document, "referrer", { configurable: true, get: () => "" });
  const url = new URL("/practice/10/maths", "https://www.lazytopper.com");
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: { href: url.href, origin: url.origin, hostname: url.hostname, pathname: url.pathname, search: url.search, hash: url.hash },
  });
  window.localStorage.clear();
  window.sessionStorage.clear();
  recordActivity.mockClear();
  saveNote.fn.mockClear();
  auth.currentUser = { uid: "u1" };
  __resetFeedbackHostForTests();
  const now = Date.now();
  window.localStorage.setItem(
    "lazytopper.user.u1.sessionRecords.v1",
    JSON.stringify(
      [
        { id: "QP-M-02", at: 1500 },
        { id: "QP-M-01", at: 3 * 86_400_000 },
      ].map((r) => ({
        id: r.id,
        worksheetId: r.id,
        surface: "quick-practice",
        title: r.id,
        subject: "maths",
        topicKeys: [],
        questionIds: [],
        marksAwarded: 1,
        marksTotal: 2,
        status: "graded",
        fourType: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
        sectionBreakdown: null,
        gradedAt: now - r.at,
        perQuestionRef: `ws:${r.id}`,
        dedupKey: `u1::${r.id}`,
      })),
    ),
  );
});
afterEach(() => {
  cleanup();
  act(() => __resetFeedbackHostForTests());
  delete w.gtag;
  delete w.fbq;
  delete w.va;
  Object.defineProperty(window, "location", { configurable: true, writable: true, value: originalLocation });
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("FEEDBACK-2 · the note's words never leave the account", () => {
  it("typed text: GA4, Meta, Vercel, the activity log, fetch, beacon and the console hear names only", async () => {
    const ga4: unknown[][] = [];
    const meta: unknown[][] = [];
    const vercel: unknown[][] = [];
    w.gtag = (...a: unknown[]) => ga4.push(a);
    const fbq = (...a: unknown[]) => meta.push(a);
    (fbq as unknown as { callMethod: unknown }).callMethod = () => undefined;
    w.fbq = fbq;
    w.va = (...a: unknown[]) => vercel.push(a);
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}"));
    const beacon = vi.fn(() => true);
    Object.defineProperty(window.navigator, "sendBeacon", { configurable: true, value: beacon });
    const logs = [vi.spyOn(console, "log"), vi.spyOn(console, "info"), vi.spyOn(console, "warn"), vi.spyOn(console, "error")];

    await act(async () => {
      expect(
        await requestFeedbackPrompt("after_graded", {
          uid: "u1",
          graded: {
            navigate: vi.fn(),
            surface: "quick-practice",
            subject: "maths",
            topicKey: "real-numbers",
            chapter: "Real Numbers",
            difficulty: null,
            showMissed: null,
            firstWrongTutor: null,
            chapterTutorTo: null,
            returnTo: "/practice/10/maths",
          },
        }),
      ).toBe(true);
    });
    fireEvent.click(screen.getByTestId("feedback-opt-not_really"));
    fireEvent.click(screen.getByTestId("feedback-why-other"));
    fireEvent.change(screen.getByTestId("feedback-note-text"), { target: { value: WORDS } });
    await act(async () => {
      fireEvent.click(screen.getByTestId("feedback-note-send"));
    });

    // the words reached the notes writer, and only it
    expect(saveNote.fn).toHaveBeenCalledWith(expect.objectContaining({ text: WORDS, uid: "u1", moment: "after_graded" }));
    for (const [label, calls] of [
      ["GA4", ga4],
      ["Meta", meta],
      ["Vercel", vercel],
      ["activity log", recordActivity.mock.calls],
      ["fetch", fetchSpy.mock.calls],
      ["sendBeacon", beacon.mock.calls],
      ...logs.map((l, i) => [`console ${i}`, l.mock.calls] as [string, unknown[][]]),
    ] as Array<[string, unknown[][]]>) {
      expect(JSON.stringify(calls), label).not.toContain(WORDS);
    }
    // what the activity log DID hear: names only, in order
    expect(recordActivity.mock.calls.map((c) => (c[1] as { name: string }).name)).toEqual([
      "feedback_shown_after_graded",
      "feedback_after_graded_not_really",
      "feedback_after_graded_next_note_saved",
    ]);
    // and the vendors heard the generic names with closed codes
    expect(vercel.map((v) => (v[1] as { name: string; data: unknown }).name)).toEqual([
      "feedback_shown",
      "feedback_reason",
      "feedback_next",
    ]);
    expect(vercel[2][1]).toEqual({ name: "feedback_next", data: { moment: "after_graded", action: "note_saved" } });
    expect(meta).toEqual([]);
  });
});
