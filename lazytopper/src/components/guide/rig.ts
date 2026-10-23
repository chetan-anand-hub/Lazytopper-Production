/**
 * GUIDE-1 — the blob rig: a TypeScript port of the owner-approved prototype (guide/v2.html,
 * 20 Oct 2026) for Byte (the guide) and Ziggy (the student).
 * RIG-2 — the full cast: Mummy (the parent; ./rigMummy), every prototype pose, the props
 * (./rigProps, labels as glyph paths from ./rigGlyphs — never SVG `<text>`), Byte's `peek`
 * (the top half rising from a bottom edge) and the sack's live number (`setBagLabel`).
 * Drawing capability only: which surface shows which pose is each surface lane's call.
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

import { MummyParts } from "./rigMummy";
import { ROOT_PROPS, facePropsSVG, normaliseBagLabel, bagNumberSVG, rootPropsSVG, type Prop } from "./rigProps";

export type CharacterKind = "byte" | "ziggy" | "mummy";

/**
 * Every pose the rig can draw: GUIDE-1's nine plus every remaining prototype EMO entry (RIG-2)
 * and Byte's `peek`. `idle` is the corner chip's resting pose.
 */
export const POSES = [
  "hello",
  "point",
  "think",
  "cheer",
  "idle",
  "excited",
  "determined",
  "sad",
  "happy",
  "explain",
  "wink",
  "cool",
  "zcool",
  "stretch",
  "confused",
  "nervous",
  "sleepy",
  "proud",
  "worried",
  "surprised",
  "mhappy",
  "mproud",
  "stern",
  "laugh",
  "oops",
  "technique",
  "hide",
  "bag",
  "drippy",
  "detective",
  "down",
  "melted",
  "peek",
  // COMPANION-1 (owner ruling 22 Oct 2026) — the companion emotions. SOLO poses only: Byte and
  // Ziggy are never on screen together, so the high five is two poses played one after the other.
  "comfort",
  "breathe",
  "calendar",
  "moon",
  "care",
  "highfiveL",
  "highfive",
  "relieved",
  "badge",
  "study",
  "streak",
  // COMPANION-1 DUET (owner ruling 23 Oct 16:40): the two halves of a short two-character SCENE —
  // Byte's hand on Ziggy's shoulder, and each one's side of a real high five (hands meet in the
  // middle). Used only through the session-scoped scene guard (./sceneGuard.ts).
  "comfortDuet",
  "highfiveDuetL",
  "highfiveDuetR",
  "cheerDuet",
  // COMPANION-1 — new emotions for MOMENTS-3 (exported, not wired here).
  "marking",
  "sorry",
  "aha",
  "examday",
  "yawn",
] as const;
export type Pose = (typeof POSES)[number];

/**
 * The poses written FOR each character (prototype scenes + the designer brief). Any kind can
 * draw any pose; this is the cast sheet surface lanes should pick from.
 */
export const POSES_BY_KIND: Record<CharacterKind, readonly Pose[]> = {
  byte: ["idle", "hello", "point", "explain", "think", "cool", "wink", "cheer", "technique", "peek", "stretch", "melted", "comfort", "breathe", "calendar", "moon", "care", "highfiveL", "comfortDuet", "highfiveDuetL", "cheerDuet", "marking", "sorry"],
  ziggy: ["idle", "happy", "excited", "determined", "oops", "confused", "nervous", "hide", "sad", "drippy", "detective", "bag", "sleepy", "zcool", "proud", "cheer", "down", "melted", "highfive", "relieved", "badge", "study", "streak", "highfiveDuetR", "aha", "examday", "yawn"],
  mummy: ["idle", "worried", "surprised", "mhappy", "mproud", "stern", "laugh", "melted"],
};

/**
 * The designer brief's 31 pose IDs (Byte 12, Ziggy 13, Mummy 6) → the rig pose that draws
 * each, so later designer art can slot in by the brief's IDs.
 */
