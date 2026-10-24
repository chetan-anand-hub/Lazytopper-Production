import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const auth = vi.hoisted(() => ({ currentUser: null as null | { uid: string; isAnonymous?: boolean } }));
vi.mock("../../services/firebaseClient", () => ({ authClient: auth }));

const fsMock = vi.hoisted(() => ({
  enabled: true,
  addDoc: vi.fn(async (_ref: unknown, _doc: unknown) => ({ id: "n1" })),
  collection: vi.fn((_db: unknown, ...path: string[]) => ({ path: path.join("/") })),
}));
vi.mock("../../services/firestoreSdk", () => ({
  isFirestoreEnabled: () => fsMock.enabled,
  withFirestore: async (use: (h: unknown) => unknown) => use({ fs: { addDoc: fsMock.addDoc, collection: fsMock.collection }, db: {} }),
}));

import { buildFeedbackNoteDoc, saveFeedbackNote, type FeedbackNoteInput } from "./feedbackNotes";

/**
 * FEEDBACK-2 — the optional note goes to ONE place: practiceInsights/{uid}/feedbackNotes, under the
 * signed-in student's own uid, with a closed set of fields. Nothing else in the app receives its words.
 */

const input = (over: Partial<FeedbackNoteInput> = {}): FeedbackNoteInput => ({
  uid: "u1",
  text: "  The marks for Q3 felt wrong  ",
  kind: "marks",
  surface: "chapter-test",
  topicKey: "real-numbers",
  moment: "after_graded",
  ...over,
});

beforeEach(() => {
  auth.currentUser = { uid: "u1" };
  fsMock.enabled = true;
  fsMock.addDoc.mockClear();
  fsMock.collection.mockClear();
});
afterEach(() => vi.restoreAllMocks());

describe("buildFeedbackNoteDoc", () => {
  it("holds exactly text, kind, surface, topicKey, moment, appVersion, createdAt — and no uid, name or email", () => {
    const d = buildFeedbackNoteDoc(input(), new Date("2026-10-24T09:00:00.000Z"))!;
    expect(Object.keys(d).sort()).toEqual(["appVersion", "createdAt", "kind", "moment", "surface", "text", "topicKey"]);
    expect(d).toMatchObject({
      text: "The marks for Q3 felt wrong",
      kind: "marks",
      surface: "chapter-test",
      topicKey: "real-numbers",
      createdAt: "2026-10-24T09:00:00.000Z",
    });
    expect(typeof d.appVersion).toBe("string");
  });

  it("bounds the text to 500 characters; empty -> nothing to save", () => {
    expect(buildFeedbackNoteDoc(input({ text: "x".repeat(900) }))!.text).toHaveLength(500);
    expect(buildFeedbackNoteDoc(input({ text: "   " }))).toBeNull();
  });

  it("a result with no chapter keeps topicKey null", () => {
    expect(buildFeedbackNoteDoc(input({ topicKey: null }))!.topicKey).toBeNull();
  });
});

describe("saveFeedbackNote", () => {
  it("writes ONE document under practiceInsights/<uid>/feedbackNotes and says so", async () => {
    expect(await saveFeedbackNote(input())).toBe(true);
    expect(fsMock.collection).toHaveBeenCalledWith(expect.anything(), "practiceInsights", "u1", "feedbackNotes");
    expect(fsMock.addDoc).toHaveBeenCalledTimes(1);
    expect(fsMock.addDoc.mock.calls[0][0]).toEqual({ path: "practiceInsights/u1/feedbackNotes" });
  });

  it("the words reach no analytics vendor, no network, no console (every channel spied)", async () => {
    const w = window as unknown as Record<string, unknown>;
    const gtag = vi.fn();
    const fbq = vi.fn();
    const va = vi.fn();
    w.gtag = gtag;
    w.fbq = fbq;
    w.va = va;
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}"));
    const beacon = vi.fn(() => true);
    Object.defineProperty(window.navigator, "sendBeacon", { configurable: true, value: beacon });
    const logs = [vi.spyOn(console, "log"), vi.spyOn(console, "info"), vi.spyOn(console, "warn"), vi.spyOn(console, "error")];
    await saveFeedbackNote(input({ text: "SECRET-WORDS-123" }));
    for (const spy of [gtag, fbq, va, fetchSpy, beacon, ...logs]) expect(JSON.stringify(spy.mock.calls)).not.toContain("SECRET-WORDS-123");
    // the only place the words went is the notes collection
    expect(JSON.stringify(fsMock.addDoc.mock.calls)).toContain("SECRET-WORDS-123");
    delete w.gtag;
    delete w.fbq;
    delete w.va;
  });

  it("an auth check before any write: signed out, anonymous, or a different account -> nothing written", async () => {
    auth.currentUser = null;
    expect(await saveFeedbackNote(input())).toBe(false);
    auth.currentUser = { uid: "u1", isAnonymous: true };
    expect(await saveFeedbackNote(input())).toBe(false);
    auth.currentUser = { uid: "someone-else" };
    expect(await saveFeedbackNote(input())).toBe(false);
    expect(fsMock.addDoc).not.toHaveBeenCalled();
  });

  it("Firestore off, empty text or a failing write -> false, never throws", async () => {
    fsMock.enabled = false;
    expect(await saveFeedbackNote(input())).toBe(false);
    fsMock.enabled = true;
    expect(await saveFeedbackNote(input({ text: "" }))).toBe(false);
    fsMock.addDoc.mockRejectedValueOnce(new Error("offline"));
    expect(await saveFeedbackNote(input())).toBe(false);
  });
});
