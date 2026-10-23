import { Rig, type CharacterKind, type Pose } from "../../guide/rig";

/**
 * SHARE-CARD-1 - a REAL rig pose as a static vector, for the share image.
 *
 * The rig (components/guide/rig.ts) draws a character into an SVG it owns. With
 * `{ still: true }` it settles the pose once and never joins the animation loop, so building it
 * into a DETACHED host, reading the SVG's markup and destroying the rig yields the exact drawing
 * the app shows - not a redrawn copy that could drift from the cast sheet.
 *
 * The markup is a fixed drawing built from numbers in rig.ts (no student data ever reaches it;
 * see rig.ts header), so the caller may set it as innerHTML. The rig's own `lt-gr-svg` sizing
 * class is kept; the share card sizes it.
 */
export function staticPoseSvg(kind: CharacterKind, pose: Pose): string {
  if (typeof document === "undefined") return "";
  const host = document.createElement("div");
  let rig: Rig | null = null;
  try {
    rig = new Rig(host, kind, pose, { still: true });
    rig.svg.setAttribute("data-pose", pose);
    return rig.svg.outerHTML;
  } catch {
    return "";
  } finally {
    rig?.destroy();
  }
}
