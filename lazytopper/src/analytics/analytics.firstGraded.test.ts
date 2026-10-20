// MEASURE-1 B — `first_graded`: once per account, payload `{ surface }` only, wired at every
// graded surface's persist seam.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

vi.mock("../services/firebaseClient", () => ({ firestoreDb: null, authClient: null }));

import { trackFirstGraded, type FirstGradedSurface } from "./analytics";
import { FIRST_GRADED_KEY_PREFIX, __resetFirstGradedForTests, firstGradedKey, noteFirstGraded } from "./firstGraded";
import { persistCheckImproveSession, singleCheckToWorksheetResponse } from "../services/checkImproveGradeService";
import { ACTIVITY_EVENTS } from "../services/activityClient";
import type { CheckSolutionResponse, WorksheetGradeResponse } from "../ai/aiClient";

const originalLocation = window.location;
let sent: Array<{ kind: string; payload: Record<string, unknown> }>;
const firsts = () => sent.filter((s) => s.payload.name === "first_graded");

const SIX: FirstGradedSurface[] = [
  "check_improve_single",
  "check_improve_multi",
  "worksheet",
  "chapter_test",
  "full_mock",
  "quick_practice",
];

beforeEach(() => {
  sent = [];
  window.localStorage.clear();
  __resetFirstGradedForTests();
  (window as unknown as { va?: unknown }).va = (kind: string, payload: Record<string, unknown>) => {
    sent.push({ kind, payload });
  };
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: { ...originalLocation, hostname: "www.lazytopper.com", pathname: "/check-improve", href: "https://www.lazytopper.com/check-improve" },
  });
  Object.defineProperty(window.navigator, "webdriver", { configurable: true, value: false });
});
afterEach(() => {
  delete (window as unknown as { va?: unknown }).va;
  Object.defineProperty(window, "location", { configurable: true, writable: true, value: originalLocation });
  window.localStorage.clear();
});

const graded = (id: string) => ({ id, status: "graded" as const });

describe("noteFirstGraded — once per account", () => {
  it.each(SIX)("fires once for a first %s result, payload `{ surface }` only", (surface) => {
    noteFirstGraded("uid-abc", graded("r1"), surface);
    noteFirstGraded("uid-abc", graded("r2"), surface);
    expect(firsts()).toEqual([{ kind: "event", payload: { name: "first_graded", data: { surface } } }]);
  });

  it("NOT again after a reload (in-memory forgotten, the device marker remains)", () => {
    noteFirstGraded("uid-abc", graded("r1"), "worksheet");
    __resetFirstGradedForTests(); // a reload
    noteFirstGraded("uid-abc", graded("r2"), "quick_practice");
    expect(firsts()).toHaveLength(1);
  });

  it("CONTROL: a DIFFERENT account on the same device fires its own once", () => {
    noteFirstGraded("uid-abc", graded("r1"), "worksheet");
    noteFirstGraded("uid-xyz", graded("r9"), "full_mock");
    expect(firsts().map((s) => (s.payload.data as { surface: string }).surface)).toEqual(["worksheet", "full_mock"]);
  });

  it("the device marker is a hash, never the uid; it holds only '1'", () => {
    noteFirstGraded("uid-abc", graded("r1"), "worksheet");
    const keys = Object.keys(window.localStorage).filter((k) => k.startsWith(FIRST_GRADED_KEY_PREFIX));
    expect(keys).toEqual([firstGradedKey("uid-abc")]);
    expect(keys[0]).not.toContain("uid-abc");
    expect(window.localStorage.getItem(keys[0])).toBe("1");
    expect(JSON.stringify(sent)).not.toContain("uid-abc");
  });

  it("a pending-upload record (nothing graded) never counts; a partial one does", () => {
    noteFirstGraded("uid-abc", { id: "dl", status: "pending-upload" }, "worksheet");
    expect(firsts()).toHaveLength(0);
    noteFirstGraded("uid-abc", { id: "ct", status: "partial" }, "chapter_test");
    expect(firsts()).toHaveLength(1);
  });

  it("an account that ALREADY has another graded record on this device is not new: nothing sent, ever", () => {
    window.localStorage.setItem(
      "lazytopper.user.uid-old.sessionRecords.v1",
      JSON.stringify([{ id: "old-1", surface: "worksheet", status: "graded", topicKeys: [], questionIds: [], gradedAt: 1 }]),
    );
    noteFirstGraded("uid-old", graded("new-1"), "quick_practice");
    noteFirstGraded("uid-old", graded("new-2"), "quick_practice");
    expect(firsts()).toHaveLength(0);
  });

  it("signed out / anonymous / no record sends nothing", () => {
    noteFirstGraded(null, graded("r1"), "worksheet");
    noteFirstGraded("anonymous", graded("r1"), "worksheet");
    noteFirstGraded("uid-abc", null, "worksheet");
    expect(firsts()).toHaveLength(0);
  });

  it("an unknown surface is dropped by trackFirstGraded; the name is not in the first-party allow-list", () => {
    trackFirstGraded("tutor" as FirstGradedSurface);
    expect(firsts()).toHaveLength(0);
    expect(ACTIVITY_EVENTS as readonly string[]).not.toContain("first_graded");
  });
});

