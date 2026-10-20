/**
 * RIG-2 — the props: fixed drawings ported from the prototype (guide/v2.html `propsSVG` and
 * `rootPropsSVG`). Every string here is built from numbers in this file and the glyph table;
 * no student data, no `<text>` (labels are stroked glyph paths, see ./rigGlyphs), no inline
 * `style` (animation delays are classes in ./rig.css).
 *
 * Two layers, as in the prototype:
 *  - FACE props ride with the face (shades, sweat, ?, zzz, sparkles, hearts, tears, bulb);
 *  - ROOT props ride with the body (confetti, phone, books, sack, magnifier, clipboard, pencil).
 */
import { glyphMarkup } from "./rigGlyphs";

export type Prop =
  | "shades"
  | "sweat"
  | "q"
  | "zzz"
  | "sparkle"
  | "hearts"
  | "tears"
  | "bulb"
  | "confetti"
  | "pencil"
  | "clipboard"
  | "books"
  | "bag"
  | "magnifier"
  | "phone";

export const ROOT_PROPS: ReadonlySet<Prop> = new Set<Prop>(["confetti", "phone", "books", "bag", "magnifier", "clipboard", "pencil"]);

/** The measurements a prop needs from the character. */
export interface PropGeom {
  W: number;
  H: number;
  line: string;
  /** eye radius */
  r: number;
}

const CONFETTI = ["#ffd84a", "#ff7aa8", "#7fd2f0", "#2fae74", "#a77bff"];
const INK = "#14213d";

function n(i: number): string {
  return i ? ` lt-gr-n${i}` : "";
}

export function facePropsSVG(list: readonly Prop[], g: PropGeom): string {
  const { W, H, line: L, r } = g;
  let s = "";
  for (const p of list) {
    if (p === "shades") {
      const ex = W * 0.3;
      const lens = (cx: number) =>
        `<path d="M${cx - 15},-8 H${cx + 15} Q${cx + 16},-8 ${cx + 15},0 Q${cx + 12},10 ${cx},10 Q${cx - 12},10 ${cx - 15},0 Q${cx - 16},-8 ${cx - 15},-8Z" fill="#0d0f14" stroke="${L}" stroke-width="2"/>` +
        `<path d="M${cx - 9},-4 l6,0" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".8"/>`;
      s += `<g class="lt-gr-shades">${lens(-ex)}${lens(ex)}<path d="M${-ex + 15},-5 Q0,-9 ${ex - 15},-5" fill="none" stroke="#0d0f14" stroke-width="3.4"/></g>`;
    }
    if (p === "sweat") {
      s += `<path class="lt-gr-pr lt-gr-drip" d="M${W * 0.62},${-r * 3.2} q5,8 0,11 q-5,-3 0,-11z" fill="#9ad8ff" stroke="${L}" stroke-width="1.5"/>`;
    }
    if (p === "q") {
      // "?" at the prototype's font-size 34 → cap ≈ 24.
      s += `<g class="lt-gr-pr lt-gr-bob">${glyphMarkup("?", W * 0.55, -H * 0.42, 24, L, 3.6)}</g>`;
    }
    if (p === "zzz") {
      for (let i = 0; i < 3; i += 1) {
        // Staggered so the still frame reads "z z z"; the animation drifts each one further.
        s += `<g class="lt-gr-pr lt-gr-zz${n(i)}">${glyphMarkup("z", W * 0.45 + i * 9, -H * 0.35 - i * 13, (14 + i * 5) * 0.72, L, 2.4)}</g>`;
      }
    }
    if (p === "sparkle") {
      const pts: Array<[number, number, string]> = [
        [-W * 0.95, -H * 0.45, "#ffd84a"],
        [W * 0.95, -H * 0.55, "#7fd2f0"],
        [W * 0.7, -H * 0.85, "#ff7aa8"],
      ];
      pts.forEach((q, i) => {
        s += `<g transform="translate(${q[0]},${q[1]})"><path class="lt-gr-pr lt-gr-tw${n(i)}" d="M0,-9 L2.5,-2.5 9,0 2.5,2.5 0,9 -2.5,2.5 -9,0 -2.5,-2.5Z" fill="${q[2]}" stroke="${L}" stroke-width="1.3"/></g>`;
      });
    }
    if (p === "hearts") {
      const pts: Array<[number, number]> = [
        [-W * 0.75, -H * 0.4],
        [W * 0.8, -H * 0.5],
        [W * 0.1, -H * 0.85],
      ];
      pts.forEach((q, i) => {
        s += `<g transform="translate(${q[0]},${q[1]})"><path class="lt-gr-pr lt-gr-up${n(i)}" d="M0,6 C-10,-1 -6,-9 0,-3 C6,-9 10,-1 0,6Z" fill="#e8186b" stroke="${L}" stroke-width="1.3"/></g>`;
      });
    }
    if (p === "tears") {
      [-1, 1].forEach((sd, i) => {
        s += `<path class="lt-gr-pr lt-gr-tear${n(i)}" d="M${sd * W * 0.3},${r * 1.4} q4,7 0,9 q-4,-2 0,-9z" fill="#9ad8ff" stroke="${L}" stroke-width="1.2"/>`;
      });
    }
    if (p === "bulb") {
      s += `<g transform="translate(${W * 0.15},${-H * 0.62})"><g class="lt-gr-pr lt-gr-glow"><path d="M0,-22a12,12 0 0 0-7,21.5V5h14V-.5A12,12 0 0 0 0,-22z" fill="#ffd84a" stroke="${L}" stroke-width="2.2"/><path d="M-6,9h12M-4,13h8" stroke="${L}" stroke-width="2.2" stroke-linecap="round"/><path d="M-17,-24l-5,-4M17,-24l5,-4M0,-30v-6" stroke="#f0b400" stroke-width="2.2" stroke-linecap="round"/></g></g>`;
    }
  }
  return s;
}

