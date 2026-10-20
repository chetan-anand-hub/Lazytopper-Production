/**
 * RIG-2 — a tiny single-stroke glyph table, so the rig never emits SVG `<text>`.
 *
 * WHY. The prototype drew "?", "z", the book spines and the sack label with `<text>` in
 * "Baloo 2". Text in an SVG depends on a web font being loaded, is read out by some assistive
 * tech even inside aria-hidden art in a few browsers, and is the one way a string could reach
 * the drawing. Every label here is a fixed path instead: stroked centre-lines on a 6 × 10 cell
 * (cap height 10, baseline y = 10, lowercase x-height from y = 4).
 *
 * Only the characters the rig needs are present. An unknown character draws nothing (it still
 * advances), so a missing glyph is a gap, never a crash.
 */

/** Absolute commands only (M L H V C Z) so the transform below can rewrite them. */
const G: Record<string, string> = {
  "0": "M3,0 C-0.8,0 -0.8,10 3,10 C6.8,10 6.8,0 3,0Z",
  "1": "M0.9,2.2 L3.6,0 V10",
  "2": "M0.5,2.5 C0.8,-0.6 5.6,-0.8 5.6,2.6 C5.6,5 1.5,7 0.3,10 H5.8",
  "3": "M0.6,1 C2,-0.4 5.6,-0.2 5.4,2.6 C5.3,4.4 3.6,4.8 2.4,4.8 C4,4.8 5.8,5.4 5.8,7.4 C5.8,10.6 1.6,10.6 0.3,8.8",
  "4": "M4.4,10 V0 L0.2,6.8 H5.9",
  "5": "M5.4,0 H1.2 L0.8,4.4 C2.8,3.2 5.8,3.8 5.8,6.8 C5.8,10.4 1.6,10.6 0.3,8.8",
  "6": "M5,0.6 C2,-0.6 0.2,2.4 0.2,6.2 C0.2,8.6 1.4,10 3,10 C4.8,10 5.8,8.6 5.8,6.8 C5.8,5 4.6,3.8 3,3.8 C1.6,3.8 0.4,4.8 0.2,6.2",
  "7": "M0.3,0 H5.8 L2.2,10",
  "8": "M3,4.6 C0.6,4.6 0.6,0 3,0 C5.4,0 5.4,4.6 3,4.6 C0.2,4.6 0.2,10 3,10 C5.8,10 5.8,4.6 3,4.6Z",
  "9": "M5.8,3.8 C5.6,5.2 4.4,6.2 3,6.2 C1.4,6.2 0.2,5 0.2,3.2 C0.2,1.4 1.4,0 3,0 C4.8,0 5.8,1.6 5.8,3.8 C5.8,7.4 4,10.4 1,9.4",
  "?": "M0.6,2.6 C0.6,-0.6 5.6,-0.8 5.6,2.6 C5.6,5 3,5 3,7.2 M3,9.6 V10",
  z: "M0.6,4 H5.4 L0.6,10 H5.6",
  s: "M5,4.8 C4,3.6 0.8,3.8 0.8,5.6 C0.8,7.4 5.4,6.6 5.4,8.4 C5.4,10.4 1.6,10.4 0.6,9.2",
  A: "M0.2,10 L3,0 L5.8,10 M1.2,6.6 H4.8",
  B: "M0.4,0 V10 H3.4 C6.2,10 6.2,5 3.2,5 H0.4 M0.4,0 H3 C5.6,0 5.6,5 3.2,5",
  C: "M5.6,1.6 C4.6,0.2 3.8,0 3,0 C0.6,0 0,2.6 0,5 C0,7.4 0.6,10 3,10 C3.8,10 4.6,9.8 5.6,8.4",
  D: "M0.4,0 V10 H2.4 C6.4,10 6.4,0 2.4,0Z",
  E: "M5.4,0 H0.4 V10 H5.4 M0.4,5 H4.4",
  G: "M5.6,1.6 C4.6,0.2 3.8,0 3,0 C0.8,0 0,2.4 0,5 C0,7.6 0.8,10 3,10 C4.6,10 5.8,9 5.8,6.4 H3.2",
  I: "M3,0 V10 M1,0 H5 M1,10 H5",
  K: "M0.4,0 V10 M5.6,0 L0.6,6 M2.2,4.4 L5.8,10",
  M: "M0.2,10 V0 L3,6 L5.8,0 V10",
  N: "M0.4,10 V0 L5.6,10 V0",
  P: "M0.4,10 V0 H3.2 C6,0 6,5.4 3.2,5.4 H0.4",
  Q: "M3,0 C-0.8,0 -0.8,10 3,10 C6.8,10 6.8,0 3,0Z M3.8,7.4 L6,10.4",
  R: "M0.4,10 V0 H3.2 C6,0 6,5.4 3.2,5.4 H0.4 M3,5.4 L5.8,10",
  S: "M5.4,1.4 C4.4,0 1,-0.6 0.6,2.2 C0.2,5 5.8,4.6 5.6,7.6 C5.4,10.6 1.4,10.4 0.4,8.6",
  T: "M0.2,0 H5.8 M3,0 V10",
  U: "M0.4,0 V6.6 C0.4,10.6 5.6,10.6 5.6,6.6 V0",
  Y: "M0.2,0 L3,5 L5.8,0 M3,5 V10",
};