export const BRIEF_POSE_IDS: Record<string, { kind: CharacterKind; pose: Pose }> = {
  byte_idle: { kind: "byte", pose: "idle" },
  byte_wave: { kind: "byte", pose: "hello" },
  byte_point: { kind: "byte", pose: "point" },
  byte_explain: { kind: "byte", pose: "explain" },
  byte_think: { kind: "byte", pose: "think" },
  byte_cool: { kind: "byte", pose: "cool" },
  byte_wink: { kind: "byte", pose: "wink" },
  byte_cheer: { kind: "byte", pose: "cheer" },
  byte_teacher: { kind: "byte", pose: "technique" },
  byte_peek: { kind: "byte", pose: "peek" },
  byte_stretch: { kind: "byte", pose: "stretch" },
  byte_melt: { kind: "byte", pose: "melted" },
  ziggy_idle: { kind: "ziggy", pose: "idle" },
  ziggy_happy: { kind: "ziggy", pose: "happy" },
  ziggy_excited: { kind: "ziggy", pose: "excited" },
  ziggy_determined: { kind: "ziggy", pose: "determined" },
  ziggy_oops: { kind: "ziggy", pose: "oops" },
  ziggy_confused: { kind: "ziggy", pose: "confused" },
  ziggy_nervous: { kind: "ziggy", pose: "nervous" },
  ziggy_hide: { kind: "ziggy", pose: "hide" },
  ziggy_sad: { kind: "ziggy", pose: "sad" },
  ziggy_drippy: { kind: "ziggy", pose: "drippy" },
  ziggy_detective: { kind: "ziggy", pose: "detective" },
  ziggy_bag: { kind: "ziggy", pose: "bag" },
  ziggy_sleepy: { kind: "ziggy", pose: "sleepy" },
  mummy_worried: { kind: "mummy", pose: "worried" },
  mummy_surprised: { kind: "mummy", pose: "surprised" },
  mummy_relieved: { kind: "mummy", pose: "mhappy" },
  mummy_proud: { kind: "mummy", pose: "mproud" },
  mummy_stern: { kind: "mummy", pose: "stern" },
  mummy_laugh: { kind: "mummy", pose: "laugh" },
};

/**
 * COMPANION-1 — the companion pose IDs (controller-approved, 22 Oct 2026) → the rig pose that
 * draws each. Kept apart from BRIEF_POSE_IDS, which is the designer brief's 31 verbatim. Every one
 * is a SOLO pose: `byte_highfive` and `ziggy_highfive` each raise a hand toward the edge of the
 * frame and are played one after the other, never side by side.
 */
export const COMPANION_POSE_IDS: Record<string, { kind: "byte" | "ziggy"; pose: Pose }> = {
  byte_comfort: { kind: "byte", pose: "comfort" },
  byte_breathe: { kind: "byte", pose: "breathe" },
  byte_calendar: { kind: "byte", pose: "calendar" },
  byte_moon: { kind: "byte", pose: "moon" },
  byte_care: { kind: "byte", pose: "care" },
  byte_highfive: { kind: "byte", pose: "highfiveL" },
  ziggy_highfive: { kind: "ziggy", pose: "highfive" },
  ziggy_relieved: { kind: "ziggy", pose: "relieved" },
  ziggy_proud_badge: { kind: "ziggy", pose: "badge" },
  ziggy_study: { kind: "ziggy", pose: "study" },
  ziggy_streak: { kind: "ziggy", pose: "streak" },
  // Owner ruling 23 Oct 16:40 — new emotions, exported for MOMENTS-3 (not wired by COMPANION-1).
  byte_marking: { kind: "byte", pose: "marking" },
  byte_sorry: { kind: "byte", pose: "sorry" },
  ziggy_aha: { kind: "ziggy", pose: "aha" },
  ziggy_examday: { kind: "ziggy", pose: "examday" },
  // A yawning Ziggy (pairs with byte_moon). The designer brief's `ziggy_sleepy` (BRIEF_POSE_IDS)
  // stays the dozing `sleepy`; this companion entry draws the yawn.
  ziggy_sleepy: { kind: "ziggy", pose: "yawn" },
};

/**
 * COMPANION-1 DUET — the two-character SCENES (owner ruling 23 Oct 16:40). Each scene is two rigs
 * side by side, one pose each; the left is always Byte, the right Ziggy. A scene may show only when
 * ./sceneGuard.ts `canShowScene()` says so (at most one per app session, never during a question or
 * a test, never below 360 px — the solo poses stand in there).
 */
export const DUET_SCENES = {
  // Ziggy starts `down` (sad, drooping — not `sad`, whose melt leaves no shoulder for Byte's hand).
  comfort: { byte: "comfortDuet", ziggy: ["down", "relieved"] },
  highfive: { byte: "highfiveDuetL", ziggy: ["highfiveDuetR"] },
  milestone: { byte: "cheerDuet", ziggy: ["badge"] },
} as const satisfies Record<string, { byte: Pose; ziggy: readonly Pose[] }>;
export type DuetScene = keyof typeof DUET_SCENES;

/** COMPANION-1 — byte_breathe's cycle: the body grows for 4 s (breathe in), shrinks for 4 s (out). */
export const BREATHE_IN_MS = 4000;
export const BREATHE_CYCLE_MS = 2 * BREATHE_IN_MS;

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

/** Colours from the Round-1 art pack manifest (byte, mummy) and the prototype (ziggy). */
export const PAL: Record<CharacterKind, Palette> = {
  byte: { fill: "#80d0f0", shade: "#5cb7de", line: "#15243a", hi: "#eafaff", blush: "#f5a7b2", W: 54, H: 128, flare: 0.2, lobes: 4, eye: 7.4 },
  ziggy: { fill: "#a7d968", shade: "#86bf48", line: "#1f3818", hi: "#e6f6c9", blush: "#d4ec98", W: 60, H: 122, flare: 0.26, lobes: 4, eye: 7.8, drips: 0.35, puddles: true },
  mummy: { fill: "#b0de5c", shade: "#92c444", line: "#1b2433", hi: "#e6f7c2", blush: "#f5ada6", W: 60, H: 134, flare: 0.24, lobes: 5, eye: 6.8 },
};

