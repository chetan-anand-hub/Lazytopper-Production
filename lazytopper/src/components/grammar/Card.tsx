import type { CSSProperties, ReactNode } from "react";
import { BORDER, CARD_BG } from "./tokens";

/**
 * Card — presentational white surface: 1px border, 14px radius, configurable
 * padding. No behavior, no state. The `lt-grammar-card` class hook is stable so
 * pages (and tests) can target it.
 */
export function Card({
  children,
  padding = 16,
  className,
  style,
}: {
  children: ReactNode;
  /** Inner padding in px (or any CSS length string). Default 16. */
  padding?: number | string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={className ? `lt-grammar-card ${className}` : "lt-grammar-card"}
      style={{
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 14,
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
