/**
 * FigureSvg — renders a FigureSpec (lt_figure_v1) as an accessible inline SVG
 * (DIAGRAMS-1 PR-2).
 *
 * Pure: the same spec always renders the same markup. Styling is by CSS class only
 * (role -> `lt-fig__seg--<role>`); the rules live in an EMBEDDED <style> inside the
 * <svg> (see figureSvgStyle.ts for why). No inline style attributes.
 */
import type { ReactElement } from "react";
import type { FigureElement, FigurePoint, FigureSpec } from "../figureSpec";
import { FIGURE_SVG_CSS } from "./figureSvgStyle";

const ARC_BASE_RADIUS = 20;
const ARC_STEP = 18;
const RIGHT_MARK = 8;

interface Props {
  spec: FigureSpec;
  /** Unique per page instance: used for the <title>/<desc> ids. */
  idPrefix: string;
}

function unit(a: FigurePoint, b: FigurePoint): FigurePoint {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const n = Math.hypot(dx, dy) || 1;
  return { x: dx / n, y: dy / n };
}

function r2(v: number): number {
  return Math.round(v * 100) / 100;
}

type SegEl = Extract<FigureElement, { t: "seg" }>;
type AngleEl = Extract<FigureElement, { t: "angle" }>;

function segLabelPos(a: FigurePoint, b: FigurePoint, side: "l" | "r" | "a" | "b"): { x: number; y: number; anchor: "start" | "middle" | "end" } {
  const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  if (side === "l") return { x: m.x - 8, y: m.y + 4, anchor: "end" };
  if (side === "r") return { x: m.x + 8, y: m.y + 4, anchor: "start" };
  const u = unit(a, b);
  // The normal that points UP on screen (smaller y) for "a", DOWN for "b".
  let n = { x: -u.y, y: u.x };
  if ((side === "a" && n.y > 0) || (side === "b" && n.y < 0)) n = { x: -n.x, y: -n.y };
  const off = side === "a" ? 9 : 10;
  const x = m.x + n.x * off;
  const y = m.y + n.y * off + (side === "b" ? 9 : 0);
  const anchor = n.x < -0.3 ? "end" : n.x > 0.3 ? "start" : "middle";
  return { x, y, anchor };
}

export interface ArcLayout {
  r: number;
  /** Where the angle's label goes, as a fraction (0..1) of the sweep from the `from` ray. */
  labelAt: number;
}

/**
 * Arcs that share a vertex AND a starting ray AND a turning direction are NESTED
 * (two angles of depression measured from one horizontal). They are sorted by size:
 * the smallest gets the innermost radius, and each label sits in the part of its own
 * wedge that no smaller angle covers — so every number is next to its own arc only.
 */
export function arcLayouts(spec: FigureSpec): Array<ArcLayout | null> {
  const P = spec.points;
  const groups = new Map<string, Array<{ i: number; deg: number }>>();
  spec.elements.forEach((el, i) => {
    if (el.t !== "angle") return;
    const u1 = unit(P[el.at], P[el.from]);
    const u2 = unit(P[el.at], P[el.to]);
    const turn = u1.x * u2.y - u1.y * u2.x > 0 ? "+" : "-";
    const key = `${el.at}|${el.from}|${turn}`;
    const g = groups.get(key) ?? [];
    g.push({ i, deg: el.deg });
    groups.set(key, g);
  });
  const out: Array<ArcLayout | null> = spec.elements.map(() => null);
  for (const g of groups.values()) {
    g.sort((a, b) => a.deg - b.deg);
    g.forEach((m, rank) => {
      const prev = rank === 0 ? 0 : g[rank - 1].deg;
      out[m.i] = { r: ARC_BASE_RADIUS + rank * ARC_STEP, labelAt: (prev + m.deg) / 2 / m.deg };
    });
  }
  return out;
}