type EyeType = "dot" | "wide" | "happy" | "closed" | "heart" | "spiral" | "none" | "soft";
type BrowType = "raised" | "worried" | "angry" | "plain" | "none" | "care";
type MouthType = "smile" | "open" | "talk" | "grin" | "flat" | "frown" | "pout" | "o" | "wobbly" | "smirk" | "soft" | "sorry" | "yawn";
type ArmMode =
  | "rest"
  | "wave"
  | "up"
  | "point"
  | "chin"
  | "fist"
  | "droop"
  | "explainL"
  | "explainR"
  | "thumb"
  | "clasp"
  | "hold"
  | "hips"
  | "raise"
  | "foldL"
  | "foldR"
  | "edge"
  // COMPANION-1: an open, reaching "there there" hand; a hand raised toward the edge of the frame.
  | "reach"
  | "hi5"
  // COMPANION-1 DUET: a long arm out sideways onto the partner's shoulder.
  | "shoulder";
type Motion =
  | "bounce"
  | "lean"
  | "tilt"
  | "jump"
  | "melt"
  | "breathe"
  | "sway"
  | "shiver"
  | "droop"
  | "hop"
  | "puff"
  | "laugh"
  | "peek"
  | "drip"
  | "stretch"
  | "rise"
  // COMPANION-1: byte_breathe — the body grows for 4 s and shrinks for 4 s (BREATHE_CYCLE_MS).
  | "slowbreathe";
export type { Prop };

/** Arms drawn in FRONT of the body (hands on the chin, clasped, holding, folded, on the edge). */
const FRONT_ARMS = new Set<ArmMode>(["chin", "clasp", "hold", "thumb", "foldL", "foldR", "edge"]);

interface Emotion {
  eyes: [EyeType, EyeType];
  look?: [number, number];
  mouth: MouthType;
  brows?: BrowType;
  arms: { l: ArmMode; r: ArmMode };
  motion: Motion;
  props: Prop[];
}