/** Characters the table can draw (for tests). */
export const GLYPH_CHARS = Object.keys(G);

const CELL = 6;
const GAP = 1.7;

function r1(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Rewrite one glyph's absolute path into place: x' = ox + x·s, y' = oy + y·s. */
function place(d: string, ox: number, oy: number, s: number): string {
  const tokens = d.match(/[MLHVCZ]|-?\d*\.?\d+/g) ?? [];
  let out = "";
  let cmd = "";
  let axis = 0; // for M/L/C: alternates x, y
  for (const tk of tokens) {
    if (/^[MLHVCZ]$/.test(tk)) {
      cmd = tk;
      axis = 0;
      out += tk;
      continue;
    }
    const v = Number(tk);
    let w: number;
    if (cmd === "H") w = ox + v * s;
    else if (cmd === "V") w = oy + v * s;
    else {
      w = axis === 0 ? ox + v * s : oy + v * s;
      axis = 1 - axis;
    }
    const last = out[out.length - 1];
    out += (last && /[\d.]/.test(last) ? " " : "") + r1(w);
  }
  return out;
}

/** Width of a run of `text` at cap height `cap`. */
export function glyphRunWidth(text: string, cap: number): number {
  const s = cap / 10;
  return text.length ? (text.length * (CELL + GAP) - GAP) * s : 0;
}

/**
 * One path `d` per drawable glyph of `text`, with the run's baseline at `y`.
 * `anchor: "middle"` centres the run on `x` (as text-anchor="middle" did).
 */
export function glyphRun(text: string, x: number, y: number, cap: number, anchor: "start" | "middle" = "start"): string[] {
  const s = cap / 10;
  let ox = anchor === "middle" ? x - glyphRunWidth(text, cap) / 2 : x;
  const oy = y - cap;
  const out: string[] = [];
  for (const ch of text) {
    const g = G[ch];
    if (g) out.push(place(g, ox, oy, s));
    ox += (CELL + GAP) * s;
  }
  return out;
}

/** The same run as `<path>` markup, stroked (centre-line glyphs have no fill). */
export function glyphMarkup(text: string, x: number, y: number, cap: number, stroke: string, width: number, anchor: "start" | "middle" = "start", cls = ""): string {
  const c = cls ? ` class="${cls}"` : "";
  return glyphRun(text, x, y, cap, anchor)
    .map((d) => `<path${c} d="${d}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`)
    .join("");
}
