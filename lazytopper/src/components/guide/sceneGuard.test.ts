/**
 * COMPANION-1 — the ONE shared scene guard (owner ruling 23 Oct 16:40): at most one two-character
 * scene per app session, never during a question or a test, never below 360 px; an admin preview
 * relaxes only the once-per-session rule. Every lane that draws Byte and Ziggy together uses it.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { setMatchMediaMatches } from "../../test/setup";
import { SCENE_SESSION_KEY, __resetSceneGuardForTests, canShowScene, markSceneShown, sceneFits, sceneShownThisSession } from "./sceneGuard";
import { GUIDE_PREVIEW_KEY } from "./guideVariant";
import { STUDENT_DATA_MAP } from "../../services/studentDataMap";

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  __resetSceneGuardForTests();
  setMatchMediaMatches(false);
});
afterEach(() => setMatchMediaMatches(false));

describe("sceneGuard", () => {
  it("★ one scene per app session: allowed, then spent", () => {
    expect(canShowScene()).toBe(true);
    markSceneShown("comfort");
    expect(canShowScene()).toBe(false);
    expect(sceneShownThisSession()).toBe("comfort");
    expect(window.sessionStorage.getItem(SCENE_SESSION_KEY)).toBe("comfort");
    // a reload in the same tab still remembers it; a NEW session (new tab) does not
    __resetSceneGuardForTests();
    expect(canShowScene()).toBe(false);
    window.sessionStorage.clear();
    expect(canShowScene()).toBe(true);
  });

  it("★ never during a question or a test", () => {
    expect(canShowScene({ busy: true })).toBe(false);
    expect(canShowScene({ busy: false })).toBe(true);
  });

  it("★ below 360 px wide → solo poses only (359 out, 360 in)", () => {
    setMatchMediaMatches((q) => /max-width: 359\.98px/.test(q));
    expect(sceneFits()).toBe(false);
    expect(canShowScene()).toBe(false);
    setMatchMediaMatches(false);
    expect(sceneFits()).toBe(true);
  });

  it("an admin preview may replay a scene and writes no marker", () => {
    window.localStorage.setItem(GUIDE_PREVIEW_KEY, JSON.stringify({ arm: "guide", until: Date.now() + 60_000 }));
    markSceneShown("highfive");
    expect(window.sessionStorage.getItem(SCENE_SESSION_KEY)).toBeNull();
    expect(canShowScene()).toBe(true);
    expect(canShowScene({ busy: true })).toBe(false);
  });

  it("the session key is registered in studentDataMap", () => {
    const local = STUDENT_DATA_MAP.find((l) => l.id === "local-storage")!;
    expect(local.holds).toContain("`lazytopper.guideScene`");
    expect(local.holds).toContain("`lazytopper.companion.<tag>`");
    expect(local.holds).toContain("`lazytopper.companionSession`");
  });
});
