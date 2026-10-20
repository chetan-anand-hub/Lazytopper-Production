/**
 * GUIDE-1 — the blob rig: a TypeScript port of the owner-approved prototype (guide/v2.html,
 * 20 Oct 2026) for Byte (the guide) and Ziggy (the student). Mummy is NOT in this lane.
 *
 * WHAT IT IS. One SVG per character, built once; every frame only rewrites attributes (the body
 * path, the face transform, the arms). The body is a smooth bezier blob (dome, flared sides,
 * scalloped hem); eyes / brows / mouth / props are separate parts, so one drawing can wave,
 * point, think, cheer, jump with confetti or melt and bounce back.
 *
 * ★ ONE LOOP FOR EVERY CHARACTER. All mounted rigs share ONE requestAnimationFrame loop. It runs
 * only while the tab is visible AND at least one rig is on screen (IntersectionObserver); with
 * none, no frame is requested at all. `prefers-reduced-motion: reduce` → a still pose: the rig
 * draws one frame and never joins the loop.
 *
 * ★ NO Math.random(). Blink timing and the melt droplets use a small deterministic sequence
 * (an LCG seeded per rig). Nothing here is user data; the rule is kept anyway (CLAUDE.md §7).
 *
 * ★ NO STUDENT DATA IN THE DOM STRINGS. Every innerHTML below is a fixed drawing built from
 * numbers in this file; nothing typed or stored by a student ever reaches it.
 */

export type CharacterKind = "byte" | "ziggy";

/** The poses this lane uses (spec §3A). `idle` is the corner chip's resting pose. */
export type Pose =
  | "hello"
  | "point"
  | "think"
  | "cheer"
  | "idle"
  | "excited"
  | "determined"
  | "sad"
  | "happy";

const NS = "http://www.w3.org/2000/svg";

interface Palette {
  fill: string;
  shade: string;
  line: string;
  hi: string;
  blush: string;
  W: number;
  H: number;
  flare: number;
  lobes: number;
  eye: number;
  drips?: number;
  puddles?: boolean;
}

/** Colours from the Round-1 art pack manifest (byte) and the prototype (ziggy). */
export const PAL: Record<CharacterKind, Palette> = {
  byte: { fill: "#80d0f0", shade: "#5cb7de", line: "#15243a", hi: "#eafaff", blush: "#f5a7b2", W: 54, H: 128, flare: 0.2, lobes: 4, eye: 7.4 },
  ziggy: { fill: "#a7d968", shade: "#86bf48", line: "#1f3818", hi: "#e6f6c9", blush: "#d4ec98", W: 60, H: 122, flare: 0.26, lobes: 4, eye: 7.8, drips: 0.35, puddles: true },
};

type EyeType = "dot" | "wide" | "happy" | "closed" | "none";
type BrowType = "raised" | "worried" | "angry" | "none";
type MouthType = "smile" | "open" | "talk" | "grin" | "flat" | "frown" | "pout" | "o";
type ArmMode = "rest" | "wave" | "up" | "point" | "chin" | "fist" | "droop";
type Motion = "bounce" | "lean" | "tilt" | "jump" | "melt" | "breathe";
type Prop = "bulb" | "sparkle" | "confetti" | "tears";

interface Emotion {
  eyes: [EyeType, EyeType];
  look?: [number, number];
  mouth: MouthType;
  brows?: BrowType;
  arms: { l: ArmMode; r: ArmMode };
  motion: Motion;
  props: Prop[];
}

/** The pose table — the prototype's EMO entries for this lane's eight poses (+ idle). */
export const EMO: Record<Pose, Emotion> = {
  hello: { eyes: ["dot", "dot"], mouth: "open", arms: { l: "rest", r: "wave" }, motion: "bounce", props: [] },
  point: { eyes: ["dot", "dot"], mouth: "smile", arms: { l: "rest", r: "point" }, motion: "lean", props: [] },
  think: { eyes: ["dot", "dot"], look: [2, -3], mouth: "pout", arms: { l: "rest", r: "chin" }, motion: "tilt", props: ["bulb"] },
  cheer: { eyes: ["happy", "happy"], mouth: "grin", arms: { l: "up", r: "up" }, motion: "jump", props: ["sparkle"] },
  idle: { eyes: ["dot", "dot"], mouth: "smile", arms: { l: "rest", r: "rest" }, motion: "breathe", props: [] },
  excited: { eyes: ["wide", "wide"], mouth: "grin", arms: { l: "up", r: "up" }, motion: "jump", props: ["confetti"] },
  determined: { eyes: ["dot", "dot"], mouth: "smile", brows: "angry", arms: { l: "rest", r: "fist" }, motion: "bounce", props: [] },
  sad: { eyes: ["dot", "dot"], look: [0, 2], mouth: "frown", brows: "worried", arms: { l: "droop", r: "droop" }, motion: "melt", props: ["tears"] },
  happy: { eyes: ["dot", "dot"], mouth: "open", arms: { l: "rest", r: "wave" }, motion: "bounce", props: [] },
};

