import { describe, it, expect, afterEach, vi } from "vitest";
import { setMatchMediaMatches } from "../../test/setup";
import { BRIEF_POSE_IDS, EMO, POSES, POSES_BY_KIND, PAL, Rig, __rigLoopStateForTests, makeSeq, type CharacterKind } from "./rig";
import { GLYPH_CHARS, glyphRun } from "./rigGlyphs";

/** RIG-2 — the full cast in the rig: every prototype pose, Mummy, props, peek, the sack's number. */

const KINDS: CharacterKind[] = ["byte", "ziggy", "mummy"];
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

/** The 31 IDs from the designer brief (Byte 12, Ziggy 13, Mummy 6), verbatim. */
const BRIEF_IDS = [
  "byte_idle", "byte_wave", "byte_point", "byte_explain", "byte_think", "byte_cool", "byte_wink", "byte_cheer",
  "byte_teacher", "byte_peek", "byte_stretch", "byte_melt",
  "ziggy_idle", "ziggy_happy", "ziggy_excited", "ziggy_determined", "ziggy_oops", "ziggy_confused", "ziggy_nervous",
  "ziggy_hide", "ziggy_sad", "ziggy_drippy", "ziggy_detective", "ziggy_bag", "ziggy_sleepy",
  "mummy_worried", "mummy_surprised", "mummy_relieved", "mummy_proud", "mummy_stern", "mummy_laugh",
];

describe("RIG-2 · the cast sheet", () => {
  it("every Pose has an EMO entry, and every kind's poses are drawable", () => {
    for (const p of POSES) expect(EMO[p], p).toBeDefined();
    expect(Object.keys(EMO).sort()).toEqual([...POSES].sort());
    const used = new Set<string>();
    for (const k of KINDS) {
      for (const p of POSES_BY_KIND[k]) {
        expect(EMO[p], `${k}/${p}`).toBeDefined();
        used.add(p);
      }
    }
    for (const p of POSES) expect(used.has(p), `pose ${p} belongs to no kind`).toBe(true);
  });

  it("BRIEF_POSE_IDS covers all 31 brief IDs (12 / 13 / 6) and maps each to a real pose of its kind", () => {
    expect(Object.keys(BRIEF_POSE_IDS).sort()).toEqual([...BRIEF_IDS].sort());
    expect(BRIEF_IDS).toHaveLength(31);
    const per = { byte: 0, ziggy: 0, mummy: 0 };
    for (const [id, v] of Object.entries(BRIEF_POSE_IDS)) {
      expect(id.startsWith(`${v.kind}_`), id).toBe(true);
      expect(POSES_BY_KIND[v.kind]).toContain(v.pose);
      per[v.kind] += 1;
    }
    expect(per).toEqual({ byte: 12, ziggy: 13, mummy: 6 });
  });

  it("Mummy uses the brief's colours", () => {
    expect(PAL.mummy).toMatchObject({ fill: "#b0de5c", shade: "#92c444", line: "#1b2433", hi: "#e6f7c2", blush: "#f5ada6" });
  });
});

describe("RIG-2 · drawing", () => {
  it("★ no <text> anywhere: every pose × every kind, still and mid-animation", () => {
    for (const kind of KINDS) {
      const still = new Rig(host(), kind, "idle", { still: true, bagLabel: 12 });
      const live = new Rig(host(), kind, "idle", { bagLabel: 345 });
      rigs.push(still, live);
      for (const pose of POSES) {
        still.set(pose);
        live.set(pose);
        live.frame(1000);
        live.frame(1700);
        for (const r of [still, live]) {
          const html = r.svg.outerHTML;
          expect(html, `${kind}/${pose}`).not.toMatch(/<text/i);
          expect(html).not.toMatch(/style=/i);
          expect(r.svg.querySelector("text")).toBeNull();
          expect(r.svg.getAttribute("data-pose")).toBe(pose);
        }
      }
    }
  });

  it("Mummy draws her own parts: braid, glasses, bindi, saree, bangles", () => {
    const r = new Rig(host(), "mummy", "worried", { still: true });
    rigs.push(r);
    expect(r.svg.querySelector(".lt-gr-braid ellipse")).not.toBeNull();
    expect(r.svg.querySelectorAll(".lt-gr-glasses circle")).toHaveLength(2);
    expect(r.svg.querySelector(".lt-gr-bindi")).not.toBeNull();
    expect(r.svg.querySelector(".lt-gr-saree")?.getAttribute("d")).toMatch(/^M/);
    expect(r.svg.querySelectorAll(".lt-gr-bangle")).toHaveLength(2);
    const b = new Rig(host(), "byte", "worried", { still: true });
    rigs.push(b);
    expect(b.svg.querySelector(".lt-gr-braid, .lt-gr-glasses, .lt-gr-bindi, .lt-gr-bangle")).toBeNull();
  });

  it("★ setBagLabel(12) draws two digit paths; the number is never baked in", () => {
    const r = new Rig(host(), "ziggy", "bag", { still: true });
    rigs.push(r);
    expect(r.svg.querySelector(".lt-gr-bag")).not.toBeNull();
    expect(r.svg.querySelectorAll(".lt-gr-bagn path")).toHaveLength(0); // empty slot by default
    r.setBagLabel(12);
    const digits = r.svg.querySelectorAll(".lt-gr-bagn path.lt-gr-dg");
    expect(digits).toHaveLength(2);
    expect(digits[0].getAttribute("d")).not.toBe(digits[1].getAttribute("d"));
    r.setBagLabel(7);
    expect(r.svg.querySelectorAll(".lt-gr-bagn path")).toHaveLength(1);
    // The label survives a pose change away and back.
    r.set("happy");
    expect(r.svg.querySelector(".lt-gr-bag")).toBeNull();
    r.set("bag");
    expect(r.svg.querySelectorAll(".lt-gr-bagn path")).toHaveLength(1);
    r.setBagLabel(-3);
    expect(r.svg.querySelectorAll(".lt-gr-bagn path")).toHaveLength(0);
    r.setBagLabel(Number.NaN);
    expect(r.svg.querySelectorAll(".lt-gr-bagn path")).toHaveLength(0);
  });

  it("peek: the viewBox crops to the top of the body, an in-SVG clip holds the edge, and it undoes", () => {
    const r = new Rig(host(), "byte", "idle", { still: true });
    rigs.push(r);
    const full = r.svg.getAttribute("viewBox");
    r.set("peek");
    const vb = (r.svg.getAttribute("viewBox") ?? "").split(" ").map(Number);
    const fullH = Number((full ?? "").split(" ")[3]);
    expect(vb[3]).toBeLessThan(fullH * 0.6);
    expect(vb[1] + vb[3]).toBeLessThan(0); // the bottom edge is above the ground line
    expect(r.svg.getAttribute("data-peek")).toBe("true");
    expect(r.svg.querySelector("g[clip-path*='p)']")).not.toBeNull();
    r.set("idle");
    expect(r.svg.getAttribute("viewBox")).toBe(full);
    expect(r.svg.hasAttribute("data-peek")).toBe(false);
  });

  it("glyphs: every needed character exists and a run is one path per glyph", () => {
    for (const ch of "0123456789?zsGUIDECBSPYQNRTMAK") expect(GLYPH_CHARS, ch).toContain(ch);
    expect(glyphRun("CBSE 10", 0, 10, 7)).toHaveLength(6);
    for (const d of glyphRun("PYQs", 0, 10, 7)) expect(d).toMatch(/^M[\d.\- ]/);
  });
});

