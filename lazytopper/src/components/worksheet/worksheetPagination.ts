// WORKSHEET-FIX-2 — where a worksheet PDF may be cut between pages.
//
// renderElementToPdf rasterises the whole document into ONE tall canvas and used to cut it every `sliceH` pixels, so a
// page boundary could land through a line of text or through the middle of a figure. `planSlices` moves each cut up to
// the nearest boundary that no "atom" (a line, an option, a step, a figure) straddles. It is pure (numbers in, numbers
// out) so the rule is unit-tested without a browser.

export interface Span {
  top: number;
  bottom: number;
}

export interface Slice {
  y: number;
  h: number;
}

/** A page must stay at least this full before its cut is moved up; below it the content is cut where it falls. */
export const MIN_PAGE_FILL = 0.4;

/**
 * Split a tall raster of height `totalH` into pages of at most `sliceH`. `atoms` are the spans (same units as `totalH`)
 * that must not be cut. A cut that would split an atom moves up to the top of the highest straddling atom, repeatedly,
 * unless that leaves the page under `MIN_PAGE_FILL` full (an atom taller than a page, or one at the very top): then the
 * original cut stands. Always terminates and always makes progress; the slices tile [0, totalH] exactly.
 */
export function planSlices(atoms: ReadonlyArray<Span>, totalH: number, sliceH: number, minFill = MIN_PAGE_FILL): Slice[] {
  const out: Slice[] = [];
  if (!(totalH > 0) || !(sliceH > 0)) return [{ y: 0, h: Math.max(1, totalH || 1) }];
  const eps = 0.5;
  let y = 0;
  while (y < totalH - eps) {
    const hard = y + sliceH;
    if (hard >= totalH - eps) {
      out.push({ y, h: totalH - y });
      break;
    }
    let cut = hard;
    for (let guard = 0; guard < 64; guard += 1) {
      const straddling = atoms.filter((a) => a.top < cut - eps && a.bottom > cut + eps);
      if (straddling.length === 0) break;
      const next = Math.min(...straddling.map((a) => a.top));
      if (next - y < sliceH * minFill) {
        cut = hard;
        break;
      }
      cut = next;
    }
    out.push({ y, h: cut - y });
    y = cut;
  }
  return out;
}
