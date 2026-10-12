// ACTIVATION-1 · L2 — the in-progress Check & Improve input survives a sign-in round trip in
// THIS tab, is restored un-submitted, and expires at 30 minutes.
import { beforeEach, describe, expect, it } from "vitest";
import {
  CI_DRAFT_KEY,
  CI_DRAFT_MAX_AGE_MS,
  __setCiDraftImageStoreForTests,
  clearCiDraft,
  saveCiDraft,
  sweepExpiredCiDraftImages,
  takeCiDraft,
  type CiDraftFields,
  type CiDraftImageStore,
} from "./checkImproveDraft";

/** In-memory stand-in for the IndexedDB image half. */
function fakeStore() {
  const rows = new Map<string, { data: string; savedAt: number }>();
  const store: CiDraftImageStore = {
    async put(id, slot, data, savedAt) {
      rows.set(`${id}:${slot}`, { data, savedAt });
    },
    async get(id, slot) {
      return rows.get(`${id}:${slot}`)?.data ?? null;
    },
    async deleteId(id) {
      rows.delete(`${id}:q`);
      rows.delete(`${id}:a`);
    },
    async purgeOlderThan(cutoff) {
      for (const [k, v] of rows) if (v.savedAt < cutoff) rows.delete(k);
    },
  };
  return { store, rows };
}

const CONFIRMED = {
  marks: 3,
  subject: "Maths",
  topicSlug: "triangles",
  topicName: "Triangles",
  marksSource: null,
} as const;
const FIELDS: CiDraftFields = {
  questionTab: "type",
  question: "Prove that the diagonals of a rhombus bisect each other at right angles.",
  qImageMime: "image/jpeg",
  qImageName: "",
  tab: "upload",
  textAnswer: "",
  imageMime: "image/png",
  imageName: "working.png",
  detected: { ...CONFIRMED },
  confirmed: { ...CONFIRMED },
};
const T0 = 1_800_000_000_000;

let rows: ReturnType<typeof fakeStore>["rows"];
beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
  const f = fakeStore();
  rows = f.rows;
  __setCiDraftImageStoreForTests(f.store);
});