/**
 * The sack's number, as digit paths centred in the slot. Normalises its own input (whole,
 * 0–999), so no caller can put a minus sign, a decimal point or a non-number into the drawing;
 * anything else → an empty slot.
 */
export function bagNumberSVG(label: unknown): string {
  const n = normaliseBagLabel(label);
  if (n === null) return "";
  return glyphMarkup(String(n), 0, 4.5, 11, INK, 2, "middle", "lt-gr-dg");
}

/** A whole, non-negative number the sack can show (anything else → no number). */
export function normaliseBagLabel(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return null;
  return Math.min(999, Math.floor(v));
}

const BOOKS: Array<[string, string]> = [
  ["#c4553d", "GUIDE"],
  ["#d98a2b", "CBSE 10"],
  ["#6b5fb5", "PYQs"],
  ["#2f8a63", "NCERT"],
];

export function rootPropsSVG(list: readonly Prop[], g: PropGeom, bagLabel: number | null): string {
  const { W, H, line: L } = g;
  let s = "";
  if (list.includes("confetti")) {
    for (let k = 0; k < 14; k += 1) {
      const x = -100 + k * 15 + ((k * 37) % 11);
      // The per-piece delay is a CSS class (guide.css lt-gr-cf0..13), never an inline style.
      s += `<rect class="lt-gr-pr lt-gr-cf lt-gr-cf${k}" x="${x}" y="${-H - 60}" width="6" height="10" rx="1.5" fill="${CONFETTI[k % 5]}"/>`;
    }
  }
  if (list.includes("phone")) {
    s += `<g class="lt-gr-phone"><rect x="-13" y="-22" width="26" height="40" rx="5" fill="${INK}" stroke="${L}" stroke-width="2"/><rect x="-10" y="-18" width="20" height="30" rx="2" fill="#e3f5ec"/><path d="M-6,-10h12M-6,-4h9M-6,2h11" stroke="#2fae74" stroke-width="2" stroke-linecap="round"/></g>`;
  }
  if (list.includes("books")) {
    let by = -6;
    s += `<g class="lt-gr-books">`;
    BOOKS.forEach((b, i) => {
      const w = 128 - i * 6 + (i % 2 ? 8 : 0);
      const x = -w / 2 + (i % 2 ? 4 : -3);
      by -= 15;
      s += `<rect x="${x}" y="${by}" width="${w}" height="15" rx="2.5" fill="${b[0]}" stroke="${L}" stroke-width="2"/>`;
      s += `<g opacity=".92">${glyphMarkup(b[1], x + w / 2, by + 11, 6.6, "#fff", 1.35, "middle")}</g>`;
    });
    s += `</g>`;
  }
  if (list.includes("bag")) {
    s +=
      `<g class="lt-gr-bag" transform="translate(${W + 18},${-H * 0.5})"><path d="M-20,8 C-24,-14 -10,-22 -8,-24 L8,-24 C10,-22 24,-14 20,8 C18,22 -18,22 -20,8Z" fill="#c99a5b" stroke="${L}" stroke-width="2.4"/><path d="M-9,-24 Q0,-30 9,-24" fill="none" stroke="${L}" stroke-width="2.4"/>` +
      `<g class="lt-gr-bagn">${bagNumberSVG(bagLabel)}</g>${glyphMarkup("MARKS", 0, 14.5, 5, INK, 1.2, "middle")}</g>`;
  }
  if (list.includes("magnifier")) {
    s += `<g transform="translate(${W + 24},${-H * 0.62})"><g class="lt-gr-pr lt-gr-bob"><path d="M-9,10 L-22,26" stroke="#7a4a22" stroke-width="7" stroke-linecap="round"/><path d="M-9,10 L-22,26" stroke="${L}" stroke-width="1.5" stroke-linecap="round" opacity=".5"/><circle r="15" fill="#c8ebff" fill-opacity=".45" stroke="${L}" stroke-width="3"/><path d="M-7,-6 Q-3,-10 3,-9" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/></g></g>`;
  }
  if (list.includes("clipboard")) {
    s += `<g transform="translate(0,${-H * 0.28})"><rect x="-19" y="-24" width="38" height="46" rx="4" fill="#c99a5b" stroke="${L}" stroke-width="2.2"/><rect x="-15" y="-19" width="30" height="37" rx="2" fill="#fff"/><rect x="-7" y="-28" width="14" height="7" rx="2" fill="#9aa3b5" stroke="${L}" stroke-width="1.6"/><path d="M-11,-11l3,3 5,-6M-11,0l3,3 5,-6" stroke="#2fae74" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M-11,9l6,6M-5,9l-6,6" stroke="#e23b3b" stroke-width="2.2" stroke-linecap="round"/><path d="M2,-9h9M2,2h9M2,12h9" stroke="#9aa3b5" stroke-width="2" stroke-linecap="round"/></g>`;
  }
  if (list.includes("pencil")) {
    s += `<g transform="translate(${W * 0.7},${-H * 0.35})"><g class="lt-gr-pr lt-gr-fall"><rect x="-3" y="-16" width="6" height="26" rx="1" fill="#ffd84a" stroke="${L}" stroke-width="1.6"/><path d="M-3,10 L0,17 L3,10Z" fill="#f2c9a0" stroke="${L}" stroke-width="1.4"/><rect x="-3" y="-19" width="6" height="4" fill="#ff8fa3" stroke="${L}" stroke-width="1.4"/></g></g>`;
  }
  return s;
}
