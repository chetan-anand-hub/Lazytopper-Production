/**
 * FigureSpec (lt_figure_v1) — the data a computed solution figure is drawn from
 * (DIAGRAMS-1 PR-2).
 *
 * A builder turns a question's OWN numbers into one of these. It is deliberately
 * NOT an extension of `src/tutor/diagram/diagramTypes.ts`: that type carries hex
 * colours in data and has no world-to-view transform, so a test could not recover
 * the true geometry from it. Here every point is in VIEW coordinates and the
 * `transform` records the world -> view map, so a test can read a drawn length back
 * in metres and a drawn angle back in degrees and compare them with the question.
 *
 * Styling is by ROLE only (mapped to CSS classes by the renderer). No colour, no
 * stroke width, nothing presentational lives in a spec.
 */

export type FigureRole =
  | "structure" // a tower, building, pole, tree — drawn solid
  | "ground" // the level ground / sea line
  | "sight" // a line of sight / sun ray / string / ladder — the hypotenuse
  | "horizontal-ref" // the dashed horizontal at an observer's eye (depression angles)
  | "path" // the dashed path of a moving thing (balloon, bird) or a rise
  | "construction" // a dashed helper (eye-level line, perpendicular)
  | "measure" // a dimension line that only carries a length label
  // Ray optics (PR-2b) — additive; the H&D roles above are unchanged.
  | "axis" // the principal axis
  | "ray" // a real light ray (solid)
  | "ray-virtual" // a backward extension of a ray, behind a mirror / lens (dashed)
  | "object" // the object arrow (solid, arrowhead at its tip)
  | "image" // a REAL image arrow (solid, arrowhead at its tip)
  | "image-virtual"; // a VIRTUAL image arrow (dashed, arrowhead at its tip)

export type LabelSide = "l" | "r" | "a" | "b";

export interface FigurePoint {
  x: number;
  y: number;
}

export type FigureElement =
  | {
      t: "seg";
      a: string;
      b: string;
      role: FigureRole;
      label?: { text: string; side: LabelSide };
      /** Ray optics (PR-2b): "end" draws an arrowhead at b (object/image arrows); "mid" a
       *  direction chevron at the midpoint (the way the light travels, a -> b). */
      arrow?: "mid" | "end";
    }
  | {
      /** An angle arc at `at`, swept from ray at->from to ray at->to (the smaller angle). */
      t: "angle";
      at: string;
      from: string;
      to: string;
      label?: string;
      /** The world value the arc stands for, in degrees (tests compare it with the drawn rays). */
      deg: number;
    }
  | { t: "right"; at: string; a: string; b: string }
  | { t: "label"; at: string; text: string; dx: number; dy: number }
  | { t: "dot"; at: string }
  | {
      /** Ray optics (PR-2b): a spherical-mirror SYMBOL at the pole `at`. A shallow arc of
       *  half-height `half` whose edges are `sag` view units off the pole plane (towards
       *  the reflecting side for concave, away from it for convex), hatched on its back.
       *  Light comes from the left; the reflecting face is the left face. */
      t: "mirror";
      at: string;
      half: number;
      sag: number;
      kind: "concave" | "convex";
    }
  | {
      /** Ray optics (PR-2b): a thin-lens SYMBOL centred on the optical centre `at`. */
      t: "lens";
      at: string;
      half: number;
      kind: "convex" | "concave";
    };

export interface FigureTransform {
  /** view = (world.x * sx + ox, oy - world.y * sy). H&D always has sx === sy. */
  sx: number;
  sy: number;
  ox: number;
  oy: number;
  unit: "m" | "km" | "cm" | "none";
}

export interface FigureSpec {
  kind: "lt_figure_v1";
  viewBox: { w: number; h: number };
  transform: FigureTransform;
  /** Short accessible name. */
  title: string;
  /** A generated sentence listing every given and every unknown. */
  desc: string;
  /** Shown under the figure when the drawing is not to scale in some respect. */
  note?: string;
  /** VIEW coordinates. */
  points: Record<string, FigurePoint>;
  elements: FigureElement[];
}