describe("a Check & Improve draft survives a sign-in round trip in this tab", () => {
  it("restores the question, the confirmed detection AND the answer photo, exactly as left", async () => {
    saveCiDraft(FIELDS, { qImageBase64: null, imageBase64: "QU5TV0VSLVBIT1RP" }, T0);
    await Promise.resolve(); // the image write is fire-and-forget

    const back = await takeCiDraft(T0 + 5 * 60_000); // five minutes later, after sign-up
    expect(back).not.toBeNull();
    expect(back!.fields).toEqual(FIELDS);
    expect(back!.images).toEqual({ qImageBase64: null, imageBase64: "QU5TV0VSLVBIT1RP" });
  });

  it("is one-shot: taking it clears it, so it can never reappear", async () => {
    saveCiDraft(FIELDS, { qImageBase64: null, imageBase64: "AAAA" }, T0);
    await Promise.resolve();
    await takeCiDraft(T0 + 1000);
    expect(window.sessionStorage.getItem(CI_DRAFT_KEY)).toBeNull();
    expect(await takeCiDraft(T0 + 2000)).toBeNull();
    await Promise.resolve();
    expect(rows.size).toBe(0);
  });

  it("EXPIRY: a draft older than 30 minutes is not restored and is cleared", async () => {
    saveCiDraft(FIELDS, { qImageBase64: null, imageBase64: "AAAA" }, T0);
    await Promise.resolve();

    expect(await takeCiDraft(T0 + CI_DRAFT_MAX_AGE_MS + 1)).toBeNull();
    expect(window.sessionStorage.getItem(CI_DRAFT_KEY)).toBeNull();
  });

  it("CONTROL: the same draft at 29 minutes IS restored (the expiry test can fail)", async () => {
    saveCiDraft(FIELDS, { qImageBase64: null, imageBase64: "AAAA" }, T0);
    await Promise.resolve();
    expect(await takeCiDraft(T0 + CI_DRAFT_MAX_AGE_MS - 60_000)).not.toBeNull();
  });

  it("submit clears it (clearCiDraft), photos included", async () => {
    saveCiDraft(FIELDS, { qImageBase64: "UQ==", imageBase64: "QQ==" }, T0);
    await Promise.resolve();
    expect(rows.size).toBe(2);
    clearCiDraft();
    await Promise.resolve();
    expect(window.sessionStorage.getItem(CI_DRAFT_KEY)).toBeNull();
    expect(rows.size).toBe(0);
  });

  it("an empty form is not a draft: saving it clears instead", () => {
    saveCiDraft(FIELDS, { qImageBase64: null, imageBase64: "QQ==" }, T0);
    expect(window.sessionStorage.getItem(CI_DRAFT_KEY)).not.toBeNull();
    saveCiDraft(
      { ...FIELDS, question: "", textAnswer: "", detected: null, confirmed: null },
      { qImageBase64: null, imageBase64: null },
      T0 + 1,
    );
    expect(window.sessionStorage.getItem(CI_DRAFT_KEY)).toBeNull();
  });

  it("a question read from a photo whose photo is gone is NOT restored as confirmed", async () => {
    saveCiDraft(
      { ...FIELDS, questionTab: "upload", question: "" },
      { qImageBase64: "UVVFU1RJT04=", imageBase64: "QQ==" },
      T0,
    );
    await Promise.resolve();
    rows.clear(); // IndexedDB lost the photos
    const back = await takeCiDraft(T0 + 1000);
    expect(back!.images.qImageBase64).toBeNull();
    expect(back!.fields.confirmed).toBeNull();
    expect(back!.fields.detected).toBeNull();
  });

  it("answer content is NEVER written to localStorage", async () => {
    saveCiDraft(FIELDS, { qImageBase64: "UVVFU1RJT04=", imageBase64: "QQ==" }, T0);
    await Promise.resolve();
    expect(window.localStorage.length).toBe(0);
  });

  it("records are purged by age: a stale photo left by a closed tab is removed on the next save", async () => {
    rows.set("old-tab:a", { data: "STALE", savedAt: T0 - CI_DRAFT_MAX_AGE_MS - 1 });
    saveCiDraft(FIELDS, { qImageBase64: null, imageBase64: "QQ==" }, T0);
    await Promise.resolve();
    await Promise.resolve();
    expect(rows.has("old-tab:a")).toBe(false);
  });

  it("★ SWEEP ON LOAD: a photo left by a tab that died is deleted once it has expired — and a live one is kept", async () => {
    rows.set("dead-tab:a", { data: "ORPHAN", savedAt: T0 - CI_DRAFT_MAX_AGE_MS - 1 });
    rows.set("live-tab:a", { data: "LIVE", savedAt: T0 - 60_000 });
    await sweepExpiredCiDraftImages(T0);
    expect(rows.has("dead-tab:a")).toBe(false);
    expect(rows.has("live-tab:a")).toBe(true);
  });

  it("a photo in a long editing session is re-stamped, so the age sweep cannot delete a live draft's photo", async () => {
    saveCiDraft(FIELDS, { qImageBase64: null, imageBase64: "QQ==" }, T0);
    await Promise.resolve();
    const id = JSON.parse(window.sessionStorage.getItem(CI_DRAFT_KEY)!).id as string;
    // 25 minutes of editing later the same photo is saved again: its record must be re-stamped.
    saveCiDraft(FIELDS, { qImageBase64: null, imageBase64: "QQ==" }, T0 + 25 * 60_000);
    await Promise.resolve();
    await Promise.resolve();
    expect(rows.get(`${id}:a`)!.savedAt).toBe(T0 + 25 * 60_000);
    // 35 minutes in, the original write would be past the window; the re-stamped record is not.
    await sweepExpiredCiDraftImages(T0 + 35 * 60_000);
    expect(rows.has(`${id}:a`)).toBe(true);
  });
});