/** The pose table — the prototype's EMO entries (every one), plus Byte's `peek`. */
export const EMO: Record<Pose, Emotion> = {
  hello: { eyes: ["dot", "dot"], mouth: "open", arms: { l: "rest", r: "wave" }, motion: "bounce", props: [] },
  point: { eyes: ["dot", "dot"], mouth: "smile", arms: { l: "rest", r: "point" }, motion: "lean", props: [] },
  explain: { eyes: ["dot", "dot"], mouth: "talk", brows: "raised", arms: { l: "explainL", r: "explainR" }, motion: "breathe", props: [] },
  think: { eyes: ["dot", "dot"], look: [2, -3], mouth: "pout", arms: { l: "rest", r: "chin" }, motion: "tilt", props: ["bulb"] },
  wink: { eyes: ["dot", "closed"], mouth: "smirk", arms: { l: "rest", r: "thumb" }, motion: "sway", props: ["sparkle"] },
  cool: { eyes: ["none", "none"], mouth: "smirk", arms: { l: "foldL", r: "foldR" }, motion: "sway", props: ["shades"] },
  zcool: { eyes: ["none", "none"], mouth: "open", arms: { l: "rest", r: "wave" }, motion: "bounce", props: ["shades"] },
  cheer: { eyes: ["happy", "happy"], mouth: "grin", arms: { l: "up", r: "up" }, motion: "jump", props: ["sparkle"] },
  stretch: { eyes: ["wide", "wide"], mouth: "o", arms: { l: "up", r: "up" }, motion: "stretch", props: [] },
  idle: { eyes: ["dot", "dot"], mouth: "smile", arms: { l: "rest", r: "rest" }, motion: "breathe", props: [] },
  happy: { eyes: ["dot", "dot"], mouth: "open", arms: { l: "rest", r: "wave" }, motion: "bounce", props: [] },
  excited: { eyes: ["wide", "wide"], mouth: "grin", arms: { l: "up", r: "up" }, motion: "jump", props: ["confetti"] },
  confused: { eyes: ["wide", "dot"], mouth: "wobbly", brows: "raised", arms: { l: "rest", r: "chin" }, motion: "tilt", props: ["q"] },
  nervous: { eyes: ["wide", "wide"], mouth: "wobbly", brows: "worried", arms: { l: "clasp", r: "clasp" }, motion: "shiver", props: ["sweat"] },
  sad: { eyes: ["dot", "dot"], look: [0, 2], mouth: "frown", brows: "worried", arms: { l: "droop", r: "droop" }, motion: "melt", props: ["tears"] },
  sleepy: { eyes: ["closed", "closed"], mouth: "o", arms: { l: "droop", r: "droop" }, motion: "droop", props: ["zzz"] },
  proud: { eyes: ["happy", "happy"], mouth: "smile", arms: { l: "hips", r: "hips" }, motion: "sway", props: ["sparkle"] },
  determined: { eyes: ["dot", "dot"], mouth: "smile", brows: "angry", arms: { l: "rest", r: "fist" }, motion: "bounce", props: [] },
  worried: { eyes: ["dot", "dot"], mouth: "frown", brows: "worried", arms: { l: "rest", r: "chin" }, motion: "sway", props: ["sweat"] },
  surprised: { eyes: ["wide", "wide"], mouth: "o", brows: "raised", arms: { l: "hold", r: "hold" }, motion: "hop", props: ["phone"] },
  mhappy: { eyes: ["happy", "happy"], mouth: "open", arms: { l: "rest", r: "wave" }, motion: "bounce", props: [] },
  mproud: { eyes: ["heart", "heart"], mouth: "smile", arms: { l: "clasp", r: "clasp" }, motion: "sway", props: ["hearts"] },
  stern: { eyes: ["dot", "dot"], mouth: "flat", brows: "angry", arms: { l: "hips", r: "hips" }, motion: "puff", props: [] },
  laugh: { eyes: ["happy", "happy"], mouth: "grin", arms: { l: "explainL", r: "explainR" }, motion: "laugh", props: ["sparkle"] },
  oops: { eyes: ["wide", "wide"], mouth: "wobbly", brows: "raised", arms: { l: "up", r: "up" }, motion: "hop", props: ["pencil", "sweat"] },
  technique: { eyes: ["dot", "dot"], mouth: "smile", brows: "raised", arms: { l: "hold", r: "hold" }, motion: "sway", props: ["clipboard"] },
  hide: { eyes: ["wide", "wide"], look: [0, -2], mouth: "o", arms: { l: "droop", r: "droop" }, motion: "peek", props: ["books"] },
  bag: { eyes: ["happy", "happy"], mouth: "open", arms: { l: "rest", r: "raise" }, motion: "bounce", props: ["bag", "sparkle"] },
  drippy: { eyes: ["dot", "dot"], look: [0, 2.5], mouth: "flat", brows: "worried", arms: { l: "droop", r: "droop" }, motion: "drip", props: [] },
  detective: { eyes: ["dot", "wide"], mouth: "pout", arms: { l: "rest", r: "raise" }, motion: "tilt", props: ["magnifier"] },
  down: { eyes: ["dot", "dot"], look: [0, 2], mouth: "flat", brows: "worried", arms: { l: "droop", r: "droop" }, motion: "droop", props: [] },
  melted: { eyes: ["spiral", "spiral"], mouth: "wobbly", brows: "worried", arms: { l: "droop", r: "droop" }, motion: "melt", props: [] },
  // RIG-2: Byte peeks in from a bottom edge (GUIDE-PUBLIC-1) — eyes up over the edge, forearms on it.
  peek: { eyes: ["dot", "dot"], look: [1.2, -2.6], mouth: "smile", brows: "raised", arms: { l: "edge", r: "edge" }, motion: "rise", props: [] },
  // COMPANION-1 — solo companion poses. Byte wears no sunglasses in any of them.
  comfort: { eyes: ["soft", "soft"], look: [0, 1], mouth: "smile", brows: "care", arms: { l: "rest", r: "reach" }, motion: "breathe", props: [] },
  breathe: { eyes: ["closed", "closed"], mouth: "smile", arms: { l: "rest", r: "rest" }, motion: "slowbreathe", props: [] },
  calendar: { eyes: ["dot", "dot"], look: [0, 1.5], mouth: "smile", brows: "raised", arms: { l: "hold", r: "hold" }, motion: "sway", props: ["calendar"] },
  moon: { eyes: ["soft", "soft"], look: [1.5, -1.5], mouth: "soft", arms: { l: "rest", r: "rest" }, motion: "breathe", props: ["moon"] },
  care: { eyes: ["dot", "dot"], look: [0, 1], mouth: "soft", brows: "care", arms: { l: "clasp", r: "clasp" }, motion: "breathe", props: [] },
  highfiveL: { eyes: ["happy", "happy"], mouth: "grin", arms: { l: "hi5", r: "rest" }, motion: "hop", props: ["sparkle"] },
  highfive: { eyes: ["happy", "happy"], mouth: "grin", arms: { l: "rest", r: "hi5" }, motion: "hop", props: ["sparkle"] },
  relieved: { eyes: ["closed", "closed"], mouth: "smile", brows: "raised", arms: { l: "droop", r: "droop" }, motion: "breathe", props: ["sweat"] },
  badge: { eyes: ["happy", "happy"], mouth: "grin", arms: { l: "hips", r: "hips" }, motion: "sway", props: ["badge", "sparkle"] },
  study: { eyes: ["dot", "dot"], look: [0, 2.5], mouth: "pout", brows: "raised", arms: { l: "hold", r: "hold" }, motion: "breathe", props: ["book", "pen"] },
  streak: { eyes: ["happy", "happy"], mouth: "open", arms: { l: "rest", r: "fist" }, motion: "bounce", props: ["flame"] },
  // DUET halves — Byte stands LEFT (his right arm faces Ziggy), Ziggy RIGHT (his left arm faces Byte).
  comfortDuet: { eyes: ["soft", "soft"], look: [2, 0.5], mouth: "smile", brows: "care", arms: { l: "rest", r: "shoulder" }, motion: "breathe", props: [] },
  highfiveDuetL: { eyes: ["happy", "happy"], mouth: "grin", arms: { l: "rest", r: "hi5" }, motion: "hop", props: [] },
  highfiveDuetR: { eyes: ["happy", "happy"], mouth: "grin", arms: { l: "hi5", r: "rest" }, motion: "hop", props: ["sparkle"] },
  cheerDuet: { eyes: ["happy", "happy"], mouth: "grin", arms: { l: "up", r: "up" }, motion: "bounce", props: ["sparkle"] },
  // New emotions (owner ruling 23 Oct 16:40) — exported for MOMENTS-3.
  marking: { eyes: ["dot", "dot"], look: [1, 2.5], mouth: "pout", brows: "raised", arms: { l: "hold", r: "hold" }, motion: "breathe", props: ["sheet", "redpen"] },
  sorry: { eyes: ["dot", "dot"], look: [0, 2], mouth: "sorry", brows: "worried", arms: { l: "clasp", r: "clasp" }, motion: "breathe", props: ["sweat"] },
  aha: { eyes: ["wide", "wide"], mouth: "open", brows: "raised", arms: { l: "rest", r: "raise" }, motion: "hop", props: ["bulb", "sparkle"] },
  examday: { eyes: ["closed", "closed"], mouth: "o", arms: { l: "hold", r: "hold" }, motion: "slowbreathe", props: ["admit"] },
  yawn: { eyes: ["closed", "closed"], mouth: "yawn", arms: { l: "droop", r: "droop" }, motion: "droop", props: ["zzz"] },
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
  wobbly: { d: "M-11,3 q2.75,-4 5.5,0 q2.75,4 5.5,0 q2.75,-4 5.5,0 q2.75,4 5.5,0", fill: false },
  smirk: { d: "M-8,3 Q2,7 9,-2", fill: false },
  soft: { d: "M-6,1 Q0,5 6,1", fill: false },
  sorry: { d: "M-6,4 Q0,0 6,4", fill: false },
  yawn: { d: "M0,-7 C7,-7 7,10 0,10 C-7,10 -7,-7 0,-7 Z", fill: true, tongue: true },
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
    case "heart":
      return `<path d="M0,${r * 1.1} C${-r * 2},${-r * 0.2} ${-r},${-r * 1.6} 0,${-r * 0.5} C${r},${-r * 1.6} ${r * 2},${-r * 0.2} 0,${r * 1.1}Z" fill="#e8186b" stroke="${L}" stroke-width="1.6"/>`;
    case "spiral":
      return `<path d="M0,0 m-1,0 a1,1 0 1,1 2,0 a2.5,2.5 0 1,1 -5,0 a4,4 0 1,1 8,0 a5.5,5.5 0 1,1 -11,0" fill="none" stroke="${L}" stroke-width="2.2" stroke-linecap="round"/>`;
    case "none":
      return "";
    case "soft":
      // COMPANION-1: a calm, half-lidded eye — the lower half of the pupil under a soft lid line.
      return `<g class="pu"><path d="M${-r * 0.92},${-r * 0.12} A${r * 0.92},${r * 0.92} 0 0 0 ${r * 0.92},${-r * 0.12} Z" fill="${L}"/><circle cx="${-r * 0.3}" cy="${r * 0.22}" r="${r * 0.24}" fill="#fff"/></g><path d="M${-r * 1.15},${-r * 0.12} Q0,${-r * 0.8} ${r * 1.15},${-r * 0.12}" fill="none" stroke="${L}" stroke-width="3" stroke-linecap="round"/>`;
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
  // COMPANION-1: caring — the inner ends lift a little, softer than worried.
  else if (type === "care") d = `M${-a * side},${y + 1.5} Q${-a * side * 0.1},${y - 1} ${a * side * 0.9},${y - 2.5}`;
  else if (type === "angry") d = `M${-a * side},${y - 4} L${a * side * 0.9},${y + 3}`;
  else if (type === "raised") d = `M${-a},${y - 5} Q0,${y - 10} ${a},${y - 5}`;
  else d = `M${-a},${y} L${a},${y}`; // plain (Mummy's resting brows)
  return `<path d="${d}" fill="none" stroke="${L}" stroke-width="3.2" stroke-linecap="round"/>`;
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
    case "explainR":
      return [75 + 28 * w(t * 3.2), 27];
    case "explainL":
      return [70 + 28 * w(t * 3.2 + 1.6), 27];
    case "chin":
      return [-142, 30];
    case "thumb":
      return [-118 + 6 * w(t * 4), 26];
    case "clasp":
      return [-40, 25];
    case "hold":
      return [-28, 24];
    case "hips":
      return [38, 20];
    case "fist":
      return [160 + 6 * w(t * 6), 24];
    case "droop":
      return [8, 22];
    case "raise":
      return [122 + 4 * w(t * 3), 28];
    case "foldL":
      return [-78 + 3 * w(t * 2), 46];
    case "foldR":
      return [-84 + 3 * w(t * 2 + 1), 44];
    case "edge":
      return [-98, 26];
    case "reach":
      // COMPANION-1: an open hand reaching out, a little below the shoulder, gently.
      return [70 + 4 * w(t * 2), 33];
    case "hi5":
      // COMPANION-1: a hand raised up and out toward the edge of the frame.
      return [128 + 5 * w(t * 5), 34];
    case "shoulder":
      // COMPANION-1 DUET: out sideways, a touch above level, long enough to rest on Ziggy's shoulder.
      return [104 + 2 * w(t * 2), 58];
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
  bangle: SVGGElement | null;
  a: number;
  len: number;
  front: boolean;
}

