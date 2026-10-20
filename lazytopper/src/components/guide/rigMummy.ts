/**
 * RIG-2 — Mummy's own parts (the parent; /for-parents only): braid, hair and parting, saree
 * with its gold border and pallu, round gold glasses, bindi and gold bangles. A port of the
 * prototype's mummy branches (guide/v2.html Rig, ~lines 520–690), measured against the
 * Round-1 art pack (manifest.json `mummy`: body #B0DE5C, outline #1B2433).
 *
 * Warm and respectful in every pose: the parts are drawn the same way whatever the pose, and
 * follow the body when it melts, sways or laughs. Every string is fixed numbers; no student data.
 */

const NS = "http://www.w3.org/2000/svg";

export const MUMMY = {
  saree: "#e8186b",
  pallu: "#d4145f",
  border: "#f6b928",
  hair: "#6b3d20",
  glasses: "#d9a21a",
  bindi: "#d0102a",
} as const;

function f(n: number): number {
  return Math.round(n * 10) / 10;
}
function mk(tag: string, attrs: Record<string, string | number>, parent: Element): SVGElement {
  const e = document.createElementNS(NS, tag) as SVGElement;
  for (const k of Object.keys(attrs)) e.setAttribute(k, String(attrs[k]));
  parent.appendChild(e);
  return e;
}

export interface MummyHosts {
  /** behind the body (the braid hangs behind her shoulder) */
  behind: Element;
  /** inside the body clip, above the shade band and below the gloss (saree, pallu, hair) */
  clip: Element;
  /** above the outline, below the face (the hair parting line) */
  top: Element;
  /** inside the face, above the brows (glasses, bindi) */
  face: Element;
}

export class MummyParts {
  private readonly braid: SVGElement;
  private readonly saree: SVGElement;
  private readonly sareeB: SVGElement;
  private readonly pallu: SVGElement;
  private readonly palluB: SVGElement;
  private readonly hair: SVGElement;
  private readonly hairLine: SVGElement;
  private readonly glasses: SVGElement;
  private readonly bindi: SVGElement;

  constructor(h: MummyHosts, line: string) {
    this.braid = mk("g", { class: "lt-gr-braid" }, h.behind);
    const clipFirst = (tag: string, attrs: Record<string, string | number>) => mk(tag, attrs, h.clip);
    this.saree = clipFirst("path", { fill: MUMMY.saree, class: "lt-gr-saree" });
    this.sareeB = clipFirst("path", { fill: "none", stroke: MUMMY.border, "stroke-width": 5 });
    this.pallu = clipFirst("path", { fill: MUMMY.pallu });
    this.palluB = clipFirst("path", { fill: "none", stroke: MUMMY.border, "stroke-width": 4 });
    this.hair = clipFirst("ellipse", { fill: MUMMY.hair });
    this.hairLine = mk("path", { fill: "none", stroke: line, "stroke-width": 2.6, "stroke-linecap": "round" }, h.top);
    this.glasses = mk("g", { class: "lt-gr-glasses" }, h.face);
    this.bindi = mk("circle", { r: 3.2, fill: MUMMY.bindi, class: "lt-gr-bindi" }, h.face);
  }

  /** One gold bangle per arm, slid to the wrist each frame. */
  static bangle(arm: Element): SVGGElement {
    const g = mk("g", { class: "lt-gr-bangle" }, arm) as SVGGElement;
    mk("ellipse", { rx: 8, ry: 2.6, fill: "none", stroke: MUMMY.border, "stroke-width": 2.6 }, g);
    return g;
  }

  frame(W: number, H: number, lean: number, t: number, amp: number, ex: number, r: number, line: string): void {
    this.saree.setAttribute("d", `M${f(-W * 1.6)},${f(-H * 0.3)} C${f(-W * 0.5)},${f(-H * 0.25)} ${f(W * 0.5)},${f(-H * 0.36)} ${f(W * 1.6)},${f(-H * 0.29)} L${f(W * 1.6)},30 L${f(-W * 1.6)},30Z`);
    this.sareeB.setAttribute("d", `M${f(-W * 1.6)},${f(-H * 0.07)} C${f(-W * 0.5)},${f(-H * 0.02)} ${f(W * 0.5)},${f(-H * 0.12)} ${f(W * 1.6)},${f(-H * 0.06)}`);
    const p1 = `${f(W * 0.62)},${f(-H * 0.52)}`;
    const p2 = `${f(W * 1.2)},${f(-H * 0.42)}`;
    const p3 = `${f(-W * 0.55)},${f(-H * 0.12)}`;
    const p4 = `${f(-W * 1.2)},${f(-H * 0.26)}`;
    this.pallu.setAttribute("d", `M${p1} L${p2} L${p3} L${p4}Z`);
    this.palluB.setAttribute("d", `M${p1} L${p4} M${p2} L${p3}`);
    this.hair.setAttribute("cx", String(f(-W * 0.05 + lean * H * 0.35)));
    this.hair.setAttribute("cy", String(f(-H)));
    this.hair.setAttribute("rx", String(f(W * 1.05)));
    this.hair.setAttribute("ry", String(f(H * 0.16)));
    this.hairLine.setAttribute(
      "d",
      `M${f(-W * 0.7)},${f(-H * 0.84)} Q${f(-W * 0.25)},${f(-H * 0.8)} ${f(W * 0.05 + lean * H * 0.3)},${f(-H * 0.99)} Q${f(W * 0.45)},${f(-H * 0.82)} ${f(W * 0.72)},${f(-H * 0.8)}`,
    );
    let bh = "";
    for (let bi = 0; bi < 6; bi += 1) {
      const by = -H * 0.8 + bi * H * 0.08;
      const bx = -W * 1.02 - bi * 1.2 + Math.sin(t * 2 + bi) * 1.2 * amp;
      bh += `<ellipse cx="${f(bx)}" cy="${f(by)}" rx="7.5" ry="7" fill="${MUMMY.hair}" stroke="${line}" stroke-width="2"/>`;
    }
    bh += `<ellipse cx="${f(-W * 1.1)}" cy="${f(-H * 0.27)}" rx="6" ry="3" fill="${MUMMY.saree}" stroke="${line}" stroke-width="1.6"/>`;
    this.braid.innerHTML = bh;
    const gr = r * 1.75;
    this.glasses.innerHTML =
      `<circle cx="${f(-ex)}" cy="0" r="${f(gr)}" fill="#fff" fill-opacity=".18" stroke="${MUMMY.glasses}" stroke-width="2.4"/>` +
      `<circle cx="${f(ex)}" cy="0" r="${f(gr)}" fill="#fff" fill-opacity=".18" stroke="${MUMMY.glasses}" stroke-width="2.4"/>` +
      `<path d="M${f(-ex + gr)},-2 Q0,-6 ${f(ex - gr)},-2" fill="none" stroke="${MUMMY.glasses}" stroke-width="2.4"/>`;
    this.bindi.setAttribute("cy", String(f(-r * 2.9)));
  }
}