function arcPath(at: FigurePoint, from: FigurePoint, to: FigurePoint, lay: ArcLayout): { d: string; mid: FigurePoint } {
  const r = lay.r;
  const u1 = unit(at, from);
  const u2 = unit(at, to);
  const s = { x: at.x + u1.x * r, y: at.y + u1.y * r };
  const e = { x: at.x + u2.x * r, y: at.y + u2.y * r };
  const cross = u1.x * u2.y - u1.y * u2.x;
  const sweep = cross > 0 ? 1 : 0;
  // Rotate u1 towards u2 by labelAt of the swept angle.
  const phi = Math.atan2(cross, u1.x * u2.x + u1.y * u2.y) * lay.labelAt;
  const dir = { x: u1.x * Math.cos(phi) - u1.y * Math.sin(phi), y: u1.x * Math.sin(phi) + u1.y * Math.cos(phi) };
  const lr = r + 13;
  return {
    d: `M ${r2(s.x)} ${r2(s.y)} A ${r} ${r} 0 0 ${sweep} ${r2(e.x)} ${r2(e.y)}`,
    mid: { x: at.x + dir.x * lr, y: at.y + dir.y * lr },
  };
}

export function FigureSvg({ spec, idPrefix }: Props) {
  const P = spec.points;
  const arcs = arcLayouts(spec);
  const titleId = `${idPrefix}-t`;
  const descId = `${idPrefix}-d`;
  const lines: ReactElement[] = [];
  const marks: ReactElement[] = [];
  const texts: ReactElement[] = [];

  spec.elements.forEach((el, i) => {
    const key = `${el.t}-${i}`;
    if (el.t === "seg") {
      const s = el as SegEl;
      const a = P[s.a];
      const b = P[s.b];
      lines.push(
        <line key={key} className={`lt-fig__seg lt-fig__seg--${s.role}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} data-role={s.role} />,
      );
      if (s.label) {
        const pos = segLabelPos(a, b, s.label.side);
        texts.push(
          <text key={`${key}-l`} className="lt-fig__len-label" x={r2(pos.x)} y={r2(pos.y)} textAnchor={pos.anchor}>
            {s.label.text}
          </text>,
        );
      }
    } else if (el.t === "angle") {
      const g = el as AngleEl;
      const { d, mid } = arcPath(P[g.at], P[g.from], P[g.to], arcs[i]!);
      marks.push(<path key={key} className="lt-fig__arc" d={d} data-deg={g.deg} />);
      if (g.label) {
        texts.push(
          <text key={`${key}-l`} className="lt-fig__angle-label" x={r2(mid.x)} y={r2(mid.y + 4)} textAnchor="middle">
            {g.label}
          </text>,
        );
      }
    } else if (el.t === "right") {
      const at = P[el.at];
      const ua = unit(at, P[el.a]);
      const ub = unit(at, P[el.b]);
      const p1 = { x: at.x + ua.x * RIGHT_MARK, y: at.y + ua.y * RIGHT_MARK };
      const p2 = { x: p1.x + ub.x * RIGHT_MARK, y: p1.y + ub.y * RIGHT_MARK };
      const p3 = { x: at.x + ub.x * RIGHT_MARK, y: at.y + ub.y * RIGHT_MARK };
      marks.push(
        <polyline
          key={key}
          className="lt-fig__right"
          points={`${r2(p1.x)},${r2(p1.y)} ${r2(p2.x)},${r2(p2.y)} ${r2(p3.x)},${r2(p3.y)}`}
        />,
      );
    } else if (el.t === "dot") {
      const at = P[el.at];
      marks.push(<circle key={key} className="lt-fig__dot" cx={at.x} cy={at.y} r={2.6} />);
    } else if (el.t === "label") {
      const at = P[el.at];
      texts.push(
        <text key={key} className="lt-fig__pt" x={r2(at.x + el.dx)} y={r2(at.y + el.dy)} textAnchor="middle">
          {el.text}
        </text>,
      );
    }
  });

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="lt-fig"
      viewBox={`0 0 ${spec.viewBox.w} ${spec.viewBox.h}`}
      role="img"
      aria-labelledby={`${titleId} ${descId}`}
    >
      <title id={titleId}>{spec.title}</title>
      <desc id={descId}>{spec.desc}</desc>
      <style>{FIGURE_SVG_CSS}</style>
      <rect className="lt-fig__bg" x={0} y={0} width={spec.viewBox.w} height={spec.viewBox.h} />
      <g>{lines}</g>
      <g>{marks}</g>
      <g>{texts}</g>
    </svg>
  );
}

export default FigureSvg;
