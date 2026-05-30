import type { CSSProperties, ReactNode } from "react";
import { Children } from "react";

/**
 * TileRow — the key responsive primitive.
 *
 * Renders its children as an N-column grid on desktop (`columns`, default 4) and
 * collapses to a SINGLE vertical stack below 1024px, where each tile becomes a
 * full-width icon-left / text-right row.
 *
 * The reflow is PURE CSS: a real `@media (max-width: 1023px)` rule in a scoped
 * <style> block. It is NOT a JS width check (which would break SSR / first paint
 * and is exactly what the render test distinguishes from) and NOT inline styles
 * (inline styles cannot hold media queries). The component emits identical,
 * deterministic markup at every width; only CSS changes the layout. The column
 * count is passed via the `--lt-tile-cols` custom property so the same CSS text is
 * shared across every TileRow instance (idempotent).
 *
 * Class hooks (stable, targetable by pages and tests):
 *   .lt-grammar-tile-row   — the grid container
 *   .lt-grammar-tile       — each tile cell
 */
const TILE_ROW_CSS = `
.lt-grammar-tile-row {
  display: grid;
  grid-template-columns: repeat(var(--lt-tile-cols, 4), minmax(0, 1fr));
  gap: var(--lt-tile-gap, 12px);
  align-items: stretch;
}
.lt-grammar-tile {
  min-width: 0;
}
@media (max-width: 1023px) {
  .lt-grammar-tile-row {
    grid-template-columns: minmax(0, 1fr);
  }
  .lt-grammar-tile {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
  }
}
`;

export function TileRow({
  children,
  columns = 4,
  gap = 12,
  className,
  style,
}: {
  children: ReactNode;
  /** Desktop column count (≥1024px). Default 4. Mobile is always 1 column. */
  columns?: number;
  /** Grid gap in px. Default 12. */
  gap?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const containerStyle = {
    "--lt-tile-cols": columns,
    "--lt-tile-gap": `${gap}px`,
    ...style,
  } as CSSProperties;

  return (
    <div
      className={
        className ? `lt-grammar-tile-row ${className}` : "lt-grammar-tile-row"
      }
      style={containerStyle}
    >
      <style>{TILE_ROW_CSS}</style>
      {Children.map(children, (child, i) => (
        <div className="lt-grammar-tile" key={i}>
          {child}
        </div>
      ))}
    </div>
  );
}