const MOUTH: Record<MouthType, { d: string; fill: boolean; tongue?: boolean }> = {
  smile: { d: "M-9,0 Q0,10 9,0", fill: false },
  open: { d: "M-10,-2 Q0,15 10,-2 Z", fill: true, tongue: true },
  talk: { d: "M-7,-1 Q0,10 7,-1 Z", fill: true },
  grin: { d: "M-13,-3 Q0,19 13,-3 Z", fill: true, tongue: true },
  o: { d: "M0,-5 C5,-5 5,7 0,7 C-5,7 -5,-5 0,-5 Z", fill: true },
  flat: { d: "M-7,2 L7,2", fill: false },
  frown: { d: "M-9,6 Q0,-3 9,6", fill: false },
  pout: { d: "M-5,2 Q0,-2 5,2", fill: false },
};

/* ── helpers ─────────────────────────────────────────────────────────────────────────── */

function f(n: number): number {
  return Math.round(n * 10) / 10;
}
function lerp(a: number, b: number, k: number): number {
  return a + (b - a) * k;
}
function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>, parent?: Element): SVGElementTagNameMap[K] {
  const e = document.createElementNS(NS, tag) as SVGElementTagNameMap[K];
  for (const k of Object.keys(attrs)) e.setAttribute(k, String(attrs[k]));
  if (parent) parent.appendChild(e);
  return e;
}