describe("RIG-2 · GUIDE-1 invariants hold for the full cast", () => {
  it("★ reduced motion → Mummy is a still pose that never joins the loop", () => {
    setMatchMediaMatches(true);
    const raf = vi.spyOn(window, "requestAnimationFrame");
    const r = new Rig(host(), "mummy", "mproud");
    rigs.push(r);
    expect(r.still).toBe(true);
    expect(r.svg.getAttribute("class")).toContain("lt-gr-still");
    expect(__rigLoopStateForTests()).toEqual({ rigs: 0, running: false });
    r.set("laugh");
    r.set("melted");
    expect(raf).not.toHaveBeenCalled();
    expect(__rigLoopStateForTests()).toEqual({ rigs: 0, running: false });
  });

  it("★ three kinds mounted → still ONE shared loop (one frame request)", () => {
    const raf = vi.spyOn(window, "requestAnimationFrame");
    const a = new Rig(host(), "byte", "peek");
    const b = new Rig(host(), "ziggy", "melted");
    const c = new Rig(host(), "mummy", "laugh");
    rigs.push(a, b, c);
    expect(__rigLoopStateForTests()).toEqual({ rigs: 3, running: true });
    expect(raf).toHaveBeenCalledTimes(1);
  });

  it("★ off-screen pause holds for a peeking Byte and Mummy: loop stops, resumes when either returns", () => {
    let cb: IntersectionObserverCallback | null = null;
    class FakeIO {
      constructor(c: IntersectionObserverCallback) {
        cb = c;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    }
    vi.stubGlobal("IntersectionObserver", FakeIO);
    const a = new Rig(host(), "byte", "peek");
    const m = new Rig(host(), "mummy", "worried");
    rigs.push(a, m);
    expect(__rigLoopStateForTests()).toEqual({ rigs: 2, running: true });
    const entry = (t: Element, on: boolean) => ({ target: t, isIntersecting: on }) as unknown as IntersectionObserverEntry;
    cb!([entry(a.svg, false), entry(m.svg, false)], {} as IntersectionObserver);
    expect(__rigLoopStateForTests().running).toBe(false);
    cb!([entry(m.svg, true)], {} as IntersectionObserver);
    expect(__rigLoopStateForTests().running).toBe(true);
    while (rigs.length) rigs.pop()!.destroy();
    vi.unstubAllGlobals();
    expect(__rigLoopStateForTests()).toEqual({ rigs: 0, running: false });
  });

  it("LCG determinism; no Math.random across every pose and kind", () => {
    const spy = vi.spyOn(Math, "random");
    const s1 = makeSeq(7);
    const s2 = makeSeq(7);
    expect([s1(), s1(), s1(), s1()]).toEqual([s2(), s2(), s2(), s2()]);
    for (const kind of KINDS) {
      const r = new Rig(host(), kind, "idle");
      rigs.push(r);
      for (const pose of POSES) {
        r.set(pose);
        for (let t = 0; t < 6; t += 1) r.frame(1000 + t * 120);
      }
    }
    expect(spy).not.toHaveBeenCalled();
  });
});