describe("persistCheckImproveSession — the C&I seam labels its path", () => {
  const USER = { uid: "uid-ci", isLocalSession: false } as never;
  const csr = {
    ok: true,
    totalMarks: 3,
    marksAwarded: 2,
    percentage: 67,
    annotatedSteps: [],
    mistakeSummary: { conceptual: 1, calculation: 0, silly: 0, presentation: 0 },
    teacherNote: "",
  } as unknown as CheckSolutionResponse;
  const base = { user: USER, code: "CI-M-X-01", title: "t", subject: "maths" as const, topicSlug: "x", topicSource: "inferred" as const };
  // The record builder stamps gradedAt: a pinned fake clock keeps this file clock-independent.
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-20T06:00:00Z") });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("single path -> check_improve_single, once", () => {
    const response = singleCheckToWorksheetResponse(csr);
    expect(persistCheckImproveSession({ ...base, response, path: "single" })).toBe("recorded");
    expect(firsts().map((s) => s.payload.data)).toEqual([{ surface: "check_improve_single" }]);
  });

  it("multi path -> check_improve_multi (even for a one-question paper)", () => {
    const response = singleCheckToWorksheetResponse(csr);
    persistCheckImproveSession({ ...base, user: { uid: "uid-ci2", isLocalSession: false } as never, response, path: "multi" });
    expect(firsts().map((s) => s.payload.data)).toEqual([{ surface: "check_improve_multi" }]);
  });

  it("nothing graded -> no record and no first_graded", () => {
    const response = { ...singleCheckToWorksheetResponse(csr), gradedCount: 0 } as WorksheetGradeResponse;
    expect(persistCheckImproveSession({ ...base, response, path: "single" })).toBe("skipped-nothing-graded");
    expect(firsts()).toHaveLength(0);
  });
});

describe("wiring — every graded surface's persist seam reports, with its own surface", () => {
  const read = (p: string) => readFileSync(resolve(__dirname, "..", p), "utf-8");
  it.each([
    ["services/worksheetGradeService.ts", "worksheet", 1],
    ["services/chapterTestGradeService.ts", "chapter_test", 2],
    ["services/fullMockGradeService.ts", "full_mock", 2],
    ["services/quickPracticeSessionService.ts", "quick_practice", 1],
  ] as const)("%s: each writeSessionRecord is followed by noteFirstGraded(..., %s)", (file, surface, n) => {
    const src = read(file);
    const re = new RegExp(`writeSessionRecord\\(user, (\\w+)\\);\\s*noteFirstGraded\\(uid, \\1, "${surface}"\\);`, "g");
    expect(src.match(/writeSessionRecord\(/g)?.length).toBe(n);
    expect(src.match(re)?.length).toBe(n);
  });

  it("C&I: both page paths and both free-check replay paths name their path", () => {
    const page = read("pages/desktop/DesktopCheckImprovePage.tsx");
    expect(page.match(/path: "multi", \/\/ MEASURE-1 B/g)?.length).toBe(1);
    expect(page.match(/path: "single", \/\/ MEASURE-1 B/g)?.length).toBe(1);
    const replay = read("services/freeCheckReplay.ts");
    expect(replay.match(/path: "multi", \/\/ MEASURE-1 B/g)?.length).toBe(1);
    expect(replay.match(/path: "single", \/\/ MEASURE-1 B/g)?.length).toBe(1);
  });
});
