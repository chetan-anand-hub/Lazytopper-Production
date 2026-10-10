/**
 * Areas related to circles — a sector or segment drawn from the row's OWN radius and
 * central angle (DIAGRAMS-1 PR-2d).
 *
 * The circle, the two radii and the shaded region are drawn with ONE uniform scale, so
 * the drawn central angle IS θ (the angle the row states, or the one its own solution
 * derives — e.g. 5 minutes of a minute hand = 30°) and the radius is drawn to scale.
 * The solved areas and lengths come back as `model` (exact π) for the provenance test
 * to compare with the row's own answer (rows round π to 22/7 or 3.14: tolerance).
 *
 * Curriculum (CBSE 2026-27): "In calculating area of segment of a circle, problems
 * should be restricted to central angle of 60°, 90° and 120° only." A SEGMENT figure at
 * any other angle is refused. A sector has no angle limit.
 */
import { DEG } from "../figureGeometry";
import { GeoScene, agrees, finishGeo, lenText, num, q } from "./geometryCommon";
import type { GeoBuildResult, GeoLabels, GeoUnit, Len } from "./geometryCommon";

export interface SectorParams {
  template: "sector";
  /** "none" when the row gives bare units ("sq. units"). */
  unit: GeoUnit | "none";
  /** Radius (or the length of the minute hand / pendulum / rib). */
  r?: Len;
  /** The central angle, degrees. */
  theta?: number;
  /** Arc length, when the row gives it instead of θ. */
  arc?: Len;
}

export interface SectorDraw {
  /** Which region is shaded. */
  shade?: "sector" | "segment" | "majorSector" | "majorSegment" | "none";
  /** Hang the sector downwards (a pendulum's swing) instead of opening upwards. */
  down?: boolean;
}

export const SEGMENT_ANGLES: readonly number[] = [60, 90, 120];
export const MIN_SECTOR_ANGLE = 20;

export function buildSector(p: SectorParams, labels: GeoLabels = {}, draw: SectorDraw = {}): GeoBuildResult | null {
  const r = num(p.r);
  const arcGiven = num(p.arc);
  if (r === undefined || !Number.isFinite(r)) return null;
  if (arcGiven !== undefined && !Number.isFinite(arcGiven)) return null;
  const thetas: number[] = [];
  if (p.theta !== undefined) thetas.push(p.theta);
  if (arcGiven !== undefined) thetas.push((arcGiven / r) / DEG);
  if (thetas.length === 0) return null;
  const theta = thetas[0];
  if (!thetas.every((t) => agrees(t, theta))) return null;
  if (!(theta >= MIN_SECTOR_ANGLE && theta < 180)) return null;
  const shade = draw.shade ?? "sector";
  const isSegment = shade === "segment" || shade === "majorSegment";
  if (isSegment && !SEGMENT_ANGLES.some((a) => Math.abs(a - theta) < 1e-9)) return null;

  const th = theta * DEG;
  const sector = (Math.PI * r * r * theta) / 360;
  const triangle = 0.5 * r * r * Math.sin(th);
  const arc = (2 * Math.PI * r * theta) / 360;
  const chord = 2 * r * Math.sin(th / 2);
  const circle = Math.PI * r * r;
  const model: Record<string, number> = {
    r,
    theta,
    arc,
    chord,
    sector,
    triangle,
    segment: sector - triangle,
    majorSector: circle - sector,
    majorSegment: circle - (sector - triangle),
    majorArc: 2 * Math.PI * r - arc,
    perimeterSector: 2 * r + arc,
    perimeterSegment: chord + arc,
    circle,
    circumference: 2 * Math.PI * r,
  };

  const sc = new GeoScene();
  // The sector is symmetric about the upward vertical: B on the right, A on the left.
  const axis = draw.down ? 270 : 90;
  const a1 = axis + theta / 2;
  const a2 = axis - theta / 2;
  sc.p("O", 0, 0);
  sc.p("A", r * Math.cos(a1 * DEG), r * Math.sin(a1 * DEG));
  sc.p("B", r * Math.cos(a2 * DEG), r * Math.sin(a2 * DEG));
  sc.circle("O", r);
  if (shade === "sector") sc.region("sector", "O", "B", "A", r, theta);
  if (shade === "majorSector") sc.region("sector", "O", "A", "B", r, 360 - theta);
  if (shade === "segment") sc.region("segment", "O", "B", "A", r, theta);
  if (shade === "majorSegment") sc.region("segment", "O", "A", "B", r, 360 - theta);
  sc.dot("O");
  const rLabel = p.r !== undefined ? lenText(p.r, p.unit) : q(labels, "r");
  sc.seg("O", "A", "radius", rLabel, draw.down ? "r" : "l"); // outside the wedge
  sc.seg("O", "B", "radius");
  if (isSegment) sc.seg("A", "B", "chord", q(labels, "chord"), "a");
  if (p.theta !== undefined) sc.angle("O", "B", "A", p.theta, `${p.theta}°`);
  else if (q(labels, "theta") !== undefined) sc.angle("O", "B", "A", Math.round(theta * 1e6) / 1e6, q(labels, "theta"));
  if (p.arc !== undefined) {
    // The arc length is written just outside the arc's midpoint.
    sc.p("arcMid", 0, draw.down ? -r : r);
    sc.text("arcMid", lenText(p.arc, p.unit), 0, draw.down ? 20 : -8, "coord");
  }
  sc.letterAt("O", 0, draw.down ? -9 : 20);
  sc.letter("A", "O");
  sc.letter("B", "O");
  const what = { sector: "minor sector", segment: "minor segment", majorSector: "major sector", majorSegment: "major segment", none: "" }[shade];
  sc.facts = [
    `A circle with centre O${p.r ? ` and radius ${lenText(p.r, p.unit)}` : ""}; radii OA and OB make a central angle of ${p.theta !== undefined ? `${p.theta}°` : "θ"}.`,
    ...(p.arc ? [`The arc AB is ${lenText(p.arc, p.unit)} long.`] : []),
    ...(what ? [`The ${what} is shaded.`] : []),
  ];
  const spec = finishGeo(sc, {
    unit: p.unit,
    title: `Circle with a ${what || "sector"}`,
    labels,
    defaults: { O: "O", A: "A", B: "B" },
  });
  return spec ? { spec, model } : null;
}