/** Where a motion settles the melt (the still frame and the spring's target). */
function meltTarget(mo: Motion): number {
  if (mo === "melt") return 1;
  if (mo === "drip") return 0.32;
  return 0;
}

/** Byte's peek: the edge sits this far up the body (fraction of H from the ground). */
const PEEK_CUT = 0.38;

export interface RigOptions {
  /** Force a still pose (tests, contact sheets); default follows prefers-reduced-motion. */
  still?: boolean;
  /** The sack's number (the `bag` pose); see `setBagLabel`. */
  bagLabel?: number;
  /**
   * COMPANION-1 — props drawn ON TOP of any pose's own (e.g. the festival `diya` / `rangoli` with
   * `happy` or `cheer`). Paths only, like every prop. See `setExtraProps`.
   */
  extraProps?: readonly Prop[];
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
  private readonly wrap: SVGGElement;
  private readonly peekRect: SVGRectElement;
  private readonly peekClipId: string;
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
  private readonly mummy: MummyParts | null;
  private E: Emotion;
  private bagLabel: number | null;
  private extra: Prop[];
  private peeking = false;
  private rise = 0;
  private riseV = 0;
  private st = { melt: 0, lean: 0, rot: 0, x: 0, y: 0, sx: 1, sy: 1, look: [0, 0] as [number, number] };
  private mv = 0;
  private imp = -9999;
  private blinkAt: number;
  private blinkEnd = 0;
  private lastNow = 0;
  private nextDrop = 0;
  private drops: Array<{ x: number; y: number; vy: number; splash: number }> = [];

