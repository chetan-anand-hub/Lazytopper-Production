/**
 * NoteGeneratedFigure — draws `bucket:"generated"` figures from
 * `figure.generator` + `figure.params`, instead of showing the
 * "pending extraction" placeholder (that placeholder is for `bucket:"ncert"`
 * assets only).
 *
 * A small registry keyed by `figure.generator` — a future generator is one
 * more entry, not a rewrite. The first (and currently only spec-used) generator
 * is `parabola_triptych`, lifted VERBATIM from the Quadratic prototype's
 * `plotStatic(a,b,c)` (print-safe static SVG computed from coefficients).
 */
import type { ReactElement } from "react";
import type { NoteFigure } from "./noteSpec.types";
import { NoteRichText } from "./NoteRichText";

/* ── parabola_triptych ─────────────────────────────────────────────── */

interface ParabolaPanelData {
  a: number;
  b: number;
  c: number;
  badge: string;
  note: string;
}
interface TriptychParams {
  panels?: ParabolaPanelData[];
  x_range?: [number, number];
  y_range?: [number, number];
}

// Geometry + palette lifted verbatim from the prototype's plotStatic().
const W = 200;
const H = 160;
const PAD = 8;
const COLORS = {
  grid: "#eef1f5",
  axis: "#c3cbd6",
  curve: "#0f2444",
  root: "#16b96a", // D > 0 — two distinct roots
  eq: "#d99a2b", // D = 0 — one repeated root
};

function ParabolaPanel({
  panel,
  xR,
  yR,
}: {
  panel: ParabolaPanelData;
  xR: number;
  yR: number;
}) {
  const X = (x: number) => PAD + ((x + xR) / (2 * xR)) * (W - 2 * PAD);
  const Y = (y: number) => H - (PAD + ((y + yR) / (2 * yR)) * (H - 2 * PAD));

  // parabola path — 201 sampled points, exactly as the prototype plots it
  let d = "";
  for (let p = 0; p <= 200; p++) {
    const x = -xR + ((2 * xR) * p) / 200;
    const y = panel.a * x * x + panel.b * x + panel.c;
    d += (p ? "L " : "M ") + X(x).toFixed(1) + " " + Y(y).toFixed(1) + " ";
  }

  const disc = panel.b * panel.b - 4 * panel.a * panel.c;
  const roots: Array<{ x: number; fill: string }> = [];
  if (disc > 1e-9) {
    [
      (-panel.b + Math.sqrt(disc)) / (2 * panel.a),
      (-panel.b - Math.sqrt(disc)) / (2 * panel.a),
    ].forEach((r) => {
      if (r >= -xR && r <= xR) roots.push({ x: r, fill: COLORS.root });
    });
  } else if (Math.abs(disc) <= 1e-9) {
    const r = -panel.b / (2 * panel.a);
    if (r >= -xR && r <= xR) roots.push({ x: r, fill: COLORS.eq });
  }
  const badgeCls =
    disc > 1e-9
      ? "lt-note__badge--distinct"
      : Math.abs(disc) <= 1e-9
      ? "lt-note__badge--equal"
      : "lt-note__badge--none";

  const gridX: number[] = [];
  for (let g = -xR; g <= xR; g += 2) gridX.push(g);
  const gridY: number[] = [];
  for (let g = -yR; g <= yR; g += 2) gridY.push(g);

  return (
    <div className="lt-note__gcol">
      <div className="lt-note__gh">
        <span className={`lt-note__badge ${badgeCls}`}>
          <NoteRichText text={panel.badge} />
        </span>
        <div className="lt-note__gt">
          <NoteRichText text={panel.note} />
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="lt-note__gsvg" role="img">
        <rect width={W} height={H} fill="#fcfdfe" />
        {gridX.map((g, i) => (
          <line key={`vx${i}`} x1={X(g)} y1={PAD} x2={X(g)} y2={H - PAD} stroke={COLORS.grid} />
        ))}
        {gridY.map((g, i) => (
          <line key={`hy${i}`} x1={PAD} y1={Y(g)} x2={W - PAD} y2={Y(g)} stroke={COLORS.grid} />
        ))}
        <line x1={PAD} y1={Y(0)} x2={W - PAD} y2={Y(0)} stroke={COLORS.axis} strokeWidth={1.4} />
        <line x1={X(0)} y1={PAD} x2={X(0)} y2={H - PAD} stroke={COLORS.axis} strokeWidth={1.4} />
        <path d={d} fill="none" stroke={COLORS.curve} strokeWidth={2.5} />
        {roots.map((r, i) => (
          <circle key={i} cx={X(r.x)} cy={Y(0)} r={4.5} fill={r.fill} stroke="#fff" strokeWidth={1.5} />
        ))}
      </svg>
    </div>
  );
}

function ParabolaTriptych({ figure }: { figure: NoteFigure }): ReactElement | null {
  const params = (figure.params ?? {}) as TriptychParams;
  const panels = params.panels ?? [];
  if (!panels.length) return null;
  const xR = Math.abs(params.x_range?.[1] ?? 6);
  const yR = Math.abs(params.y_range?.[1] ?? 8);
  return (
    <div className="lt-note__triptych">
      {panels.map((panel, i) => (
        <ParabolaPanel key={i} panel={panel} xR={xR} yR={yR} />
      ))}
    </div>
  );
}

/* ── registry ──────────────────────────────────────────────────────── */

const GENERATORS: Record<string, (figure: NoteFigure) => ReactElement | null> = {
  parabola_triptych: (figure) => <ParabolaTriptych figure={figure} />,
};

/** True when a generated figure has a renderer registered for its generator. */
export function hasGeneratedRenderer(figure: NoteFigure): boolean {
  return figure.bucket === "generated" && !!figure.generator && figure.generator in GENERATORS;
}

/** Draw a generated figure; null if the generator is unknown (caller falls back). */
export function NoteGeneratedFigure({ figure }: { figure: NoteFigure }): ReactElement | null {
  const gen = figure.generator ? GENERATORS[figure.generator] : undefined;
  return gen ? gen(figure) : null;
}
