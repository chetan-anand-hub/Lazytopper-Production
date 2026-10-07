/**
 * Pure geometry helpers for computed figures (DIAGRAMS-1 PR-2). No DOM, no clock,
 * no randomness — the same input always gives the same output.
 */
import type { FigurePoint, FigureTransform } from "./figureSpec";

export const DEG = Math.PI / 180;

export function tanDeg(deg: number): number {
  return Math.tan(deg * DEG);
}

/** Angle (degrees, 0..180) between rays at->p and at->q. */
export function angleBetweenDeg(at: FigurePoint, p: FigurePoint, q: FigurePoint): number {
  const a1 = Math.atan2(p.y - at.y, p.x - at.x);
  const a2 = Math.atan2(q.y - at.y, q.x - at.x);
  let d = Math.abs(a1 - a2);
  if (d > Math.PI) d = 2 * Math.PI - d;
  return d / DEG;
}

export function dist(p: FigurePoint, q: FigurePoint): number {
  return Math.hypot(p.x - q.x, p.y - q.y);
}

/**
 * Evaluate the exact numeric expression a question writes a length in:
 * "15", "1.5", "10√3", "10sqrt(3)", "8/√3", "12(1 + √3)", "20√3/3", "3000√3".
 * Returns NaN for anything else (a letter, an empty string) — callers refuse on NaN.
 */
export function evalLengthExpr(raw: string): number {
  const src = raw.replace(/sqrt\s*\(/gi, "√(").replace(/\s+/g, "").replace(/×/g, "*").replace(/−/g, "-");
  let i = 0;
  const peek = () => src[i];
  const fail = () => {
    throw new Error("bad expr");
  };
  function number(): number {
    const m = /^\d+(?:\.\d+)?/.exec(src.slice(i));
    if (!m) fail();
    i += m![0].length;
    return Number(m![0]);
  }
  function factor(): number {
    const c = peek();
    if (c === "-") {
      i++;
      return -factor();
    }
    if (c === "√") {
      i++;
      return Math.sqrt(factor());
    }
    if (c === "(") {
      i++;
      const v = expr();
      if (peek() !== ")") fail();
      i++;
      return v;
    }
    return number();
  }
  function term(): number {
    let v = factor();
    for (;;) {
      const c = peek();
      if (c === "*") {
        i++;
        v *= factor();
      } else if (c === "/") {
        i++;
        v /= factor();
      } else if (c === "√" || c === "(") {
        v *= factor(); // implicit multiplication: 10√3, 12(1+√3)
      } else return v;
    }
  }
  function expr(): number {
    let v = term();
    for (;;) {
      const c = peek();
      if (c === "+") {
        i++;
        v += term();
      } else if (c === "-") {
        i++;
        v -= term();
      } else return v;
    }
  }
  try {
    if (!src) return NaN;
    const v = expr();
    if (i !== src.length) return NaN;
    return Number.isFinite(v) ? v : NaN;
  } catch {
    return NaN;
  }
}

/** Display form of a length expression: "10sqrt(3)" -> "10√3", spaces tidied. */
export function prettyExpr(raw: string): string {
  return raw.replace(/sqrt\s*\(\s*(\d+(?:\.\d+)?)\s*\)/gi, "√$1").replace(/\s+/g, " ").trim();
}

export interface Box {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export function boundsOf(points: FigurePoint[]): Box {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

/**
 * A UNIFORM world -> view fit (sx === sy), centred in the box left after margins.
 * World y points up; view y points down.
 */
export function fitUniform(
  box: Box,
  view: { w: number; h: number },
  margin: { l: number; r: number; t: number; b: number },
  unit: FigureTransform["unit"],
): FigureTransform {
  const bw = Math.max(box.maxX - box.minX, 1e-9);
  const bh = Math.max(box.maxY - box.minY, 1e-9);
  const aw = view.w - margin.l - margin.r;
  const ah = view.h - margin.t - margin.b;
  const s = Math.min(aw / bw, ah / bh);
  const ox = margin.l + (aw - bw * s) / 2 - box.minX * s;
  const oy = view.h - margin.b - (ah - bh * s) / 2 + box.minY * s;
  return { sx: s, sy: s, ox, oy, unit };
}

export function toView(t: FigureTransform, p: FigurePoint): FigurePoint {
  return { x: round3(p.x * t.sx + t.ox), y: round3(t.oy - p.y * t.sy) };
}

export function fromView(t: FigureTransform, p: FigurePoint): FigurePoint {
  return { x: (p.x - t.ox) / t.sx, y: (t.oy - p.y) / t.sy };
}

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}
