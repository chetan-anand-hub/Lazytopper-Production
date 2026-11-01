// TUTOR-STICKY-1 — the six events are on every allow-list, and carry only coarse slugs.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const NAMES = [
  "tutor_daily_fix_shown",
  "tutor_daily_fix_tap",
  "tutor_check_shown",
  "tutor_check_correct",
  "trial_summary_shown",
  "trial_summary_tap",
] as const;

const here = path.dirname(fileURLToPath(import.meta.url));

describe("TUTOR-STICKY-1 allow-lists", () => {
  it("every name is in the client list, the server list and the admin labels", async () => {
    const { ACTIVITY_EVENTS } = await import("../services/activityClient");
    const server = readFileSync(path.resolve(here, "../../server/routes/studentActivity.cjs"), "utf8");
    const labels = readFileSync(path.resolve(here, "../pages/admin/activityDetailModel.ts"), "utf8");
    for (const n of NAMES) {
      expect(ACTIVITY_EVENTS).toContain(n);
      expect(server).toContain(`'${n}'`);
      expect(labels).toContain(`${n}:`);
    }
  });
});

describe("trackTutorSticky", () => {
  const hit = vi.fn();
  beforeEach(() => {
    sessionStorage.clear();
    hit.mockClear();
    (window as unknown as { va?: unknown }).va = hit;
  });
  afterEach(() => {
    delete (window as unknown as { va?: unknown }).va;
  });

  it("a once-key sends a 'shown' event at most once per tab per key", async () => {
    const { trackTutorSticky } = await import("./analytics");
    const spy = vi.spyOn(sessionStorage.__proto__, "setItem");
    trackTutorSticky("tutor_daily_fix_shown", { surface: "home" }, "2026-11-03");
    trackTutorSticky("tutor_daily_fix_shown", { surface: "home" }, "2026-11-03");
    const writes = spy.mock.calls.filter(([k]) => String(k).startsWith("lazytopper.tutorSticky.tutor_daily_fix_shown.home"));
    expect(writes).toHaveLength(1);
    spy.mockRestore();
  });

  it("never throws, even with storage blocked", async () => {
    const { trackTutorSticky } = await import("./analytics");
    const spy = vi.spyOn(sessionStorage.__proto__, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => trackTutorSticky("trial_summary_shown", { surface: "tutor" }, "d")).not.toThrow();
    spy.mockRestore();
  });
});