  constructor(host: Element, kind: CharacterKind, pose: Pose, opts: RigOptions = {}) {
    this.kind = kind;
    this.c = PAL[kind];
    this.r = this.c.eye;
    this.pose = pose;
    this.E = EMO[pose];
    this.still = opts.still ?? prefersReducedMotion();
    this.bagLabel = normaliseBagLabel(opts.bagLabel);
    this.extra = [...(opts.extraProps ?? [])];
    rigSeq += 1;
    const id = `ltgr${rigSeq}`;
    this.rand = makeSeq(0x9e3779b1 ^ (rigSeq * 2654435761));
    const c = this.c;
    const isMummy = kind === "mummy";

    const svg = el("svg", { viewBox: "-100 -185 200 198", "aria-hidden": "true", focusable: "false", class: this.still ? "lt-gr-svg lt-gr-still" : "lt-gr-svg" });
    svg.setAttribute("data-kind", kind);
    host.appendChild(svg);
    this.svg = svg;
    const defs = el("defs", {}, svg);
    const cp = el("clipPath", { id: `${id}c` }, defs);
    this.cpPath = el("path", {}, cp);
    // The peek edge: everything below it is clipped (the host's own overflow is never relied on).
    this.peekClipId = `${id}p`;
    const pc = el("clipPath", { id: this.peekClipId }, defs);
    this.peekRect = el("rect", { x: -200, y: -400, width: 400, height: 400 }, pc);
    this.shadow = el("ellipse", { cx: 0, cy: 4, rx: c.W, ry: 7, fill: "#14213d", opacity: 0.13 }, svg);
    this.wrap = el("g", {}, svg);
    this.root = el("g", {}, this.wrap);
    this.dripG = el("g", {}, this.root);
    this.backArms = el("g", {}, this.root);
    const mumBehind = isMummy ? el("g", {}, this.root) : null;
    this.body = el("path", { fill: c.fill }, this.root);
    const clip = el("g", { "clip-path": `url(#${id}c)` }, this.root);
    this.shade = el("ellipse", { fill: c.shade, opacity: 0.55 }, clip);
    const mumClip = isMummy ? el("g", {}, clip) : null;
    this.gloss = el("ellipse", { fill: c.hi, opacity: 0.85 }, clip);
    this.gloss2 = el("circle", { fill: c.hi, opacity: 0.85, r: 4 }, clip);
    this.outline = el("path", { fill: "none", stroke: c.line, "stroke-width": 4.2, "stroke-linejoin": "round" }, this.root);
    const mumTop = isMummy ? el("g", {}, this.root) : null;
    this.face = el("g", {}, this.root);
    this.blushL = el("ellipse", { rx: 8, ry: 5, fill: c.blush, opacity: 0.75 }, this.face);
    this.blushR = el("ellipse", { rx: 8, ry: 5, fill: c.blush, opacity: 0.75 }, this.face);
    this.eyeL = el("g", { class: "lt-gr-eye" }, this.face);
    this.eyeR = el("g", { class: "lt-gr-eye" }, this.face);
    this.brows = el("g", {}, this.face);
    const mumFace = isMummy ? el("g", {}, this.face) : null;
    this.mouthG = el("g", {}, this.face);
    this.mouth = el("path", { stroke: c.line, "stroke-width": 3.2, "stroke-linecap": "round", "stroke-linejoin": "round" }, this.mouthG);
    this.tongue = el("ellipse", { rx: 4.2, ry: 2.6, cx: 0, cy: 6, fill: "#ff8fa3" }, this.mouthG);
    this.frontArms = el("g", {}, this.root);
    this.dropsG = el("g", {}, this.root);
    const mkArm = (): Arm => {
      const g = el("g", {}, this.backArms);
      const p = el("path", { fill: c.fill, stroke: c.line, "stroke-width": 3.4, "stroke-linejoin": "round" }, g);
      return { g, p, bangle: isMummy ? MummyParts.bangle(g) : null, a: 18, len: 24, front: false };
    };
    this.arms = { l: mkArm(), r: mkArm() };
    this.props = el("g", {}, this.face);
    this.rootProps = el("g", {}, this.root);
    this.mummy = mumBehind && mumClip && mumTop && mumFace ? new MummyParts({ behind: mumBehind, clip: mumClip, top: mumTop, face: mumFace }, c.line) : null;
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

  /**
   * The sack's number (the `bag` pose), drawn as digit paths — never baked in, never `<text>`.
   * MI-VOICE-1 passes MI's real count. A non-number or negative clears the slot; capped at 999.
   */
  setBagLabel(n: number | null | undefined): void {
    this.bagLabel = normaliseBagLabel(n);
    const slot = this.rootProps.querySelector(".lt-gr-bagn");
    if (slot) slot.innerHTML = bagNumberSVG(this.bagLabel);
  }

  /** COMPANION-1 — replace the extra props drawn on top of the pose's own (none → []). */
  setExtraProps(list: readonly Prop[] | null | undefined): void {
    this.extra = [...(list ?? [])];
    this.applyPose(this.pose);
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
    this.st.melt = meltTarget(E.motion);
    this.mv = 0;
    this.rise = 0;
    this.riseV = 0;
    for (const s of ["l", "r"] as const) {
      const tg = armTarget(E.arms[s], 0, s === "l" ? 0 : 1);
      this.arms[s].a = tg[0];
      this.arms[s].len = tg[1];
    }
    this.frame(0, true);
  }

  /** Byte's peek mode: crop the viewBox to the top of the body and clip at the edge. */
  private setPeek(on: boolean): void {
    if (on === this.peeking) return;
    this.peeking = on;
    const c = this.c;
    if (on) {
      const top = -c.H - 30;
      const cut = -c.H * PEEK_CUT;
      this.svg.setAttribute("viewBox", `-100 ${f(top)} 200 ${f(cut - top)}`);
      this.peekRect.setAttribute("height", String(f(400 + cut)));
      this.wrap.setAttribute("clip-path", `url(#${this.peekClipId})`);
      this.shadow.setAttribute("display", "none");
      this.svg.setAttribute("data-peek", "true");
      // Rise from below the edge (springy, like the prototype's .peek.up); still → already up.
      this.rise = this.still ? 0 : 1;
      this.riseV = 0;
    } else {
      this.svg.setAttribute("viewBox", "-100 -185 200 198");
      this.wrap.removeAttribute("clip-path");
      this.shadow.removeAttribute("display");
      this.svg.removeAttribute("data-peek");
      this.rise = 0;
    }
  }

  private applyPose(pose: Pose): void {
    const E = EMO[pose];
    const c = this.c;
    const r = this.r;
    this.eyeL.innerHTML = eyeSVG(E.eyes[0], r, c.line);
    this.eyeR.innerHTML = eyeSVG(E.eyes[1], r, c.line);
    const b = E.brows ?? (this.kind === "mummy" ? "plain" : "none");
    this.brows.innerHTML = `<g class="bl">${browSVG(b, r, 1, c.line)}</g><g class="br">${browSVG(b, r, -1, c.line)}</g>`;
    const g = { W: c.W, H: c.H, line: c.line, r };
    const all = [...E.props, ...this.extra.filter((p) => !E.props.includes(p))];
    this.props.innerHTML = facePropsSVG(
      all.filter((p) => !ROOT_PROPS.has(p)),
      g,
    );
    this.rootProps.innerHTML = rootPropsSVG(
      all.filter((p) => ROOT_PROPS.has(p)),
      g,
      this.bagLabel,
    );
    for (const s of ["l", "r"] as const) {
      const front = FRONT_ARMS.has(E.arms[s]);
      const A = this.arms[s];
      if (front !== A.front) {
        (front ? this.frontArms : this.backArms).appendChild(A.g);
        A.front = front;
      }
    }
    this.E = E;
    this.setPeek(pose === "peek");
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
    const T = { lean: 0, rot: 0, x: 0, y: 0, sx: 1, sy: 1, melt: meltTarget(mo) };
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
    if (mo === "hop") {
      const ph = (t * 0.9) % 1;
      const h = ph < 0.3 ? 4 * (ph / 0.3) * (1 - ph / 0.3) : 0;
      T.y = -18 * h * amp;
      T.sy = 1 + 0.06 * h * amp;
    }
    if (mo === "shiver") {
      T.x = 1.8 * Math.sin(t * 55) * amp;
      T.sy = 0.97;
    }
    if (mo === "melt" || mo === "drip") T.sy = 1;
    if (mo === "peek") {
      T.y = -4 * Math.abs(Math.sin(t * 1.6)) * amp;
      T.x = 1.2 * Math.sin(t * 30) * amp;
    }
    if (mo === "rise") T.y = -3 * Math.abs(Math.sin(t * 1.6)) * amp;
    if (mo === "tilt") T.rot = amp ? -9 + 2.5 * Math.sin(t * 2) : -9;
    if (mo === "lean") {
      T.lean = 0.55;
      T.rot = 4;
    }
    if (mo === "droop") {
      T.sy = 0.9 + 0.03 * Math.sin(t * 1.2) * amp;
      T.sx = 1.08;
      T.rot = 5 * Math.sin(t * 0.8) * amp;
    }
    if (mo === "sway") T.rot = 4.5 * Math.sin(t * 1.7) * amp;
    if (mo === "stretch") {
      // Still frame: drawn mid-stretch so the pose reads without motion.
      const s = amp ? Math.abs(Math.sin(t * 2.2)) : 0.7;
      T.sy = 1 + 0.28 * s;
      T.sx = 1 / Math.sqrt(T.sy);
      T.y = -4 * s;
    }
    if (mo === "laugh") {
      const q = Math.abs(Math.sin(t * 14));
      T.y = -3 * q * amp;
      T.sy = 1 - 0.04 * q * amp;
      T.sx = 1 + 0.03 * q * amp;
      T.rot = 3 * Math.sin(t * 3) * amp;
    }
    if (mo === "slowbreathe") {
      // COMPANION-1 byte_breathe: 0 → 1 over BREATHE_IN_MS (in), 1 → 0 over the next (out).
      // Still frame (reduced motion): drawn mid-breath so the pose reads without motion.
      const s = amp ? (1 - Math.cos((now / BREATHE_IN_MS) * Math.PI)) / 2 : 0.5;
      T.sy = 1 + 0.12 * s;
      T.sx = 1 + 0.06 * s;
      T.y = -2 * s;
    }
    if (mo === "puff") {
      T.sx = 1.07 + 0.015 * Math.sin(t * 3) * amp;
      T.sy = 0.97;
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
    // The peek rise: a springy pop up from behind the edge (overshoots a touch, then settles).
    if (this.peeking && !settled && !this.still) {
      this.riseV += (40 * (0 - this.rise) - 7 * this.riseV) * dt;
      this.rise += this.riseV * dt;
    } else if (settled || this.still) {
      this.rise = 0;
    }
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
    if (this.mummy) this.mummy.frame(W, H, st.lean, t, amp, ex, r, c.line);
    // `talk` flaps between talk and smile (~2.8 per second; never in the still pose).
    const mt: MouthType = E.mouth === "talk" && amp && Math.floor(now / 180) % 2 === 0 ? "smile" : E.mouth;
    const M = MOUTH[mt] ?? MOUTH.smile;
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
      if (A.bangle) A.bangle.setAttribute("transform", `translate(0,${f(L - 6)})`);
    });
    // The phone follows the hands.
    this.rootProps.querySelector(".lt-gr-phone")?.setAttribute("transform", `translate(${f(fx)},${f(-H * 0.22)})`);

    const ry = st.y + this.rise * c.H * 0.72;
    this.root.setAttribute(
      "transform",
      `translate(${f(st.x)},${f(ry)}) rotate(${f(st.rot)}) scale(${f(st.sx * 100) / 100},${f(st.sy * 100) / 100})`,
    );
    this.shadow.setAttribute("rx", String(f(W * (1 + st.y / 120))));
    this.shadow.setAttribute("opacity", String(f(0.13 * (1 + st.y / 90) * 100) / 100));
  }
}