/** A deterministic pseudo-random sequence in [0, 1) (an LCG). Not user data; no Math.random. */
export function makeSeq(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function eyeSVG(type: EyeType, r: number, L: string): string {
  switch (type) {
    case "wide":
      return `<circle r="${r * 1.45}" fill="#fff" stroke="${L}" stroke-width="2.2"/><g class="pu"><circle r="${r * 0.82}" fill="${L}"/><circle cx="${-r * 0.28}" cy="${-r * 0.32}" r="${r * 0.3}" fill="#fff"/></g>`;
    case "happy":
      return `<path d="M${-r},${r * 0.4} Q0,${-r * 1.4} ${r},${r * 0.4}" fill="none" stroke="${L}" stroke-width="3.6" stroke-linecap="round"/>`;
    case "closed":
      return `<path d="M${-r},0 Q0,${r} ${r},0" fill="none" stroke="${L}" stroke-width="3.4" stroke-linecap="round"/>`;
    case "none":
      return "";
    default:
      return `<g class="pu"><ellipse rx="${r}" ry="${r * 1.18}" fill="${L}"/><circle cx="${-r * 0.32}" cy="${-r * 0.44}" r="${r * 0.36}" fill="#fff"/></g>`;
  }
}

function browSVG(type: BrowType, r: number, side: number, L: string): string {
  if (type === "none") return "";
  const y = -r * 2.1;
  const a = r * 1.1;
  let d: string;
  if (type === "worried") d = `M${-a * side},${y + 3} L${a * side * 0.9},${y - 4}`;
  else if (type === "angry") d = `M${-a * side},${y - 4} L${a * side * 0.9},${y + 3}`;
  else d = `M${-a},${y - 5} Q0,${y - 10} ${a},${y - 5}`;
  return `<path d="${d}" fill="none" stroke="${L}" stroke-width="3.2" stroke-linecap="round"/>`;
}

const CONFETTI = ["#ffd84a", "#ff7aa8", "#7fd2f0", "#2fae74", "#a77bff"];

function propsSVG(list: readonly Prop[], c: Palette, r: number): string {
  let s = "";
  const L = c.line;
  for (const p of list) {
    if (p === "sparkle") {
      const pts: Array<[number, number, string]> = [
        [-c.W * 0.95, -c.H * 0.45, "#ffd84a"],
        [c.W * 0.95, -c.H * 0.55, "#7fd2f0"],
        [c.W * 0.7, -c.H * 0.85, "#ff7aa8"],
      ];
      for (const q of pts) {
        s += `<g transform="translate(${q[0]},${q[1]})"><path class="lt-gr-pr lt-gr-tw" d="M0,-9 L2.5,-2.5 9,0 2.5,2.5 0,9 -2.5,2.5 -9,0 -2.5,-2.5Z" fill="${q[2]}" stroke="${L}" stroke-width="1.3"/></g>`;
      }
    }
    if (p === "tears") {
      for (const sd of [-1, 1]) {
        s += `<path class="lt-gr-pr lt-gr-tear" d="M${sd * c.W * 0.3},${r * 1.4} q4,7 0,9 q-4,-2 0,-9z" fill="#9ad8ff" stroke="${L}" stroke-width="1.2"/>`;
      }
    }
    if (p === "bulb") {
      s += `<g transform="translate(${c.W * 0.15},${-c.H * 0.62})"><g class="lt-gr-pr lt-gr-glow"><path d="M0,-22a12,12 0 0 0-7,21.5V5h14V-.5A12,12 0 0 0 0,-22z" fill="#ffd84a" stroke="${L}" stroke-width="2.2"/><path d="M-6,9h12M-4,13h8" stroke="${L}" stroke-width="2.2" stroke-linecap="round"/><path d="M-17,-24l-5,-4M17,-24l5,-4M0,-30v-6" stroke="#f0b400" stroke-width="2.2" stroke-linecap="round"/></g></g>`;
    }
    if (p === "confetti") {
      for (let k = 0; k < 14; k += 1) {
        const x = -100 + k * 15 + ((k * 37) % 11);
        // The per-piece delay is a CSS class (guide.css lt-gr-cf0..13), never an inline style.
        s += `<rect class="lt-gr-pr lt-gr-cf lt-gr-cf${k}" x="${x}" y="${-c.H - 60}" width="6" height="10" rx="1.5" fill="${CONFETTI[k % 5]}"/>`;
      }
    }
  }
  return s;
}

function armTarget(mode: ArmMode, t: number, side: number): [number, number] {
  const w = Math.sin;
  switch (mode) {
    case "wave":
      return [150 + 24 * w(t * 9), 26];
    case "up":
      return [155 + 14 * w(t * 8 + side), 25];
    case "point":
      return [96, 38];
    case "chin":
      return [-142, 30];
    case "fist":
      return [160 + 6 * w(t * 6), 24];
    case "droop":
      return [8, 22];
    default:
      return [18 + 3 * w(t * 2.2 + side), 24];
  }
}

/* ── the shared loop ─────────────────────────────────────────────────────────────────── */

const RIGS = new Set<Rig>();
let rafId: number | null = null;
let pointer: [number, number] | null = null;
let listening = false;
let io: IntersectionObserver | null = null;
const onScreen = new WeakMap<Element, boolean>();

/** Test seam: how many rigs are in the shared loop, and whether a frame is requested. */
export function __rigLoopStateForTests(): { rigs: number; running: boolean } {
  return { rigs: RIGS.size, running: rafId !== null };
}

function docHidden(): boolean {
  return typeof document !== "undefined" && document.visibilityState === "hidden";
}

function anyVisibleRig(): boolean {
  for (const r of RIGS) if (onScreen.get(r.svg) !== false) return true;
  return false;
}

function tick(now: number): void {
  rafId = null;
  if (docHidden() || !anyVisibleRig()) return; // paused: no frame requested
  for (const r of RIGS) if (onScreen.get(r.svg) !== false) r.frame(now);
  schedule();
}

function schedule(): void {
  if (rafId !== null || typeof requestAnimationFrame !== "function") return;
  if (docHidden() || RIGS.size === 0 || !anyVisibleRig()) return;
  rafId = requestAnimationFrame(tick);
}

function stopLoop(): void {
  if (rafId !== null && typeof cancelAnimationFrame === "function") cancelAnimationFrame(rafId);
  rafId = null;
}

function onVisibility(): void {
  if (docHidden()) stopLoop();
  else schedule();
}

function onPointer(e: PointerEvent): void {
  pointer = [e.clientX, e.clientY];
}

function ensureListeners(): void {
  if (listening || typeof window === "undefined") return;
  listening = true;
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pointermove", onPointer, { passive: true });
  if (typeof IntersectionObserver === "function") {
    io = new IntersectionObserver((entries) => {
      for (const e of entries) onScreen.set(e.target, e.isIntersecting);
      if (anyVisibleRig()) schedule();
      else stopLoop();
    });
  }
}

function dropListenersIfIdle(): void {
  if (RIGS.size > 0 || !listening) return;
  listening = false;
  document.removeEventListener("visibilitychange", onVisibility);
  window.removeEventListener("pointermove", onPointer);
  io?.disconnect();
  io = null;
  stopLoop();
}

export function prefersReducedMotion(): boolean {
  try {
    return typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

let rigSeq = 0;

interface Arm {
  g: SVGGElement;
  p: SVGPathElement;
  a: number;
  len: number;
  front: boolean;
}

/**
 * One character. `host` receives the SVG; `destroy()` removes it and leaves the loop.
 */
export class Rig {
  readonly kind: CharacterKind;
  readonly svg: SVGSVGElement;
  readonly still: boolean;
  pose: Pose;
  private readonly c: Palette;
  private readonly r: number;
  private readonly rand: () => number;
  private readonly root: SVGGElement;
  private readonly cpPath: SVGPathElement;
  private readonly shadow: SVGEllipseElement;
  private readonly dripG: SVGGElement;
  private readonly backArms: SVGGElement;
  private readonly frontArms: SVGGElement;
  private readonly body: SVGPathElement;
  private readonly outline: SVGPathElement;
  private readonly shade: SVGEllipseElement;
  private readonly gloss: SVGEllipseElement;
  private readonly gloss2: SVGCircleElement;
  private readonly face: SVGGElement;
  private readonly blushL: SVGEllipseElement;
  private readonly blushR: SVGEllipseElement;
  private readonly eyeL: SVGGElement;
  private readonly eyeR: SVGGElement;
  private readonly brows: SVGGElement;
  private readonly mouthG: SVGGElement;
  private readonly mouth: SVGPathElement;
  private readonly tongue: SVGEllipseElement;
  private readonly props: SVGGElement;
  private readonly rootProps: SVGGElement;
  private readonly dropsG: SVGGElement;
  private readonly arms: Record<"l" | "r", Arm>;
  private E: Emotion;
  private st = { melt: 0, lean: 0, rot: 0, x: 0, y: 0, sx: 1, sy: 1, look: [0, 0] as [number, number] };
  private mv = 0;
  private imp = -9999;
  private blinkAt: number;
  private blinkEnd = 0;
  private lastNow = 0;
  private nextDrop = 0;
  private drops: Array<{ x: number; y: number; vy: number; splash: number }> = [];

  constructor(host: Element, kind: CharacterKind, pose: Pose, opts: { still?: boolean } = {}) {
    this.kind = kind;
    this.c = PAL[kind];
    this.r = this.c.eye;
    this.pose = pose;
    this.E = EMO[pose];
    this.still = opts.still ?? prefersReducedMotion();
    rigSeq += 1;
    const id = `ltgr${rigSeq}`;
    this.rand = makeSeq(0x9e3779b1 ^ (rigSeq * 2654435761));
    const c = this.c;

    const svg = el("svg", { viewBox: "-100 -185 200 198", "aria-hidden": "true", focusable: "false", class: "lt-gr-svg" });
    host.appendChild(svg);
    this.svg = svg;
    const defs = el("defs", {}, svg);
    const cp = el("clipPath", { id: `${id}c` }, defs);
    this.cpPath = el("path", {}, cp);
    this.shadow = el("ellipse", { cx: 0, cy: 4, rx: c.W, ry: 7, fill: "#14213d", opacity: 0.13 }, svg);
    this.root = el("g", {}, svg);
    this.dripG = el("g", {}, this.root);
    this.backArms = el("g", {}, this.root);
    this.body = el("path", { fill: c.fill }, this.root);
    const clip = el("g", { "clip-path": `url(#${id}c)` }, this.root);
    this.shade = el("ellipse", { fill: c.shade, opacity: 0.55 }, clip);
    this.gloss = el("ellipse", { fill: c.hi, opacity: 0.85 }, clip);
    this.gloss2 = el("circle", { fill: c.hi, opacity: 0.85, r: 4 }, clip);
    this.outline = el("path", { fill: "none", stroke: c.line, "stroke-width": 4.2, "stroke-linejoin": "round" }, this.root);
    this.face = el("g", {}, this.root);
    this.blushL = el("ellipse", { rx: 8, ry: 5, fill: c.blush, opacity: 0.75 }, this.face);
    this.blushR = el("ellipse", { rx: 8, ry: 5, fill: c.blush, opacity: 0.75 }, this.face);
    this.eyeL = el("g", { class: "lt-gr-eye" }, this.face);
    this.eyeR = el("g", { class: "lt-gr-eye" }, this.face);
    this.brows = el("g", {}, this.face);
    this.mouthG = el("g", {}, this.face);
    this.mouth = el("path", { stroke: c.line, "stroke-width": 3.2, "stroke-linecap": "round", "stroke-linejoin": "round" }, this.mouthG);
    this.tongue = el("ellipse", { rx: 4.2, ry: 2.6, cx: 0, cy: 6, fill: "#ff8fa3" }, this.mouthG);
    this.frontArms = el("g", {}, this.root);
    this.dropsG = el("g", {}, this.root);
    const mkArm = (): Arm => {
      const g = el("g", {}, this.backArms);
      const p = el("path", { fill: c.fill, stroke: c.line, "stroke-width": 3.4, "stroke-linejoin": "round" }, g);
      return { g, p, a: 18, len: 24, front: false };
    };
    this.arms = { l: mkArm(), r: mkArm() };
    this.props = el("g", {}, this.face);
    this.rootProps = el("g", {}, this.root);
    this.blinkAt = 1500 + this.rand() * 2500;
    this.applyPose(pose);

    if (this.still) {
      // Reduced motion: one still frame of the pose, settled; never joins the loop.
      this.settle();
    } else {
      ensureListeners();
      RIGS.add(this);
      io?.observe(svg);
      this.frame(typeof performance !== "undefined" ? performance.now() : 0);
      schedule();
    }
  }

  /** Change pose (silently: the speech bubble is the component's). */
  set(pose: Pose): void {
    if (!EMO[pose]) return;
    this.pose = pose;
    this.applyPose(pose);
    this.squish();
    if (this.still) this.settle();
  }

  /** Tap: a damped squash-and-stretch (skipped in reduced motion). */
  squish(): void {
    this.imp = typeof performance !== "undefined" ? performance.now() : 0;
  }

  destroy(): void {
    RIGS.delete(this);
    io?.unobserve(this.svg);
    onScreen.delete(this.svg);
    this.svg.remove();
    if (RIGS.size === 0) dropListenersIfIdle();
  }

  /** Draw the pose fully settled (springs at rest), at a fixed time. */
  private settle(): void {
    const E = this.E;
    this.st.melt = E.motion === "melt" ? 1 : 0;
    this.mv = 0;
    for (const s of ["l", "r"] as const) {
      const tg = armTarget(E.arms[s], 0, s === "l" ? 0 : 1);
      this.arms[s].a = tg[0];
      this.arms[s].len = tg[1];
    }
    this.frame(0, true);
  }

  private applyPose(pose: Pose): void {
    const E = EMO[pose];
    const c = this.c;
    const r = this.r;
    this.eyeL.innerHTML = eyeSVG(E.eyes[0], r, c.line);
    this.eyeR.innerHTML = eyeSVG(E.eyes[1], r, c.line);
    const b = E.brows ?? "none";
    this.brows.innerHTML = `<g class="bl">${browSVG(b, r, 1, c.line)}</g><g class="br">${browSVG(b, r, -1, c.line)}</g>`;
    this.props.innerHTML = propsSVG(E.props.filter((p) => p !== "confetti"), c, r);
    this.rootProps.innerHTML = propsSVG(E.props.filter((p) => p === "confetti"), c, r);
    for (const s of ["l", "r"] as const) {
      const front = E.arms[s] === "chin";
      const A = this.arms[s];
      if (front !== A.front) {
        (front ? this.frontArms : this.backArms).appendChild(A.g);
        A.front = front;
      }
    }
    this.E = E;
    this.svg.setAttribute("data-pose", pose);
  }

  private lookAt(): [number, number] {
    if (!pointer) return [0, 0];
    const b = this.svg.getBoundingClientRect();
    if (!b.width) return [0, 0];
    const cx = b.left + b.width / 2;
    const cy = b.top + b.height * 0.45;
    const dx = pointer[0] - cx;
    const dy = pointer[1] - cy;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const m = Math.min(3.2, dist / 40);
    return [(dx / dist) * m, (dy / dist) * m];
  }

  /** One frame. Public for the shared loop; `settled` draws the still pose. */
  frame(now: number, settled = false): void {
    const t = now / 1000;
    const c = this.c;
    const st = this.st;
    const E = this.E;
    const mo = E.motion;
    const amp = settled || this.still ? 0 : 1;
    const k = settled ? 1 : 0.14;
    const T = { lean: 0, rot: 0, x: 0, y: 0, sx: 1, sy: 1, melt: 0 };
    const br = 1 + 0.025 * Math.sin(t * 2.4) * amp;
    T.sy = br;
    T.sx = 1 / Math.sqrt(br);
    if (mo === "bounce") {
      const b = Math.abs(Math.sin(t * 4.2));
      T.y = -10 * b * amp;
      T.sy = 1 + 0.05 * (b - 0.5) * amp;
      T.sx = 1 / T.sy;
    }
    if (mo === "jump") {
      const ph = (t * 1.5) % 1;
      const h = 4 * ph * (1 - ph);
      T.y = -46 * h * amp;
      const land = Math.max(0, 1 - Math.min(ph, 1 - ph) * 10);
      T.sy = 1 + (0.12 * h - 0.16 * land) * amp;
      T.sx = 1 / T.sy;
    }
    if (mo === "melt") {
      T.melt = 1;
      T.sy = 1;
    }
    if (mo === "tilt") T.rot = amp ? -9 + 2.5 * Math.sin(t * 2) : -9;
    if (mo === "lean") {
      T.lean = 0.55;
      T.rot = 4;
    }
    const age = (now - this.imp) / 1000;
    if (age >= 0 && age < 1.2 && amp) {
      const sq = Math.cos(age * 17) * Math.exp(-age * 5);
      T.sy *= 1 - 0.2 * sq;
      T.sx *= 1 + 0.17 * sq;
    }
    for (const key of ["lean", "rot", "x", "y", "sx", "sy"] as const) {
      const kk = key === "y" || key === "sx" || key === "sy" || key === "x" ? Math.max(k, 0.5) : k;
      st[key] = lerp(st[key], T[key], kk);
    }
    // The melt-and-boing spring: soft going down, stiff and bouncy coming back up.
    const dt = Math.min(0.05, Math.max(0.001, (now - (this.lastNow || now)) / 1000));
    this.lastNow = now;
    const goingDown = T.melt > st.melt;
    if (settled || this.still) {
      st.melt = T.melt;
      this.mv = 0;
    } else {
      const ks = goingDown ? 7 : 110;
      const kd = goingDown ? 5.4 : 8.5;
      this.mv += (ks * (T.melt - st.melt) - kd * this.mv) * dt;
      st.melt += this.mv * dt;
    }
    if (st.melt < -0.35) st.melt = -0.35;
    const m = st.melt;
    const mP = Math.max(0, m);
    const mH = m < 0 ? m : Math.min(1, mP * 1.25);
    const mW = m < 0 ? m * 0.6 : mP * mP;
    st.lean += Math.sin(t * 4.2) * 0.12 * mP * amp;

    // Body: explicit smooth beziers (dome, flared sides, scalloped hem).
    const W = c.W * (1 + 0.3 * mW);
    const H = c.H * (1 - 0.55 * mH);
    const fl = c.flare + 0.1 * mP;
    const Lean = st.lean * H * 0.35;
    const Hd = Math.min(H * 0.52, W * 1.08);
    const sH = H - Hd;
    const yS = -sH;
    const ls = Lean * Math.pow(sH / H, 2);
    const bw = W * (1 + fl);
    const kk = 0.5523;
    let d =
      `M${f(-bw)},0` +
      `C${f(-bw + (bw - W) * 0.15)},${f(-sH * 0.4)} ${f(-W + ls)},${f(yS + sH * 0.5)} ${f(-W + ls)},${f(yS)}` +
      `C${f(-W + ls)},${f(yS - Hd * kk)} ${f(Lean - W * kk)},${f(-H)} ${f(Lean)},${f(-H)}` +
      `C${f(Lean + W * kk)},${f(-H)} ${f(W + ls)},${f(yS - Hd * kk)} ${f(W + ls)},${f(yS)}` +
      `C${f(W + ls)},${f(yS + sH * 0.5)} ${f(bw - (bw - W) * 0.15)},${f(-sH * 0.4)} ${f(bw)},0`;
    const n = c.lobes;
    const step = (2 * bw) / n;
    for (let j = 0; j < n; j += 1) {
      const x0 = bw - j * step;
      const x1 = x0 - step;
      const bul = 7 + (1.3 + 4.5 * mP) * Math.sin(t * (3 + 3 * mP) + j * 1.7) * amp + mP * 4;
      const ny = j === n - 1 ? 0 : -6 + mP * 3;
      d += `C${f(x0 - step * 0.05)},${f(bul)} ${f(x1 + step * 0.05)},${f(bul)} ${f(x1)},${f(ny)}`;
    }
    d += "Z";
    this.body.setAttribute("d", d);
    this.outline.setAttribute("d", d);
    this.cpPath.setAttribute("d", d);

    // Drips (Ziggy is a drippy blob) and the melt puddle.
    let dh = "";
    const dm = Math.max(st.melt, c.drips ?? 0);
    if (dm > 0.05) {
      const drips: Array<[number, number]> = [
        [-0.55, 1],
        [0.18, 0.75],
        [0.62, 1.1],
      ];
      drips.forEach((q, qi) => {
        const dx = q[0] * bw;
        const len = 3 + (st.melt > 0.05 ? 20 * st.melt : 10 * dm) * q[1] + (st.melt > 0.05 ? 2.5 * Math.sin(t * 2 + qi) * amp : 0);
        dh += `<path d="M${f(dx - 6.5)},-8 L${f(dx - 6.5)},${f(len)} A6.5,6.5 0 0 0 ${f(dx + 6.5)},${f(len)} L${f(dx + 6.5)},-8Z" fill="${c.fill}" stroke="${c.line}" stroke-width="3.4"/>`;
      });
    }
    if (c.puddles) {
      dh += `<ellipse cx="${f(-bw - 12)}" cy="7" rx="8" ry="3.5" fill="${c.fill}" stroke="${c.line}" stroke-width="2.6"/><ellipse cx="${f(bw + 10)}" cy="8" rx="6" ry="3" fill="${c.fill}" stroke="${c.line}" stroke-width="2.6"/>`;
    }
    if (mP > 0.04) {
      const pr = bw * (0.98 + 0.12 * mP) + Math.sin(t * 5) * 2 * mP * amp;
      dh =
        `<ellipse cx="${f(Math.sin(t * 2) * 3 * mP * amp)}" cy="6" rx="${f(pr)}" ry="${f(3 + 3 * mP)}" fill="${c.fill}" stroke="${c.line}" stroke-width="2.4" opacity="${f(Math.min(1, mP * 2.2) * 100) / 100}"/>` +
        dh;
    }
    this.dripG.innerHTML = dh;

    // Falling droplets while melting (deterministic sequence, never Math.random).
    if (goingDown && mP > 0.25 && amp && now > this.nextDrop) {
      this.nextDrop = now + 260 + this.rand() * 240;
      const dxs = [-0.55, 0.18, 0.62];
      this.drops.push({ x: dxs[Math.floor(this.rand() * 3)] * bw, y: -4, vy: 20, splash: 0 });
    }
    let ds = "";
    this.drops = this.drops.filter((q) => {
      if (q.splash) {
        q.splash += dt * 3;
        if (q.splash > 1) return false;
        ds += `<ellipse cx="${f(q.x)}" cy="9" rx="${f(6 + 16 * q.splash)}" ry="${f(2 + 3 * q.splash)}" fill="none" stroke="${c.line}" stroke-width="2" opacity="${f((1 - q.splash) * 100) / 100}"/>`;
        return true;
      }
      q.vy += 420 * dt;
      q.y += q.vy * dt;
      if (q.y > 8) {
        q.splash = 0.01;
        return true;
      }
      const s = Math.min(1.6, 1 + q.vy / 260);
      ds += `<ellipse cx="${f(q.x)}" cy="${f(q.y)}" rx="${f(4.6 / Math.sqrt(s))}" ry="${f(4.6 * s)}" fill="${c.fill}" stroke="${c.line}" stroke-width="2.4"/>`;
      return true;
    });
    this.dropsG.innerHTML = ds;

    this.shade.setAttribute("cx", String(f(W * 0.15)));
    this.shade.setAttribute("cy", String(f(-H * 0.02)));
    this.shade.setAttribute("rx", String(f(bw * 1.05)));
    this.shade.setAttribute("ry", String(f(H * 0.17)));
    const gx = -W * 0.45 + Lean * 0.6;
    const gy = yS - Hd * 0.62;
    this.gloss.setAttribute("cx", String(f(gx)));
    this.gloss.setAttribute("cy", String(f(gy)));
    this.gloss.setAttribute("rx", String(f(W * 0.2)));
    this.gloss.setAttribute("ry", String(f(W * 0.11)));
    this.gloss.setAttribute("transform", `rotate(-35 ${f(gx)} ${f(gy)})`);
    this.gloss2.setAttribute("cx", String(f(-W * 0.72 + ls)));
    this.gloss2.setAttribute("cy", String(f(yS - Hd * 0.15)));

    // Face.
    const r = this.r;
    const fx = st.lean * 0.36 * H * 0.35 + Math.sin(t * 3.1) * 2.5 * mP * amp;
    const fy = -H * 0.58 + mP * H * 0.08 + Math.sin(t * 4.3) * 1.5 * mP * amp;
    this.face.setAttribute("transform", `translate(${f(fx)},${f(fy)})`);
    const ex = W * 0.3 * (1 - 0.15 * st.melt);
    if (amp && now > this.blinkAt) {
      this.blinkAt = now + 2200 + this.rand() * 3200;
      this.blinkEnd = now + 130;
    }
    const bl = amp && now < this.blinkEnd ? 0.1 : 1;
    const canBlink = (ty: EyeType) => ty === "dot" || ty === "wide";
    this.eyeL.setAttribute("transform", `translate(${f(-ex)},0) scale(1,${canBlink(E.eyes[0]) ? bl : 1})`);
    this.eyeR.setAttribute("transform", `translate(${f(ex)},0) scale(1,${canBlink(E.eyes[1]) ? bl : 1})`);
    const lk = E.look ?? (amp ? this.lookAt() : [0, 0]);
    st.look[0] = lerp(st.look[0], lk[0], settled ? 1 : 0.2);
    st.look[1] = lerp(st.look[1], lk[1], settled ? 1 : 0.2);
    const pus = this.face.querySelectorAll(".pu");
    for (let i = 0; i < pus.length; i += 1) pus[i].setAttribute("transform", `translate(${f(st.look[0])},${f(st.look[1])})`);
    this.brows.querySelector(".bl")?.setAttribute("transform", `translate(${f(-ex)},0)`);
    this.brows.querySelector(".br")?.setAttribute("transform", `translate(${f(ex)},0)`);
    this.blushL.setAttribute("cx", String(f(-W * 0.5)));
    this.blushL.setAttribute("cy", String(f(r * 1.9)));
    this.blushR.setAttribute("cx", String(f(W * 0.5)));
    this.blushR.setAttribute("cy", String(f(r * 1.9)));
    const M = MOUTH[E.mouth] ?? MOUTH.smile;
    this.mouth.setAttribute("d", M.d);
    this.mouth.setAttribute("fill", M.fill ? "#4a1424" : "none");
    this.tongue.setAttribute("opacity", M.tongue ? "1" : "0");
    this.mouthG.setAttribute("transform", `translate(0,${f(r * 2.7)})`);

    // Arms.
    const shY = -H * 0.4;
    (["l", "r"] as const).forEach((s, si) => {
      const A = this.arms[s];
      const tg = armTarget(E.arms[s], t * amp + 0.0001, si);
      A.a = lerp(A.a, tg[0], settled ? 1 : 0.22);
      A.len = lerp(A.len, tg[1], settled ? 1 : 0.22);
      const sd = s === "r" ? 1 : -1;
      const sxp = sd * W * (1 + fl * 0.15) * 0.9 + ls;
      const hw = 8;
      const L = A.len * (1 - 0.7 * Math.max(0, st.melt));
      A.p.setAttribute("d", `M${-hw},0 A${hw},${hw} 0 0 1 ${hw},0 L${hw},${f(L)} A${hw},${hw} 0 0 1 ${-hw},${f(L)}Z`);
      A.g.setAttribute("transform", `translate(${f(sxp)},${f(shY)}) rotate(${f(sd > 0 ? -A.a : A.a)})`);
    });

    this.root.setAttribute(
      "transform",
      `translate(${f(st.x)},${f(st.y)}) rotate(${f(st.rot)}) scale(${f(st.sx * 100) / 100},${f(st.sy * 100) / 100})`,
    );
    this.shadow.setAttribute("rx", String(f(W * (1 + st.y / 120))));
    this.shadow.setAttribute("opacity", String(f(0.13 * (1 + st.y / 90) * 100) / 100));
  }
}
