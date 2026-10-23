/**
 * COMPANION-1 — every new pose renders in the RIG-2 style: drawn for its own character, paths only
 * (no <text>, no inline style), still under reduced motion, no Math.random; byte_breathe really
 * grows for 4 s and shrinks for 4 s; the duet halves exist; the festival props ride on any pose.
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { setMatchMediaMatches } from "../../../test/setup";
import { BREATHE_CYCLE_MS, BREATHE_IN_MS, BRIEF_POSE_IDS, COMPANION_POSE_IDS, DUET_SCENES, EMO, POSES_BY_KIND, Rig, __rigLoopStateForTests } from "../rig";
import { FESTIVAL_PROPS } from "../rigProps";

const rigs: Rig[] = [];
const host = () => {
  const d = document.createElement("div");
  document.body.appendChild(d);
  return d;
};
afterEach(() => {
  while (rigs.length) rigs.pop()!.destroy();
  setMatchMediaMatches(false);
  vi.restoreAllMocks();
});

const COMPANION_IDS = [
  "byte_comfort", "byte_breathe", "byte_calendar", "byte_moon", "byte_care", "byte_highfive",
  "ziggy_highfive", "ziggy_relieved", "ziggy_proud_badge", "ziggy_study", "ziggy_streak",
  // owner ruling 23 Oct 16:40 — exported for MOMENTS-3
  "byte_marking", "byte_sorry", "ziggy_aha", "ziggy_examday", "ziggy_sleepy",
];

describe("COMPANION-1 · the new poses", () => {
  it("★ every companion pose ID maps to a real pose of its own character (the brief's 31 untouched)", () => {
    expect(Object.keys(COMPANION_POSE_IDS).sort()).toEqual([...COMPANION_IDS].sort());
    for (const [id, v] of Object.entries(COMPANION_POSE_IDS)) {
      expect(id.startsWith(`${v.kind}_`), id).toBe(true);
      expect(EMO[v.pose], id).toBeDefined();
      expect(POSES_BY_KIND[v.kind], id).toContain(v.pose);
    }
    expect(Object.keys(BRIEF_POSE_IDS)).toHaveLength(31);
    expect(BRIEF_POSE_IDS.ziggy_sleepy.pose).toBe("sleepy");
  });

  it("★ each renders: paths only, no <text>, no inline style, still and mid-animation", () => {
    for (const [id, { kind, pose }] of Object.entries(COMPANION_POSE_IDS)) {
      const still = new Rig(host(), kind, pose, { still: true });
      const live = new Rig(host(), kind, pose);
      rigs.push(still, live);
      live.frame(1000);
      live.frame(2600);
      for (const r of [still, live]) {
        const html = r.svg.outerHTML;
        expect(html, id).not.toMatch(/<text/i);
        expect(html, id).not.toMatch(/style=/i);
        expect(r.svg.getAttribute("data-pose")).toBe(pose);
        expect(r.svg.getAttribute("data-kind")).toBe(kind);
      }
    }
  });

  it("Byte wears NO sunglasses in any companion pose; the props are where the brief says", () => {
    for (const { kind, pose } of Object.values(COMPANION_POSE_IDS)) {
      if (kind !== "byte") continue;
      const r = new Rig(host(), "byte", pose, { still: true });
      rigs.push(r);
      expect(r.svg.querySelector(".lt-gr-shades"), pose).toBeNull();
    }
    const has = (kind: "byte" | "ziggy", pose: keyof typeof EMO, sel: string) => {
      const r = new Rig(host(), kind, pose, { still: true });
      rigs.push(r);
      return r.svg.querySelector(sel) !== null;
    };
    expect(has("byte", "calendar", ".lt-gr-calendar")).toBe(true);
    expect(has("byte", "moon", ".lt-gr-moon")).toBe(true);
    expect(has("ziggy", "badge", ".lt-gr-badge")).toBe(true);
    expect(has("ziggy", "study", ".lt-gr-book")).toBe(true);
    expect(has("ziggy", "study", ".lt-gr-pen")).toBe(true);
    expect(has("ziggy", "streak", ".lt-gr-flick")).toBe(true);
    expect(has("byte", "marking", ".lt-gr-sheet")).toBe(true);
    expect(has("byte", "marking", ".lt-gr-tick")).toBe(true);
    expect(has("ziggy", "examday", ".lt-gr-admit")).toBe(true);
    expect(has("ziggy", "aha", ".lt-gr-glow")).toBe(true);
  });

  it("★ byte_breathe: the body grows for 4 s and shrinks for 4 s", () => {
    expect(BREATHE_IN_MS).toBe(4000);
    expect(BREATHE_CYCLE_MS).toBe(8000);
    const r = new Rig(host(), "byte", "breathe", { still: false });
    rigs.push(r);
    const scaleY = () => Number(/scale\([\d.]+,([\d.]+)\)/.exec(r.svg.querySelector("g > g")!.getAttribute("transform") ?? "")?.[1]);
    // run the springs to rest at each phase (the rig eases toward its target)
    const at = (ms: number) => {
      for (let i = 0; i < 40; i += 1) r.frame(ms - 400 + i * 10);
      return scaleY();
    };
    const empty = at(BREATHE_CYCLE_MS * 10);
    const full = at(BREATHE_CYCLE_MS * 10 + BREATHE_IN_MS);
    const emptyAgain = at(BREATHE_CYCLE_MS * 11);
    expect(full).toBeGreaterThan(empty + 0.05);
    expect(Math.abs(emptyAgain - empty)).toBeLessThan(0.03);
  });

  it("★ reduced motion → every companion pose is a still frame that never joins the loop", () => {
    setMatchMediaMatches(true);
    const raf = vi.spyOn(window, "requestAnimationFrame");
    for (const { kind, pose } of Object.values(COMPANION_POSE_IDS)) {
      const r = new Rig(host(), kind, pose);
      rigs.push(r);
      expect(r.still).toBe(true);
    }
    expect(__rigLoopStateForTests()).toEqual({ rigs: 0, running: false });
    expect(raf).not.toHaveBeenCalled();
  });

  it("no Math.random across every companion pose", () => {
    const spy = vi.spyOn(Math, "random");
    for (const { kind, pose } of Object.values(COMPANION_POSE_IDS)) {
      const r = new Rig(host(), kind, pose);
      rigs.push(r);
      for (let t = 0; t < 6; t += 1) r.frame(1000 + t * 150);
    }
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("COMPANION-1 · duet halves and festival props", () => {
  it("every duet scene is Byte (left) + Ziggy (right) poses that exist for each", () => {
    for (const [name, s] of Object.entries(DUET_SCENES)) {
      expect(POSES_BY_KIND.byte, name).toContain(s.byte);
      for (const z of s.ziggy) expect(POSES_BY_KIND.ziggy, name).toContain(z);
    }
    expect(DUET_SCENES.comfort.ziggy).toEqual(["down", "relieved"]);
    expect(EMO.comfortDuet.arms.r).toBe("shoulder");
    // the high five: Byte's hand toward Ziggy (his right), Ziggy's toward Byte (his left)
    expect(EMO.highfiveDuetL.arms.r).toBe("hi5");
    expect(EMO.highfiveDuetR.arms.l).toBe("hi5");
  });

  it("★ the diya and rangoli ride on ANY pose (paths only) and come off again", () => {
    expect(FESTIVAL_PROPS).toEqual(["diya", "rangoli"]);
    const r = new Rig(host(), "ziggy", "happy", { still: true, extraProps: FESTIVAL_PROPS });
    rigs.push(r);
    expect(r.svg.querySelector(".lt-gr-diya")).not.toBeNull();
    expect(r.svg.querySelector(".lt-gr-rangoli")).not.toBeNull();
    expect(r.svg.outerHTML).not.toMatch(/<text/i);
    r.set("cheer");
    expect(r.svg.querySelector(".lt-gr-diya")).not.toBeNull(); // kept across a pose change
    r.setExtraProps([]);
    expect(r.svg.querySelector(".lt-gr-diya")).toBeNull();
    const b = new Rig(host(), "byte", "hello", { still: true });
    rigs.push(b);
    expect(b.svg.querySelector(".lt-gr-diya, .lt-gr-rangoli")).toBeNull();
  });
});
